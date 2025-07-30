import { Router, Request, Response } from 'express';
import { supabase, createAuthenticatedClient } from '../index';
import { authenticateUser, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { validateAuthInput } from '../middleware/validation';
import { logger } from '../utils/logger';
import { securityMonitoring } from '../services/security-monitoring';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

// User interface for consistent typing

interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface ProfileUpdateData {
  name?: string;
  avatar_url?: string;
  is_creator?: boolean;
  creator_bio?: string;
  creator_specialty?: string;
  creator_tier?: number;
  onboarding_completed?: boolean;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}


/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 session:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     expires_in:
 *                       type: number
 *                     token_type:
 *                       type: string
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Sign up a new user
router.post('/signup', authRateLimiter, validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Use Supabase with retry logic for 504 errors
    logger.info('Attempting Supabase signup:', {
      email,
      nameProvided: !!name,
      nameLength: name?.length,
      passwordLength: password?.length,
      emailFormat: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    });
    
    // Retry logic for AuthRetryableFetchError (504 timeouts)
    const maxRetries = 3;
    let authData: any = null;
    let authError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Supabase signup attempt ${attempt}/${maxRetries}`);
        
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            }
          }
        });
        
        authData = result.data;
        authError = result.error;
        
        // If no error or non-retryable error, break the loop
        if (!authError || 
            (authError as any).name !== 'AuthRetryableFetchError' || 
            (authError as any).status !== 504) {
          break;
        }
        
        // Log retry attempt for 504 errors
        logger.warn(`Supabase signup 504 timeout on attempt ${attempt}/${maxRetries}:`, {
          errorName: (authError as any).name,
          status: (authError as any).status,
          willRetry: attempt < maxRetries
        });
        
        // Wait before retry (exponential backoff: 1s, 2s, 4s)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.info(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (unexpectedError) {
        logger.error('Unexpected error during Supabase signup:', unexpectedError);
        authError = unexpectedError as any;
        break;
      }
    }
    
    logger.info('Supabase signup final response:', {
      hasAuthData: !!authData,
      hasUser: !!authData?.user,
      hasSession: !!authData?.session,
      hasError: !!authError,
      userId: authData?.user?.id,
      finalAttempt: true
    });

    if (authError) {
      // Enhanced debugging for Supabase auth errors
      logger.error('Supabase signup error - DETAILED DEBUG:', {
        errorType: typeof authError,
        errorConstructor: authError.constructor.name,
        message: authError.message,
        name: authError.name,
        code: (authError as any).code,
        status: (authError as any).status,
        statusCode: (authError as any).statusCode,
        details: (authError as any).details,
        hint: (authError as any).hint,
        errorDescription: (authError as any).error_description,
        fullError: authError,
        // Try to serialize to see full structure
        stringified: JSON.stringify(authError, null, 2),
        // Check all enumerable properties
        ownProps: Object.getOwnPropertyNames(authError),
        // Input data for context
        requestData: { email, name }
      });
      
      const errorMessage = authError.message || 
                          (authError as any).error_description || 
                          (authError as any).details || 
                          'Signup failed - unknown error';
      
      return res.status(400).json({ 
        error: errorMessage,
        code: 'SIGNUP_ERROR',
        debug: process.env.NODE_ENV === 'development' ? {
          supabaseError: authError,
          type: typeof authError
        } : undefined
      });
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // Create user profile in our users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        avatar_url: null,
        level: 1,
        xp: 0,
        total_xp: 0
      }]);

    if (profileError) {
      logger.error('Profile creation error:', profileError);
      // Don't fail the signup if profile creation fails
    }

    res.status(201).json({
      user: authData.user,
      session: authData.session,
      message: 'User created successfully'
    });
  } catch (error: unknown) {
    logger.error('Signup error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      details: error
    });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Sign in a user
router.post('/signin', authRateLimiter, validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Use Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Log authentication failure
      await securityMonitoring.logAuthFailure(req, error.message);
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Signed in successfully'
    });
  } catch (error: unknown) {
    logger.error('Signin error', { error });
    // Log authentication failure
    await securityMonitoring.logAuthFailure(req, 'Unexpected error during signin');
    return res.status(401).json({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS'
    });
  }
});

// Sign out a user
router.post('/signout', authenticateUser, async (req: Request, res: Response) => {
  try {

    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error: unknown) {
    logger.error('Signout error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh access token
router.post('/refresh', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    try {
      const decoded = verifyRefreshToken(refresh_token);
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new tokens
      const accessToken = generateAccessToken(user.id, user.email);
      const newRefreshToken = generateRefreshToken(user.id, user.email);

      res.json({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600, // 1 hour
        user
      });
    } catch (error: unknown) {
      logger.error('Invalid refresh token attempt', { error });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error: unknown) {
    logger.error('Refresh token error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;


    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ user });
  } catch (error: unknown) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile photo
router.post('/profile/photo', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    
    logger.debug('📸 Profile photo upload request received', {
      userId,
      contentType: req.headers['content-type'],
      hasBody: !!req.body,
    });
    
    // For now, return a proper JSON response since we don't have file storage set up yet
    // TODO: Implement actual file upload to Supabase Storage
    return res.status(501).json({ 
      success: false,
      error: 'Profile photo upload not implemented yet',
      message: 'This feature will be available soon. We need to set up Supabase Storage first.',
      code: 'NOT_IMPLEMENTED'
    });

    /* Future implementation would look like:
    // 1. Validate file type and size
    // 2. Upload to Supabase Storage
    // 3. Get public URL
    // 4. Update user's avatar_url in database
    // 5. Return new avatar URL
    */
  } catch (error: unknown) {
    logger.error('Upload profile photo error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { 
      name, 
      avatar_url, 
      is_creator, 
      creator_bio, 
      creator_specialty, 
      creator_tier,
      onboarding_completed 
    } = req.body;

    const updateData: ProfileUpdateData = {};
    if (name !== undefined) {updateData.name = name;}
    if (avatar_url !== undefined) {updateData.avatar_url = avatar_url;}
    if (is_creator !== undefined) {updateData.is_creator = is_creator;}
    if (creator_bio !== undefined) {updateData.creator_bio = creator_bio;}
    if (creator_specialty !== undefined) {updateData.creator_specialty = creator_specialty;}
    if (creator_tier !== undefined) {updateData.creator_tier = creator_tier;}
    if (onboarding_completed !== undefined) {updateData.onboarding_completed = onboarding_completed;}

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }


    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // If user became a creator, award XP and create creator record
    if (updateData.is_creator && !data.was_creator) {
      try {
        // Award XP for becoming creator
        await supabase.rpc('add_user_xp', {
          p_user_id: userId,
          p_xp_amount: 500,
          p_action: 'BECOME_CREATOR',
          p_metadata: { 
            creator_tier: updateData.creator_tier || 1,
            specialty: updateData.creator_specialty 
          }
        });

        // Create creator tier record if it doesn't exist
        await supabase
          .from('creator_tiers')
          .upsert([{
            user_id: userId,
            tier_level: updateData.creator_tier || 1,
            subscribers_count: 0,
            total_revenue: 0,
            commission_rate: 0.10, // 10% for tier 1
            achieved_at: new Date().toISOString()
          }]);

      } catch (xpError) {
        logger.error('Creator setup error:', xpError);
        // Don't fail the profile update if XP/tier creation fails
      }
    }

    res.json({
      user: data,
      message: 'Profile updated successfully'
    });
  } catch (error: unknown) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account and all data
router.delete('/account', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const userClient = createAuthenticatedClient(token);
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation is required' });
    }


    // Verify password before deletion (get user's email first)
    const { data: userData, error: userError } = await userClient
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password by attempting sign-in
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: confirmPassword
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Begin transaction to delete all user data
    try {
      // Delete user data in proper order (respecting foreign keys)
      
      // 1. Delete scan history and related data
      await userClient.from('scan_results').delete().eq('user_id', userId);
      await userClient.from('scan_ingredients').delete().eq('user_id', userId);
      
      // 2. Delete recipe data
      await userClient.from('recipe_ratings').delete().eq('user_id', userId);
      await userClient.from('recipe_favorites').delete().eq('user_id', userId);
      await userClient.from('user_recipes').delete().eq('user_id', userId);
      
      // 3. Delete gamification data
      await userClient.from('user_xp_logs').delete().eq('user_id', userId);
      await userClient.from('user_achievements').delete().eq('user_id', userId);
      await userClient.from('user_badges').delete().eq('user_id', userId);
      
      // 4. Delete subscription data
      await userClient.from('user_subscriptions').delete().eq('user_id', userId);
      await userClient.from('subscription_usage').delete().eq('user_id', userId);
      
      // 5. Delete creator-specific data
      await userClient.from('creator_revenues').delete().eq('user_id', userId);
      await userClient.from('creator_payouts').delete().eq('user_id', userId);
      await userClient.from('affiliate_links').delete().eq('user_id', userId);
      await userClient.from('creator_tiers').delete().eq('user_id', userId);
      
      // 6. Delete notification preferences and logs
      await userClient.from('notification_preferences').delete().eq('user_id', userId);
      await userClient.from('notification_logs').delete().eq('user_id', userId);
      
      // 7. Delete usage analytics
      await userClient.from('user_analytics').delete().eq('user_id', userId);
      
      // 8. Delete the user profile
      const { error: deleteUserError } = await userClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteUserError) {
        throw deleteUserError;
      }

      // 9. Delete from Supabase Auth (this also invalidates all sessions)
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        logger.error('Auth deletion error:', deleteAuthError);
        // Don't fail the entire deletion if auth deletion fails
      }

      logger.info(`User account deleted: ${userId}`, {
        userId,
        email: userData.email,
        deletedAt: new Date().toISOString()
      });

      res.json({
        message: 'Account and all associated data have been permanently deleted',
        deletedAt: new Date().toISOString()
      });

    } catch (deletionError) {
      logger.error('Account deletion error:', deletionError);
      res.status(500).json({ 
        error: 'Failed to delete account completely. Please contact support.',
        details: 'Some data may have been partially deleted'
      });
    }

  } catch (error: unknown) {
    logger.error('Account deletion error:', error);
    res.status(500).json({ error: 'Internal server error during account deletion' });
  }
});

// Link user to referral code (for attribution)
router.post('/link-referral', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    // Verify the referral code exists
    const { data: affiliateLink, error: linkError } = await supabase
      .from('creator_affiliate_links')
      .select('creator_id, id')
      .eq('link_code', referralCode)
      .eq('is_active', true)
      .single();

    if (linkError || !affiliateLink) {
      logger.warn('Invalid referral code attempt', { referralCode, userId });
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    // Store the referral attribution (for later conversion tracking)
    const { error: attributionError } = await supabase
      .from('referral_attributions')
      .insert({
        user_id: userId,
        referrer_id: affiliateLink.creator_id,
        affiliate_link_id: affiliateLink.id,
        link_code: referralCode,
        attributed_at: new Date().toISOString()
      });

    if (attributionError) {
      logger.error('Failed to store referral attribution', { error: attributionError, userId, referralCode });
      // Don't fail the request - attribution is nice to have but not critical
    }

    logger.info('✅ User linked to referral', { 
      userId, 
      referralCode, 
      creatorId: affiliateLink.creator_id 
    });

    res.json({
      success: true,
      message: 'Referral linked successfully'
    });
  } catch (error) {
    logger.error('Link referral error:', error);
    res.status(500).json({ error: 'Failed to link referral' });
  }
});

export default router; 
import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { authenticateUser, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { validateAuthInput } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Demo mode - controlled by environment variable for development only
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// User interface for consistent typing
interface DemoUser {
  id: string;
  email: string;
  name: string;
  level: number;
  xp: number;
  total_xp: number;
  streak_current: number;
  is_creator: boolean;
  creator_tier: number | null;
  creator_bio: string | null;
  creator_specialty: string | null;
  avatar_url: string | null;
  badges: string[];
}

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

// Demo user data
const createDemoUser = (email: string, name?: string): DemoUser => ({
  id: `demo_${Date.now()}`,
  email,
  name: name || email.split('@')[0] || 'Demo User',
  level: 5,
  xp: 1250,
  total_xp: 1250,
  streak_current: 3,
  is_creator: false,
  creator_tier: null,
  creator_bio: null,
  creator_specialty: null,
  avatar_url: null,
  badges: ['first_recipe', 'first_scan', 'streak_7']
});

const createDemoSession = (user: DemoUser): SessionData => ({
  access_token: `demo_token_${user.id}`,
  refresh_token: `demo_refresh_${user.id}`,
  expires_in: 3600,
  token_type: 'bearer'
});

// Sign up a new user
router.post('/signup', authRateLimiter, validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (DEMO_MODE) {
      // Demo mode - create mock user
      const user = createDemoUser(email, name);
      const session = createDemoSession(user);
      
      return res.status(201).json({
        user,
        session,
        message: 'Demo user created successfully'
      });
    }

    // Production mode - use Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
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
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in a user
router.post('/signin', authRateLimiter, validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (DEMO_MODE) {
      // Demo mode - accept any credentials
      const user = createDemoUser(email);
      const session = createDemoSession(user);
      
      return res.json({
        user,
        session,
        message: 'Demo sign in successful'
      });
    }

    // Production mode - use Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Signed in successfully'
    });
  } catch (error: unknown) {
    logger.error('Signin error', { error });
    return res.status(401).json({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS'
    });
  }
});

// Sign out a user
router.post('/signout', authenticateUser, async (req: Request, res: Response) => {
  try {
    if (DEMO_MODE) {
      return res.json({ message: 'Demo sign out successful' });
    }

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

    if (DEMO_MODE) {
      // Demo mode - create new tokens
      if (refresh_token.startsWith('demo_refresh_')) {
        const userId = refresh_token.replace('demo_refresh_', '');
        const user = createDemoUser('demo@example.com');
        user.id = userId;
        const newSession = createDemoSession(user);
        
        return res.json({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
          expires_in: newSession.expires_in,
          user
        });
      }
    }

    // Production mode - verify refresh token
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

    if (DEMO_MODE && userId.startsWith('demo_')) {
      const user = createDemoUser('demo@example.com', 'Demo User');
      user.id = userId;
      return res.json({ user });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    if (DEMO_MODE && userId.startsWith('demo_')) {
      const user = createDemoUser('demo@example.com', updateData.name || 'Demo User');
      user.id = userId;
      // Update demo user properties that exist in the interface
      if (updateData.avatar_url !== undefined) {user.avatar_url = updateData.avatar_url;}
      if (updateData.is_creator !== undefined) {user.is_creator = updateData.is_creator;}
      if (updateData.creator_tier !== undefined) {user.creator_tier = updateData.creator_tier;}
      if (updateData.creator_bio !== undefined) {user.creator_bio = updateData.creator_bio;}
      if (updateData.creator_specialty !== undefined) {user.creator_specialty = updateData.creator_specialty;}
      
      return res.json({
        user,
        message: 'Demo profile updated successfully'
      });
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
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account and all data
router.delete('/account', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation is required' });
    }

    if (DEMO_MODE && userId.startsWith('demo_')) {
      return res.json({
        message: 'Demo account deleted successfully',
        note: 'This is a demo deletion - no actual data was removed'
      });
    }

    // Verify password before deletion (get user's email first)
    const { data: userData, error: userError } = await supabase
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
      await supabase.from('scan_results').delete().eq('user_id', userId);
      await supabase.from('scan_ingredients').delete().eq('user_id', userId);
      
      // 2. Delete recipe data
      await supabase.from('recipe_ratings').delete().eq('user_id', userId);
      await supabase.from('recipe_favorites').delete().eq('user_id', userId);
      await supabase.from('user_recipes').delete().eq('user_id', userId);
      
      // 3. Delete gamification data
      await supabase.from('user_xp_logs').delete().eq('user_id', userId);
      await supabase.from('user_achievements').delete().eq('user_id', userId);
      await supabase.from('user_badges').delete().eq('user_id', userId);
      
      // 4. Delete subscription data
      await supabase.from('user_subscriptions').delete().eq('user_id', userId);
      await supabase.from('subscription_usage').delete().eq('user_id', userId);
      
      // 5. Delete creator-specific data
      await supabase.from('creator_revenues').delete().eq('user_id', userId);
      await supabase.from('creator_payouts').delete().eq('user_id', userId);
      await supabase.from('affiliate_links').delete().eq('user_id', userId);
      await supabase.from('creator_tiers').delete().eq('user_id', userId);
      
      // 6. Delete notification preferences and logs
      await supabase.from('notification_preferences').delete().eq('user_id', userId);
      await supabase.from('notification_logs').delete().eq('user_id', userId);
      
      // 7. Delete usage analytics
      await supabase.from('user_analytics').delete().eq('user_id', userId);
      
      // 8. Delete the user profile
      const { error: deleteUserError } = await supabase
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

  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({ error: 'Internal server error during account deletion' });
  }
});

export default router; 
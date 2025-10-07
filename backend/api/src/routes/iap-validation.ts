import { Router, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { iapValidationService } from '../services/iapValidationService';
import { supabase } from '../index';
import { AppError } from '../utils/errors';

const router = Router();

interface AppleReceiptValidationRequest {
  receipt: string;
  platform: 'ios';
  productId: string;
}

interface AndroidReceiptValidationRequest {
  purchaseToken: string;
  platform: 'android';
  productId: string;
}

type ReceiptValidationRequest = AppleReceiptValidationRequest | AndroidReceiptValidationRequest;

// Update user subscription in database
async function updateUserSubscription(
  userId: string,
  productId: string,
  platform: string,
  validationData: any
) {
  try {
    // Determine subscription tier from product ID
    let tierId = 2; // Regular by default
    if (productId.includes('creator')) {
      tierId = 3; // Creator tier
    }

    // Calculate subscription end date from validation result
    const currentPeriodEnd = validationData.expiryDate || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days

    const transactionId = validationData.transactionId;

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSubscription) {
      // Update existing subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          tier_id: tierId,
          status: 'active',
          current_period_end: currentPeriodEnd.toISOString(),
          provider: platform,
          provider_subscription_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } else {
      // Create new subscription
      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: userId,
        tier_id: tierId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        provider: platform,
        provider_subscription_id: transactionId,
      });

      if (error) {
        throw error;
      }
    }

    // Update user profile if it's a creator subscription
    if (tierId === 3) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'creator',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        logger.error('❌ Failed to update user profile to creator:', profileError);
      }
    }

    logger.info(`✅ Subscription updated for user ${userId} to tier ${tierId}`, {
      transactionId,
      expiryDate: currentPeriodEnd,
    });
    return true;
  } catch (error) {
    logger.error('❌ Failed to update user subscription:', error);
    throw error;
  }
}

// Main validation endpoint (refactored to use enhanced service)
router.post('/validate-receipt', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { platform, productId } = req.body as ReceiptValidationRequest;

    if (!platform || !productId) {
      throw new AppError('Missing platform or productId', 400, 'INVALID_REQUEST');
    }

    logger.debug(`🧾 Validating ${platform} receipt for user ${userId}, product ${productId}`);

    let validationResult;

    if (platform === 'ios') {
      const { receipt } = req.body as AppleReceiptValidationRequest;
      if (!receipt) {
        throw new AppError('Receipt data is required for iOS validation', 400, 'MISSING_RECEIPT');
      }

      // Use enhanced service with retry and deduplication
      validationResult = await iapValidationService.validateAppleReceipt(
        userId,
        receipt,
        productId
      );
    } else if (platform === 'android') {
      const { purchaseToken } = req.body as AndroidReceiptValidationRequest;
      if (!purchaseToken) {
        throw new AppError('Purchase token is required for Android validation', 400, 'MISSING_TOKEN');
      }

      // Use enhanced service with retry and deduplication
      validationResult = await iapValidationService.validateGooglePlayPurchase(
        userId,
        purchaseToken,
        productId
      );
    } else {
      throw new AppError('Platform must be either "ios" or "android"', 400, 'INVALID_PLATFORM');
    }

    if (validationResult.success) {
      // Update user subscription
      await updateUserSubscription(userId, productId, platform, validationResult);

      logger.info('✅ IAP validation successful', {
        userId,
        platform,
        productId,
        transactionId: validationResult.transactionId,
      });

      res.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: {
          platform,
          productId,
          status: 'active',
          transactionId: validationResult.transactionId,
          environment: validationResult.environment,
        },
      });
    } else {
      logger.warn('⚠️  IAP validation failed', {
        userId,
        platform,
        productId,
        error: validationResult.error,
        shouldRetry: validationResult.shouldRetry,
      });

      // Return appropriate status code
      const statusCode = validationResult.shouldRetry ? 503 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: validationResult.error || 'Receipt validation failed',
        shouldRetry: validationResult.shouldRetry,
      });
    }
  } catch (error: any) {
    logger.error('❌ Receipt validation error', {
      error: error.message,
      userId: req.user?.id,
      platform: req.body.platform,
    });
    
    // Let the global error handler deal with it
    throw error;
  }
});

export default router;

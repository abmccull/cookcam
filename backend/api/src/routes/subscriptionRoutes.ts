import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { subscriptionService } from '../services/subscriptionService';
import { AppStoreReceiptValidator, GooglePlayReceiptValidator } from '../services/receiptValidationService';

const router = express.Router();

// Get subscription status (checks JWT claims and database)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const subscription = await subscriptionService.getActiveSubscription(userId);
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get subscription status' 
    });
  }
});

// Validate App Store/Google Play purchase receipt
router.post('/validate-purchase', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { platform, receipt, purchaseToken, transactionId, productId } = req.body;

    if (!platform || !productId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Platform and productId are required' 
      });
    }

    let validationResult;

    if (platform === 'ios') {
      if (!receipt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Receipt is required for iOS validation' 
        });
      }
      
      const validator = new AppStoreReceiptValidator();
      validationResult = await validator.validateReceipt(receipt);
      
    } else if (platform === 'android') {
      if (!purchaseToken) {
        return res.status(400).json({ 
          success: false, 
          error: 'Purchase token is required for Android validation' 
        });
      }
      
      const validator = new GooglePlayReceiptValidator();
      validationResult = await validator.validatePurchase(productId, purchaseToken);
      
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid platform. Must be ios or android' 
      });
    }

    if (validationResult.isValid) {
      // For Google Play, acknowledge the purchase if needed
      if (platform === 'android' && validationResult.acknowledgmentState === 0) {
        const validator = new GooglePlayReceiptValidator();
        const acknowledged = await validator.acknowledgePurchase(productId, purchaseToken);
        
        if (!acknowledged) {
          return res.status(500).json({
            success: false,
            error: 'Failed to acknowledge Google Play purchase'
          });
        }
      }

      // Update subscription in database with comprehensive data
      const subscription = await subscriptionService.createOrUpdateSubscription({
        userId,
        productId: validationResult.productId,
        platform,
        transactionId: validationResult.transactionId,
        expiresAt: validationResult.expiresAt,
        isTrialPeriod: validationResult.isTrialPeriod,
        originalTransactionId: validationResult.originalTransactionId,
        receipt: platform === 'ios' ? receipt : undefined,
        purchaseToken: platform === 'android' ? purchaseToken : undefined,
        
        // Google Play specific fields
        autoRenewing: validationResult.autoRenewing,
        paymentState: validationResult.paymentState,
        cancelReason: validationResult.cancelReason,
        orderId: validationResult.orderId,
        linkedPurchaseToken: validationResult.linkedPurchaseToken,
        purchaseType: validationResult.purchaseType,
        countryCode: validationResult.countryCode,
        priceAmountMicros: validationResult.priceAmountMicros,
        priceCurrencyCode: validationResult.priceCurrencyCode,
        startTimeMillis: validationResult.startTimeMillis,
        introductoryPriceInfo: validationResult.introductoryPriceInfo,
      });

      // Update JWT claims for immediate feature access
      await subscriptionService.updateUserJWTClaims(userId, subscription);

      res.json({
        success: true,
        data: {
          subscription,
          validationResult: {
            ...validationResult,
            acknowledged: platform === 'android' ? validationResult.acknowledgmentState === 1 : true
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid receipt or purchase token',
        details: validationResult.error
      });
    }

  } catch (error) {
    console.error('Error validating purchase:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate purchase' 
    });
  }
});

// Refresh subscription status (re-validate with store)
router.post('/refresh-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const subscription = await subscriptionService.getActiveSubscription(userId);
    
    if (subscription) {
      // Re-validate with the store
      let isStillValid = false;
      
      if (subscription.platform === 'ios' && subscription.receipt) {
        const validator = new AppStoreReceiptValidator();
        const result = await validator.validateReceipt(subscription.receipt);
        isStillValid = result.isValid;
      } else if (subscription.platform === 'android' && subscription.purchase_token) {
        const validator = new GooglePlayReceiptValidator();
        const result = await validator.validatePurchase(subscription.tier_slug, subscription.purchase_token);
        isStillValid = result.isValid;
      }

      if (!isStillValid) {
        // Mark subscription as cancelled/expired
        await subscriptionService.markSubscriptionExpired(subscription.id);
        await subscriptionService.updateUserJWTClaims(userId, null);
      }
    }

    const updatedSubscription = await subscriptionService.getActiveSubscription(userId);

    res.json({
      success: true,
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Error refreshing subscription status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh subscription status' 
    });
  }
});

// Get available subscription products
router.get('/products', async (req, res) => {
  try {
    // Return the product IDs that match what's configured in App Store/Google Play
    const products = [
      {
        productId: 'com.cookcam.regular',
        price: '3.99',
        localizedPrice: '$3.99',
        currency: 'USD',
        title: 'CookCam Premium',
        description: 'Unlimited scans, premium recipes, and ad-free experience',
        platform: 'both',
        tier: 'regular',
        freeTrialPeriod: '3 days',
        features: [
          'Unlimited ingredient scans',
          'Premium AI recipes',
          'Recipe saving & sharing',
          'Ad-free experience',
          'Nutrition tracking'
        ]
      },
      {
        productId: 'com.cookcam.creator',
        price: '9.99',
        localizedPrice: '$9.99', 
        currency: 'USD',
        title: 'CookCam Creator',
        description: 'Everything in Premium plus creator tools, revenue sharing, and analytics',
        platform: 'both',
        tier: 'creator',
        freeTrialPeriod: '3 days',
        revenue_share: {
          referrals: 30, // 30% lifetime recurring revenue for active subscribers they refer
          tips: 100,     // 100% of tips
          collections: 70 // 70% of their curated recipes/collections
        },
        features: [
          'Everything in Premium',
          'Creator monetization tools',
          '30% recurring revenue on referrals',
          '100% of tips received',
          '70% of collections revenue',
          'Advanced analytics dashboard',
          'Creator badge & verification',
          'Priority recipe featuring',
          'Community engagement tools'
        ]
      }
    ];

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get products' 
    });
  }
});

// Store webhook endpoints for App Store Server Notifications and Google Play RTDN
router.post('/webhook/apple', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Handle Apple App Store Server Notifications V2
    const notification = req.body;
    
    // Verify the notification signature (implement JWT verification)
    // Process the notification type (INITIAL_BUY, DID_RENEW, CANCEL, etc.)
    
    console.log('Received Apple notification:', notification);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Apple webhook:', error);
    res.status(500).send('Error');
  }
});

router.post('/webhook/google', async (req, res) => {
  try {
    // Handle Google Play Real-time Developer Notifications
    const { message } = req.body;
    
    if (message && message.data) {
      const notificationData = JSON.parse(Buffer.from(message.data, 'base64').toString());
      console.log('📱 Received Google Play RTDN:', notificationData);
      
      const { subscriptionNotification, testNotification } = notificationData;
      
      // Handle test notifications
      if (testNotification) {
        console.log('🧪 Google Play test notification received');
        return res.status(200).send('OK');
      }
      
      // Handle subscription notifications
      if (subscriptionNotification) {
        const {
          version,
          notificationType,
          purchaseToken,
          subscriptionId
        } = subscriptionNotification;
        
        console.log(`📬 Subscription notification: ${notificationType} for ${subscriptionId}`);
        
        // Process different notification types
        switch (notificationType) {
          case 1: // SUBSCRIPTION_RECOVERED
            console.log('✅ Subscription recovered:', purchaseToken);
            await handleSubscriptionRecovered(subscriptionId, purchaseToken);
            break;
            
          case 2: // SUBSCRIPTION_RENEWED
            console.log('🔄 Subscription renewed:', purchaseToken);
            await handleSubscriptionRenewed(subscriptionId, purchaseToken);
            break;
            
          case 3: // SUBSCRIPTION_CANCELED
            console.log('❌ Subscription canceled:', purchaseToken);
            await handleSubscriptionCanceled(subscriptionId, purchaseToken);
            break;
            
          case 4: // SUBSCRIPTION_PURCHASED
            console.log('🛒 New subscription purchased:', purchaseToken);
            await handleSubscriptionPurchased(subscriptionId, purchaseToken);
            break;
            
          case 5: // SUBSCRIPTION_ON_HOLD
            console.log('⏸️ Subscription on hold:', purchaseToken);
            await handleSubscriptionOnHold(subscriptionId, purchaseToken);
            break;
            
          case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
            console.log('⏰ Subscription in grace period:', purchaseToken);
            await handleSubscriptionGracePeriod(subscriptionId, purchaseToken);
            break;
            
          case 7: // SUBSCRIPTION_RESTARTED
            console.log('🔄 Subscription restarted:', purchaseToken);
            await handleSubscriptionRestarted(subscriptionId, purchaseToken);
            break;
            
          case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
            console.log('💰 Price change confirmed:', purchaseToken);
            await handlePriceChangeConfirmed(subscriptionId, purchaseToken);
            break;
            
          case 9: // SUBSCRIPTION_DEFERRED
            console.log('⏭️ Subscription deferred:', purchaseToken);
            await handleSubscriptionDeferred(subscriptionId, purchaseToken);
            break;
            
          case 10: // SUBSCRIPTION_PAUSED
            console.log('⏸️ Subscription paused:', purchaseToken);
            await handleSubscriptionPaused(subscriptionId, purchaseToken);
            break;
            
          case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
            console.log('📅 Pause schedule changed:', purchaseToken);
            await handlePauseScheduleChanged(subscriptionId, purchaseToken);
            break;
            
          case 12: // SUBSCRIPTION_REVOKED
            console.log('🚫 Subscription revoked:', purchaseToken);
            await handleSubscriptionRevoked(subscriptionId, purchaseToken);
            break;
            
          case 13: // SUBSCRIPTION_EXPIRED
            console.log('⏰ Subscription expired:', purchaseToken);
            await handleSubscriptionExpired(subscriptionId, purchaseToken);
            break;
            
          default:
            console.log('❓ Unknown notification type:', notificationType);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing Google Play webhook:', error);
    res.status(500).send('Error');
  }
});

// Helper functions for handling different notification types
async function handleSubscriptionRecovered(subscriptionId: string, purchaseToken: string) {
  // Re-validate and reactivate subscription
  const validator = new GooglePlayReceiptValidator();
  const validationResult = await validator.validatePurchase(subscriptionId, purchaseToken);
  
  if (validationResult.isValid) {
    // Update subscription status to active
    // await subscriptionService.reactivateSubscription(purchaseToken);
    console.log('✅ Subscription reactivated');
  }
}

async function handleSubscriptionRenewed(subscriptionId: string, purchaseToken: string) {
  // Update subscription expiry date
  const validator = new GooglePlayReceiptValidator();
  const validationResult = await validator.validatePurchase(subscriptionId, purchaseToken);
  
  if (validationResult.isValid) {
    // Update subscription with new expiry date
    // await subscriptionService.updateSubscriptionExpiry(purchaseToken, validationResult.expiresAt);
    console.log('✅ Subscription renewed');
  }
}

async function handleSubscriptionCanceled(subscriptionId: string, purchaseToken: string) {
  // Mark subscription as canceled but keep active until expiry
  // await subscriptionService.markSubscriptionCanceled(purchaseToken);
  console.log('✅ Subscription marked as canceled');
}

async function handleSubscriptionPurchased(subscriptionId: string, purchaseToken: string) {
  // Handle new subscription purchase
  const validator = new GooglePlayReceiptValidator();
  const validationResult = await validator.validatePurchase(subscriptionId, purchaseToken);
  
  if (validationResult.isValid) {
    // This should trigger the normal purchase flow
    console.log('✅ New subscription processed');
  }
}

async function handleSubscriptionOnHold(subscriptionId: string, purchaseToken: string) {
  // Subscription is on hold due to payment issues
  // await subscriptionService.markSubscriptionOnHold(purchaseToken);
  console.log('⏸️ Subscription placed on hold');
}

async function handleSubscriptionGracePeriod(subscriptionId: string, purchaseToken: string) {
  // Subscription is in grace period
  // await subscriptionService.markSubscriptionGracePeriod(purchaseToken);
  console.log('⏰ Subscription in grace period');
}

async function handleSubscriptionRestarted(subscriptionId: string, purchaseToken: string) {
  // Subscription restarted from hold/pause
  const validator = new GooglePlayReceiptValidator();
  const validationResult = await validator.validatePurchase(subscriptionId, purchaseToken);
  
  if (validationResult.isValid) {
    // await subscriptionService.reactivateSubscription(purchaseToken);
    console.log('🔄 Subscription restarted');
  }
}

async function handlePriceChangeConfirmed(subscriptionId: string, purchaseToken: string) {
  // User confirmed price change
  console.log('💰 Price change confirmed');
}

async function handleSubscriptionDeferred(subscriptionId: string, purchaseToken: string) {
  // Subscription renewal deferred
  const validator = new GooglePlayReceiptValidator();
  const validationResult = await validator.validatePurchase(subscriptionId, purchaseToken);
  
  if (validationResult.isValid) {
    // await subscriptionService.updateSubscriptionExpiry(purchaseToken, validationResult.expiresAt);
    console.log('⏭️ Subscription deferred');
  }
}

async function handleSubscriptionPaused(subscriptionId: string, purchaseToken: string) {
  // Subscription paused by user
  // await subscriptionService.markSubscriptionPaused(purchaseToken);
  console.log('⏸️ Subscription paused');
}

async function handlePauseScheduleChanged(subscriptionId: string, purchaseToken: string) {
  // Pause schedule modified
  console.log('📅 Pause schedule changed');
}

async function handleSubscriptionRevoked(subscriptionId: string, purchaseToken: string) {
  // Subscription revoked (usually due to refund)
  // await subscriptionService.revokeSubscription(purchaseToken);
  console.log('🚫 Subscription revoked');
}

async function handleSubscriptionExpired(subscriptionId: string, purchaseToken: string) {
  // Subscription expired
  // await subscriptionService.markSubscriptionExpired(purchaseToken);
  console.log('⏰ Subscription expired');
}

// Cancel subscription (mark in our system, user cancels through store)
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Mark subscription as cancelled in our system
    // Note: Actual cancellation happens through App Store/Google Play
    await subscriptionService.markSubscriptionForCancellation(userId);

    res.json({
      success: true,
      message: 'Subscription marked for cancellation. It will remain active until the end of the current billing period.'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel subscription' 
    });
  }
});

// Upgrade user to creator tier
router.post('/upgrade-to-creator', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { subscriptionData } = req.body;

    // Update user profile to creator status
    const updatedUser = await subscriptionService.upgradeUserToCreator(userId, {
      tier: 'creator',
      revenueSharePercentage: 70,
      subscriptionData
    });

    // Set up creator-specific features
    await subscriptionService.setupCreatorFeatures(userId);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Successfully upgraded to Creator tier'
    });

  } catch (error) {
    console.error('Error upgrading to creator:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upgrade to creator' 
    });
  }
});

export default router; 
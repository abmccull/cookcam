import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';
import axios from 'axios';
import { supabase } from '../index';
import crypto from 'crypto';

const router = Router();

// Apple App Store configuration
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';

// Google Play configuration
const GOOGLE_PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.cookcam.app';
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

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

// Validate Apple App Store receipt
async function validateAppleReceipt(
  receiptData: string,
  isProduction: boolean = true
): Promise<any> {
  const url = isProduction ? APPLE_VERIFY_URL_PRODUCTION : APPLE_VERIFY_URL_SANDBOX;

  try {
    const requestBody = {
      'receipt-data': receiptData,
      password: APPLE_SHARED_SECRET,
      'exclude-old-transactions': true,
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const { status, receipt, latest_receipt_info } = response.data;

    // Status codes: https://developer.apple.com/documentation/appstorereceipts/status
    if (status === 21007) {
      // Receipt is from sandbox, retry with sandbox URL
      logger.debug('🧪 Apple receipt is from sandbox, retrying...');
      return validateAppleReceipt(receiptData, false);
    }

    if (status === 0) {
      // Success
      return {
        success: true,
        receipt: receipt,
        latestReceiptInfo: latest_receipt_info,
        environment: isProduction ? 'production' : 'sandbox',
      };
    } else {
      return {
        success: false,
        status,
        error: getAppleStatusError(status),
      };
    }
  } catch (error) {
    logger.error('❌ Apple receipt validation failed:', error);
    return {
      success: false,
      error: 'Network error validating receipt',
    };
  }
}

// Validate Google Play purchase
async function validateGooglePlayPurchase(productId: string, purchaseToken: string): Promise<any> {
  try {
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error('Google Service Account key not configured');
    }

    // Parse service account key
    const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);

    // Generate JWT for Google API authentication
    const googleAuth = await getGoogleAccessToken(serviceAccount);

    // Determine if it's a subscription or one-time product
    const isSubscription =
      productId.includes('monthly') ||
      productId.includes('yearly') ||
      productId.includes('creator');

    let apiUrl: string;
    if (isSubscription) {
      apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
    } else {
      apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`;
    }

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${googleAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const purchaseData = response.data;

    // Check if purchase is valid
    if (isSubscription) {
      // For subscriptions, check if it's active
      const isValid = purchaseData.paymentState === 1; // 1 = Received
      const isActive =
        purchaseData.autoRenewing === true ||
        (purchaseData.expiryTimeMillis && parseInt(purchaseData.expiryTimeMillis) > Date.now());

      return {
        success: isValid,
        purchaseData,
        isActive,
        expiryTime: purchaseData.expiryTimeMillis
          ? new Date(parseInt(purchaseData.expiryTimeMillis))
          : null,
      };
    } else {
      // For one-time products
      const isValid = purchaseData.purchaseState === 0; // 0 = Purchased
      return {
        success: isValid,
        purchaseData,
      };
    }
  } catch (error: any) {
    logger.error('❌ Google Play validation failed:', error);
    return {
      success: false,
      error: error.response?.data?.error?.message || 'Failed to validate Google Play purchase',
    };
  }
}

// Generate Google API access token
async function getGoogleAccessToken(serviceAccount: any): Promise<{ access_token: string }> {
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Create JWT
  const headerBase64 = Buffer.from(JSON.stringify(jwtHeader)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');

  const signatureInput = `${headerBase64}.${payloadBase64}`;
  const signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(signatureInput),
    serviceAccount.private_key
  );
  const signatureBase64 = signature.toString('base64url');

  const jwt = `${headerBase64}.${payloadBase64}.${signatureBase64}`;

  // Exchange JWT for access token
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  return tokenResponse.data;
}

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

    // Calculate subscription end date
    let currentPeriodEnd: Date;
    if (platform === 'ios') {
      // For iOS, use the expiration date from receipt
      const latestTransaction = validationData.latestReceiptInfo?.[0];
      currentPeriodEnd = latestTransaction
        ? new Date(parseInt(latestTransaction.expires_date_ms))
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    } else {
      // For Android, use expiry time from purchase data
      currentPeriodEnd =
        validationData.expiryTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

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
          provider_subscription_id:
            platform === 'ios'
              ? validationData.latestReceiptInfo?.[0]?.original_transaction_id
              : validationData.purchaseData.orderId,
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
        provider_subscription_id:
          platform === 'ios'
            ? validationData.latestReceiptInfo?.[0]?.original_transaction_id
            : validationData.purchaseData.orderId,
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

    logger.info(`✅ Subscription updated for user ${userId} to tier ${tierId}`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to update user subscription:', error);
    throw error;
  }
}

// Main validation endpoint
router.post('/validate-receipt', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { platform, productId } = req.body as ReceiptValidationRequest;

    logger.debug(`🧾 Validating ${platform} receipt for user ${userId}, product ${productId}`);

    let validationResult;

    if (platform === 'ios') {
      const { receipt } = req.body as AppleReceiptValidationRequest;
      if (!receipt) {
        return res.status(400).json({
          success: false,
          error: 'Receipt data is required for iOS validation',
        });
      }

      validationResult = await validateAppleReceipt(receipt);
    } else if (platform === 'android') {
      const { purchaseToken } = req.body as AndroidReceiptValidationRequest;
      if (!purchaseToken) {
        return res.status(400).json({
          success: false,
          error: 'Purchase token is required for Android validation',
        });
      }

      validationResult = await validateGooglePlayPurchase(productId, purchaseToken);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Platform must be either "ios" or "android"',
      });
    }

    if (validationResult.success) {
      // Update user subscription
      await updateUserSubscription(userId, productId, platform, validationResult);

      res.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: {
          platform,
          productId,
          status: 'active',
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: validationResult.error || 'Receipt validation failed',
      });
    }
  } catch (error) {
    logger.error('❌ Receipt validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during validation',
    });
  }
});

// Helper function for Apple status error messages
function getAppleStatusError(status: number): string {
  const errors: { [key: number]: string } = {
    21000: 'The App Store could not read the JSON object you provided.',
    21002: 'The data in the receipt-data property was malformed or missing.',
    21003: 'The receipt could not be authenticated.',
    21004:
      'The shared secret you provided does not match the shared secret on file for your account.',
    21005: 'The receipt server is not currently available.',
    21006: 'This receipt is valid but the subscription has expired.',
    21007: 'This receipt is from the sandbox environment.',
    21008: 'This receipt is from the production environment.',
    21010: 'This receipt could not be authorized.',
  };

  return errors[status] || `Unknown status code: ${status}`;
}

export default router;

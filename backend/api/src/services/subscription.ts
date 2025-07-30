import { supabase } from '../index';
import jwt from 'jsonwebtoken';
import axios from 'axios';

interface SubscriptionInfo {
  userId: string;
  platform: 'ios' | 'android';
  productId: string;
  purchaseToken?: string; // Android
  transactionId?: string; // iOS
  originalTransactionId?: string; // iOS
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'grace_period';
  expiresAt: Date;
  autoRenewing: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationResult {
  valid: boolean;
  subscription?: SubscriptionInfo;
  error?: string;
}

export class SubscriptionService {
  private readonly PRODUCT_ID = 'com.cookcam.monthly';
  private readonly SUBSCRIPTION_PRICE = 3.99;
  private readonly TRIAL_DAYS = 3;

  // iOS App Store configuration
  private readonly APP_STORE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private readonly APP_STORE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
  private readonly APP_STORE_SHARED_SECRET = process.env.APP_STORE_SHARED_SECRET || '';

  // Google Play configuration
  private readonly GOOGLE_PLAY_PACKAGE = 'com.cookcam';
  private readonly GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

  // Verify iOS receipt
  async verifyIOSReceipt(receipt: string, userId: string): Promise<VerificationResult> {
    try {
      // First try production, then sandbox
      let response = await this.verifyWithAppStore(receipt, this.APP_STORE_PRODUCTION_URL);

      // If we get a 21007 status, it means we should use sandbox
      if (response.data.status === 21007) {
        response = await this.verifyWithAppStore(receipt, this.APP_STORE_SANDBOX_URL);
      }

      if (response.data.status !== 0) {
        return {
          valid: false,
          error: `Invalid receipt: status ${response.data.status}`,
        };
      }

      // Parse the receipt
      const latestReceipt = response.data.latest_receipt_info?.[0];
      if (!latestReceipt) {
        return {
          valid: false,
          error: 'No subscription found in receipt',
        };
      }

      // Check if it's our subscription
      if (latestReceipt.product_id !== this.PRODUCT_ID) {
        return {
          valid: false,
          error: 'Invalid product ID',
        };
      }

      // Create subscription info
      const subscription: SubscriptionInfo = {
        userId,
        platform: 'ios',
        productId: latestReceipt.product_id,
        transactionId: latestReceipt.transaction_id,
        originalTransactionId: latestReceipt.original_transaction_id,
        status: this.getIOSSubscriptionStatus(latestReceipt),
        expiresAt: new Date(parseInt(latestReceipt.expires_date_ms)),
        autoRenewing: latestReceipt.auto_renew_status === '1',
        trialEnd:
          latestReceipt.is_trial_period === 'true'
            ? new Date(parseInt(latestReceipt.expires_date_ms))
            : undefined,
        createdAt: new Date(parseInt(latestReceipt.original_purchase_date_ms)),
        updatedAt: new Date(),
      };

      // Save to database
      await this.saveSubscription(subscription);

      return {
        valid: true,
        subscription,
      };
    } catch (error: unknown) {
      console.error('iOS receipt verification error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  // Verify with App Store
  private async verifyWithAppStore(receipt: string, url: string): Promise<any> {
    return axios.post(url, {
      'receipt-data': receipt,
      password: this.APP_STORE_SHARED_SECRET,
      'exclude-old-transactions': true,
    });
  }

  // Get iOS subscription status
  private getIOSSubscriptionStatus(receipt: any): SubscriptionInfo['status'] {
    const now = Date.now();
    const expiresMs = parseInt(receipt.expires_date_ms);

    if (receipt.cancellation_date_ms) {
      return 'cancelled';
    }

    if (expiresMs > now) {
      return 'active';
    }

    // Check for grace period (typically 16 days for iOS)
    const gracePeriodMs = 16 * 24 * 60 * 60 * 1000;
    if (expiresMs + gracePeriodMs > now) {
      return 'grace_period';
    }

    return 'expired';
  }

  // Verify Android purchase token
  async verifyAndroidPurchase(purchaseToken: string, userId: string): Promise<VerificationResult> {
    try {
      // Get access token for Google Play API
      const accessToken = await this.getGoogleAccessToken();

      // Verify the subscription
      const response = await axios.get(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${this.GOOGLE_PLAY_PACKAGE}/purchases/subscriptions/${this.PRODUCT_ID}/tokens/${purchaseToken}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const purchase = response.data;

      // Create subscription info
      const subscription: SubscriptionInfo = {
        userId,
        platform: 'android',
        productId: this.PRODUCT_ID,
        purchaseToken,
        status: this.getAndroidSubscriptionStatus(purchase),
        expiresAt: new Date(parseInt(purchase.expiryTimeMillis)),
        autoRenewing: purchase.autoRenewing,
        trialEnd:
          purchase.paymentState === 2 // Free trial
            ? new Date(parseInt(purchase.expiryTimeMillis))
            : undefined,
        createdAt: new Date(parseInt(purchase.startTimeMillis)),
        updatedAt: new Date(),
      };

      // Save to database
      await this.saveSubscription(subscription);

      return {
        valid: true,
        subscription,
      };
    } catch (error: unknown) {
      console.error('Android purchase verification error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  // Get Google access token
  private async getGoogleAccessToken(): Promise<string> {
    const serviceAccount = JSON.parse(this.GOOGLE_SERVICE_ACCOUNT_KEY);

    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(jwtPayload, serviceAccount.private_key, {
      algorithm: 'RS256',
    });

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });

    return response.data.access_token;
  }

  // Get Android subscription status
  private getAndroidSubscriptionStatus(purchase: any): SubscriptionInfo['status'] {
    if (purchase.cancelReason) {
      return 'cancelled';
    }

    const now = Date.now();
    const expiryMs = parseInt(purchase.expiryTimeMillis);

    if (expiryMs > now) {
      return 'active';
    }

    // Check if in grace period
    if (purchase.autoRenewing && expiryMs + 7 * 24 * 60 * 60 * 1000 > now) {
      return 'grace_period';
    }

    return 'expired';
  }

  // Save subscription to database
  private async saveSubscription(subscription: SubscriptionInfo): Promise<void> {
    const { error } = await supabase.from('subscriptions').upsert(
      {
        user_id: subscription.userId,
        platform: subscription.platform,
        product_id: subscription.productId,
        purchase_token: subscription.purchaseToken,
        transaction_id: subscription.transactionId,
        original_transaction_id: subscription.originalTransactionId,
        status: subscription.status,
        expires_at: subscription.expiresAt.toISOString(),
        auto_renewing: subscription.autoRenewing,
        trial_end: subscription.trialEnd?.toISOString(),
        created_at: subscription.createdAt.toISOString(),
        updated_at: subscription.updatedAt.toISOString(),
      },
      {
        onConflict: 'user_id,platform',
      }
    );

    if (error) {
      throw new Error(`Failed to save subscription: ${error.message}`);
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'grace_period'])
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Subscription check error:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error: unknown) {
      console.error('Subscription check error:', error);
      return false;
    }
  }

  // Get user's subscription details
  async getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.user_id,
        platform: data.platform,
        productId: data.product_id,
        purchaseToken: data.purchase_token,
        transactionId: data.transaction_id,
        originalTransactionId: data.original_transaction_id,
        status: data.status,
        expiresAt: new Date(data.expires_at),
        autoRenewing: data.auto_renewing,
        trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error: unknown) {
      console.error('Get subscription error:', error);
      return null;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renewing: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Process webhook from App Store
  async processAppStoreWebhook(notification: Record<string, unknown>): Promise<void> {
    // Handle various notification types
    const notificationType = notification.notification_type;

    switch (notificationType) {
      case 'INITIAL_BUY':
      case 'DID_RECOVER':
      case 'DID_RENEW':
        // Update subscription status
        await this.updateSubscriptionFromWebhook(notification, 'active');
        break;

      case 'DID_FAIL_TO_RENEW':
      case 'DID_CHANGE_RENEWAL_STATUS':
      case 'CANCEL':
        // Update subscription status
        await this.updateSubscriptionFromWebhook(notification, 'cancelled');
        break;

      case 'REFUND':
        // Handle refund
        await this.handleRefund(notification);
        break;
    }
  }

  // Process webhook from Google Play
  async processGooglePlayWebhook(notification: Record<string, unknown>): Promise<void> {
    const subscriptionNotification = notification.subscriptionNotification as Record<
      string,
      unknown
    >;
    const packageName = notification.packageName;

    if (packageName !== this.GOOGLE_PLAY_PACKAGE) {
      return;
    }

    if (!subscriptionNotification) {
      return;
    }

    const notificationType = subscriptionNotification.notificationType;
    const purchaseToken = subscriptionNotification.purchaseToken;

    if (typeof purchaseToken !== 'string') {
      return;
    }

    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
      case 2: // SUBSCRIPTION_RENEWED
      case 7: // SUBSCRIPTION_RESTARTED
        await this.verifyAndUpdateAndroidSubscription(purchaseToken);
        break;

      case 3: // SUBSCRIPTION_CANCELED
      case 4: // SUBSCRIPTION_PURCHASED
      case 5: // SUBSCRIPTION_ON_HOLD
      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        await this.verifyAndUpdateAndroidSubscription(purchaseToken);
        break;
    }
  }

  // Update subscription from webhook
  private async updateSubscriptionFromWebhook(
    notification: Record<string, unknown>,
    status: SubscriptionInfo['status']
  ): Promise<void> {
    const latest_receipt_info = notification.latest_receipt_info as unknown[];
    if (
      !latest_receipt_info ||
      !Array.isArray(latest_receipt_info) ||
      latest_receipt_info.length === 0
    ) {
      return;
    }

    const receipt = latest_receipt_info[0] as Record<string, unknown>;

    await supabase
      .from('subscriptions')
      .update({
        status,
        expires_at: new Date(parseInt(String(receipt.expires_date_ms))).toISOString(),
        auto_renewing: receipt.auto_renew_status === '1',
        updated_at: new Date().toISOString(),
      })
      .eq('original_transaction_id', receipt.original_transaction_id);
  }

  // Verify and update Android subscription
  private async verifyAndUpdateAndroidSubscription(purchaseToken: string): Promise<void> {
    // Get the subscription from database
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .single();

    if (data) {
      // Re-verify the subscription
      await this.verifyAndroidPurchase(purchaseToken, data.user_id);
    }
  }

  // Handle refund
  private async handleRefund(notification: Record<string, unknown>): Promise<void> {
    const latest_receipt_info = notification.latest_receipt_info as unknown[];
    if (
      !latest_receipt_info ||
      !Array.isArray(latest_receipt_info) ||
      latest_receipt_info.length === 0
    ) {
      return;
    }

    const receipt = latest_receipt_info[0] as Record<string, unknown>;

    // Mark subscription as refunded
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renewing: false,
        updated_at: new Date().toISOString(),
      })
      .eq('original_transaction_id', receipt.original_transaction_id);

    // You might want to revoke access immediately or handle differently
  }
}

export const subscriptionService = new SubscriptionService();

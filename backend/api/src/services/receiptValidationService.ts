import https from 'https';
import { google } from 'googleapis';

interface ValidationResult {
  isValid: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  expiresAt?: Date;
  isTrialPeriod?: boolean;
  error?: string;
}

// Apple App Store receipt validation
export class AppStoreReceiptValidator {
  private readonly verifyReceiptUrl = process.env.NODE_ENV === 'production' 
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  async validateReceipt(receiptData: string): Promise<ValidationResult> {
    try {
      const requestBody = {
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET, // Set this in your environment
        'exclude-old-transactions': true
      };

      const response = await this.makeHTTPSRequest(this.verifyReceiptUrl, requestBody);
      
      if (response.status === 0) {
        // Valid receipt
        const latestReceiptInfo = response.latest_receipt_info?.[0];
        
        if (latestReceiptInfo) {
          const expiresDate = new Date(parseInt(latestReceiptInfo.expires_date_ms));
          const isActive = expiresDate > new Date();
          
          return {
            isValid: isActive,
            productId: latestReceiptInfo.product_id,
            transactionId: latestReceiptInfo.transaction_id,
            originalTransactionId: latestReceiptInfo.original_transaction_id,
            expiresAt: expiresDate,
            isTrialPeriod: latestReceiptInfo.is_trial_period === 'true',
          };
        }
      }
      
      return {
        isValid: false,
        error: `Apple validation failed with status: ${response.status}`
      };
      
    } catch (error) {
      console.error('Apple receipt validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate Apple receipt'
      };
    }
  }

  private makeHTTPSRequest(url: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(url, options, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedResponse = JSON.parse(responseBody);
            resolve(parsedResponse);
          } catch (parseError) {
            reject(parseError);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}

// Google Play receipt validation
export class GooglePlayReceiptValidator {
  private androidPublisher: any;

  constructor() {
    // Initialize Google Play API client
    // You'll need to set up service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, // Path to service account JSON
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    this.androidPublisher = google.androidpublisher({
      version: 'v3',
      auth
    });
  }

  async validatePurchase(productId: string, purchaseToken: string): Promise<ValidationResult & {
    acknowledgmentState?: number;
    autoRenewing?: boolean;
    cancelReason?: number;
    paymentState?: number;
    orderId?: string;
    linkedPurchaseToken?: string;
    purchaseType?: number;
    countryCode?: string;
    priceAmountMicros?: string;
    priceCurrencyCode?: string;
    startTimeMillis?: string;
    introductoryPriceInfo?: any;
  }> {
    try {
      const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.cookcam.app';
      
      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      const subscription = response.data;
      
      if (subscription) {
        const expiryTimeMillis = parseInt(subscription.expiryTimeMillis || '0');
        const startTimeMillis = parseInt(subscription.startTimeMillis || '0');
        const expiresAt = new Date(expiryTimeMillis);
        const startedAt = new Date(startTimeMillis);
        
        // Enhanced validation logic
        const isExpired = expiresAt <= new Date();
        const hasValidPayment = subscription.paymentState === 1 || subscription.paymentState === 2; // Payment received or free trial
        const isNotCanceled = !subscription.cancelReason || subscription.autoRenewing;
        
        // Check if subscription needs acknowledgment
        const needsAcknowledgment = subscription.acknowledgementState === 0;
        
        // Determine if subscription is currently active
        const isActive = !isExpired && hasValidPayment && isNotCanceled;
        
        // Handle introductory pricing (free trial)
        const isTrialPeriod = subscription.paymentState === 2 || 
                             (subscription.introductoryPriceInfo && 
                              subscription.introductoryPriceInfo.introductoryPriceCycles > 0);
        
        return {
          isValid: isActive,
          productId,
          transactionId: purchaseToken,
          originalTransactionId: subscription.linkedPurchaseToken || purchaseToken,
          expiresAt,
          isTrialPeriod,
          
          // Additional Google Play specific fields
          acknowledgmentState: subscription.acknowledgementState,
          autoRenewing: subscription.autoRenewing,
          cancelReason: subscription.cancelReason,
          paymentState: subscription.paymentState,
          orderId: subscription.orderId,
          linkedPurchaseToken: subscription.linkedPurchaseToken,
          purchaseType: subscription.purchaseType,
          countryCode: subscription.countryCode,
          priceAmountMicros: subscription.priceAmountMicros,
          priceCurrencyCode: subscription.priceCurrencyCode,
          startTimeMillis: subscription.startTimeMillis,
          introductoryPriceInfo: subscription.introductoryPriceInfo,
          
          error: needsAcknowledgment ? 'Subscription needs acknowledgment' : undefined
        };
      }
      
      return {
        isValid: false,
        error: 'Google Play subscription not found'
      };
      
    } catch (error: any) {
      console.error('Google Play validation error:', error);
      
      // Handle specific Google Play API errors
      if (error.code === 410) {
        return {
          isValid: false,
          error: 'Subscription purchase token is no longer valid'
        };
      } else if (error.code === 404) {
        return {
          isValid: false,
          error: 'Subscription not found'
        };
      }
      
      return {
        isValid: false,
        error: `Google Play validation failed: ${error.message}`
      };
    }
  }

  // Acknowledge a subscription purchase (required for Google Play)
  async acknowledgePurchase(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.cookcam.app';
      
      await this.androidPublisher.purchases.subscriptions.acknowledge({
        packageName,
        subscriptionId: productId,
        token: purchaseToken
      });
      
      console.log('✅ Google Play subscription acknowledged:', purchaseToken);
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to acknowledge Google Play subscription:', error);
      return false;
    }
  }

  // Cancel a subscription (for admin/support use)
  async cancelSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.cookcam.app';
      
      await this.androidPublisher.purchases.subscriptions.cancel({
        packageName,
        subscriptionId: productId,
        token: purchaseToken
      });
      
      console.log('✅ Google Play subscription cancelled:', purchaseToken);
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to cancel Google Play subscription:', error);
      return false;
    }
  }

  // Defer a subscription (change renewal date)
  async deferSubscription(productId: string, purchaseToken: string, newExpiryTime: Date): Promise<boolean> {
    try {
      const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.cookcam.app';
      
      await this.androidPublisher.purchases.subscriptions.defer({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
        requestBody: {
          deferralInfo: {
            expectedExpiryTimeMillis: newExpiryTime.getTime().toString()
          }
        }
      });
      
      console.log('✅ Google Play subscription deferred:', purchaseToken);
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to defer Google Play subscription:', error);
      return false;
    }
  }
}

// Utility function to create validators
export const createReceiptValidator = (platform: 'ios' | 'android') => {
  return platform === 'ios' 
    ? new AppStoreReceiptValidator()
    : new GooglePlayReceiptValidator();
}; 
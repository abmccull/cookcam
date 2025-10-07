import https from 'https';
import { logger } from '../utils/logger';
import { googlePlayService } from './googlePlayService';

export interface ValidationResult {
  isValid: boolean;
  productId?: string;
  purchaseToken?: string;
  transactionId?: string;
  platform: 'ios' | 'android';
  error?: string;
  expiresAt?: Date;
  isTrialPeriod?: boolean;
  // Android specific fields
  acknowledgmentState?: number;
  autoRenewing?: boolean;
  paymentState?: number;
  cancelReason?: number;
  orderId?: string;
  linkedPurchaseToken?: string;
  purchaseType?: number;
  countryCode?: string;
  priceAmountMicros?: string;
  priceCurrencyCode?: string;
  startTimeMillis?: string;
  introductoryPriceInfo?: any;
}

// Apple App Store receipt validation
export class AppStoreReceiptValidator {
  private readonly verifyReceiptUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

  async validateReceipt(receiptData: string): Promise<ValidationResult> {
    try {
      const requestBody = {
        'receipt-data': receiptData,
        password: process.env.APPLE_SHARED_SECRET, // Set this in your environment
        'exclude-old-transactions': true,
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
            platform: 'ios' as const,
          };
        }
      }

      return {
        isValid: false,
        platform: 'ios' as const,
        error: `Apple validation failed with status: ${response.status}`,
      };
    } catch (error: unknown) {
      logger.error('Apple receipt validation error:', error);
      return {
        isValid: false,
        platform: 'ios' as const,
        error: 'Failed to validate Apple receipt',
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
          'Content-Length': Buffer.byteLength(postData),
        },
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
  constructor() {
    // No longer need to initialize googleapis - using our lightweight service
  }

  async validatePurchase(
    productId: string,
    purchaseToken: string
  ): Promise<
    ValidationResult & {
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
    }
  > {
    try {
      // Use our lightweight Google Play service
      const subscription = await googlePlayService.validateSubscription(productId, purchaseToken);

      if (subscription) {
        const expiryTimeMillis = parseInt(subscription.expiryTimeMillis || '0');
        // const startTimeMillis = parseInt(subscription.startTimeMillis || '0');
        const expiresAt = new Date(expiryTimeMillis);

        // Enhanced validation logic
        const isExpired = expiresAt <= new Date();
        const hasValidPayment = subscription.paymentState === 1 || subscription.paymentState === 2; // Payment received or free trial
        const isNotCanceled = !subscription.cancelReason || subscription.autoRenewing;

        // Check if subscription needs acknowledgment
        // const needsAcknowledgment = subscription.acknowledgementState === 0;

        // Determine if subscription is currently active
        const isActive = !isExpired && hasValidPayment && isNotCanceled;

        // Handle introductory pricing (free trial)
        const isTrialPeriod =
          subscription.paymentState === 2 ||
          (subscription.introductoryPriceInfo &&
            subscription.introductoryPriceInfo.introductoryPriceCycles > 0);

        return {
          isValid: isActive,
          productId,
          purchaseToken,
          transactionId: purchaseToken,
          platform: 'android' as const,
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
        };
      }

      return {
        isValid: false,
        platform: 'android' as const,
        error: 'Google Play subscription not found',
      };
    } catch (error: any) {
      logger.error('Google Play validation error:', error);

      return {
        isValid: false,
        platform: 'android' as const,
        error: `Google Play validation failed: ${error.message}`,
      };
    }
  }

  // Acknowledge a subscription purchase (required for Google Play)
  async acknowledgePurchase(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      await googlePlayService.acknowledgeSubscription(productId, purchaseToken);
      return true;
    } catch (error: any) {
      logger.error('Google Play acknowledgment error:', error);
      return false;
    }
  }

  // Cancel a subscription
  async cancelSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      await googlePlayService.cancelSubscription(productId, purchaseToken);
      return true;
    } catch (error: any) {
      logger.error('Google Play cancellation error:', error);
      return false;
    }
  }

  // Defer a subscription (change renewal date)
  async deferSubscription(
    productId: string,
    purchaseToken: string,
    newExpiryTime: Date
  ): Promise<boolean> {
    try {
      await googlePlayService.deferSubscription(productId, purchaseToken, newExpiryTime);
      return true;
    } catch (error: any) {
      logger.error('Google Play deferral error:', error);
      return false;
    }
  }
}

// Utility function to create validators
export const createReceiptValidator = (platform: 'ios' | 'android') => {
  return platform === 'ios' ? new AppStoreReceiptValidator() : new GooglePlayReceiptValidator();
};

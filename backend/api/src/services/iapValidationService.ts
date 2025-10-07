import { logger } from '../utils/logger';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { supabase } from '../index';
import { getEnv } from '../config/env';

/**
 * Enhanced IAP Validation Service
 * 
 * Features:
 * - Transaction ID deduplication
 * - Retry logic with exponential backoff
 * - Raw receipt storage for audit
 * - Sandbox/production separation
 * - Validation result caching
 */

interface ValidationResult {
  success: boolean;
  transactionId?: string;
  expiryDate?: Date;
  environment?: 'sandbox' | 'production';
  error?: string;
  shouldRetry?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export class IAPValidationService {
  private env = getEnv();

  /**
   * Validate iOS receipt with retry logic and deduplication
   */
  async validateAppleReceipt(
    userId: string,
    receiptData: string,
    productId: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Check if receipt already validated (deduplication)
      const receiptHash = this.hashReceipt(receiptData);
      const existingValidation = await this.checkExistingValidation(receiptHash, 'ios');

      if (existingValidation) {
        logger.info('⚠️  Receipt already validated (deduplication)', {
          userId,
          productId,
          transactionId: existingValidation.transaction_id,
          validatedAt: existingValidation.validated_at,
        });

        return {
          success: existingValidation.status === 'valid',
          transactionId: existingValidation.transaction_id,
          environment: existingValidation.environment as 'sandbox' | 'production',
          error: existingValidation.status === 'invalid' ? 'Receipt already validated as invalid' : undefined,
        };
      }

      // Step 2: Validate with retry logic
      const validationResult = await this.validateAppleReceiptWithRetry(
        receiptData,
        DEFAULT_RETRY_CONFIG
      );

      // Step 3: Store validation result for audit and deduplication
      await this.storeValidationResult({
        userId,
        platform: 'ios',
        productId,
        receiptHash,
        transactionId: validationResult.transactionId,
        status: validationResult.success ? 'valid' : 'invalid',
        environment: validationResult.environment || 'production',
        rawReceipt: receiptData,
        validationResponse: validationResult,
        validationDurationMs: Date.now() - startTime,
      });

      logger.info('✅ Apple receipt validation complete', {
        userId,
        productId,
        success: validationResult.success,
        transactionId: validationResult.transactionId,
        durationMs: Date.now() - startTime,
      });

      return validationResult;
    } catch (error: any) {
      logger.error('❌ Apple receipt validation error', {
        userId,
        productId,
        error: error.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: 'Validation failed after retries',
        shouldRetry: true,
      };
    }
  }

  /**
   * Validate Google Play purchase with retry logic and deduplication
   */
  async validateGooglePlayPurchase(
    userId: string,
    purchaseToken: string,
    productId: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Check if purchase already validated (deduplication)
      const tokenHash = this.hashReceipt(purchaseToken);
      const existingValidation = await this.checkExistingValidation(tokenHash, 'android');

      if (existingValidation) {
        logger.info('⚠️  Purchase already validated (deduplication)', {
          userId,
          productId,
          orderId: existingValidation.transaction_id,
          validatedAt: existingValidation.validated_at,
        });

        return {
          success: existingValidation.status === 'valid',
          transactionId: existingValidation.transaction_id,
          error: existingValidation.status === 'invalid' ? 'Purchase already validated as invalid' : undefined,
        };
      }

      // Step 2: Validate with retry logic
      const validationResult = await this.validateGooglePlayPurchaseWithRetry(
        productId,
        purchaseToken,
        DEFAULT_RETRY_CONFIG
      );

      // Step 3: Store validation result
      await this.storeValidationResult({
        userId,
        platform: 'android',
        productId,
        receiptHash: tokenHash,
        transactionId: validationResult.transactionId,
        status: validationResult.success ? 'valid' : 'invalid',
        environment: validationResult.environment || 'production',
        rawReceipt: purchaseToken,
        validationResponse: validationResult,
        validationDurationMs: Date.now() - startTime,
      });

      logger.info('✅ Google Play validation complete', {
        userId,
        productId,
        success: validationResult.success,
        orderId: validationResult.transactionId,
        durationMs: Date.now() - startTime,
      });

      return validationResult;
    } catch (error: any) {
      logger.error('❌ Google Play validation error', {
        userId,
        productId,
        error: error.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: 'Validation failed after retries',
        shouldRetry: true,
      };
    }
  }

  /**
   * Validate Apple receipt with exponential backoff retry
   */
  private async validateAppleReceiptWithRetry(
    receiptData: string,
    config: RetryConfig,
    isProduction: boolean = true
  ): Promise<ValidationResult> {
    let lastError: any;
    let attempt = 0;

    while (attempt < config.maxRetries) {
      try {
        const result = await this.callAppleVerifyAPI(receiptData, isProduction);
        
        // Handle sandbox/production mismatch
        if (result.status === 21007 && isProduction) {
          logger.debug('🧪 Receipt from sandbox, retrying with sandbox URL');
          return this.validateAppleReceiptWithRetry(receiptData, config, false);
        }

        if (result.success) {
          return result;
        }

        // Don't retry if receipt is fundamentally invalid
        if ([21002, 21003, 21010].includes(result.status)) {
          logger.warn('❌ Apple receipt invalid (no retry)', { status: result.status });
          return result;
        }

        lastError = result.error;
      } catch (error: any) {
        lastError = error;
        logger.warn(`⚠️  Apple validation attempt ${attempt + 1} failed`, {
          error: error.message,
          willRetry: attempt < config.maxRetries - 1,
        });
      }

      attempt++;
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );
        logger.debug(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Validation failed after all retries',
      shouldRetry: false,
    };
  }

  /**
   * Validate Google Play purchase with exponential backoff retry
   */
  private async validateGooglePlayPurchaseWithRetry(
    productId: string,
    purchaseToken: string,
    config: RetryConfig
  ): Promise<ValidationResult> {
    let lastError: any;
    let attempt = 0;

    while (attempt < config.maxRetries) {
      try {
        const result = await this.callGooglePlayAPI(productId, purchaseToken);
        
        if (result.success) {
          return result;
        }

        // Don't retry for permanent errors (404, 410)
        if (result.error?.includes('404') || result.error?.includes('410')) {
          logger.warn('❌ Google Play purchase not found (no retry)');
          return result;
        }

        lastError = result.error;
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error (429) - longer backoff
        const isRateLimit = (error as AxiosError)?.response?.status === 429;
        if (isRateLimit) {
          logger.warn('⚠️  Google Play rate limit hit');
        }

        logger.warn(`⚠️  Google Play validation attempt ${attempt + 1} failed`, {
          error: error.message,
          isRateLimit,
          willRetry: attempt < config.maxRetries - 1,
        });
      }

      attempt++;
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );
        logger.debug(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Validation failed after all retries',
      shouldRetry: false,
    };
  }

  /**
   * Call Apple's verifyReceipt API
   */
  private async callAppleVerifyAPI(
    receiptData: string,
    isProduction: boolean
  ): Promise<any> {
    const url = isProduction
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    const response = await axios.post(
      url,
      {
        'receipt-data': receiptData,
        password: this.env.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const { status, receipt, latest_receipt_info } = response.data;

    if (status === 0) {
      // Extract transaction ID
      const transactionId =
        latest_receipt_info?.[0]?.original_transaction_id ||
        receipt?.in_app?.[0]?.original_transaction_id;

      return {
        success: true,
        transactionId,
        expiryDate: latest_receipt_info?.[0]?.expires_date_ms
          ? new Date(parseInt(latest_receipt_info[0].expires_date_ms))
          : undefined,
        environment: isProduction ? 'production' : 'sandbox',
        receipt,
        latestReceiptInfo: latest_receipt_info,
      };
    }

    return {
      success: false,
      status,
      error: this.getAppleStatusError(status),
    };
  }

  /**
   * Call Google Play Developer API
   */
  private async callGooglePlayAPI(
    productId: string,
    purchaseToken: string
  ): Promise<ValidationResult> {
    const serviceAccountKey = this.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('Google Service Account key not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    const accessToken = await this.getGoogleAccessToken(serviceAccount);

    const isSubscription =
      productId.includes('monthly') ||
      productId.includes('yearly') ||
      productId.includes('creator');

    const packageName = this.env.GOOGLE_PLAY_PACKAGE_NAME;
    const apiUrl = isSubscription
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const purchaseData = response.data;

    if (isSubscription) {
      const isValid = purchaseData.paymentState === 1;
      return {
        success: isValid,
        transactionId: purchaseData.orderId,
        expiryDate: purchaseData.expiryTimeMillis
          ? new Date(parseInt(purchaseData.expiryTimeMillis))
          : undefined,
        environment: 'production',
      };
    } else {
      const isValid = purchaseData.purchaseState === 0;
      return {
        success: isValid,
        transactionId: purchaseData.orderId,
        environment: 'production',
      };
    }
  }

  /**
   * Generate Google API access token using service account
   */
  private async getGoogleAccessToken(serviceAccount: any): Promise<string> {
    const jwtHeader = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const headerBase64 = Buffer.from(JSON.stringify(jwtHeader)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
    const signatureInput = `${headerBase64}.${payloadBase64}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), serviceAccount.private_key);
    const signatureBase64 = signature.toString('base64url');
    const jwt = `${headerBase64}.${payloadBase64}.${signatureBase64}`;

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    return tokenResponse.data.access_token;
  }

  /**
   * Check if receipt/purchase already validated
   */
  private async checkExistingValidation(
    receiptHash: string,
    platform: string
  ): Promise<any | null> {
    const { data } = await supabase
      .from('iap_validation_history')
      .select('*')
      .eq('receipt_hash', receiptHash)
      .eq('platform', platform)
      .single();

    return data;
  }

  /**
   * Store validation result for audit and deduplication
   */
  private async storeValidationResult(params: {
    userId: string;
    platform: string;
    productId: string;
    receiptHash: string;
    transactionId?: string;
    status: 'valid' | 'invalid';
    environment: string;
    rawReceipt: string;
    validationResponse: any;
    validationDurationMs: number;
  }): Promise<void> {
    try {
      await supabase.from('iap_validation_history').insert({
        user_id: params.userId,
        platform: params.platform,
        product_id: params.productId,
        receipt_hash: params.receiptHash,
        transaction_id: params.transactionId,
        status: params.status,
        environment: params.environment,
        raw_receipt: params.rawReceipt,
        validation_response: params.validationResponse,
        validation_duration_ms: params.validationDurationMs,
        validated_at: new Date().toISOString(),
      });

      logger.debug('✅ Validation result stored', {
        userId: params.userId,
        platform: params.platform,
        transactionId: params.transactionId,
      });
    } catch (error: any) {
      logger.error('❌ Failed to store validation result', {
        error: error.message,
        userId: params.userId,
      });
      // Don't throw - validation succeeded even if storage failed
    }
  }

  /**
   * Hash receipt for deduplication
   */
  private hashReceipt(receipt: string): string {
    return crypto.createHash('sha256').update(receipt).digest('hex');
  }

  /**
   * Get Apple status error message
   */
  private getAppleStatusError(status: number): string {
    const errors: { [key: number]: string } = {
      21000: 'The App Store could not read the JSON object you provided.',
      21002: 'The data in the receipt-data property was malformed or missing.',
      21003: 'The receipt could not be authenticated.',
      21004: 'The shared secret you provided does not match the shared secret on file.',
      21005: 'The receipt server is not currently available.',
      21006: 'This receipt is valid but the subscription has expired.',
      21007: 'This receipt is from the sandbox environment.',
      21008: 'This receipt is from the production environment.',
      21010: 'This receipt could not be authorized.',
    };

    return errors[status] || `Unknown status code: ${status}`;
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const iapValidationService = new IAPValidationService();


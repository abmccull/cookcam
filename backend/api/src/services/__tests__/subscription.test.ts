import { SubscriptionService, subscriptionService } from '../subscription';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();

    service = new SubscriptionService();
    mockSupabase = require('../../index').supabase;

    // Set up environment variables
    process.env.APP_STORE_SHARED_SECRET = 'test-shared-secret';
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      client_email: 'test@service-account.com',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
    });
  });

  describe('iOS Receipt Verification', () => {
    const mockReceiptData = 'base64-receipt-data';
    const mockUserId = 'user123';

    it('should verify valid iOS receipt successfully', async () => {
      const mockAppStoreResponse = {
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.cookcam.monthly',
              transaction_id: 'ios-transaction-123',
              original_transaction_id: 'ios-original-123',
              expires_date_ms: '1640995200000', // Future date
              auto_renew_status: '1',
              is_trial_period: 'false',
              original_purchase_date_ms: '1640908800000',
            },
          ],
        },
      };

      mockAxios.post.mockResolvedValue(mockAppStoreResponse);

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.platform).toBe('ios');
      expect(result.subscription?.productId).toBe('com.cookcam.monthly');
      expect(result.subscription?.status).toBe('active');
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
    });

    it('should handle sandbox receipt by retrying with sandbox URL', async () => {
      // First call returns 21007 (sandbox receipt in production)
      mockAxios.post
        .mockResolvedValueOnce({
          data: { status: 21007 },
        })
        .mockResolvedValueOnce({
          data: {
            status: 0,
            latest_receipt_info: [
              {
                product_id: 'com.cookcam.monthly',
                transaction_id: 'sandbox-transaction-123',
                original_transaction_id: 'sandbox-original-123',
                expires_date_ms: '1640995200000',
                auto_renew_status: '1',
                is_trial_period: 'false',
                original_purchase_date_ms: '1640908800000',
              },
            ],
          },
        });

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(result.valid).toBe(true);
    });

    it('should handle invalid receipt status', async () => {
      mockAxios.post.mockResolvedValue({
        data: { status: 21002 }, // Invalid receipt
      });

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid receipt: status 21002');
    });

    it('should handle receipt with no subscription info', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          status: 0,
          latest_receipt_info: [],
        },
      });

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No subscription found in receipt');
    });

    it('should handle receipt with wrong product ID', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.other.app.subscription',
              transaction_id: 'wrong-product-123',
            },
          ],
        },
      });

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid product ID');
    });

    it('should handle iOS subscription status calculations', async () => {
      const now = Date.now();
      const futureDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now
      const pastDate = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const gracePeriodDate = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago (within grace period)

      // Test active subscription
      mockAxios.post.mockResolvedValueOnce({
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.cookcam.monthly',
              expires_date_ms: futureDate.toString(),
              auto_renew_status: '1',
              original_purchase_date_ms: pastDate.toString(),
              transaction_id: 'active-123',
              original_transaction_id: 'active-original-123',
            },
          ],
        },
      });

      const activeResult = await service.verifyIOSReceipt(mockReceiptData, mockUserId);
      expect(activeResult.subscription?.status).toBe('active');

      // Test cancelled subscription
      mockAxios.post.mockResolvedValueOnce({
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.cookcam.monthly',
              expires_date_ms: futureDate.toString(),
              cancellation_date_ms: now.toString(),
              auto_renew_status: '0',
              original_purchase_date_ms: pastDate.toString(),
              transaction_id: 'cancelled-123',
              original_transaction_id: 'cancelled-original-123',
            },
          ],
        },
      });

      const cancelledResult = await service.verifyIOSReceipt(mockReceiptData, mockUserId);
      expect(cancelledResult.subscription?.status).toBe('cancelled');

      // Test grace period subscription
      mockAxios.post.mockResolvedValueOnce({
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.cookcam.monthly',
              expires_date_ms: gracePeriodDate.toString(),
              auto_renew_status: '1',
              original_purchase_date_ms: pastDate.toString(),
              transaction_id: 'grace-123',
              original_transaction_id: 'grace-original-123',
            },
          ],
        },
      });

      const graceResult = await service.verifyIOSReceipt(mockReceiptData, mockUserId);
      expect(graceResult.subscription?.status).toBe('grace_period');
    });

    it('should handle network errors during iOS verification', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
      expect(console.error).toHaveBeenCalledWith('iOS receipt verification error:', expect.any(Error));
    });

    it('should handle trial period subscriptions', async () => {
      const trialEndDate = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now

      mockAxios.post.mockResolvedValue({
        data: {
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.cookcam.monthly',
              transaction_id: 'trial-123',
              original_transaction_id: 'trial-original-123',
              expires_date_ms: trialEndDate.toString(),
              auto_renew_status: '1',
              is_trial_period: 'true',
              original_purchase_date_ms: Date.now().toString(),
            },
          ],
        },
      });

      const result = await service.verifyIOSReceipt(mockReceiptData, mockUserId);

      expect(result.valid).toBe(true);
      expect(result.subscription?.trialEnd).toBeDefined();
      expect(result.subscription?.trialEnd?.getTime()).toBe(trialEndDate);
    });
  });

  describe('Android Purchase Verification', () => {
    const mockPurchaseToken = 'android-purchase-token-123';
    const mockUserId = 'user123';

    beforeEach(() => {
      mockJwt.sign.mockReturnValue('mock-jwt-token');
      mockAxios.post.mockResolvedValue({
        data: { access_token: 'mock-access-token' },
      });
    });

    it('should verify valid Android purchase successfully', async () => {
      const mockPurchaseResponse = {
        data: {
          expiryTimeMillis: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(), // 30 days from now
          autoRenewing: true,
          paymentState: 1, // Paid
          startTimeMillis: Date.now().toString(),
        },
      };

      mockAxios.get.mockResolvedValue(mockPurchaseResponse);

      const result = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);

      expect(result.valid).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.platform).toBe('android');
      expect(result.subscription?.purchaseToken).toBe(mockPurchaseToken);
      expect(result.subscription?.status).toBe('active');
    });

    it('should handle Android subscription status calculations', async () => {
      const now = Date.now();
      const futureDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now
      const pastDate = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      // Test cancelled subscription
      mockAxios.get.mockResolvedValueOnce({
        data: {
          expiryTimeMillis: futureDate.toString(),
          autoRenewing: false,
          cancelReason: 1, // User cancelled
          startTimeMillis: pastDate.toString(),
        },
      });

      const cancelledResult = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);
      expect(cancelledResult.subscription?.status).toBe('cancelled');

      // Test grace period subscription
      mockAxios.get.mockResolvedValueOnce({
        data: {
          expiryTimeMillis: (now - 3 * 24 * 60 * 60 * 1000).toString(), // 3 days ago
          autoRenewing: true,
          startTimeMillis: pastDate.toString(),
        },
      });

      const graceResult = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);
      expect(graceResult.subscription?.status).toBe('grace_period');

      // Test expired subscription
      mockAxios.get.mockResolvedValueOnce({
        data: {
          expiryTimeMillis: (now - 10 * 24 * 60 * 60 * 1000).toString(), // 10 days ago
          autoRenewing: false,
          startTimeMillis: pastDate.toString(),
        },
      });

      const expiredResult = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);
      expect(expiredResult.subscription?.status).toBe('expired');
    });

    it('should handle trial period purchases', async () => {
      const trialEndDate = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now

      mockAxios.get.mockResolvedValue({
        data: {
          expiryTimeMillis: trialEndDate.toString(),
          autoRenewing: true,
          paymentState: 2, // Free trial
          startTimeMillis: Date.now().toString(),
        },
      });

      const result = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);

      expect(result.valid).toBe(true);
      expect(result.subscription?.trialEnd).toBeDefined();
      expect(result.subscription?.trialEnd?.getTime()).toBe(trialEndDate);
    });

    it('should handle Google API authentication', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          expiryTimeMillis: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
          autoRenewing: true,
          startTimeMillis: Date.now().toString(),
        },
      });

      await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          iss: 'test@service-account.com',
          scope: 'https://www.googleapis.com/auth/androidpublisher',
          aud: 'https://oauth2.googleapis.com/token',
          exp: expect.any(Number),
          iat: expect.any(Number),
        },
        '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
        { algorithm: 'RS256' }
      );

      expect(mockAxios.post).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: 'mock-jwt-token',
      });
    });

    it('should handle network errors during Android verification', async () => {
      mockAxios.get.mockRejectedValue(new Error('API error'));

      const result = await service.verifyAndroidPurchase(mockPurchaseToken, mockUserId);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('API error');
      expect(console.error).toHaveBeenCalledWith('Android purchase verification error:', expect.any(Error));
    });
  });

  describe('Subscription Management', () => {
    it('should check if user has active subscription', async () => {
      const mockActiveSubscription = [
        {
          user_id: 'user123',
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      mockSupabase.from().select().eq().in().gte().order().limit.mockResolvedValue({
        data: mockActiveSubscription,
        error: null,
      });

      const hasActive = await service.hasActiveSubscription('user123');

      expect(hasActive).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
    });

    it('should return false for user without active subscription', async () => {
      mockSupabase.from().select().eq().in().gte().order().limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const hasActive = await service.hasActiveSubscription('user123');

      expect(hasActive).toBe(false);
    });

    it('should handle database errors in subscription check', async () => {
      mockSupabase.from().select().eq().in().gte().order().limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const hasActive = await service.hasActiveSubscription('user123');

      expect(hasActive).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Subscription check error:', { message: 'Database error' });
    });

    it('should get user subscription details', async () => {
      const mockSubscriptionData = {
        user_id: 'user123',
        platform: 'ios',
        product_id: 'com.cookcam.monthly',
        transaction_id: 'ios-123',
        original_transaction_id: 'ios-original-123',
        status: 'active',
        expires_at: '2024-12-31T23:59:59.000Z',
        auto_renewing: true,
        trial_end: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: mockSubscriptionData,
        error: null,
      });

      const subscription = await service.getUserSubscription('user123');

      expect(subscription).toBeDefined();
      expect(subscription?.userId).toBe('user123');
      expect(subscription?.platform).toBe('ios');
      expect(subscription?.status).toBe('active');
      expect(subscription?.expiresAt).toEqual(new Date('2024-12-31T23:59:59.000Z'));
    });

    it('should return null for non-existent subscription', async () => {
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { message: 'No subscription found' },
      });

      const subscription = await service.getUserSubscription('user123');

      expect(subscription).toBeNull();
    });

    it('should cancel user subscription', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.cancelSubscription('user123')).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'cancelled',
        auto_renewing: false,
        updated_at: expect.any(String),
      });
    });

    it('should handle errors during subscription cancellation', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(service.cancelSubscription('user123')).rejects.toThrow('Failed to cancel subscription: Update failed');
    });
  });

  describe('Webhook Processing', () => {
    describe('App Store Webhooks', () => {
      it('should process initial buy notification', async () => {
        const notification = {
          notification_type: 'INITIAL_BUY',
          latest_receipt_info: [
            {
              original_transaction_id: 'ios-original-123',
              expires_date_ms: '1640995200000',
              auto_renew_status: '1',
            },
          ],
        };

        await service.processAppStoreWebhook(notification);

        expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'active',
          expires_at: expect.any(String),
          auto_renewing: true,
          updated_at: expect.any(String),
        });
      });

      it('should process cancellation notification', async () => {
        const notification = {
          notification_type: 'CANCEL',
          latest_receipt_info: [
            {
              original_transaction_id: 'ios-original-123',
              expires_date_ms: '1640995200000',
              auto_renew_status: '0',
            },
          ],
        };

        await service.processAppStoreWebhook(notification);

        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'cancelled',
          expires_at: expect.any(String),
          auto_renewing: false,
          updated_at: expect.any(String),
        });
      });

      it('should process refund notification', async () => {
        const notification = {
          notification_type: 'REFUND',
          latest_receipt_info: [
            {
              original_transaction_id: 'ios-original-123',
            },
          ],
        };

        await service.processAppStoreWebhook(notification);

        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'cancelled',
          auto_renewing: false,
          updated_at: expect.any(String),
        });
      });

      it('should handle webhook with missing receipt info', async () => {
        const notification = {
          notification_type: 'INITIAL_BUY',
          latest_receipt_info: [],
        };

        await expect(service.processAppStoreWebhook(notification)).resolves.not.toThrow();
      });
    });

    describe('Google Play Webhooks', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: { user_id: 'user123' },
          error: null,
        });

        mockJwt.sign.mockReturnValue('mock-jwt-token');
        mockAxios.post.mockResolvedValue({
          data: { access_token: 'mock-access-token' },
        });
        mockAxios.get.mockResolvedValue({
          data: {
            expiryTimeMillis: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
            autoRenewing: true,
            startTimeMillis: Date.now().toString(),
          },
        });
      });

      it('should process subscription recovered notification', async () => {
        const notification = {
          packageName: 'com.cookcam',
          subscriptionNotification: {
            notificationType: 1, // SUBSCRIPTION_RECOVERED
            purchaseToken: 'android-token-123',
          },
        };

        await service.processGooglePlayWebhook(notification);

        expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      });

      it('should process subscription renewed notification', async () => {
        const notification = {
          packageName: 'com.cookcam',
          subscriptionNotification: {
            notificationType: 2, // SUBSCRIPTION_RENEWED
            purchaseToken: 'android-token-123',
          },
        };

        await service.processGooglePlayWebhook(notification);

        expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      });

      it('should ignore notifications from wrong package', async () => {
        const notification = {
          packageName: 'com.other.app',
          subscriptionNotification: {
            notificationType: 1,
            purchaseToken: 'android-token-123',
          },
        };

        await service.processGooglePlayWebhook(notification);

        expect(mockSupabase.from).not.toHaveBeenCalled();
      });

      it('should handle webhook with missing subscription notification', async () => {
        const notification = {
          packageName: 'com.cookcam',
        };

        await expect(service.processGooglePlayWebhook(notification)).resolves.not.toThrow();
      });

      it('should handle webhook with invalid purchase token', async () => {
        const notification = {
          packageName: 'com.cookcam',
          subscriptionNotification: {
            notificationType: 1,
            purchaseToken: null, // Invalid type
          },
        };

        await expect(service.processGooglePlayWebhook(notification)).resolves.not.toThrow();
      });
    });
  });

  describe('Database Operations', () => {
    it('should save subscription to database with upsert', async () => {
      const subscription = {
        userId: 'user123',
        platform: 'ios' as const,
        productId: 'com.cookcam.monthly',
        transactionId: 'ios-123',
        originalTransactionId: 'ios-original-123',
        status: 'active' as const,
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        autoRenewing: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      // Access private method via type assertion
      await (service as any).saveSubscription(subscription);

      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        {
          user_id: 'user123',
          platform: 'ios',
          product_id: 'com.cookcam.monthly',
          purchase_token: undefined,
          transaction_id: 'ios-123',
          original_transaction_id: 'ios-original-123',
          status: 'active',
          expires_at: '2024-12-31T23:59:59.000Z',
          auto_renewing: true,
          trial_end: undefined,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        { onConflict: 'user_id,platform' }
      );
    });

    it('should handle database errors during save', async () => {
      mockSupabase.from().upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const subscription = {
        userId: 'user123',
        platform: 'ios' as const,
        productId: 'com.cookcam.monthly',
        status: 'active' as const,
        expiresAt: new Date(),
        autoRenewing: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect((service as any).saveSubscription(subscription)).rejects.toThrow('Failed to save subscription: Database error');
    });
  });

  describe('Module Export', () => {
    it('should export singleton subscription service instance', () => {
      expect(subscriptionService).toBeInstanceOf(SubscriptionService);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed service account key', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'invalid-json';

      expect(() => new SubscriptionService()).toThrow();
    });

    it('should handle exceptions during catch blocks', async () => {
      mockAxios.post.mockRejectedValue('Non-error object');

      const result = await service.verifyIOSReceipt('receipt', 'user123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Verification failed');
    });

    it('should handle null/undefined webhook data gracefully', async () => {
      const notification = null as any;

      await expect(service.processAppStoreWebhook(notification)).resolves.not.toThrow();
    });

    it('should handle empty latest_receipt_info array', async () => {
      const notification = {
        notification_type: 'INITIAL_BUY',
        latest_receipt_info: null,
      };

      await expect(service.processAppStoreWebhook(notification)).resolves.not.toThrow();
    });
  });
});
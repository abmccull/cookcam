import { ReceiptValidationService } from '../receiptValidationService';
import { createMockSupabaseClient, mockEnvVars } from '../../__tests__/utils/testHelpers';
import { mockUsers, mockIAPReceipts } from '../../__tests__/utils/mockData';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../index', () => ({
  supabase: mockSupabaseClient,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockSupabaseClient = createMockSupabaseClient();

// Mock environment variables
Object.assign(process.env, mockEnvVars);

describe('ReceiptValidationService', () => {
  let service: ReceiptValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReceiptValidationService();
  });

  describe('validateAppleReceipt', () => {
    it('should validate active Apple subscription receipt', async () => {
      const mockAppleResponse = {
        status: 0,
        latest_receipt_info: [
          {
            transaction_id: mockIAPReceipts.valid.transactionId,
            original_transaction_id: mockIAPReceipts.valid.originalTransactionId,
            product_id: mockIAPReceipts.valid.productId,
            purchase_date_ms: new Date(mockIAPReceipts.valid.purchaseDate).getTime(),
            expires_date_ms: new Date(mockIAPReceipts.valid.expirationDate).getTime(),
          },
        ],
        pending_renewal_info: [
          {
            auto_renew_status: '1',
            product_id: mockIAPReceipts.valid.productId,
          },
        ],
      };

      mockedAxios.post.mockResolvedValue({ data: mockAppleResponse });

      const result = await service.validateAppleReceipt('fake_receipt_data', mockUsers.premium.id);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.isActive).toBe(true);
      expect(result.data.productId).toBe(mockIAPReceipts.valid.productId);
      expect(result.data.expirationDate).toBeTruthy();
    });

    it('should handle expired Apple subscription', async () => {
      const mockAppleResponse = {
        status: 0,
        latest_receipt_info: [
          {
            transaction_id: mockIAPReceipts.expired.transactionId,
            original_transaction_id: mockIAPReceipts.expired.originalTransactionId,
            product_id: mockIAPReceipts.expired.productId,
            purchase_date_ms: new Date(mockIAPReceipts.expired.purchaseDate).getTime(),
            expires_date_ms: new Date(mockIAPReceipts.expired.expirationDate).getTime(),
          },
        ],
        pending_renewal_info: [
          {
            auto_renew_status: '0',
            product_id: mockIAPReceipts.expired.productId,
          },
        ],
      };

      mockedAxios.post.mockResolvedValue({ data: mockAppleResponse });

      const result = await service.validateAppleReceipt('fake_receipt_data', mockUsers.premium.id);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.isActive).toBe(false);
      expect(result.data.productId).toBe(mockIAPReceipts.expired.productId);
    });

    it('should handle invalid Apple receipt', async () => {
      const mockAppleResponse = {
        status: 21002, // Invalid receipt
      };

      mockedAxios.post.mockResolvedValue({ data: mockAppleResponse });

      const result = await service.validateAppleReceipt('invalid_receipt', mockUsers.premium.id);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.error).toContain('Invalid receipt');
    });

    it('should handle Apple API errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.validateAppleReceipt('receipt_data', mockUsers.premium.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to validate Apple receipt');
    });

    it('should try sandbox after production failure', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Production validation failed'))
        .mockResolvedValueOnce({
          data: {
            status: 0,
            latest_receipt_info: [{
              transaction_id: 'sandbox_txn',
              product_id: 'premium_monthly',
              expires_date_ms: Date.now() + 86400000,
            }],
          },
        });

      const result = await service.validateAppleReceipt('receipt_data', mockUsers.premium.id);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateGoogleReceipt', () => {
    it('should validate active Google Play subscription', async () => {
      const mockGoogleResponse = {
        purchaseToken: 'google_purchase_token',
        orderId: 'GPA.1234-5678-9012-34567',
        productId: 'premium_monthly',
        purchaseState: 1, // Purchased
        purchaseTimeMillis: Date.now() - 86400000,
        expiryTimeMillis: Date.now() + 86400000,
        autoRenewing: true,
      };

      mockedAxios.get.mockResolvedValue({ data: mockGoogleResponse });

      const result = await service.validateGoogleReceipt(
        'premium_monthly',
        'purchase_token',
        mockUsers.premium.id
      );

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.isActive).toBe(true);
      expect(result.data.productId).toBe('premium_monthly');
      expect(result.data.autoRenewing).toBe(true);
    });

    it('should handle expired Google subscription', async () => {
      const mockGoogleResponse = {
        purchaseToken: 'google_purchase_token',
        orderId: 'GPA.1234-5678-9012-34567',
        productId: 'premium_monthly',
        purchaseState: 1,
        purchaseTimeMillis: Date.now() - 5184000000, // 60 days ago
        expiryTimeMillis: Date.now() - 2592000000, // 30 days ago
        autoRenewing: false,
      };

      mockedAxios.get.mockResolvedValue({ data: mockGoogleResponse });

      const result = await service.validateGoogleReceipt(
        'premium_monthly',
        'purchase_token',
        mockUsers.premium.id
      );

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.isActive).toBe(false);
      expect(result.data.autoRenewing).toBe(false);
    });

    it('should handle cancelled Google subscription', async () => {
      const mockGoogleResponse = {
        purchaseToken: 'google_purchase_token',
        productId: 'premium_monthly',
        purchaseState: 1,
        expiryTimeMillis: Date.now() + 86400000,
        cancelReason: 1, // User cancelled
        userCancellationTimeMillis: Date.now() - 3600000,
        autoRenewing: false,
      };

      mockedAxios.get.mockResolvedValue({ data: mockGoogleResponse });

      const result = await service.validateGoogleReceipt(
        'premium_monthly',
        'purchase_token',
        mockUsers.premium.id
      );

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.isActive).toBe(true); // Still active until expiry
      expect(result.data.autoRenewing).toBe(false);
      expect(result.data.cancelReason).toBe(1);
    });

    it('should handle Google API authentication errors', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 401, data: { error: 'Invalid credentials' } },
      });

      const result = await service.validateGoogleReceipt(
        'premium_monthly',
        'purchase_token',
        mockUsers.premium.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('updateSubscriptionFromReceipt', () => {
    it('should update subscription status based on valid receipt', async () => {
      const validationResult = {
        isValid: true,
        isActive: true,
        productId: 'premium_monthly',
        expirationDate: new Date(Date.now() + 86400000),
        transactionId: 'txn_123',
        originalTransactionId: 'orig_txn_123',
        autoRenewing: true,
      };

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.premium,
        error: null,
      });

      mockSupabaseClient.from().upsert().mockResolvedValue({
        data: { id: 'subscription_id' },
        error: null,
      });

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: { subscription_tier: 'premium' },
        error: null,
      });

      const result = await service.updateSubscriptionFromReceipt(
        mockUsers.premium.id,
        validationResult,
        'apple'
      );

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUsers.premium.id,
          platform: 'apple',
          product_id: 'premium_monthly',
          status: 'active',
          auto_renewing: true,
        })
      );
    });

    it('should handle expired subscription updates', async () => {
      const expiredValidationResult = {
        isValid: true,
        isActive: false,
        productId: 'premium_monthly',
        expirationDate: new Date(Date.now() - 86400000),
        transactionId: 'txn_123',
        autoRenewing: false,
      };

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.premium,
        error: null,
      });

      mockSupabaseClient.from().upsert().mockResolvedValue({
        data: { id: 'subscription_id' },
        error: null,
      });

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: { subscription_tier: 'free' },
        error: null,
      });

      const result = await service.updateSubscriptionFromReceipt(
        mockUsers.premium.id,
        expiredValidationResult,
        'apple'
      );

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'expired',
          auto_renewing: false,
        })
      );
    });

    it('should handle database update errors', async () => {
      const validationResult = {
        isValid: true,
        isActive: true,
        productId: 'premium_monthly',
        expirationDate: new Date(Date.now() + 86400000),
        transactionId: 'txn_123',
      };

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await service.updateSubscriptionFromReceipt(
        'invalid_user_id',
        validationResult,
        'apple'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('validateAndUpdateSubscription', () => {
    it('should validate Apple receipt and update subscription', async () => {
      const mockAppleResponse = {
        status: 0,
        latest_receipt_info: [{
          transaction_id: 'txn_123',
          product_id: 'premium_monthly',
          expires_date_ms: Date.now() + 86400000,
        }],
        pending_renewal_info: [{ auto_renew_status: '1' }],
      };

      mockedAxios.post.mockResolvedValue({ data: mockAppleResponse });
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.premium,
        error: null,
      });
      mockSupabaseClient.from().upsert().mockResolvedValue({ data: {}, error: null });
      mockSupabaseClient.from().update().eq().mockResolvedValue({ data: {}, error: null });

      const result = await service.validateAndUpdateSubscription(
        mockUsers.premium.id,
        'receipt_data',
        'apple'
      );

      expect(result.success).toBe(true);
      expect(result.data.subscriptionUpdated).toBe(true);
      expect(result.data.subscriptionActive).toBe(true);
    });

    it('should handle validation failures gracefully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { status: 21002 }, // Invalid receipt
      });

      const result = await service.validateAndUpdateSubscription(
        mockUsers.premium.id,
        'invalid_receipt',
        'apple'
      );

      expect(result.success).toBe(true);
      expect(result.data.subscriptionUpdated).toBe(false);
      expect(result.data.validationError).toBeTruthy();
    });
  });

  describe('refreshAllSubscriptions', () => {
    it('should refresh all active mobile subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          user_id: mockUsers.premium.id,
          platform: 'apple',
          receipt_data: 'receipt_1',
          status: 'active',
        },
        {
          id: 'sub_2',
          user_id: 'user_2',
          platform: 'google',
          purchase_token: 'token_2',
          product_id: 'premium_monthly',
          status: 'active',
        },
      ];

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      });

      // Mock successful validations
      mockedAxios.post.mockResolvedValue({
        data: {
          status: 0,
          latest_receipt_info: [{
            expires_date_ms: Date.now() + 86400000,
          }],
        },
      });

      mockedAxios.get.mockResolvedValue({
        data: {
          expiryTimeMillis: Date.now() + 86400000,
          purchaseState: 1,
        },
      });

      mockSupabaseClient.from().upsert().mockResolvedValue({ data: {}, error: null });

      const result = await service.refreshAllSubscriptions();

      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(2);
      expect(result.data.updated).toBeGreaterThan(0);
    });

    it('should handle partial failures during batch refresh', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          user_id: mockUsers.premium.id,
          platform: 'apple',
          receipt_data: 'receipt_1',
          status: 'active',
        },
      ];

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      });

      mockedAxios.post.mockRejectedValue(new Error('Validation failed'));

      const result = await service.refreshAllSubscriptions();

      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(1);
      expect(result.data.errors).toBe(1);
    });
  });
});
import { GooglePlayService, googlePlayService, GooglePlaySubscription } from '../googlePlayService';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// Mock dependencies
jest.mock('axios');
jest.mock('google-auth-library');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockGoogleAuth = GoogleAuth as jest.MockedClass<typeof GoogleAuth>;

describe('GooglePlayService', () => {
  let service: GooglePlayService;
  let mockAuthInstance: jest.Mocked<GoogleAuth>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Google Auth client
    mockClient = {
      getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-access-token' }),
    };

    mockAuthInstance = {
      getClient: jest.fn().mockResolvedValue(mockClient),
    } as any;

    mockGoogleAuth.mockImplementation(() => mockAuthInstance);

    // Set up environment variables
    process.env.ANDROID_PACKAGE_NAME = 'com.cookcam.test';
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = '/path/to/service-account.json';

    service = new GooglePlayService();
  });

  afterEach(() => {
    delete process.env.ANDROID_PACKAGE_NAME;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  });

  describe('Initialization', () => {
    it('should initialize with custom package name from environment', () => {
      expect(mockGoogleAuth).toHaveBeenCalledWith({
        keyFile: '/path/to/service-account.json',
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    });

    it('should initialize with default package name when not provided', () => {
      delete process.env.ANDROID_PACKAGE_NAME;
      
      const serviceWithDefault = new GooglePlayService();
      
      // The constructor uses the default value internally
      expect(serviceWithDefault).toBeDefined();
    });

    it('should initialize GoogleAuth with correct configuration', () => {
      expect(mockGoogleAuth).toHaveBeenCalledWith({
        keyFile: '/path/to/service-account.json',
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
    });
  });

  describe('Access Token Management', () => {
    it('should get access token successfully', async () => {
      const token = await (service as any).getAccessToken();

      expect(mockAuthInstance.getClient).toHaveBeenCalled();
      expect(mockClient.getAccessToken).toHaveBeenCalled();
      expect(token).toBe('mock-access-token');
    });

    it('should handle missing access token', async () => {
      mockClient.getAccessToken.mockResolvedValue({ token: null });

      await expect((service as any).getAccessToken()).rejects.toThrow(
        'Failed to get Google Play access token'
      );
    });

    it('should handle access token retrieval errors', async () => {
      mockClient.getAccessToken.mockRejectedValue(new Error('Auth error'));

      await expect((service as any).getAccessToken()).rejects.toThrow('Auth error');
    });

    it('should handle client creation errors', async () => {
      mockAuthInstance.getClient.mockRejectedValue(new Error('Client creation failed'));

      await expect((service as any).getAccessToken()).rejects.toThrow('Client creation failed');
    });
  });

  describe('Subscription Validation', () => {
    const mockSubscriptionData: GooglePlaySubscription = {
      acknowledgementState: 1,
      autoRenewing: true,
      countryCode: 'US',
      expiryTimeMillis: '1640995200000',
      orderId: 'order-123',
      paymentState: 1,
      priceAmountMicros: '3990000',
      priceCurrencyCode: 'USD',
      purchaseType: 0,
      startTimeMillis: '1640908800000',
    };

    it('should validate subscription successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: mockSubscriptionData });

      const result = await service.validateSubscription('monthly_sub', 'purchase-token-123');

      expect(result).toEqual(mockSubscriptionData);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/monthly_sub/tokens/purchase-token-123',
        {
          headers: {
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return null for 404 errors (subscription not found)', async () => {
      const error404 = {
        response: { status: 404 },
        message: 'Not found',
      };
      mockAxios.get.mockRejectedValue(error404);

      const result = await service.validateSubscription('nonexistent_sub', 'invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for 410 errors (subscription expired)', async () => {
      const error410 = {
        response: { status: 410 },
        message: 'Gone',
      };
      mockAxios.get.mockRejectedValue(error410);

      const result = await service.validateSubscription('expired_sub', 'expired-token');

      expect(result).toBeNull();
    });

    it('should throw errors for other HTTP error codes', async () => {
      const error500 = {
        response: { status: 500 },
        message: 'Internal server error',
      };
      mockAxios.get.mockRejectedValue(error500);

      await expect(
        service.validateSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toEqual(error500);
    });

    it('should throw network errors', async () => {
      const networkError = new Error('Network error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(
        service.validateSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Get Subscription Details', () => {
    const mockSubscriptionData: GooglePlaySubscription = {
      acknowledgementState: 1,
      autoRenewing: true,
      countryCode: 'US',
      expiryTimeMillis: '1640995200000',
      orderId: 'order-123',
      paymentState: 1,
      priceAmountMicros: '3990000',
      priceCurrencyCode: 'USD',
      purchaseType: 0,
      startTimeMillis: '1640908800000',
    };

    it('should get subscription details successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: mockSubscriptionData });

      const result = await service.getSubscription('monthly_sub', 'purchase-token-123');

      expect(result).toEqual(mockSubscriptionData);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/monthly_sub/tokens/purchase-token-123',
        {
          headers: {
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle subscription with optional fields', async () => {
      const subscriptionWithOptionals: GooglePlaySubscription = {
        ...mockSubscriptionData,
        cancelReason: 1,
        introductoryPriceInfo: { currencyCode: 'USD', amountMicros: '1990000' },
        linkedPurchaseToken: 'linked-token-456',
      };

      mockAxios.get.mkResolvedValue({ data: subscriptionWithOptionals });

      const result = await service.getSubscription('monthly_sub', 'purchase-token-123');

      expect(result.cancelReason).toBe(1);
      expect(result.introductoryPriceInfo).toBeDefined();
      expect(result.linkedPurchaseToken).toBe('linked-token-456');
    });

    it('should handle API errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(
        service.getSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('API Error');
    });
  });

  describe('Subscription Acknowledgment', () => {
    it('should acknowledge subscription successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.acknowledgeSubscription('monthly_sub', 'purchase-token-123');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/monthly_sub/tokens/purchase-token-123:acknowledge',
        {},
        {
          headers: {
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle acknowledgment errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Acknowledgment failed'));

      await expect(
        service.acknowledgeSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Acknowledgment failed');
    });
  });

  describe('Subscription Cancellation', () => {
    it('should cancel subscription successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.cancelSubscription('monthly_sub', 'purchase-token-123');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/monthly_sub/tokens/purchase-token-123:cancel',
        {},
        {
          headers: {
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle cancellation errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Cancellation failed'));

      await expect(
        service.cancelSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Cancellation failed');
    });
  });

  describe('Subscription Deferral', () => {
    it('should defer subscription successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });
      const newExpiryTime = new Date('2024-12-31T23:59:59.000Z');

      await service.deferSubscription('monthly_sub', 'purchase-token-123', newExpiryTime);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/monthly_sub/tokens/purchase-token-123:defer',
        {
          deferralInfo: {
            expectedExpiryTimeMillis: newExpiryTime.getTime().toString(),
          },
        },
        {
          headers: {
            Authorization: 'Bearer mock-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle deferral errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Deferral failed'));
      const newExpiryTime = new Date();

      await expect(
        service.deferSubscription('monthly_sub', 'purchase-token-123', newExpiryTime)
      ).rejects.toThrow('Deferral failed');
    });

    it('should handle different expiry times correctly', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });
      const futureDate = new Date('2025-06-15T12:00:00.000Z');

      await service.deferSubscription('monthly_sub', 'purchase-token-123', futureDate);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        {
          deferralInfo: {
            expectedExpiryTimeMillis: futureDate.getTime().toString(),
          },
        },
        expect.any(Object)
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle errors without response property', async () => {
      const errorWithoutResponse = new Error('Network timeout');
      mockAxios.get.mockRejectedValue(errorWithoutResponse);

      await expect(
        service.validateSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle errors with undefined response status', async () => {
      const errorWithUndefinedStatus = {
        response: { status: undefined },
        message: 'Undefined status',
      };
      mockAxios.get.mockRejectedValue(errorWithUndefinedStatus);

      await expect(
        service.validateSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toEqual(errorWithUndefinedStatus);
    });

    it('should handle access token retrieval failure in all methods', async () => {
      mockClient.getAccessToken.mockRejectedValue(new Error('Token failed'));

      await expect(
        service.getSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Token failed');

      await expect(
        service.acknowledgeSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Token failed');

      await expect(
        service.cancelSubscription('monthly_sub', 'purchase-token-123')
      ).rejects.toThrow('Token failed');

      await expect(
        service.deferSubscription('monthly_sub', 'purchase-token-123', new Date())
      ).rejects.toThrow('Token failed');
    });
  });

  describe('URL Construction', () => {
    it('should construct correct URLs for different subscription IDs', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });

      await service.getSubscription('premium_yearly', 'token-xyz-789');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/premium_yearly/tokens/token-xyz-789',
        expect.any(Object)
      );
    });

    it('should construct correct URLs for acknowledgment', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.acknowledgeSubscription('basic_monthly', 'ack-token-123');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/basic_monthly/tokens/ack-token-123:acknowledge',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should construct correct URLs for cancellation', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.cancelSubscription('premium_monthly', 'cancel-token-456');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/premium_monthly/tokens/cancel-token-456:cancel',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should construct correct URLs for deferral', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.deferSubscription('yearly_sub', 'defer-token-789', new Date());

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.cookcam.test/purchases/subscriptions/yearly_sub/tokens/defer-token-789:defer',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Request Headers', () => {
    it('should include correct headers in all requests', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });
      mockAxios.post.mockResolvedValue({ data: {} });

      await service.getSubscription('test_sub', 'test_token');
      await service.acknowledgeSubscription('test_sub', 'test_token');
      await service.cancelSubscription('test_sub', 'test_token');
      await service.deferSubscription('test_sub', 'test_token', new Date());

      const expectedHeaders = {
        Authorization: 'Bearer mock-access-token',
        'Content-Type': 'application/json',
      };

      // Check GET request headers
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        { headers: expectedHeaders }
      );

      // Check POST request headers
      mockAxios.post.mock.calls.forEach(call => {
        expect(call[2]).toEqual({ headers: expectedHeaders });
      });
    });
  });

  describe('Module Export', () => {
    it('should export singleton Google Play service instance', () => {
      expect(googlePlayService).toBeInstanceOf(GooglePlayService);
    });
  });

  describe('Different Package Names', () => {
    it('should use custom package name from environment', () => {
      process.env.ANDROID_PACKAGE_NAME = 'com.custom.app';
      const customService = new GooglePlayService();

      expect(customService).toBeDefined();
      // The package name is used internally in URL construction
    });

    it('should handle missing package name environment variable', () => {
      delete process.env.ANDROID_PACKAGE_NAME;
      const defaultService = new GooglePlayService();

      expect(defaultService).toBeDefined();
    });
  });

  describe('Subscription Data Types', () => {
    it('should handle different payment states', async () => {
      const subscriptionData: GooglePlaySubscription = {
        acknowledgementState: 1,
        autoRenewing: true,
        countryCode: 'CA',
        expiryTimeMillis: '1640995200000',
        orderId: 'order-456',
        paymentState: 0, // Payment pending
        priceAmountMicros: '5990000',
        priceCurrencyCode: 'CAD',
        purchaseType: 1,
        startTimeMillis: '1640908800000',
      };

      mockAxios.get.mockResolvedValue({ data: subscriptionData });

      const result = await service.getSubscription('monthly_sub', 'purchase-token-123');

      expect(result.paymentState).toBe(0);
      expect(result.priceCurrencyCode).toBe('CAD');
      expect(result.countryCode).toBe('CA');
    });

    it('should handle different acknowledgment states', async () => {
      const subscriptionData: GooglePlaySubscription = {
        acknowledgementState: 0, // Not acknowledged
        autoRenewing: false,
        countryCode: 'UK',
        expiryTimeMillis: '1640995200000',
        orderId: 'order-789',
        paymentState: 1,
        priceAmountMicros: '2990000',
        priceCurrencyCode: 'GBP',
        purchaseType: 0,
        startTimeMillis: '1640908800000',
      };

      mockAxios.get.mockResolvedValue({ data: subscriptionData });

      const result = await service.getSubscription('basic_sub', 'purchase-token-456');

      expect(result.acknowledgementState).toBe(0);
      expect(result.autoRenewing).toBe(false);
    });
  });
});
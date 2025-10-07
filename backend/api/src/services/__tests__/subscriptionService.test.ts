import { SubscriptionService, SUBSCRIPTION_TIERS, FEATURES } from '../subscriptionService';
import { supabase } from '../../index';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('stripe');

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionService = new SubscriptionService();
    mockFrom = supabase.from as jest.Mock;
  });

  describe('Constants', () => {
    it('should define subscription tiers correctly', () => {
      expect(SUBSCRIPTION_TIERS.FREE).toEqual({
        id: 1,
        slug: 'free',
        name: 'Free',
        price: 0,
      });
      expect(SUBSCRIPTION_TIERS.REGULAR).toEqual({
        id: 2,
        slug: 'regular',
        name: 'Regular',
        price: 3.99,
      });
      expect(SUBSCRIPTION_TIERS.CREATOR).toEqual({
        id: 3,
        slug: 'creator',
        name: 'Creator',
        price: 9.99,
      });
    });

    it('should define feature keys', () => {
      expect(FEATURES.UNLIMITED_RECIPES).toBe('unlimited_recipes');
      expect(FEATURES.NUTRITION_TRACKING).toBe('nutrition_tracking');
      expect(FEATURES.CREATOR_DASHBOARD).toBe('creator_dashboard');
      expect(FEATURES.API_ACCESS).toBe('api_access');
    });
  });

  describe('getUserSubscription', () => {
    const mockUserId = 'user-123';
    const mockSubscription = {
      id: 'sub-123',
      user_id: mockUserId,
      tier_id: 2,
      status: 'active',
      current_period_start: new Date('2024-01-01'),
      current_period_end: new Date('2024-02-01'),
      cancel_at_period_end: false,
      provider: 'stripe',
      provider_subscription_id: 'stripe-sub-123',
      provider_customer_id: 'stripe-cus-123',
    };

    it('should return active subscription for user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockSubscription,
          error: null,
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserSubscription(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('user_subscriptions');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockQuery.gt).toHaveBeenCalledWith('current_period_end', expect.any(String));
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should return null when no subscription found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserSubscription(mockUserId);

      expect(result).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: mockError,
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserSubscription(mockUserId);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('❌ Error fetching user subscription', {
        error: mockError,
        userId: mockUserId,
      });
    });

    it('should handle unexpected errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValueOnce(new Error('Unexpected error')),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserSubscription(mockUserId);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to get user subscription', {
        error: expect.any(Error),
        userId: mockUserId,
      });
    });
  });

  describe('getUserTier', () => {
    const mockUserId = 'user-123';
    const mockFreeTier = {
      id: 1,
      name: 'Free',
      slug: 'free',
      price_monthly: 0,
      features: { recipes_per_month: 5 },
    };
    const mockRegularTier = {
      id: 2,
      name: 'Regular',
      slug: 'regular',
      price_monthly: 3.99,
      features: { recipes_per_month: -1 },
    };

    beforeEach(() => {
      // Mock getTierById
      jest.spyOn(subscriptionService, 'getTierById').mockImplementation(async (tierId: number) => {
        if (tierId === 1) return mockFreeTier;
        if (tierId === 2) return mockRegularTier;
        throw new Error('Tier not found');
      });
    });

    it('should return user tier for active subscription', async () => {
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValueOnce({
        id: 'sub-123',
        user_id: mockUserId,
        tier_id: 2,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        cancel_at_period_end: false,
        provider: 'stripe',
      });

      const result = await subscriptionService.getUserTier(mockUserId);

      expect(result).toEqual(mockRegularTier);
      expect(subscriptionService.getUserSubscription).toHaveBeenCalledWith(mockUserId);
      expect(subscriptionService.getTierById).toHaveBeenCalledWith(2);
    });

    it('should return free tier when no subscription found', async () => {
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValueOnce(null);

      const result = await subscriptionService.getUserTier(mockUserId);

      expect(result).toEqual(mockFreeTier);
      expect(subscriptionService.getTierById).toHaveBeenCalledWith(1);
    });

    it('should handle errors and return free tier', async () => {
      jest
        .spyOn(subscriptionService, 'getUserSubscription')
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await subscriptionService.getUserTier(mockUserId);

      expect(result).toEqual(mockFreeTier);
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to get user tier', {
        error: expect.any(Error),
        userId: mockUserId,
      });
    });
  });

  describe('getTierById', () => {
    const mockTier = {
      id: 2,
      name: 'Regular',
      slug: 'regular',
      price_monthly: 3.99,
      features: { unlimited_recipes: true },
    };

    it('should fetch tier by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockTier,
          error: null,
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      // Need to create a new instance to avoid the mocked method
      const service = new SubscriptionService();
      const result = await service.getTierById(2);

      expect(mockFrom).toHaveBeenCalledWith('subscription_tiers');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 2);
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result).toEqual(mockTier);
    });

    it('should throw error when tier not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const service = new SubscriptionService();

      await expect(service.getTierById(999)).rejects.toThrow('Subscription tier not found');

      expect(logger.error).toHaveBeenCalledWith('❌ Failed to get tier', {
        error: expect.any(Object),
        tierId: 999,
      });
    });
  });

  describe('hasFeatureAccess', () => {
    const mockUserId = 'user-123';

    it('should return true when user has feature access', async () => {
      const mockRpc = jest.fn().mockResolvedValueOnce({
        data: true,
        error: null,
      });
      mockFrom.mockImplementation(() => ({ rpc: mockRpc }));
      (supabase as any).rpc = mockRpc;

      const result = await subscriptionService.hasFeatureAccess(
        mockUserId,
        FEATURES.UNLIMITED_RECIPES
      );

      expect(mockRpc).toHaveBeenCalledWith('user_has_feature_access', {
        user_id: mockUserId,
        feature_key: FEATURES.UNLIMITED_RECIPES,
      });
      expect(result).toBe(true);
    });

    it('should return false when user lacks feature access', async () => {
      const mockRpc = jest.fn().mockResolvedValueOnce({
        data: false,
        error: null,
      });
      (supabase as any).rpc = mockRpc;

      const result = await subscriptionService.hasFeatureAccess(
        mockUserId,
        FEATURES.CREATOR_DASHBOARD
      );

      expect(result).toBe(false);
    });

    it('should return false on RPC error', async () => {
      const mockError = { message: 'RPC error' };
      const mockRpc = jest.fn().mockResolvedValueOnce({
        data: null,
        error: mockError,
      });
      (supabase as any).rpc = mockRpc;

      const result = await subscriptionService.hasFeatureAccess(mockUserId, FEATURES.API_ACCESS);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('❌ Error checking feature access', {
        error: mockError,
        userId: mockUserId,
        featureKey: FEATURES.API_ACCESS,
      });
    });

    it('should handle exceptions and return false', async () => {
      const mockRpc = jest.fn().mockRejectedValueOnce(new Error('Network error'));
      (supabase as any).rpc = mockRpc;

      const result = await subscriptionService.hasFeatureAccess(
        mockUserId,
        FEATURES.NUTRITION_TRACKING
      );

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to check feature access', {
        error: expect.any(Error),
        userId: mockUserId,
        featureKey: FEATURES.NUTRITION_TRACKING,
      });
    });
  });

  describe('getUserFeatures', () => {
    const mockUserId = 'user-123';

    it('should return user features for their tier', async () => {
      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValueOnce({
        id: 2,
        name: 'Regular',
        slug: 'regular',
        price_monthly: 3.99,
        features: {},
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockQuery.eq.mockResolvedValueOnce({
        data: [
          { feature_key: 'unlimited_recipes' },
          { feature_key: 'nutrition_tracking' },
          { feature_key: 'export_pdf' },
        ],
        error: null,
      });

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserFeatures(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('feature_access');
      expect(mockQuery.select).toHaveBeenCalledWith('feature_key');
      expect(mockQuery.contains).toHaveBeenCalledWith('tier_requirements', [2]);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(['unlimited_recipes', 'nutrition_tracking', 'export_pdf']);
    });

    it('should return empty array on error', async () => {
      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValueOnce({
        id: 1,
        name: 'Free',
        slug: 'free',
        price_monthly: 0,
        features: {},
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserFeatures(mockUserId);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('❌ Error fetching user features', {
        error: expect.any(Object),
        userId: mockUserId,
      });
    });

    it('should handle empty features array', async () => {
      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValueOnce({
        id: 1,
        name: 'Free',
        slug: 'free',
        price_monthly: 0,
        features: {},
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValueOnce(mockQuery);

      const result = await subscriptionService.getUserFeatures(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('createSubscription', () => {
    const mockUserId = 'user-123';
    const mockParams = {
      userId: mockUserId,
      tierId: 2,
      provider: 'stripe' as const,
      providerSubscriptionId: 'stripe-sub-123',
      providerCustomerId: 'stripe-cus-123',
    };

    beforeEach(() => {
      // These are private methods, so we'll mock the database calls instead
    });

    it('should create a new subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: mockUserId,
        tier_id: 2,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        provider: 'stripe',
        provider_subscription_id: 'stripe-sub-123',
        provider_customer_id: 'stripe-cus-123',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockSubscription,
          error: null,
        }),
      };

      // Mock the cancelExistingSubscriptions database call
      const cancelQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValueOnce({ data: [], error: null }),
      };
      mockFrom.mockReturnValueOnce(cancelQuery);

      // Mock the createSubscription database call
      mockFrom.mockReturnValueOnce(mockQuery);

      // Mock the logSubscriptionHistory database call
      const historyQuery = {
        insert: jest.fn().mockResolvedValueOnce({ data: {}, error: null }),
      };
      mockFrom.mockReturnValueOnce(historyQuery);

      const result = await subscriptionService.createSubscription(mockParams);

      expect(mockFrom).toHaveBeenCalledWith('user_subscriptions');
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          tier_id: 2,
          status: 'active',
          provider: 'stripe',
          provider_subscription_id: 'stripe-sub-123',
          provider_customer_id: 'stripe-cus-123',
        })
      );
      expect(result).toEqual(mockSubscription);
    });

    it('should create subscription with custom period end', async () => {
      const customPeriodEnd = new Date('2024-12-31');
      const paramsWithPeriod = { ...mockParams, periodEnd: customPeriodEnd };

      const mockSubscription = {
        id: 'sub-123',
        user_id: mockUserId,
        tier_id: 2,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: customPeriodEnd.toISOString(),
        provider: 'stripe',
        provider_subscription_id: 'stripe-sub-123',
        provider_customer_id: 'stripe-cus-123',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockSubscription,
          error: null,
        }),
      };

      // Mock the cancelExistingSubscriptions database call
      const cancelQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValueOnce({ data: [], error: null }),
      };
      mockFrom.mockReturnValueOnce(cancelQuery);

      // Mock the createSubscription database call
      mockFrom.mockReturnValueOnce(mockQuery);

      // Mock the logSubscriptionHistory database call
      const historyQuery = {
        insert: jest.fn().mockResolvedValueOnce({ data: {}, error: null }),
      };
      mockFrom.mockReturnValueOnce(historyQuery);

      await subscriptionService.createSubscription(paramsWithPeriod);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          current_period_end: customPeriodEnd.toISOString(),
        })
      );
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Insert failed' };
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: mockError,
        }),
      };

      // Mock the cancelExistingSubscriptions database call
      const cancelQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValueOnce({ data: [], error: null }),
      };
      mockFrom.mockReturnValueOnce(cancelQuery);

      // Mock the createSubscription database call
      mockFrom.mockReturnValueOnce(mockQuery);

      await expect(subscriptionService.createSubscription(mockParams)).rejects.toEqual(mockError);

      expect(logger.error).toHaveBeenCalledWith('❌ Failed to create subscription', {
        error: mockError,
        params: mockParams,
      });
    });
  });
});

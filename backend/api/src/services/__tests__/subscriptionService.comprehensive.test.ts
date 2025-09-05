import { subscriptionService, SUBSCRIPTION_TIERS, FEATURES } from '../subscriptionService';
import { supabase } from '../../index';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('stripe');

describe('SubscriptionService - Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSubscription', () => {
    it('should return user subscription when found', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        tier_id: 2,
        status: 'active',
        current_period_start: '2024-01-01',
        current_period_end: '2024-02-01',
        cancel_at_period_end: false,
        provider: 'stripe',
        provider_subscription_id: 'sub_stripe_123',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSubscription,
          error: null,
        }),
      });

      const result = await subscriptionService.getUserSubscription('user-123');

      expect(result).toEqual(mockSubscription);
      expect(supabase.from).toHaveBeenCalledWith('user_subscriptions');
    });

    it('should return null when no subscription found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      });

      const result = await subscriptionService.getUserSubscription('user-123');

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'No subscription found for user user-123'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await subscriptionService.getUserSubscription('user-123');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching user subscription',
        expect.objectContaining({ error: dbError })
      );
    });
  });

  describe('getUserTier', () => {
    it('should return user tier based on subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        tier_id: 2,
        status: 'active',
      };

      const mockTier = {
        id: 2,
        name: 'Regular',
        slug: 'regular',
        price_monthly: 9.99,
        features: {
          recipes_per_month: 50,
          scan_limit: 100,
        },
      };

      // Mock getUserSubscription
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(mockSubscription as any);

      // Mock tier fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTier,
          error: null,
        }),
      });

      const result = await subscriptionService.getUserTier('user-123');

      expect(result).toEqual(mockTier);
      expect(supabase.from).toHaveBeenCalledWith('subscription_tiers');
    });

    it('should return free tier when no subscription', async () => {
      const mockFreeTier = {
        id: 1,
        name: 'Free',
        slug: 'free',
        price_monthly: 0,
        features: {
          recipes_per_month: 5,
          scan_limit: 10,
        },
      };

      // Mock no subscription
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(null);

      // Mock free tier fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockFreeTier,
          error: null,
        }),
      });

      const result = await subscriptionService.getUserTier('user-123');

      expect(result).toEqual(mockFreeTier);
      expect(logger.debug).toHaveBeenCalledWith('User user-123 on free tier');
    });

    it('should return free tier on expired subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        tier_id: 2,
        status: 'expired',
      };

      const mockFreeTier = {
        id: 1,
        name: 'Free',
        slug: 'free',
        price_monthly: 0,
        features: {},
      };

      // Mock expired subscription
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(mockSubscription as any);

      // Mock free tier fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockFreeTier,
          error: null,
        }),
      });

      const result = await subscriptionService.getUserTier('user-123');

      expect(result).toEqual(mockFreeTier);
      expect(logger.debug).toHaveBeenCalledWith('User user-123 subscription expired, using free tier');
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      
      // Mock subscription fetch success
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue({
        id: 'sub-123',
        tier_id: 2,
        status: 'active',
      } as any);

      // Mock tier fetch error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      // Should throw error
      await expect(subscriptionService.getUserTier('user-123')).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching subscription tier',
        expect.objectContaining({ error: dbError })
      );
    });
  });

  describe('getUserFeatures', () => {
    it('should return features for user tier', async () => {
      const mockTier = {
        id: 2,
        slug: 'regular',
        features: {
          unlimited_recipes: true,
          nutrition_tracking: true,
          export_pdf: true,
        },
      };

      // Mock getUserTier
      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValue(mockTier as any);

      const result = await subscriptionService.getUserFeatures('user-123');

      expect(result).toEqual([
        FEATURES.UNLIMITED_RECIPES,
        FEATURES.NUTRITION_TRACKING,
        FEATURES.EXPORT_PDF,
      ]);
    });

    it('should return empty array for free tier with no features', async () => {
      const mockTier = {
        id: 1,
        slug: 'free',
        features: {},
      };

      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValue(mockTier as any);

      const result = await subscriptionService.getUserFeatures('user-123');

      expect(result).toEqual([]);
    });

    it('should map creator tier features correctly', async () => {
      const mockTier = {
        id: 3,
        slug: 'creator',
        features: {
          unlimited_recipes: true,
          nutrition_tracking: true,
          export_pdf: true,
          creator_dashboard: true,
          affiliate_links: true,
          revenue_analytics: true,
        },
      };

      jest.spyOn(subscriptionService, 'getUserTier').mockResolvedValue(mockTier as any);

      const result = await subscriptionService.getUserFeatures('user-123');

      expect(result).toContain(FEATURES.CREATOR_DASHBOARD);
      expect(result).toContain(FEATURES.AFFILIATE_LINKS);
      expect(result).toContain(FEATURES.REVENUE_ANALYTICS);
      expect(result.length).toBe(6);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should return true when user has feature', async () => {
      const mockFeatures = [
        FEATURES.UNLIMITED_RECIPES,
        FEATURES.NUTRITION_TRACKING,
      ];

      jest.spyOn(subscriptionService, 'getUserFeatures').mockResolvedValue(mockFeatures);

      const result = await subscriptionService.hasFeatureAccess('user-123', FEATURES.UNLIMITED_RECIPES);

      expect(result).toBe(true);
    });

    it('should return false when user lacks feature', async () => {
      const mockFeatures = [FEATURES.NUTRITION_TRACKING];

      jest.spyOn(subscriptionService, 'getUserFeatures').mockResolvedValue(mockFeatures);

      const result = await subscriptionService.hasFeatureAccess('user-123', FEATURES.CREATOR_DASHBOARD);

      expect(result).toBe(false);
    });

    it('should return false for empty feature list', async () => {
      jest.spyOn(subscriptionService, 'getUserFeatures').mockResolvedValue([]);

      const result = await subscriptionService.hasFeatureAccess('user-123', FEATURES.UNLIMITED_RECIPES);

      expect(result).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session successfully', async () => {
      const mockTier = {
        id: 2,
        slug: 'regular',
        name: 'Regular Plan',
        price_monthly: 9.99,
        stripe_price_id: 'price_regular_monthly',
      };

      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      // Mock tier fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTier,
          error: null,
        }),
      });

      // Mock Stripe
      const mockStripe = {
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue(mockCheckoutSession),
          },
        },
      };
      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      const params = {
        userId: 'user-123',
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await subscriptionService.createCheckoutSession(params);

      expect(result).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          payment_method_types: ['card'],
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      );
    });

    it('should handle missing Stripe configuration', async () => {
      // Mock no Stripe key
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const params = {
        userId: 'user-123',
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(subscriptionService.createCheckoutSession(params)).rejects.toThrow(
        'Stripe is not configured'
      );

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it('should handle invalid tier ID', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Tier not found' },
        }),
      });

      const params = {
        userId: 'user-123',
        tierId: '999',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(subscriptionService.createCheckoutSession(params)).rejects.toThrow(
        'Tier not found'
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel Stripe subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub-123',
        provider: 'stripe',
        provider_subscription_id: 'sub_stripe_123',
      };

      const mockUpdatedStripeSubscription = {
        id: 'sub_stripe_123',
        cancel_at_period_end: true,
      };

      // Mock getUserSubscription
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(mockSubscription as any);

      // Mock Stripe
      const mockStripe = {
        subscriptions: {
          update: jest.fn().mockResolvedValue(mockUpdatedStripeSubscription),
        },
      };
      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      // Mock database update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      await subscriptionService.cancelSubscription('user-123', false);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancel_at_period_end: true }
      );
      expect(supabase.from).toHaveBeenCalledWith('user_subscriptions');
    });

    it('should cancel subscription immediately when requested', async () => {
      const mockSubscription = {
        id: 'sub-123',
        provider: 'stripe',
        provider_subscription_id: 'sub_stripe_123',
      };

      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(mockSubscription as any);

      const mockStripe = {
        subscriptions: {
          cancel: jest.fn().mockResolvedValue({ id: 'sub_stripe_123' }),
        },
      };
      (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      await subscriptionService.cancelSubscription('user-123', true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_123');
    });

    it('should handle manual subscriptions', async () => {
      const mockSubscription = {
        id: 'sub-123',
        provider: 'manual',
      };

      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(mockSubscription as any);

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      await subscriptionService.cancelSubscription('user-123', false);

      expect(supabase.from).toHaveBeenCalledWith('user_subscriptions');
      expect(logger.info).toHaveBeenCalledWith(
        'Cancelled manual subscription for user user-123'
      );
    });

    it('should throw error when no subscription found', async () => {
      jest.spyOn(subscriptionService, 'getUserSubscription').mockResolvedValue(null);

      await expect(subscriptionService.cancelSubscription('user-123')).rejects.toThrow(
        'No active subscription found'
      );
    });
  });

  describe('Constants', () => {
    it('should export correct subscription tiers', () => {
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

    it('should export correct feature keys', () => {
      expect(FEATURES.UNLIMITED_RECIPES).toBe('unlimited_recipes');
      expect(FEATURES.CREATOR_DASHBOARD).toBe('creator_dashboard');
      expect(FEATURES.API_ACCESS).toBe('api_access');
    });
  });
});
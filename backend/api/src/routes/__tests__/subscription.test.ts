import request from 'supertest';
import express from 'express';
import subscriptionRouter from '../subscription';
import { subscriptionService } from '../../services/subscriptionService';
import { creatorService } from '../../services/creatorService';
import { stripeConnectService } from '../../services/stripeConnectService';
import { authenticateUser } from '../../middleware/auth';
import { isCreator } from '../../middleware/subscription';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../services/subscriptionService');
jest.mock('../../services/creatorService');
jest.mock('../../services/stripeConnectService');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/subscription');
jest.mock('../../utils/logger');
jest.mock('stripe');

// Mock dynamic import
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('../../index', () => ({
  supabase: mockSupabase,
}));

// Create test app
const app = express();
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));
app.use('/subscription', subscriptionRouter);

describe('Subscription Routes', () => {
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth mocks
    (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-123', email: 'test@example.com' };
      next();
    });

    (isCreator as jest.Mock).mockImplementation((req, res, next) => {
      next();
    });

    // Setup Stripe mock
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        update: jest.fn(),
        cancel: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      transfers: {
        create: jest.fn(),
      },
    } as any;

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe);

    // Setup environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  });

  describe('GET /subscription/tiers', () => {
    it('should get subscription tiers successfully', async () => {
      const mockTiers = [
        {
          id: 'basic',
          name: 'Basic',
          price_monthly: 999,
          features: ['10 recipes/month', 'Basic support'],
          is_active: true,
        },
        {
          id: 'premium',
          name: 'Premium',
          price_monthly: 1999,
          features: ['Unlimited recipes', 'Priority support', 'Advanced features'],
          is_active: true,
        },
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockTiers,
        error: null,
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tiers).toEqual(mockTiers);
      expect(mockSupabase.from).toHaveBeenCalledWith('subscription_tiers');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscription tiers');
      expect(logger.error).toHaveBeenCalledWith('Get subscription tiers error', expect.any(Object));
    });

    it('should return empty array when no tiers found', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(200);
      expect(response.body.tiers).toEqual([]);
    });
  });

  describe('GET /subscription/status', () => {
    it('should get subscription status successfully', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'test-user-123',
        tier_id: 'premium',
        status: 'active',
        current_period_start: '2024-01-01',
        current_period_end: '2024-02-01',
      };

      const mockTier = {
        id: 'premium',
        name: 'Premium',
        features: ['Unlimited recipes'],
      };

      const mockFeatures = {
        unlimited_recipes: true,
        priority_support: true,
      };

      (subscriptionService.getCurrentSubscription as jest.Mock).mockResolvedValueOnce(
        mockSubscription
      );
      (subscriptionService.getSubscriptionTier as jest.Mock).mockResolvedValueOnce(mockTier);
      (subscriptionService.getSubscriptionFeatures as jest.Mock).mockResolvedValueOnce(
        mockFeatures
      );

      const response = await request(app).get('/subscription/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toEqual(mockSubscription);
      expect(response.body.tier).toEqual(mockTier);
      expect(response.body.features).toEqual(mockFeatures);
    });

    it('should handle user without subscription', async () => {
      (subscriptionService.getCurrentSubscription as jest.Mock).mockResolvedValueOnce(null);
      (subscriptionService.getSubscriptionTier as jest.Mock).mockResolvedValueOnce(null);
      (subscriptionService.getSubscriptionFeatures as jest.Mock).mockResolvedValueOnce({
        unlimited_recipes: false,
      });

      const response = await request(app).get('/subscription/status');

      expect(response.status).toBe(200);
      expect(response.body.subscription).toBeNull();
      expect(response.body.tier).toBeNull();
    });

    it('should handle service errors', async () => {
      (subscriptionService.getCurrentSubscription as jest.Mock).mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app).get('/subscription/status');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscription status');
    });
  });

  describe('POST /subscription/create-checkout', () => {
    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValueOnce(mockSession);

      const response = await request(app).post('/subscription/create-checkout').send({
        tierId: 'premium',
        priceId: 'price_premium_monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.checkoutUrl).toBe(mockSession.url);
      expect(subscriptionService.createCheckoutSession).toHaveBeenCalledWith(
        'test-user-123',
        'premium',
        'price_premium_monthly',
        'https://app.example.com/success',
        'https://app.example.com/cancel'
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/subscription/create-checkout').send({
        tierId: 'premium',
        // Missing required fields
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should handle checkout creation errors', async () => {
      (subscriptionService.createCheckoutSession as jest.Mock).mockRejectedValueOnce(
        new Error('Stripe error')
      );

      const response = await request(app).post('/subscription/create-checkout').send({
        tierId: 'premium',
        priceId: 'price_premium_monthly',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create checkout session');
    });
  });

  describe('POST /subscription/change-tier', () => {
    it('should change subscription tier successfully', async () => {
      const mockUpdatedSubscription = {
        id: 'sub-123',
        tier_id: 'premium',
        status: 'active',
      };

      (subscriptionService.changeSubscriptionTier as jest.Mock).mockResolvedValueOnce(
        mockUpdatedSubscription
      );

      const response = await request(app)
        .post('/subscription/change-tier')
        .send({ newTierId: 'premium' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toEqual(mockUpdatedSubscription);
      expect(subscriptionService.changeSubscriptionTier).toHaveBeenCalledWith(
        'test-user-123',
        'premium'
      );
    });

    it('should validate new tier ID', async () => {
      const response = await request(app).post('/subscription/change-tier').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('New tier ID is required');
    });

    it('should handle tier change errors', async () => {
      (subscriptionService.changeSubscriptionTier as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid tier')
      );

      const response = await request(app)
        .post('/subscription/change-tier')
        .send({ newTierId: 'invalid-tier' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to change subscription tier');
    });
  });

  describe('POST /subscription/cancel', () => {
    it('should cancel subscription successfully', async () => {
      const mockCancelledSubscription = {
        id: 'sub-123',
        status: 'cancelled',
        cancelled_at: '2024-01-01T00:00:00Z',
      };

      (subscriptionService.cancelSubscription as jest.Mock).mockResolvedValueOnce(
        mockCancelledSubscription
      );

      const response = await request(app).post('/subscription/cancel');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toEqual(mockCancelledSubscription);
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith('test-user-123');
    });

    it('should handle cancellation errors', async () => {
      (subscriptionService.cancelSubscription as jest.Mock).mockRejectedValueOnce(
        new Error('No active subscription')
      );

      const response = await request(app).post('/subscription/cancel');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to cancel subscription');
    });
  });

  describe('POST /subscription/webhook/stripe', () => {
    it('should handle successful webhook event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
      (subscriptionService.handleStripeWebhook as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify({ test: 'data' }));

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(subscriptionService.handleStripeWebhook).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send('{}');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid webhook signature');
    });

    it('should handle webhook processing errors', async () => {
      const mockEvent = { type: 'test.event' };
      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
      (subscriptionService.handleStripeWebhook as jest.Mock).mockRejectedValueOnce(
        new Error('Processing error')
      );

      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send('{}');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Webhook processing failed');
    });
  });

  describe('Creator Features', () => {
    describe('POST /subscription/creator/register', () => {
      it('should register creator successfully', async () => {
        const mockCreator = {
          id: 'creator-123',
          user_id: 'test-user-123',
          business_name: 'Test Creator LLC',
          status: 'pending',
        };

        (creatorService.registerCreator as jest.Mock).mockResolvedValueOnce(mockCreator);

        const response = await request(app).post('/subscription/creator/register').send({
          businessName: 'Test Creator LLC',
          businessType: 'individual',
          taxId: '123456789',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.creator).toEqual(mockCreator);
      });

      it('should validate required creator fields', async () => {
        const response = await request(app).post('/subscription/creator/register').send({
          businessName: 'Test Creator LLC',
          // Missing required fields
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required creator information');
      });

      it('should handle creator registration errors', async () => {
        (creatorService.registerCreator as jest.Mock).mockRejectedValueOnce(
          new Error('Registration failed')
        );

        const response = await request(app).post('/subscription/creator/register').send({
          businessName: 'Test Creator LLC',
          businessType: 'individual',
          taxId: '123456789',
        });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to register creator');
      });
    });

    describe('GET /subscription/affiliate/links', () => {
      it('should get affiliate links successfully', async () => {
        const mockLinks = [
          {
            id: 'link-1',
            code: 'TESTCREATOR10',
            url: 'https://app.example.com/ref/TESTCREATOR10',
            clicks: 25,
            conversions: 5,
          },
        ];

        (creatorService.getAffiliateLinks as jest.Mock).mockResolvedValueOnce(mockLinks);

        const response = await request(app).get('/subscription/affiliate/links');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.links).toEqual(mockLinks);
      });

      it('should require creator status', async () => {
        (isCreator as jest.Mock).mockImplementationOnce((req, res, next) => {
          res.status(403).json({ error: 'Creator access required' });
        });

        const response = await request(app).get('/subscription/affiliate/links');

        expect(response.status).toBe(403);
      });
    });

    describe('GET /subscription/creator/revenue', () => {
      it('should get creator revenue successfully', async () => {
        const mockRevenue = {
          total_earnings: 15000,
          current_month: 2500,
          pending_payout: 1200,
          last_payout: '2024-01-01T00:00:00Z',
        };

        (creatorService.getCreatorRevenue as jest.Mock).mockResolvedValueOnce(mockRevenue);

        const response = await request(app).get('/subscription/creator/revenue');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.revenue).toEqual(mockRevenue);
      });

      it('should handle revenue fetch errors', async () => {
        (creatorService.getCreatorRevenue as jest.Mock).mockRejectedValueOnce(
          new Error('Access denied')
        );

        const response = await request(app).get('/subscription/creator/revenue');

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to fetch creator revenue');
      });
    });

    describe('POST /subscription/creator/payout', () => {
      it('should request payout successfully', async () => {
        const mockPayout = {
          id: 'payout-123',
          amount: 10000,
          status: 'pending',
          requested_at: '2024-01-01T00:00:00Z',
        };

        (creatorService.requestPayout as jest.Mock).mockResolvedValueOnce(mockPayout);

        const response = await request(app)
          .post('/subscription/creator/payout')
          .send({ amount: 100.0 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.payout).toEqual(mockPayout);
      });

      it('should validate payout amount', async () => {
        const response = await request(app)
          .post('/subscription/creator/payout')
          .send({ amount: -100 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid payout amount');
      });
    });
  });

  describe('Tipping System', () => {
    describe('POST /subscription/recipe/:recipeId/tip', () => {
      it('should process tip successfully', async () => {
        const mockTip = {
          id: 'tip-123',
          recipe_id: 'recipe-456',
          tipper_id: 'test-user-123',
          creator_id: 'creator-789',
          amount: 500,
          status: 'completed',
        };

        (subscriptionService.processTip as jest.Mock).mockResolvedValueOnce(mockTip);

        const response = await request(app).post('/subscription/recipe/recipe-456/tip').send({
          amount: 5.0,
          message: 'Great recipe!',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.tip).toEqual(mockTip);
      });

      it('should validate tip amount', async () => {
        const response = await request(app)
          .post('/subscription/recipe/recipe-456/tip')
          .send({ amount: 0 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Tip amount must be at least $0.50');
      });

      it('should handle tip processing errors', async () => {
        (subscriptionService.processTip as jest.Mock).mockRejectedValueOnce(
          new Error('Payment failed')
        );

        const response = await request(app)
          .post('/subscription/recipe/recipe-456/tip')
          .send({ amount: 5.0 });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to process tip');
      });
    });
  });

  describe('Mobile App Purchases', () => {
    describe('POST /subscription/verify-ios', () => {
      it('should verify iOS purchase successfully', async () => {
        const mockVerification = {
          valid: true,
          subscription: {
            id: 'sub-ios-123',
            product_id: 'com.cookcam.premium.monthly',
            status: 'active',
          },
        };

        (subscriptionService.verifyAppleReceipt as jest.Mock).mockResolvedValueOnce(
          mockVerification
        );

        const response = await request(app).post('/subscription/verify-ios').send({
          receiptData: 'base64-receipt-data',
          productId: 'com.cookcam.premium.monthly',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.valid).toBe(true);
        expect(response.body.subscription).toEqual(mockVerification.subscription);
      });

      it('should handle invalid iOS receipt', async () => {
        (subscriptionService.verifyAppleReceipt as jest.Mock).mockResolvedValueOnce({
          valid: false,
        });

        const response = await request(app).post('/subscription/verify-ios').send({
          receiptData: 'invalid-receipt',
          productId: 'com.cookcam.premium.monthly',
        });

        expect(response.status).toBe(400);
        expect(response.body.valid).toBe(false);
        expect(response.body.error).toBe('Invalid receipt');
      });
    });

    describe('POST /subscription/verify-android', () => {
      it('should verify Android purchase successfully', async () => {
        const mockVerification = {
          valid: true,
          subscription: {
            id: 'sub-android-123',
            product_id: 'premium_monthly',
            status: 'active',
          },
        };

        (subscriptionService.verifyGooglePlayPurchase as jest.Mock).mockResolvedValueOnce(
          mockVerification
        );

        const response = await request(app).post('/subscription/verify-android').send({
          purchaseToken: 'google-play-token',
          productId: 'premium_monthly',
          packageName: 'com.cookcam.app',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.valid).toBe(true);
      });

      it('should handle invalid Android purchase', async () => {
        (subscriptionService.verifyGooglePlayPurchase as jest.Mock).mockResolvedValueOnce({
          valid: false,
        });

        const response = await request(app).post('/subscription/verify-android').send({
          purchaseToken: 'invalid-token',
          productId: 'premium_monthly',
          packageName: 'com.cookcam.app',
        });

        expect(response.status).toBe(400);
        expect(response.body.valid).toBe(false);
      });
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected endpoints', async () => {
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const protectedEndpoints = [
        { method: 'get', path: '/subscription/status' },
        { method: 'post', path: '/subscription/create-checkout' },
        { method: 'post', path: '/subscription/cancel' },
        { method: 'post', path: '/subscription/verify-ios' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should require creator status for creator endpoints', async () => {
      (isCreator as jest.Mock).mockImplementation((req, res, next) => {
        res.status(403).json({ error: 'Creator access required' });
      });

      const creatorEndpoints = [
        { method: 'get', path: '/subscription/affiliate/links' },
        { method: 'get', path: '/subscription/creator/revenue' },
        { method: 'post', path: '/subscription/creator/payout' },
      ];

      for (const endpoint of creatorEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate tier ID format', async () => {
      const response = await request(app)
        .post('/subscription/change-tier')
        .send({ newTierId: 'invalid tier id with spaces!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid tier ID format');
    });

    it('should validate checkout URLs', async () => {
      const response = await request(app).post('/subscription/create-checkout').send({
        tierId: 'premium',
        priceId: 'price_123',
        successUrl: 'not-a-url',
        cancelUrl: 'also-not-a-url',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid URLs provided');
    });

    it('should validate tip amounts', async () => {
      const invalidAmounts = [-1, 0, 0.25, 1000.01];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/subscription/recipe/recipe-123/tip')
          .send({ amount });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Stripe configuration', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const response = await request(app).post('/subscription/create-checkout').send({
        tierId: 'premium',
        priceId: 'price_123',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Payment system not configured');
    });

    it('should handle service unavailable errors', async () => {
      (subscriptionService.getCurrentSubscription as jest.Mock).mockRejectedValueOnce(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app).get('/subscription/status');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscription status');
    });

    it('should handle unexpected server errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscription tiers');
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent subscription requests', async () => {
      const mockSession = { id: 'cs_123', url: 'https://checkout.stripe.com/cs_123' };
      (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValue(mockSession);

      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app).post('/subscription/create-checkout').send({
            tierId: 'premium',
            priceId: 'price_123',
            successUrl: 'https://app.example.com/success',
            cancelUrl: 'https://app.example.com/cancel',
          })
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle webhook payload size limits', async () => {
      const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB payload

      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .set('stripe-signature', 'test-sig')
        .send(largePayload);

      expect(response.status).toBe(413); // Payload too large
    });
  });
});

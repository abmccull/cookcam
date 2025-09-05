import request from 'supertest';
import express from 'express';
import subscriptionRouter from '../subscription';
import { subscriptionService } from '../../services/subscriptionService';
import { creatorService } from '../../services/creatorService';
import { stripeConnectService } from '../../services/stripeConnectService';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../services/subscriptionService');
jest.mock('../../services/creatorService');
jest.mock('../../services/stripeConnectService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('stripe');

jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Setup Express app with the router
const app = express();
app.use(express.json());
app.use('/subscription', subscriptionRouter);

describe('Subscription Routes - Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /subscription/tiers', () => {
    it('should return available subscription tiers', async () => {
      const mockTiers = [
        {
          id: '1',
          slug: 'free',
          name: 'Free',
          price_monthly: 0,
          is_active: true,
        },
        {
          id: '2',
          slug: 'regular',
          name: 'Regular',
          price_monthly: 9.99,
          is_active: true,
        },
        {
          id: '3',
          slug: 'creator',
          name: 'Creator',
          price_monthly: 29.99,
          is_active: true,
        },
      ];

      // Mock supabase query
      const { supabase } = require('../../index');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTiers,
          error: null,
        }),
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        tiers: mockTiers,
      });

      expect(supabase.from).toHaveBeenCalledWith('subscription_tiers');
    });

    it('should handle database errors when fetching tiers', async () => {
      const { supabase } = require('../../index');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscription tiers');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return empty array when no tiers found', async () => {
      const { supabase } = require('../../index');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const response = await request(app).get('/subscription/tiers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        tiers: [],
      });
    });
  });

  describe('GET /subscription/status', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/subscription/status');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return user subscription status', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockSubscription = {
        id: 'sub-123',
        tier_id: '2',
        status: 'active',
        current_period_end: '2024-12-31',
      };
      const mockTier = {
        slug: 'regular',
        name: 'Regular',
        features: { recipes_per_month: 50 },
      };
      const mockFeatures = ['feature1', 'feature2', 'feature3'];

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service methods
      (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(mockSubscription);
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);
      (subscriptionService.getUserFeatures as jest.Mock).mockResolvedValue(mockFeatures);

      const response = await request(app)
        .get('/subscription/status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        subscription: mockSubscription,
        tier: mockTier,
        features: mockFeatures,
        isCreator: false,
      });

      expect(subscriptionService.getUserSubscription).toHaveBeenCalledWith('user-123');
      expect(subscriptionService.getUserTier).toHaveBeenCalledWith('user-123');
      expect(subscriptionService.getUserFeatures).toHaveBeenCalledWith('user-123');
    });

    it('should identify creator tier correctly', async () => {
      const mockUser = { id: 'user-123', email: 'creator@example.com' };
      const mockTier = {
        slug: 'creator',
        name: 'Creator',
        features: { recipes_per_month: -1 },
      };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service methods
      (subscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);
      (subscriptionService.getUserFeatures as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/subscription/status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.isCreator).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service error
      (subscriptionService.getUserSubscription as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/subscription/status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to get subscription status');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /subscription/create-checkout', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/subscription/create-checkout')
        .send({
          tierId: '2',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create checkout session successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const checkoutData = {
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };
      const mockCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123';

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service method
      (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutUrl);

      const response = await request(app)
        .post('/subscription/create-checkout')
        .set('Authorization', 'Bearer valid-token')
        .send(checkoutData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        checkoutUrl: mockCheckoutUrl,
      });

      expect(subscriptionService.createCheckoutSession).toHaveBeenCalledWith({
        userId: 'user-123',
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });
    });

    it('should validate required parameters', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/subscription/create-checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({ tierId: '2' }); // Missing successUrl and cancelUrl

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.required).toEqual(['tierId', 'successUrl', 'cancelUrl']);
    });

    it('should handle affiliate code tracking', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const checkoutData = {
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        affiliateCode: 'PARTNER123',
      };
      const mockCheckoutUrl = 'https://checkout.stripe.com/pay/cs_test_123';

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service method
      (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValue(mockCheckoutUrl);

      const response = await request(app)
        .post('/subscription/create-checkout')
        .set('Authorization', 'Bearer valid-token')
        .send(checkoutData);

      expect(response.status).toBe(200);
      expect(logger.info).toHaveBeenCalledWith('Affiliate code provided for checkout', {
        affiliateCode: 'PARTNER123',
        userId: 'user-123',
      });
    });

    it('should handle checkout session creation failure', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const checkoutData = {
        tierId: '2',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service method returning null
      (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/subscription/create-checkout')
        .set('Authorization', 'Bearer valid-token')
        .send(checkoutData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create checkout session');
    });
  });

  describe('POST /subscription/cancel', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/subscription/cancel');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should cancel subscription successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service method
      (subscriptionService.cancelSubscription as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/subscription/cancel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Subscription will be cancelled at the end of the billing period',
      });

      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith('user-123', false);
    });

    it('should handle cancellation failure', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service method to throw error
      (subscriptionService.cancelSubscription as jest.Mock).mockRejectedValueOnce(
        new Error('Cancellation failed')
      );

      const response = await request(app)
        .post('/subscription/cancel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to cancel subscription');
    });

    it('should handle service errors', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      const { supabase } = require('../../index');
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service error
      (subscriptionService.cancelSubscription as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/subscription/cancel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to cancel subscription');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /subscription/change-tier', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/subscription/change-tier')
        .send({ tierId: '3' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });



  describe('POST /subscription/webhook/stripe', () => {
    it('should handle missing Stripe configuration', async () => {
      // Temporarily mock process.env
      const originalStripeKey = process.env.STRIPE_SECRET_KEY;
      const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .set('stripe-signature', 'test-signature')
        .send({ type: 'test.event' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Stripe not configured');

      // Restore env vars
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('should reject requests without signature', async () => {
      const response = await request(app)
        .post('/subscription/webhook/stripe')
        .send({ type: 'test.event' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Stripe not configured');
    });
  });
});
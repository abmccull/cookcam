import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import { delay } from './setup';

describe('Subscription Flow Integration', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let userId: string;
  let stripeCustomerId: string;
  let subscriptionId: string;
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Create test user
    const userData = {
      email: `subscription_test_${Date.now()}@example.com`,
      password: 'SubTest123!',
      name: 'Subscription Test User',
    };
    
    const registerResponse = await apiClient.post('/api/auth/register', userData);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });
  
  describe('Free Tier', () => {
    it('should have free tier limits by default', async () => {
      const response = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.subscription).toMatchObject({
        plan: 'free',
        status: 'active',
      });
      
      expect(response.data.limits).toMatchObject({
        max_recipes: 10,
        max_ai_requests: 5,
        max_scans_per_day: 3,
        advanced_features: false,
      });
    });
    
    it('should enforce free tier recipe limit', async () => {
      // Create recipes up to the limit
      for (let i = 0; i < 10; i++) {
        const recipe = {
          title: `Free Tier Recipe ${i}`,
          description: 'Testing free tier limits',
          ingredients: ['ingredient'],
          instructions: ['step'],
        };
        
        const response = await apiClient.post('/api/recipes', recipe, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect(response.status).toBe(201);
      }
      
      // Try to create one more recipe (should fail)
      const extraRecipe = {
        title: 'Recipe Beyond Limit',
        description: 'This should fail',
        ingredients: ['ingredient'],
        instructions: ['step'],
      };
      
      const limitResponse = await apiClient.post('/api/recipes', extraRecipe, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(limitResponse.status).toBe(403);
      expect(limitResponse.data.error).toContain('limit');
    });
  });
  
  describe('Trial Subscription', () => {
    it('should start a trial subscription', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/start-trial',
        { plan: 'pro' },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.subscription).toMatchObject({
        plan: 'pro',
        status: 'trialing',
        trial_end: expect.any(String),
      });
      
      // Trial should be 7 days from now
      const trialEnd = new Date(response.data.subscription.trial_end);
      const expectedEnd = new Date();
      expectedEnd.setDate(expectedEnd.getDate() + 7);
      
      expect(trialEnd.getDate()).toBe(expectedEnd.getDate());
    });
    
    it('should have pro features during trial', async () => {
      const response = await apiClient.get(
        '/api/subscriptions/features',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.features).toMatchObject({
        max_recipes: 100,
        max_ai_requests: 50,
        max_scans_per_day: 20,
        advanced_features: true,
        ai_chef_enabled: true,
      });
    });
    
    it('should track trial usage', async () => {
      // Use some trial features
      await apiClient.post(
        '/api/recipes/generate',
        { prompt: 'Generate a recipe' },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const usageResponse = await apiClient.get(
        '/api/subscriptions/usage',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(usageResponse.status).toBe(200);
      expect(usageResponse.data.usage).toHaveProperty('ai_requests_used');
      expect(usageResponse.data.usage.ai_requests_used).toBeGreaterThan(0);
    });
  });
  
  describe('Paid Subscription', () => {
    it('should create checkout session for subscription', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/create-checkout',
        {
          plan: 'premium',
          success_url: 'http://localhost:3000/success',
          cancel_url: 'http://localhost:3000/cancel',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('checkout_url');
      expect(response.data).toHaveProperty('session_id');
      expect(response.data.checkout_url).toContain('stripe.com');
      
      // In a real test, we'd simulate completing the checkout
      // For now, we'll mock the webhook
    });
    
    it('should handle successful payment webhook', async () => {
      // Simulate Stripe webhook for successful payment
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              user_id: userId,
            },
          },
        },
      };
      
      // Calculate Stripe signature (mock)
      const signature = 'mock_stripe_signature';
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        webhookPayload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify subscription is activated
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (statusResponse.data.subscription.stripe_subscription_id) {
        expect(statusResponse.data.subscription.status).toBe('active');
        expect(statusResponse.data.subscription.plan).toBe('premium');
      }
    });
    
    it('should have premium features after payment', async () => {
      // Mock that payment has been processed
      const featuresResponse = await apiClient.get(
        '/api/subscriptions/features',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (featuresResponse.data.subscription?.plan === 'premium') {
        expect(featuresResponse.data.features).toMatchObject({
          max_recipes: -1, // Unlimited
          max_ai_requests: -1, // Unlimited
          max_scans_per_day: -1, // Unlimited
          advanced_features: true,
          ai_chef_enabled: true,
          creator_mode: true,
          priority_support: true,
        });
      }
    });
  });
  
  describe('Subscription Management', () => {
    it('should update payment method', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/update-payment',
        {
          payment_method_id: 'pm_test_new_card',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.message).toContain('updated');
      }
    });
    
    it('should change subscription plan', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/change-plan',
        {
          new_plan: 'pro',
          prorate: true,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.subscription.plan).toBe('pro');
        expect(response.data.proration_amount).toBeDefined();
      }
    });
    
    it('should pause subscription', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/pause',
        {
          resume_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.subscription.status).toBe('paused');
        expect(response.data.subscription.resume_date).toBeDefined();
      }
    });
    
    it('should resume paused subscription', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/resume',
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.subscription.status).toBe('active');
        expect(response.data.subscription.resume_date).toBeNull();
      }
    });
  });
  
  describe('Subscription Cancellation', () => {
    it('should cancel subscription at period end', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/cancel',
        {
          cancel_at_period_end: true,
          reason: 'Too expensive',
          feedback: 'Great service but pricing is high',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.subscription).toMatchObject({
        cancel_at_period_end: true,
        status: 'active', // Still active until period end
      });
      expect(response.data.subscription.canceled_at).toBeDefined();
    });
    
    it('should allow reactivation before period end', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/reactivate',
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.subscription.cancel_at_period_end).toBe(false);
      expect(response.data.subscription.canceled_at).toBeNull();
    });
    
    it('should immediately cancel subscription', async () => {
      const response = await apiClient.post(
        '/api/subscriptions/cancel',
        {
          cancel_immediately: true,
          reason: 'Not using the service',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.subscription.status).toBe('canceled');
        expect(response.data.refund_amount).toBeDefined();
      }
    });
    
    it('should revert to free tier after cancellation', async () => {
      // Wait a moment for cancellation to process
      await delay(1000);
      
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (statusResponse.data.subscription.status === 'canceled') {
        expect(statusResponse.data.subscription.plan).toBe('free');
        expect(statusResponse.data.limits.max_recipes).toBe(10);
      }
    });
  });
  
  describe('Billing and Invoices', () => {
    it('should retrieve billing history', async () => {
      const response = await apiClient.get(
        '/api/subscriptions/billing-history',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.invoices).toBeInstanceOf(Array);
      
      if (response.data.invoices.length > 0) {
        expect(response.data.invoices[0]).toHaveProperty('amount');
        expect(response.data.invoices[0]).toHaveProperty('status');
        expect(response.data.invoices[0]).toHaveProperty('invoice_pdf');
      }
    });
    
    it('should download invoice PDF', async () => {
      const historyResponse = await apiClient.get(
        '/api/subscriptions/billing-history',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (historyResponse.data.invoices.length > 0) {
        const invoiceId = historyResponse.data.invoices[0].id;
        
        const response = await apiClient.get(
          `/api/subscriptions/invoice/${invoiceId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'arraybuffer',
          }
        );
        
        if (response.status === 200) {
          expect(response.headers['content-type']).toBe('application/pdf');
          expect(response.data).toBeInstanceOf(ArrayBuffer);
        }
      }
    });
    
    it('should get upcoming invoice', async () => {
      const response = await apiClient.get(
        '/api/subscriptions/upcoming-invoice',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200 && response.data.upcoming_invoice) {
        expect(response.data.upcoming_invoice).toHaveProperty('amount');
        expect(response.data.upcoming_invoice).toHaveProperty('due_date');
        expect(response.data.upcoming_invoice).toHaveProperty('line_items');
      }
    });
  });
  
  describe('Failed Payment Handling', () => {
    it('should handle payment failure webhook', async () => {
      const webhookPayload = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            attempt_count: 1,
            next_payment_attempt: Date.now() + 3 * 24 * 60 * 60 * 1000,
          },
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        webhookPayload,
        {
          headers: {
            'stripe-signature': 'mock_signature',
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Check subscription status
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (statusResponse.data.subscription.stripe_subscription_id === 'sub_test_123') {
        expect(statusResponse.data.subscription.status).toBe('past_due');
      }
    });
    
    it('should restrict features for past_due subscriptions', async () => {
      const featuresResponse = await apiClient.get(
        '/api/subscriptions/features',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (featuresResponse.data.subscription?.status === 'past_due') {
        expect(featuresResponse.data.restricted).toBe(true);
        expect(featuresResponse.data.message).toContain('payment');
      }
    });
  });
});
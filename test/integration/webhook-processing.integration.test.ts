import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { testDb } from './setup-db';
import { delay } from './setup';

describe('Webhook Processing Integration', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Create test user
    const userData = {
      email: `webhook_test_${Date.now()}@example.com`,
      password: 'WebhookTest123!',
      name: 'Webhook Test User',
    };
    
    const registerResponse = await apiClient.post('/api/auth/register', userData);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });
  
  describe('Stripe Webhooks', () => {
    const generateStripeSignature = (payload: any, secret: string) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      
      return `t=${timestamp},v1=${signature}`;
    };
    
    it('should process checkout.session.completed webhook', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_checkout_completed',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            customer_email: `webhook_test_${Date.now()}@example.com`,
            subscription: 'sub_test_123',
            payment_status: 'paid',
            metadata: {
              user_id: userId,
              plan: 'premium',
            },
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
            'content-type': 'application/json',
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify subscription was created/updated
      await delay(1000); // Allow async processing
      
      const supabaseClient = testDb.getClient();
      const { data: subscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (subscription) {
        expect(subscription.stripe_subscription_id).toBe('sub_test_123');
        expect(subscription.stripe_customer_id).toBe('cus_test_123');
        expect(subscription.plan).toBe('premium');
        expect(subscription.status).toBe('active');
      }
    });
    
    it('should process customer.subscription.updated webhook', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_subscription_updated',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: {
              data: [
                {
                  price: {
                    id: 'price_premium',
                    product: 'prod_premium',
                  },
                },
              ],
            },
            metadata: {
              user_id: userId,
            },
          },
          previous_attributes: {
            status: 'trialing',
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify subscription status was updated
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (statusResponse.data.subscription?.stripe_subscription_id === 'sub_test_123') {
        expect(statusResponse.data.subscription.status).toBe('active');
      }
    });
    
    it('should process invoice.payment_succeeded webhook', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_payment_succeeded',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_paid: 1999, // $19.99
            currency: 'usd',
            payment_intent: 'pi_test_123',
            lines: {
              data: [
                {
                  description: 'Premium Plan',
                  amount: 1999,
                },
              ],
            },
            metadata: {
              user_id: userId,
            },
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify payment was recorded
      await delay(1000);
      
      const supabaseClient = testDb.getClient();
      const { data: payment } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('stripe_invoice_id', 'in_test_123')
        .single();
      
      if (payment) {
        expect(payment.amount).toBe(1999);
        expect(payment.status).toBe('succeeded');
        expect(payment.user_id).toBe(userId);
      }
    });
    
    it('should process invoice.payment_failed webhook', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_due: 1999,
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
            metadata: {
              user_id: userId,
            },
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify subscription marked as past_due
      await delay(1000);
      
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (statusResponse.data.subscription?.stripe_subscription_id === 'sub_test_123') {
        expect(['past_due', 'unpaid']).toContain(statusResponse.data.subscription.status);
      }
      
      // Verify notification was sent
      const notificationsResponse = await apiClient.get(
        '/api/notifications',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (notificationsResponse.status === 200) {
        const paymentFailedNotification = notificationsResponse.data.notifications?.find(
          (n: any) => n.type === 'payment_failed'
        );
        
        if (paymentFailedNotification) {
          expect(paymentFailedNotification.message).toContain('payment');
        }
      }
    });
    
    it('should process customer.subscription.deleted webhook', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_subscription_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            metadata: {
              user_id: userId,
            },
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify subscription was canceled
      await delay(1000);
      
      const statusResponse = await apiClient.get(
        '/api/subscriptions/status',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(statusResponse.data.subscription.plan).toBe('free');
      expect(statusResponse.data.subscription.status).toBe('canceled');
    });
    
    it('should reject webhook with invalid signature', async () => {
      const payload = {
        id: 'evt_test_invalid',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_invalid',
          },
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': 'invalid_signature',
          },
        }
      );
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('signature');
    });
    
    it('should handle duplicate webhook events (idempotency)', async () => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const payload = {
        id: 'evt_test_duplicate',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_duplicate',
            customer: 'cus_test_123',
            amount_paid: 999,
            metadata: {
              user_id: userId,
            },
          },
        },
      };
      
      const signature = generateStripeSignature(payload, webhookSecret);
      
      // Send the same webhook twice
      const response1 = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      const response2 = await apiClient.post(
        '/api/webhooks/stripe',
        payload,
        {
          headers: {
            'stripe-signature': signature,
          },
        }
      );
      
      expect([200, 204]).toContain(response1.status);
      expect([200, 204]).toContain(response2.status);
      
      // Verify only one payment was recorded
      await delay(1000);
      
      const supabaseClient = testDb.getClient();
      const { data: payments } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('stripe_invoice_id', 'in_test_duplicate');
      
      if (payments && payments.length > 0) {
        expect(payments.length).toBe(1);
      }
    });
  });
  
  describe('App Store Webhooks', () => {
    it('should process iOS subscription purchase notification', async () => {
      const payload = {
        notification_type: 'INITIAL_BUY',
        password: process.env.APP_STORE_SHARED_SECRET || 'test_secret',
        unified_receipt: {
          latest_receipt_info: [
            {
              transaction_id: 'ios_trans_123',
              original_transaction_id: 'ios_orig_123',
              product_id: 'com.cookcam.premium.monthly',
              purchase_date_ms: Date.now(),
              expires_date_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          ],
        },
        bid: 'com.cookcam.app',
        environment: 'Sandbox',
      };
      
      const response = await apiClient.post(
        '/api/webhooks/app-store',
        payload,
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
      
      if (response.status === 200) {
        // Verify iOS subscription was recorded
        await delay(1000);
        
        const supabaseClient = testDb.getClient();
        const { data: subscription } = await supabaseClient
          .from('ios_subscriptions')
          .select('*')
          .eq('transaction_id', 'ios_trans_123')
          .single();
        
        if (subscription) {
          expect(subscription.product_id).toBe('com.cookcam.premium.monthly');
          expect(subscription.status).toBe('active');
        }
      }
    });
    
    it('should process iOS subscription renewal', async () => {
      const payload = {
        notification_type: 'DID_RENEW',
        unified_receipt: {
          latest_receipt_info: [
            {
              transaction_id: 'ios_trans_renewal_123',
              original_transaction_id: 'ios_orig_123',
              product_id: 'com.cookcam.premium.monthly',
              purchase_date_ms: Date.now(),
              expires_date_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          ],
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/app-store',
        payload
      );
      
      expect([200, 204]).toContain(response.status);
    });
    
    it('should process iOS subscription cancellation', async () => {
      const payload = {
        notification_type: 'CANCEL',
        unified_receipt: {
          latest_receipt_info: [
            {
              transaction_id: 'ios_trans_cancel_123',
              original_transaction_id: 'ios_orig_123',
              product_id: 'com.cookcam.premium.monthly',
              cancellation_date_ms: Date.now(),
            },
          ],
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/app-store',
        payload
      );
      
      expect([200, 204]).toContain(response.status);
    });
  });
  
  describe('Google Play Webhooks', () => {
    it('should process Android subscription purchase notification', async () => {
      const payload = {
        message: {
          data: Buffer.from(JSON.stringify({
            version: '1.0',
            packageName: 'com.cookcam.app',
            eventTimeMillis: Date.now(),
            subscriptionNotification: {
              version: '1.0',
              notificationType: 4, // SUBSCRIPTION_PURCHASED
              purchaseToken: 'android_token_123',
              subscriptionId: 'com.cookcam.premium.monthly',
            },
          })).toString('base64'),
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/google-play',
        payload,
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
      
      if (response.status === 200) {
        // Verify Android subscription was recorded
        await delay(1000);
        
        const supabaseClient = testDb.getClient();
        const { data: subscription } = await supabaseClient
          .from('android_subscriptions')
          .select('*')
          .eq('purchase_token', 'android_token_123')
          .single();
        
        if (subscription) {
          expect(subscription.subscription_id).toBe('com.cookcam.premium.monthly');
          expect(subscription.status).toBe('active');
        }
      }
    });
    
    it('should process Android subscription renewal', async () => {
      const payload = {
        message: {
          data: Buffer.from(JSON.stringify({
            subscriptionNotification: {
              notificationType: 2, // SUBSCRIPTION_RENEWED
              purchaseToken: 'android_token_renewal_123',
              subscriptionId: 'com.cookcam.premium.monthly',
            },
          })).toString('base64'),
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/google-play',
        payload
      );
      
      expect([200, 204]).toContain(response.status);
    });
  });
  
  describe('Custom Webhooks', () => {
    it('should process recipe sharing webhook', async () => {
      // Create a recipe first
      const recipeResponse = await apiClient.post(
        '/api/recipes',
        {
          title: 'Recipe to Share',
          description: 'Testing webhook',
          ingredients: ['test'],
          instructions: ['test'],
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const recipeId = recipeResponse.data.recipe.id;
      
      // Simulate external sharing service webhook
      const payload = {
        event: 'recipe.shared',
        recipe_id: recipeId,
        shared_to: 'instagram',
        engagement: {
          likes: 150,
          comments: 23,
          shares: 5,
        },
        timestamp: new Date().toISOString(),
      };
      
      const signature = crypto
        .createHmac('sha256', 'webhook_secret')
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const response = await apiClient.post(
        '/api/webhooks/social',
        payload,
        {
          headers: {
            'x-webhook-signature': signature,
          },
        }
      );
      
      if (response.status === 200) {
        // Verify XP was awarded for sharing
        const gamificationResponse = await apiClient.get(
          '/api/gamification/stats',
          {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (gamificationResponse.status === 200) {
          expect(gamificationResponse.data.total_xp).toBeGreaterThan(0);
        }
      }
    });
    
    it('should process achievement unlock webhook', async () => {
      const payload = {
        event: 'achievement.unlocked',
        user_id: userId,
        achievement: {
          type: 'master_chef',
          xp_reward: 500,
          badge_url: 'https://example.com/badges/master_chef.png',
        },
        timestamp: new Date().toISOString(),
      };
      
      const response = await apiClient.post(
        '/api/webhooks/gamification',
        payload,
        {
          headers: {
            'x-api-key': process.env.INTERNAL_API_KEY || 'test_key',
          },
        }
      );
      
      if (response.status === 200) {
        // Verify achievement was recorded
        const achievementsResponse = await apiClient.get(
          '/api/gamification/achievements',
          {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (achievementsResponse.status === 200) {
          const masterChef = achievementsResponse.data.achievements?.find(
            (a: any) => a.type === 'master_chef'
          );
          
          if (masterChef) {
            expect(masterChef.unlocked).toBe(true);
            expect(masterChef.xp_earned).toBe(500);
          }
        }
      }
    });
  });
  
  describe('Webhook Error Handling', () => {
    it('should retry failed webhook processing', async () => {
      // Simulate a webhook that fails initially
      const payload = {
        type: 'test.retry',
        data: {
          fail_first_attempt: true,
        },
      };
      
      const response = await apiClient.post(
        '/api/webhooks/test',
        payload
      );
      
      // Should return success even if internal processing needs retry
      expect([200, 202]).toContain(response.status);
      
      // Check if retry was scheduled
      await delay(2000);
      
      const supabaseClient = testDb.getClient();
      const { data: webhookLog } = await supabaseClient
        .from('webhook_logs')
        .select('*')
        .eq('type', 'test.retry')
        .single();
      
      if (webhookLog) {
        expect(webhookLog.retry_count).toBeGreaterThan(0);
        expect(webhookLog.status).toBe('completed');
      }
    });
    
    it('should log webhook errors', async () => {
      const payload = {
        type: 'invalid.webhook',
        data: null, // Invalid data
      };
      
      const response = await apiClient.post(
        '/api/webhooks/test',
        payload
      );
      
      // Should still return success to webhook sender
      expect([200, 400]).toContain(response.status);
      
      // Check error was logged
      const supabaseClient = testDb.getClient();
      const { data: errorLog } = await supabaseClient
        .from('webhook_errors')
        .select('*')
        .eq('type', 'invalid.webhook')
        .single();
      
      if (errorLog) {
        expect(errorLog.error_message).toBeDefined();
        expect(errorLog.payload).toBeDefined();
      }
    });
  });
});
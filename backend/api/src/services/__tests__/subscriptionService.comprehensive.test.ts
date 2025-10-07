import { createMockSupabaseClient } from '../../__tests__/utils/testHelpers';
import { mockUsers, mockSubscriptions } from '../../__tests__/utils/mockData';

// Mock dependencies
const mockSupabaseClient = createMockSupabaseClient();

jest.mock('../../index', () => ({
  supabase: mockSupabaseClient,
}));

// Simple subscription service for testing
class SubscriptionService {
  async createSubscription(userId: string, tier: string, stripeSubscriptionId?: string) {
    try {
      const subscription = {
        user_id: userId,
        tier,
        status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data, error } = await mockSupabaseClient
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const { data, error } = await mockSupabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.message !== 'No rows found') throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string) {
    try {
      const { data, error } = await mockSupabaseClient
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async cancelSubscription(userId: string, reason?: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription.success || !subscription.data) {
        throw new Error('Subscription not found');
      }

      const { data, error } = await mockSupabaseClient
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_reason: reason,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update user tier to free
      await mockSupabaseClient
        .from('users')
        .update({ subscription_tier: 'free' })
        .eq('id', userId);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async processWebhook(eventType: string, eventData: any) {
    try {
      switch (eventType) {
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(eventData);
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(eventData);
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(eventData);
        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceeded(eventData);
        case 'invoice.payment_failed':
          return await this.handlePaymentFailed(eventData);
        default:
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionCreated(eventData: any) {
    const subscription = eventData.object;
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const { data: user } = await mockSupabaseClient
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!user) throw new Error('User not found');

    return await this.createSubscription(
      user.id,
      this.getTierFromPrice(subscription.items.data[0].price.id),
      subscription.id
    );
  }

  private async handleSubscriptionUpdated(eventData: any) {
    const subscription = eventData.object;
    return await this.updateSubscriptionStatus(subscription.id, subscription.status);
  }

  private async handleSubscriptionDeleted(eventData: any) {
    const subscription = eventData.object;
    return await this.updateSubscriptionStatus(subscription.id, 'canceled');
  }

  private async handlePaymentSucceeded(eventData: any) {
    // Handle successful payment
    return { success: true, message: 'Payment processed successfully' };
  }

  private async handlePaymentFailed(eventData: any) {
    // Handle failed payment
    return { success: true, message: 'Payment failure processed' };
  }

  private getTierFromPrice(priceId: string): string {
    const tierMap: { [key: string]: string } = {
      'price_premium_monthly': 'premium',
      'price_premium_yearly': 'premium',
      'price_creator_monthly': 'creator',
      'price_creator_yearly': 'creator',
    };
    return tierMap[priceId] || 'free';
  }
}

describe('SubscriptionService - Comprehensive', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionService();
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.insert().select().single().mockResolvedValue({
        data: {
          id: 'sub-123',
          user_id: mockUsers.free.id,
          tier: 'premium',
          status: 'active',
        },
        error: null,
      });

      const result = await service.createSubscription(
        mockUsers.free.id,
        'premium',
        'sub_stripe_123'
      );

      expect(result.success).toBe(true);
      expect(result.data.tier).toBe('premium');
      expect(result.data.status).toBe('active');
    });

    it('should handle database errors', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.insert().select().single().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await service.createSubscription(
        mockUsers.free.id,
        'premium'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('getUserSubscription', () => {
    it('should retrieve active user subscription', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.select().eq().eq().single().mockResolvedValue({
        data: mockSubscriptions.active,
        error: null,
      });

      const result = await service.getUserSubscription(mockUsers.premium.id);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('active');
      expect(result.data.tier).toBe('premium');
    });

    it('should handle user with no subscription', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.select().eq().eq().single().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await service.getUserSubscription('user-no-sub');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.update().eq().select().single().mockResolvedValue({
        data: {
          ...mockSubscriptions.active,
          status: 'past_due',
        },
        error: null,
      });

      const result = await service.updateSubscriptionStatus('sub-123', 'past_due');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('past_due');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      // Mock finding the subscription
      const mockFindBuilder = mockSupabaseClient.from('subscriptions');
      mockFindBuilder.select().eq().eq().single().mockResolvedValue({
        data: mockSubscriptions.active,
        error: null,
      });

      // Mock updating the subscription
      const mockUpdateBuilder = mockSupabaseClient.from('subscriptions');
      mockUpdateBuilder.update().eq().select().single().mockResolvedValue({
        data: {
          ...mockSubscriptions.active,
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        },
        error: null,
      });

      // Mock updating user tier
      const mockUserBuilder = mockSupabaseClient.from('users');
      mockUserBuilder.update().eq().mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.cancelSubscription(
        mockUsers.premium.id,
        'User requested cancellation'
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('canceled');
    });

    it('should handle cancellation of non-existent subscription', async () => {
      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.select().eq().eq().single().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await service.cancelSubscription('user-no-sub');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });
  });

  describe('webhook processing', () => {
    it('should handle subscription created webhook', async () => {
      const webhookData = {
        object: {
          id: 'sub_new_123',
          customer: 'cus_customer_123',
          status: 'active',
          items: {
            data: [{
              price: {
                id: 'price_premium_monthly',
              },
            }],
          },
        },
      };

      // Mock user lookup
      const mockUserBuilder = mockSupabaseClient.from('users');
      mockUserBuilder.select().eq().single().mockResolvedValue({
        data: { id: mockUsers.premium.id },
        error: null,
      });

      // Mock subscription creation
      const mockSubBuilder = mockSupabaseClient.from('subscriptions');
      mockSubBuilder.insert().select().single().mockResolvedValue({
        data: {
          id: 'sub-new-123',
          user_id: mockUsers.premium.id,
          tier: 'premium',
          status: 'active',
        },
        error: null,
      });

      const result = await service.processWebhook('customer.subscription.created', webhookData);

      expect(result.success).toBe(true);
      expect(result.data.tier).toBe('premium');
    });

    it('should handle subscription canceled webhook', async () => {
      const webhookData = {
        object: {
          id: 'sub_canceled_123',
          status: 'canceled',
        },
      };

      const mockQueryBuilder = mockSupabaseClient.from('subscriptions');
      mockQueryBuilder.update().eq().select().single().mockResolvedValue({
        data: {
          id: 'sub_canceled_123',
          status: 'canceled',
        },
        error: null,
      });

      const result = await service.processWebhook('customer.subscription.deleted', webhookData);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('canceled');
    });

    it('should handle unknown webhook event types', async () => {
      const result = await service.processWebhook('unknown.event.type', {});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event type not handled');
    });

    it('should handle webhook processing errors', async () => {
      const webhookData = {
        object: {
          customer: 'invalid_customer',
        },
      };

      const mockUserBuilder = mockSupabaseClient.from('users');
      mockUserBuilder.select().eq().single().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await service.processWebhook('customer.subscription.created', webhookData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('subscription tier management', () => {
    it('should correctly map price IDs to tiers', () => {
      const service = new SubscriptionService();
      const getTierFromPrice = (service as any).getTierFromPrice.bind(service);

      expect(getTierFromPrice('price_premium_monthly')).toBe('premium');
      expect(getTierFromPrice('price_creator_yearly')).toBe('creator');
      expect(getTierFromPrice('unknown_price_id')).toBe('free');
    });
  });

  describe('subscription lifecycle', () => {
    it('should handle full subscription lifecycle', async () => {
      // Create subscription
      const mockCreateBuilder = mockSupabaseClient.from('subscriptions');
      mockCreateBuilder.insert().select().single().mockResolvedValue({
        data: {
          id: 'sub-lifecycle-123',
          user_id: mockUsers.free.id,
          tier: 'premium',
          status: 'active',
        },
        error: null,
      });

      const createResult = await service.createSubscription(
        mockUsers.free.id,
        'premium',
        'sub_stripe_lifecycle'
      );

      expect(createResult.success).toBe(true);

      // Update subscription status
      const mockUpdateBuilder = mockSupabaseClient.from('subscriptions');
      mockUpdateBuilder.update().eq().select().single().mockResolvedValue({
        data: {
          id: 'sub-lifecycle-123',
          status: 'past_due',
        },
        error: null,
      });

      const updateResult = await service.updateSubscriptionStatus('sub-lifecycle-123', 'past_due');

      expect(updateResult.success).toBe(true);
      expect(updateResult.data.status).toBe('past_due');

      // Cancel subscription
      const mockFindBuilder = mockSupabaseClient.from('subscriptions');
      mockFindBuilder.select().eq().eq().single().mockResolvedValue({
        data: {
          id: 'sub-lifecycle-123',
          user_id: mockUsers.free.id,
          status: 'past_due',
        },
        error: null,
      });

      const mockCancelBuilder = mockSupabaseClient.from('subscriptions');
      mockCancelBuilder.update().eq().select().single().mockResolvedValue({
        data: {
          id: 'sub-lifecycle-123',
          status: 'canceled',
        },
        error: null,
      });

      const mockUserUpdateBuilder = mockSupabaseClient.from('users');
      mockUserUpdateBuilder.update().eq().mockResolvedValue({
        data: {},
        error: null,
      });

      const cancelResult = await service.cancelSubscription(mockUsers.free.id);

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.data.status).toBe('canceled');
    });
  });
});
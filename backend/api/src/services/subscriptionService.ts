import { supabase } from '../index';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

// Initialize Stripe (will be configured later)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null;

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  FREE: { id: 1, slug: 'free', name: 'Free', price: 0 },
  REGULAR: { id: 2, slug: 'regular', name: 'Regular', price: 3.99 },
  CREATOR: { id: 3, slug: 'creator', name: 'Creator', price: 9.99 }
};

// Feature keys
export const FEATURES = {
  UNLIMITED_RECIPES: 'unlimited_recipes',
  NUTRITION_TRACKING: 'nutrition_tracking',
  EXPORT_PDF: 'export_pdf',
  CREATOR_DASHBOARD: 'creator_dashboard',
  AFFILIATE_LINKS: 'affiliate_links',
  REVENUE_ANALYTICS: 'revenue_analytics',
  DIRECT_MESSAGING: 'direct_messaging',
  BULK_OPERATIONS: 'bulk_operations',
  API_ACCESS: 'api_access'
};

interface SubscriptionTier {
  id: number;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly?: number;
  features: Record<string, any>;
}

interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: number;
  status: 'active' | 'canceled' | 'expired' | 'paused';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  provider: 'stripe' | 'ios' | 'android' | 'manual';
  provider_subscription_id?: string;
  provider_customer_id?: string;
}

export class SubscriptionService {
  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        logger.error('❌ Error fetching user subscription', { error, userId });
        throw error;
      }

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to get user subscription', { error, userId });
      return null;
    }
  }

  // Get user's subscription tier (defaults to free)
  async getUserTier(userId: string): Promise<SubscriptionTier> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return this.getTierById(SUBSCRIPTION_TIERS.FREE.id);
      }

      return this.getTierById(subscription.tier_id);
    } catch (error: unknown) {
      logger.error('❌ Failed to get user tier', { error, userId });
      return this.getTierById(SUBSCRIPTION_TIERS.FREE.id);
    }
  }

  // Get tier by ID
  async getTierById(tierId: number): Promise<SubscriptionTier> {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (error || !data) {
      logger.error('❌ Failed to get tier', { error, tierId });
      throw new Error('Subscription tier not found');
    }

    return data;
  }

  // Check if user has access to a specific feature
  async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('user_has_feature_access', {
          user_id: userId,
          feature_key: featureKey
        });

      if (error) {
        logger.error('❌ Error checking feature access', { error, userId, featureKey });
        return false;
      }

      return data === true;
    } catch (error: unknown) {
      logger.error('❌ Failed to check feature access', { error, userId, featureKey });
      return false;
    }
  }

  // Get all features for a user's current tier
  async getUserFeatures(userId: string): Promise<string[]> {
    try {
      const tier = await this.getUserTier(userId);
      
      const { data: features, error } = await supabase
        .from('feature_access')
        .select('feature_key')
        .contains('tier_requirements', [tier.id])
        .eq('is_active', true);

      if (error) {
        logger.error('❌ Error fetching user features', { error, userId });
        return [];
      }

      return features?.map(f => f.feature_key) || [];
    } catch (error: unknown) {
      logger.error('❌ Failed to get user features', { error, userId });
      return [];
    }
  }

  // Create a subscription
  async createSubscription(params: {
    userId: string;
    tierId: number;
    provider: 'stripe' | 'ios' | 'android' | 'manual';
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    periodEnd?: Date;
  }): Promise<UserSubscription> {
    try {
      // Cancel any existing active subscriptions
      await this.cancelExistingSubscriptions(params.userId);

      const periodEnd = params.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: params.userId,
          tier_id: params.tierId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          provider: params.provider,
          provider_subscription_id: params.providerSubscriptionId,
          provider_customer_id: params.providerCustomerId
        })
        .select()
        .single();

      if (error) {
        logger.error('❌ Failed to create subscription', { error, params });
        throw error;
      }

      // Log subscription history
      await this.logSubscriptionHistory({
        userId: params.userId,
        subscriptionId: data.id,
        action: 'created',
        toTierId: params.tierId
      });

      logger.info('✅ Subscription created', { 
        userId: params.userId, 
        tierId: params.tierId,
        subscriptionId: data.id 
      });

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to create subscription', { error, params });
      throw error;
    }
  }

  // Cancel existing active subscriptions
  private async cancelExistingSubscriptions(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      logger.error('❌ Failed to cancel existing subscriptions', { error, userId });
    }
  }

  // Update subscription status
  async updateSubscriptionStatus(
    subscriptionId: string, 
    status: 'active' | 'canceled' | 'expired' | 'paused'
  ): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'canceled') {
        updateData.canceled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        logger.error('❌ Failed to update subscription status', { error, subscriptionId, status });
        throw error;
      }

      logger.info('✅ Subscription status updated', { subscriptionId, status });
    } catch (error: unknown) {
      logger.error('❌ Failed to update subscription', { error, subscriptionId, status });
      throw error;
    }
  }

  // Cancel subscription at period end
  async cancelSubscription(userId: string, immediately: boolean = false): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (immediately) {
        await this.updateSubscriptionStatus(subscription.id, 'canceled');
      } else {
        // Cancel at period end
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ 
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (error) {
          throw error;
        }
      }

      // Log cancellation
      await this.logSubscriptionHistory({
        userId,
        subscriptionId: subscription.id,
        action: immediately ? 'canceled' : 'scheduled_cancel',
        fromTierId: subscription.tier_id
      });

      logger.info('✅ Subscription canceled', { userId, immediately });
    } catch (error: unknown) {
      logger.error('❌ Failed to cancel subscription', { error, userId });
      throw error;
    }
  }

  // Upgrade or downgrade subscription
  async changeSubscriptionTier(userId: string, newTierId: number): Promise<UserSubscription> {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      
      if (!currentSubscription) {
        // Create new subscription if none exists
        return this.createSubscription({
          userId,
          tierId: newTierId,
          provider: 'manual'
        });
      }

      const oldTierId = currentSubscription.tier_id;

      // Update existing subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({ 
          tier_id: newTierId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSubscription.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log tier change
      await this.logSubscriptionHistory({
        userId,
        subscriptionId: currentSubscription.id,
        action: newTierId > oldTierId ? 'upgraded' : 'downgraded',
        fromTierId: oldTierId,
        toTierId: newTierId
      });

      logger.info('✅ Subscription tier changed', { 
        userId, 
        from: oldTierId, 
        to: newTierId 
      });

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to change subscription tier', { error, userId, newTierId });
      throw error;
    }
  }

  // Log subscription history
  private async logSubscriptionHistory(params: {
    userId: string;
    subscriptionId: string;
    action: string;
    fromTierId?: number;
    toTierId?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscription_history')
        .insert({
          user_id: params.userId,
          subscription_id: params.subscriptionId,
          action: params.action,
          from_tier_id: params.fromTierId,
          to_tier_id: params.toTierId,
          metadata: params.metadata
        });

      if (error) {
        logger.error('❌ Failed to log subscription history', { error, params });
      }
    } catch (error: unknown) {
      logger.error('❌ Error logging subscription history', { error, params });
    }
  }

  // Check and process expired subscriptions
  async processExpiredSubscriptions(): Promise<void> {
    try {
      const { data: expiredSubs, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active')
        .lt('current_period_end', new Date().toISOString())
        .limit(100);

      if (error) {
        throw error;
      }

      for (const sub of expiredSubs || []) {
        if (sub.cancel_at_period_end) {
          // Cancel the subscription
          await this.updateSubscriptionStatus(sub.id, 'canceled');
        } else {
          // Mark as expired (would normally attempt renewal here)
          await this.updateSubscriptionStatus(sub.id, 'expired');
        }
      }

      logger.info('✅ Processed expired subscriptions', { 
        count: expiredSubs?.length || 0 
      });
    } catch (error: unknown) {
      logger.error('❌ Failed to process expired subscriptions', { error });
    }
  }

  // Create Stripe checkout session
  async createCheckoutSession(params: {
    userId: string;
    tierId: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string | null> {
    if (!stripe) {
      logger.error('❌ Stripe not configured');
      return null;
    }

    try {
      const tier = await this.getTierById(params.tierId);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `CookCam ${tier.name} Subscription`,
                description: `Monthly subscription to CookCam ${tier.name} tier`,
              },
              unit_amount: Math.round(tier.price_monthly * 100), // Convert to cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          user_id: params.userId,
          tier_id: params.tierId.toString(),
        },
      });

      return session.url;
    } catch (error: unknown) {
      logger.error('❌ Failed to create checkout session', { error, params });
      return null;
    }
  }

  // Handle Stripe webhook events
  async handleStripeWebhook(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
      }
    } catch (error: unknown) {
      logger.error('❌ Failed to handle Stripe webhook', { error, eventType: event.type });
      throw error;
    }
  }

  private async handleCheckoutComplete(session: any): Promise<void> {
    const userId = session.metadata.user_id;
    const tierId = parseInt(session.metadata.tier_id);

    await this.createSubscription({
      userId,
      tierId,
      provider: 'stripe',
      providerSubscriptionId: session.subscription,
      providerCustomerId: session.customer
    });

    // Check for referral attribution and record conversion
    await this.checkAndRecordReferralConversion(userId, session.subscription, tierId);
  }

  // Check for referral attribution and record conversion
  private async checkAndRecordReferralConversion(userId: string, subscriptionId: string, tierId: number): Promise<void> {
    try {
      // Check if user has referral attribution
      const { data: attribution } = await supabase
        .from('referral_attributions')
        .select('*')
        .eq('user_id', userId)
        .order('attributed_at', { ascending: false })
        .limit(1)
        .single();

      if (attribution) {
        // Import CreatorService to record conversion
        const { CreatorService } = await import('./creatorService');
        const creatorService = new CreatorService();
        
        await creatorService.recordAffiliateConversion({
          linkCode: attribution.link_code,
          subscriberId: userId,
          subscriptionId: subscriptionId,
          tierId: tierId
        });

        logger.info('💰 Referral conversion recorded from subscription', {
          userId,
          linkCode: attribution.link_code,
          subscriptionId
        });
      }
    } catch (error) {
      logger.error('❌ Failed to check referral attribution', { error, userId });
      // Don't fail the subscription if referral tracking fails
    }
  }

  private async handleSubscriptionUpdate(subscription: any): Promise<void> {
    // Handle subscription updates from Stripe
    logger.info('Stripe subscription updated', { id: subscription.id });
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    // Handle subscription cancellation from Stripe
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('provider_subscription_id', subscription.id)
      .single();

    if (data) {
      await this.updateSubscriptionStatus(data.id, 'canceled');
    }
  }

  // Get subscription stats for admin dashboard
  async getSubscriptionStats(): Promise<any> {
    try {
      // Get counts by tier
      const { data: tierCounts } = await supabase
        .from('user_subscriptions')
        .select('tier_id, count')
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString());

      // Get monthly revenue
      const { data: revenue } = await supabase
        .rpc('calculate_monthly_revenue', {
          target_month: new Date().getMonth() + 1,
          target_year: new Date().getFullYear()
        });

      return {
        tierCounts,
        revenue,
        lastUpdated: new Date()
      };
    } catch (error: unknown) {
      logger.error('❌ Failed to get subscription stats', { error });
      return null;
    }
  }

  // Get user's active subscription (alias for getUserSubscription)
  async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    return this.getUserSubscription(userId);
  }

  // Create or update subscription (for receipt validation)
  async createOrUpdateSubscription(params: {
    userId: string;
    productId: string;
    purchaseToken: string;
    platform: 'ios' | 'android';
    validationResult: any;
  }): Promise<UserSubscription> {
    try {
      // Determine tier based on product ID
      let tierId = SUBSCRIPTION_TIERS.REGULAR.id;
      if (params.productId.includes('creator') || params.productId.includes('premium')) {
        tierId = SUBSCRIPTION_TIERS.CREATOR.id;
      }

      // Check if subscription already exists
      const existing = await this.getUserSubscription(params.userId);
      
      if (existing && existing.provider_subscription_id === params.purchaseToken) {
        // Update existing subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(parseInt(params.validationResult.expiryTimeMillis || params.validationResult.expires_date_ms)).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw error;
        }
        return data;
      } else {
        // Create new subscription
        return this.createSubscription({
          userId: params.userId,
          tierId,
          provider: params.platform,
          providerSubscriptionId: params.purchaseToken,
          periodEnd: new Date(parseInt(params.validationResult.expiryTimeMillis || params.validationResult.expires_date_ms))
        });
      }
    } catch (error: unknown) {
      logger.error('❌ Failed to create/update subscription', { error, params });
      throw error;
    }
  }

  // Update user JWT claims (for real-time feature access)
  async updateUserJWTClaims(userId: string, subscription: UserSubscription | null): Promise<void> {
    try {
      const tier = subscription ? await this.getTierById(subscription.tier_id) : await this.getTierById(SUBSCRIPTION_TIERS.FREE.id);
      const features = await this.getUserFeatures(userId);

      // Update user metadata with subscription info
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          subscription_tier: tier.slug,
          subscription_status: subscription?.status || 'free',
          features: features
        }
      });

      if (error) {
        logger.error('❌ Failed to update user JWT claims', { error, userId });
      } else {
        logger.info('✅ Updated user JWT claims', { userId, tier: tier.slug });
      }
    } catch (error: unknown) {
      logger.error('❌ Failed to update user JWT claims', { error, userId });
    }
  }

  // Mark subscription as expired
  async markSubscriptionExpired(subscriptionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        logger.error('❌ Failed to mark subscription expired', { error, subscriptionId });
        throw error;
      }

      logger.info('✅ Marked subscription as expired', { subscriptionId });
    } catch (error: unknown) {
      logger.error('❌ Failed to mark subscription expired', { error, subscriptionId });
      throw error;
    }
  }

  // Mark subscription for cancellation at period end
  async markSubscriptionForCancellation(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        logger.error('❌ Failed to mark subscription for cancellation', { error, userId });
        throw error;
      }

      // Log the cancellation
      await this.logSubscriptionHistory({
        userId,
        subscriptionId: subscription.id,
        action: 'marked_for_cancellation'
      });

      logger.info('✅ Marked subscription for cancellation', { userId, subscriptionId: subscription.id });
    } catch (error: unknown) {
      logger.error('❌ Failed to mark subscription for cancellation', { error, userId });
      throw error;
    }
  }

  // Upgrade user to creator tier
  async upgradeUserToCreator(userId: string, metadata: any): Promise<any> {
    try {
      // Create creator subscription
      await this.createSubscription({
        userId,
        tierId: SUBSCRIPTION_TIERS.CREATOR.id,
        provider: 'manual',
        periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      });

      // Update user profile to creator
      const { data: updatedUser, error: userError } = await supabase
        .from('profiles')
        .update({
          user_type: 'creator',
          creator_metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (userError) {
        logger.error('❌ Failed to update user to creator', { userError, userId });
        throw userError;
      }

      logger.info('✅ Upgraded user to creator', { userId });
      return updatedUser;
    } catch (error: unknown) {
      logger.error('❌ Failed to upgrade user to creator', { error, userId });
      throw error;
    }
  }

  // Setup creator-specific features
  async setupCreatorFeatures(userId: string): Promise<void> {
    try {
      // Create creator dashboard entry
      const { error: dashboardError } = await supabase
        .from('creator_dashboards')
        .upsert({
          user_id: userId,
          total_recipes: 0,
          total_followers: 0,
          total_revenue: 0,
          created_at: new Date().toISOString()
        });

      if (dashboardError) {
        logger.error('❌ Failed to create creator dashboard', { dashboardError, userId });
      }

      // Setup default creator settings
      const { error: settingsError } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: userId,
          allow_affiliate_links: true,
          revenue_sharing_enabled: true,
          public_profile: true,
          created_at: new Date().toISOString()
        });

      if (settingsError) {
        logger.error('❌ Failed to create creator settings', { settingsError, userId });
      }

      logger.info('✅ Setup creator features', { userId });
    } catch (error: unknown) {
      logger.error('❌ Failed to setup creator features', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService; 
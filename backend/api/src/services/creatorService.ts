import { supabase } from '../index';
import { logger } from '../utils/logger';
import { subscriptionService, SUBSCRIPTION_TIERS } from './subscriptionService';
import { stripeConnectService } from './stripeConnectService';

// Helper to generate unique affiliate codes
function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CC_'; // CookCam prefix
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface AffiliateLink {
  id: string;
  creator_id: string;
  link_code: string;
  custom_slug?: string;
  campaign_name?: string;
  is_active: boolean;
  click_count: number;
  created_at: Date;
}

interface CreatorRevenue {
  creator_id: string;
  month: number;
  year: number;
  affiliate_earnings: number;
  tips_earnings: number;
  collections_earnings: number;
  total_earnings: number;
  active_referrals: number;
  new_referrals: number;
  lost_referrals: number;
  payout_status: string;
}

export class CreatorService {
  // Check if user is a creator (has creator subscription)
  async isCreator(userId: string): Promise<boolean> {
    try {
      const subscription = await subscriptionService.getUserSubscription(userId);
      return subscription?.tier_id === SUBSCRIPTION_TIERS.CREATOR.id;
    } catch (error: unknown) {
      logger.error('❌ Failed to check creator status', { error, userId });
      return false;
    }
  }

  // Generate a new affiliate link
  async generateAffiliateLink(params: {
    creatorId: string;
    campaignName?: string;
    customSlug?: string;
  }): Promise<AffiliateLink> {
    try {
      // Verify user is a creator
      const isCreator = await this.isCreator(params.creatorId);
      if (!isCreator) {
        throw new Error('User is not a creator');
      }

      let linkCode = generateAffiliateCode();
      let attempts = 0;

      // Ensure unique code
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('creator_affiliate_links')
          .select('id')
          .eq('link_code', linkCode)
          .single();

        if (!existing) {
          break;
        }

        linkCode = generateAffiliateCode();
        attempts++;
      }

      // Check custom slug uniqueness
      if (params.customSlug) {
        const { data: slugExists } = await supabase
          .from('creator_affiliate_links')
          .select('id')
          .eq('custom_slug', params.customSlug)
          .single();

        if (slugExists) {
          throw new Error('Custom slug already exists');
        }
      }

      // Create the affiliate link
      const { data, error } = await supabase
        .from('creator_affiliate_links')
        .insert({
          creator_id: params.creatorId,
          link_code: linkCode,
          custom_slug: params.customSlug,
          campaign_name: params.campaignName || 'Default Campaign',
          is_active: true,
          click_count: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('❌ Failed to create affiliate link', { error, params });
        throw error;
      }

      logger.info('✅ Affiliate link created', {
        creatorId: params.creatorId,
        linkCode,
        customSlug: params.customSlug,
      });

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to generate affiliate link', { error, params });
      throw error;
    }
  }

  // Get all affiliate links for a creator
  async getCreatorAffiliateLinks(creatorId: string): Promise<AffiliateLink[]> {
    try {
      const { data, error } = await supabase
        .from('creator_affiliate_links')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: unknown) {
      logger.error('❌ Failed to get creator affiliate links', { error, creatorId });
      return [];
    }
  }

  // Track affiliate link click
  async trackAffiliateClick(
    linkCode: string,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      // Record the click
      await supabase.from('affiliate_link_clicks').insert({
        link_code: linkCode,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
        referrer: metadata?.referrer,
      });

      // Increment click count
      await supabase.rpc('increment', {
        table_name: 'creator_affiliate_links',
        column_name: 'click_count',
        row_id: linkCode,
        x: 1,
      });

      logger.info('📊 Affiliate link clicked', { linkCode });
    } catch (error: unknown) {
      logger.error('❌ Failed to track affiliate click', { error, linkCode });
    }
  }

  // Convert affiliate link to subscription
  async recordAffiliateConversion(params: {
    linkCode: string;
    subscriberId: string;
    subscriptionId: string;
    tierId: number;
  }): Promise<void> {
    try {
      // Get the affiliate link
      const { data: link, error: linkError } = await supabase
        .from('creator_affiliate_links')
        .select('creator_id')
        .eq('link_code', params.linkCode)
        .single();

      if (linkError || !link) {
        throw new Error('Invalid affiliate link');
      }

      // Record the conversion
      const { error } = await supabase.from('affiliate_conversions').insert({
        link_code: params.linkCode,
        creator_id: link.creator_id,
        subscriber_id: params.subscriberId,
        subscription_id: params.subscriptionId,
        tier_id: params.tierId,
        is_active: true,
      });

      if (error) {
        throw error;
      }

      logger.info('💰 Affiliate conversion recorded', {
        linkCode: params.linkCode,
        creatorId: link.creator_id,
        subscriberId: params.subscriberId,
      });

      // Update creator's monthly revenue
      await this.updateCreatorMonthlyRevenue(link.creator_id);
    } catch (error: unknown) {
      logger.error('❌ Failed to record affiliate conversion', { error, params });
      throw error;
    }
  }

  // Get creator's revenue for a specific month
  async getCreatorRevenue(
    creatorId: string,
    month?: number,
    year?: number
  ): Promise<CreatorRevenue | null> {
    try {
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();

      // Check if revenue record exists
      const { data: revenue, error } = await supabase
        .from('creator_revenue')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('month', targetMonth)
        .eq('year', targetYear)
        .single();

      if (error && error.code === 'PGRST116') {
        // Record doesn't exist, calculate and create it
        const newRevenue = await this.calculateAndSaveCreatorRevenue(
          creatorId,
          targetMonth,
          targetYear
        );
        return newRevenue;
      } else if (error) {
        throw error;
      }

      return revenue;
    } catch (error: unknown) {
      logger.error('❌ Failed to get creator revenue', { error, creatorId, month, year });
      return null;
    }
  }

  // Calculate and save creator revenue
  private async calculateAndSaveCreatorRevenue(
    creatorId: string,
    month: number,
    year: number
  ): Promise<CreatorRevenue> {
    try {
      // Calculate revenue using the database function
      const { data: calculation, error: calcError } = await supabase.rpc(
        'calculate_creator_monthly_revenue',
        {
          creator_id: creatorId,
          target_month: month,
          target_year: year,
        }
      );

      if (calcError || !calculation || calculation.length === 0) {
        throw new Error('Failed to calculate revenue');
      }

      const revenueData = calculation[0];

      // Save to creator_revenue table
      const { data: saved, error: saveError } = await supabase
        .from('creator_revenue')
        .upsert({
          creator_id: creatorId,
          month,
          year,
          affiliate_earnings: revenueData.affiliate_earnings,
          tips_earnings: revenueData.tips_earnings,
          collections_earnings: revenueData.collections_earnings,
          total_earnings: revenueData.total_earnings,
          active_referrals: revenueData.active_referrals,
          new_referrals: 0, // TODO: Calculate new referrals
          lost_referrals: 0, // TODO: Calculate lost referrals
          payout_status: 'pending',
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      logger.info('💰 Creator revenue calculated and saved', {
        creatorId,
        month,
        year,
        total: saved.total_earnings,
      });

      return saved;
    } catch (error: unknown) {
      logger.error('❌ Failed to calculate creator revenue', { error, creatorId, month, year });
      throw error;
    }
  }

  // Update creator's monthly revenue (called after conversions, tips, etc.)
  async updateCreatorMonthlyRevenue(creatorId: string): Promise<void> {
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      await this.calculateAndSaveCreatorRevenue(creatorId, month, year);
    } catch (error: unknown) {
      logger.error('❌ Failed to update creator monthly revenue', { error, creatorId });
    }
  }

  // Get creator's referrals
  async getCreatorReferrals(creatorId: string, activeOnly: boolean = true): Promise<any[]> {
    try {
      let query = supabase
        .from('affiliate_conversions')
        .select(
          `
          *,
          subscriber:subscriber_id (
            id,
            email,
            created_at
          ),
          subscription:subscription_id (
            tier_id,
            status,
            current_period_end
          )
        `
        )
        .eq('creator_id', creatorId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('converted_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: unknown) {
      logger.error('❌ Failed to get creator referrals', { error, creatorId });
      return [];
    }
  }

  // Tip a recipe creator
  async tipRecipeCreator(params: {
    recipeId: string;
    creatorId: string;
    tipperId: string;
    amount: number;
    message?: string;
    isAnonymous?: boolean;
  }): Promise<void> {
    try {
      if (params.amount < 0.5) {
        throw new Error('Minimum tip amount is $0.50');
      }

      // Record the tip
      const { error } = await supabase.from('recipe_tips').insert({
        recipe_id: params.recipeId,
        creator_id: params.creatorId,
        tipper_id: params.tipperId,
        amount: params.amount,
        message: params.message,
        is_anonymous: params.isAnonymous || false,
      });

      if (error) {
        throw error;
      }

      logger.info('💰 Recipe tip recorded', {
        recipeId: params.recipeId,
        creatorId: params.creatorId,
        amount: params.amount,
      });

      // Update creator's monthly revenue
      await this.updateCreatorMonthlyRevenue(params.creatorId);

      // TODO: Process payment through Stripe
      // TODO: Send notification to creator
    } catch (error: unknown) {
      logger.error('❌ Failed to tip recipe creator', { error, params });
      throw error;
    }
  }

  // Create a premium recipe collection
  async createPremiumCollection(params: {
    creatorId: string;
    title: string;
    description?: string;
    price: number;
    recipeIds: string[];
    coverImageUrl?: string;
  }): Promise<any> {
    try {
      // Verify user is a creator
      const isCreator = await this.isCreator(params.creatorId);
      if (!isCreator) {
        throw new Error('User is not a creator');
      }

      if (params.price < 0.99) {
        throw new Error('Minimum collection price is $0.99');
      }

      // Create the collection
      const { data: collection, error } = await supabase
        .from('premium_collections')
        .insert({
          creator_id: params.creatorId,
          title: params.title,
          description: params.description,
          price: params.price,
          recipe_count: params.recipeIds.length,
          cover_image_url: params.coverImageUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // TODO: Link recipes to collection

      logger.info('📚 Premium collection created', {
        creatorId: params.creatorId,
        collectionId: collection.id,
        recipeCount: params.recipeIds.length,
      });

      return collection;
    } catch (error: unknown) {
      logger.error('❌ Failed to create premium collection', { error, params });
      throw error;
    }
  }

  // Purchase a premium collection
  async purchaseCollection(params: { collectionId: string; buyerId: string }): Promise<void> {
    try {
      // Get collection details
      const { data: collection, error: collError } = await supabase
        .from('premium_collections')
        .select('*')
        .eq('id', params.collectionId)
        .eq('is_active', true)
        .single();

      if (collError || !collection) {
        throw new Error('Collection not found');
      }

      // Check if already purchased
      const { data: existing } = await supabase
        .from('collection_purchases')
        .select('id')
        .eq('collection_id', params.collectionId)
        .eq('buyer_id', params.buyerId)
        .single();

      if (existing) {
        throw new Error('Collection already purchased');
      }

      // Record the purchase
      const { error } = await supabase.from('collection_purchases').insert({
        collection_id: params.collectionId,
        buyer_id: params.buyerId,
        creator_id: collection.creator_id,
        amount: collection.price,
      });

      if (error) {
        throw error;
      }

      logger.info('💰 Collection purchased', {
        collectionId: params.collectionId,
        buyerId: params.buyerId,
        amount: collection.price,
      });

      // Update creator's monthly revenue
      await this.updateCreatorMonthlyRevenue(collection.creator_id);

      // TODO: Process payment through Stripe
      // TODO: Grant access to collection recipes
    } catch (error: unknown) {
      logger.error('❌ Failed to purchase collection', { error, params });
      throw error;
    }
  }

  // Get creator analytics
  async getCreatorAnalytics(creatorId: string): Promise<any> {
    try {
      // Get current month revenue
      const currentRevenue = await this.getCreatorRevenue(creatorId);

      // Get affiliate links performance
      const { data: affiliateLinks } = await supabase
        .from('creator_affiliate_links')
        .select('*')
        .eq('creator_id', creatorId);

      // Get referral stats
      const referrals = await this.getCreatorReferrals(creatorId);

      // Get recipe performance
      const { data: recipeStats } = await supabase
        .from('recipes')
        .select('id, title, views_count, saves_count, completion_rate')
        .eq('created_by', creatorId)
        .order('views_count', { ascending: false })
        .limit(10);

      // Get tips received
      const { data: recentTips } = await supabase
        .from('recipe_tips')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        revenue: currentRevenue,
        affiliateLinks: affiliateLinks || [],
        referrals: {
          total: referrals.length,
          active: referrals.filter((r) => r.subscription?.status === 'active').length,
          data: referrals,
        },
        recipes: recipeStats || [],
        recentTips: recentTips || [],
        lastUpdated: new Date(),
      };
    } catch (error: unknown) {
      logger.error('❌ Failed to get creator analytics', { error, creatorId });
      return null;
    }
  }

  // Request payout
  async requestPayout(params: {
    creatorId: string;
    amount: number;
    method: 'stripe' | 'paypal' | 'bank_transfer';
  }): Promise<any> {
    try {
      // Get available balance
      const revenue = await this.getCreatorRevenue(params.creatorId);
      if (!revenue || revenue.total_earnings < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Minimum payout amount
      if (params.amount < 10) {
        throw new Error('Minimum payout amount is $10');
      }

      // Create payout request
      const { data, error } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: params.creatorId,
          amount: params.amount,
          method: params.method,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('💸 Payout requested', {
        creatorId: params.creatorId,
        amount: params.amount,
        method: params.method,
      });

      // Process payout through Stripe Connect if method is stripe
      if (params.method === 'stripe' && data) {
        const success = await stripeConnectService.processCreatorPayout({
          creatorId: params.creatorId,
          amount: params.amount,
          payoutId: data.id,
          description: `CookCam creator payout - ${new Date().toLocaleDateString()}`,
        });

        if (!success) {
          // Payout processing failed, status already updated by stripeConnectService
          throw new Error('Failed to process payout through Stripe');
        }
      }

      // TODO: Process paypal/bank_transfer payouts
      // TODO: Send notification to creator

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to request payout', { error, params });
      throw error;
    }
  }

  // Get affiliate link by code
  async getAffiliateLinkByCode(linkCode: string): Promise<AffiliateLink | null> {
    try {
      const { data, error } = await supabase
        .from('creator_affiliate_links')
        .select('*')
        .eq('link_code', linkCode)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error: unknown) {
      logger.error('❌ Failed to get affiliate link', { error, linkCode });
      return null;
    }
  }

  // Deactivate affiliate conversions when subscription is canceled
  async deactivateAffiliateConversions(subscriberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('affiliate_conversions')
        .update({ is_active: false })
        .eq('subscriber_id', subscriberId);

      if (error) {
        throw error;
      }

      logger.info('🔄 Affiliate conversions deactivated', { subscriberId });
    } catch (error: unknown) {
      logger.error('❌ Failed to deactivate affiliate conversions', { error, subscriberId });
    }
  }
}

// Export singleton instance
export const creatorService = new CreatorService();
export default creatorService;

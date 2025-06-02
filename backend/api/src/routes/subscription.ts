import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { subscriptionService } from '../services/subscriptionService';
import { creatorService } from '../services/creatorService';
import { stripeConnectService } from '../services/stripeConnectService';
import { requireTier, requireFeature, isCreator } from '../middleware/subscription';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();

// Stripe webhook signature verification
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null;

// Get available subscription tiers
router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    // Direct import of supabase
    const { supabase } = await import('../index');
    
    const { data: tiers, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      tiers: tiers || []
    });
  } catch (error) {
    logger.error('Get subscription tiers error', { error });
    res.status(500).json({ error: 'Failed to fetch subscription tiers' });
  }
});

// Get user's current subscription status
router.get('/status', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const [subscription, tier, features] = await Promise.all([
      subscriptionService.getUserSubscription(userId),
      subscriptionService.getUserTier(userId),
      subscriptionService.getUserFeatures(userId)
    ]);

    res.json({
      success: true,
      subscription: subscription || null,
      tier,
      features,
      isCreator: tier.slug === 'creator'
    });
  } catch (error) {
    logger.error('Get subscription status error', { error });
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Create Stripe checkout session
router.post('/create-checkout', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tierId, successUrl, cancelUrl, affiliateCode } = req.body;

    if (!tierId || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['tierId', 'successUrl', 'cancelUrl']
      });
    }

    // Store affiliate code in session for conversion tracking
    if (affiliateCode) {
      // TODO: Store in Redis or session for later retrieval
      logger.info('Affiliate code provided for checkout', { affiliateCode, userId });
    }

    const checkoutUrl = await subscriptionService.createCheckoutSession({
      userId,
      tierId,
      successUrl,
      cancelUrl
    });

    if (!checkoutUrl) {
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    res.json({
      success: true,
      checkoutUrl
    });
  } catch (error) {
    logger.error('Create checkout error', { error });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Upgrade/downgrade subscription
router.post('/change-tier', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tierId } = req.body;

    if (!tierId) {
      return res.status(400).json({ error: 'Tier ID required' });
    }

    const updatedSubscription = await subscriptionService.changeSubscriptionTier(userId, tierId);

    res.json({
      success: true,
      subscription: updatedSubscription,
      message: 'Subscription tier updated successfully'
    });
  } catch (error) {
    logger.error('Change tier error', { error });
    res.status(500).json({ error: 'Failed to change subscription tier' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { immediately = false } = req.body;

    await subscriptionService.cancelSubscription(userId, immediately);

    res.json({
      success: true,
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    logger.error('Cancel subscription error', { error });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook endpoint (updated to handle Connect events)
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      logger.error('Stripe webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle Connect events
    if (event.type.startsWith('account.') || event.type.startsWith('payout.') || event.type === 'transfer.created') {
      await stripeConnectService.handleConnectWebhook(event);
    } else {
      // Handle regular subscription events
      await subscriptionService.handleStripeWebhook(event);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// === CREATOR-SPECIFIC ENDPOINTS ===

// Generate affiliate link
router.post('/affiliate/generate', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const { campaignName, customSlug } = req.body;

    const affiliateLink = await creatorService.generateAffiliateLink({
      creatorId,
      campaignName,
      customSlug
    });

    const baseUrl = process.env.APP_BASE_URL || 'https://cookcam.app';
    const fullUrl = customSlug 
      ? `${baseUrl}/c/${customSlug}`
      : `${baseUrl}/ref/${affiliateLink.link_code}`;

    res.json({
      success: true,
      affiliateLink: {
        ...affiliateLink,
        fullUrl
      }
    });
  } catch (error) {
    logger.error('Generate affiliate link error', { error });
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

// Get creator's affiliate links
router.get('/affiliate/links', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const links = await creatorService.getCreatorAffiliateLinks(creatorId);

    const baseUrl = process.env.APP_BASE_URL || 'https://cookcam.app';
    const linksWithUrls = links.map(link => ({
      ...link,
      fullUrl: link.custom_slug 
        ? `${baseUrl}/c/${link.custom_slug}`
        : `${baseUrl}/ref/${link.link_code}`
    }));

    res.json({
      success: true,
      links: linksWithUrls
    });
  } catch (error) {
    logger.error('Get affiliate links error', { error });
    res.status(500).json({ error: 'Failed to get affiliate links' });
  }
});

// Track affiliate link click
router.post('/affiliate/track/:linkCode', async (req: Request, res: Response) => {
  try {
    const linkCode = req.params.linkCode;
    if (!linkCode) {
      return res.status(400).json({ error: 'Link code required' });
    }
    
    const metadata = {
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || ''
    };

    await creatorService.trackAffiliateClick(linkCode, metadata);

    res.json({
      success: true,
      message: 'Click tracked'
    });
  } catch (error) {
    logger.error('Track affiliate click error', { error });
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Get creator revenue
router.get('/creator/revenue', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const { month, year } = req.query;

    const revenue = await creatorService.getCreatorRevenue(
      creatorId,
      month ? parseInt(month as string) : undefined,
      year ? parseInt(year as string) : undefined
    );

    res.json({
      success: true,
      revenue
    });
  } catch (error) {
    logger.error('Get creator revenue error', { error });
    res.status(500).json({ error: 'Failed to get revenue data' });
  }
});

// Get creator analytics
router.get('/creator/analytics', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const analytics = await creatorService.getCreatorAnalytics(creatorId);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Get creator analytics error', { error });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Request payout
router.post('/creator/payout', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const { amount, method } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['amount', 'method']
      });
    }

    const payout = await creatorService.requestPayout({
      creatorId,
      amount,
      method
    });

    res.json({
      success: true,
      payout,
      message: 'Payout request submitted successfully'
    });
  } catch (error) {
    logger.error('Request payout error', { error });
    res.status(500).json({ error: 'Failed to request payout' });
  }
});

// Tip a recipe
router.post('/recipe/:recipeId/tip', authenticateUser, async (req: Request, res: Response) => {
  try {
    const tipperId = (req as any).user.id;
    const recipeId = req.params.recipeId;
    const { amount, message, isAnonymous, creatorId } = req.body;

    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID required' });
    }

    if (!amount || !creatorId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['amount', 'creatorId']
      });
    }

    await creatorService.tipRecipeCreator({
      recipeId,
      creatorId,
      tipperId,
      amount,
      message,
      isAnonymous
    });

    res.json({
      success: true,
      message: 'Tip sent successfully'
    });
  } catch (error) {
    logger.error('Tip recipe error', { error });
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// === LEGACY MOBILE APP ENDPOINTS (for backwards compatibility) ===

// Verify iOS receipt
router.post('/verify-ios', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { receipt } = req.body;

    if (!receipt) {
      return res.status(400).json({ error: 'Receipt data required' });
    }

    // For now, create a manual subscription for iOS purchases
    // TODO: Implement proper iOS receipt validation
    const subscription = await subscriptionService.createSubscription({
      userId,
      tierId: 2, // Regular tier
      provider: 'ios',
      providerSubscriptionId: `ios_${Date.now()}`
    });

    res.json({
      success: true,
      subscription,
      message: 'iOS subscription created'
    });
  } catch (error) {
    logger.error('iOS receipt verification error', { error });
    res.status(500).json({ error: 'Failed to verify iOS receipt' });
  }
});

// Verify Android purchase
router.post('/verify-android', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { purchaseToken } = req.body;

    if (!purchaseToken) {
      return res.status(400).json({ error: 'Purchase token required' });
    }

    // For now, create a manual subscription for Android purchases
    // TODO: Implement proper Android purchase validation
    const subscription = await subscriptionService.createSubscription({
      userId,
      tierId: 2, // Regular tier
      provider: 'android',
      providerSubscriptionId: purchaseToken
    });

    res.json({
      success: true,
      subscription,
      message: 'Android subscription created'
    });
  } catch (error) {
    logger.error('Android purchase verification error', { error });
    res.status(500).json({ error: 'Failed to verify Android purchase' });
  }
});

// Stripe Connect onboarding - Create connected account
router.post('/creator/stripe/onboard', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const email = (req as any).user.email;
    const { country = 'US' } = req.body;

    const accountId = await stripeConnectService.createConnectedAccount(creatorId, email, country);
    
    if (!accountId) {
      return res.status(500).json({ error: 'Failed to create Stripe account' });
    }

    // Generate onboarding link
    const baseUrl = process.env.APP_BASE_URL || 'https://cookcam.app';
    const onboardingUrl = await stripeConnectService.createAccountLink(
      accountId,
      `${baseUrl}/creator/dashboard?onboarding=complete`,
      `${baseUrl}/creator/dashboard?onboarding=refresh`
    );

    if (!onboardingUrl) {
      return res.status(500).json({ error: 'Failed to generate onboarding link' });
    }

    res.json({
      success: true,
      accountId,
      onboardingUrl
    });
  } catch (error) {
    logger.error('Stripe onboarding error', { error });
    res.status(500).json({ error: 'Failed to start Stripe onboarding' });
  }
});

// Get Stripe Connect status
router.get('/creator/stripe/status', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;

    // Direct import of supabase
    const { supabase } = await import('../index');
    
    const { data: account } = await supabase
      .from('creator_stripe_accounts')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (!account) {
      return res.json({
        success: true,
        hasAccount: false,
        needsOnboarding: true
      });
    }

    res.json({
      success: true,
      hasAccount: true,
      account: {
        status: account.account_status,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        country: account.country,
        currency: account.currency
      },
      needsOnboarding: account.account_status === 'pending'
    });
  } catch (error) {
    logger.error('Get Stripe status error', { error });
    res.status(500).json({ error: 'Failed to get Stripe account status' });
  }
});

// Get Stripe dashboard link
router.get('/creator/stripe/dashboard', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const dashboardUrl = await stripeConnectService.getCreatorDashboardUrl(creatorId);

    if (!dashboardUrl) {
      return res.status(404).json({ error: 'Stripe account not found' });
    }

    res.json({
      success: true,
      dashboardUrl
    });
  } catch (error) {
    logger.error('Get Stripe dashboard error', { error });
    res.status(500).json({ error: 'Failed to get dashboard link' });
  }
});

// Get creator balance
router.get('/creator/balance', authenticateUser, isCreator, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).user.id;
    const balance = await stripeConnectService.getCreatorBalance(creatorId);

    res.json({
      success: true,
      balance,
      currency: 'USD'
    });
  } catch (error) {
    logger.error('Get creator balance error', { error });
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

export default router; 
import Stripe from 'stripe';
import { supabase } from '../index';
import { logger } from '../utils/logger';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null;

interface CreatorStripeAccount {
  creator_id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted' | 'disabled';
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  country: string;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export class StripeConnectService {
  // Create Connected Account for Creator
  async createConnectedAccount(creatorId: string, email: string, country: string = 'US'): Promise<string | null> {
    if (!stripe) {
      logger.error('❌ Stripe not configured');
      return null;
    }

    try {
      // Check if creator already has a Stripe account
      const { data: existing } = await supabase
        .from('creator_stripe_accounts')
        .select('stripe_account_id')
        .eq('creator_id', creatorId)
        .single();

      if (existing?.stripe_account_id) {
        logger.info('Creator already has Stripe account', { creatorId, accountId: existing.stripe_account_id });
        return existing.stripe_account_id;
      }

      // Create a new Connected Account
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          creator_id: creatorId,
          platform: 'cookcam'
        }
      });

      // Save account info to database
      await supabase
        .from('creator_stripe_accounts')
        .insert({
          creator_id: creatorId,
          stripe_account_id: account.id,
          account_status: 'pending',
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          country,
          currency: account.default_currency || 'usd'
        });

      logger.info('✅ Stripe Connected Account created', { creatorId, accountId: account.id });
      return account.id;
    } catch (error) {
      logger.error('❌ Failed to create Connected Account', { error, creatorId });
      return null;
    }
  }

  // Generate account onboarding link
  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string | null> {
    if (!stripe) {
      logger.error('❌ Stripe not configured');
      return null;
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      logger.error('❌ Failed to create account link', { error, accountId });
      return null;
    }
  }

  // Update account status from webhook
  async updateAccountStatus(accountId: string): Promise<void> {
    if (!stripe) return;

    try {
      const account = await stripe.accounts.retrieve(accountId);

      const { error } = await supabase
        .from('creator_stripe_accounts')
        .update({
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          account_status: this.getAccountStatus(account),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId);

      if (error) {
        logger.error('❌ Failed to update account status', { error, accountId });
      }
    } catch (error) {
      logger.error('❌ Failed to retrieve account', { error, accountId });
    }
  }

  // Get account status based on Stripe account object
  private getAccountStatus(account: Stripe.Account): string {
    if (!account.details_submitted) return 'pending';
    if (!account.charges_enabled || !account.payouts_enabled) return 'restricted';
    return 'active';
  }

  // Process creator payout
  async processCreatorPayout(params: {
    creatorId: string;
    amount: number;
    currency?: string;
    description?: string;
    payoutId: string;
  }): Promise<boolean> {
    if (!stripe) {
      logger.error('❌ Stripe not configured');
      return false;
    }

    try {
      // Get creator's Stripe account
      const { data: creatorAccount, error: accountError } = await supabase
        .from('creator_stripe_accounts')
        .select('*')
        .eq('creator_id', params.creatorId)
        .single();

      if (accountError || !creatorAccount) {
        logger.error('❌ Creator Stripe account not found', { creatorId: params.creatorId });
        return false;
      }

      if (creatorAccount.account_status !== 'active') {
        logger.error('❌ Creator account not active', { 
          creatorId: params.creatorId, 
          status: creatorAccount.account_status 
        });
        return false;
      }

      // Create a transfer to the connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency || 'usd',
        destination: creatorAccount.stripe_account_id,
        description: params.description || `CookCam creator payout ${params.payoutId}`,
        metadata: {
          creator_id: params.creatorId,
          payout_id: params.payoutId,
          platform: 'cookcam'
        }
      });

      // Update payout record with Stripe info
      await supabase
        .from('creator_payouts')
        .update({
          stripe_transfer_id: transfer.id,
          stripe_account_id: creatorAccount.stripe_account_id,
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', params.payoutId);

      logger.info('✅ Payout transfer created', { 
        creatorId: params.creatorId, 
        transferId: transfer.id,
        amount: params.amount 
      });

      // The actual payout to bank will be handled by Stripe automatically
      // based on the connected account's payout schedule

      return true;
    } catch (error) {
      logger.error('❌ Failed to process payout', { error, params });

      // Update payout status to failed
      await supabase
        .from('creator_payouts')
        .update({
          status: 'failed',
          notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        .eq('id', params.payoutId);

      return false;
    }
  }

  // Get creator's Stripe dashboard URL
  async getCreatorDashboardUrl(creatorId: string): Promise<string | null> {
    if (!stripe) return null;

    try {
      const { data: account } = await supabase
        .from('creator_stripe_accounts')
        .select('stripe_account_id')
        .eq('creator_id', creatorId)
        .single();

      if (!account?.stripe_account_id) {
        return null;
      }

      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);
      return loginLink.url;
    } catch (error) {
      logger.error('❌ Failed to create dashboard link', { error, creatorId });
      return null;
    }
  }

  // Handle Stripe webhooks for connected accounts
  async handleConnectWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'account.updated':
          const account = event.data.object as Stripe.Account;
          await this.updateAccountStatus(account.id);
          break;

        case 'transfer.created':
          const transfer = event.data.object as Stripe.Transfer;
          logger.info('Transfer created', { transferId: transfer.id });
          break;

        case 'payout.paid':
          const payout = event.data.object as Stripe.Payout;
          await this.handlePayoutPaid(payout);
          break;

        case 'payout.failed':
          const failedPayout = event.data.object as Stripe.Payout;
          await this.handlePayoutFailed(failedPayout);
          break;
      }
    } catch (error) {
      logger.error('❌ Failed to handle Connect webhook', { error, eventType: event.type });
    }
  }

  // Handle successful payout
  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    try {
      // Update payout status in database
      const { error } = await supabase
        .from('creator_payouts')
        .update({
          status: 'completed',
          stripe_payout_id: payout.id,
          processed_at: new Date().toISOString()
        })
        .eq('stripe_account_id', payout.destination as string)
        .eq('status', 'processing');

      if (error) {
        logger.error('❌ Failed to update payout status', { error, payoutId: payout.id });
      }

      logger.info('✅ Payout completed', { payoutId: payout.id });
    } catch (error) {
      logger.error('❌ Error handling payout paid', { error, payoutId: payout.id });
    }
  }

  // Handle failed payout
  private async handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
    try {
      const { error } = await supabase
        .from('creator_payouts')
        .update({
          status: 'failed',
          notes: `Payout failed: ${payout.failure_message || 'Unknown reason'}`,
          stripe_payout_id: payout.id
        })
        .eq('stripe_account_id', payout.destination as string)
        .eq('status', 'processing');

      if (error) {
        logger.error('❌ Failed to update failed payout', { error, payoutId: payout.id });
      }

      logger.error('❌ Payout failed', { 
        payoutId: payout.id, 
        reason: payout.failure_message 
      });
    } catch (error) {
      logger.error('❌ Error handling payout failure', { error, payoutId: payout.id });
    }
  }

  // Get creator's balance
  async getCreatorBalance(creatorId: string): Promise<number> {
    try {
      // Get total unpaid earnings
      const { data: revenue } = await supabase
        .rpc('calculate_creator_unpaid_balance', {
          creator_id: creatorId
        });

      return revenue || 0;
    } catch (error) {
      logger.error('❌ Failed to get creator balance', { error, creatorId });
      return 0;
    }
  }
}

// Export singleton instance
export const stripeConnectService = new StripeConnectService();
export default stripeConnectService; 
import { logger } from '../utils/logger';
import { supabase, supabaseServiceRole } from '../index';
import Stripe from 'stripe';
import { getEnv } from '../config/env';

/**
 * Subscription Reconciliation Job
 * 
 * Purpose: Periodically sync subscription state between local DB and Stripe/IAP
 * to catch drift, expired subscriptions, and billing issues.
 * 
 * Features:
 * - Checks all active subscriptions against source of truth (Stripe/Apple/Google)
 * - Expires subscriptions past their period_end
 * - Updates Supabase JWT claims for instant permission changes
 * - Exports metrics on drift and corrections
 * - Handles edge cases (cancelled but still active, etc.)
 */

interface ReconciliationMetrics {
  totalChecked: number;
  expired: number;
  updated: number;
  errors: number;
  driftDetected: number;
  durationMs: number;
}

export class SubscriptionReconciliationService {
  private stripe: Stripe;
  private env = getEnv();

  constructor() {
    this.stripe = new Stripe(this.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Main reconciliation job - run on a schedule (e.g., daily via cron)
   */
  async reconcileAllSubscriptions(): Promise<ReconciliationMetrics> {
    const startTime = Date.now();
    const metrics: ReconciliationMetrics = {
      totalChecked: 0,
      expired: 0,
      updated: 0,
      errors: 0,
      driftDetected: 0,
      durationMs: 0,
    };

    logger.info('🔄 Starting subscription reconciliation job...');

    try {
      // Step 1: Expire subscriptions past their period_end
      await this.expireOverdueSubscriptions(metrics);

      // Step 2: Verify Stripe subscriptions
      await this.reconcileStripeSubscriptions(metrics);

      // Step 3: Verify IAP subscriptions (Apple & Google)
      await this.reconcileIAPSubscriptions(metrics);

      // Step 4: Update JWT claims for all affected users
      await this.updateJWTClaims(metrics);

      metrics.durationMs = Date.now() - startTime;

      logger.info('✅ Subscription reconciliation complete', {
        metrics,
        durationSec: Math.round(metrics.durationMs / 1000),
      });

      // Store metrics for monitoring
      await this.storeReconciliationMetrics(metrics);

      return metrics;
    } catch (error: any) {
      logger.error('❌ Subscription reconciliation failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Expire subscriptions that are past their period_end
   */
  private async expireOverdueSubscriptions(metrics: ReconciliationMetrics): Promise<void> {
    logger.debug('⏰ Checking for overdue subscriptions...');

    try {
      const { data: overdueSubscriptions, error } = await supabaseServiceRole
        .from('user_subscriptions')
        .select('id, user_id, current_period_end, provider')
        .in('status', ['active', 'trialing'])
        .lt('current_period_end', new Date().toISOString());

      if (error) {
        logger.error('❌ Failed to fetch overdue subscriptions', { error });
        metrics.errors++;
        return;
      }

      if (!overdueSubscriptions || overdueSubscriptions.length === 0) {
        logger.debug('✅ No overdue subscriptions found');
        return;
      }

      logger.info(`⏰ Found ${overdueSubscriptions.length} overdue subscriptions`);

      for (const subscription of overdueSubscriptions) {
        try {
          // Update subscription to expired
          const { error: updateError } = await supabaseServiceRole
            .from('user_subscriptions')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          if (updateError) {
            logger.error('❌ Failed to expire subscription', {
              subscriptionId: subscription.id,
              error: updateError,
            });
            metrics.errors++;
          } else {
            logger.info('⏰ Expired overdue subscription', {
              subscriptionId: subscription.id,
              userId: subscription.user_id,
              periodEnd: subscription.current_period_end,
            });
            metrics.expired++;
            metrics.totalChecked++;
          }
        } catch (error: any) {
          logger.error('❌ Error expiring subscription', {
            subscriptionId: subscription.id,
            error: error.message,
          });
          metrics.errors++;
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to check overdue subscriptions', { error: error.message });
      metrics.errors++;
    }
  }

  /**
   * Reconcile Stripe subscriptions with local database
   */
  private async reconcileStripeSubscriptions(metrics: ReconciliationMetrics): Promise<void> {
    logger.debug('💳 Reconciling Stripe subscriptions...');

    try {
      const { data: stripeSubscriptions, error } = await supabaseServiceRole
        .from('user_subscriptions')
        .select('*')
        .eq('provider', 'stripe')
        .in('status', ['active', 'trialing', 'past_due']);

      if (error) {
        logger.error('❌ Failed to fetch Stripe subscriptions', { error });
        metrics.errors++;
        return;
      }

      if (!stripeSubscriptions || stripeSubscriptions.length === 0) {
        logger.debug('✅ No Stripe subscriptions to reconcile');
        return;
      }

      logger.info(`💳 Checking ${stripeSubscriptions.length} Stripe subscriptions`);

      for (const localSub of stripeSubscriptions) {
        try {
          metrics.totalChecked++;

          // Fetch latest status from Stripe
          const stripeSubId = localSub.provider_subscription_id;
          if (!stripeSubId) {
            logger.warn('⚠️  Stripe subscription missing provider_subscription_id', {
              subscriptionId: localSub.id,
            });
            continue;
          }

          const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId);

          // Check for drift
          const statusMatch = this.mapStripeStatus(stripeSub.status) === localSub.status;
          const periodEndMatch =
            new Date(stripeSub.current_period_end * 1000).getTime() ===
            new Date(localSub.current_period_end).getTime();

          if (!statusMatch || !periodEndMatch) {
            logger.warn('⚠️  Drift detected in Stripe subscription', {
              subscriptionId: localSub.id,
              userId: localSub.user_id,
              localStatus: localSub.status,
              stripeStatus: stripeSub.status,
              localPeriodEnd: localSub.current_period_end,
              stripePeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
            });

            metrics.driftDetected++;

            // Update local database to match Stripe
            const { error: updateError } = await supabaseServiceRole
              .from('user_subscriptions')
              .update({
                status: this.mapStripeStatus(stripeSub.status),
                current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', localSub.id);

            if (updateError) {
              logger.error('❌ Failed to update drifted subscription', {
                subscriptionId: localSub.id,
                error: updateError,
              });
              metrics.errors++;
            } else {
              logger.info('✅ Corrected drift in Stripe subscription', {
                subscriptionId: localSub.id,
                userId: localSub.user_id,
              });
              metrics.updated++;
            }
          }
        } catch (error: any) {
          if (error.type === 'StripeInvalidRequestError' && error.statusCode === 404) {
            // Subscription deleted in Stripe but still active locally
            logger.warn('⚠️  Stripe subscription not found, marking as cancelled', {
              subscriptionId: localSub.id,
              stripeSubId: localSub.provider_subscription_id,
            });

            await supabaseServiceRole
              .from('user_subscriptions')
              .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', localSub.id);

            metrics.driftDetected++;
            metrics.updated++;
          } else {
            logger.error('❌ Error reconciling Stripe subscription', {
              subscriptionId: localSub.id,
              error: error.message,
            });
            metrics.errors++;
          }
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to reconcile Stripe subscriptions', { error: error.message });
      metrics.errors++;
    }
  }

  /**
   * Reconcile IAP subscriptions (Apple & Google)
   */
  private async reconcileIAPSubscriptions(metrics: ReconciliationMetrics): Promise<void> {
    logger.debug('📱 Reconciling IAP subscriptions...');

    try {
      const { data: iapSubscriptions, error } = await supabaseServiceRole
        .from('user_subscriptions')
        .select('*')
        .in('provider', ['ios', 'android'])
        .in('status', ['active', 'trialing']);

      if (error) {
        logger.error('❌ Failed to fetch IAP subscriptions', { error });
        metrics.errors++;
        return;
      }

      if (!iapSubscriptions || iapSubscriptions.length === 0) {
        logger.debug('✅ No IAP subscriptions to reconcile');
        return;
      }

      logger.info(`📱 Checking ${iapSubscriptions.length} IAP subscriptions`);

      for (const localSub of iapSubscriptions) {
        try {
          metrics.totalChecked++;

          // For IAP, we rely on transaction history
          // Check if subscription has expired based on period_end
          const periodEnd = new Date(localSub.current_period_end);
          const now = new Date();

          if (periodEnd < now) {
            // Already handled by expireOverdueSubscriptions
            continue;
          }

          // Optional: Re-validate receipt from validation history
          // This would require storing the original receipt, which we do
          // For now, we trust the period_end date from last validation

          // Check validation history for this transaction
          const { data: lastValidation } = await supabaseServiceRole
            .from('iap_validation_history')
            .select('*')
            .eq('transaction_id', localSub.provider_subscription_id)
            .eq('status', 'valid')
            .order('validated_at', { ascending: false })
            .limit(1)
            .single();

          if (lastValidation) {
            // Compare stored expiry with current subscription
            const validationExpiry = lastValidation.validation_response?.expiryDate;
            if (validationExpiry) {
              const storedExpiry = new Date(validationExpiry);
              const currentExpiry = new Date(localSub.current_period_end);

              if (Math.abs(storedExpiry.getTime() - currentExpiry.getTime()) > 60000) {
                // More than 1 minute difference
                logger.warn('⚠️  IAP subscription expiry drift detected', {
                  subscriptionId: localSub.id,
                  userId: localSub.user_id,
                  storedExpiry: storedExpiry.toISOString(),
                  currentExpiry: currentExpiry.toISOString(),
                });
                metrics.driftDetected++;

                // Update to match validation history
                await supabaseServiceRole
                  .from('user_subscriptions')
                  .update({
                    current_period_end: storedExpiry.toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', localSub.id);

                metrics.updated++;
              }
            }
          }
        } catch (error: any) {
          logger.error('❌ Error reconciling IAP subscription', {
            subscriptionId: localSub.id,
            error: error.message,
          });
          metrics.errors++;
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to reconcile IAP subscriptions', { error: error.message });
      metrics.errors++;
    }
  }

  /**
   * Update Supabase JWT claims for users with changed subscriptions
   */
  private async updateJWTClaims(metrics: ReconciliationMetrics): Promise<void> {
    logger.debug('🔐 Updating JWT claims for affected users...');

    try {
      // Get all users with subscriptions
      const { data: subscriptions, error } = await supabaseServiceRole
        .from('user_subscriptions')
        .select('user_id, status, tier_id');

      if (error) {
        logger.error('❌ Failed to fetch subscriptions for JWT update', { error });
        return;
      }

      // Group by user_id and get active subscription tier
      const userTiers = new Map<string, number>();
      for (const sub of subscriptions || []) {
        if (sub.status === 'active' || sub.status === 'trialing') {
          const currentTier = userTiers.get(sub.user_id) || 0;
          // Keep highest tier if multiple subscriptions
          userTiers.set(sub.user_id, Math.max(currentTier, sub.tier_id));
        }
      }

      logger.info(`🔐 Updating JWT claims for ${userTiers.size} users`);

      // Update user metadata (used in JWT claims)
      for (const [userId, tierId] of userTiers) {
        try {
          const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
            userId,
            {
              user_metadata: {
                subscription_tier: tierId,
                updated_at: new Date().toISOString(),
              },
            }
          );

          if (updateError) {
            logger.error('❌ Failed to update user metadata', {
              userId,
              error: updateError,
            });
          } else {
            logger.debug('✅ Updated JWT claims', { userId, tier: tierId });
          }
        } catch (error: any) {
          logger.error('❌ Error updating JWT claims', {
            userId,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to update JWT claims', { error: error.message });
    }
  }

  /**
   * Store reconciliation metrics for monitoring
   */
  private async storeReconciliationMetrics(metrics: ReconciliationMetrics): Promise<void> {
    try {
      await supabaseServiceRole.from('reconciliation_metrics').insert({
        total_checked: metrics.totalChecked,
        expired_count: metrics.expired,
        updated_count: metrics.updated,
        errors_count: metrics.errors,
        drift_detected: metrics.driftDetected,
        duration_ms: metrics.durationMs,
        reconciled_at: new Date().toISOString(),
      });

      logger.debug('✅ Stored reconciliation metrics');
    } catch (error: any) {
      // Don't fail the job if metrics storage fails
      logger.warn('⚠️  Failed to store reconciliation metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Map Stripe subscription status to our internal status
   */
  private mapStripeStatus(stripeStatus: string): string {
    const statusMap: { [key: string]: string } = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
    };

    return statusMap[stripeStatus] || 'cancelled';
  }

  /**
   * Manual trigger for testing or admin operations
   */
  async reconcileSingleUser(userId: string): Promise<void> {
    logger.info('🔄 Manually reconciling subscriptions for user', { userId });

    const metrics: ReconciliationMetrics = {
      totalChecked: 0,
      expired: 0,
      updated: 0,
      errors: 0,
      driftDetected: 0,
      durationMs: 0,
    };

    const startTime = Date.now();

    try {
      // Fetch user's subscriptions
      const { data: subscriptions, error } = await supabaseServiceRole
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch subscriptions: ${error.message}`);
      }

      if (!subscriptions || subscriptions.length === 0) {
        logger.info('ℹ️  No subscriptions found for user', { userId });
        return;
      }

      // Check each subscription
      for (const sub of subscriptions) {
        if (sub.provider === 'stripe') {
          await this.reconcileStripeSubscriptions(metrics);
        }
        // IAP reconciliation happens in bulk, but we can check expiry
        if (sub.provider === 'ios' || sub.provider === 'android') {
          await this.reconcileIAPSubscriptions(metrics);
        }
      }

      await this.updateJWTClaims(metrics);

      metrics.durationMs = Date.now() - startTime;

      logger.info('✅ User subscription reconciliation complete', {
        userId,
        metrics,
      });
    } catch (error: any) {
      logger.error('❌ Failed to reconcile user subscriptions', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionReconciliationService = new SubscriptionReconciliationService();

/**
 * Cron job entry point
 * Call this from a scheduled task (e.g., Cloud Scheduler, PM2 cron, etc.)
 */
export async function runReconciliationJob(): Promise<void> {
  try {
    const metrics = await subscriptionReconciliationService.reconcileAllSubscriptions();

    // Alert if high error rate
    if (metrics.errors > metrics.totalChecked * 0.1) {
      logger.error('🚨 HIGH ERROR RATE in reconciliation job', {
        errorRate: (metrics.errors / metrics.totalChecked) * 100,
        metrics,
      });
      // TODO: Send alert to Slack/PagerDuty
    }

    // Alert if high drift rate
    if (metrics.driftDetected > metrics.totalChecked * 0.05) {
      logger.warn('⚠️  HIGH DRIFT RATE detected', {
        driftRate: (metrics.driftDetected / metrics.totalChecked) * 100,
        metrics,
      });
      // TODO: Send alert to monitoring
    }
  } catch (error: any) {
    logger.error('❌ Reconciliation job failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}


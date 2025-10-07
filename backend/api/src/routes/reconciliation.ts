import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { subscriptionReconciliationService, runReconciliationJob } from '../jobs/subscriptionReconciliation';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Manual trigger for reconciliation job
 * Requires authentication (admin only in production)
 */
router.post(
  '/run',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Add admin role check when role system is implemented
    // For now, log who triggered the job
    logger.info('🔄 Reconciliation job manually triggered', {
      triggeredBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Run job asynchronously (don't block the response)
    runReconciliationJob().catch((error) => {
      logger.error('❌ Manual reconciliation job failed', {
        error: error.message,
        triggeredBy: userId,
      });
    });

    res.json({
      success: true,
      message: 'Reconciliation job started',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * Reconcile subscriptions for a specific user
 * Useful for customer support and debugging
 */
router.post(
  '/user/:userId',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const targetUserId = req.params.userId;
    const requestingUserId = req.user!.id;

    // Users can only reconcile their own subscriptions (or admin)
    // TODO: Add admin check
    if (targetUserId !== requestingUserId) {
      throw new AppError('You can only reconcile your own subscriptions', 403, 'FORBIDDEN');
    }

    logger.info('🔄 User subscription reconciliation requested', {
      userId: targetUserId,
      requestedBy: requestingUserId,
    });

    await subscriptionReconciliationService.reconcileSingleUser(targetUserId);

    res.json({
      success: true,
      message: 'User subscriptions reconciled',
      userId: targetUserId,
    });
  })
);

/**
 * Get reconciliation metrics (for monitoring dashboard)
 */
router.get(
  '/metrics',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Restrict to admins only
    const { supabase } = await import('../index');

    const { data: recentMetrics, error } = await supabase
      .from('reconciliation_metrics')
      .select('*')
      .order('reconciled_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new AppError('Failed to fetch reconciliation metrics', 500, 'DATABASE_ERROR');
    }

    res.json({
      success: true,
      metrics: recentMetrics,
    });
  })
);

/**
 * Get reconciliation health summary
 */
router.get(
  '/health',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Restrict to admins only
    const { supabase } = await import('../index');

    const { data: healthData, error } = await supabase
      .from('reconciliation_health_view')
      .select('*')
      .limit(30); // Last 30 days

    if (error) {
      throw new AppError('Failed to fetch reconciliation health', 500, 'DATABASE_ERROR');
    }

    res.json({
      success: true,
      health: healthData,
    });
  })
);

/**
 * Get active alerts
 */
router.get(
  '/alerts',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Restrict to admins only
    const { supabase } = await import('../index');

    const { data: alerts, error } = await supabase
      .from('reconciliation_alerts_view')
      .select('*');

    if (error) {
      throw new AppError('Failed to fetch reconciliation alerts', 500, 'DATABASE_ERROR');
    }

    res.json({
      success: true,
      alerts: alerts || [],
      count: alerts?.length || 0,
    });
  })
);

export default router;


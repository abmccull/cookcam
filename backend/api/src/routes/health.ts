import { Router, Request, Response } from 'express';
import { monitoringService } from '../services/monitoring';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    // Set appropriate HTTP status based on health
    const httpStatus = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json(health);
  } catch (error: unknown) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Connection failed',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: { status: 'error', message: 'Connection failed' },
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  }
});

// Readiness check (for k8s)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    // Only ready if all critical services are up
    const isReady = health.services.database.status === 'up' &&
                   health.services.storage.status === 'up';
    
    if (isReady) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, services: health.services });
    }
  } catch (error: unknown) {
    logger.error('Ready check failed', { error });
    res.status(503).json({ ready: false, error: 'Health check failed' });
  }
});

// Liveness check (for k8s)
router.get('/live', (req: Request, res: Response) => {
  // Simple check that the service is running
  res.json({ alive: true });
});

// Performance metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error: unknown) {
    logger.error('Health check error', { error });
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database-specific health check
router.get('/db', async (req: Request, res: Response) => {
  try {
    const dbHealth = await monitoringService.checkDatabaseHealth();
    const status = dbHealth.status === 'up' ? 200 : 503;
    res.status(status).json(dbHealth);
  } catch (error: unknown) {
    logger.error('Database health check failed', { error });
    res.status(503).json({
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Cache health check
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const cacheHealth = await monitoringService.checkCacheHealth();
    const status = cacheHealth.status === 'up' ? 200 : 503;
    res.status(status).json(cacheHealth);
  } catch (error: unknown) {
    logger.error('Cache health check failed', { error });
    res.status(503).json({
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Security status
router.get('/security', async (req: Request, res: Response) => {
  try {
    const securityMetrics = await monitoringService.getSecurityMetrics();
    res.json(securityMetrics);
  } catch (error: unknown) {
    logger.error('Security metrics check failed', { error });
    res.status(500).json({
      error: 'Failed to get security metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 
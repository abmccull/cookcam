import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import authRoutes from './routes/auth';
import ingredientRoutes from './routes/ingredients';
import recipeRoutes from './routes/recipes';
import gamificationRoutes from './routes/gamification';
import scanRoutes from './routes/scan';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import { securityHeaders, rateLimiter, sanitizeInput } from './middleware/security';
import { logger } from './utils/logger';
import { errorHandler, requestIdMiddleware, notFoundHandler } from './middleware/errorHandler';
// import { authenticateUser, AuthenticatedRequest } from './middleware/auth'; // Uncomment when admin endpoint is enabled
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { securityMonitoring } from './services/security-monitoring';
import { initializeRealTimeService } from './services/realTimeService';
import { URL } from 'url';
import * as Sentry from '@sentry/node';
import { validateEnv, setEnv } from './config/env';

// Validate environment variables FIRST - fail fast if misconfigured
const env = validateEnv();
setEnv(env);

// Initialize Express app
const app = express();
const PORT = env.PORT;

// Initialize Sentry for error tracking (Phase 3.1: Enhanced Configuration)
if (env.SENTRY_DSN) {
  const sampleRate = env.NODE_ENV === 'production' ? 0.1 : env.NODE_ENV === 'staging' ? 0.5 : 1.0;
  
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: sampleRate,
    
    // Release tracking with git commit SHA
    release: process.env.GIT_COMMIT_SHA || `cookcam-api@${process.env.npm_package_version || '1.0.0'}`,
    
    // Custom error fingerprinting for better grouping
    beforeSend(event, hint) {
      // Scrub sensitive data from Sentry events
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        // Scrub sensitive query params and body
        if (event.request.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          ['password', 'token', 'secret', 'apiKey', 'receipt', 'purchaseToken', 'stripeToken'].forEach(key => {
            if (key in data) {
              data[key] = '[REDACTED]';
            }
          });
        }
      }

      // Add custom tags for better filtering
      event.tags = {
        ...event.tags,
        node_env: env.NODE_ENV,
      };

      // Custom fingerprinting for common errors
      const error = hint?.originalException;
      if (error instanceof Error) {
        // Group Stripe errors by type
        if (error.name?.includes('Stripe')) {
          event.fingerprint = ['stripe-error', error.name];
        }
        // Group database errors by code
        if ('code' in error && typeof (error as any).code === 'string') {
          event.fingerprint = ['database-error', (error as any).code];
        }
        // Group validation errors together
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          event.fingerprint = ['validation-error'];
        }
      }

      return event;
    },
    
    // Filter out noisy breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter out static file requests
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/static/')) {
        return null;
      }
      // Filter out health check spam
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/health')) {
        return null;
      }
      return breadcrumb;
    },
    
    // Performance monitoring integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
  });

  // Apply Sentry request handler EARLY (must be before routes)
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  
  logger.info('✅ Sentry initialized with enhanced configuration', {
    environment: env.NODE_ENV,
    sampleRate,
    release: process.env.GIT_COMMIT_SHA || 'dev',
  });
} else {
  logger.warn('⚠️  Sentry not configured - error tracking disabled');
}

// Create HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Initialize Supabase client (for regular operations)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// Initialize Supabase service role client (for user impersonation and admin operations)
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!serviceRoleKey) {
  logger.error('❌ CRITICAL: No Supabase service role key configured!');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is required');
}

export const supabaseServiceRole = createClient(
  env.SUPABASE_URL,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to create authenticated client for a specific user
export const createAuthenticatedClient = (userJwt: string) => {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
  logger.debug('Created authenticated Supabase client for user request');
  return client;
};

logger.info('✅ Supabase clients initialized', {
  url: env.SUPABASE_URL,
  hasAnonKey: true,
  hasServiceRoleKey: true,
  securityMode: 'user-context-aware',
});

// Initialize Real-time service
const realTimeService = initializeRealTimeService(httpServer);
export { realTimeService };

// Apply request ID middleware first
app.use(requestIdMiddleware);

// Apply security monitoring
app.use(securityMonitoring.ipReputationMiddleware());
app.use(securityMonitoring.detectSuspiciousPatterns());

// Apply security headers
app.use(securityHeaders);

// Apply rate limiting to all routes
app.use(rateLimiter());

// Middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Apply input sanitization
app.use(sanitizeInput);

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'CookCam API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// Security metrics endpoint (protected)
// TODO: Implement proper admin role system before enabling this endpoint
// app.get('/api/v1/security/metrics', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
//   // Only allow admins to access security metrics
//   if ((req as AuthenticatedRequest).user?.role !== 'admin') {
//     await securityMonitoring.logUnauthorizedAccess(req, 'security_metrics');
//     res.status(403).json({ error: 'Access denied' });
//     return;
//   }
//
//   const metrics = await securityMonitoring.getSecurityMetrics();
//   res.json(metrics);
// });

// Health check endpoint (liveness probe)
app.get('/health', (req, res): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
    websocket: {
      connected_users: realTimeService.getConnectionCount(),
      status: 'active',
    },
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ingredients', ingredientRoutes);
app.use('/api/v1/recipes', recipeRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/users', userRoutes);

// Subscription routes
import subscriptionRoutes from './routes/subscription';
app.use('/api/v1/subscription', subscriptionRoutes);

// IAP validation routes
import iapValidationRoutes from './routes/iap-validation';
app.use('/api/v1/iap', iapValidationRoutes);

// Reconciliation routes
import reconciliationRoutes from './routes/reconciliation';
app.use('/api/v1/reconciliation', reconciliationRoutes);

// Health check routes
import healthRoutes from './routes/health';
app.use('/api/v1/health', healthRoutes);
app.use('/health', healthRoutes);

// Backup routes
import backupRoutes from './routes/backup';
app.use('/api/v1/backup', backupRoutes);

// Apply subscription middleware after auth but before other routes
import { checkSubscriptionMiddleware } from './middleware/subscription';
app.use(checkSubscriptionMiddleware);

// Legacy routes (redirect to v1)
app.use('/api/auth', authRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// 404 handler - must be before error handler
app.use(notFoundHandler);

// Sentry error handler - must be before custom error handler
if (env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handling middleware - must be last
app.use(errorHandler);

// Graceful shutdown handler
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed - no longer accepting connections');

    // Close database connections, WebSockets, etc.
    Promise.all([
      // Add cleanup tasks here
      new Promise<void>((resolve) => {
        logger.info('Closing WebSocket connections...');
        realTimeService.shutdown?.();
        resolve();
      }),
    ])
      .then(() => {
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('❌ Error during graceful shutdown', { error });
        process.exit(1);
      });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server with HTTP server instead of Express app
httpServer.listen(PORT, () => {
  logger.info('🚀 CookCam API server started', {
    port: PORT,
    environment: env.NODE_ENV,
    websocket: 'enabled',
    version: '1.0.0',
  });

  // Start monitoring if in production
  if (env.NODE_ENV === 'production') {
    import('./services/monitoring').then(({ monitoringService }) => {
      monitoringService.startHealthChecks(60000); // Check every minute
      logger.info('📊 Monitoring service started');
    }).catch((error) => {
      logger.error('❌ Failed to start monitoring service', { error });
    });
  }
});

logger.info('🚀 CI/CD Pipeline Active');

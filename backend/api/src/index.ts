import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Initialize Supabase client (for regular operations)
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Initialize Supabase service role client (for user impersonation)
export const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to create authenticated client for a specific user
export const createAuthenticatedClient = (userJwt: string) => {
  // This client is now properly scoped to the user's request by passing their JWT
  // in the Authorization header for all subsequent requests.
  const client = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '', {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
  logger.info('Created authenticated Supabase client for a user request.');
  return client;
};

// Log which keys are being used (without exposing the actual keys)
logger.info('Supabase clients initialized', {
  hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
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
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
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

// Health check endpoint
app.get('/health', (req, res): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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

// Global error handling middleware - must be last
app.use(errorHandler);

// Start server with HTTP server instead of Express app
httpServer.listen(PORT, () => {
  logger.info('CookCam API server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    websocket: 'enabled',
  });

  // Start monitoring if in production
  if (process.env.NODE_ENV === 'production') {
    import('./services/monitoring').then(({ monitoringService }) => {
      monitoringService.startHealthChecks(60000); // Check every minute
      logger.info('Monitoring service started');
    });
  }
});

logger.info('🚀 CI/CD Pipeline Active');

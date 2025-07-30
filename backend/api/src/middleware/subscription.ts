import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { subscriptionService, FEATURES } from '../services/subscriptionService';

// Extend Request to include user subscription info
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        tier: string;
        features: string[];
      };
    }
  }
}

// Middleware to check user's subscription status
export async function checkSubscriptionMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    // Skip for unauthenticated requests
    if (!(req as any).user) {
      return next();
    }

    const userId = (req as any).user.id;

    // Get user's subscription tier
    const tier = await subscriptionService.getUserTier(userId);
    
    // Get user's available features
    const features = await subscriptionService.getUserFeatures(userId);

    // Attach to request for use in route handlers
    req.subscription = {
      tier: tier.slug,
      features
    };

    logger.debug('User subscription check', { 
      userId, 
      tier: tier.slug,
      featureCount: features.length 
    });

    next();
  } catch (error: unknown) {
    logger.error('Subscription middleware error', { error });
    // Don't block the request, just log the error
    next();
  }
}

// Middleware to require a specific subscription tier
export function requireTier(tierSlug: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req as any).user.id;
      const userTier = await subscriptionService.getUserTier(userId);

      // Check if user has required tier or higher
      const tierHierarchy = ['free', 'regular', 'creator'];
      const userTierIndex = tierHierarchy.indexOf(userTier.slug);
      const requiredTierIndex = tierHierarchy.indexOf(tierSlug);

      if (userTierIndex < requiredTierIndex) {
        res.status(403).json({ 
          error: 'Upgrade required',
          message: `This feature requires a ${tierSlug} subscription or higher`,
          currentTier: userTier.slug,
          requiredTier: tierSlug
        });
        return;
      }

      next();
    } catch (error: unknown) {
      logger.error('Tier check error', { error });
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
}

// Middleware to require a specific feature
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req as any).user.id;
      const hasAccess = await subscriptionService.hasFeatureAccess(userId, featureKey);

      if (!hasAccess) {
        res.status(403).json({ 
          error: 'Feature not available',
          message: 'Your subscription plan does not include this feature',
          feature: featureKey,
          upgradeUrl: '/subscription/upgrade'
        });
        return;
      }

      next();
    } catch (error: unknown) {
      logger.error('Feature check error', { error });
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
}

// Middleware to check rate limits based on subscription tier
export async function checkSubscriptionLimits(
  limitType: 'recipes' | 'scans' | 'collections'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userId = (req as any).user.id;
      const tier = await subscriptionService.getUserTier(userId);
      const features = tier.features as any;

      // Check limits based on tier features
      let limit: number;
      const currentUsage: number = 0;

      switch (limitType) {
        case 'recipes':
          limit = features.recipes_per_month || 5;
          if (limit === -1) {
            next();
            return;
          }
          
          // TODO: Get current month's recipe count
          // currentUsage = await getMonthlyRecipeCount(userId);
          break;

        case 'scans':
          limit = features.scan_limit || 10;
          if (limit === -1) {
            next();
            return;
          }
          
          // TODO: Get current month's scan count
          // currentUsage = await getMonthlyScanCount(userId);
          break;

        case 'collections':
          limit = features.collections_limit || 1;
          if (limit === -1) {
            next();
            return;
          }
          
          // TODO: Get total collections count
          // currentUsage = await getCollectionsCount(userId);
          break;
      }

      if (currentUsage >= limit) {
        res.status(403).json({
          error: 'Limit reached',
          message: `You have reached your ${limitType} limit for this month`,
          limit,
          usage: currentUsage,
          upgradeUrl: '/subscription/upgrade'
        });
        return;
      }

      next();
    } catch (error: unknown) {
      logger.error('Subscription limit check error', { error });
      res.status(500).json({ error: 'Failed to check subscription limits' });
    }
  };
}

// Helper to check if user is a creator
export async function isCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(req as any).user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req as any).user.id;
    const hasCreatorAccess = await subscriptionService.hasFeatureAccess(userId, FEATURES.CREATOR_DASHBOARD);

    if (!hasCreatorAccess) {
      res.status(403).json({
        error: 'Creator access required',
        message: 'Upgrade to Creator tier to access this feature',
        upgradeUrl: '/subscription/upgrade?tier=creator'
      });
      return;
    }

    next();
  } catch (error: unknown) {
    logger.error('Creator check error', { error });
    res.status(500).json({ error: 'Failed to verify creator status' });
  }
}

// Export all middleware functions
export default {
  checkSubscriptionMiddleware,
  requireTier,
  requireFeature,
  checkSubscriptionLimits,
  isCreator
}; 
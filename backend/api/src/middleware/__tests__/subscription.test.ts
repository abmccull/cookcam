import { Request, Response, NextFunction } from 'express';
import {
  checkSubscriptionMiddleware,
  requireTier,
  requireFeature,
  checkSubscriptionLimits,
  isCreator
} from '../subscription';
import { subscriptionService, FEATURES } from '../../services/subscriptionService';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../auth';
import { createMockRequest, createMockResponse, createMockNext, expectErrorResponse, expectSuccessResponse } from '../../test/helpers';

jest.mock('../../services/subscriptionService', () => ({
  subscriptionService: {
    getUserTier: jest.fn(),
    getUserFeatures: jest.fn(),
    hasFeatureAccess: jest.fn()
  },
  FEATURES: {
    CREATOR_DASHBOARD: 'creator_dashboard'
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('Subscription Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    jest.clearAllMocks();
  });

  describe('checkSubscriptionMiddleware', () => {
    it('should skip for unauthenticated requests', async () => {
      req.user = undefined;

      await checkSubscriptionMiddleware(req as Request, res as Response, next);

      expect(subscriptionService.getUserTier).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should attach subscription info for authenticated users', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockTier = { slug: 'regular', features: { recipes_per_month: 50 } };
      const mockFeatures = ['feature1', 'feature2'];

      req.user = mockUser;
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);
      (subscriptionService.getUserFeatures as jest.Mock).mockResolvedValue(mockFeatures);

      await checkSubscriptionMiddleware(req as Request, res as Response, next);

      expect(subscriptionService.getUserTier).toHaveBeenCalledWith('user123');
      expect(subscriptionService.getUserFeatures).toHaveBeenCalledWith('user123');
      expect(req.subscription).toEqual({
        tier: 'regular',
        features: mockFeatures
      });
      expect(logger.debug).toHaveBeenCalledWith('User subscription check', {
        userId: 'user123',
        tier: 'regular',
        featureCount: 2
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle errors gracefully', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockRejectedValue(new Error('Database error'));

      await checkSubscriptionMiddleware(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Subscription middleware error', { 
        error: expect.any(Error) 
      });
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireTier', () => {
    const middleware = requireTier('regular');

    it('should reject unauthenticated requests', async () => {
      req.user = undefined;

      await middleware(req as Request, res as Response, next);

      expectErrorResponse(res, 401, 'Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with required tier', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue({ slug: 'regular' });

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow users with higher tier', async () => {
      const regularMiddleware = requireTier('regular');
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue({ slug: 'creator' });

      await regularMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users with lower tier', async () => {
      const creatorMiddleware = requireTier('creator');
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue({ slug: 'regular' });

      await creatorMiddleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Upgrade required',
        message: 'This feature requires a creator subscription or higher',
        currentTier: 'regular',
        requiredTier: 'creator'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle free tier properly', async () => {
      const regularMiddleware = requireTier('regular');
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockResolvedValue({ slug: 'free' });

      await regularMiddleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Upgrade required',
        message: 'This feature requires a regular subscription or higher',
        currentTier: 'free',
        requiredTier: 'regular'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockRejectedValue(new Error('Database error'));

      await middleware(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Tier check error', { 
        error: expect.any(Error) 
      });
      expectErrorResponse(res, 500, 'Failed to verify subscription tier');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireFeature', () => {
    const middleware = requireFeature('advanced_analytics');

    it('should reject unauthenticated requests', async () => {
      req.user = undefined;

      await middleware(req as Request, res as Response, next);

      expectErrorResponse(res, 401, 'Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with feature access', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockResolvedValue(true);

      await middleware(req as Request, res as Response, next);

      expect(subscriptionService.hasFeatureAccess).toHaveBeenCalledWith('user123', 'advanced_analytics');
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users without feature access', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockResolvedValue(false);

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Feature not available',
        message: 'Your subscription plan does not include this feature',
        feature: 'advanced_analytics',
        upgradeUrl: '/subscription/upgrade'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockRejectedValue(new Error('Database error'));

      await middleware(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Feature check error', { 
        error: expect.any(Error) 
      });
      expectErrorResponse(res, 500, 'Failed to verify feature access');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkSubscriptionLimits', () => {
    describe('recipes limit', () => {
      it('should reject unauthenticated requests', async () => {
        const middleware = await checkSubscriptionLimits('recipes');
        req.user = undefined;

        await middleware(req as Request, res as Response, next);

        expectErrorResponse(res, 401, 'Authentication required');
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow unlimited recipes (-1 limit)', async () => {
        const middleware = await checkSubscriptionLimits('recipes');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'creator', 
          features: { recipes_per_month: -1 } 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow when under limit', async () => {
        const middleware = await checkSubscriptionLimits('recipes');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'regular', 
          features: { recipes_per_month: 50 } 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should handle missing limit gracefully', async () => {
        const middleware = await checkSubscriptionLimits('recipes');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'free', 
          features: {} 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('scans limit', () => {
      it('should allow unlimited scans (-1 limit)', async () => {
        const middleware = await checkSubscriptionLimits('scans');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'creator', 
          features: { scan_limit: -1 } 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should handle missing scan limit', async () => {
        const middleware = await checkSubscriptionLimits('scans');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'free', 
          features: {} 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('collections limit', () => {
      it('should allow unlimited collections (-1 limit)', async () => {
        const middleware = await checkSubscriptionLimits('collections');
        req.user = { id: 'user123', email: 'test@example.com' };
        const mockTier = { 
          slug: 'creator', 
          features: { collections_limit: -1 } 
        };
        (subscriptionService.getUserTier as jest.Mock).mockResolvedValue(mockTier);

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    it('should handle database errors', async () => {
      const middleware = await checkSubscriptionLimits('recipes');
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.getUserTier as jest.Mock).mockRejectedValue(new Error('Database error'));

      await middleware(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Subscription limit check error', { 
        error: expect.any(Error) 
      });
      expectErrorResponse(res, 500, 'Failed to check subscription limits');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isCreator', () => {
    it('should reject unauthenticated requests', async () => {
      req.user = undefined;

      await isCreator(req as Request, res as Response, next);

      expectErrorResponse(res, 401, 'Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow users with creator access', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockResolvedValue(true);

      await isCreator(req as Request, res as Response, next);

      expect(subscriptionService.hasFeatureAccess).toHaveBeenCalledWith('user123', FEATURES.CREATOR_DASHBOARD);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject users without creator access', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockResolvedValue(false);

      await isCreator(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Creator access required',
        message: 'Upgrade to Creator tier to access this feature',
        upgradeUrl: '/subscription/upgrade?tier=creator'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      req.user = { id: 'user123', email: 'test@example.com' };
      (subscriptionService.hasFeatureAccess as jest.Mock).mockRejectedValue(new Error('Database error'));

      await isCreator(req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith('Creator check error', { 
        error: expect.any(Error) 
      });
      expectErrorResponse(res, 500, 'Failed to verify creator status');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
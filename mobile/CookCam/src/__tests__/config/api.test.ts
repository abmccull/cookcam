// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  })),
}));

// Mock __DEV__ global
global.__DEV__ = true;

import API_CONFIG, {
  API_ENDPOINTS,
  API_ERROR_CODES,
  SUCCESS_CODES,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  LOG_API_REQUESTS,
  LOG_API_RESPONSES,
  LOG_API_ERRORS,
  IMAGE_UPLOAD_CONFIG,
  CACHE_CONFIG,
  FEATURE_FLAGS,
} from '../../config/api';

describe('API Configuration', () => {
  describe('API_CONFIG', () => {
    it('should have correct base URL from environment', () => {
      expect(API_CONFIG.baseURL).toBe('https://test-api.cookcam.com');
    });

    it('should have correct timeout settings', () => {
      expect(API_CONFIG.timeout).toBe(60000);
      expect(API_CONFIG.retryAttempts).toBe(3);
      expect(API_CONFIG.retryDelay).toBe(1000);
    });

    it('should have correct default headers', () => {
      expect(API_CONFIG.headers['Content-Type']).toBe('application/json');
      expect(API_CONFIG.headers.Accept).toBe('application/json');
    });
  });

  describe('API_ENDPOINTS', () => {
    describe('Authentication endpoints', () => {
      it('should have correct auth endpoints', () => {
        expect(API_ENDPOINTS.auth.login).toBe('/api/v1/auth/signin');
        expect(API_ENDPOINTS.auth.register).toBe('/api/v1/auth/signup');
        expect(API_ENDPOINTS.auth.logout).toBe('/api/v1/auth/signout');
        expect(API_ENDPOINTS.auth.refresh).toBe('/api/v1/auth/refresh');
        expect(API_ENDPOINTS.auth.me).toBe('/api/v1/auth/me');
        expect(API_ENDPOINTS.auth.profile).toBe('/api/v1/auth/profile');
        expect(API_ENDPOINTS.auth.deleteAccount).toBe('/api/v1/auth/account');
      });
    });

    describe('Scan endpoints', () => {
      it('should have correct scan endpoints', () => {
        expect(API_ENDPOINTS.scan.upload).toBe('/api/v1/scan/ingredients');
        expect(API_ENDPOINTS.scan.detect).toBe('/api/v1/scan/analyze');
        expect(API_ENDPOINTS.scan.history).toBe('/api/v1/scan/history');
      });

      it('should generate correct scan ID endpoints', () => {
        expect(API_ENDPOINTS.scan.get('scan123')).toBe('/api/v1/scan/scan123');
        expect(API_ENDPOINTS.scan.updateIngredients('scan456')).toBe(
          '/api/v1/scan/scan456/ingredients'
        );
      });
    });

    describe('Recipe endpoints', () => {
      it('should have correct recipe endpoints', () => {
        expect(API_ENDPOINTS.recipes.generate).toBe('/api/v1/recipes/generate');
        expect(API_ENDPOINTS.recipes.generateFull).toBe('/api/v1/recipes/generate-full');
        expect(API_ENDPOINTS.recipes.suggestions).toBe('/api/v1/recipes/suggestions');
        expect(API_ENDPOINTS.recipes.save).toBe('/api/v1/recipes/save');
        expect(API_ENDPOINTS.recipes.list).toBe('/api/v1/recipes');
      });

      it('should generate correct recipe ID endpoints', () => {
        const recipeId = 'recipe123';
        expect(API_ENDPOINTS.recipes.get(recipeId)).toBe(`/api/v1/recipes/${recipeId}`);
        expect(API_ENDPOINTS.recipes.delete(recipeId)).toBe(`/api/v1/recipes/${recipeId}`);
        expect(API_ENDPOINTS.recipes.favorite(recipeId)).toBe(
          `/api/v1/recipes/${recipeId}/favorite`
        );
        expect(API_ENDPOINTS.recipes.nutrition(recipeId)).toBe(
          `/api/v1/recipes/${recipeId}/nutrition`
        );
        expect(API_ENDPOINTS.recipes.saveNutrition(recipeId)).toBe(
          `/api/v1/recipes/${recipeId}/save-nutrition`
        );
        expect(API_ENDPOINTS.recipes.variations(recipeId)).toBe(
          `/api/v1/recipes/${recipeId}/variations`
        );
        expect(API_ENDPOINTS.recipes.tip(recipeId)).toBe(`/api/v1/recipe/${recipeId}/tip`);
      });
    });

    describe('Ingredient endpoints', () => {
      it('should have correct ingredient endpoints', () => {
        expect(API_ENDPOINTS.ingredients.search).toBe('/api/v1/ingredients/search');
        expect(API_ENDPOINTS.ingredients.usdaSearch).toBe('/api/v1/ingredients/usda/search');
        expect(API_ENDPOINTS.ingredients.list).toBe('/api/v1/ingredients');
        expect(API_ENDPOINTS.ingredients.categories).toBe('/api/v1/ingredients/categories');
      });

      it('should generate correct ingredient ID endpoints', () => {
        const ingredientId = 'ing123';
        expect(API_ENDPOINTS.ingredients.details(ingredientId)).toBe(
          `/api/v1/ingredients/${ingredientId}`
        );
        expect(API_ENDPOINTS.ingredients.syncUsda(ingredientId)).toBe(
          `/api/v1/ingredients/${ingredientId}/sync-usda`
        );
      });
    });

    describe('Gamification endpoints', () => {
      it('should have correct gamification endpoints', () => {
        expect(API_ENDPOINTS.gamification.xp).toBe('/api/v1/gamification/add-xp');
        expect(API_ENDPOINTS.gamification.profile).toBe('/api/v1/gamification/progress');
        expect(API_ENDPOINTS.gamification.leaderboard).toBe('/api/v1/gamification/leaderboard');
        expect(API_ENDPOINTS.gamification.checkStreak).toBe('/api/v1/gamification/check-streak');
        expect(API_ENDPOINTS.gamification.achievements).toBe('/api/v1/gamification/achievements');
      });
    });

    describe('Subscription endpoints', () => {
      it('should have correct subscription endpoints', () => {
        expect(API_ENDPOINTS.subscription.tiers).toBe('/api/v1/subscription/tiers');
        expect(API_ENDPOINTS.subscription.status).toBe('/api/v1/subscription/status');
        expect(API_ENDPOINTS.subscription.checkout).toBe('/api/v1/subscription/create-checkout');
        expect(API_ENDPOINTS.subscription.changeTier).toBe('/api/v1/subscription/change-tier');
        expect(API_ENDPOINTS.subscription.cancel).toBe('/api/v1/subscription/cancel');
        expect(API_ENDPOINTS.subscription.webhook).toBe('/api/v1/subscription/webhook/stripe');
      });

      it('should have creator subscription endpoints', () => {
        expect(API_ENDPOINTS.subscription.creator.revenue).toBe(
          '/api/v1/subscription/creator/revenue'
        );
        expect(API_ENDPOINTS.subscription.creator.payout).toBe(
          '/api/v1/subscription/creator/payout'
        );
        expect(API_ENDPOINTS.subscription.creator.analytics).toBe(
          '/api/v1/subscription/creator/analytics'
        );
      });

      it('should have affiliate endpoints', () => {
        expect(API_ENDPOINTS.subscription.affiliate.generate).toBe(
          '/api/v1/subscription/affiliate/generate'
        );
        expect(API_ENDPOINTS.subscription.affiliate.links).toBe(
          '/api/v1/subscription/affiliate/links'
        );
        expect(API_ENDPOINTS.subscription.affiliate.track('ABC123')).toBe(
          '/api/v1/subscription/affiliate/track/ABC123'
        );
      });

      it('should generate feature endpoint', () => {
        expect(API_ENDPOINTS.subscription.feature('premium-recipes')).toBe(
          '/api/v1/subscription/feature/premium-recipes'
        );
      });
    });

    describe('Analytics endpoints', () => {
      it('should have correct analytics endpoints', () => {
        expect(API_ENDPOINTS.analytics.track).toBe('/api/v1/analytics/track');
        expect(API_ENDPOINTS.analytics.dashboard).toBe('/api/v1/analytics/dashboard');
        expect(API_ENDPOINTS.analytics.global).toBe('/api/v1/analytics/global');
      });
    });

    describe('User endpoints', () => {
      it('should have correct user endpoints', () => {
        expect(API_ENDPOINTS.users.profile).toBe('/api/v1/users/profile');
        expect(API_ENDPOINTS.users.preferences).toBe('/api/v1/users/preferences');
        expect(API_ENDPOINTS.users.subscription).toBe('/api/v1/users/subscription');
        expect(API_ENDPOINTS.users.list).toBe('/api/v1/users');
      });

      it('should generate correct user ID endpoints', () => {
        const userId = 'user123';
        expect(API_ENDPOINTS.users.get(userId)).toBe(`/api/v1/users/${userId}`);
        expect(API_ENDPOINTS.users.follow(userId)).toBe(`/api/v1/users/${userId}/follow`);
        expect(API_ENDPOINTS.users.followers(userId)).toBe(`/api/v1/users/${userId}/followers`);
        expect(API_ENDPOINTS.users.following(userId)).toBe(`/api/v1/users/${userId}/following`);
      });
    });

    describe('Mystery Box endpoints', () => {
      it('should have correct mystery box endpoints', () => {
        expect(API_ENDPOINTS.mysteryBox.open).toBe('/api/v1/mysteryBox/open');
        expect(API_ENDPOINTS.mysteryBox.stats).toBe('/api/v1/mysteryBox/stats');
      });

      it('should generate history endpoint', () => {
        expect(API_ENDPOINTS.mysteryBox.history('user123')).toBe(
          '/api/v1/mysteryBox/history/user123'
        );
      });
    });

    describe('Debug endpoints', () => {
      it('should have correct debug endpoints', () => {
        expect(API_ENDPOINTS.debug.env).toBe('/api/v1/debug/env');
        expect(API_ENDPOINTS.debug.testOpenAI).toBe('/api/v1/debug/test-openai');
      });
    });

    describe('Health endpoint', () => {
      it('should have correct health endpoint', () => {
        expect(API_ENDPOINTS.health).toBe('/health');
      });
    });
  });

  describe('Error Codes', () => {
    it('should have correct HTTP error codes', () => {
      expect(API_ERROR_CODES.UNAUTHORIZED).toBe(401);
      expect(API_ERROR_CODES.FORBIDDEN).toBe(403);
      expect(API_ERROR_CODES.NOT_FOUND).toBe(404);
      expect(API_ERROR_CODES.VALIDATION_ERROR).toBe(400);
      expect(API_ERROR_CODES.SERVER_ERROR).toBe(500);
    });

    it('should have custom error codes', () => {
      expect(API_ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(API_ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    });
  });

  describe('Success Codes', () => {
    it('should include all success status codes', () => {
      expect(SUCCESS_CODES).toContain(200);
      expect(SUCCESS_CODES).toContain(201);
      expect(SUCCESS_CODES).toContain(202);
      expect(SUCCESS_CODES).toContain(204);
    });

    it('should have correct number of success codes', () => {
      expect(SUCCESS_CODES).toHaveLength(4);
    });
  });

  describe('Environment Settings', () => {
    it('should correctly identify development mode', () => {
      expect(IS_DEVELOPMENT).toBe(true);
      expect(IS_PRODUCTION).toBe(false);
    });

    it('should enable logging in development', () => {
      expect(LOG_API_REQUESTS).toBe(true);
      expect(LOG_API_RESPONSES).toBe(true);
      expect(LOG_API_ERRORS).toBe(true);
    });

    it('should toggle based on __DEV__', () => {
      const originalDev = global.__DEV__;
      
      // Test production mode
      global.__DEV__ = false;
      jest.resetModules();
      const prodConfig = require('../../config/api');
      
      expect(prodConfig.IS_DEVELOPMENT).toBe(false);
      expect(prodConfig.IS_PRODUCTION).toBe(true);
      expect(prodConfig.LOG_API_REQUESTS).toBe(false);
      expect(prodConfig.LOG_API_RESPONSES).toBe(false);
      
      // Restore
      global.__DEV__ = originalDev;
    });
  });

  describe('Image Upload Config', () => {
    it('should have correct file size limit', () => {
      expect(IMAGE_UPLOAD_CONFIG.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have correct allowed types', () => {
      expect(IMAGE_UPLOAD_CONFIG.allowedTypes).toContain('image/jpeg');
      expect(IMAGE_UPLOAD_CONFIG.allowedTypes).toContain('image/png');
      expect(IMAGE_UPLOAD_CONFIG.allowedTypes).toContain('image/webp');
    });

    it('should have correct image quality settings', () => {
      expect(IMAGE_UPLOAD_CONFIG.quality).toBe(0.8);
      expect(IMAGE_UPLOAD_CONFIG.maxWidth).toBe(1920);
      expect(IMAGE_UPLOAD_CONFIG.maxHeight).toBe(1080);
    });
  });

  describe('Cache Config', () => {
    it('should have correct cache durations', () => {
      expect(CACHE_CONFIG.shortTerm).toBe(5 * 60 * 1000); // 5 minutes
      expect(CACHE_CONFIG.mediumTerm).toBe(30 * 60 * 1000); // 30 minutes
      expect(CACHE_CONFIG.longTerm).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it('should have correct cache keys', () => {
      expect(CACHE_CONFIG.keys.user).toBe('user_profile');
      expect(CACHE_CONFIG.keys.ingredients).toBe('ingredients_list');
      expect(CACHE_CONFIG.keys.recipes).toBe('user_recipes');
      expect(CACHE_CONFIG.keys.achievements).toBe('user_achievements');
    });
  });

  describe('Feature Flags', () => {
    it('should have default feature flags', () => {
      expect(FEATURE_FLAGS.enablePushNotifications).toBe(true);
      expect(FEATURE_FLAGS.enableSocialFeatures).toBe(false);
      expect(FEATURE_FLAGS.enableOfflineMode).toBe(false);
      expect(FEATURE_FLAGS.enableAdvancedAnalytics).toBe(true);
    });

    it('should enable beta features in development', () => {
      expect(FEATURE_FLAGS.enableBetaFeatures).toBe(true);
    });
  });

  describe('Default Export', () => {
    it('should export API_CONFIG as default', () => {
      expect(API_CONFIG).toBeDefined();
      expect(API_CONFIG.baseURL).toBeDefined();
      expect(API_CONFIG.timeout).toBeDefined();
      expect(API_CONFIG.headers).toBeDefined();
    });
  });
});
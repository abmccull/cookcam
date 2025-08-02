// Mock expo-constants before other imports
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        API_BASE_URL: 'http://localhost:3000',
      }
    }
  }
}));

import { server } from '../../test/server';
import { http, HttpResponse } from 'msw';
import { cookCamApi } from '../cookCamApi';
import { apiService } from '../apiService';

// Mock apiService
jest.mock('../apiService');

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('CookCamApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock returns
    mockedApiService.post.mockResolvedValue({ success: true, data: {} });
    mockedApiService.get.mockResolvedValue({ success: true, data: {} });
    mockedApiService.put.mockResolvedValue({ success: true, data: {} });
    mockedApiService.delete.mockResolvedValue({ success: true, data: {} });
  });

  describe('Authentication Methods', () => {
    describe('login', () => {
      it('should login successfully and store token', async () => {
        const authResponse = {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        };

        mockedApiService.post.mockResolvedValue({
          success: true,
          data: authResponse
        });

        const result = await cookCamApi.login('test@example.com', 'password');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(authResponse);
        expect(mockedApiService.setAuthToken).toHaveBeenCalledWith('test-token');
        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/auth/login',
          { email: 'test@example.com', password: 'password' }
        );
      });

      it('should handle login failure', async () => {
        mockedApiService.post.mockResolvedValue({
          success: false,
          error: 'Invalid credentials'
        });

        const result = await cookCamApi.login('test@example.com', 'wrong');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials');
        expect(mockedApiService.setAuthToken).not.toHaveBeenCalled();
      });
    });

    describe('register', () => {
      it('should register successfully and store token', async () => {
        const authResponse = {
          user: { id: '1', email: 'new@example.com', name: 'New User' },
          access_token: 'new-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        };

        mockedApiService.post.mockResolvedValue({
          success: true,
          data: authResponse
        });

        const result = await cookCamApi.register({
          email: 'new@example.com',
          password: 'password',
          name: 'New User'
        });

        expect(result.success).toBe(true);
        expect(mockedApiService.setAuthToken).toHaveBeenCalledWith('new-token');
      });
    });

    describe('logout', () => {
      it('should logout and clear tokens', async () => {
        await cookCamApi.logout();

        expect(mockedApiService.post).toHaveBeenCalledWith('/auth/logout');
        expect(mockedApiService.removeAuthToken).toHaveBeenCalled();
      });

      it('should clear tokens even if logout API fails', async () => {
        mockedApiService.post.mockResolvedValue({
          success: false,
          error: 'Server error'
        });

        await cookCamApi.logout();

        expect(mockedApiService.removeAuthToken).toHaveBeenCalled();
      });
    });

    describe('getCurrentUser', () => {
      it('should fetch current user', async () => {
        const userData = {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          is_creator: false,
          onboarding_completed: true
        };

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: userData
        });

        const result = await cookCamApi.getCurrentUser();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(userData);
        expect(mockedApiService.get).toHaveBeenCalledWith('/auth/me');
      });
    });

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        const updates = { name: 'Updated Name' };
        
        await cookCamApi.updateProfile(updates);

        expect(mockedApiService.put).toHaveBeenCalledWith('/auth/profile', updates);
      });
    });
  });

  describe('Ingredient Scanning Methods', () => {
    describe('scanIngredients', () => {
      it('should scan ingredients from image', async () => {
        const scanResponse = {
          scan_id: 'scan-123',
          ingredients: [
            { name: 'tomato', variety: 'Roma', quantity: '2', unit: 'pieces' }
          ],
          confidence_score: 0.95,
          xp_awarded: 10
        };

        mockedApiService.post.mockResolvedValue({
          success: true,
          data: scanResponse
        });

        const result = await cookCamApi.scanIngredients('base64ImageData');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(scanResponse);
        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/scan/detect',
          { image_data: 'base64ImageData' }
        );
      });

      it('should handle scan errors', async () => {
        mockedApiService.post.mockResolvedValue({
          success: false,
          error: 'Image processing failed'
        });

        const result = await cookCamApi.scanIngredients('invalidImage');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Image processing failed');
      });
    });

    describe('getScanHistory', () => {
      it('should fetch scan history with pagination', async () => {
        const scanHistory = [
          { id: '1', created_at: '2024-01-01', detected_ingredients: [] },
          { id: '2', created_at: '2024-01-02', detected_ingredients: [] }
        ];

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: scanHistory
        });

        const result = await cookCamApi.getScanHistory(10, 5);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(scanHistory);
        expect(mockedApiService.get).toHaveBeenCalledWith('/scan/history?limit=10&offset=5');
      });

      it('should use default pagination', async () => {
        await cookCamApi.getScanHistory();

        expect(mockedApiService.get).toHaveBeenCalledWith('/scan/history?limit=20&offset=0');
      });
    });
  });

  describe('Recipe Methods', () => {
    describe('generateRecipe', () => {
      it('should generate recipe from ingredients', async () => {
        const recipeData = {
          id: 'recipe-1',
          title: 'Tomato Salad',
          ingredients: ['tomato', 'lettuce'],
          instructions: ['Step 1', 'Step 2']
        };

        mockedApiService.post.mockResolvedValue({
          success: true,
          data: recipeData
        });

        const result = await cookCamApi.generateRecipe(
          ['tomato', 'lettuce'],
          { cuisine: 'Italian', difficulty: 'easy' }
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(recipeData);
        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/recipes/generate',
          {
            ingredients: ['tomato', 'lettuce'],
            preferences: { cuisine: 'Italian', difficulty: 'easy' }
          }
        );
      });
    });

    describe('saveRecipe', () => {
      it('should save a recipe', async () => {
        const recipe = { title: 'My Recipe', ingredients: ['item1'] };
        
        await cookCamApi.saveRecipe(recipe);

        expect(mockedApiService.post).toHaveBeenCalledWith('/recipes/save', recipe);
      });
    });

    describe('getUserRecipes', () => {
      it('should fetch user recipes with pagination', async () => {
        await cookCamApi.getUserRecipes(15, 10);

        expect(mockedApiService.get).toHaveBeenCalledWith('/recipes/list?limit=15&offset=10');
      });
    });

    describe('toggleFavoriteRecipe', () => {
      it('should toggle recipe favorite status', async () => {
        mockedApiService.post.mockResolvedValue({
          success: true,
          data: { favorited: true, recipeId: 'recipe-1' }
        });

        const result = await cookCamApi.toggleFavoriteRecipe('recipe-1');

        expect(result.success).toBe(true);
        expect(result.data.favorited).toBe(true);
        expect(mockedApiService.post).toHaveBeenCalledWith('/recipes/recipe-1/favorite');
      });
    });

    describe('getRecipeNutrition', () => {
      it('should fetch recipe nutrition info', async () => {
        const nutritionData = {
          calories: 350,
          protein: 12,
          carbs: 45,
          fat: 15
        };

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: nutritionData
        });

        const result = await cookCamApi.getRecipeNutrition('recipe-1');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(nutritionData);
        expect(mockedApiService.get).toHaveBeenCalledWith('/recipes/recipe-1/nutrition');
      });
    });
  });

  describe('Gamification Methods', () => {
    describe('addXP', () => {
      it('should add XP for an action', async () => {
        await cookCamApi.addXP(50, 'recipe_created', { recipeId: '123' });

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/gamification/xp',
          {
            xp_amount: 50,
            action: 'recipe_created',
            metadata: { recipeId: '123' }
          }
        );
      });
    });

    describe('getGamificationProfile', () => {
      it('should fetch gamification profile', async () => {
        const profile = {
          user_id: '1',
          total_xp: 1250,
          level: 5,
          current_level_xp: 250,
          next_level_xp: 500,
          achievements_earned: 10,
          recipes_created: 25,
          scans_completed: 50,
          streak_days: 7
        };

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: profile
        });

        const result = await cookCamApi.getGamificationProfile();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(profile);
        expect(mockedApiService.get).toHaveBeenCalledWith('/gamification/profile');
      });
    });

    describe('getLeaderboard', () => {
      it('should fetch leaderboard with parameters', async () => {
        await cookCamApi.getLeaderboard(25, 'monthly', 'friends');

        expect(mockedApiService.get).toHaveBeenCalledWith(
          '/gamification/leaderboard?limit=25&period=monthly&type=friends'
        );
      });

      it('should use default leaderboard parameters', async () => {
        await cookCamApi.getLeaderboard();

        expect(mockedApiService.get).toHaveBeenCalledWith(
          '/gamification/leaderboard?limit=50&period=weekly&type=global'
        );
      });
    });

    describe('getAchievements', () => {
      it('should fetch user achievements', async () => {
        const achievements = [
          { id: '1', name: 'First Scan', earned: true },
          { id: '2', name: 'Recipe Master', earned: false }
        ];

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: achievements
        });

        const result = await cookCamApi.getAchievements();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(achievements);
      });
    });
  });

  describe('Subscription Methods', () => {
    describe('getSubscriptionTiers', () => {
      it('should fetch subscription tiers', async () => {
        await cookCamApi.getSubscriptionTiers();
        expect(mockedApiService.get).toHaveBeenCalledWith('/subscription/tiers');
      });
    });

    describe('validateSubscriptionPurchase', () => {
      it('should validate iOS purchase', async () => {
        const validationData = {
          platform: 'ios' as const,
          receipt: 'ios-receipt',
          transactionId: 'trans-123',
          productId: 'com.cookcam.premium'
        };

        await cookCamApi.validateSubscriptionPurchase(validationData);

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/subscription/validate-purchase',
          validationData
        );
      });

      it('should validate Android purchase', async () => {
        const validationData = {
          platform: 'android' as const,
          purchaseToken: 'android-token',
          productId: 'premium_monthly'
        };

        await cookCamApi.validateSubscriptionPurchase(validationData);

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/subscription/validate-purchase',
          validationData
        );
      });
    });

    describe('upgradeToCreator', () => {
      it('should upgrade user to creator tier', async () => {
        const upgradeData = {
          subscriptionData: {
            productId: 'creator_tier',
            transactionId: 'trans-456',
            tier: 'creator' as const
          }
        };

        await cookCamApi.upgradeToCreator(upgradeData);

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/subscription/upgrade-to-creator',
          upgradeData
        );
      });
    });
  });

  describe('Creator Methods', () => {
    describe('getCreatorRevenue', () => {
      it('should fetch creator revenue data', async () => {
        const revenueData = {
          total_earnings: 1500,
          monthly_earnings: 250,
          affiliate_earnings: 100,
          tips_earnings: 50,
          collections_earnings: 100,
          unpaid_balance: 200,
          active_referrals: 5
        };

        mockedApiService.get.mockResolvedValue({
          success: true,
          data: revenueData
        });

        const result = await cookCamApi.getCreatorRevenue();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(revenueData);
        expect(mockedApiService.get).toHaveBeenCalledWith('/subscription/creator/revenue');
      });
    });

    describe('generateAffiliateLink', () => {
      it('should generate affiliate link', async () => {
        await cookCamApi.generateAffiliateLink('summer_promo', 'summer2024');

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/subscription/affiliate/generate',
          {
            campaign_name: 'summer_promo',
            custom_slug: 'summer2024'
          }
        );
      });
    });

    describe('requestPayout', () => {
      it('should request payout', async () => {
        await cookCamApi.requestPayout(500, 'paypal');

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/subscription/creator/payout',
          {
            amount: 500,
            method: 'paypal'
          }
        );
      });
    });

    describe('tipCreator', () => {
      it('should send tip to creator', async () => {
        await cookCamApi.tipCreator('recipe-1', 5, 'Great recipe!');

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/recipes/recipe-1/tip',
          {
            amount: 5,
            message: 'Great recipe!'
          }
        );
      });
    });
  });

  describe('Analytics Methods', () => {
    describe('trackEvent', () => {
      it('should track analytics event', async () => {
        await cookCamApi.trackEvent('recipe_viewed', { recipeId: '123' });

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/analytics/track',
          {
            event_type: 'recipe_viewed',
            event_data: { recipeId: '123' },
            metadata: {
              timestamp: expect.any(String),
              platform: 'mobile'
            }
          }
        );
      });

      it('should track event without properties', async () => {
        await cookCamApi.trackEvent('app_opened');

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/analytics/track',
          {
            event_type: 'app_opened',
            event_data: {},
            metadata: {
              timestamp: expect.any(String),
              platform: 'mobile'
            }
          }
        );
      });
    });

    describe('getAnalyticsDashboard', () => {
      it('should fetch analytics dashboard', async () => {
        await cookCamApi.getAnalyticsDashboard('month');

        expect(mockedApiService.get).toHaveBeenCalledWith(
          '/analytics/dashboard?period=month'
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('healthCheck', () => {
      it('should perform health check', async () => {
        mockedApiService.healthCheck.mockResolvedValue(true);

        const result = await cookCamApi.healthCheck();

        expect(result).toBe(true);
        expect(mockedApiService.healthCheck).toHaveBeenCalled();
      });
    });

    describe('testConnection', () => {
      it('should test connection successfully', async () => {
        mockedApiService.healthCheck.mockResolvedValue(true);

        const result = await cookCamApi.testConnection();

        expect(result.connected).toBe(true);
        expect(result.latency).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should handle connection failure', async () => {
        mockedApiService.healthCheck.mockResolvedValue(false);

        const result = await cookCamApi.testConnection();

        expect(result.connected).toBe(false);
        expect(result.error).toBe('Health check failed');
      });

      it('should handle connection error', async () => {
        mockedApiService.healthCheck.mockRejectedValue(new Error('Network error'));

        const result = await cookCamApi.testConnection();

        expect(result.connected).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });
  });

  describe('Ingredient Methods', () => {
    describe('searchIngredients', () => {
      it('should search ingredients', async () => {
        await cookCamApi.searchIngredients('tomato', 15);

        expect(mockedApiService.get).toHaveBeenCalledWith(
          '/ingredients/search?q=tomato&limit=15'
        );
      });

      it('should encode special characters in search', async () => {
        await cookCamApi.searchIngredients('bell pepper', 20);

        expect(mockedApiService.get).toHaveBeenCalledWith(
          '/ingredients/search?q=bell%20pepper&limit=20'
        );
      });
    });

    describe('getIngredientCategories', () => {
      it('should fetch ingredient categories', async () => {
        await cookCamApi.getIngredientCategories();

        expect(mockedApiService.get).toHaveBeenCalledWith('/ingredients/categories');
      });
    });

    describe('getIngredientDetails', () => {
      it('should fetch ingredient details', async () => {
        await cookCamApi.getIngredientDetails('ingredient-123');

        expect(mockedApiService.get).toHaveBeenCalledWith('/ingredients/ingredient-123/details');
      });
    });
  });

  describe('Referral Methods', () => {
    describe('linkUserToReferral', () => {
      it('should link user to referral code', async () => {
        await cookCamApi.linkUserToReferral('user-123', 'REF123');

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/api/v1/auth/link-referral',
          { referralCode: 'REF123' }
        );
      });
    });
  });

  describe('Two-Stage Recipe Generation', () => {
    describe('generatePreviews', () => {
      it('should generate recipe previews', async () => {
        const previewData = {
          detectedIngredients: ['tomato', 'cheese'],
          userPreferences: { cuisine: 'Italian' },
          sessionId: 'session-123'
        };

        await cookCamApi.generatePreviews(previewData);

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/api/v1/recipes/generate-previews',
          previewData
        );
      });
    });

    describe('generateDetailedRecipe', () => {
      it('should generate detailed recipe from preview', async () => {
        const detailData = {
          selectedPreview: { id: 'preview-1', title: 'Pizza' },
          sessionId: 'session-123'
        };

        await cookCamApi.generateDetailedRecipe(detailData);

        expect(mockedApiService.post).toHaveBeenCalledWith(
          '/api/v1/recipes/generate-detailed',
          detailData
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null responses gracefully', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await cookCamApi.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle undefined data', async () => {
      mockedApiService.post.mockResolvedValue({
        success: true,
        data: undefined
      });

      const result = await cookCamApi.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(mockedApiService.setAuthToken).not.toHaveBeenCalled();
    });
  });
});
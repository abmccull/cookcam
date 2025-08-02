// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import { cookCamApi } from '../../services/cookCamApi';
import tokenManager from '../../services/tokenManager';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/tokenManager');
jest.mock('../../utils/logger');
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: {
      signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('cookCamApi', () => {
  const mockFetch = global.fetch as jest.Mock;
  const mockGetToken = tokenManager.getAccessToken as jest.Mock;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue('test-token');
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });
  });

  describe('Authentication', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '123', email: 'test@example.com' },
          tokens: { access: 'access-token', refresh: 'refresh-token' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await cookCamApi.login('test@example.com', 'password');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      const result = await cookCamApi.login('test@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should logout user successfully', async () => {
      const result = await cookCamApi.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Recipe Operations', () => {
    it('should fetch recipes successfully', async () => {
      const mockRecipes = [
        { id: '1', title: 'Recipe 1' },
        { id: '2', title: 'Recipe 2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecipes }),
      });

      const result = await cookCamApi.getRecipes(10, 0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes?limit=10&offset=0'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.data).toEqual(mockRecipes);
    });

    it('should fetch recipe by ID', async () => {
      const mockRecipe = { id: '1', title: 'Recipe 1', ingredients: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecipe }),
      });

      const result = await cookCamApi.getRecipeById('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/1'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockRecipe);
    });

    it('should create a new recipe', async () => {
      const newRecipe = {
        title: 'New Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
      };

      const result = await cookCamApi.createRecipe(newRecipe);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newRecipe),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should update an existing recipe', async () => {
      const updates = { title: 'Updated Recipe' };

      const result = await cookCamApi.updateRecipe('1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should delete a recipe', async () => {
      const result = await cookCamApi.deleteRecipe('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Gamification', () => {
    it('should fetch user stats', async () => {
      const mockStats = {
        level: 5,
        xp: 1200,
        streak: 7,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats }),
      });

      const result = await cookCamApi.getUserStats('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/gamification/users/user-123/stats'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockStats);
    });

    it('should award XP to user', async () => {
      const result = await cookCamApi.awardXP('user-123', 100, 'recipe_completion');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/gamification/users/user-123/xp'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: 100, reason: 'recipe_completion' }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should fetch leaderboard', async () => {
      const mockLeaderboard = {
        leaderboard: [
          { rank: 1, user_id: 'user-1', xp: 5000 },
          { rank: 2, user_id: 'user-2', xp: 4500 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockLeaderboard }),
      });

      const result = await cookCamApi.getLeaderboard(10, 'weekly', 'global');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/gamification/leaderboard'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockLeaderboard);
    });

    it('should fetch user achievements', async () => {
      const mockAchievements = [
        { id: '1', name: 'First Recipe', unlocked: true },
        { id: '2', name: 'Week Streak', unlocked: false },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAchievements }),
      });

      const result = await cookCamApi.getUserAchievements('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/gamification/users/user-123/achievements'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockAchievements);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await cookCamApi.getRecipes(10, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle 401 unauthorized and refresh token', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      // Token refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { access: 'new-token', refresh: 'new-refresh' },
        }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const result = await cookCamApi.getRecipes(10, 0);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Original, refresh, retry
      expect(result.success).toBe(true);
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const result = await cookCamApi.getRecipes(10, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API request failed'),
        expect.any(Object)
      );
    });

    it('should handle timeout errors', async () => {
      jest.useFakeTimers();
      
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const promise = cookCamApi.getRecipes(10, 0);
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      jest.useRealTimers();
    });
  });

  describe('Recipe Search', () => {
    it('should search recipes by query', async () => {
      const mockResults = [
        { id: '1', title: 'Pasta Carbonara' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResults }),
      });

      const result = await cookCamApi.searchRecipes('pasta');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/search?q=pasta'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockResults);
    });

    it('should get featured recipes', async () => {
      const mockFeatured = [
        { id: '1', title: 'Featured Recipe 1' },
        { id: '2', title: 'Featured Recipe 2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockFeatured }),
      });

      const result = await cookCamApi.getFeaturedRecipes();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/featured'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockFeatured);
    });

    it('should get recipe recommendations', async () => {
      const mockRecommendations = [
        { id: '1', title: 'Recommended Recipe 1' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecommendations }),
      });

      const result = await cookCamApi.getRecommendations('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/recommendations'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockRecommendations);
    });
  });

  describe('User Profile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      });

      const result = await cookCamApi.getUserProfile('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual(mockProfile);
    });

    it('should update user profile', async () => {
      const updates = { name: 'Updated Name' };

      const result = await cookCamApi.updateUserProfile('user-123', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
      expect(result.success).toBe(true);
    });
  });
});
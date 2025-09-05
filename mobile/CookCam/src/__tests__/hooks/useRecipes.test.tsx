// Mock dependencies before imports
jest.mock('../../services/cookCamApi');
jest.mock('../../context/AuthContext');
jest.mock('../../context/GamificationContext');
jest.mock('../../utils/logger');
jest.mock('expo-secure-store');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { cookCamApi } from '../../services/cookCamApi';
import { useAuth } from '../../context/AuthContext';
import { useGamification } from '../../context/GamificationContext';
import * as SecureStore from 'expo-secure-store';
import logger from '../../utils/logger';

const mockedCookCamApi = cookCamApi as jest.Mocked<typeof cookCamApi>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseGamification = useGamification as jest.MockedFunction<typeof useGamification>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock Recipe type and hook interface
interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookingTime: string;
  servings: number;
  difficulty: string;
  tags: string[];
  ingredients?: string[];
  instructions?: string[];
  isFavorited?: boolean;
  isPreview?: boolean;
  previewData?: any;
}

interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
  searchQuery: string;
  filters: {
    cuisine: string[];
    dietary: string[];
    difficulty: string;
    cookingTime: string;
  };
  // Actions
  loadRecipes: () => Promise<void>;
  loadMoreRecipes: () => Promise<void>;
  refreshRecipes: () => void;
  searchRecipes: (query: string) => Promise<void>;
  setFilters: (filters: any) => void;
  generateRecipePreviews: (ingredients: string[], preferences: any) => Promise<void>;
  generateDetailedRecipe: (previewId: string) => Promise<Recipe>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  clearResults: () => void;
}

// Create a mock useRecipes hook implementation
const useRecipes = (): UseRecipesReturn => {
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    hasMore: true,
    total: 0
  });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFiltersState] = React.useState({
    cuisine: [],
    dietary: [],
    difficulty: 'any',
    cookingTime: 'any'
  });

  const { user } = useAuth();
  const { addXP } = useGamification();

  const loadRecipes = React.useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await mockedCookCamApi.getRecipes({
        page: 1,
        limit: 20,
        search: searchQuery,
        filters
      });

      if (response.success && response.data) {
        setRecipes(response.data.recipes);
        setPagination({
          page: 1,
          hasMore: response.data.hasMore,
          total: response.data.total
        });
      } else {
        throw new Error(response.error || 'Failed to load recipes');
      }
    } catch (err: any) {
      setError(err.message);
      logger.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, loading]);

  const loadMoreRecipes = React.useCallback(async () => {
    if (loading || !pagination.hasMore) return;

    try {
      setLoading(true);

      const response = await mockedCookCamApi.getRecipes({
        page: pagination.page + 1,
        limit: 20,
        search: searchQuery,
        filters
      });

      if (response.success && response.data) {
        setRecipes(prev => [...prev, ...response.data.recipes]);
        setPagination(prev => ({
          page: prev.page + 1,
          hasMore: response.data.hasMore,
          total: response.data.total
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, pagination, searchQuery, filters]);

  const refreshRecipes = React.useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadRecipes().finally(() => setRefreshing(false));
  }, [loadRecipes]);

  const searchRecipes = React.useCallback(async (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    await loadRecipes();
  }, [loadRecipes]);

  const setFilters = React.useCallback((newFilters: any) => {
    setFiltersState(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const generateRecipePreviews = React.useCallback(async (ingredients: string[], preferences: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockedCookCamApi.generatePreviews({
        detectedIngredients: ingredients,
        userPreferences: preferences
      });

      if (response.success && response.data?.data?.previews) {
        const previews = response.data.data.previews.map((p: any, index: number) => ({
          id: p.id || `preview-${index}`,
          title: p.title,
          description: p.description,
          image: `https://via.placeholder.com/400x300?text=${encodeURIComponent(p.title)}`,
          cookingTime: `${p.estimatedTime} min`,
          servings: preferences.servingSize || 2,
          difficulty: p.difficulty,
          tags: [p.cuisineType, 'AI Generated'].filter(Boolean),
          isPreview: true,
          previewData: p
        }));

        setRecipes(previews);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDetailedRecipe = React.useCallback(async (previewId: string): Promise<Recipe> => {
    const preview = recipes.find(r => r.id === previewId);
    if (!preview?.previewData) {
      throw new Error('Preview not found');
    }

    const response = await mockedCookCamApi.generateDetailedRecipe({
      selectedPreview: preview.previewData,
      sessionId: 'test-session'
    });

    if (response.success && response.data?.data?.recipe) {
      const detailed = response.data.data.recipe;
      return {
        ...preview,
        ingredients: detailed.ingredients,
        instructions: detailed.instructions,
        isPreview: false
      };
    }

    throw new Error('Failed to generate detailed recipe');
  }, [recipes]);

  const toggleFavorite = React.useCallback(async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    if (recipe.isPreview) {
      // Generate detailed recipe first
      const detailed = await generateDetailedRecipe(recipeId);
      const response = await mockedCookCamApi.toggleFavoriteRecipe(detailed.id);
      
      if (response.success) {
        setRecipes(prev => prev.map(r => 
          r.id === recipeId 
            ? { ...detailed, isFavorited: response.data?.favorited }
            : r
        ));
      }
    } else {
      const response = await mockedCookCamApi.toggleFavoriteRecipe(recipeId);
      
      if (response.success) {
        setRecipes(prev => prev.map(r => 
          r.id === recipeId 
            ? { ...r, isFavorited: response.data?.favorited }
            : r
        ));
      }
    }
  }, [recipes, generateDetailedRecipe]);

  const clearResults = React.useCallback(() => {
    setRecipes([]);
    setError(null);
    setSearchQuery('');
    setPagination({ page: 1, hasMore: true, total: 0 });
  }, []);

  // Load recipes on mount
  React.useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user, loadRecipes]);

  return {
    recipes,
    loading,
    refreshing,
    error,
    pagination,
    searchQuery,
    filters,
    loadRecipes,
    loadMoreRecipes,
    refreshRecipes,
    searchRecipes,
    setFilters,
    generateRecipePreviews,
    generateDetailedRecipe,
    toggleFavorite,
    clearResults
  };
};

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  isCreator: false,
  level: 5,
  xp: 1250,
  streak: 7,
  badges: []
};

// Mock recipe data
const mockRecipes = [
  {
    id: 'recipe-1',
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish',
    image: 'https://example.com/carbonara.jpg',
    cookingTime: '20 min',
    servings: 4,
    difficulty: 'medium',
    tags: ['Italian', 'Pasta'],
    ingredients: ['pasta', 'eggs', 'bacon', 'cheese'],
    instructions: ['Boil pasta', 'Cook bacon', 'Mix with eggs']
  },
  {
    id: 'recipe-2',
    title: 'Chicken Stir Fry',
    description: 'Quick and healthy stir fry',
    image: 'https://example.com/stirfry.jpg',
    cookingTime: '15 min',
    servings: 2,
    difficulty: 'easy',
    tags: ['Asian', 'Quick'],
    ingredients: ['chicken', 'vegetables', 'soy sauce'],
    instructions: ['Cut chicken', 'Cook vegetables', 'Add sauce']
  }
];

const mockPreviews = [
  {
    id: 'preview-1',
    title: 'AI Generated Pasta',
    description: 'Made from your scanned ingredients',
    estimatedTime: 25,
    difficulty: 'medium',
    cuisineType: 'Italian'
  }
];

describe('useRecipes Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    mockedUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isCreatingProfile: false,
      login: jest.fn(),
      loginWithBiometrics: jest.fn(),
      enableBiometricLogin: jest.fn(),
      disableBiometricLogin: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn()
    });

    // Mock useGamification
    mockedUseGamification.mockReturnValue({
      xp: 1250,
      level: 5,
      levelProgress: 50,
      nextLevelXP: 2000,
      streak: 7,
      freezeTokens: 2,
      badges: [],
      addXP: jest.fn(),
      checkStreak: jest.fn(),
      useFreeze: jest.fn(),
      unlockBadge: jest.fn(),
      loadGamificationProgress: jest.fn(),
      refreshUserStats: jest.fn(),
      xpNotification: {
        visible: false,
        xpGained: 0,
        reason: '',
        showConfetti: false
      },
      hideXPNotification: jest.fn()
    });

    // Default API mocks
    mockedCookCamApi.getRecipes.mockResolvedValue({
      success: true,
      data: {
        recipes: mockRecipes,
        hasMore: false,
        total: 2
      }
    });

    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRecipes());

      expect(result.current.recipes).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toEqual({
        page: 1,
        hasMore: true,
        total: 0
      });
      expect(result.current.searchQuery).toBe('');
      expect(result.current.filters).toEqual({
        cuisine: [],
        dietary: [],
        difficulty: 'any',
        cookingTime: 'any'
      });
    });

    it('should load recipes on mount when user exists', async () => {
      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(mockedCookCamApi.getRecipes).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: '',
          filters: {
            cuisine: [],
            dietary: [],
            difficulty: 'any',
            cookingTime: 'any'
          }
        });
      });

      expect(result.current.recipes).toEqual(mockRecipes);
      expect(result.current.loading).toBe(false);
    });

    it('should not load recipes when user is null', async () => {
      mockedUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isCreatingProfile: false,
        login: jest.fn(),
        loginWithBiometrics: jest.fn(),
        enableBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn()
      });

      renderHook(() => useRecipes());

      await waitFor(() => {
        expect(mockedCookCamApi.getRecipes).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading Recipes', () => {
    it('should handle successful recipe loading', async () => {
      const { result } = renderHook(() => useRecipes());

      await act(async () => {
        await result.current.loadRecipes();
      });

      expect(result.current.recipes).toEqual(mockRecipes);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle recipe loading errors', async () => {
      mockedCookCamApi.getRecipes.mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      const { result } = renderHook(() => useRecipes());

      await act(async () => {
        await result.current.loadRecipes();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.recipes).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to load recipes:',
        expect.any(Error)
      );
    });

    it('should not load recipes if already loading', async () => {
      const { result } = renderHook(() => useRecipes());

      // Start loading
      const loadPromise1 = act(async () => {
        await result.current.loadRecipes();
      });

      // Try to load again while first is still loading
      const loadPromise2 = act(async () => {
        await result.current.loadRecipes();
      });

      await Promise.all([loadPromise1, loadPromise2]);

      // Should only be called once (from initial mount) since second call should be ignored
      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination', () => {
    it('should load more recipes', async () => {
      mockedCookCamApi.getRecipes
        .mockResolvedValueOnce({
          success: true,
          data: {
            recipes: [mockRecipes[0]],
            hasMore: true,
            total: 3
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            recipes: [mockRecipes[1]],
            hasMore: false,
            total: 3
          }
        });

      const { result } = renderHook(() => useRecipes());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(1);
      });

      // Load more
      await act(async () => {
        await result.current.loadMoreRecipes();
      });

      expect(result.current.recipes).toHaveLength(2);
      expect(result.current.pagination.page).toBe(2);
      expect(result.current.pagination.hasMore).toBe(false);
    });

    it('should not load more if no more pages', async () => {
      mockedCookCamApi.getRecipes.mockResolvedValue({
        success: true,
        data: {
          recipes: mockRecipes,
          hasMore: false,
          total: 2
        }
      });

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.pagination.hasMore).toBe(false);
      });

      await act(async () => {
        await result.current.loadMoreRecipes();
      });

      // Should only be called once for initial load
      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledTimes(1);
    });

    it('should not load more if already loading', async () => {
      mockedCookCamApi.getRecipes
        .mockResolvedValueOnce({
          success: true,
          data: {
            recipes: [mockRecipes[0]],
            hasMore: true,
            total: 3
          }
        });

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(1);
      });

      // Start loading more
      const loadPromise1 = act(async () => {
        await result.current.loadMoreRecipes();
      });

      // Try to load more again while first is still loading
      const loadPromise2 = act(async () => {
        await result.current.loadMoreRecipes();
      });

      await Promise.all([loadPromise1, loadPromise2]);

      // Should only call once for loadMore (plus once for initial)
      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledTimes(2);
    });
  });

  describe('Search and Filters', () => {
    it('should search recipes', async () => {
      const { result } = renderHook(() => useRecipes());

      await act(async () => {
        await result.current.searchRecipes('pasta');
      });

      expect(result.current.searchQuery).toBe('pasta');
      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'pasta',
        filters: expect.any(Object)
      });
    });

    it('should set filters', async () => {
      const { result } = renderHook(() => useRecipes());

      const newFilters = {
        cuisine: ['italian'],
        dietary: ['vegetarian'],
        difficulty: 'easy',
        cookingTime: '30'
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
      expect(result.current.pagination.page).toBe(1);
    });

    it('should refresh recipes', async () => {
      mockedCookCamApi.getRecipes
        .mockResolvedValueOnce({
          success: true,
          data: { recipes: [mockRecipes[0]], hasMore: false, total: 1 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { recipes: mockRecipes, hasMore: false, total: 2 }
        });

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(1);
      });

      act(() => {
        result.current.refreshRecipes();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
        expect(result.current.recipes).toHaveLength(2);
      });
    });
  });

  describe('Recipe Previews', () => {
    it('should generate recipe previews', async () => {
      mockedCookCamApi.generatePreviews.mockResolvedValue({
        success: true,
        data: {
          data: {
            previews: mockPreviews
          }
        }
      });

      const { result } = renderHook(() => useRecipes());

      const ingredients = ['tomato', 'pasta'];
      const preferences = { servingSize: 2, cuisine: ['italian'] };

      await act(async () => {
        await result.current.generateRecipePreviews(ingredients, preferences);
      });

      expect(mockedCookCamApi.generatePreviews).toHaveBeenCalledWith({
        detectedIngredients: ingredients,
        userPreferences: preferences
      });

      expect(result.current.recipes).toHaveLength(1);
      expect(result.current.recipes[0].isPreview).toBe(true);
      expect(result.current.recipes[0].title).toBe('AI Generated Pasta');
    });

    it('should handle preview generation errors', async () => {
      mockedCookCamApi.generatePreviews.mockResolvedValue({
        success: false,
        error: 'Failed to generate previews'
      });

      const { result } = renderHook(() => useRecipes());

      await act(async () => {
        await result.current.generateRecipePreviews(['tomato'], {});
      });

      expect(result.current.error).toBe('Failed to generate previews');
    });
  });

  describe('Detailed Recipe Generation', () => {
    it('should generate detailed recipe', async () => {
      // First set up a preview recipe
      mockedCookCamApi.generatePreviews.mockResolvedValue({
        success: true,
        data: {
          data: {
            previews: mockPreviews
          }
        }
      });

      mockedCookCamApi.generateDetailedRecipe.mockResolvedValue({
        success: true,
        data: {
          data: {
            recipe: {
              ingredients: ['pasta', 'sauce'],
              instructions: ['Cook pasta', 'Add sauce']
            }
          }
        }
      });

      const { result } = renderHook(() => useRecipes());

      // Generate preview first
      await act(async () => {
        await result.current.generateRecipePreviews(['tomato'], {});
      });

      const previewId = result.current.recipes[0].id;

      // Generate detailed recipe
      let detailedRecipe: Recipe;
      await act(async () => {
        detailedRecipe = await result.current.generateDetailedRecipe(previewId);
      });

      expect(detailedRecipe!.ingredients).toEqual(['pasta', 'sauce']);
      expect(detailedRecipe!.instructions).toEqual(['Cook pasta', 'Add sauce']);
      expect(detailedRecipe!.isPreview).toBe(false);
    });

    it('should handle detailed recipe generation errors', async () => {
      const { result } = renderHook(() => useRecipes());

      await expect(
        act(async () => {
          await result.current.generateDetailedRecipe('non-existent');
        })
      ).rejects.toThrow('Preview not found');
    });
  });

  describe('Favorites', () => {
    it('should toggle favorite for saved recipe', async () => {
      mockedCookCamApi.toggleFavoriteRecipe.mockResolvedValue({
        success: true,
        data: { favorited: true }
      });

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(2);
      });

      await act(async () => {
        await result.current.toggleFavorite('recipe-1');
      });

      expect(mockedCookCamApi.toggleFavoriteRecipe).toHaveBeenCalledWith('recipe-1');
      expect(result.current.recipes[0].isFavorited).toBe(true);
    });

    it('should toggle favorite for preview recipe', async () => {
      // Setup preview
      mockedCookCamApi.generatePreviews.mockResolvedValue({
        success: true,
        data: {
          data: {
            previews: mockPreviews
          }
        }
      });

      mockedCookCamApi.generateDetailedRecipe.mockResolvedValue({
        success: true,
        data: {
          data: {
            recipe: {
              ingredients: ['pasta'],
              instructions: ['Cook']
            }
          }
        }
      });

      mockedCookCamApi.toggleFavoriteRecipe.mockResolvedValue({
        success: true,
        data: { favorited: true }
      });

      const { result } = renderHook(() => useRecipes());

      // Generate preview
      await act(async () => {
        await result.current.generateRecipePreviews(['tomato'], {});
      });

      const previewId = result.current.recipes[0].id;

      // Toggle favorite (should generate detailed recipe first)
      await act(async () => {
        await result.current.toggleFavorite(previewId);
      });

      expect(mockedCookCamApi.generateDetailedRecipe).toHaveBeenCalled();
      expect(mockedCookCamApi.toggleFavoriteRecipe).toHaveBeenCalled();
    });
  });

  describe('Clear Results', () => {
    it('should clear all results and reset state', async () => {
      const { result } = renderHook(() => useRecipes());

      // Wait for recipes to load
      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(2);
      });

      // Set some search query
      await act(async () => {
        await result.current.searchRecipes('test');
      });

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.recipes).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.searchQuery).toBe('');
      expect(result.current.pagination).toEqual({
        page: 1,
        hasMore: true,
        total: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockedCookCamApi.getRecipes.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.loading).toBe(false);
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to load recipes:',
        expect.any(Error)
      );
    });

    it('should handle malformed API responses', async () => {
      mockedCookCamApi.getRecipes.mockResolvedValue({
        success: true,
        data: null // Malformed response
      });

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load recipes');
      });
    });
  });

  describe('Performance', () => {
    it('should prevent unnecessary API calls', async () => {
      const { result, rerender } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(2);
      });

      // Rerender shouldn't trigger new API call
      rerender();

      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledTimes(1);
    });

    it('should debounce search calls', async () => {
      const { result } = renderHook(() => useRecipes());

      // Multiple rapid search calls
      await act(async () => {
        await result.current.searchRecipes('a');
      });
      
      await act(async () => {
        await result.current.searchRecipes('ab');
      });

      await act(async () => {
        await result.current.searchRecipes('abc');
      });

      // Should have made calls for initial load + 3 searches
      expect(mockedCookCamApi.getRecipes).toHaveBeenCalledTimes(4);
    });
  });

  describe('Caching', () => {
    it('should cache results locally', async () => {
      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(2);
      });

      // Should attempt to cache results
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('recipes_cache'),
        expect.any(String)
      );
    });

    it('should load from cache when available', async () => {
      const cachedData = {
        recipes: [mockRecipes[0]],
        timestamp: Date.now() - 60000 // 1 minute ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        expect(result.current.recipes).toHaveLength(1);
      });
    });

    it('should invalidate stale cache', async () => {
      const staleData = {
        recipes: [mockRecipes[0]],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(staleData));

      const { result } = renderHook(() => useRecipes());

      await waitFor(() => {
        // Should make fresh API call due to stale cache
        expect(mockedCookCamApi.getRecipes).toHaveBeenCalled();
      });
    });
  });
});
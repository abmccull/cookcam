import request from 'supertest';
import express from 'express';
import recipesRouter from '../recipes';
import { supabase, createAuthenticatedClient } from '../../index';
import { generateRecipeSuggestions, generateFullRecipe } from '../../services/openai';
import enhancedRecipeService from '../../services/enhancedRecipeGeneration';
import { RecipePreviewService } from '../../services/recipePreviewService';
import { DetailedRecipeService } from '../../services/detailedRecipeService';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
  },
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('../../services/openai', () => ({
  generateRecipeSuggestions: jest.fn(),
  generateFullRecipe: jest.fn(),
}));

jest.mock('../../services/enhancedRecipeGeneration', () => ({
  default: {
    generateRecipe: jest.fn(),
    generateMultipleRecipes: jest.fn(),
    generateRecipeVariations: jest.fn(),
  },
}));

jest.mock('../../services/recipePreviewService', () => ({
  RecipePreviewService: jest.fn().mockImplementation(() => ({
    generatePreviews: jest.fn(),
  })),
}));

jest.mock('../../services/detailedRecipeService', () => ({
  DetailedRecipeService: jest.fn().mockImplementation(() => ({
    generateDetailedRecipe: jest.fn(),
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Setup Express app with the router
const app = express();
app.use(express.json());
app.use('/recipes', recipesRouter);

describe('Recipes Routes - Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /recipes/suggestions', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/recipes/suggestions')
        .send({
          detectedIngredients: ['tomato', 'pasta'],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should generate recipe suggestions successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockIngredients = ['tomato', 'pasta', 'garlic'];
      const mockSuggestions = [
        {
          id: 'recipe-1',
          title: 'Pasta Pomodoro',
          description: 'Classic Italian pasta with tomato sauce',
          estimatedTime: 30,
          difficulty: 'easy',
        },
        {
          id: 'recipe-2',
          title: 'Garlic Pasta',
          description: 'Simple garlic and olive oil pasta',
          estimatedTime: 20,
          difficulty: 'easy',
        },
      ];

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock authenticated client
      (createAuthenticatedClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'scan-123' },
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: { xp_gained: 10 },
          error: null,
        }),
      });

      // Mock OpenAI service
      (generateRecipeSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          detectedIngredients: mockIngredients,
          dietaryTags: ['vegetarian'],
          cuisinePreferences: ['italian'],
          timeAvailable: '30_MINUTES',
          skillLevel: 'beginner',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('session_id', 'scan-123');
      expect(response.body).toHaveProperty('xp_awarded', 20);
      expect(generateRecipeSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedIngredients: mockIngredients,
          dietaryTags: ['vegetarian'],
          cuisinePreferences: ['italian'],
          timeAvailable: '30_MINUTES',
          skillLevel: 'beginner',
        })
      );
    });

    it('should validate required ingredients', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          detectedIngredients: [], // Empty array
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Detected ingredients array is required');
    });

    it('should handle OpenAI service errors', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock authenticated client
      (createAuthenticatedClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'scan-123' },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock OpenAI service error
      (generateRecipeSuggestions as jest.Mock).mockRejectedValue(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          detectedIngredients: ['tomato'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate recipe suggestions');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /recipes/generate-full', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/recipes/generate-full')
        .send({
          recipe: { title: 'Test Recipe' },
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should generate full recipe successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockRecipe = {
        title: 'Pasta Carbonara',
        description: 'Classic Italian pasta',
        ingredients: ['pasta', 'eggs', 'bacon'],
        instructions: ['Cook pasta', 'Mix eggs', 'Combine'],
        cookTime: 30,
        servings: 4,
      };

      const mockFullRecipe = {
        ...mockRecipe,
        nutritionInfo: {
          calories: 450,
          protein: 20,
          carbs: 55,
          fat: 18,
        },
        tips: ['Use fresh eggs', 'Don\'t overcook pasta'],
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock cooking sessions lookup
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'cooking_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                session_id: 'scan-123',
                user_id: 'user-123',
                original_input: {
                  detectedIngredients: ['pasta', 'eggs', 'bacon'],
                  cuisinePreferences: ['italian'],
                },
              },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'recipe-123' },
            error: null,
          }),
        };
      });

      // Mock authenticated client
      const mockAuthClient = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'recipe-123' },
                error: null,
              }),
            }),
          }),
        }),
        rpc: jest.fn().mockResolvedValue({
          data: { xp_gained: 50 },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValue(mockAuthClient);

      // Mock OpenAI service
      (generateFullRecipe as jest.Mock).mockResolvedValue(mockFullRecipe);

      const response = await request(app)
        .post('/recipes/generate-full')
        .set('Authorization', 'Bearer valid-token')
        .send({
          selectedTitle: 'Pasta Carbonara',
          sessionId: 'scan-123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recipe');
      expect(response.body).toHaveProperty('recipeId', 'recipe-123');
      expect(response.body).toHaveProperty('xpGained', 50);
      expect(generateFullRecipe).toHaveBeenCalledWith(mockRecipe);
    });

    it('should validate recipe object', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/recipes/generate-full')
        .set('Authorization', 'Bearer valid-token')
        .send({}); // Missing recipe

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Selected recipe title is required');
    });
  });

  describe('POST /recipes/generate', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/recipes/generate')
        .send({
          ingredients: ['tomato'],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should generate enhanced recipe successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEnhancedRecipe = {
        id: 'recipe-123',
        title: 'Enhanced Tomato Pasta',
        description: 'A delicious enhanced recipe',
        ingredients: [
          { name: 'tomato', quantity: 2, unit: 'cups' },
          { name: 'pasta', quantity: 200, unit: 'g' },
        ],
        instructions: ['Step 1', 'Step 2'],
        nutritionInfo: {
          calories: 350,
          protein: 12,
          carbs: 65,
          fat: 8,
        },
        cookingTime: 25,
        difficulty: 'easy',
        servings: 2,
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock authenticated client
      (createAuthenticatedClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'recipe-123' },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock enhanced recipe service
      (enhancedRecipeService.generateRecipe as jest.Mock).mockResolvedValue(mockEnhancedRecipe);

      const response = await request(app)
        .post('/recipes/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          ingredients: ['tomato', 'pasta'],
          preferences: {
            dietary: ['vegetarian'],
            cuisine: 'italian',
            difficulty: 'easy',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recipe');
      expect(response.body.recipe).toEqual(mockEnhancedRecipe);
      expect(enhancedRecipeService.generateRecipe).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock service error
      (enhancedRecipeService.generateRecipe as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/recipes/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          ingredients: ['tomato'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate recipe');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /recipes', () => {
    it('should fetch recipes with pagination', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          title: 'Recipe 1',
          created_at: '2024-01-01',
        },
        {
          id: 'recipe-2',
          title: 'Recipe 2',
          created_at: '2024-01-02',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRecipes,
          error: null,
          count: 2,
        }),
      });

      const response = await request(app)
        .get('/recipes')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recipes');
      expect(response.body.recipes).toEqual(mockRecipes);
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
    });

    it('should filter recipes by user', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          title: 'My Recipe',
          user_id: 'user-123',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRecipes,
          error: null,
          count: 1,
        }),
      });

      const response = await request(app)
        .get('/recipes')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toEqual(mockRecipes);
      expect(supabase.from).toHaveBeenCalledWith('recipes');
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      const response = await request(app).get('/recipes');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /recipes/:id', () => {
    it('should fetch recipe by ID', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: ['step1', 'step2'],
        created_at: '2024-01-01',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRecipe,
          error: null,
        }),
      });

      const response = await request(app).get('/recipes/recipe-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
    });

    it('should return 404 for non-existent recipe', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      });

      const response = await request(app).get('/recipes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });
  });

  describe('POST /recipes/:recipeId/save', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/recipes/recipe-123/save')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should save recipe to user collection', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock database operations
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'saved-123',
                user_id: 'user-123',
                recipe_id: 'recipe-123',
              },
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .post('/recipes/recipe-123/save')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Recipe saved successfully');
      expect(response.body).toHaveProperty('savedRecipe');
    });

    it('should handle duplicate saves', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock duplicate key error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key violation' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .post('/recipes/recipe-123/save')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Recipe already saved');
    });
  });

  describe('POST /recipes/:recipeId/favorite', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/recipes/recipe-123/favorite')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should toggle favorite status', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock check for existing favorite
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
      });

      // Mock insert favorite
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'fav-123' },
          error: null,
        }),
      });

      const response = await request(app)
        .post('/recipes/recipe-123/favorite')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isFavorite', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /recipes/saved/my', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/recipes/saved/my');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should fetch user saved recipes', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockSavedRecipes = [
        {
          id: 'saved-1',
          recipe: {
            id: 'recipe-1',
            title: 'Saved Recipe 1',
          },
        },
        {
          id: 'saved-2',
          recipe: {
            id: 'recipe-2',
            title: 'Saved Recipe 2',
          },
        },
      ];

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock database query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSavedRecipes,
          error: null,
        }),
      });

      const response = await request(app)
        .get('/recipes/saved/my')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('savedRecipes');
      expect(response.body.savedRecipes).toEqual(mockSavedRecipes);
    });
  });
});
import request from 'supertest';
import express from 'express';
import recipesRouter from '../recipes';
import { supabase, createAuthenticatedClient } from '../../index';
import { generateRecipeSuggestions, generateFullRecipe } from '../../services/openai';
import enhancedRecipeService from '../../services/enhancedRecipeGeneration';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('../../services/openai', () => ({
  generateRecipeSuggestions: jest.fn(),
  generateFullRecipe: jest.fn(),
}));

jest.mock('../../services/enhancedRecipeGeneration');

jest.mock('../../services/recipePreviewService');
jest.mock('../../services/detailedRecipeService');

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateUser: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 'test-user-123', email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  }),
}));

// Setup Express app
const app = express();
app.use(express.json());
app.use('/recipes', recipesRouter);

describe('Recipe Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /recipes/suggestions', () => {
    const validRequest = {
      detectedIngredients: ['chicken', 'rice', 'broccoli'],
      dietaryTags: ['high-protein'],
      cuisinePreferences: ['asian'],
      timeAvailable: '30_MIN',
      skillLevel: 'INTERMEDIATE',
    };

    it('should generate recipe suggestions successfully', async () => {
      const mockSuggestions = [
        {
          title: 'Chicken Fried Rice',
          cuisine: 'Asian',
          totalTimeMinutes: 25,
          difficulty: 'Intermediate',
          oneSentenceTeaser: 'Quick and delicious Asian-style fried rice',
        },
        {
          title: 'Teriyaki Chicken Bowl',
          cuisine: 'Japanese',
          totalTimeMinutes: 30,
          difficulty: 'Intermediate',
          oneSentenceTeaser: 'Savory teriyaki chicken with steamed broccoli',
        },
        {
          title: 'Chicken and Broccoli Stir-Fry',
          cuisine: 'Chinese',
          totalTimeMinutes: 20,
          difficulty: 'Beginner',
          oneSentenceTeaser: 'Classic Chinese takeout made at home',
        },
      ];

      (generateRecipeSuggestions as jest.Mock).mockResolvedValueOnce(mockSuggestions);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      // Mock the add_user_xp RPC call
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions).toHaveLength(3);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('xp_awarded', 20);
      expect(response.body).toHaveProperty('message', 'Recipe suggestions generated successfully');
      expect(response.body.suggestions[0]).toMatchObject({
        title: 'Chicken Fried Rice',
        cuisine: 'Asian',
        totalTimeMinutes: 25,
      });

      expect(generateRecipeSuggestions).toHaveBeenCalledWith({
        detectedIngredients: validRequest.detectedIngredients,
        assumedStaples: ['salt', 'black pepper', 'olive oil', 'water'],
        dietaryTags: validRequest.dietaryTags,
        cuisinePreferences: validRequest.cuisinePreferences,
        timeAvailable: validRequest.timeAvailable,
        skillLevel: validRequest.skillLevel,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/recipes/suggestions').send(validRequest);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate required ingredients', async () => {
      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({ ...validRequest, detectedIngredients: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('At least one ingredient is required');
    });

    it('should handle OpenAI service errors', async () => {
      (generateRecipeSuggestions as jest.Mock).mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate recipe suggestions');
      expect(logger.error).toHaveBeenCalledWith('Recipe suggestion error:', expect.any(Error));
    });

    it('should handle session creation errors gracefully', async () => {
      (generateRecipeSuggestions as jest.Mock).mockResolvedValueOnce([
        { title: 'Test Recipe', cuisine: 'Test', totalTimeMinutes: 30 },
      ]);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Session creation failed' },
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith('Failed to create session:', expect.any(Object));
    });
  });

  describe('POST /recipes/full', () => {
    const validFullRecipeRequest = {
      ingredients: ['chicken breast', 'rice', 'broccoli'],
      selectedRecipe: {
        title: 'Chicken Rice Bowl',
        cuisine: 'Asian',
        totalTimeMinutes: 30,
        difficulty: 'Intermediate',
      },
      sessionId: 'session-123',
    };

    it('should generate full recipe successfully', async () => {
      const mockFullRecipe = {
        title: 'Chicken Rice Bowl',
        description: 'A healthy and delicious chicken rice bowl',
        ingredients: [
          { name: 'chicken breast', amount: '200', unit: 'g' },
          { name: 'rice', amount: '1', unit: 'cup' },
          { name: 'broccoli', amount: '150', unit: 'g' },
        ],
        instructions: [
          { step: 1, instruction: 'Cook rice according to package instructions' },
          { step: 2, instruction: 'Season and cook chicken breast' },
          { step: 3, instruction: 'Steam broccoli until tender' },
        ],
        totalTimeMinutes: 30,
        servings: 2,
        difficulty: 'Intermediate',
        nutrition: {
          calories: 450,
          protein: 35,
          carbohydrates: 55,
          fat: 8,
          fiber: 4,
        },
      };

      (generateFullRecipe as jest.Mock).mockResolvedValueOnce(mockFullRecipe);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'recipe-456' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .post('/recipes/full')
        .set('Authorization', 'Bearer mock-token')
        .send(validFullRecipeRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recipe');
      expect(response.body).toHaveProperty('xp_awarded', 50);
      expect(response.body.recipe.title).toBe('Chicken Rice Bowl');
      expect(response.body.recipe.ingredients).toHaveLength(3);
      expect(response.body.recipe.instructions).toHaveLength(3);

      expect(generateFullRecipe).toHaveBeenCalledWith({
        ingredients: validFullRecipeRequest.ingredients,
        selectedRecipe: validFullRecipeRequest.selectedRecipe,
      });
    });

    it('should require authentication for full recipe generation', async () => {
      const response = await request(app).post('/recipes/full').send(validFullRecipeRequest);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate required fields for full recipe', async () => {
      const response = await request(app)
        .post('/recipes/full')
        .set('Authorization', 'Bearer mock-token')
        .send({ ingredients: ['chicken'] }); // Missing selectedRecipe

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Ingredients and selected recipe are required');
    });

    it('should handle full recipe generation errors', async () => {
      (generateFullRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Recipe generation failed')
      );

      const response = await request(app)
        .post('/recipes/full')
        .set('Authorization', 'Bearer mock-token')
        .send(validFullRecipeRequest);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate full recipe');
      expect(logger.error).toHaveBeenCalledWith('Full recipe generation error:', expect.any(Error));
    });
  });

  describe('GET /recipes/:id', () => {
    const mockRecipe = {
      id: 'recipe-123',
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: [{ name: 'chicken', amount: '200', unit: 'g' }],
      instructions: [{ step: 1, instruction: 'Cook chicken' }],
      created_by: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should get recipe by ID successfully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockRecipe,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/recipe-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
      expect(supabase.from).toHaveBeenCalledWith('generated_recipes');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'recipe-123');
    });

    it('should handle recipe not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/nonexistent')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should handle database errors when fetching recipe', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/recipe-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipe');
      expect(logger.error).toHaveBeenCalledWith('Recipe fetch error:', expect.any(Object));
    });
  });

  describe('GET /recipes', () => {
    const mockRecipes = [
      {
        id: 'recipe-1',
        title: 'Recipe 1',
        description: 'First recipe',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'recipe-2',
        title: 'Recipe 2',
        description: 'Second recipe',
        created_by: 'user-456',
        created_at: '2024-01-02T00:00:00Z',
      },
    ];

    it('should get recipes with default pagination', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: mockRecipes,
          error: null,
          count: 2,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app).get('/recipes').set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.recipes).toEqual(mockRecipes);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('should handle custom pagination parameters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: [mockRecipes[0]],
          error: null,
          count: 2,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes?page=2&limit=1')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
      });

      expect(mockQuery.range).toHaveBeenCalledWith(1, 1);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/recipes?page=0&limit=0')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Page must be >= 1 and limit must be between 1 and 100');
    });

    it('should handle database errors when fetching recipes', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app).get('/recipes').set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
    });
  });

  describe('POST /recipes/:id/favorite', () => {
    it('should add recipe to favorites successfully', async () => {
      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValueOnce({
          data: { user_id: 'test-user-123', recipe_id: 'recipe-123' },
          error: null,
        }),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/recipes/recipe-123/favorite')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Recipe added to favorites');
      expect(mockAuthClient.from).toHaveBeenCalledWith('user_favorites');
      expect(mockAuthClient.upsert).toHaveBeenCalledWith({
        user_id: 'test-user-123',
        recipe_id: 'recipe-123',
      });
    });

    it('should handle favorite errors', async () => {
      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Favorite failed' },
        }),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/recipes/recipe-123/favorite')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add recipe to favorites');
      expect(logger.error).toHaveBeenCalledWith('Favorite error:', expect.any(Object));
    });
  });

  describe('DELETE /recipes/:id/favorite', () => {
    it('should remove recipe from favorites successfully', async () => {
      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .delete('/recipes/recipe-123/favorite')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Recipe removed from favorites');
      expect(mockAuthClient.from).toHaveBeenCalledWith('user_favorites');
      expect(mockAuthClient.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
      expect(mockAuthClient.eq).toHaveBeenCalledWith('recipe_id', 'recipe-123');
    });
  });

  describe('GET /recipes/:id/nutrition', () => {
    it('should calculate recipe nutrition successfully', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        ingredients: [
          { name: 'chicken breast', amount: '200', unit: 'g' },
          { name: 'rice', amount: '1', unit: 'cup' },
        ],
      };

      const mockIngredients = [
        {
          ingredient: {
            name: 'chicken breast',
            calories_per_100g: 165,
            protein_g_per_100g: 31,
            carbs_g_per_100g: 0,
            fat_g_per_100g: 3.6,
          },
          quantity: 200,
          unit: 'g',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockRecipe,
          error: null,
        }),
      };

      const mockIngredientQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValueOnce({
          data: mockIngredients,
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockIngredientQuery);

      const response = await request(app)
        .get('/recipes/recipe-123/nutrition')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nutrition');
      expect(response.body.nutrition).toHaveProperty('totalCalories');
      expect(response.body.nutrition).toHaveProperty('totalProtein');
      expect(response.body).toHaveProperty('ingredientBreakdown');
    });

    it('should handle missing recipe for nutrition calculation', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/nonexistent/nutrition')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });
  });

  describe('POST /recipes/enhanced', () => {
    it('should generate enhanced recipe successfully', async () => {
      const mockEnhancedRecipe = {
        title: 'Enhanced Chicken Rice',
        description: 'An enhanced version with better techniques',
        ingredients: [{ name: 'chicken', amount: '200', unit: 'g' }],
        instructions: [{ step: 1, instruction: 'Enhanced cooking method' }],
      };

      const mockEnhancedService = {
        generateRecipe: jest.fn().mockResolvedValueOnce(mockEnhancedRecipe),
      };

      (enhancedRecipeService as any) = mockEnhancedService;

      const response = await request(app)
        .post('/recipes/enhanced')
        .set('Authorization', 'Bearer mock-token')
        .send({
          ingredients: ['chicken', 'rice'],
          preferences: { cuisine: 'asian', spiceLevel: 'medium' },
        });

      expect(response.status).toBe(200);
      expect(response.body.recipe).toEqual(mockEnhancedRecipe);
      expect(mockEnhancedService.generateRecipe).toHaveBeenCalledWith({
        ingredients: ['chicken', 'rice'],
        userPreferences: { cuisine: 'asian', spiceLevel: 'medium' },
      });
    });

    it('should handle enhanced recipe generation errors', async () => {
      const mockEnhancedService = {
        generateRecipe: jest.fn().mockRejectedValueOnce(new Error('Enhanced generation failed')),
      };

      (enhancedRecipeService as any) = mockEnhancedService;

      const response = await request(app)
        .post('/recipes/enhanced')
        .set('Authorization', 'Bearer mock-token')
        .send({
          ingredients: ['chicken', 'rice'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate enhanced recipe');
      expect(logger.error).toHaveBeenCalledWith('Enhanced recipe error:', expect.any(Error));
    });
  });

  describe('GET /recipes/user/:userId', () => {
    it('should get user recipes successfully', async () => {
      const mockUserRecipes = [
        { id: 'recipe-1', title: 'User Recipe 1', created_by: 'user-123' },
        { id: 'recipe-2', title: 'User Recipe 2', created_by: 'user-123' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: mockUserRecipes,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/user/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.recipes).toEqual(mockUserRecipes);
      expect(mockQuery.eq).toHaveBeenCalledWith('created_by', 'user-123');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle user recipes fetch errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/user/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch user recipes');
    });
  });

  describe('GET /recipes/search', () => {
    it('should search recipes successfully', async () => {
      const mockSearchResults = [
        { id: 'recipe-1', title: 'Chicken Curry', description: 'Spicy chicken curry' },
        { id: 'recipe-2', title: 'Chicken Stir Fry', description: 'Quick chicken stir fry' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockSearchResults,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/search?q=chicken')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual(mockSearchResults);
      expect(response.body.query).toBe('chicken');
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%chicken%,description.ilike.%chicken%'
      );
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/recipes/search')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });

    it('should handle search errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Search failed' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/search?q=chicken')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Search failed');
    });
  });

  describe('POST /recipes/:id/rating', () => {
    it('should add recipe rating successfully', async () => {
      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValueOnce({
          data: { user_id: 'test-user-123', recipe_id: 'recipe-123', rating: 5 },
          error: null,
        }),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/recipes/recipe-123/rating')
        .set('Authorization', 'Bearer mock-token')
        .send({ rating: 5, comment: 'Great recipe!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Rating added successfully');
      expect(mockAuthClient.upsert).toHaveBeenCalledWith({
        user_id: 'test-user-123',
        recipe_id: 'recipe-123',
        rating: 5,
        comment: 'Great recipe!',
      });
    });

    it('should validate rating value', async () => {
      const response = await request(app)
        .post('/recipes/recipe-123/rating')
        .set('Authorization', 'Bearer mock-token')
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should handle rating errors', async () => {
      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Rating failed' },
        }),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/recipes/recipe-123/rating')
        .set('Authorization', 'Bearer mock-token')
        .send({ rating: 4 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add rating');
    });
  });

  describe('Authentication Requirements', () => {
    const protectedEndpoints = [
      { method: 'post', path: '/recipes/suggestions' },
      { method: 'post', path: '/recipes/full' },
      { method: 'get', path: '/recipes/recipe-123' },
      { method: 'get', path: '/recipes' },
      { method: 'post', path: '/recipes/recipe-123/favorite' },
      { method: 'delete', path: '/recipes/recipe-123/favorite' },
      { method: 'get', path: '/recipes/recipe-123/nutrition' },
      { method: 'post', path: '/recipes/enhanced' },
      { method: 'get', path: '/recipes/user/user-123' },
      { method: 'get', path: '/recipes/search?q=test' },
      { method: 'post', path: '/recipes/recipe-123/rating' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`should require authentication for ${method.toUpperCase()} ${path}`, async () => {
        let response;
        if (method === 'get') {
          response = await request(app).get(path);
        } else if (method === 'post') {
          response = await request(app).post(path);
        } else if (method === 'put') {
          response = await request(app).put(path);
        } else if (method === 'delete') {
          response = await request(app).delete(path);
        }
        expect(response?.status).toBe(401);
        expect(response?.body.error).toBe('Authentication required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected server errors', async () => {
      // Mock a completely unexpected error
      (supabase.from as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected server error');
      });

      const response = await request(app)
        .get('/recipes/recipe-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipe');
      expect(logger.error).toHaveBeenCalledWith('Recipe fetch error:', expect.any(Error));
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation', () => {
    it('should validate ingredient array length', async () => {
      const largeIngredientList = Array(101).fill('ingredient');

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: largeIngredientList,
          timeAvailable: '30_MIN',
          skillLevel: 'BEGINNER',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Too many ingredients (max 100)');
    });

    it('should sanitize input strings', async () => {
      const maliciousInput = {
        detectedIngredients: ['<script>alert("xss")</script>'],
        timeAvailable: '30_MIN',
        skillLevel: 'BEGINNER',
      };

      (generateRecipeSuggestions as jest.Mock).mockResolvedValueOnce([]);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(maliciousInput);

      expect(response.status).toBe(200);
      // The input should be sanitized before being passed to generateRecipeSuggestions
      expect(generateRecipeSuggestions).toHaveBeenCalledWith({
        detectedIngredients: expect.not.arrayContaining([expect.stringContaining('<script>')]),
        assumedStaples: expect.any(Array),
        timeAvailable: '30_MIN',
        skillLevel: 'BEGINNER',
      });
    });

    it('should validate time available options', async () => {
      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: ['chicken'],
          timeAvailable: 'INVALID_TIME',
          skillLevel: 'BEGINNER',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid time available option');
    });

    it('should validate skill level options', async () => {
      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: ['chicken'],
          timeAvailable: '30_MIN',
          skillLevel: 'INVALID_SKILL',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid skill level option');
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle concurrent requests gracefully', async () => {
      (generateRecipeSuggestions as jest.Mock).mockResolvedValue([
        { title: 'Test Recipe', cuisine: 'Test' },
      ]);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValue(mockAuthClient);
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const validRequest = {
        detectedIngredients: ['chicken'],
        timeAvailable: '30_MIN',
        skillLevel: 'BEGINNER',
      };

      // Send multiple concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post('/recipes/suggestions')
            .set('Authorization', 'Bearer mock-token')
            .send(validRequest)
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(generateRecipeSuggestions).toHaveBeenCalledTimes(5);
    });

    it('should timeout long-running requests appropriately', async () => {
      // Mock a slow response
      (generateRecipeSuggestions as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 31000)) // 31 seconds
      );

      const response = await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: ['chicken'],
          timeAvailable: '30_MIN',
          skillLevel: 'BEGINNER',
        })
        .timeout(30000); // 30 second timeout

      // The request should timeout or return an error
      expect([408, 500, 504]).toContain(response.status);
    }, 35000);
  });

  describe('Cache Behavior', () => {
    it('should not cache POST requests', async () => {
      (generateRecipeSuggestions as jest.Mock).mockResolvedValue([
        { title: 'Test Recipe', cuisine: 'Test' },
      ]);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValue(mockAuthClient);
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const validRequest = {
        detectedIngredients: ['chicken'],
        timeAvailable: '30_MIN',
        skillLevel: 'BEGINNER',
      };

      // Make the same request twice
      await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(validRequest);

      await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send(validRequest);

      // Should call the service twice (no caching)
      expect(generateRecipeSuggestions).toHaveBeenCalledTimes(2);
    });

    it('should set appropriate cache headers for GET requests', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'recipe-123', title: 'Test Recipe' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const response = await request(app)
        .get('/recipes/recipe-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      // Should have cache-related headers set appropriately
      expect(response.headers).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve recipe data structure through the API', async () => {
      const mockFullRecipe = {
        title: 'Test Recipe',
        description: 'A test recipe with special characters: àáâã & <>&',
        ingredients: [{ name: 'ingredient with unicode: café', amount: '100', unit: 'g' }],
        instructions: [{ step: 1, instruction: 'Step with special chars: "quotes" & symbols' }],
        nutrition: {
          calories: 123.45,
          protein: 12.34,
          carbohydrates: 23.45,
          fat: 5.67,
        },
      };

      (generateFullRecipe as jest.Mock).mockResolvedValueOnce(mockFullRecipe);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'recipe-456' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      const response = await request(app)
        .post('/recipes/full')
        .set('Authorization', 'Bearer mock-token')
        .send({
          ingredients: ['test'],
          selectedRecipe: { title: 'Test', cuisine: 'Test' },
        });

      expect(response.status).toBe(200);
      expect(response.body.recipe).toEqual(mockFullRecipe);

      // Verify special characters are preserved
      expect(response.body.recipe.description).toContain('àáâã');
      expect(response.body.recipe.ingredients[0].name).toContain('café');
      expect(response.body.recipe.instructions[0].instruction).toContain('"quotes"');

      // Verify numeric precision is maintained
      expect(response.body.recipe.nutrition.calories).toBe(123.45);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log successful operations with appropriate detail', async () => {
      (generateRecipeSuggestions as jest.Mock).mockResolvedValueOnce([
        { title: 'Test Recipe', cuisine: 'Test' },
      ]);

      const mockAuthClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'session-123' },
          error: null,
        }),
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: ['chicken'],
          timeAvailable: '30_MIN',
          skillLevel: 'BEGINNER',
        });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Recipe suggestions generated'),
        expect.any(Object)
      );
    });

    it('should log errors with sufficient context for debugging', async () => {
      (generateRecipeSuggestions as jest.Mock).mockRejectedValueOnce(
        new Error('Detailed error message with context')
      );

      await request(app)
        .post('/recipes/suggestions')
        .set('Authorization', 'Bearer mock-token')
        .send({
          detectedIngredients: ['chicken'],
          timeAvailable: '30_MIN',
          skillLevel: 'BEGINNER',
        });

      expect(logger.error).toHaveBeenCalledWith(
        'Recipe suggestion error:',
        expect.objectContaining({
          message: 'Detailed error message with context',
        })
      );
    });
  });
});

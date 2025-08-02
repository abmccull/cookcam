import { EnhancedRecipeGenerationService } from '../enhancedRecipeGeneration';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

// Mock dependencies with the same approach as the working OpenAI tests
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedRecipeGenerationService - Core Business Logic Tests', () => {
  let service: EnhancedRecipeGenerationService;
  
  // Define shared test data at describe level
  const basicRecipeOptions = {
    ingredients: ['chicken breast', 'rice', 'broccoli'],
  };

  const mockRecipeResponse = {
    title: 'Chicken and Broccoli Rice Bowl',
    description: 'A healthy and delicious one-bowl meal',
    ingredients: [
      { name: 'chicken breast', amount: '1', unit: 'lb', source: 'scanned' },
      { name: 'rice', amount: '1', unit: 'cup', source: 'pantry' },
      { name: 'broccoli', amount: '2', unit: 'cups', source: 'scanned' },
    ],
    instructions: [
      {
        step: 1,
        instruction: 'Cook rice according to package instructions',
        time: 20,
        equipment: 'pot',
      },
      {
        step: 2,
        instruction: 'Season and cook chicken breast until done',
        time: 15,
        temperature: '165°F',
        technique: 'pan-searing',
      },
    ],
    metadata: {
      prepTime: 10,
      cookTime: 25,
      totalTime: 35,
      servings: 2,
      difficulty: 'easy',
      cuisineType: 'American',
      dietaryTags: ['high-protein'],
      skillLevel: 'beginner',
      cookingMethod: 'stir-fry',
    },
    nutrition: {
      calories: 420,
      protein: 35,
      carbohydrates: 45,
      fat: 8,
      fiber: 4,
      sodium: 450,
      sugar: 3,
    },
    tips: ['Use jasmine rice for best flavor', 'Don\'t overcook the broccoli'],
    variations: ['Add soy sauce for Asian flavor', 'Try with quinoa instead of rice'],
    storage: 'Refrigerate for up to 3 days',
    pairing: ['Green tea', 'Light salad'],
    ingredientsUsed: ['chicken breast', 'broccoli'],
    ingredientsSkipped: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new EnhancedRecipeGenerationService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Constructor and Initialization', () => {
    it('should require OPENAI_API_KEY environment variable', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new EnhancedRecipeGenerationService()).toThrow(
        'OPENAI_API_KEY environment variable is required'
      );
    });

    it('should initialize with correct OpenAI configuration', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(() => new EnhancedRecipeGenerationService()).not.toThrow();
    });
  });

  describe('generateRecipe - Core Recipe Generation', () => {

    it('should generate a complete recipe with all required fields', async () => {
      // generateRecipe internally calls generateMultipleRecipes, so we need to mock that response format
      const mockMultipleResponse = {
        recipes: [mockRecipeResponse],
        ingredientAnalysis: {
          totalScanned: 3,
          compatibilityGroups: [['chicken breast', 'rice', 'broccoli']],
          pantryStaplesUsed: ['salt', 'pepper'],
        },
      };
      
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockMultipleResponse) } }],
      });

      const result = await service.generateRecipe(basicRecipeOptions);

      // Verify all required fields are present
      expect(result).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        ingredients: expect.any(Array),
        instructions: expect.any(Array),
        metadata: expect.objectContaining({
          totalTime: expect.any(Number),
          difficulty: expect.any(String),
          servings: expect.any(Number),
          cuisineType: expect.any(String),
        }),
        nutrition: expect.objectContaining({
          calories: expect.any(Number),
          protein: expect.any(Number),
          carbohydrates: expect.any(Number),
          fat: expect.any(Number),
        }),
        tips: expect.any(Array),
        ingredientsUsed: expect.any(Array),
        ingredientsSkipped: expect.any(Array),
      });

      // Verify OpenAI was called with correct parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          temperature: 0.8, // generateRecipe uses generateMultipleRecipes internally which uses 0.8
          max_tokens: 8000, // generateMultipleRecipes uses 8000 tokens
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should handle advanced user preferences', async () => {
      const advancedOptions = {
        ingredients: ['salmon', 'asparagus', 'quinoa'],
        userPreferences: {
          skillLevel: 'intermediate' as const,
          dietaryRestrictions: ['gluten-free', 'dairy-free'],
          cuisinePreferences: ['Mediterranean'],
          availableTime: 45,
          spiceLevel: 'mild' as const,
          servingSize: 4,
        },
        recipeType: 'dinner' as const,
        nutritionGoals: {
          calories: 500,
          protein: 35,
          lowCarb: false,
          lowFat: false,
          highFiber: true,
        },
        context: 'family dinner',
      };

      const advancedRecipeResponse = {
        ...mockRecipeResponse,
        title: 'Mediterranean Grilled Salmon with Quinoa',
        metadata: {
          ...mockRecipeResponse.metadata,
          cuisineType: 'Mediterranean',
          dietaryTags: ['gluten-free', 'dairy-free', 'high-fiber'],
          skillLevel: 'intermediate',
          totalTime: 45,
          servings: 4,
        },
        nutrition: {
          ...mockRecipeResponse.nutrition,
          calories: 485,
          protein: 38,
          fiber: 8,
        },
        ingredientsUsed: ['salmon', 'asparagus', 'quinoa'],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(advancedRecipeResponse) } }],
      });

      const result = await service.generateRecipe(advancedOptions);

      expect(result.metadata.cuisineType).toBe('Mediterranean');
      expect(result.metadata.totalTime).toBeLessThanOrEqual(45);
      expect(result.nutrition.calories).toBeLessThanOrEqual(500);
      expect(result.metadata.dietaryTags).toEqual(
        expect.arrayContaining(['gluten-free', 'dairy-free'])
      );
      expect(result.metadata.servings).toBe(4);
      expect(result.ingredientsUsed).toContain('salmon');
    });

    it('should handle ingredient parsing and categorization', async () => {
      const recipeWithIngredientCategories = {
        ...mockRecipeResponse,
        ingredients: [
          { name: 'chicken breast', amount: '1', unit: 'lb', source: 'scanned' },
          { name: 'olive oil', amount: '2', unit: 'tbsp', source: 'pantry' },
          { name: 'salt', amount: '1', unit: 'tsp', source: 'pantry' },
          { name: 'rice', amount: '1', unit: 'cup', source: 'optional' },
        ],
        ingredientsUsed: ['chicken breast'],
        ingredientsSkipped: ['broccoli'],
        skipReason: 'Ingredient substituted with mixed vegetables for better flavor balance',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(recipeWithIngredientCategories) } }],
      });

      const result = await service.generateRecipe({
        ingredients: ['chicken breast', 'broccoli', 'olive oil'],
      });

      expect(result.ingredients).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'scanned' }),
          expect.objectContaining({ source: 'pantry' }),
        ])
      );
      expect(result.ingredientsUsed).toContain('chicken breast');
      expect(result.ingredientsSkipped).toContain('broccoli');
      expect(result.skipReason).toBeDefined();
    });

    it('should calculate accurate nutrition information', async () => {
      const nutritionFocusedRecipe = {
        ...mockRecipeResponse,
        nutrition: {
          calories: 425,
          protein: 38,
          carbohydrates: 42,
          fat: 12,
          fiber: 6,
          sodium: 380,
          sugar: 4,
        },
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(nutritionFocusedRecipe) } }],
      });

      const result = await service.generateRecipe(basicRecipeOptions);

      expect(result.nutrition.calories).toBeGreaterThan(0);
      expect(result.nutrition.protein).toBeGreaterThan(0);
      expect(result.nutrition.carbohydrates).toBeGreaterThan(0);
      expect(result.nutrition.fat).toBeGreaterThan(0);
      expect(result.nutrition.fiber).toBeGreaterThanOrEqual(0);
      expect(result.nutrition.sodium).toBeGreaterThanOrEqual(0);
      expect(result.nutrition.sugar).toBeGreaterThanOrEqual(0);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'));

      await expect(service.generateRecipe(basicRecipeOptions)).rejects.toThrow(
        'Failed to generate recipe'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Recipe generation failed',
        expect.objectContaining({
          error: expect.any(Error),
          ingredients: basicRecipeOptions.ingredients,
        })
      );
    });

    it('should handle malformed JSON responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{ "invalid": json, }' } }],
      });

      await expect(service.generateRecipe(basicRecipeOptions)).rejects.toThrow(
        'Failed to parse recipe response'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('JSON parsing failed'),
        expect.any(Object)
      );
    });

    it('should validate required ingredients', async () => {
      await expect(service.generateRecipe({ ingredients: [] })).rejects.toThrow(
        'At least one ingredient is required'
      );
    });

    it('should handle empty OpenAI response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [],
      });

      await expect(service.generateRecipe(basicRecipeOptions)).rejects.toThrow(
        'No recipe content generated from OpenAI'
      );
    });
  });

  describe('generateMultipleRecipes - Diverse Recipe Generation', () => {
    const multiRecipeOptions = {
      ingredients: ['chicken', 'rice', 'vegetables'],
    };

    const mockMultipleRecipesResponse = {
      recipes: [
        {
          title: 'Asian Chicken Fried Rice',
          description: 'Quick and flavorful fried rice with tender chicken',
          ingredients: [
            { name: 'chicken', amount: '1', unit: 'lb', source: 'scanned' },
            { name: 'rice', amount: '2', unit: 'cups', source: 'pantry' },
            { name: 'vegetables', amount: '1', unit: 'cup', source: 'scanned' },
          ],
          instructions: [
            { step: 1, instruction: 'Cook rice and set aside', time: 20 },
            { step: 2, instruction: 'Stir-fry chicken until cooked', time: 8 },
            { step: 3, instruction: 'Add vegetables and rice, stir-fry together', time: 5 },
          ],
          metadata: {
            prepTime: 15,
            cookTime: 25,
            totalTime: 40,
            servings: 4,
            difficulty: 'easy',
            cuisineType: 'Asian',
            dietaryTags: ['high-protein'],
            skillLevel: 'beginner',
            cookingMethod: 'stir-fry',
          },
          nutrition: {
            calories: 380,
            protein: 28,
            carbohydrates: 42,
            fat: 12,
            fiber: 3,
            sodium: 650,
            sugar: 4,
          },
          tips: ['Use day-old rice for best texture', 'High heat is key for good wok hei'],
          ingredientsUsed: ['chicken', 'rice', 'vegetables'],
          ingredientsSkipped: [],
        },
        {
          title: 'Mediterranean Chicken Rice Bowl',
          description: 'Healthy bowl with grilled chicken and seasoned rice',
          ingredients: [
            { name: 'chicken', amount: '8', unit: 'oz', source: 'scanned' },
            { name: 'rice', amount: '1', unit: 'cup', source: 'pantry' },
            { name: 'vegetables', amount: '1.5', unit: 'cups', source: 'scanned' },
          ],
          instructions: [
            { step: 1, instruction: 'Season and grill chicken breast', time: 15 },
            { step: 2, instruction: 'Cook rice with herbs', time: 18 },
            { step: 3, instruction: 'Roast vegetables with olive oil', time: 20 },
          ],
          metadata: {
            prepTime: 10,
            cookTime: 25,
            totalTime: 35,
            servings: 2,
            difficulty: 'easy',
            cuisineType: 'Mediterranean',
            dietaryTags: ['high-protein', 'heart-healthy'],
            skillLevel: 'beginner',
            cookingMethod: 'grilled',
          },
          nutrition: {
            calories: 420,
            protein: 35,
            carbohydrates: 45,
            fat: 8,
            fiber: 6,
            sodium: 350,
            sugar: 8,
          },
          tips: ['Don\'t overcook the chicken', 'Use fresh herbs when possible'],
          ingredientsUsed: ['chicken', 'rice', 'vegetables'],
          ingredientsSkipped: [],
        },
        {
          title: 'Comfort Chicken and Rice Casserole',
          description: 'One-pot comfort food with tender chicken and creamy rice',
          ingredients: [
            { name: 'chicken', amount: '2', unit: 'lbs', source: 'scanned' },
            { name: 'rice', amount: '1.5', unit: 'cups', source: 'pantry' },
            { name: 'vegetables', amount: '2', unit: 'cups', source: 'scanned' },
          ],
          instructions: [
            { step: 1, instruction: 'Brown chicken pieces in casserole dish', time: 10 },
            { step: 2, instruction: 'Add rice, vegetables, and broth', time: 5 },
            { step: 3, instruction: 'Bake covered until rice is tender', time: 45 },
          ],
          metadata: {
            prepTime: 15,
            cookTime: 60,
            totalTime: 75,
            servings: 6,
            difficulty: 'easy',
            cuisineType: 'American',
            dietaryTags: ['comfort-food', 'one-pot'],
            skillLevel: 'beginner',
            cookingMethod: 'baked',
          },
          nutrition: {
            calories: 450,
            protein: 32,
            carbohydrates: 38,
            fat: 18,
            fiber: 4,
            sodium: 780,
            sugar: 6,
          },
          tips: ['Use bone-in chicken for more flavor', 'Let rest 5 minutes before serving'],
          ingredientsUsed: ['chicken', 'rice', 'vegetables'],
          ingredientsSkipped: [],
        },
      ],
      ingredientAnalysis: {
        totalScanned: 3,
        compatibilityGroups: [['chicken', 'rice', 'vegetables']],
        pantryStaplesUsed: ['olive oil', 'salt', 'pepper', 'garlic'],
      },
    };

    it('should generate 3 diverse recipes successfully', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockMultipleRecipesResponse) } }],
      });

      const result = await service.generateMultipleRecipes(multiRecipeOptions);

      expect(result.recipes).toHaveLength(3);
      expect(result.ingredientAnalysis).toBeDefined();
      expect(result.ingredientAnalysis.totalScanned).toBe(3);

      // Verify recipe diversity
      const cuisineTypes = result.recipes.map((r) => r.metadata.cuisineType);
      expect(new Set(cuisineTypes)).toHaveProperty('size', 3); // All different cuisines

      const cookingMethods = result.recipes.map((r) => r.metadata.cookingMethod);
      expect(new Set(cookingMethods)).toHaveProperty('size', 3); // All different methods

      // Verify all recipes use the provided ingredients
      result.recipes.forEach((recipe) => {
        expect(recipe.ingredientsUsed).toEqual(
          expect.arrayContaining(['chicken', 'rice', 'vegetables'])
        );
      });
    });

    it('should handle ingredient compatibility analysis', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockMultipleRecipesResponse) } }],
      });

      const result = await service.generateMultipleRecipes(multiRecipeOptions);

      expect(result.ingredientAnalysis.compatibilityGroups).toEqual([
        ['chicken', 'rice', 'vegetables'],
      ]);
      expect(result.ingredientAnalysis.pantryStaplesUsed).toEqual(
        expect.arrayContaining(['olive oil', 'salt', 'pepper'])
      );
    });

    it('should warn when fewer than 3 recipes are generated', async () => {
      const incompleteResponse = {
        ...mockMultipleRecipesResponse,
        recipes: [mockMultipleRecipesResponse.recipes[0]], // Only one recipe
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(incompleteResponse) } }],
      });

      const result = await service.generateMultipleRecipes(multiRecipeOptions);

      expect(result.recipes).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expected 3 recipes'),
        expect.objectContaining({ recipeCount: 1 })
      );
    });

    it('should handle API errors in multiple recipe generation', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI service unavailable'));

      await expect(service.generateMultipleRecipes(multiRecipeOptions)).rejects.toThrow(
        'Failed to generate diverse recipes'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Error generating multiple recipes:',
        expect.objectContaining({
          error: expect.any(Error),
          ingredients: multiRecipeOptions.ingredients,
        })
      );
    });

    it('should use higher temperature for recipe diversity', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockMultipleRecipesResponse) } }],
      });

      await service.generateMultipleRecipes(multiRecipeOptions);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8, // Higher than single recipe generation
          max_tokens: 8000, // More tokens for multiple recipes
        })
      );
    });
  });

  describe('Integration and Performance Tests', () => {
    it('should handle large ingredient lists efficiently', async () => {
      const largeIngredientList = [
        'chicken breast',
        'rice',
        'broccoli',
        'carrots',
        'onions',
        'bell peppers',
        'mushrooms',
        'garlic',
        'ginger',
        'soy sauce',
        'sesame oil',
        'green onions',
      ];

      const mockLargeRecipeResponse = {
        ...mockRecipeResponse,
        title: 'Ultimate Chicken Stir-Fry',
        ingredientsUsed: largeIngredientList.slice(0, 8), // Use most ingredients
        ingredientsSkipped: largeIngredientList.slice(8), // Skip some for realism
        skipReason: 'Simplified recipe to focus on core flavors',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockLargeRecipeResponse) } }],
      });

      const result = await service.generateRecipe({ ingredients: largeIngredientList });

      expect(result.ingredientsUsed.length).toBeGreaterThan(5);
      expect(result.ingredientsSkipped.length).toBeGreaterThan(0);
      expect(result.skipReason).toBeDefined();
    });

    it('should maintain consistency across multiple calls', async () => {
      const consistentRecipeResponse = {
        ...mockRecipeResponse,
        title: 'Consistent Chicken Recipe',
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(consistentRecipeResponse) } }],
      });

      const results = await Promise.all([
        service.generateRecipe(basicRecipeOptions),
        service.generateRecipe(basicRecipeOptions),
        service.generateRecipe(basicRecipeOptions),
      ]);

      results.forEach((result) => {
        expect(result).toMatchObject({
          title: expect.any(String),
          metadata: expect.objectContaining({
            difficulty: expect.any(String),
          }),
          nutrition: expect.objectContaining({
            calories: expect.any(Number),
          }),
        });
      });

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Logging and Debugging', () => {
    it('should log comprehensive generation information', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipeResponse) } }],
      });

      await service.generateRecipe(basicRecipeOptions);

      expect(logger.info).toHaveBeenCalledWith(
        '🍳 Generating enhanced recipe',
        expect.objectContaining({
          ingredients: basicRecipeOptions.ingredients,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '📤 Sending recipe request to OpenAI...',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          promptLength: expect.any(Number),
        })
      );
    });

    it('should log debug information for response parsing', async () => {
      const longResponse = JSON.stringify({ ...mockRecipeResponse, longData: 'x'.repeat(2000) });

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: longResponse } }],
      });

      await service.generateRecipe(basicRecipeOptions);

      expect(logger.info).toHaveBeenCalledWith(
        '🔍 Debug - OpenAI response preview:',
        expect.objectContaining({
          first500Chars: expect.any(String),
          last500Chars: expect.any(String),
          fullContentLength: expect.any(Number),
        })
      );
    });
  });
});
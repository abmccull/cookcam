import { EnhancedRecipeGenerationService } from '../enhancedRecipeGeneration';
import { createMockSupabaseClient, createMockOpenAI, mockEnvVars } from '../../__tests__/utils/testHelpers';
import { mockUsers, mockRecipes, mockIngredients } from '../../__tests__/utils/mockData';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: mockSupabaseClient,
}));

jest.mock('openai');

const mockSupabaseClient = createMockSupabaseClient();
const mockOpenAI = createMockOpenAI();

// Mock environment variables
Object.assign(process.env, mockEnvVars);

describe('EnhancedRecipeGenerationService - Comprehensive', () => {
  let service: EnhancedRecipeGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EnhancedRecipeGenerationService();
    // Mock OpenAI instance
    (service as any).openai = mockOpenAI;
  });

  describe('generateRecipeFromIngredients', () => {
    const baseIngredients = [
      { name: 'chicken breast', amount: '1 lb', confidence: 0.95 },
      { name: 'broccoli', amount: '2 cups', confidence: 0.88 },
      { name: 'rice', amount: '1 cup', confidence: 0.92 },
    ];

    it('should generate recipe with dietary preferences', async () => {
      const mockRecipeResponse = {
        title: 'Healthy Chicken and Broccoli Bowl',
        description: 'A nutritious and delicious meal',
        instructions: [
          'Season and cook chicken breast',
          'Steam broccoli until tender',
          'Cook rice according to package directions',
          'Combine and serve',
        ],
        prep_time: 15,
        cook_time: 25,
        servings: 4,
        difficulty: 'easy',
        cuisine_type: 'healthy',
        nutrition: {
          calories: 450,
          protein: 35,
          carbs: 45,
          fat: 8,
          fiber: 4,
        },
        tags: ['healthy', 'high-protein', 'gluten-free'],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockRecipeResponse),
          },
        }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [{ ...mockRecipeResponse, id: 'recipe-123' }],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id,
        {
          dietary_preferences: ['gluten-free', 'high-protein'],
          cuisine_type: 'healthy',
          difficulty: 'easy',
          cook_time_max: 30,
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.title).toBe(mockRecipeResponse.title);
      expect(result.data.tags).toContain('gluten-free');
      expect(result.data.nutrition.protein).toBeGreaterThan(30);
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('gluten-free'),
            }),
          ]),
        })
      );
    });

    it('should handle vegan dietary restrictions', async () => {
      const veganIngredients = [
        { name: 'tofu', amount: '1 block', confidence: 0.9 },
        { name: 'vegetables', amount: '2 cups', confidence: 0.85 },
        { name: 'quinoa', amount: '1 cup', confidence: 0.88 },
      ];

      const mockVeganRecipe = {
        title: 'Tofu Quinoa Power Bowl',
        instructions: ['Press tofu', 'Cook quinoa', 'Sauté vegetables', 'Combine'],
        tags: ['vegan', 'high-protein', 'dairy-free'],
        nutrition: { protein: 20, calories: 380 },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockVeganRecipe) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockVeganRecipe],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        veganIngredients,
        mockUsers.free.id,
        { dietary_preferences: ['vegan'] }
      );

      expect(result.success).toBe(true);
      expect(result.data.tags).toContain('vegan');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('vegan'),
            }),
          ]),
        })
      );
    });

    it('should adapt to cooking skill level', async () => {
      const mockBeginnerRecipe = {
        title: 'Simple Chicken Rice Bowl',
        difficulty: 'easy',
        instructions: [
          'Cook rice in rice cooker',
          'Season chicken with salt and pepper',
          'Cook chicken in pan for 6-7 minutes per side',
          'Steam broccoli in microwave for 3 minutes',
        ],
        tips: ['Use a meat thermometer to check doneness'],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockBeginnerRecipe) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockBeginnerRecipe],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id,
        { difficulty: 'easy', cooking_skill: 'beginner' }
      );

      expect(result.success).toBe(true);
      expect(result.data.difficulty).toBe('easy');
      expect(result.data.instructions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('rice cooker'),
          expect.stringContaining('meat thermometer'),
        ])
      );
    });

    it('should handle time constraints', async () => {
      const mockQuickRecipe = {
        title: '15-Minute Chicken Stir Fry',
        prep_time: 5,
        cook_time: 10,
        total_time: 15,
        instructions: [
          'Heat oil in large pan',
          'Add chicken, cook 3-4 minutes',
          'Add vegetables, stir-fry 5 minutes',
          'Serve over pre-cooked rice',
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockQuickRecipe) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockQuickRecipe],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id,
        { cook_time_max: 15, prep_time_max: 5 }
      );

      expect(result.success).toBe(true);
      expect(result.data.total_time).toBeLessThanOrEqual(15);
      expect(result.data.instructions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pre-cooked rice'),
        ])
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate recipe');
    });

    it('should handle invalid JSON responses from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response from AI',
          },
        }],
      });

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse recipe');
    });

    it('should save generated recipe to database', async () => {
      const mockRecipe = {
        title: 'Test Recipe',
        instructions: ['Step 1', 'Step 2'],
        ingredients: baseIngredients,
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [{ ...mockRecipe, id: 'recipe-456' }],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        baseIngredients,
        mockUsers.free.id
      );

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockRecipe.title,
          created_by: mockUsers.free.id,
          instructions: mockRecipe.instructions,
          ingredients: baseIngredients,
        })
      );
    });
  });

  describe('enhanceRecipeWithNutrition', () => {
    it('should calculate accurate nutrition information', async () => {
      const recipe = {
        ...mockRecipes.basic,
        ingredients: [
          { name: 'chicken breast', amount: '1 lb', fdc_id: '123456' },
          { name: 'broccoli', amount: '2 cups', fdc_id: '789012' },
        ],
      };

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [
          {
            fdc_id: '123456',
            nutrients: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
          },
          {
            fdc_id: '789012',
            nutrients: { calories: 55, protein: 4, fat: 0.6, carbs: 11 },
          },
        ],
        error: null,
      });

      const result = await service.enhanceRecipeWithNutrition(recipe);

      expect(result.success).toBe(true);
      expect(result.data.nutrition.calories).toBeCloseTo(220, 0);
      expect(result.data.nutrition.protein).toBeCloseTo(35, 0);
      expect(result.data.nutrition_per_serving.calories).toBeCloseTo(55, 0);
    });

    it('should handle missing ingredient nutrition data', async () => {
      const recipe = {
        ...mockRecipes.basic,
        ingredients: [
          { name: 'unknown ingredient', amount: '1 cup' },
        ],
      };

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.enhanceRecipeWithNutrition(recipe);

      expect(result.success).toBe(true);
      expect(result.data.nutrition.calories).toBe(0);
      expect(result.data.missing_nutrition).toContain('unknown ingredient');
    });
  });

  describe('validateRecipeContent', () => {
    it('should validate complete recipe structure', () => {
      const validRecipe = {
        title: 'Valid Recipe',
        description: 'A good description',
        instructions: ['Step 1', 'Step 2', 'Step 3'],
        ingredients: [
          { name: 'ingredient 1', amount: '1 cup' },
          { name: 'ingredient 2', amount: '2 tbsp' },
        ],
        prep_time: 15,
        cook_time: 30,
        servings: 4,
      };

      const result = service.validateRecipeContent(validRecipe);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing required fields', () => {
      const incompleteRecipe = {
        title: 'Incomplete Recipe',
        // Missing instructions, ingredients, etc.
      };

      const result = service.validateRecipeContent(incompleteRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Instructions are required');
      expect(result.errors).toContain('Ingredients are required');
    });

    it('should validate instruction clarity', () => {
      const unclearRecipe = {
        title: 'Unclear Recipe',
        instructions: ['Cook', 'Add stuff', 'Done'],
        ingredients: [{ name: 'stuff', amount: 'some' }],
        prep_time: 10,
        cook_time: 20,
        servings: 2,
      };

      const result = service.validateRecipeContent(unclearRecipe);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Instructions may be too vague');
      expect(result.warnings).toContain('Ingredient amounts should be specific');
    });

    it('should validate reasonable timing', () => {
      const unreasonableRecipe = {
        title: 'Unreasonable Recipe',
        instructions: ['Cook chicken'],
        ingredients: [{ name: 'chicken', amount: '1 lb' }],
        prep_time: 0,
        cook_time: 1,
        servings: 4,
      };

      const result = service.validateRecipeContent(unreasonableRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cook time seems unrealistic');
    });
  });

  describe('generateRecipeVariations', () => {
    it('should create dietary variations', async () => {
      const baseRecipe = mockRecipes.basic;
      
      const mockVariations = [
        {
          title: 'Vegan Simple Pasta',
          description: 'Plant-based version with cashew cream',
          dietary_tags: ['vegan', 'dairy-free'],
          ingredient_substitutions: {
            'parmesan cheese': 'nutritional yeast',
            'butter': 'olive oil',
          },
        },
        {
          title: 'Gluten-Free Simple Pasta',
          description: 'Made with rice pasta',
          dietary_tags: ['gluten-free'],
          ingredient_substitutions: {
            'pasta': 'rice pasta',
          },
        },
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockVariations),
          },
        }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: mockVariations.map((v, i) => ({ ...v, id: `variation-${i}` })),
        error: null,
      });

      const result = await service.generateRecipeVariations(
        baseRecipe,
        ['vegan', 'gluten-free']
      );

      expect(result.success).toBe(true);
      expect(result.data.variations).toHaveLength(2);
      expect(result.data.variations[0].dietary_tags).toContain('vegan');
      expect(result.data.variations[1].dietary_tags).toContain('gluten-free');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequent ingredient combinations', async () => {
      const commonIngredients = [
        { name: 'chicken', amount: '1 lb' },
        { name: 'rice', amount: '1 cup' },
      ];

      // First generation - should hit OpenAI
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipes.basic) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockRecipes.basic],
        error: null,
      });

      await service.generateRecipeFromIngredients(
        commonIngredients,
        mockUsers.free.id
      );

      // Second generation with same ingredients - should use cache
      const result = await service.generateRecipeFromIngredients(
        commonIngredients,
        mockUsers.premium.id
      );

      expect(result.success).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent generation requests', async () => {
      const ingredients = [{ name: 'test', amount: '1 cup' }];
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockRecipes.basic) } }],
      });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockRecipes.basic],
        error: null,
      });

      const promises = Array(5).fill(null).map(() =>
        service.generateRecipeFromIngredients(ingredients, mockUsers.free.id)
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should retry on transient OpenAI failures', async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockRecipes.basic) } }],
        });

      mockSupabaseClient.from().insert().select().mockResolvedValue({
        data: [mockRecipes.basic],
        error: null,
      });

      const result = await service.generateRecipeFromIngredients(
        [{ name: 'test', amount: '1 cup' }],
        mockUsers.free.id
      );

      expect(result.success).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should provide fallback when AI completely fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await service.generateRecipeFromIngredients(
        [{ name: 'chicken', amount: '1 lb' }],
        mockUsers.free.id,
        { enable_fallback: true }
      );

      expect(result.success).toBe(true);
      expect(result.data.title).toContain('Simple');
      expect(result.data.source).toBe('fallback');
    });
  });
});
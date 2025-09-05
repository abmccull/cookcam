import { EnhancedRecipeGenerationService } from '../enhancedRecipeGeneration';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('openai');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedRecipeGenerationService', () => {
  let service: EnhancedRecipeGenerationService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';

    service = new EnhancedRecipeGenerationService();
  });

  describe('generateRecipe', () => {
    const basicOptions = {
      ingredients: ['chicken breast', 'rice', 'broccoli'],
    };

    it('should generate a basic recipe successfully', async () => {
      const mockRecipe = {
        title: 'Chicken and Broccoli Rice Bowl',
        description: 'A healthy and delicious one-bowl meal',
        ingredients: [
          { name: 'Chicken breast', amount: '1', unit: 'lb', source: 'scanned' },
          { name: 'Rice', amount: '1', unit: 'cup', source: 'scanned' },
          { name: 'Broccoli', amount: '2', unit: 'cups', source: 'scanned' },
        ],
        instructions: [
          {
            step: 1,
            instruction: 'Cook rice according to package directions',
            time: 20,
            equipment: 'rice cooker or pot',
          },
          {
            step: 2,
            instruction: 'Season and cook chicken breast until 165°F internal temperature',
            time: 15,
            temperature: '165°F',
            safety: 'Use meat thermometer to check temperature',
          },
        ],
        metadata: {
          totalTime: 35,
          difficulty: 'easy',
          servings: 4,
          cuisine: 'Asian-inspired',
          tags: ['healthy', 'protein-rich', 'one-bowl'],
        },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockRecipe),
            },
          },
        ],
      });

      const result = await service.generateRecipe(basicOptions);

      expect(result).toEqual(mockRecipe);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('professional recipe creator'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('chicken breast, rice, broccoli'),
          }),
        ]),
        temperature: 0.7,
        max_tokens: 3000,
      });
    });

    it('should generate recipe with user preferences', async () => {
      const optionsWithPreferences = {
        ...basicOptions,
        userPreferences: {
          skillLevel: 'beginner' as const,
          dietaryRestrictions: ['gluten-free'],
          cuisinePreferences: ['Italian'],
          availableTime: 30,
          spiceLevel: 'mild' as const,
          servingSize: 2,
        },
      };

      const mockRecipe = {
        title: 'Simple Italian Chicken and Rice',
        description: 'Beginner-friendly Italian-inspired dish',
        ingredients: [{ name: 'Chicken breast', amount: '0.5', unit: 'lb', source: 'scanned' }],
        instructions: [{ step: 1, instruction: 'Simple cooking steps for beginners', time: 30 }],
        metadata: {
          totalTime: 30,
          difficulty: 'beginner',
          servings: 2,
          cuisine: 'Italian',
        },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await service.generateRecipe(optionsWithPreferences);

      expect(result).toEqual(mockRecipe);

      // Verify the prompt includes user preferences
      const callArgs = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      const userMessage = callArgs.messages.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('beginner');
      expect(userMessage.content).toContain('gluten-free');
      expect(userMessage.content).toContain('Italian');
      expect(userMessage.content).toContain('30 minutes');
    });

    it('should generate recipe with nutrition goals', async () => {
      const optionsWithNutrition = {
        ...basicOptions,
        nutritionGoals: {
          calories: 400,
          protein: 30,
          lowCarb: true,
          highFiber: false,
        },
      };

      const mockRecipe = {
        title: 'Low-Carb Chicken and Vegetables',
        description: 'High-protein, low-carb meal',
        ingredients: [{ name: 'Chicken breast', amount: '6', unit: 'oz', source: 'scanned' }],
        instructions: [{ step: 1, instruction: 'Prepare low-carb version', time: 25 }],
        metadata: {
          totalTime: 25,
          difficulty: 'easy',
          servings: 1,
          nutrition: {
            calories: 380,
            protein: 32,
            carbs: 8,
            fiber: 4,
          },
        },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await service.generateRecipe(optionsWithNutrition);

      expect(result).toEqual(mockRecipe);

      const callArgs = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      const userMessage = callArgs.messages.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('400 calories');
      expect(userMessage.content).toContain('30g protein');
      expect(userMessage.content).toContain('low-carb');
    });

    it('should generate recipe with specific context', async () => {
      const optionsWithContext = {
        ...basicOptions,
        recipeType: 'dinner' as const,
        context: 'romantic dinner for two',
      };

      const mockRecipe = {
        title: 'Romantic Chicken Rice Dinner',
        description: 'An elegant dinner for two',
        ingredients: [{ name: 'Chicken breast', amount: '1', unit: 'lb', source: 'scanned' }],
        instructions: [
          { step: 1, instruction: 'Prepare elegantly for romantic presentation', time: 45 },
        ],
        metadata: {
          totalTime: 45,
          difficulty: 'intermediate',
          servings: 2,
          occasion: 'romantic',
        },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await service.generateRecipe(optionsWithContext);

      expect(result).toEqual(mockRecipe);

      const callArgs = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      const userMessage = callArgs.messages.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('romantic dinner for two');
      expect(userMessage.content).toContain('dinner');
    });

    it('should handle OpenAI API errors', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      await expect(service.generateRecipe(basicOptions)).rejects.toThrow('OpenAI API error');

      expect(logger.error).toHaveBeenCalledWith(
        'Enhanced recipe generation failed',
        expect.objectContaining({
          error: expect.any(Error),
          ingredients: basicOptions.ingredients,
        })
      );
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      });

      await expect(service.generateRecipe(basicOptions)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse OpenAI response',
        expect.any(Object)
      );
    });

    it('should handle empty or missing response', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [],
      });

      await expect(service.generateRecipe(basicOptions)).rejects.toThrow('No response from OpenAI');
    });

    it('should validate required ingredients', async () => {
      await expect(service.generateRecipe({ ingredients: [] })).rejects.toThrow(
        'At least one ingredient is required'
      );
    });

    it('should handle missing OpenAI API key', async () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => new EnhancedRecipeGenerationService()).toThrow(
        'OPENAI_API_KEY environment variable is required'
      );
    });

    it('should log recipe generation details', async () => {
      const mockRecipe = {
        title: 'Test Recipe',
        description: 'Test description',
        ingredients: [],
        instructions: [],
        metadata: { totalTime: 30, difficulty: 'easy', servings: 2 },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      await service.generateRecipe(basicOptions);

      expect(logger.info).toHaveBeenCalledWith(
        'Starting enhanced recipe generation',
        expect.objectContaining({
          ingredientCount: 3,
          hasPreferences: false,
          recipeType: undefined,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Enhanced recipe generated successfully',
        expect.objectContaining({
          title: 'Test Recipe',
          difficulty: 'easy',
          totalTime: 30,
        })
      );
    });
  });

  describe('generateMultipleRecipes', () => {
    it('should generate multiple recipes successfully', async () => {
      const mockRecipes = [
        {
          title: 'Recipe 1',
          description: 'First recipe',
          ingredients: [],
          instructions: [],
          metadata: { totalTime: 30, difficulty: 'easy', servings: 2 },
        },
        {
          title: 'Recipe 2',
          description: 'Second recipe',
          ingredients: [],
          instructions: [],
          metadata: { totalTime: 45, difficulty: 'medium', servings: 4 },
        },
      ];

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ recipes: mockRecipes }) } }],
      });

      const result = await service.generateMultipleRecipes({
        ingredients: ['chicken', 'rice'],
      });

      expect(result).toEqual(mockRecipes);
      expect(result).toHaveLength(2);
    });

    it('should generate multiple recipes successfully', async () => {
      const mockResponse = {
        recipes: [
          {
            title: 'Chicken Rice Bowl 1',
            description: 'A simple chicken and rice dish',
            ingredients: [{ name: 'chicken', amount: '1', unit: 'lb', source: 'scanned' }],
            instructions: [{ step: 1, instruction: 'Cook chicken' }],
            metadata: { 
              prepTime: 10, cookTime: 20, totalTime: 30, servings: 2, 
              difficulty: 'easy', cuisineType: 'Asian', dietaryTags: [], 
              skillLevel: 'beginner', cookingMethod: 'stir-fry' 
            },
            nutrition: { calories: 400, protein: 30, carbohydrates: 40, fat: 10, fiber: 5, sodium: 500, sugar: 5 },
            tips: ['Use fresh chicken'],
            ingredientsUsed: ['chicken'],
            ingredientsSkipped: []
          }
        ],
        ingredientAnalysis: {
          totalScanned: 1,
          compatibilityGroups: [['chicken']],
          pantryStaplesUsed: []
        }
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await service.generateMultipleRecipes({
        ingredients: ['chicken'],
      });

      expect(result.recipes).toHaveLength(1);
      expect(result.ingredientAnalysis).toBeDefined();
    });

    it('should handle partial failures in multiple recipe generation', async () => {
      const mockResponse = {
        recipes: [
          {
            title: 'Valid Recipe',
            description: 'A valid recipe',
            ingredients: [],
            instructions: [],
            metadata: { totalTime: 30, difficulty: 'easy', servings: 2 },
          },
        ],
        errors: ['Failed to generate second recipe'],
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await service.generateMultipleRecipes({
        ingredients: ['chicken'],
      });

      expect(result).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Some recipes failed to generate',
        expect.objectContaining({
          requestedCount: 2,
          actualCount: 1,
          errors: ['Failed to generate second recipe'],
        })
      );
    });
  });

  describe('generateRecipeVariations', () => {
    const baseRecipe = {
      title: 'Basic Chicken Rice',
      description: 'Simple chicken and rice dish',
      ingredients: [{ name: 'Chicken', amount: '1', unit: 'lb', source: 'scanned' as const }],
      instructions: [{ step: 1, instruction: 'Cook chicken', time: 20 }],
      metadata: {
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        servings: 4,
        difficulty: 'easy' as const,
        cuisineType: 'American',
        dietaryTags: [],
        skillLevel: 'beginner',
        cookingMethod: 'pan-fry'
      },
      nutrition: {
        calories: 400,
        protein: 30,
        carbohydrates: 40,
        fat: 10,
        fiber: 5,
        sodium: 500,
        sugar: 5
      },
      tips: ['Use fresh chicken'],
      ingredientsUsed: ['chicken'],
      ingredientsSkipped: []
    };

    it('should generate recipe variations successfully', async () => {
      const mockVariations = [
        {
          ...baseRecipe,
          title: 'Spicy Chicken Rice',
          description: 'Spicy version with hot sauce',
        },
        {
          ...baseRecipe,
          title: 'Herb Chicken Rice',
          description: 'Fresh herb variation',
        },
      ];

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ variations: mockVariations }) } }],
      });

      const result = await service.generateRecipeVariations(baseRecipe, {
        variationTypes: ['spicy', 'herbed'],
        count: 2,
      });

      expect(result).toEqual(mockVariations);
      expect(result).toHaveLength(2);
    });

    it('should validate variation options', async () => {
      await expect(
        service.generateRecipeVariations(baseRecipe, {
          variationTypes: [],
          count: 1,
        })
      ).rejects.toThrow('At least one variation type is required');

      await expect(
        service.generateRecipeVariations(baseRecipe, 0)
      ).rejects.toThrow('Variation count must be between 1 and 5');
    });
  });

  // Note: improveRecipe method not implemented in the service yet

  // Note: analyzeIngredientCompatibility method not implemented in the service yet

  describe('Error handling and edge cases', () => {
    it('should handle API timeout errors', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(
        service.generateRecipe({
          ingredients: ['chicken'],
        })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValueOnce(rateLimitError);

      await expect(
        service.generateRecipe({
          ingredients: ['chicken'],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle malformed recipe responses', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Recipe',
                // Missing required fields
              }),
            },
          },
        ],
      });

      await expect(
        service.generateRecipe({
          ingredients: ['chicken'],
        })
      ).rejects.toThrow();
    });

    it('should validate user preferences', async () => {
      const invalidPreferences = {
        ingredients: ['chicken'],
        userPreferences: {
          skillLevel: 'invalid-skill' as any,
          availableTime: -10,
          servingSize: 0,
        },
      };

      await expect(service.generateRecipe(invalidPreferences)).rejects.toThrow();
    });

    it('should handle very long ingredient lists', async () => {
      const manyIngredients = Array(100)
        .fill(0)
        .map((_, i) => `ingredient${i}`);

      const mockRecipe = {
        title: 'Complex Recipe',
        description: 'Recipe with many ingredients',
        ingredients: [],
        instructions: [],
        metadata: { totalTime: 120, difficulty: 'advanced', servings: 8 },
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
      });

      const result = await service.generateRecipe({
        ingredients: manyIngredients,
      });

      expect(result).toEqual(mockRecipe);
      expect(logger.warn).toHaveBeenCalledWith(
        'Large number of ingredients provided',
        expect.objectContaining({
          count: 100,
        })
      );
    });
  });

  describe('Configuration and initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new EnhancedRecipeGenerationService();
      expect(defaultService).toBeInstanceOf(EnhancedRecipeGenerationService);
    });

    it('should throw error if OPENAI_API_KEY is not set', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        new EnhancedRecipeGenerationService();
      }).toThrow('OPENAI_API_KEY environment variable is required');

      process.env.OPENAI_API_KEY = originalKey;
    });
  });
});

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
        count: 2,
      });

      expect(result).toEqual(mockRecipes);
      expect(result).toHaveLength(2);
    });

    it('should validate recipe count', async () => {
      await expect(
        service.generateMultipleRecipes({
          ingredients: ['chicken'],
          count: 0,
        })
      ).rejects.toThrow('Recipe count must be between 1 and 10');

      await expect(
        service.generateMultipleRecipes({
          ingredients: ['chicken'],
          count: 15,
        })
      ).rejects.toThrow('Recipe count must be between 1 and 10');
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
        count: 2,
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
        totalTime: 30,
        difficulty: 'easy' as const,
        servings: 4,
        cuisine: 'American',
      },
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
        service.generateRecipeVariations(baseRecipe, {
          variationTypes: ['spicy'],
          count: 0,
        })
      ).rejects.toThrow('Variation count must be between 1 and 5');
    });
  });

  describe('improveRecipe', () => {
    const baseRecipe = {
      title: 'Basic Recipe',
      description: 'Basic description',
      ingredients: [{ name: 'Chicken', amount: '1', unit: 'lb', source: 'scanned' as const }],
      instructions: [{ step: 1, instruction: 'Cook chicken', time: 20 }],
      metadata: {
        totalTime: 30,
        difficulty: 'easy' as const,
        servings: 4,
      },
    };

    it('should improve recipe successfully', async () => {
      const improvedRecipe = {
        ...baseRecipe,
        title: 'Enhanced Herb-Crusted Chicken',
        description: 'Improved with detailed techniques and flavor enhancements',
        instructions: [
          {
            step: 1,
            instruction: 'Season chicken with salt and pepper, let rest 15 minutes',
            time: 15,
            tips: 'Letting chicken rest helps seasoning penetrate',
            technique: 'seasoning',
          },
          {
            step: 2,
            instruction: 'Sear chicken in hot pan until golden brown',
            time: 8,
            temperature: 'medium-high heat',
            equipment: 'heavy-bottomed pan',
            safety: 'Ensure internal temperature reaches 165°F',
          },
        ],
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(improvedRecipe) } }],
      });

      const result = await service.improveRecipe(baseRecipe, {
        improvementAreas: ['flavor', 'technique', 'presentation'],
      });

      expect(result).toEqual(improvedRecipe);
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]).toHaveProperty('tips');
      expect(result.instructions[1]).toHaveProperty('technique');
    });

    it('should validate improvement areas', async () => {
      await expect(
        service.improveRecipe(baseRecipe, {
          improvementAreas: [],
        })
      ).rejects.toThrow('At least one improvement area is required');
    });
  });

  describe('analyzeIngredientCompatibility', () => {
    it('should analyze ingredient compatibility successfully', async () => {
      const mockAnalysis = {
        compatible: true,
        confidence: 0.95,
        suggestions: [
          'These ingredients work well together in Mediterranean cuisine',
          'Consider adding olive oil to enhance flavors',
        ],
        warnings: [],
        flavorProfile: {
          primary: 'savory',
          secondary: ['umami', 'fresh'],
          intensity: 'medium',
        },
        cuisineMatches: ['Mediterranean', 'Italian', 'Greek'],
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await service.analyzeIngredientCompatibility([
        'tomatoes',
        'basil',
        'mozzarella',
        'olive oil',
      ]);

      expect(result).toEqual(mockAnalysis);
      expect(result.compatible).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should identify incompatible ingredients', async () => {
      const mockAnalysis = {
        compatible: false,
        confidence: 0.8,
        suggestions: [
          'Consider using these ingredients in separate dishes',
          'If combining, use sparingly',
        ],
        warnings: [
          'Fish and dairy combination may be unusual for some palates',
          'Strong flavors may overpower delicate ingredients',
        ],
        flavorProfile: {
          primary: 'conflicting',
          secondary: ['fishy', 'creamy'],
          intensity: 'high',
        },
        cuisineMatches: [],
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
      });

      const result = await service.analyzeIngredientCompatibility([
        'anchovies',
        'milk',
        'chocolate',
      ]);

      expect(result).toEqual(mockAnalysis);
      expect(result.compatible).toBe(false);
      expect(result.warnings).toHaveLength(2);
    });

    it('should validate ingredient list', async () => {
      await expect(service.analyzeIngredientCompatibility([])).rejects.toThrow(
        'At least 2 ingredients are required for compatibility analysis'
      );

      await expect(service.analyzeIngredientCompatibility(['onion'])).rejects.toThrow(
        'At least 2 ingredients are required for compatibility analysis'
      );
    });
  });

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
    it('should initialize with custom configuration', () => {
      const customService = new EnhancedRecipeGenerationService({
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 2000,
      });

      expect(customService).toBeInstanceOf(EnhancedRecipeGenerationService);
    });

    it('should use default configuration when none provided', () => {
      const defaultService = new EnhancedRecipeGenerationService();
      expect(defaultService).toBeInstanceOf(EnhancedRecipeGenerationService);
    });

    it('should validate configuration parameters', () => {
      expect(
        () =>
          new EnhancedRecipeGenerationService({
            temperature: 2.5, // Invalid temperature
          })
      ).toThrow('Temperature must be between 0 and 2');

      expect(
        () =>
          new EnhancedRecipeGenerationService({
            maxTokens: -100, // Invalid max tokens
          })
      ).toThrow('Max tokens must be positive');
    });
  });
});

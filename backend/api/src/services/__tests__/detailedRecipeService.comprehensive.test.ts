import { DetailedRecipeService } from '../detailedRecipeService';
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

describe('DetailedRecipeService - Core Business Logic Tests', () => {
  let service: DetailedRecipeService;
  
  // Define shared test data at describe level
  const basicDetailedRequest = {
    selectedPreview: {
      id: 'recipe-preview-1',
      title: 'Asian Chicken Rice Bowl',
      description: 'Quick and healthy one-bowl meal with tender chicken and vegetables',
      estimatedTime: 25,
      difficulty: 'easy',
      cuisineType: 'Asian',
      mainIngredients: ['chicken breast', 'rice', 'broccoli'],
    },
    originalIngredients: ['chicken breast', 'jasmine rice', 'broccoli', 'soy sauce', 'garlic'],
    userPreferences: {
      servingSize: 2,
      cuisinePreferences: ['Asian'],
      dietaryTags: ['high-protein'],
      selectedAppliances: ['stove', 'wok'],
      timeAvailable: '30_MINUTES',
      skillLevel: 'beginner',
      mealPrepEnabled: false,
      mealType: 'dinner',
    },
    sessionId: 'session-detailed-123',
  };

  const mockDetailedRecipeResponse = {
    id: 'detailed-recipe-1',
    title: 'Asian Chicken Rice Bowl with Teriyaki Glaze',
    description: 'A perfectly balanced one-bowl meal featuring tender chicken, fluffy rice, and crisp vegetables finished with a savory teriyaki glaze',
    prepTime: 15,
    cookTime: 20,
    totalTime: 35,
    difficulty: 'easy',
    servings: 2,
    cuisineType: 'Asian',
    dietaryTags: ['high-protein'],
    ingredients: [
      {
        name: 'chicken breast',
        amount: '1',
        unit: 'pound',
        source: 'detected',
      },
      {
        name: 'jasmine rice',
        amount: '1',
        unit: 'cup',
        source: 'detected',
      },
      {
        name: 'broccoli',
        amount: '2',
        unit: 'cups',
        source: 'detected',
      },
      {
        name: 'soy sauce',
        amount: '3',
        unit: 'tablespoons',
        source: 'detected',
      },
      {
        name: 'garlic',
        amount: '3',
        unit: 'cloves',
        source: 'detected',
      },
      {
        name: 'vegetable oil',
        amount: '2',
        unit: 'tablespoons',
        source: 'pantry',
      },
      {
        name: 'honey',
        amount: '1',
        unit: 'tablespoon',
        source: 'pantry',
      },
    ],
    instructions: [
      {
        step: 1,
        instruction: 'Rinse 1 cup of jasmine rice under cold water until water runs clear. Cook according to package directions (usually 18 minutes).',
        time: 2,
        temperature: 'medium heat',
        tips: 'Rinsing removes excess starch for fluffier rice',
        technique: 'Steaming',
        equipment: 'Medium saucepan with lid',
        safety: 'Keep lid on while cooking to prevent steam from escaping',
      },
      {
        step: 2,
        instruction: 'While rice cooks, cut 1 pound of chicken breast into bite-sized cubes, approximately 1-inch pieces.',
        time: 5,
        tips: 'Uniform pieces ensure even cooking',
        technique: 'Knife skills',
        equipment: 'Sharp chef knife and cutting board',
        safety: 'Use separate cutting board for raw chicken',
      },
      {
        step: 3,
        instruction: 'Cut 2 cups of broccoli into uniform florets and mince 3 cloves of garlic.',
        time: 3,
        tips: 'Keep broccoli pieces similar in size for even cooking',
        technique: 'Knife skills',
        equipment: 'Sharp knife',
      },
      {
        step: 4,
        instruction: 'Heat 2 tablespoons of vegetable oil in a wok or large skillet over medium-high heat until shimmering.',
        time: 2,
        temperature: 'medium-high heat',
        technique: 'Stir-frying prep',
        equipment: 'Wok or large skillet',
        safety: 'Oil is ready when it shimmers but not smoking',
      },
      {
        step: 5,
        instruction: 'Add the cubed chicken to the hot oil and cook for 5-6 minutes, stirring occasionally, until golden brown and cooked through (internal temperature 165°F).',
        time: 6,
        temperature: 'medium-high heat',
        tips: 'Don\'t overcrowd the pan - cook in batches if needed',
        technique: 'Stir-frying',
        equipment: 'Meat thermometer',
        safety: 'Ensure chicken reaches safe internal temperature',
      },
      {
        step: 6,
        instruction: 'Add the minced 3 cloves of garlic and stir-fry for 30 seconds until fragrant.',
        time: 1,
        temperature: 'medium-high heat',
        tips: 'Garlic cooks quickly - don\'t let it burn',
        technique: 'Aromatics',
      },
      {
        step: 7,
        instruction: 'Add the 2 cups of broccoli florets and stir-fry for 3-4 minutes until bright green and tender-crisp.',
        time: 4,
        temperature: 'medium-high heat',
        tips: 'Broccoli should still have some crunch',
        technique: 'Stir-frying vegetables',
      },
      {
        step: 8,
        instruction: 'In a small bowl, whisk together 3 tablespoons soy sauce and 1 tablespoon honey to create the teriyaki glaze.',
        time: 1,
        tips: 'Mix thoroughly to ensure honey dissolves',
        technique: 'Sauce preparation',
        equipment: 'Small mixing bowl and whisk',
      },
      {
        step: 9,
        instruction: 'Pour the teriyaki glaze over the chicken and broccoli, toss to coat evenly, and cook for 1 minute until sauce glazes the ingredients.',
        time: 2,
        temperature: 'medium-high heat',
        tips: 'The sauce should coat everything nicely',
        technique: 'Glazing',
      },
      {
        step: 10,
        instruction: 'Divide the cooked rice between 2 bowls and top with the chicken and broccoli mixture. Serve immediately while hot.',
        time: 1,
        tips: 'Garnish with sesame seeds or green onions if desired',
        technique: 'Plating',
      },
    ],
    tips: [
      'Use day-old rice for better texture if making fried rice variation',
      'Prep all ingredients before starting to cook for smooth execution',
      'Don\'t overcook the broccoli - it should remain vibrant green',
      'Taste and adjust seasoning with additional soy sauce if needed',
    ],
    nutritionEstimate: {
      calories: 485,
      protein: '42g',
      carbs: '52g',
      fat: '12g',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new DetailedRecipeService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Constructor and Initialization', () => {
    it('should require OPENAI_API_KEY environment variable', () => {
      delete process.env.OPENAI_API_KEY;
      // Service still initializes but OpenAI will handle missing key
      expect(() => new DetailedRecipeService()).not.toThrow();
    });

    it('should initialize with correct OpenAI configuration', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      new DetailedRecipeService();
      
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key',
        timeout: 45000,
      });
    });
  });

  describe('generateDetailedRecipe - Primary Method', () => {
    it('should generate a detailed recipe with all required fields', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockDetailedRecipeResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      // Verify all required fields are present
      expect(result).toMatchObject({
        sessionId: 'session-detailed-123',
        recipe: expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          prepTime: expect.any(Number),
          cookTime: expect.any(Number),
          totalTime: expect.any(Number),
          difficulty: expect.stringMatching(/^(easy|medium|hard)$/),
          servings: expect.any(Number),
          cuisineType: expect.any(String),
          dietaryTags: expect.any(Array),
          ingredients: expect.any(Array),
          instructions: expect.any(Array),
          tips: expect.any(Array),
          nutritionEstimate: expect.objectContaining({
            calories: expect.any(Number),
            protein: expect.any(String),
            carbs: expect.any(String),
            fat: expect.any(String),
          }),
        }),
      });

      // Verify ingredients have proper structure
      expect(result.recipe.ingredients[0]).toMatchObject({
        name: expect.any(String),
        amount: expect.any(String),
        unit: expect.any(String),
        source: expect.stringMatching(/^(detected|pantry|store)$/),
      });

      // Verify instructions have proper structure
      expect(result.recipe.instructions[0]).toMatchObject({
        step: expect.any(Number),
        instruction: expect.any(String),
      });

      // Verify OpenAI was called with correct parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          max_tokens: 2500,
          temperature: 0.6,
        })
      );
    });

    it('should handle complex meal prep requirements', async () => {
      const mealPrepRequest = {
        ...basicDetailedRequest,
        userPreferences: {
          ...basicDetailedRequest.userPreferences,
          mealPrepEnabled: true,
          mealPrepPortions: 8,
          servingSize: 8,
        },
      };

      const mealPrepResponse = {
        ...mockDetailedRecipeResponse,
        servings: 8,
        ingredients: mockDetailedRecipeResponse.ingredients.map(ing => ({
          ...ing,
          amount: (parseFloat(ing.amount) * 4).toString(), // Scale up for 8 servings
        })),
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mealPrepResponse) } }],
      });

      const result = await service.generateDetailedRecipe(mealPrepRequest);

      expect(result.recipe.servings).toBe(8);
      expect(result.sessionId).toBe('session-detailed-123');
      
      // Verify prompt includes meal prep information
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('Serving size: 8');
    });

    it('should handle advanced dietary restrictions', async () => {
      const dietaryRequest = {
        ...basicDetailedRequest,
        userPreferences: {
          ...basicDetailedRequest.userPreferences,
          dietaryTags: ['gluten-free', 'dairy-free', 'low-sodium'],
        },
      };

      const dietaryResponse = {
        ...mockDetailedRecipeResponse,
        dietaryTags: ['gluten-free', 'dairy-free', 'low-sodium', 'high-protein'],
        ingredients: mockDetailedRecipeResponse.ingredients.map(ing => ({
          ...ing,
          name: ing.name === 'soy sauce' ? 'tamari (gluten-free soy sauce)' : ing.name,
        })),
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(dietaryResponse) } }],
      });

      const result = await service.generateDetailedRecipe(dietaryRequest);

      expect(result.recipe.dietaryTags).toContain('gluten-free');
      expect(result.recipe.dietaryTags).toContain('dairy-free');
      expect(result.recipe.dietaryTags).toContain('low-sodium');
      
      // Verify prompt includes dietary restrictions
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('gluten-free, dairy-free, low-sodium');
    });

    it('should handle specialized cooking appliances', async () => {
      const applianceRequest = {
        ...basicDetailedRequest,
        userPreferences: {
          ...basicDetailedRequest.userPreferences,
          selectedAppliances: ['instant-pot', 'air-fryer'],
        },
      };

      const applianceResponse = {
        ...mockDetailedRecipeResponse,
        title: 'Instant Pot Asian Chicken Rice Bowl',
        instructions: [
          {
            step: 1,
            instruction: 'Add 1 cup jasmine rice and 1.25 cups water to Instant Pot.',
            time: 2,
            equipment: 'Instant Pot',
            technique: 'Pressure cooking',
          },
          {
            step: 2,
            instruction: 'Place trivet in Instant Pot and add chicken in steamer basket.',
            time: 3,
            equipment: 'Instant Pot with trivet and steamer basket',
            technique: 'Steam cooking',
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(applianceResponse) } }],
      });

      const result = await service.generateDetailedRecipe(applianceRequest);

      expect(result.recipe.title).toContain('Instant Pot');
      
      // Verify prompt includes appliance preferences
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('instant-pot, air-fryer');
    });

    it('should validate and format incomplete response data', async () => {
      const incompleteResponse = {
        // Missing most fields
        title: 'Incomplete Recipe',
        ingredients: [
          {
            // Missing amount and unit
            name: 'chicken',
            source: 'detected',
          },
          {
            name: 'rice',
            amount: '1',
            unit: 'cup',
            source: 'invalid-source', // Invalid source
          },
        ],
        instructions: [
          {
            // Missing step number
            instruction: 'Cook the chicken',
          },
          {
            step: 2,
            instruction: 'Add rice',
            time: 'not-a-number', // Invalid time
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(incompleteResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      // Should apply defaults for missing fields
      expect(result.recipe).toMatchObject({
        id: expect.any(String),
        title: 'Incomplete Recipe',
        description: basicDetailedRequest.selectedPreview.description, // Fallback
        prepTime: 15, // Default
        cookTime: basicDetailedRequest.selectedPreview.estimatedTime, // Fallback
        difficulty: basicDetailedRequest.selectedPreview.difficulty, // Fallback
        servings: basicDetailedRequest.userPreferences.servingSize, // Fallback
        cuisineType: basicDetailedRequest.selectedPreview.cuisineType, // Fallback
      });

      // Validate ingredient defaults
      expect(result.recipe.ingredients[0]).toMatchObject({
        name: 'chicken',
        amount: '1', // Default
        unit: 'piece', // Default
        source: 'detected',
      });

      expect(result.recipe.ingredients[1]).toMatchObject({
        name: 'rice',
        amount: '1',
        unit: 'cup',
        source: 'detected', // Corrected invalid source
      });

      // Validate instruction defaults
      expect(result.recipe.instructions[0]).toMatchObject({
        step: 1, // Default
        instruction: 'Cook the chicken',
        time: undefined, // Optional field
      });

      expect(result.recipe.instructions[1]).toMatchObject({
        step: 2,
        instruction: 'Add rice',
        time: undefined, // Invalid number converted to undefined
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'));

      await expect(service.generateDetailedRecipe(basicDetailedRequest)).rejects.toThrow(
        'OpenAI API rate limit exceeded'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Error generating detailed recipe:',
        expect.objectContaining({
          error: 'OpenAI API rate limit exceeded',
          sessionId: 'session-detailed-123',
        })
      );
    });

    it('should handle malformed JSON responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{ "title": "Recipe", invalid json }' } }],
      });

      await expect(service.generateDetailedRecipe(basicDetailedRequest)).rejects.toThrow(
        'Invalid JSON response from OpenAI for detailed recipe'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ JSON parsing failed for detailed recipe:',
        expect.objectContaining({
          error: expect.any(Error),
          contentSample: expect.any(String),
        })
      );
    });

    it('should handle empty OpenAI response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [],
      });

      await expect(service.generateDetailedRecipe(basicDetailedRequest)).rejects.toThrow(
        'No content received from OpenAI'
      );
    });
  });

  describe('buildDetailedPrompt - Prompt Generation', () => {
    it('should build comprehensive prompts with all recipe details', async () => {
      const complexRequest = {
        selectedPreview: {
          id: 'complex-preview',
          title: 'Mediterranean Salmon Quinoa Bowl',
          description: 'Healthy bowl with grilled salmon, quinoa, and fresh vegetables',
          estimatedTime: 45,
          difficulty: 'intermediate',
          cuisineType: 'Mediterranean',
          mainIngredients: ['salmon', 'quinoa', 'cucumber', 'tomatoes'],
        },
        originalIngredients: ['salmon fillet', 'quinoa', 'cucumber', 'cherry tomatoes', 'olive oil', 'lemon'],
        userPreferences: {
          servingSize: 3,
          cuisinePreferences: ['Mediterranean'],
          dietaryTags: ['pescatarian', 'high-protein', 'gluten-free'],
          selectedAppliances: ['grill', 'stovetop'],
          timeAvailable: '60_MINUTES',
          skillLevel: 'intermediate',
          mealPrepEnabled: false,
          mealType: 'lunch',
        },
        sessionId: 'session-complex',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockDetailedRecipeResponse) } }],
      });

      await service.generateDetailedRecipe(complexRequest);

      const promptCall = mockCreate.mock.calls[0][0];
      const prompt = promptCall.messages[1].content;

      // Verify preview details are included
      expect(prompt).toContain('Mediterranean Salmon Quinoa Bowl');
      expect(prompt).toContain('Healthy bowl with grilled salmon');
      expect(prompt).toContain('45 minutes');
      expect(prompt).toContain('intermediate');
      expect(prompt).toContain('Mediterranean');
      expect(prompt).toContain('salmon, quinoa, cucumber, tomatoes');

      // Verify ingredients are included
      expect(prompt).toContain('salmon fillet, quinoa, cucumber, cherry tomatoes, olive oil, lemon');

      // Verify user preferences are included
      expect(prompt).toContain('Serving size: 3');
      expect(prompt).toContain('grill, stovetop');
      expect(prompt).toContain('pescatarian, high-protein, gluten-free');
      expect(prompt).toContain('intermediate');
      expect(prompt).toContain('60_MINUTES');

      // Verify critical requirements are included
      expect(prompt).toContain('EXACT measurements for ALL ingredients');
      expect(prompt).toContain('standard cooking measurements');
      expect(prompt).toContain('3 servings'); // Serving size in requirements
    });

    it('should handle minimal request data with appropriate defaults', async () => {
      const minimalRequest = {
        selectedPreview: {
          id: 'minimal',
          title: 'Simple Pasta',
          description: 'Basic pasta dish',
          estimatedTime: 20,
          difficulty: 'easy',
          cuisineType: 'Italian',
          mainIngredients: ['pasta'],
        },
        originalIngredients: ['pasta'],
        userPreferences: {
          servingSize: 1,
          cuisinePreferences: [],
          dietaryTags: [],
          selectedAppliances: [],
          timeAvailable: '',
          skillLevel: '',
          mealPrepEnabled: false,
        },
        sessionId: 'session-minimal',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockDetailedRecipeResponse) } }],
      });

      await service.generateDetailedRecipe(minimalRequest);

      const promptCall = mockCreate.mock.calls[0][0];
      const prompt = promptCall.messages[1].content;

      expect(prompt).toContain('Simple Pasta');
      expect(prompt).toContain('pasta');
      expect(prompt).toContain('Serving size: 1');
      expect(prompt).toContain('none'); // Default dietary restrictions
    });
  });

  describe('validateAndFormatDetailedRecipe - Data Validation', () => {
    it('should apply defaults for missing core fields', async () => {
      const emptyResponse = {};

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(emptyResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      expect(result.recipe).toMatchObject({
        id: expect.stringMatching(/^detailed-\d+$/),
        title: basicDetailedRequest.selectedPreview.title,
        description: basicDetailedRequest.selectedPreview.description,
        prepTime: 15,
        cookTime: basicDetailedRequest.selectedPreview.estimatedTime,
        totalTime: basicDetailedRequest.selectedPreview.estimatedTime,
        difficulty: basicDetailedRequest.selectedPreview.difficulty,
        servings: basicDetailedRequest.userPreferences.servingSize,
        cuisineType: basicDetailedRequest.selectedPreview.cuisineType,
        dietaryTags: basicDetailedRequest.userPreferences.dietaryTags,
        ingredients: [],
        instructions: [],
        tips: ['Cook with love and patience!'],
        nutritionEstimate: {
          calories: 400,
          protein: '20g',
          carbs: '30g',
          fat: '15g',
        },
      });
    });

    it('should validate ingredient structure', async () => {
      const invalidIngredientsResponse = {
        ingredients: [
          {}, // Empty ingredient
          { name: 'chicken' }, // Missing amount and unit
          { name: 'rice', amount: 2, unit: 'cups', source: 'detected' }, // Valid
          { name: 'oil', amount: '1', unit: 'tbsp', source: 'invalid' }, // Invalid source
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(invalidIngredientsResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      expect(result.recipe.ingredients).toHaveLength(4);
      
      // First ingredient - all defaults
      expect(result.recipe.ingredients[0]).toMatchObject({
        name: 'Ingredient 1',
        amount: '1',
        unit: 'piece',
        source: 'detected',
      });

      // Second ingredient - partial defaults
      expect(result.recipe.ingredients[1]).toMatchObject({
        name: 'chicken',
        amount: '1',
        unit: 'piece',
        source: 'detected',
      });

      // Third ingredient - valid as-is
      expect(result.recipe.ingredients[2]).toMatchObject({
        name: 'rice',
        amount: '2',
        unit: 'cups',
        source: 'detected',
      });

      // Fourth ingredient - corrected source
      expect(result.recipe.ingredients[3]).toMatchObject({
        name: 'oil',
        amount: '1',
        unit: 'tbsp',
        source: 'detected',
      });
    });

    it('should validate instruction structure', async () => {
      const invalidInstructionsResponse = {
        instructions: [
          {}, // Empty instruction
          { instruction: 'Cook chicken' }, // Missing step
          { step: 'two', instruction: 'Add rice', time: 'five' }, // Invalid step and time
          { 
            step: 3, 
            instruction: 'Serve hot',
            time: 2,
            temperature: 'hot',
            tips: 'Garnish well',
            technique: 'Plating',
            equipment: 'Plates',
            safety: 'Use oven mitts',
          }, // Complete valid instruction
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(invalidInstructionsResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      expect(result.recipe.instructions).toHaveLength(4);
      
      // First instruction - all defaults
      expect(result.recipe.instructions[0]).toMatchObject({
        step: 1,
        instruction: 'Step 1 instruction',
        time: undefined,
        temperature: undefined,
        tips: undefined,
        technique: undefined,
        equipment: undefined,
        safety: undefined,
      });

      // Second instruction - partial defaults
      expect(result.recipe.instructions[1]).toMatchObject({
        step: 2,
        instruction: 'Cook chicken',
        time: undefined,
      });

      // Third instruction - corrected invalid types
      expect(result.recipe.instructions[2]).toMatchObject({
        step: 3, // Index-based step number
        instruction: 'Add rice',
        time: undefined, // Invalid time converted
      });

      // Fourth instruction - complete and valid
      expect(result.recipe.instructions[3]).toMatchObject({
        step: 3,
        instruction: 'Serve hot',
        time: 2,
        temperature: 'hot',
        tips: 'Garnish well',
        technique: 'Plating',
        equipment: 'Plates',
        safety: 'Use oven mitts',
      });
    });
  });

  describe('Logging and Debugging', () => {
    it('should log comprehensive generation information', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockDetailedRecipeResponse) } }],
      });

      await service.generateDetailedRecipe(basicDetailedRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🍳 Generating detailed recipe...',
        expect.objectContaining({
          recipeTitle: 'Asian Chicken Rice Bowl',
          sessionId: 'session-detailed-123',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '📤 Sending detailed recipe request to OpenAI...',
        expect.objectContaining({
          promptLength: expect.any(Number),
          maxTokens: 4000,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '✅ Successfully generated detailed recipe',
        expect.objectContaining({
          recipeTitle: mockDetailedRecipeResponse.title,
          stepCount: mockDetailedRecipeResponse.instructions.length,
          sessionId: 'session-detailed-123',
        })
      );
    });

    it('should log debug information for response parsing', async () => {
      const longResponse = JSON.stringify({ 
        ...mockDetailedRecipeResponse, 
        longData: 'x'.repeat(2000) 
      });

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: longResponse } }],
      });

      await service.generateDetailedRecipe(basicDetailedRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🔍 Detailed response preview:',
        expect.objectContaining({
          first300Chars: expect.any(String),
          last300Chars: expect.any(String),
          startsWithBrace: true,
          endsWithBrace: true,
        })
      );
    });

    it('should log content length and parsing status', async () => {
      const response = JSON.stringify(mockDetailedRecipeResponse);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: response } }],
      });

      await service.generateDetailedRecipe(basicDetailedRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Parsing detailed recipe response...',
        expect.objectContaining({
          contentLength: response.length,
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeout errors', async () => {
      jest.clearAllMocks();
      
      mockCreate.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(service.generateDetailedRecipe(basicDetailedRequest)).rejects.toThrow(
        'Network timeout'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Error generating detailed recipe:',
        expect.objectContaining({
          error: 'Network timeout',
          sessionId: 'session-detailed-123',
        })
      );
    });

    it('should handle malformed choice structure', async () => {
      jest.clearAllMocks();
      
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: null }], // Malformed message
      });

      await expect(service.generateDetailedRecipe(basicDetailedRequest)).rejects.toThrow(
        'No content received from OpenAI'
      );
    });

    it('should handle empty ingredient and instruction arrays', async () => {
      const emptyArraysResponse = {
        title: 'Empty Recipe',
        ingredients: [],
        instructions: [],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(emptyArraysResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      expect(result.recipe.ingredients).toEqual([]);
      expect(result.recipe.instructions).toEqual([]);
      expect(result.recipe.title).toBe('Empty Recipe');
    });

    it('should handle missing nutrition estimate', async () => {
      const noNutritionResponse = {
        ...mockDetailedRecipeResponse,
        nutritionEstimate: undefined,
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(noNutritionResponse) } }],
      });

      const result = await service.generateDetailedRecipe(basicDetailedRequest);

      expect(result.recipe.nutritionEstimate).toEqual({
        calories: 400,
        protein: '20g',
        carbs: '30g',
        fat: '15g',
      });
    });
  });
});
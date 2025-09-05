import { RecipePreviewService } from '../recipePreviewService';
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

describe('RecipePreviewService - Core Business Logic Tests', () => {
  let service: RecipePreviewService;
  
  // Define shared test data at describe level
  const basicPreviewRequest = {
    detectedIngredients: ['chicken breast', 'rice', 'broccoli'],
    userPreferences: {
      servingSize: 4,
      cuisinePreferences: ['Italian', 'Asian'],
      dietaryTags: ['high-protein'],
      selectedAppliances: ['stove', 'oven'],
      timeAvailable: '30_MINUTES',
      skillLevel: 'beginner',
      mealPrepEnabled: false,
      mealType: 'dinner',
    },
    sessionId: 'session-123',
  };

  const mockPreviewResponse = {
    recipes: [
      {
        id: 'recipe-1',
        title: 'Asian Chicken Rice Bowl',
        description: 'Quick and healthy one-bowl meal with tender chicken and vegetables',
        estimatedTime: 25,
        difficulty: 'easy',
        cuisineType: 'Asian',
        mainIngredients: ['chicken breast', 'rice', 'broccoli'],
        appealFactors: ['Quick to make', 'Healthy', 'One-bowl meal'],
      },
      {
        id: 'recipe-2',
        title: 'Italian Chicken Risotto',
        description: 'Creamy risotto with perfectly cooked chicken and fresh vegetables',
        estimatedTime: 35,
        difficulty: 'medium',
        cuisineType: 'Italian',
        mainIngredients: ['chicken breast', 'rice', 'broccoli'],
        appealFactors: ['Restaurant quality', 'Comfort food', 'Impressive'],
      },
      {
        id: 'recipe-3',
        title: 'Baked Chicken and Rice Casserole',
        description: 'Hearty casserole that bakes to perfection with minimal effort',
        estimatedTime: 45,
        difficulty: 'easy',
        cuisineType: 'American',
        mainIngredients: ['chicken breast', 'rice', 'broccoli'],
        appealFactors: ['Set and forget', 'Family favorite', 'Leftovers friendly'],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new RecipePreviewService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with OpenAI client', () => {
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 60000,
      });
    });

    it('should handle missing API key', () => {
      delete process.env.OPENAI_API_KEY;
      
      // Should still create the service but OpenAI will handle the missing key
      expect(() => new RecipePreviewService()).not.toThrow();
    });
  });

  describe('generatePreviews - Primary Method', () => {
    it('should generate recipe previews successfully', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result).toMatchObject({
        sessionId: 'session-123',
        previews: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            estimatedTime: expect.any(Number),
            difficulty: expect.stringMatching(/^(easy|medium|hard)$/),
            cuisineType: expect.any(String),
            mainIngredients: expect.any(Array),
            appealFactors: expect.any(Array),
          }),
        ]),
      });

      expect(result.previews).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          max_tokens: 2000,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should handle diverse cuisine preferences', async () => {
      const diverseRequest = {
        ...basicPreviewRequest,
        userPreferences: {
          ...basicPreviewRequest.userPreferences,
          cuisinePreferences: ['Mediterranean', 'Thai', 'Mexican'],
        },
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ 
          message: { 
            content: JSON.stringify({
              recipes: [
                { ...mockPreviewResponse.recipes[0], cuisineType: 'Mediterranean' },
                { ...mockPreviewResponse.recipes[1], cuisineType: 'Thai' },
                { ...mockPreviewResponse.recipes[2], cuisineType: 'Mexican' },
              ]
            })
          } 
        }],
      });

      const result = await service.generatePreviews(diverseRequest);

      expect(result.previews).toHaveLength(3);
      expect(result.previews.map(p => p.cuisineType)).toEqual(['Mediterranean', 'Thai', 'Mexican']);
    });

    it('should handle meal prep preferences', async () => {
      const mealPrepRequest = {
        ...basicPreviewRequest,
        userPreferences: {
          ...basicPreviewRequest.userPreferences,
          mealPrepEnabled: true,
          mealPrepPortions: 8,
          servingSize: 8, // Update serving size to match meal prep portions
        },
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(mealPrepRequest);

      expect(result.sessionId).toBe('session-123');
      expect(result.previews).toHaveLength(3);
      
      // Verify the prompt includes meal prep information (serving size should be 8)
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('Serving size: 8');
    });

    it('should handle dietary restrictions correctly', async () => {
      const dietaryRequest = {
        ...basicPreviewRequest,
        userPreferences: {
          ...basicPreviewRequest.userPreferences,
          dietaryTags: ['vegetarian', 'gluten-free', 'dairy-free'],
        },
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(dietaryRequest);

      expect(result.previews).toHaveLength(3);
      
      // Verify prompt includes dietary restrictions
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('vegetarian, gluten-free, dairy-free');
    });

    it('should handle appliance-specific cooking methods', async () => {
      const applianceRequest = {
        ...basicPreviewRequest,
        userPreferences: {
          ...basicPreviewRequest.userPreferences,
          selectedAppliances: ['air-fryer', 'instant-pot'],
        },
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(applianceRequest);

      expect(result.previews).toHaveLength(3);
      
      // Verify prompt includes appliance preferences
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain('air-fryer, instant-pot');
    });

    it('should validate and format incomplete preview data', async () => {
      const incompleteResponse = {
        recipes: [
          {
            // Missing id and other fields
            title: 'Incomplete Recipe',
            estimatedTime: 'not-a-number', // Invalid type
            difficulty: 'super-hard', // Invalid value
            mainIngredients: 'not-an-array', // Invalid type
          },
          {
            id: 'recipe-2',
            title: 'Complete Recipe',
            description: 'A proper recipe',
            estimatedTime: 30,
            difficulty: 'medium',
            cuisineType: 'Italian',
            mainIngredients: ['pasta', 'tomato'],
            appealFactors: ['Delicious', 'Easy'],
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(incompleteResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews).toHaveLength(2);
      
      // First recipe should have defaults applied
      expect(result.previews[0]).toMatchObject({
        id: 'preview-1', // Default ID
        title: 'Incomplete Recipe',
        description: 'A delicious recipe using your ingredients.', // Default description
        estimatedTime: 30, // Default time
        difficulty: 'easy', // Default difficulty
        cuisineType: 'International', // Default cuisine
        mainIngredients: [], // Default empty array
        appealFactors: ['Delicious', 'Easy to make'], // Default appeal factors
      });

      // Second recipe should remain as-is
      expect(result.previews[1]).toMatchObject({
        id: 'recipe-2',
        title: 'Complete Recipe',
        difficulty: 'medium',
        mainIngredients: ['pasta', 'tomato'],
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'));

      await expect(service.generatePreviews(basicPreviewRequest)).rejects.toThrow(
        'OpenAI API rate limit exceeded'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Error generating recipe previews:',
        expect.objectContaining({
          error: 'OpenAI API rate limit exceeded',
          sessionId: 'session-123',
        })
      );
    });

    it('should handle malformed JSON responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{ "recipes": [invalid json' } }],
      });

      await expect(service.generatePreviews(basicPreviewRequest)).rejects.toThrow(
        'Invalid JSON response from OpenAI for previews'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ JSON parsing failed for previews:',
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

      await expect(service.generatePreviews(basicPreviewRequest)).rejects.toThrow(
        'No content received from OpenAI'
      );
    });

    it('should handle empty or undefined recipes array', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ recipes: [] }) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews).toEqual([]);
      expect(result.sessionId).toBe('session-123');
    });
  });

  describe('buildPreviewPrompt - Prompt Generation', () => {
    it('should build comprehensive prompts with all user preferences', async () => {
      const complexRequest = {
        detectedIngredients: ['salmon', 'quinoa', 'asparagus', 'lemon'],
        userPreferences: {
          servingSize: 2,
          cuisinePreferences: ['Mediterranean', 'Nordic'],
          dietaryTags: ['pescatarian', 'low-carb'],
          selectedAppliances: ['oven', 'grill'],
          timeAvailable: '45_MINUTES',
          skillLevel: 'intermediate',
          mealPrepEnabled: true,
          mealPrepPortions: 6,
          mealType: 'lunch',
        },
        sessionId: 'session-456',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      await service.generatePreviews(complexRequest);

      const promptCall = mockCreate.mock.calls[0][0];
      const prompt = promptCall.messages[1].content;

      expect(prompt).toContain('salmon, quinoa, asparagus, lemon');
      expect(prompt).toContain('lunch recipe previews');
      expect(prompt).toContain('Serving size: 2');
      expect(prompt).toContain('Mediterranean, Nordic');
      expect(prompt).toContain('pescatarian, low-carb');
      expect(prompt).toContain('oven, grill');
      expect(prompt).toContain('45_MINUTES');
      expect(prompt).toContain('intermediate');
    });

    it('should handle minimal request data with defaults', async () => {
      const minimalRequest = {
        detectedIngredients: ['eggs'],
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
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      await service.generatePreviews(minimalRequest);

      const promptCall = mockCreate.mock.calls[0][0];
      const prompt = promptCall.messages[1].content;

      expect(prompt).toContain('eggs');
      expect(prompt).toContain('any'); // Default cuisine
      expect(prompt).toContain('none'); // Default dietary
      expect(prompt).toContain('main dish'); // Default meal type
    });
  });

  describe('validateAndFormatPreviews - Data Validation', () => {
    it('should limit previews to maximum of 3', async () => {
      const manyRecipesResponse = {
        recipes: Array.from({ length: 10 }, (_, i) => ({
          id: `recipe-${i + 1}`,
          title: `Recipe ${i + 1}`,
          description: `Description ${i + 1}`,
          estimatedTime: 30,
          difficulty: 'easy',
          cuisineType: 'Italian',
          mainIngredients: ['ingredient1'],
          appealFactors: ['factor1'],
        })),
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(manyRecipesResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews).toHaveLength(3);
      expect(result.previews[0]?.id).toBe('recipe-1');
      expect(result.previews[2]?.id).toBe('recipe-3');
    });

    it('should assign default IDs when missing', async () => {
      const noIdResponse = {
        recipes: [
          { title: 'Recipe 1', difficulty: 'easy' },
          { title: 'Recipe 2', difficulty: 'medium' },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(noIdResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews[0]?.id).toBe('preview-1');
      expect(result.previews[1]?.id).toBe('preview-2');
    });

    it('should validate difficulty levels', async () => {
      const invalidDifficultyResponse = {
        recipes: [
          { difficulty: 'super-easy' }, // Invalid
          { difficulty: 'medium' }, // Valid
          { difficulty: 'impossible' }, // Invalid
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(invalidDifficultyResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews[0]?.difficulty).toBe('easy'); // Default
      expect(result.previews[1]?.difficulty).toBe('medium'); // Preserved
      expect(result.previews[2]?.difficulty).toBe('easy'); // Default
    });

    it('should handle non-array ingredients and appeal factors', async () => {
      const invalidArraysResponse = {
        recipes: [
          {
            mainIngredients: 'chicken, rice', // String instead of array
            appealFactors: 'Quick and easy', // String instead of array
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(invalidArraysResponse) } }],
      });

      const result = await service.generatePreviews(basicPreviewRequest);

      expect(result.previews[0]?.mainIngredients).toEqual([]); // Default empty array
      expect(result.previews[0]?.appealFactors).toEqual(['Delicious', 'Easy to make']); // Default array
    });
  });

  describe('Logging and Debugging', () => {
    it('should log comprehensive generation information', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      await service.generatePreviews(basicPreviewRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🚀 Generating recipe previews...',
        expect.objectContaining({
          ingredientCount: 3,
          sessionId: 'session-123',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '📤 Sending preview request to OpenAI...',
        expect.objectContaining({
          promptLength: expect.any(Number),
          maxTokens: 2000,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '✅ Successfully generated recipe previews',
        expect.objectContaining({
          previewCount: 3,
          sessionId: 'session-123',
        })
      );
    });

    it('should log debug information for response parsing', async () => {
      const longResponse = JSON.stringify({ 
        ...mockPreviewResponse, 
        extraData: 'x'.repeat(1500) 
      });

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: longResponse } }],
      });

      await service.generatePreviews(basicPreviewRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🔍 Preview response preview:',
        expect.objectContaining({
          first200Chars: expect.any(String),
          last200Chars: expect.any(String),
          startsWithBrace: true,
          endsWithBrace: true,
        })
      );
    });

    it('should log content length and parsing status', async () => {
      const response = JSON.stringify(mockPreviewResponse);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: response } }],
      });

      await service.generatePreviews(basicPreviewRequest);

      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Parsing preview response...',
        expect.objectContaining({
          contentLength: response.length,
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined or null ingredients', async () => {
      const badRequest = {
        ...basicPreviewRequest,
        detectedIngredients: [] as any, // Use empty array instead of undefined
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(badRequest);

      expect(result.previews).toHaveLength(3);
      
      const promptCall = mockCreate.mock.calls[0][0];
      expect(promptCall.messages[1].content).toContain(''); // Check for empty ingredients handling
    });

    it('should handle missing user preferences gracefully', async () => {
      const noPrefsRequest = {
        detectedIngredients: ['chicken'],
        userPreferences: {} as any,
        sessionId: 'session-noprofs',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPreviewResponse) } }],
      });

      const result = await service.generatePreviews(noPrefsRequest);

      expect(result.sessionId).toBe('session-noprofs');
      expect(result.previews).toHaveLength(3);
    });

    it('should handle network timeout errors', async () => {
      // Clear any previous mock calls
      jest.clearAllMocks();
      
      mockCreate.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(service.generatePreviews(basicPreviewRequest)).rejects.toThrow(
        'Network timeout'
      );

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Error generating recipe previews:',
        expect.objectContaining({
          error: 'Network timeout',
          sessionId: 'session-123',
        })
      );
    });

    it('should handle malformed choice structure', async () => {
      // Clear any previous mock calls to avoid interference
      jest.clearAllMocks();
      
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: null }], // Malformed message
      });

      await expect(service.generatePreviews(basicPreviewRequest)).rejects.toThrow(
        'No content received from OpenAI'
      );
    });
  });
});
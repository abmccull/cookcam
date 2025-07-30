import { generateRecipeSuggestions, generateFullRecipe } from '../openai';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAI Service', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Set up environment
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Setup mock
    mockCreate = jest.fn();
    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('generateRecipeSuggestions', () => {
    it('should return 3 recipe suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recipes: [
                { 
                  title: 'Tomato Basil Pasta', 
                  cuisine: 'Italian', 
                  totalTimeMinutes: 25, 
                  difficulty: 'Beginner', 
                  oneSentenceTeaser: 'Classic Italian comfort food with fresh basil' 
                },
                { 
                  title: 'Garlic Roasted Vegetables', 
                  cuisine: 'Mediterranean', 
                  totalTimeMinutes: 35, 
                  difficulty: 'Beginner', 
                  oneSentenceTeaser: 'Healthy and flavorful roasted veggie medley' 
                },
                { 
                  title: 'Quick Tomato Soup', 
                  cuisine: 'American', 
                  totalTimeMinutes: 20, 
                  difficulty: 'Beginner', 
                  oneSentenceTeaser: 'Creamy comfort in a bowl' 
                }
              ]
            })
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await generateRecipeSuggestions({
        detectedIngredients: ['tomato', 'onion', 'garlic']
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        title: 'Tomato Basil Pasta',
        cuisine: 'Italian',
        totalTimeMinutes: 25,
        difficulty: 'Beginner',
        oneSentenceTeaser: expect.any(String)
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0.7,
        max_tokens: 1000,
      });
    });

    it('should handle dietary preferences', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recipes: [
                { title: 'Vegan Stir Fry', cuisine: 'Asian', totalTimeMinutes: 20, difficulty: 'Beginner', oneSentenceTeaser: 'Plant-based goodness' },
                { title: 'Tofu Scramble', cuisine: 'American', totalTimeMinutes: 15, difficulty: 'Beginner', oneSentenceTeaser: 'Protein-packed breakfast' },
                { title: 'Vegetable Curry', cuisine: 'Indian', totalTimeMinutes: 30, difficulty: 'Intermediate', oneSentenceTeaser: 'Spicy and satisfying' }
              ]
            })
          }
        }]
      };
      
      mockCreate.mockResolvedValue(mockResponse);
      
      const result = await generateRecipeSuggestions({
        detectedIngredients: ['tomato'],
        dietaryTags: ['vegan']
      });

      expect(result).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('vegan')
            })
          ])
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(generateRecipeSuggestions({
        detectedIngredients: ['tomato']
      })).rejects.toThrow('Failed to generate recipe suggestions');
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateRecipeSuggestions({
        detectedIngredients: ['tomato']
      })).rejects.toThrow('Failed to generate recipe suggestions');
    });

    it('should handle empty responses', async () => {
      const mockResponse = {
        choices: []
      };
      
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateRecipeSuggestions({
        detectedIngredients: ['tomato']
      })).rejects.toThrow('Failed to generate recipe suggestions');
    });
  });

  describe('generateFullRecipe', () => {
    it('should generate a complete recipe', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Tomato Basil Pasta',
              cuisine: 'Italian',
              servings: 2,
              totalTimeMinutes: 25,
              difficulty: 'Beginner',
              caloriesPerServing: 420,
              macros: {
                protein_g: 12,
                carbs_g: 65,
                fat_g: 14
              },
              ingredients: [
                { item: 'pasta', quantity: '200g', fromPantry: false },
                { item: 'tomatoes', quantity: '3 medium', fromPantry: false },
                { item: 'olive oil', quantity: '2 tbsp', fromPantry: true }
              ],
              steps: [
                { order: 1, instruction: 'Boil water for pasta', technique: 'boiling', proTip: 'Salt the water generously' }
              ]
            })
          }
        }]
      };
      
      mockCreate.mockResolvedValue(mockResponse);
      
      const result = await generateFullRecipe(
        'Tomato Basil Pasta',
        { detectedIngredients: ['tomato', 'basil'] }
      );

      expect(result).toMatchObject({
        title: 'Tomato Basil Pasta',
        cuisine: 'Italian',
        servings: 2,
        totalTimeMinutes: 25,
        difficulty: 'Beginner',
        caloriesPerServing: 420,
        macros: {
          protein_g: expect.any(Number),
          carbs_g: expect.any(Number),
          fat_g: expect.any(Number)
        },
        ingredients: expect.arrayContaining([
          expect.objectContaining({
            item: expect.any(String),
            quantity: expect.any(String),
            fromPantry: expect.any(Boolean)
          })
        ]),
        steps: expect.arrayContaining([
          expect.objectContaining({
            order: expect.any(Number),
            instruction: expect.any(String)
          })
        ])
      });
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(generateFullRecipe(
        'Test Recipe',
        { detectedIngredients: ['test'] }
      )).rejects.toThrow('Failed to generate full recipe');
    });
  });

  describe('environment configuration', () => {
    it('should throw error if OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      
      // Clear the module cache to ensure fresh import
      jest.resetModules();
      
      expect(() => {
        const { generateRecipeSuggestions } = require('../openai');
        generateRecipeSuggestions({ detectedIngredients: ['test'] });
      }).toThrow('OPENAI_API_KEY environment variable is required');
    });
  });
});
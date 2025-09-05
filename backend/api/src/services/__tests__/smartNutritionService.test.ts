import { calculateSmartNutrition, NutritionMacros, IngredientMatch, SmartNutritionResult } from '../smartNutritionService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('SmartNutritionService', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockIlike: jest.Mock;
  let mockNot: jest.Mock;
  let mockLimit: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();

    // Setup mock chain
    mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    mockNot = jest.fn().mockReturnValue({ limit: mockLimit });
    mockIlike = jest.fn().mockReturnValue({ not: mockNot });
    mockSelect = jest.fn().mockReturnValue({ ilike: mockIlike });
    mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

    mockSupabase = {
      from: mockFrom,
    };

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('calculateSmartNutrition', () => {
    const mockIngredientData = [
      {
        name: 'Chicken, breast, meat only, cooked, roasted',
        calories_per_100g: 165,
        protein_g_per_100g: 31.0,
        carbs_g_per_100g: 0.0,
        fat_g_per_100g: 3.6,
        sodium_mg_per_100g: 74,
      },
      {
        name: 'Tomatoes, red, ripe, raw',
        calories_per_100g: 18,
        protein_g_per_100g: 0.9,
        carbs_g_per_100g: 3.9,
        fat_g_per_100g: 0.2,
        sodium_mg_per_100g: 5,
      },
      {
        name: 'Oil, olive, salad or cooking',
        calories_per_100g: 884,
        protein_g_per_100g: 0.0,
        carbs_g_per_100g: 0.0,
        fat_g_per_100g: 100.0,
        sodium_mg_per_100g: 2,
      },
    ];

    it('should calculate nutrition for simple recipe with valid ingredients', async () => {
      // Mock database responses
      mockLimit
        .mockResolvedValueOnce({ data: [mockIngredientData[0]], error: null }) // chicken breast
        .mockResolvedValueOnce({ data: [mockIngredientData[1]], error: null }) // tomatoes
        .mockResolvedValueOnce({ data: [mockIngredientData[2]], error: null }); // olive oil

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
        { item: 'ripe tomatoes', quantity: '100', unit: 'g' },
        { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      ];

      const result = await calculateSmartNutrition(ingredients, 2);

      expect(result).toBeDefined();
      expect(result.totalNutrition).toBeDefined();
      expect(result.perServing).toBeDefined();
      expect(result.ingredientBreakdown).toHaveLength(3);
      expect(result.unmatchedIngredients).toHaveLength(0);

      // Check total nutrition calculations
      expect(result.totalNutrition.calories).toBeGreaterThan(0);
      expect(result.totalNutrition.protein_g).toBeGreaterThan(0);
      expect(result.totalNutrition.fat_g).toBeGreaterThan(0);

      // Check per-serving calculations
      expect(result.perServing.calories).toBe(result.totalNutrition.calories / 2);
      expect(result.perServing.protein_g).toBe(result.totalNutrition.protein_g / 2);
    });

    it('should handle ingredients with different unit conversions', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[2]], error: null }); // olive oil

      const ingredients = [
        { item: 'olive oil', quantity: '1', unit: 'cup' },
        { item: 'olive oil', quantity: '250', unit: 'ml' },
        { item: 'olive oil', quantity: '1', unit: 'tbsp' },
        { item: 'olive oil', quantity: '1', unit: 'tsp' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown).toHaveLength(4);
      
      // Cup should convert to 220g for oil
      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(220);
      
      // ML should convert considering oil density (0.92 g/ml)
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(230); // 250ml * 0.92
      
      // Tablespoon should be 15g
      expect(result.ingredientBreakdown[2]?.gramsUsed).toBe(15);
      
      // Teaspoon should be 5g
      expect(result.ingredientBreakdown[3]?.gramsUsed).toBe(5);
    });

    it('should handle ingredient-specific unit conversions correctly', async () => {
      const mockFlour = {
        name: 'Wheat flour, white, all-purpose',
        calories_per_100g: 364,
        protein_g_per_100g: 10.3,
        carbs_g_per_100g: 76.3,
        fat_g_per_100g: 0.98,
        sodium_mg_per_100g: 2,
      };

      mockLimit.mockResolvedValue({ data: [mockFlour], error: null });

      const ingredients = [
        { item: 'flour', quantity: '1', unit: 'cup' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // Flour cup should convert to 200g
      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(200);
    });

    it('should handle whole item conversions for common ingredients', async () => {
      const mockApple = {
        name: 'Apples, raw, with skin',
        calories_per_100g: 52,
        protein_g_per_100g: 0.26,
        carbs_g_per_100g: 13.8,
        fat_g_per_100g: 0.17,
        sodium_mg_per_100g: 1,
      };

      mockLimit.mockResolvedValue({ data: [mockApple], error: null });

      const ingredients = [
        { item: 'apple', quantity: '1', unit: 'whole' },
        { item: 'banana', quantity: '2', unit: 'piece' },
        { item: 'egg', quantity: '3', unit: '' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown).toHaveLength(3);
      
      // Apple should be 180g
      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(180);
      
      // Banana should be 120g each = 240g total
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(240);
      
      // Eggs should be 50g each = 150g total
      expect(result.ingredientBreakdown[2]?.gramsUsed).toBe(150);
    });

    it('should handle unmatched ingredients gracefully', async () => {
      // Mock no matches found
      mockLimit.mockResolvedValue({ data: [], error: null });

      const ingredients = [
        { item: 'unicorn tears', quantity: '1', unit: 'cup' },
        { item: 'dragon breath', quantity: '2', unit: 'tsp' },
      ];

      const result = await calculateSmartNutrition(ingredients, 2);

      expect(result.unmatchedIngredients).toHaveLength(2);
      expect(result.unmatchedIngredients).toContain('unicorn tears');
      expect(result.unmatchedIngredients).toContain('dragon breath');
      expect(result.ingredientBreakdown).toHaveLength(0);
      expect(result.totalNutrition.calories).toBe(0);
    });

    it('should handle low confidence matches by rejecting them', async () => {
      const lowConfidenceMatch = {
        name: 'Some random ingredient that does not match well',
        calories_per_100g: 100,
        protein_g_per_100g: 5,
        carbs_g_per_100g: 10,
        fat_g_per_100g: 2,
        sodium_mg_per_100g: 50,
      };

      mockLimit.mockResolvedValue({ data: [lowConfidenceMatch], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // Should be unmatched due to low confidence
      expect(result.unmatchedIngredients).toContain('chicken breast');
      expect(result.ingredientBreakdown).toHaveLength(0);
    });

    it('should handle invalid quantity formats', async () => {
      const ingredients = [
        { item: 'chicken breast', quantity: 'invalid', unit: 'g' },
        { item: 'tomatoes', quantity: '', unit: 'cup' },
        { item: 'oil', quantity: 'a pinch', unit: 'tbsp' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.unmatchedIngredients).toHaveLength(3);
      expect(result.ingredientBreakdown).toHaveLength(0);
    });

    it('should calculate per-serving nutrition correctly for different serving sizes', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null }); // chicken

      const ingredients = [
        { item: 'chicken breast', quantity: '400', unit: 'g' },
      ];

      const result4Servings = await calculateSmartNutrition(ingredients, 4);
      const result2Servings = await calculateSmartNutrition(ingredients, 2);

      expect(result4Servings.perServing.calories).toBe(result2Servings.perServing.calories / 2);
      expect(result4Servings.perServing.protein_g).toBe(result2Servings.perServing.protein_g / 2);
    });

    it('should handle database errors gracefully', async () => {
      mockLimit.mockRejectedValue(new Error('Database connection failed'));

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.unmatchedIngredients).toContain('chicken breast');
      expect(result.ingredientBreakdown).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle ingredients with null nutrition data', async () => {
      const incompleteIngredient = {
        name: 'Incomplete ingredient',
        calories_per_100g: null,
        protein_g_per_100g: 5,
        carbs_g_per_100g: 10,
        fat_g_per_100g: 2,
        sodium_mg_per_100g: 50,
      };

      mockLimit.mockResolvedValue({ data: [incompleteIngredient], error: null });

      const ingredients = [
        { item: 'incomplete ingredient', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // Should be unmatched due to invalid nutrition data
      expect(result.unmatchedIngredients).toContain('incomplete ingredient');
    });

    it('should use synonym matching with high priority', async () => {
      const expectedTomato = mockIngredientData[1];
      mockLimit.mockResolvedValue({ data: [expectedTomato], error: null });

      const ingredients = [
        { item: 'ripe tomatoes', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown).toHaveLength(1);
      expect(result.ingredientBreakdown[0]?.matchedName).toBe(expectedTomato.name);
      expect(result.ingredientBreakdown[0]?.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate nutrition values accurately', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null }); // chicken 165 cal/100g

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // 200g of chicken at 165 cal/100g = 330 calories
      expect(result.totalNutrition.calories).toBe(330);
      expect(result.totalNutrition.protein_g).toBe(62); // 200g * 31g/100g
      expect(result.totalNutrition.fat_g).toBe(7.2); // 200g * 3.6g/100g
    });

    it('should round nutrition values to one decimal place', async () => {
      const oddNutrition = {
        name: 'Test ingredient',
        calories_per_100g: 123.456,
        protein_g_per_100g: 7.891,
        carbs_g_per_100g: 15.234,
        fat_g_per_100g: 2.678,
        sodium_mg_per_100g: 89.123,
      };

      mockLimit.mockResolvedValue({ data: [oddNutrition], error: null });

      const ingredients = [
        { item: 'test ingredient', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.totalNutrition.calories).toBe(123.5);
      expect(result.totalNutrition.protein_g).toBe(7.9);
      expect(result.totalNutrition.carbs_g).toBe(15.2);
      expect(result.totalNutrition.fat_g).toBe(2.7);
      expect(result.totalNutrition.sodium_mg).toBe(89.1);
    });

    it('should handle empty ingredients array', async () => {
      const result = await calculateSmartNutrition([], 2);

      expect(result.totalNutrition.calories).toBe(0);
      expect(result.perServing.calories).toBe(0);
      expect(result.ingredientBreakdown).toHaveLength(0);
      expect(result.unmatchedIngredients).toHaveLength(0);
    });

    it('should default to 2 servings when not specified', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients);

      expect(result.perServing.calories).toBe(result.totalNutrition.calories / 2);
    });

    it('should handle various oil types with correct density conversions', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[2]], error: null });

      const ingredients = [
        { item: 'olive oil', quantity: '100', unit: 'ml' },
        { item: 'coconut oil', quantity: '100', unit: 'ml' },
        { item: 'vegetable oil', quantity: '100', unit: 'ml' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // All oils should convert with 0.92 density
      result.ingredientBreakdown.forEach(ingredient => {
        expect(ingredient.gramsUsed).toBe(92); // 100ml * 0.92
      });
    });

    it('should handle complex recipe with mixed units and ingredients', async () => {
      mockLimit
        .mockResolvedValueOnce({ data: [mockIngredientData[0]], error: null }) // chicken
        .mockResolvedValueOnce({ data: [mockIngredientData[1]], error: null }) // tomatoes
        .mockResolvedValueOnce({ data: [mockIngredientData[2]], error: null }) // oil
        .mockResolvedValueOnce({ data: [], error: null }); // unmatched

      const ingredients = [
        { item: 'chicken breast', quantity: '1', unit: 'lb' },
        { item: 'tomatoes', quantity: '2', unit: 'whole' },
        { item: 'olive oil', quantity: '2', unit: 'tbsp' },
        { item: 'mystery spice', quantity: '1', unit: 'tsp' },
      ];

      const result = await calculateSmartNutrition(ingredients, 4);

      expect(result.ingredientBreakdown).toHaveLength(3);
      expect(result.unmatchedIngredients).toHaveLength(1);
      expect(result.unmatchedIngredients).toContain('mystery spice');

      // Check unit conversions
      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(453.59); // 1 lb
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(240); // 2 tomatoes * 120g
      expect(result.ingredientBreakdown[2]?.gramsUsed).toBe(30); // 2 tbsp * 15g

      // Should have reasonable nutrition totals
      expect(result.totalNutrition.calories).toBeGreaterThan(500);
      expect(result.perServing.calories).toBe(result.totalNutrition.calories / 4);
    });
  });

  describe('Unit Conversion Edge Cases', () => {
    beforeEach(() => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null });
    });

    it('should handle metric weight units correctly', async () => {
      const ingredients = [
        { item: 'test', quantity: '1', unit: 'kg' },
        { item: 'test', quantity: '500', unit: 'g' },
        { item: 'test', quantity: '8', unit: 'oz' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(1000); // 1 kg
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(500); // 500 g
      expect(result.ingredientBreakdown[2]?.gramsUsed).toBe(226.8); // 8 oz * 28.35
    });

    it('should handle liquid measurements with ingredient context', async () => {
      const ingredients = [
        { item: 'milk', quantity: '1', unit: 'cup' },
        { item: 'water', quantity: '250', unit: 'ml' },
        { item: 'broth', quantity: '1', unit: 'liter' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(240); // milk cup
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(250); // water ml
      expect(result.ingredientBreakdown[2]?.gramsUsed).toBe(1000); // broth liter
    });

    it('should handle count-based units with defaults', async () => {
      const ingredients = [
        { item: 'unknown item', quantity: '3', unit: 'pieces' },
        { item: 'generic item', quantity: '1', unit: 'item' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(300); // 3 * 100g default
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(100); // 1 * 100g default
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Supabase query errors', async () => {
      mockLimit.mockRejectedValue(new Error('Network error'));

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.unmatchedIngredients).toContain('chicken breast');
      expect(console.error).toHaveBeenCalledWith('Error finding ingredient match:', expect.any(Error));
    });

    it('should handle malformed ingredient data from database', async () => {
      const malformedData = [
        {
          name: 'Test ingredient',
          // Missing required nutrition fields
        },
        {
          name: null, // Invalid name
          calories_per_100g: 100,
          protein_g_per_100g: 10,
          carbs_g_per_100g: 5,
          fat_g_per_100g: 1,
          sodium_mg_per_100g: 20,
        },
      ];

      mockLimit.mockResolvedValue({ data: malformedData, error: null });

      const ingredients = [
        { item: 'test ingredient', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.unmatchedIngredients).toContain('test ingredient');
    });

    it('should handle zero or negative quantities gracefully', async () => {
      const ingredients = [
        { item: 'chicken breast', quantity: '0', unit: 'g' },
        { item: 'tomatoes', quantity: '-100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      // Should still process but with zero/negative values
      expect(result.ingredientBreakdown).toHaveLength(2);
      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(0);
      expect(result.ingredientBreakdown[1]?.gramsUsed).toBe(-100);
    });

    it('should handle very large quantities', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '10000', unit: 'kg' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.gramsUsed).toBe(10000000); // 10000 kg in grams
      expect(result.totalNutrition.calories).toBeGreaterThan(1000000);
    });

    it('should handle division by zero in serving calculations', async () => {
      mockLimit.mockResolvedValue({ data: [mockIngredientData[0]], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '200', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 0);

      // Should handle zero servings gracefully (likely Infinity or NaN)
      expect(typeof result.perServing.calories).toBe('number');
    });
  });

  describe('String Similarity and Matching', () => {
    it('should prioritize exact matches', async () => {
      const exactMatch = {
        name: 'chicken breast',
        calories_per_100g: 165,
        protein_g_per_100g: 31,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 3.6,
        sodium_mg_per_100g: 74,
      };

      mockLimit.mockResolvedValue({ data: [exactMatch], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.confidence).toBeGreaterThan(0.9);
    });

    it('should handle partial matches with appropriate confidence', async () => {
      const partialMatch = {
        name: 'Chicken, broilers or fryers, breast, meat only',
        calories_per_100g: 165,
        protein_g_per_100g: 31,
        carbs_g_per_100g: 0,
        fat_g_per_100g: 3.6,
        sodium_mg_per_100g: 74,
      };

      mockLimit.mockResolvedValue({ data: [partialMatch], error: null });

      const ingredients = [
        { item: 'chicken breast', quantity: '100', unit: 'g' },
      ];

      const result = await calculateSmartNutrition(ingredients, 1);

      expect(result.ingredientBreakdown[0]?.confidence).toBeGreaterThan(0.6);
      expect(result.ingredientBreakdown[0]?.confidence).toBeLessThan(1.0);
    });
  });
});
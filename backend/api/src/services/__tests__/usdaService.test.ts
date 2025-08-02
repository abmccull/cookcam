import { usdaService } from '../usdaService';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { supabase } from '../../index';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('USDAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.USDA_API_KEY = 'test-usda-key';
    process.env.USDA_API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
  });

  describe('searchFoods', () => {
    it('should search foods successfully', async () => {
      const mockResponse = {
        data: {
          foods: [
            {
              fdcId: 123456,
              description: 'Chicken, broiler or fryers, breast, meat only, raw',
              dataType: 'Foundation',
              foodNutrients: [
                {
                  nutrientId: 1003,
                  nutrientName: 'Protein',
                  value: 20.85,
                  unitName: 'G',
                },
                {
                  nutrientId: 1008,
                  nutrientName: 'Energy',
                  value: 165,
                  unitName: 'KCAL',
                },
              ],
            },
          ],
          totalHits: 1,
          currentPage: 1,
          totalPages: 1,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await usdaService.searchFoods('chicken breast');

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.nal.usda.gov/fdc/v1/foods/search', {
        params: {
          query: 'chicken breast',
          pageSize: 50,
          pageNumber: 1,
          api_key: 'test-usda-key',
        },
      });
      expect(logger.info).toHaveBeenCalledWith('USDA search completed', {
        query: 'chicken breast',
        totalHits: 1,
      });
    });

    it('should handle search with custom parameters', async () => {
      const mockResponse = {
        data: {
          foods: [],
          totalHits: 0,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await usdaService.searchFoods('apple', {
        pageSize: 25,
        pageNumber: 2,
        dataType: ['Foundation', 'SR Legacy'],
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.nal.usda.gov/fdc/v1/foods/search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'apple',
            pageSize: 25,
            pageNumber: 2,
            dataType: ['Foundation', 'SR Legacy'],
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('USDA API timeout'));

      await expect(usdaService.searchFoods('chicken')).rejects.toThrow('USDA API timeout');

      expect(logger.error).toHaveBeenCalledWith('USDA search failed', {
        query: 'chicken',
        error: expect.any(Error),
      });
    });

    it('should validate search query', async () => {
      await expect(usdaService.searchFoods('')).rejects.toThrow('Search query is required');
      await expect(usdaService.searchFoods('   ')).rejects.toThrow('Search query is required');
    });

    it('should handle missing API key', async () => {
      delete process.env.USDA_API_KEY;

      await expect(usdaService.searchFoods('chicken')).rejects.toThrow(
        'USDA API key is not configured'
      );
    });
  });

  describe('getFoodDetails', () => {
    it('should get food details successfully', async () => {
      const mockResponse = {
        data: {
          fdcId: 123456,
          description: 'Chicken, broiler or fryers, breast, meat only, raw',
          dataType: 'Foundation',
          foodNutrients: [
            {
              nutrient: {
                id: 1003,
                name: 'Protein',
                unitName: 'G',
              },
              amount: 20.85,
            },
            {
              nutrient: {
                id: 1008,
                name: 'Energy',
                unitName: 'KCAL',
              },
              amount: 165,
            },
          ],
          foodPortions: [
            {
              id: 1,
              measureUnit: {
                name: 'cup',
              },
              gramWeight: 140,
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await usdaService.getFoodDetails(123456);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.nal.usda.gov/fdc/v1/food/123456', {
        params: {
          api_key: 'test-usda-key',
        },
      });
    });

    it('should handle food not found', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      await expect(usdaService.getFoodDetails(999999)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('USDA food details failed', {
        fdcId: 999999,
        error: expect.any(Object),
      });
    });

    it('should validate FDC ID', async () => {
      await expect(usdaService.getFoodDetails(0)).rejects.toThrow('Valid FDC ID is required');
      await expect(usdaService.getFoodDetails(-123)).rejects.toThrow('Valid FDC ID is required');
    });
  });

  describe('syncIngredientWithUSDA', () => {
    it('should sync ingredient successfully', async () => {
      const mockIngredient = {
        id: 'ingredient-123',
        name: 'Chicken Breast',
        fdc_id: null,
      };

      const mockUSDASearch = {
        data: {
          foods: [
            {
              fdcId: 123456,
              description: 'Chicken, broiler or fryers, breast, meat only, raw',
              dataType: 'Foundation',
            },
          ],
        },
      };

      const mockUSDADetails = {
        data: {
          fdcId: 123456,
          foodNutrients: [
            {
              nutrient: { name: 'Protein', unitName: 'G' },
              amount: 20.85,
            },
          ],
        },
      };

      const mockUpdatedIngredient = {
        ...mockIngredient,
        fdc_id: 123456,
        nutrition_data: mockUSDADetails.data,
      };

      // Mock database calls
      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockIngredient, error: null })
        .mockResolvedValueOnce({ data: mockUpdatedIngredient, error: null });

      // Mock USDA API calls
      mockedAxios.get.mockResolvedValueOnce(mockUSDASearch).mockResolvedValueOnce(mockUSDADetails);

      const result = await usdaService.syncIngredientWithUSDA('ingredient-123');

      expect(result).toEqual(mockUpdatedIngredient);
      expect(supabase.update).toHaveBeenCalledWith({
        fdc_id: 123456,
        nutrition_data: mockUSDADetails.data,
        usda_sync_date: expect.any(String),
      });
    });

    it('should handle ingredient not found', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(usdaService.syncIngredientWithUSDA('nonexistent')).rejects.toThrow(
        'Ingredient not found'
      );
    });

    it('should handle no USDA matches', async () => {
      const mockIngredient = {
        id: 'ingredient-123',
        name: 'Unknown Food Item',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockIngredient,
        error: null,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { foods: [] },
      });

      await expect(usdaService.syncIngredientWithUSDA('ingredient-123')).rejects.toThrow(
        'No USDA data found for ingredient'
      );
    });

    it('should prefer Foundation data over other types', async () => {
      const mockIngredient = {
        id: 'ingredient-123',
        name: 'Apple',
      };

      const mockUSDASearch = {
        data: {
          foods: [
            { fdcId: 1, dataType: 'Branded', description: 'Generic Apple' },
            { fdcId: 2, dataType: 'Foundation', description: 'Apple, raw' },
            { fdcId: 3, dataType: 'SR Legacy', description: 'Apples, raw' },
          ],
        },
      };

      const mockUSDADetails = {
        data: { fdcId: 2, description: 'Apple, raw' },
      };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockIngredient, error: null })
        .mockResolvedValueOnce({ data: { ...mockIngredient, fdc_id: 2 }, error: null });

      mockedAxios.get.mockResolvedValueOnce(mockUSDASearch).mockResolvedValueOnce(mockUSDADetails);

      await usdaService.syncIngredientWithUSDA('ingredient-123');

      expect(mockedAxios.get).toHaveBeenLastCalledWith(
        'https://api.nal.usda.gov/fdc/v1/food/2',
        expect.any(Object)
      );
    });
  });

  describe('bulkSyncIngredients', () => {
    it('should sync multiple ingredients successfully', async () => {
      const mockIngredients = [
        { id: 'ing-1', name: 'Apple', fdc_id: null },
        { id: 'ing-2', name: 'Banana', fdc_id: null },
      ];

      const mockResults = [
        { id: 'ing-1', fdc_id: 12345, status: 'success' },
        { id: 'ing-2', fdc_id: 67890, status: 'success' },
      ];

      // Mock the individual sync calls
      jest
        .spyOn(usdaService, 'syncIngredientWithUSDA')
        .mockResolvedValueOnce(mockResults[0] as any)
        .mockResolvedValueOnce(mockResults[1] as any);

      const result = await usdaService.bulkSyncIngredients(['ing-1', 'ing-2']);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures', async () => {
      const ingredientIds = ['ing-1', 'ing-2', 'ing-3'];

      jest
        .spyOn(usdaService, 'syncIngredientWithUSDA')
        .mockResolvedValueOnce({ id: 'ing-1', status: 'success' } as any)
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValueOnce({ id: 'ing-3', status: 'success' } as any);

      const result = await usdaService.bulkSyncIngredients(ingredientIds);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        ingredientId: 'ing-2',
        error: 'Sync failed',
      });
    });

    it('should validate ingredient IDs array', async () => {
      await expect(usdaService.bulkSyncIngredients([])).rejects.toThrow(
        'Ingredient IDs array cannot be empty'
      );

      await expect(usdaService.bulkSyncIngredients([''])).rejects.toThrow(
        'All ingredient IDs must be non-empty strings'
      );
    });

    it('should limit bulk operations', async () => {
      const manyIds = Array(150)
        .fill(0)
        .map((_, i) => `ing-${i}`);

      await expect(usdaService.bulkSyncIngredients(manyIds)).rejects.toThrow(
        'Cannot sync more than 100 ingredients at once'
      );
    });
  });

  describe('getNutritionData', () => {
    it('should extract nutrition data successfully', async () => {
      const mockFoodData = {
        fdcId: 123456,
        description: 'Test Food',
        foodNutrients: [
          {
            nutrient: { id: 1003, name: 'Protein', unitName: 'G' },
            amount: 20.85,
          },
          {
            nutrient: { id: 1008, name: 'Energy', unitName: 'KCAL' },
            amount: 165,
          },
          {
            nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'G' },
            amount: 3.57,
          },
          {
            nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'G' },
            amount: 0,
          },
          {
            nutrient: { id: 1079, name: 'Fiber, total dietary', unitName: 'G' },
            amount: 0,
          },
          {
            nutrient: { id: 1087, name: 'Calcium, Ca', unitName: 'MG' },
            amount: 15,
          },
          {
            nutrient: { id: 1089, name: 'Iron, Fe', unitName: 'MG' },
            amount: 0.89,
          },
        ],
      };

      const result = usdaService.getNutritionData(mockFoodData);

      expect(result).toEqual({
        calories: 165,
        protein: 20.85,
        fat: 3.57,
        carbs: 0,
        fiber: 0,
        calcium: 15,
        iron: 0.89,
      });
    });

    it('should handle missing nutrients', async () => {
      const mockFoodData = {
        fdcId: 123456,
        description: 'Test Food',
        foodNutrients: [
          {
            nutrient: { id: 1008, name: 'Energy', unitName: 'KCAL' },
            amount: 100,
          },
        ],
      };

      const result = usdaService.getNutritionData(mockFoodData);

      expect(result).toEqual({
        calories: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
      });
    });

    it('should handle invalid food data', async () => {
      expect(usdaService.getNutritionData(null)).toEqual({
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
      });

      expect(usdaService.getNutritionData({})).toEqual({
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        calcium: 0,
        iron: 0,
      });
    });
  });

  describe('searchByCategory', () => {
    it('should search foods by category successfully', async () => {
      const mockResponse = {
        data: {
          foods: [
            { fdcId: 1, description: 'Apple, raw', foodCategory: 'Fruits' },
            { fdcId: 2, description: 'Orange, raw', foodCategory: 'Fruits' },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await usdaService.searchByCategory('Fruits');

      expect(result).toEqual(mockResponse.data.foods);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.nal.usda.gov/fdc/v1/foods/search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: '*',
            foodCategory: 'Fruits',
          }),
        })
      );
    });

    it('should validate category name', async () => {
      await expect(usdaService.searchByCategory('')).rejects.toThrow('Category name is required');
    });
  });

  describe('getPopularFoods', () => {
    it('should get popular foods successfully', async () => {
      const mockFoods = [
        { fdcId: 1, description: 'Chicken breast', searchCount: 1000 },
        { fdcId: 2, description: 'Brown rice', searchCount: 800 },
        { fdcId: 3, description: 'Broccoli', searchCount: 600 },
      ];

      (supabase.limit as jest.Mock).mockResolvedValueOnce({
        data: mockFoods,
        error: null,
      });

      const result = await usdaService.getPopularFoods();

      expect(result).toEqual(mockFoods);
      expect(supabase.from).toHaveBeenCalledWith('popular_foods');
      expect(supabase.order).toHaveBeenCalledWith('search_count', { ascending: false });
      expect(supabase.limit).toHaveBeenCalledWith(50);
    });

    it('should handle custom limit', async () => {
      (supabase.limit as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await usdaService.getPopularFoods(25);

      expect(supabase.limit).toHaveBeenCalledWith(25);
    });

    it('should handle database errors', async () => {
      (supabase.limit as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(usdaService.getPopularFoods()).rejects.toThrow('Failed to fetch popular foods');
    });
  });

  describe('cacheSearchResult', () => {
    it('should cache search results successfully', async () => {
      const searchQuery = 'chicken breast';
      const searchResults = {
        foods: [{ fdcId: 123, description: 'Chicken breast' }],
        totalHits: 1,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'cache-123',
          query: searchQuery,
          results: searchResults,
        },
        error: null,
      });

      const result = await usdaService.cacheSearchResult(searchQuery, searchResults);

      expect(result).toBeDefined();
      expect(supabase.upsert).toHaveBeenCalledWith({
        query: searchQuery,
        results: searchResults,
        cached_at: expect.any(String),
      });
    });

    it('should handle cache storage errors', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Cache storage failed' },
      });

      // Should not throw, just log the error
      await expect(usdaService.cacheSearchResult('test', {})).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith('Failed to cache search result', expect.any(Object));
    });
  });

  describe('getCachedSearchResult', () => {
    it('should retrieve cached results successfully', async () => {
      const cachedResult = {
        query: 'apple',
        results: { foods: [{ fdcId: 456 }] },
        cached_at: '2024-01-01T00:00:00Z',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: cachedResult,
        error: null,
      });

      const result = await usdaService.getCachedSearchResult('apple');

      expect(result).toEqual(cachedResult.results);
    });

    it('should handle cache miss', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await usdaService.getCachedSearchResult('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle expired cache entries', async () => {
      const expiredResult = {
        query: 'old search',
        results: { foods: [] },
        cached_at: '2023-01-01T00:00:00Z', // Very old
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: expiredResult,
        error: null,
      });

      const result = await usdaService.getCachedSearchResult('old search', 3600); // 1 hour TTL

      expect(result).toBeNull();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle API rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(usdaService.searchFoods('apple')).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('USDA search failed', {
        query: 'apple',
        error: rateLimitError,
      });
    });

    it('should handle network timeouts', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout' };

      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      await expect(usdaService.getFoodDetails(123)).rejects.toThrow();
    });

    it('should validate search parameters', async () => {
      await expect(usdaService.searchFoods('a', { pageSize: 0 })).rejects.toThrow(
        'Page size must be between 1 and 200'
      );

      await expect(usdaService.searchFoods('a', { pageSize: 300 })).rejects.toThrow(
        'Page size must be between 1 and 200'
      );

      await expect(usdaService.searchFoods('a', { pageNumber: 0 })).rejects.toThrow(
        'Page number must be positive'
      );
    });

    it('should handle malformed API responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: 'invalid response format',
      });

      await expect(usdaService.searchFoods('test')).rejects.toThrow();
    });

    it('should handle concurrent sync operations gracefully', async () => {
      const ingredientIds = ['ing-1', 'ing-2', 'ing-3'];

      // Mock all sync calls to succeed
      jest.spyOn(usdaService, 'syncIngredientWithUSDA').mockImplementation(
        async (id) =>
          ({
            id,
            status: 'success',
          }) as any
      );

      const result = await usdaService.bulkSyncIngredients(ingredientIds);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe('Configuration and environment', () => {
    it('should use custom API base URL', async () => {
      process.env.USDA_API_BASE_URL = 'https://custom-usda-api.com/v1';

      mockedAxios.get.mockResolvedValueOnce({
        data: { foods: [] },
      });

      await usdaService.searchFoods('test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://custom-usda-api.com/v1/foods/search',
        expect.any(Object)
      );
    });

    it('should fall back to demo key when API key is missing', async () => {
      delete process.env.USDA_API_KEY;
      process.env.NODE_ENV = 'development';

      mockedAxios.get.mockResolvedValueOnce({
        data: { foods: [] },
      });

      await usdaService.searchFoods('test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api_key: 'DEMO_KEY',
          }),
        })
      );
    });
  });
});

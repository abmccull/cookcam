import request from 'supertest';
import express from 'express';
import ingredientsRouter from '../ingredients';
import { supabase } from '../../index';
import axios from 'axios';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/ingredients', ingredientsRouter);

describe('Ingredients Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /ingredients/search', () => {
    it('should search ingredients successfully with q parameter', async () => {
      const mockResults = [
        { id: 1, name: 'Chicken Breast', searchable_text: 'chicken breast meat' },
        { id: 2, name: 'Chicken Thigh', searchable_text: 'chicken thigh meat' },
      ];

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockResults,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/search?q=chicken&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('local');
      expect(response.body.data.results).toEqual(mockResults);
      expect(response.body.data.total).toBe(2);
      expect(mockQuery.or).toHaveBeenCalledWith(
        'name.ilike.%chicken%,searchable_text.ilike.%chicken%'
      );
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should search ingredients successfully with query parameter', async () => {
      const mockResults = [{ id: 1, name: 'Tomato', searchable_text: 'red tomato vegetable' }];

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockResults,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/search?query=tomato');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toEqual(mockResults);
    });

    it('should require search query parameter', async () => {
      const response = await request(app).get('/ingredients/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Query parameter (q or query) is required');
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/search?q=test');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to search ingredients');
      expect(logger.error).toHaveBeenCalledWith('Database search error:', expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).get('/ingredients/search?q=test');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to search ingredients');
      expect(logger.error).toHaveBeenCalledWith('Search error:', expect.any(Error));
    });

    it('should use default limit when not provided', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/ingredients/search?q=test');

      expect(mockQuery.limit).toHaveBeenCalledWith(20); // Default limit is 20
    });
  });

  describe('GET /ingredients/usda/search', () => {
    it('should search USDA database successfully', async () => {
      const mockUSDAResponse = {
        foods: [
          { fdcId: 12345, description: 'Chicken, broiler or fryers, breast, meat only, raw' },
          { fdcId: 67890, description: 'Chicken, broiler or fryers, thigh, meat only, raw' },
        ],
        totalHits: 2,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockUSDAResponse,
      });

      const response = await request(app).get('/ingredients/usda/search?q=chicken&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUSDAResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/foods/search'), {
        params: {
          query: 'chicken',
          pageSize: 5,
          api_key: expect.any(String),
        },
      });
    });

    it('should require search query parameter', async () => {
      const response = await request(app).get('/ingredients/usda/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Query parameter (q or query) is required');
    });

    it('should handle USDA API errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('USDA API timeout'));

      const response = await request(app).get('/ingredients/usda/search?q=chicken');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to search USDA database');
      expect(logger.error).toHaveBeenCalledWith('USDA search error:', expect.any(Error));
    });

    it('should use default limit when not provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { foods: [] },
      });

      await request(app).get('/ingredients/usda/search?q=test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            pageSize: 10,
          }),
        })
      );
    });
  });

  describe('POST /ingredients/:id/sync-usda', () => {
    it('should sync ingredient with USDA data successfully', async () => {
      const mockIngredient = { id: 1, name: 'Chicken Breast', fdc_id: null };
      const mockUSDAResponse = {
        foods: [
          {
            fdcId: 12345,
            description: 'Chicken, broiler or fryers, breast, meat only, raw',
            dataType: 'Foundation',
          },
        ],
      };
      const mockUSDAFood = {
        fdcId: 12345,
        description: 'Chicken, broiler or fryers, breast, meat only, raw',
        foodNutrients: [{ nutrient: { name: 'Protein' }, amount: 20.5, unitName: 'G' }],
      };

      // Mock ingredient fetch (select)
      const mockSelectQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockIngredient,
          error: null,
        }),
      };

      // Mock ingredient update
      const mockUpdateQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };

      // Setup mocks in sequence
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Mock USDA API calls
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockUSDAResponse })
        .mockResolvedValueOnce({ data: mockUSDAFood });

      const response = await request(app).post('/ingredients/1/sync-usda');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Starting USDA sync'));
    });

    it('should handle ingredient not found', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'No rows found' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).post('/ingredients/999/sync-usda');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ingredient not found');
    });

    it('should handle no USDA data found', async () => {
      const mockIngredient = { id: 1, name: 'Unknown Food' };

      const mockSelectQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockIngredient,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      mockedAxios.get.mockResolvedValueOnce({
        data: { foods: [] },
      });

      const response = await request(app).post('/ingredients/1/sync-usda');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No USDA data found for this ingredient');
    });
  });

  describe('GET /ingredients', () => {
    it('should get all ingredients with default pagination', async () => {
      const mockIngredients = [
        { id: 1, name: 'Chicken', category: 'Meat' },
        { id: 2, name: 'Rice', category: 'Grain' },
      ];

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: mockIngredients,
          error: null,
          count: 2,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients).toEqual(mockIngredients);
      expect(response.body.data.pagination.total).toBe(2);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19); // Default 20 limit
    });

    it('should handle custom pagination', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
          count: 0,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/ingredients?page=2&limit=10');

      expect(mockQuery.range).toHaveBeenCalledWith(10, 19); // page 2, limit 10
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch ingredients');
    });
  });

  describe('GET /ingredients/:id', () => {
    it('should get ingredient by ID successfully', async () => {
      const mockIngredient = {
        id: 1,
        name: 'Chicken Breast',
        category: 'Meat',
        fdc_id: 12345,
        nutrition: { protein: 20.5, calories: 165 },
      };

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockIngredient,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockIngredient);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should handle ingredient not found', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'No rows found' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/999');

      expect(response.status).toBe(500); // API returns 500 for database errors
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch ingredient');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch ingredient');
    });
  });

  describe('Input Validation', () => {
    it('should validate search query length', async () => {
      const response = await request(app).get('/ingredients/search?q=');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Query parameter (q or query) is required');
    });

    it('should handle malformed query parameters', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/ingredients/search?q=test&limit=invalid');

      expect(response.status).toBe(200); // Should still work with NaN limit
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout' });

      const response = await request(app).get('/ingredients/usda/search?q=chicken');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to search USDA database');
    });

    it('should handle unexpected server errors', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).get('/ingredients/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch ingredient');
    });
  });
});

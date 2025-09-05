import request from 'supertest';
import express from 'express';
import cachedRecipesRoutes from '../recipes.example.cached';
import { cacheService } from '../../services/cache';

// Mock dependencies
jest.mock('../../services/cache');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  }
}));

jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'recipe-1', title: 'Test Recipe 1' },
            { id: 'recipe-2', title: 'Test Recipe 2' }
          ],
          error: null
        })
      })
    })
  }
}));

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('Cached Recipes Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/recipes', cachedRecipesRoutes);
    jest.clearAllMocks();
  });

  describe('POST /recipes/generate', () => {
    const requestBody = {
      ingredients: ['chicken', 'rice'],
      dietaryPreferences: ['gluten-free'],
      cuisineType: 'asian'
    };

    it('should return cached suggestions when available', async () => {
      const cachedData = [
        { id: 'recipe-1', title: 'Cached Recipe 1' },
        { id: 'recipe-2', title: 'Cached Recipe 2' }
      ];

      mockCacheService.get.mockResolvedValueOnce(cachedData);

      const response = await request(app)
        .post('/recipes/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: cachedData,
        cached: true
      });

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should generate new suggestions when not cached', async () => {
      mockCacheService.get.mockResolvedValueOnce(null); // No cache
      mockCacheService.set.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/recipes/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('cached', false);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle cache service errors gracefully', async () => {
      mockCacheService.get.mockRejectedValueOnce(new Error('Cache error'));
      mockCacheService.set.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/recipes/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('cached', false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/recipes/generate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Basic route imports', () => {
    it('should import cached recipes routes without throwing', () => {
      expect(cachedRecipesRoutes).toBeDefined();
      expect(typeof cachedRecipesRoutes).toBe('function');
    });
  });
});
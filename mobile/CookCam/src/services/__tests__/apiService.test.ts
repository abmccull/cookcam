// Mock expo-constants before other imports
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        API_BASE_URL: 'http://localhost:3000',
      }
    }
  }
}));

import { server } from '../../test/server';
import { http, HttpResponse } from 'msw';
import { apiService } from '../apiService';
import { secureStorage } from '../secureStorage';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../secureStorage');
jest.mock('../../utils/logger');

const mockedSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStorage.getSecureItem.mockResolvedValue(null);
  });

  describe('GET requests', () => {
    it('should fetch data successfully', async () => {
      const result = await apiService.get('/recipes');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recipes');
      expect(result.data.recipes).toHaveLength(2);
    });

    it('should handle 404 errors', async () => {
      const result = await apiService.get('/error/404');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not Found');
      expect(result.status).toBe(404);
    });

    it('should handle 500 server errors', async () => {
      const result = await apiService.get('/error/500');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal Server Error');
      expect(result.status).toBe(500);
    });

    it('should add auth headers when token exists', async () => {
      mockedSecureStorage.getSecureItem.mockResolvedValue('test-token');
      
      const result = await apiService.get('/user');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('email');
      expect(mockedSecureStorage.getSecureItem).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('*/api/network-error', () => {
          throw new Error('Network error');
        })
      );

      const result = await apiService.get('/network-error');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();
      
      const resultPromise = apiService.get('/timeout');
      
      jest.advanceTimersByTime(31000); // Advance past timeout
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      
      jest.useRealTimers();
    });

    it('should handle query parameters', async () => {
      const result = await apiService.get('/recipes?page=2&limit=20');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should clear auth token on 401 errors', async () => {
      mockedSecureStorage.getSecureItem.mockResolvedValue(null);
      
      const result = await apiService.get('/user');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(mockedSecureStorage.clearAllSecureData).toHaveBeenCalled();
    });
  });

  describe('POST requests', () => {
    it('should send data correctly', async () => {
      const recipeData = {
        title: 'New Recipe',
        ingredients: ['ingredient1', 'ingredient2']
      };
      
      const result = await apiService.post('/recipes', recipeData);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data).toHaveProperty('id');
      expect(result.data.title).toBe('New Recipe');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post('*/api/recipes', () => {
          return HttpResponse.json(
            { error: 'Validation failed', fields: ['title'] },
            { status: 400 }
          );
        })
      );

      const result = await apiService.post('/recipes', {});
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle empty response bodies', async () => {
      server.use(
        http.post('*/api/empty', () => {
          return HttpResponse.json({}, { status: 204 });
        })
      );

      const result = await apiService.post('/empty', { data: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.status).toBe(204);
    });

    it('should send auth token in headers', async () => {
      mockedSecureStorage.getSecureItem.mockResolvedValue('auth-token');
      
      const result = await apiService.post('/recipes', { title: 'Test' });
      
      expect(result.success).toBe(true);
      expect(mockedSecureStorage.getSecureItem).toHaveBeenCalled();
    });
  });

  describe('PUT requests', () => {
    it('should update data correctly', async () => {
      const updateData = { title: 'Updated Recipe' };
      
      const result = await apiService.put('/recipes/1', updateData);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('updatedAt');
      expect(result.data.title).toBe('Updated Recipe');
    });

    it('should handle non-existent resources', async () => {
      server.use(
        http.put('*/api/recipes/999', () => {
          return HttpResponse.json(
            { error: 'Recipe not found' },
            { status: 404 }
          );
        })
      );

      const result = await apiService.put('/recipes/999', { title: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('DELETE requests', () => {
    it('should delete resources successfully', async () => {
      const result = await apiService.delete('/recipes/1');
      
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(result.data.id).toBe('1');
    });

    it('should handle delete of non-existent resources', async () => {
      server.use(
        http.delete('*/api/recipes/999', () => {
          return HttpResponse.json(
            { error: 'Recipe not found' },
            { status: 404 }
          );
        })
      );

      const result = await apiService.delete('/recipes/999');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('PATCH requests', () => {
    it('should partially update data', async () => {
      server.use(
        http.patch('*/api/recipes/1', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: '1',
            ...body,
            updatedAt: new Date().toISOString()
          });
        })
      );

      const result = await apiService.patch('/recipes/1', { calories: 400 });
      
      expect(result.success).toBe(true);
      expect(result.data.calories).toBe(400);
      expect(result.data).toHaveProperty('updatedAt');
    });
  });

  describe('Authentication', () => {
    it('should set auth tokens', async () => {
      await apiService.setAuthToken('access-token', 'refresh-token');
      
      expect(mockedSecureStorage.setAuthTokens).toHaveBeenCalledWith(
        'access-token',
        'refresh-token'
      );
    });

    it('should remove auth tokens', async () => {
      await apiService.removeAuthToken();
      
      expect(mockedSecureStorage.clearAllSecureData).toHaveBeenCalled();
      expect(mockedSecureStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle auth token retrieval errors', async () => {
      mockedSecureStorage.getSecureItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await apiService.get('/user');
      
      expect(result.success).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error getting auth token:',
        expect.any(Error)
      );
    });
  });

  describe('Retry logic', () => {
    it('should retry failed requests', async () => {
      let attempts = 0;
      server.use(
        http.get('*/api/flaky', () => {
          attempts++;
          if (attempts < 3) {
            return HttpResponse.json(
              { error: 'Server error' },
              { status: 500 }
            );
          }
          return HttpResponse.json({ success: true });
        })
      );

      const result = await apiService.get('/flaky');
      
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should respect max retry limit', async () => {
      server.use(
        http.get('*/api/always-fail', () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const result = await apiService.get('/always-fail');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
    });

    it('should not retry 4xx errors', async () => {
      let attempts = 0;
      server.use(
        http.get('*/api/bad-request', () => {
          attempts++;
          return HttpResponse.json(
            { error: 'Bad request' },
            { status: 400 }
          );
        })
      );

      const result = await apiService.get('/bad-request');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(attempts).toBe(1);
    });
  });

  describe('Health check', () => {
    it('should return true when API is healthy', async () => {
      server.use(
        http.get('*/api/health', () => {
          return HttpResponse.json({ status: 'ok' });
        })
      );

      const isHealthy = await apiService.healthCheck();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      server.use(
        http.get('*/api/health', () => {
          return HttpResponse.json(
            { status: 'error' },
            { status: 503 }
          );
        })
      );

      const isHealthy = await apiService.healthCheck();
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('Custom headers', () => {
    it('should merge custom headers with default headers', async () => {
      server.use(
        http.get('*/api/custom-headers', ({ request }) => {
          const customHeader = request.headers.get('x-custom-header');
          return HttpResponse.json({ customHeader });
        })
      );

      const result = await apiService.get('/custom-headers', {
        'X-Custom-Header': 'test-value'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.customHeader).toBe('test-value');
    });
  });

  describe('Logging', () => {
    it('should log requests in debug mode', async () => {
      await apiService.get('/recipes');
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('API GET'),
        expect.any(String)
      );
    });

    it('should log successful responses', async () => {
      await apiService.get('/recipes');
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('API GET'),
        expect.anything()
      );
    });

    it('should log errors', async () => {
      await apiService.get('/error/500');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API ERROR'),
        expect.anything()
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty endpoint strings', async () => {
      const result = await apiService.get('');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle special characters in endpoints', async () => {
      server.use(
        http.get('*/api/search', ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('q');
          return HttpResponse.json({ query });
        })
      );

      const result = await apiService.get('/search?q=test%20query');
      
      expect(result.success).toBe(true);
    });

    it('should handle large response bodies', async () => {
      server.use(
        http.get('*/api/large', () => {
          const largeArray = Array(1000).fill({ data: 'test' });
          return HttpResponse.json(largeArray);
        })
      );

      const result = await apiService.get('/large');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
    });

    it('should handle concurrent requests', async () => {
      const requests = [
        apiService.get('/recipes'),
        apiService.get('/user'),
        apiService.post('/recipes', { title: 'Test' })
      ];

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
      });
    });
  });
});
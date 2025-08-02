// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import apiService from '../../services/apiService';
import tokenManager from '../../services/tokenManager';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/tokenManager');
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('apiService', () => {
  const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenManager.getAccessToken.mockResolvedValue('test-token');
  });

  describe('GET requests', () => {
    it('should make GET request with authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      const result = await apiService.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await apiService.get('/test-endpoint', { 
        params: { 
          page: 1, 
          limit: 10 
        } 
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should work without authentication token', async () => {
      mockTokenManager.getAccessToken.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await apiService.get('/public-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '123', success: true }),
      } as Response);

      const body = { name: 'Test', value: 42 };
      const result = await apiService.post('/test-endpoint', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ id: '123', success: true });
    });

    it('should handle FormData body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      const formData = new FormData();
      formData.append('file', 'test-file');

      await apiService.post('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      } as Response);

      const body = { id: '123', name: 'Updated' };
      const result = await apiService.put('/test-endpoint/123', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe('PATCH requests', () => {
    it('should make PATCH request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ patched: true }),
      } as Response);

      const body = { field: 'new-value' };
      const result = await apiService.patch('/test-endpoint/123', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({ patched: true });
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      } as Response);

      const result = await apiService.delete('/test-endpoint/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.cookcam.com/test-endpoint/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({});
    });
  });

  describe('Error handling', () => {
    it('should handle 401 Unauthorized and refresh token', async () => {
      mockTokenManager.getRefreshToken.mockResolvedValueOnce('refresh-token');
      mockTokenManager.setTokens.mockResolvedValueOnce(undefined);
      
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);
      
      // Token refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          access: 'new-token', 
          refresh: 'new-refresh-token' 
        }),
      } as Response);
      
      // Retry call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await apiService.get('/protected-endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith({
        access: 'new-token',
        refresh: 'new-refresh-token',
      });
      expect(result).toEqual({ data: 'success' });
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      } as Response);

      await expect(apiService.get('/missing-endpoint')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('404'),
        })
      );
    });

    it('should handle 500 Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      await expect(apiService.get('/error-endpoint')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('500'),
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.get('/test-endpoint')).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ data: 'test' }),
            } as Response);
          }, 70000); // Longer than timeout
        })
      );

      const promise = apiService.get('/slow-endpoint');
      
      jest.advanceTimersByTime(70000);
      
      await expect(promise).rejects.toThrow();
      
      jest.useRealTimers();
    });

    it('should retry failed requests', async () => {
      // First two calls fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Third call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await apiService.get('/test-endpoint', { retry: 3 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        apiService.get('/test-endpoint', { retry: 3 })
      ).rejects.toThrow('Network error');
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Request interceptors', () => {
    it('should add custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await apiService.get('/test-endpoint', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should handle request timeout option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await apiService.get('/test-endpoint', { timeout: 5000 });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Response handling', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content');
        },
      } as Response);

      const result = await apiService.delete('/test-endpoint/123');

      expect(result).toBeUndefined();
    });

    it('should handle non-JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Plain text response',
      } as Response);

      await expect(apiService.get('/test-endpoint')).rejects.toThrow();
    });
  });
});
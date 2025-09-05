// Mock dependencies before imports
jest.mock('../../utils/logger');
jest.mock('expo-secure-store');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import logger from '../../utils/logger';

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock API request function type
type ApiFunction<T, P = any> = (params?: P) => Promise<T>;

// Request state interface
interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Hook configuration options
interface UseApiOptions {
  immediate?: boolean;  // Execute on mount
  cacheKey?: string;   // Cache results
  cacheTimeout?: number; // Cache expiration in ms
  retryAttempts?: number; // Number of retry attempts
  retryDelay?: number;  // Delay between retries in ms
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

// Hook return interface
interface UseApiReturn<T, P> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  execute: (params?: P) => Promise<T | null>;
  refresh: () => Promise<T | null>;
  reset: () => void;
  retry: () => Promise<T | null>;
}

// Create a mock useApi hook implementation
const useApi = <T, P = any>(
  apiFunction: ApiFunction<T, P>,
  options: UseApiOptions = {}
): UseApiReturn<T, P> => {
  const {
    immediate = false,
    cacheKey,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = React.useState<RequestState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const [lastParams, setLastParams] = React.useState<P | undefined>();
  const [retryCount, setRetryCount] = React.useState(0);

  // Load from cache if available
  const loadFromCache = React.useCallback(async (): Promise<T | null> => {
    if (!cacheKey) return null;

    try {
      const cached = await mockedSecureStore.getItemAsync(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTimeout) {
          return data;
        }
      }
    } catch (error) {
      logger.warn('Failed to load from cache:', error);
    }
    return null;
  }, [cacheKey, cacheTimeout]);

  // Save to cache
  const saveToCache = React.useCallback(async (data: T) => {
    if (!cacheKey) return;

    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await mockedSecureStore.setItemAsync(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      logger.warn('Failed to save to cache:', error);
    }
  }, [cacheKey]);

  // Execute API call with retry logic
  const executeWithRetry = React.useCallback(async (
    params?: P,
    attempt: number = 0
  ): Promise<T | null> => {
    try {
      const result = await apiFunction(params);
      setRetryCount(0);
      return result;
    } catch (error: any) {
      if (attempt < retryAttempts) {
        logger.debug(`API call failed, retrying attempt ${attempt + 1}/${retryAttempts}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeWithRetry(params, attempt + 1);
      }
      throw error;
    }
  }, [apiFunction, retryAttempts, retryDelay]);

  // Main execute function
  const execute = React.useCallback(async (params?: P): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      setLastParams(params);

      // Try cache first if no params changed
      if (!params && state.data && cacheKey) {
        const cached = await loadFromCache();
        if (cached) {
          setState(prev => ({ ...prev, data: cached, loading: false }));
          return cached;
        }
      }

      const result = await executeWithRetry(params);
      
      setState({
        data: result,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });

      if (result && cacheKey) {
        await saveToCache(result);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }

      logger.error('API call failed:', error);
      return null;
    }
  }, [state.data, cacheKey, loadFromCache, executeWithRetry, saveToCache, onSuccess, onError]);

  // Refresh function (bypass cache)
  const refresh = React.useCallback(async (): Promise<T | null> => {
    if (cacheKey) {
      await mockedSecureStore.deleteItemAsync(cacheKey);
    }
    return execute(lastParams);
  }, [execute, lastParams, cacheKey]);

  // Reset function
  const reset = React.useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
    setLastParams(undefined);
    setRetryCount(0);
  }, []);

  // Retry function
  const retry = React.useCallback(async (): Promise<T | null> => {
    setRetryCount(prev => prev + 1);
    return execute(lastParams);
  }, [execute, lastParams]);

  // Execute on mount if immediate is true
  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // Only depend on immediate flag

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    execute,
    refresh,
    reset,
    retry
  };
};

// Mock API functions for testing
const mockApiSuccess = jest.fn().mockResolvedValue({ id: 1, name: 'Test Data' });
const mockApiError = jest.fn().mockRejectedValue(new Error('API Error'));
const mockApiWithParams = jest.fn().mockResolvedValue({ id: 2, name: 'Param Data' });

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useApi(mockApiSuccess));

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should execute immediately when immediate option is true', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess, { immediate: true }));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
      });

      expect(mockApiSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not execute immediately by default', () => {
      renderHook(() => useApi(mockApiSuccess));

      expect(mockApiSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Manual Execution', () => {
    it('should execute API call successfully', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess));

      let data: any;
      await act(async () => {
        data = await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeGreaterThan(0);
      expect(data).toEqual({ id: 1, name: 'Test Data' });
    });

    it('should handle API errors', async () => {
      const { result } = renderHook(() => useApi(mockApiError));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('API Error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'API call failed:',
        expect.any(Error)
      );
    });

    it('should pass parameters to API function', async () => {
      const { result } = renderHook(() => useApi(mockApiWithParams));

      const params = { search: 'test' };
      await act(async () => {
        await result.current.execute(params);
      });

      expect(mockApiWithParams).toHaveBeenCalledWith(params);
      expect(result.current.data).toEqual({ id: 2, name: 'Param Data' });
    });

    it('should set loading state during execution', async () => {
      let resolveApi: (value: any) => void;
      const slowApi = jest.fn(() => new Promise(resolve => {
        resolveApi = resolve;
      }));

      const { result } = renderHook(() => useApi(slowApi));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveApi({ data: 'slow result' });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      const flakyApi = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Another error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useApi(flakyApi, { retryAttempts: 3, retryDelay: 100 }));

      await act(async () => {
        await result.current.execute();
      });

      // Should be called 3 times (initial + 2 retries)
      expect(flakyApi).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ success: true });
      expect(result.current.error).toBeNull();
    });

    it('should fail after exhausting retries', async () => {
      const alwaysFailApi = jest.fn().mockRejectedValue(new Error('Persistent error'));

      const { result } = renderHook(() => useApi(alwaysFailApi, { retryAttempts: 2, retryDelay: 50 }));

      await act(async () => {
        await result.current.execute();
      });

      expect(alwaysFailApi).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.error).toBe('Persistent error');
      expect(result.current.data).toBeNull();
    });

    it('should manually retry failed requests', async () => {
      const { result } = renderHook(() => useApi(mockApiError));

      // Initial failure
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('API Error');

      // Mock success for retry
      mockApiError.mockResolvedValueOnce({ recovered: true });

      // Manual retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.data).toEqual({ recovered: true });
      expect(result.current.error).toBeNull();
    });
  });

  describe('Caching', () => {
    it('should save successful results to cache', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess, { cacheKey: 'test-cache' }));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'test-cache',
        expect.stringContaining('"id":1')
      );
    });

    it('should load from cache when available', async () => {
      const cachedData = {
        data: { id: 3, name: 'Cached Data' },
        timestamp: Date.now() - 60000 // 1 minute ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() => useApi(mockApiSuccess, { 
        cacheKey: 'test-cache',
        cacheTimeout: 5 * 60 * 1000 // 5 minutes
      }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: 3, name: 'Cached Data' });
      expect(mockApiSuccess).not.toHaveBeenCalled(); // Should use cache instead
    });

    it('should ignore expired cache', async () => {
      const expiredData = {
        data: { id: 4, name: 'Expired Data' },
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(expiredData));

      const { result } = renderHook(() => useApi(mockApiSuccess, { 
        cacheKey: 'test-cache',
        cacheTimeout: 5 * 60 * 1000 // 5 minutes
      }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
      expect(mockApiSuccess).toHaveBeenCalled(); // Should make fresh call
    });

    it('should clear cache on refresh', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess, { cacheKey: 'test-cache' }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('test-cache');
      expect(mockApiSuccess).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Cache error'));

      const { result } = renderHook(() => useApi(mockApiSuccess, { cacheKey: 'test-cache' }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Failed to load from cache:',
        expect.any(Error)
      );
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useApi(mockApiSuccess, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Test Data' });
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useApi(mockApiError, { onError }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith('API Error');
    });

    it('should not call callbacks if not provided', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess));

      await act(async () => {
        await result.current.execute();
      });

      // Should not throw any errors
      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
    });
  });

  describe('Reset and Refresh', () => {
    it('should reset state to initial values', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess));

      // Execute first
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should refresh data and bypass cache', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess, { cacheKey: 'test-cache' }));

      // Initial execute
      await act(async () => {
        await result.current.execute();
      });

      // Change mock to return different data
      mockApiSuccess.mockResolvedValueOnce({ id: 5, name: 'Refreshed Data' });

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual({ id: 5, name: 'Refreshed Data' });
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('test-cache');
    });
  });

  describe('Multiple Hooks', () => {
    it('should handle multiple instances independently', async () => {
      const api1 = jest.fn().mockResolvedValue({ id: 1 });
      const api2 = jest.fn().mockResolvedValue({ id: 2 });

      const { result: result1 } = renderHook(() => useApi(api1));
      const { result: result2 } = renderHook(() => useApi(api2));

      await act(async () => {
        await result1.current.execute();
        await result2.current.execute();
      });

      expect(result1.current.data).toEqual({ id: 1 });
      expect(result2.current.data).toEqual({ id: 2 });
      expect(api1).toHaveBeenCalledTimes(1);
      expect(api2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parameter Persistence', () => {
    it('should remember last parameters for retry', async () => {
      const { result } = renderHook(() => useApi(mockApiWithParams));

      // Execute with params
      await act(async () => {
        await result.current.execute({ search: 'initial' });
      });

      // Change mock to fail then succeed
      mockApiWithParams
        .mockRejectedValueOnce(new Error('Temp error'))
        .mockResolvedValueOnce({ id: 3, name: 'Retry Success' });

      // Retry should use same params
      await act(async () => {
        await result.current.retry();
      });

      expect(mockApiWithParams).toHaveBeenLastCalledWith({ search: 'initial' });
      expect(result.current.data).toEqual({ id: 3, name: 'Retry Success' });
    });

    it('should use last parameters for refresh', async () => {
      const { result } = renderHook(() => useApi(mockApiWithParams, { cacheKey: 'test' }));

      // Execute with params
      await act(async () => {
        await result.current.execute({ search: 'refresh-test' });
      });

      // Change mock for refresh
      mockApiWithParams.mockResolvedValueOnce({ id: 4, name: 'Refreshed' });

      // Refresh should use same params
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockApiWithParams).toHaveBeenLastCalledWith({ search: 'refresh-test' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined API responses', async () => {
      const nullApi = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useApi(nullApi));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle errors without message', async () => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      const badApi = jest.fn().mockRejectedValue(errorWithoutMessage);

      const { result } = renderHook(() => useApi(badApi));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('should handle malformed cache data', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue('invalid json');

      const { result } = renderHook(() => useApi(mockApiSuccess, { cacheKey: 'test' }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
      expect(mockApiSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const { result, rerender } = renderHook(() => useApi(mockApiSuccess));

      const initialExecute = result.current.execute;
      
      rerender();
      
      expect(result.current.execute).toBe(initialExecute);
    });

    it('should handle rapid consecutive calls', async () => {
      const { result } = renderHook(() => useApi(mockApiSuccess));

      // Fire multiple rapid calls
      const promises = [
        result.current.execute(),
        result.current.execute(),
        result.current.execute()
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // All should resolve to the same data
      expect(result.current.data).toEqual({ id: 1, name: 'Test Data' });
    });
  });
});
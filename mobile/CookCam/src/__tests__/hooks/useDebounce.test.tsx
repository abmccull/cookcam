import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

// Mock useDebounce hook implementation
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Alternative hook that returns debounced callback
const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const callbackRef = React.useRef(callback);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Update callback ref when dependencies change
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = React.useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );

  return debouncedCallback;
};

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Value Debouncing', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 500 });

      // Should still have old value before delay
      expect(result.current).toBe('initial');

      // Fast-forward time but not enough
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('initial');

      // Fast-forward past delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      // Rapid changes
      rerender({ value: 'change1' });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'change2' });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'change3' });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should still have initial value
      expect(result.current).toBe('initial');

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Should have the last change
      expect(result.current).toBe('change3');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'immediate' });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('immediate');
    });

    it('should handle different data types', () => {
      // Test with number
      const { result: numberResult, rerender: numberRerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 1 } }
      );

      numberRerender({ value: 42 });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(numberResult.current).toBe(42);

      // Test with object
      const { result: objectResult, rerender: objectRerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: { id: 1 } } }
      );

      const newObj = { id: 2, name: 'test' };
      objectRerender({ value: newObj });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(objectResult.current).toEqual(newObj);

      // Test with array
      const { result: arrayResult, rerender: arrayRerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: [1, 2] } }
      );

      const newArray = [3, 4, 5];
      arrayRerender({ value: newArray });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(arrayResult.current).toEqual(newArray);
    });

    it('should handle null and undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 'initial' as string | null | undefined } }
      );

      rerender({ value: null });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBeNull();

      rerender({ value: undefined });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBeUndefined();
    });

    it('should update delay dynamically', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 1000 });

      // Advance by original delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still be initial because delay was increased
      expect(result.current).toBe('initial');

      // Advance by new delay total
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      // Advance timers after unmount
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not cause any errors
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('useDebouncedCallback Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Callback Debouncing', () => {
    it('should debounce callback execution', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 500)
      );

      // Call multiple times rapidly
      act(() => {
        result.current('arg1');
        result.current('arg2');
        result.current('arg3');
      });

      // Should not be called yet
      expect(mockCallback).not.toHaveBeenCalled();

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should be called once with last arguments
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('arg3');
    });

    it('should cancel previous calls', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 500)
      );

      // First call
      act(() => {
        result.current('first');
      });

      // Advance partially
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Second call should cancel first
      act(() => {
        result.current('second');
      });

      // Advance past original delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not have been called yet
      expect(mockCallback).not.toHaveBeenCalled();

      // Complete second delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('second');
    });

    it('should handle multiple arguments', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 100)
      );

      act(() => {
        result.current('arg1', 'arg2', { key: 'value' }, [1, 2, 3]);
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockCallback).toHaveBeenCalledWith(
        'arg1', 
        'arg2', 
        { key: 'value' }, 
        [1, 2, 3]
      );
    });

    it('should handle no arguments', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 100)
      );

      act(() => {
        result.current();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockCallback).toHaveBeenCalledWith();
    });

    it('should update callback when dependencies change', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback, dep }) => useDebouncedCallback(callback, 100, [dep]),
        { initialProps: { callback: mockCallback1, dep: 'dep1' } }
      );

      // Call with first callback
      act(() => {
        result.current('test');
      });

      // Change callback and dependency
      rerender({ callback: mockCallback2, dep: 'dep2' });

      // Complete delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should call the updated callback
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledWith('test');
    });

    it('should preserve callback reference when dependencies do not change', () => {
      const mockCallback = jest.fn();
      
      const { result, rerender } = renderHook(
        ({ dep }) => useDebouncedCallback(mockCallback, 100, [dep]),
        { initialProps: { dep: 'same' } }
      );

      const firstReference = result.current;

      rerender({ dep: 'same' });

      expect(result.current).toBe(firstReference);
    });

    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const mockCallback = jest.fn();
      
      const { result, unmount } = renderHook(() => 
        useDebouncedCallback(mockCallback, 500)
      );

      act(() => {
        result.current('test');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 0)
      );

      act(() => {
        result.current('immediate');
      });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(mockCallback).toHaveBeenCalledWith('immediate');
    });

    it('should handle negative delay', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, -100)
      );

      act(() => {
        result.current('negative');
      });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(mockCallback).toHaveBeenCalledWith('negative');
    });

    it('should handle callback that throws error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() => 
        useDebouncedCallback(errorCallback, 100)
      );

      act(() => {
        result.current('test');
      });

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }).toThrow('Callback error');

      expect(errorCallback).toHaveBeenCalledWith('test');
    });

    it('should handle async callbacks', () => {
      const asyncCallback = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => 
        useDebouncedCallback(asyncCallback, 100)
      );

      act(() => {
        result.current('async test');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(asyncCallback).toHaveBeenCalledWith('async test');
    });
  });

  describe('Real-world Usage', () => {
    it('should work with search input scenario', () => {
      const searchCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(searchCallback, 300)
      );

      // Simulate rapid typing
      act(() => {
        result.current('a');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current('ap');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current('app');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current('apple');
      });

      // Should not have called yet
      expect(searchCallback).not.toHaveBeenCalled();

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only call once with final value
      expect(searchCallback).toHaveBeenCalledTimes(1);
      expect(searchCallback).toHaveBeenCalledWith('apple');
    });

    it('should work with API call scenario', () => {
      const apiCall = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(apiCall, 500)
      );

      // Simulate multiple filter changes
      const filters = [
        { category: 'electronics' },
        { category: 'electronics', price: 100 },
        { category: 'electronics', price: 100, brand: 'apple' }
      ];

      filters.forEach((filter, index) => {
        act(() => {
          result.current(filter);
          jest.advanceTimersByTime(200); // Less than delay
        });
      });

      // Should not have been called
      expect(apiCall).not.toHaveBeenCalled();

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should call with final filter
      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(apiCall).toHaveBeenCalledWith(filters[2]);
    });
  });
});
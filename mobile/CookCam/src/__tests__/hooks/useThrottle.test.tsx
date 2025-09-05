import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

// Mock useThrottle hook implementation for values
const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastExecuted = React.useRef<number>(0);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= delay) {
      // Execute immediately if enough time has passed
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      // Schedule execution for the remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - timeSinceLastExecution);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
};

// Alternative hook that returns throttled callback
const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const callbackRef = React.useRef(callback);
  const lastExecuted = React.useRef<number>(0);
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

  const throttledCallback = React.useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecuted.current;

      if (timeSinceLastExecution >= delay) {
        // Execute immediately
        callbackRef.current(...args);
        lastExecuted.current = now;
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastExecuted.current = Date.now();
        }, delay - timeSinceLastExecution);
      }
    }) as T,
    [delay]
  );

  return throttledCallback;
};

// Leading edge throttle (executes immediately, then waits)
const useThrottledCallbackLeading = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const callbackRef = React.useRef(callback);
  const lastExecuted = React.useRef<number>(0);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = React.useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastExecuted.current >= delay) {
        callbackRef.current(...args);
        lastExecuted.current = now;
      }
    }) as T,
    [delay]
  );

  return throttledCallback;
};

describe('useThrottle Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Value Throttling', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useThrottle('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should throttle rapid value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useThrottle(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Change value rapidly
      rerender({ value: 'change1', delay: 500 });
      expect(result.current).toBe('change1'); // Should update immediately first time

      // Change again quickly
      rerender({ value: 'change2', delay: 500 });
      expect(result.current).toBe('change1'); // Should still be previous value

      // Advance time but not enough
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe('change1');

      // Complete the throttle period
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(result.current).toBe('change2');
    });

    it('should allow updates after throttle period', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 500),
        { initialProps: { value: 'initial' } }
      );

      // First change
      rerender({ value: 'first' });
      expect(result.current).toBe('first');

      // Wait for throttle period to complete
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Second change should work immediately
      rerender({ value: 'second' });
      expect(result.current).toBe('second');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'immediate' });
      expect(result.current).toBe('immediate');
    });

    it('should handle different data types', () => {
      // Test with number
      const { result: numberResult, rerender: numberRerender } = renderHook(
        ({ value }) => useThrottle(value, 100),
        { initialProps: { value: 1 } }
      );

      numberRerender({ value: 42 });
      expect(numberResult.current).toBe(42);

      // Test with object
      const { result: objectResult, rerender: objectRerender } = renderHook(
        ({ value }) => useThrottle(value, 100),
        { initialProps: { value: { id: 1 } } }
      );

      const newObj = { id: 2, name: 'test' };
      objectRerender({ value: newObj });
      expect(objectResult.current).toEqual(newObj);

      // Test with array
      const { result: arrayResult, rerender: arrayRerender } = renderHook(
        ({ value }) => useThrottle(value, 100),
        { initialProps: { value: [1, 2] } }
      );

      const newArray = [3, 4, 5];
      arrayRerender({ value: newArray });
      expect(arrayResult.current).toEqual(newArray);
    });

    it('should handle null and undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 100),
        { initialProps: { value: 'initial' as string | null | undefined } }
      );

      rerender({ value: null });
      expect(result.current).toBeNull();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: undefined });
      expect(result.current).toBeUndefined();
    });

    it('should update delay dynamically', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useThrottle(value, delay),
        { initialProps: { value: 'initial', delay: 200 } }
      );

      rerender({ value: 'first', delay: 200 });
      expect(result.current).toBe('first');

      // Change delay and value
      rerender({ value: 'second', delay: 1000 });
      expect(result.current).toBe('first'); // Should be throttled

      // Advance by old delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should still be throttled because new delay is longer
      expect(result.current).toBe('first');

      // Advance by remaining time for new delay
      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(result.current).toBe('second');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount, rerender } = renderHook(
        ({ value }) => useThrottle(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});

describe('useThrottledCallback Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Callback Throttling', () => {
    it('should execute callback immediately on first call', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, 500)
      );

      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('first');
    });

    it('should throttle subsequent calls', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, 500)
      );

      // First call should execute immediately
      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Rapid subsequent calls should be throttled
      act(() => {
        result.current('second');
        result.current('third');
        result.current('fourth');
      });

      // Should still only have been called once
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Advance time to complete throttle period
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should now be called with the last arguments
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenLastCalledWith('fourth');
    });

    it('should allow execution after throttle period', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, 500)
      );

      // First call
      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Wait for throttle period
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Second call should execute immediately
      act(() => {
        result.current('second');
      });

      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenLastCalledWith('second');
    });

    it('should handle multiple arguments', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, 100)
      );

      act(() => {
        result.current('arg1', 'arg2', { key: 'value' }, [1, 2, 3]);
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
        useThrottledCallback(mockCallback, 100)
      );

      act(() => {
        result.current();
      });

      expect(mockCallback).toHaveBeenCalledWith();
    });

    it('should update callback when dependencies change', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback, dep }) => useThrottledCallback(callback, 100, [dep]),
        { initialProps: { callback: mockCallback1, dep: 'dep1' } }
      );

      // First call with first callback
      act(() => {
        result.current('test');
      });

      expect(mockCallback1).toHaveBeenCalledWith('test');

      // Change callback and dependency
      rerender({ callback: mockCallback2, dep: 'dep2' });

      // Wait for throttle period
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Next call should use updated callback
      act(() => {
        result.current('test2');
      });

      expect(mockCallback2).toHaveBeenCalledWith('test2');
    });

    it('should preserve callback reference when dependencies do not change', () => {
      const mockCallback = jest.fn();
      
      const { result, rerender } = renderHook(
        ({ dep }) => useThrottledCallback(mockCallback, 100, [dep]),
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
        useThrottledCallback(mockCallback, 500)
      );

      // Call to start throttling
      act(() => {
        result.current('test');
      });

      // Call again to create pending timeout
      act(() => {
        result.current('test2');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Leading Edge Throttle', () => {
    it('should execute immediately on first call', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallbackLeading(mockCallback, 500)
      );

      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('first');
    });

    it('should ignore subsequent calls within throttle period', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallbackLeading(mockCallback, 500)
      );

      // First call
      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Rapid subsequent calls should be ignored
      act(() => {
        result.current('second');
        result.current('third');
        result.current('fourth');
      });

      // Should still only have been called once
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Even after advancing time, no more calls should happen
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should allow new execution after throttle period', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallbackLeading(mockCallback, 500)
      );

      // First call
      act(() => {
        result.current('first');
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Wait for throttle period
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // New call should execute immediately
      act(() => {
        result.current('second');
      });

      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenLastCalledWith('second');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, 0)
      );

      act(() => {
        result.current('immediate1');
        result.current('immediate2');
      });

      // With zero delay, all calls should execute
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle negative delay', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(mockCallback, -100)
      );

      act(() => {
        result.current('negative1');
        result.current('negative2');
      });

      // With negative delay, should treat as zero delay
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle callback that throws error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() => 
        useThrottledCallback(errorCallback, 100)
      );

      expect(() => {
        act(() => {
          result.current('test');
        });
      }).toThrow('Callback error');

      expect(errorCallback).toHaveBeenCalledWith('test');
    });

    it('should handle async callbacks', () => {
      const asyncCallback = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => 
        useThrottledCallback(asyncCallback, 100)
      );

      act(() => {
        result.current('async test');
      });

      expect(asyncCallback).toHaveBeenCalledWith('async test');
    });
  });

  describe('Real-world Usage', () => {
    it('should work with scroll event scenario', () => {
      const scrollHandler = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(scrollHandler, 16) // ~60fps
      );

      // Simulate rapid scroll events
      act(() => {
        result.current({ scrollY: 0 });
        result.current({ scrollY: 10 });
        result.current({ scrollY: 20 });
        result.current({ scrollY: 30 });
      });

      // Should only call once initially
      expect(scrollHandler).toHaveBeenCalledTimes(1);
      expect(scrollHandler).toHaveBeenCalledWith({ scrollY: 0 });

      // Wait for throttle period
      act(() => {
        jest.advanceTimersByTime(16);
      });

      // Should call with last value
      expect(scrollHandler).toHaveBeenCalledTimes(2);
      expect(scrollHandler).toHaveBeenLastCalledWith({ scrollY: 30 });
    });

    it('should work with resize event scenario', () => {
      const resizeHandler = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(resizeHandler, 250)
      );

      // Simulate window resize events
      act(() => {
        result.current({ width: 800, height: 600 });
        result.current({ width: 850, height: 650 });
        result.current({ width: 900, height: 700 });
      });

      // Should execute first call immediately
      expect(resizeHandler).toHaveBeenCalledTimes(1);
      expect(resizeHandler).toHaveBeenCalledWith({ width: 800, height: 600 });

      // Complete throttle period
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Should call with final dimensions
      expect(resizeHandler).toHaveBeenCalledTimes(2);
      expect(resizeHandler).toHaveBeenLastCalledWith({ width: 900, height: 700 });
    });

    it('should work with API request scenario', () => {
      const apiRequest = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallback(apiRequest, 1000)
      );

      // Simulate rapid filter changes that trigger API calls
      act(() => {
        result.current({ query: 'iphone' });
        result.current({ query: 'iphone 13' });
        result.current({ query: 'iphone 13 pro' });
      });

      // Should make first request immediately
      expect(apiRequest).toHaveBeenCalledTimes(1);
      expect(apiRequest).toHaveBeenCalledWith({ query: 'iphone' });

      // Wait for throttle period
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should make final request
      expect(apiRequest).toHaveBeenCalledTimes(2);
      expect(apiRequest).toHaveBeenLastCalledWith({ query: 'iphone 13 pro' });
    });

    it('should work with button click prevention scenario', () => {
      const clickHandler = jest.fn();
      const { result } = renderHook(() => 
        useThrottledCallbackLeading(clickHandler, 2000)
      );

      // Simulate rapid button clicks
      act(() => {
        result.current('click1');
        result.current('click2');
        result.current('click3');
      });

      // Should only register first click
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(clickHandler).toHaveBeenCalledWith('click1');

      // Even after time passes, no additional clicks should register
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(clickHandler).toHaveBeenCalledTimes(1);

      // After full throttle period, next click should work
      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        result.current('click4');
      });

      expect(clickHandler).toHaveBeenCalledTimes(2);
      expect(clickHandler).toHaveBeenLastCalledWith('click4');
    });
  });
});
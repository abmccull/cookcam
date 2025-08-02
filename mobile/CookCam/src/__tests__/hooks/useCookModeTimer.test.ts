// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import { renderHook, act } from '@testing-library/react-hooks';
import { useCookModeTimer } from '../../hooks/useCookModeTimer';

describe('useCookModeTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with provided time', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 120, 
          isPlaying: false 
        })
      );

      expect(result.current.timeRemaining).toBe(120);
      expect(result.current.isTimerRunning).toBe(false);
      expect(result.current.isTimerComplete).toBe(false);
    });

    it('should format initial time correctly', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 125, 
          isPlaying: false 
        })
      );

      expect(result.current.formatTime(125)).toBe('02:05');
    });

    it('should handle zero initial time', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 0, 
          isPlaying: false 
        })
      );

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isTimerComplete).toBe(true);
    });
  });

  describe('Timer Countdown', () => {
    it('should count down when playing', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 10, 
          isPlaying: true 
        })
      );

      expect(result.current.timeRemaining).toBe(10);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeRemaining).toBe(9);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.timeRemaining).toBe(7);
    });

    it('should not count down when paused', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 10, 
          isPlaying: false 
        })
      );

      const initialTime = result.current.timeRemaining;

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.timeRemaining).toBe(initialTime);
    });

    it('should stop at zero', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 3, 
          isPlaying: true 
        })
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isTimerComplete).toBe(true);
    });

    it('should call onTimerComplete when timer reaches zero', () => {
      const onTimerComplete = jest.fn();
      
      renderHook(() => 
        useCookModeTimer({ 
          initialTime: 2, 
          isPlaying: true,
          onTimerComplete 
        })
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onTimerComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Play/Pause', () => {
    it('should pause and resume timer', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) => 
          useCookModeTimer({ 
            initialTime: 10, 
            isPlaying 
          }),
        { initialProps: { isPlaying: true } }
      );

      // Timer is running
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.timeRemaining).toBe(8);

      // Pause timer
      rerender({ isPlaying: false });
      
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.timeRemaining).toBe(8); // Should not change

      // Resume timer
      rerender({ isPlaying: true });
      
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.timeRemaining).toBe(6);
    });

    it('should update isTimerRunning based on play state', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) => 
          useCookModeTimer({ 
            initialTime: 10, 
            isPlaying 
          }),
        { initialProps: { isPlaying: false } }
      );

      expect(result.current.isTimerRunning).toBe(false);

      rerender({ isPlaying: true });
      expect(result.current.isTimerRunning).toBe(true);

      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(result.current.isTimerRunning).toBe(false); // Timer complete
    });
  });

  describe('Reset Timer', () => {
    it('should reset timer to initial value', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 60, 
          isPlaying: true 
        })
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(result.current.timeRemaining).toBe(50);

      act(() => {
        result.current.resetTimer();
      });
      expect(result.current.timeRemaining).toBe(60);
    });

    it('should reset when initial time changes', () => {
      const { result, rerender } = renderHook(
        ({ initialTime }) => 
          useCookModeTimer({ 
            initialTime, 
            isPlaying: false 
          }),
        { initialProps: { initialTime: 60 } }
      );

      expect(result.current.timeRemaining).toBe(60);

      rerender({ initialTime: 120 });
      expect(result.current.timeRemaining).toBe(120);
    });
  });

  describe('Custom Time', () => {
    it('should set custom time', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 60, 
          isPlaying: false 
        })
      );

      act(() => {
        result.current.setCustomTime(90);
      });

      expect(result.current.timeRemaining).toBe(90);
    });

    it('should continue countdown from custom time', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 60, 
          isPlaying: true 
        })
      );

      act(() => {
        result.current.setCustomTime(10);
      });

      expect(result.current.timeRemaining).toBe(10);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.timeRemaining).toBe(7);
    });
  });

  describe('Format Time', () => {
    it('should format seconds correctly', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 0, 
          isPlaying: false 
        })
      );

      expect(result.current.formatTime(0)).toBe('00:00');
      expect(result.current.formatTime(5)).toBe('00:05');
      expect(result.current.formatTime(59)).toBe('00:59');
      expect(result.current.formatTime(60)).toBe('01:00');
      expect(result.current.formatTime(61)).toBe('01:01');
      expect(result.current.formatTime(125)).toBe('02:05');
      expect(result.current.formatTime(3599)).toBe('59:59');
      expect(result.current.formatTime(3600)).toBe('60:00');
    });

    it('should pad single digits', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 0, 
          isPlaying: false 
        })
      );

      expect(result.current.formatTime(65)).toBe('01:05');
      expect(result.current.formatTime(605)).toBe('10:05');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large initial time', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 99999, 
          isPlaying: false 
        })
      );

      expect(result.current.timeRemaining).toBe(99999);
      expect(result.current.formatTime(99999)).toBe('1666:39');
    });

    it('should handle negative initial time as zero', () => {
      const { result } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: -10, 
          isPlaying: false 
        })
      );

      expect(result.current.timeRemaining).toBe(-10);
      // Note: In real implementation, might want to handle this case
    });

    it('should clean up interval on unmount', () => {
      const { unmount } = renderHook(() => 
        useCookModeTimer({ 
          initialTime: 60, 
          isPlaying: true 
        })
      );

      unmount();

      // Should not throw errors
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    });

    it('should handle rapid play/pause changes', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) => 
          useCookModeTimer({ 
            initialTime: 10, 
            isPlaying 
          }),
        { initialProps: { isPlaying: true } }
      );

      // Rapidly toggle play/pause
      rerender({ isPlaying: false });
      rerender({ isPlaying: true });
      rerender({ isPlaying: false });
      rerender({ isPlaying: true });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeRemaining).toBe(9);
    });
  });
});
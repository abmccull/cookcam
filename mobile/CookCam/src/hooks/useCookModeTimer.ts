/**
 * Cook Mode Timer Hook
 * Handles timer logic, play/pause, and step timing
 */

import { useState, useEffect, useCallback } from 'react';

interface UseCookModeTimerProps {
  initialTime: number;
  isPlaying: boolean;
  onTimerComplete?: () => void;
}

export const useCookModeTimer = ({
  initialTime,
  isPlaying,
  onTimerComplete,
}: UseCookModeTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  // Reset timer when initial time changes
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            onTimerComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining, onTimerComplete]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Reset timer to initial value
  const resetTimer = useCallback(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Set custom time
  const setCustomTime = useCallback((time: number) => {
    setTimeRemaining(time);
  }, []);

  return {
    timeRemaining,
    formatTime,
    resetTimer,
    setCustomTime,
    isTimerRunning: isPlaying && timeRemaining > 0,
    isTimerComplete: timeRemaining === 0,
  };
}; 
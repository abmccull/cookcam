// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

// Mock styles
jest.mock('../../styles', () => ({
  tokens: {
    colors: {
      primary: '#4CAF50',
      secondary: '#2196F3',
      text: {
        primary: '#000000',
        secondary: '#666666',
        light: '#999999',
        inverse: '#FFFFFF',
      },
      background: {
        main: '#FFFFFF',
        secondary: '#F5F5F5',
      },
      success: '#4CAF50',
      warning: '#FF9800',
    },
    spacing: {
      xs: 4,
      s: 8,
      m: 16,
      l: 24,
      xl: 32,
    },
    typography: {
      h2: { fontSize: 20, fontWeight: 'bold' },
      body: { fontSize: 14 },
      caption: { fontSize: 12 },
    },
    borderRadius: {
      m: 8,
      l: 12,
    },
  },
  mixins: {
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  },
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import DailyCheckIn from '../../components/DailyCheckIn';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Animated: {
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
      interpolate: jest.fn(() => initialValue),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    View: 'AnimatedView',
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    return React.forwardRef((props: any, ref: any) => 
      React.createElement('MockIcon', { ...props, ref, testID: `${name}-icon` }, name)
    );
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return mockIcon(prop);
      }
      return undefined;
    },
  });
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// Mock contexts
jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    checkIn: jest.fn(),
    userStats: {
      streakDays: 5,
      lastCheckIn: null,
      canCheckIn: true,
    },
  })),
}));

// Mock components
jest.mock('../../components/LevelUpModal', () => {
  return function MockLevelUpModal({ visible, onClose }: any) {
    if (!visible) return null;
    return (
      <div testID="level-up-modal">
        <button onClick={onClose}>Close</button>
        Level Up!
      </div>
    );
  };
});

describe('DailyCheckIn', () => {
  const mockOnCheckIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render check-in button when user can check in', () => {
      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/Check In/i)).toBeTruthy();
    });

    it('should show current streak', () => {
      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/5.*day streak/i)).toBeTruthy();
    });

    it('should show fire icon', () => {
      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByTestId('Flame-icon')).toBeTruthy();
    });

    it('should show disabled state when already checked in', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValueOnce({
        checkIn: jest.fn(),
        userStats: {
          streakDays: 5,
          lastCheckIn: new Date().toISOString(),
          canCheckIn: false,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/Checked In/i)).toBeTruthy();
    });

    it('should show calendar icon', () => {
      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByTestId('Calendar-icon')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call checkIn when button is pressed', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 50,
          newStreak: 6,
          levelUp: false,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(mockCheckIn).toHaveBeenCalled();
      });
    });

    it('should trigger haptic feedback on check-in', async () => {
      const mockImpactAsync = require('expo-haptics').impactAsync;
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 50,
          newStreak: 6,
          levelUp: false,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(mockImpactAsync).toHaveBeenCalled();
      });
    });

    it('should call onCheckIn callback after successful check-in', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 50,
          newStreak: 6,
          levelUp: false,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(mockOnCheckIn).toHaveBeenCalledWith({
          xpEarned: 50,
          newStreak: 6,
          levelUp: false,
        });
      });
    });

    it('should not allow check-in when already checked in', () => {
      const mockCheckIn = jest.fn();
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: new Date().toISOString(),
          canCheckIn: false,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Checked In/i).parent;
      fireEvent.press(checkInButton);

      expect(mockCheckIn).not.toHaveBeenCalled();
    });
  });

  describe('Level Up Modal', () => {
    it('should show level up modal when user levels up', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 100,
          newStreak: 6,
          levelUp: true,
          newLevel: 5,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(screen.getByTestId('level-up-modal')).toBeTruthy();
      });
    });

    it('should close level up modal when close button is pressed', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 100,
          newStreak: 6,
          levelUp: true,
          newLevel: 5,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.press(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('level-up-modal')).toBeFalsy();
      });
    });
  });

  describe('Animations', () => {
    it('should animate check-in success', async () => {
      const mockAnimatedTiming = require('react-native').Animated.timing;
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xpEarned: 50,
          newStreak: 6,
          levelUp: false,
        },
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(mockAnimatedTiming).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle check-in failure gracefully', async () => {
      const mockCheckIn = jest.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        // Should still be able to check in again
        expect(screen.getByText(/Check In/i)).toBeTruthy();
      });
    });

    it('should not call onCheckIn callback on failure', async () => {
      const mockCheckIn = jest.fn().mockRejectedValue(new Error('API Error'));

      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: mockCheckIn,
        userStats: {
          streakDays: 5,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      fireEvent.press(checkInButton);

      await waitFor(() => {
        expect(mockOnCheckIn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Streak Display', () => {
    it('should show different message for streak milestones', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: jest.fn(),
        userStats: {
          streakDays: 7,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/7.*day streak.*Week/i)).toBeTruthy();
    });

    it('should show no streak message when streak is 0', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        checkIn: jest.fn(),
        userStats: {
          streakDays: 0,
          lastCheckIn: null,
          canCheckIn: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/Start your streak/i)).toBeTruthy();
    });

    it('should show streak at risk warning', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      // Mock a scenario where user hasn't checked in for almost 24 hours
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 23);
      
      mockUseGamification.mockReturnValue({
        checkIn: jest.fn(),
        userStats: {
          streakDays: 10,
          lastCheckIn: yesterday.toISOString(),
          canCheckIn: true,
          streakAtRisk: true,
        },
      });

      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      expect(screen.getByText(/Streak at risk/i)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<DailyCheckIn onCheckIn={mockOnCheckIn} />);
      
      const checkInButton = screen.getByText(/Check In/i).parent;
      expect(checkInButton.props.accessibilityRole).toBe('button');
    });
  });
});
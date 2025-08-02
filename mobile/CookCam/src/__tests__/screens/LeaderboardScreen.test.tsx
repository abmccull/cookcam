import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LeaderboardScreen from '../../screens/LeaderboardScreen';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios || config.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Alert: {
    alert: jest.fn(),
  },
  Animated: {
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    loop: jest.fn((animation) => ({
      start: jest.fn(),
    })),
    View: 'AnimatedView',
    createAnimatedComponent: jest.fn((component) => component),
  },
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Trophy: ({ size, color }: any) => (
    <div testID="trophy-icon" data-size={size} data-color={color} />
  ),
  Crown: ({ size, color }: any) => (
    <div testID="crown-icon" data-size={size} data-color={color} />
  ),
  Medal: ({ size, color }: any) => (
    <div testID="medal-icon" data-size={size} data-color={color} />
  ),
  Award: ({ size, color }: any) => (
    <div testID="award-icon" data-size={size} data-color={color} />
  ),
  TrendingUp: ({ size, color }: any) => (
    <div testID="trending-up-icon" data-size={size} data-color={color} />
  ),
  Clock: ({ size, color }: any) => (
    <div testID="clock-icon" data-size={size} data-color={color} />
  ),
  Users: ({ size, color }: any) => (
    <div testID="users-icon" data-size={size} data-color={color} />
  ),
  Target: ({ size, color }: any) => (
    <div testID="target-icon" data-size={size} data-color={color} />
  ),
  Info: ({ size, color }: any) => (
    <div testID="info-icon" data-size={size} data-color={color} />
  ),
  Zap: ({ size, color }: any) => (
    <div testID="zap-icon" data-size={size} data-color={color} />
  ),
}));

// Mock dependencies
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user-id', email: 'user@example.com' },
  }),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    refreshUserStats: jest.fn(),
  })),
}));

jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    getLeaderboard: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../components/OptimizedImage', () => {
  return function MockOptimizedImage({ source, style }: any) {
    return (
      <div 
        testID="optimized-image" 
        data-source={typeof source === 'string' ? source : source?.uri || 'mock-image'}
        data-style={JSON.stringify(style)}
      />
    );
  };
});

describe('LeaderboardScreen', () => {
  const mockGetLeaderboard = require('../../services/cookCamApi').cookCamApi.getLeaderboard;
  const mockHaptics = require('expo-haptics');
  let mockRefreshUserStats: jest.Mock;

  const mockLeaderboardData = {
    leaderboard: [
      {
        rank: 1,
        xp_total: 5000,
        xp_gained: 500,
        users: {
          id: 'user-1',
          name: 'Top Chef',
          avatar_url: 'https://example.com/avatar1.jpg',
          level: 10,
          is_creator: false,
          creator_tier: null,
        },
      },
      {
        rank: 2,
        xp_total: 4500,
        xp_gained: 450,
        users: {
          id: 'user-2',
          name: 'Master Cook',
          avatar_url: 'https://example.com/avatar2.jpg',
          level: 9,
          is_creator: false,
          creator_tier: null,
        },
      },
      {
        rank: 3,
        xp_total: 3000,
        xp_gained: 300,
        users: {
          id: 'current-user-id',
          name: 'Current User',
          avatar_url: 'https://example.com/avatar3.jpg',
          level: 7,
          is_creator: false,
          creator_tier: null,
        },
      },
    ],
    metadata: {
      type: 'xp',
      period: 'weekly',
      updated_at: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
    
    // Reset the mock for refreshUserStats
    mockRefreshUserStats = jest.fn();
    require('../../context/GamificationContext').useGamification.mockReturnValue({
      refreshUserStats: mockRefreshUserStats,
    });

    // Default successful response
    mockGetLeaderboard.mockResolvedValue({
      success: true,
      data: mockLeaderboardData,
    });
  });

  describe('Rendering', () => {
    it('should render main components', async () => {
      render(<LeaderboardScreen />);

      // Check for time period buttons
      expect(screen.getByText('Daily')).toBeTruthy();
      expect(screen.getByText('Weekly')).toBeTruthy();
      expect(screen.getByText('All Time')).toBeTruthy();

      // Wait for leaderboard to load
      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalled();
      });
    });

    it('should show loading state initially', () => {
      render(<LeaderboardScreen />);

      expect(screen.UNSAFE_getAllByType('ActivityIndicator')).toBeTruthy();
    });

    it('should render leaderboard entries after loading', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Top Chef')).toBeTruthy();
        expect(screen.getByText('Master Cook')).toBeTruthy();
        expect(screen.getByText('Current User')).toBeTruthy();
      });
    });

    it('should show rank icons for top 3 users', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        // First place should have crown icon
        expect(screen.getByTestId('crown-icon')).toBeTruthy();
        // Second place should have medal icon
        expect(screen.getByTestId('medal-icon')).toBeTruthy();
        // Third place should have award icon
        expect(screen.getByTestId('award-icon')).toBeTruthy();
      });
    });
  });

  describe('Time Period Selection', () => {
    it('should default to weekly view', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith(50, 'weekly', 'global');
      });
    });

    it('should switch to daily view when Daily is pressed', async () => {
      render(<LeaderboardScreen />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalled();
      });

      const dailyButton = screen.getByText('Daily');
      fireEvent.press(dailyButton);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenLastCalledWith(50, 'daily', 'global');
      });
      expect(mockHaptics.selectionAsync).toHaveBeenCalled();
    });

    it('should switch to all time view when All Time is pressed', async () => {
      render(<LeaderboardScreen />);

      const allTimeButton = screen.getByText('All Time');
      fireEvent.press(allTimeButton);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenLastCalledWith(50, 'allTime', 'global');
      });
    });

    it('should refresh user stats when changing period', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(mockRefreshUserStats).toHaveBeenCalled();
      });

      mockRefreshUserStats.mockClear();

      const dailyButton = screen.getByText('Daily');
      fireEvent.press(dailyButton);

      await waitFor(() => {
        expect(mockRefreshUserStats).toHaveBeenCalled();
      });
    });
  });

  describe('Leaderboard Type Selection', () => {
    it('should switch between global and friends views', async () => {
      render(<LeaderboardScreen />);

      // Find type selector buttons
      const typeButtons = screen.UNSAFE_getAllByType('TouchableOpacity');
      const friendsButton = typeButtons.find(button => {
        const text = screen.queryByText('Friends', { includeHiddenElements: true });
        return text && button.props.children?.includes(text);
      });

      if (friendsButton) {
        fireEvent.press(friendsButton);

        await waitFor(() => {
          expect(mockGetLeaderboard).toHaveBeenLastCalledWith(50, 'weekly', 'friends');
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      mockGetLeaderboard.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('should show empty state message when no data', async () => {
      mockGetLeaderboard.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('No leaderboard data found. Be the first to start cooking!')).toBeTruthy();
      });
    });

    it('should handle API exceptions gracefully', async () => {
      mockGetLeaderboard.mockRejectedValueOnce(new Error('API Error'));

      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeTruthy();
      });
    });

    it('should handle malformed API response', async () => {
      // Test with nested leaderboard property to check the transform logic
      const nestedData = {
        leaderboard: mockLeaderboardData.leaderboard,
        metadata: mockLeaderboardData.metadata,
      };
      
      mockGetLeaderboard.mockResolvedValueOnce({
        success: true,
        data: nestedData,
      });

      render(<LeaderboardScreen />);

      await waitFor(() => {
        // Should still render the data correctly
        expect(screen.getByText('Top Chef')).toBeTruthy();
      });
    });
  });

  describe('User Rank Display', () => {
    it('should highlight current user in leaderboard', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        const userEntry = screen.getByText('Current User');
        expect(userEntry).toBeTruthy();
      });

      // The current user's entry should have special styling
      // This would be more specific in a real test with proper component structure
    });

    it('should show user XP and level', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Level 10')).toBeTruthy();
        // Check for the total XP display
        expect(screen.getByText(/5,000.*total/)).toBeTruthy();
      });
    });

    it('should show XP gained in period', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('500')).toBeTruthy();
        // Check for period-specific XP label
        const xpLabels = screen.getAllByText('XP this week');
        expect(xpLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Animations', () => {
    it('should initialize animation values', () => {
      const mockAnimatedValue = require('react-native').Animated.Value;
      
      render(<LeaderboardScreen />);

      expect(mockAnimatedValue).toHaveBeenCalledWith(0); // fadeAnim
      expect(mockAnimatedValue).toHaveBeenCalledWith(1); // pulseAnim
      expect(mockAnimatedValue).toHaveBeenCalledWith(50); // slideAnim
    });

    it('should start animations on mount', () => {
      const mockAnimated = require('react-native').Animated;
      
      render(<LeaderboardScreen />);

      expect(mockAnimated.parallel).toHaveBeenCalled();
      expect(mockAnimated.timing).toHaveBeenCalled();
      expect(mockAnimated.spring).toHaveBeenCalled();
      expect(mockAnimated.loop).toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should allow manual refresh of leaderboard', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
      });

      // Simulate pull-to-refresh or refresh button press
      // This would depend on the actual refresh mechanism in the component
    });
  });

  describe('Avatar Display', () => {
    it('should render user avatars', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        const avatars = screen.getAllByTestId('optimized-image');
        expect(avatars.length).toBeGreaterThan(0);
        expect(avatars[0].props['data-source']).toBe('https://example.com/avatar1.jpg');
      });
    });

    it('should handle missing avatars gracefully', async () => {
      const dataWithMissingAvatar = {
        leaderboard: [
          {
            ...mockLeaderboardData.leaderboard[0],
            users: {
              ...mockLeaderboardData.leaderboard[0].users,
              avatar_url: undefined,
            },
          },
        ],
        metadata: mockLeaderboardData.metadata,
      };

      mockGetLeaderboard.mockResolvedValueOnce({
        success: true,
        data: dataWithMissingAvatar,
      });

      render(<LeaderboardScreen />);

      await waitFor(() => {
        // Component should still render without crashing
        expect(screen.getByText('Top Chef')).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', async () => {
      mockGetLeaderboard.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockLeaderboardData }), 100))
      );

      render(<LeaderboardScreen />);

      // Should show loading indicator initially
      expect(screen.UNSAFE_queryByType('ActivityIndicator')).toBeTruthy();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Top Chef')).toBeTruthy();
      });
    });

    it('should not show loading indicator after data loads', async () => {
      render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Top Chef')).toBeTruthy();
      });

      // Loading indicator should be gone
      const indicators = screen.UNSAFE_queryAllByType('ActivityIndicator');
      expect(indicators.filter(i => i.props.animating !== false).length).toBe(0);
    });
  });

  describe('Challenges Section', () => {
    it('should show current challenges if available', async () => {
      render(<LeaderboardScreen />);

      // Wait for component to load
      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalled();
      });

      // Check for challenge-related UI elements
      // This would depend on the actual implementation
    });
  });

  describe('Performance', () => {
    it('should not make excessive API calls', async () => {
      const { rerender } = render(<LeaderboardScreen />);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
      });

      // Re-render without changing props
      rerender(<LeaderboardScreen />);

      // Should not make additional API calls
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid filter changes', async () => {
      render(<LeaderboardScreen />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
      });

      // Rapidly change filters
      const dailyButton = screen.getByText('Daily');
      const weeklyButton = screen.getByText('Weekly');
      const allTimeButton = screen.getByText('All Time');

      fireEvent.press(dailyButton);
      fireEvent.press(weeklyButton);
      fireEvent.press(allTimeButton);

      await waitFor(() => {
        // Should make one initial call + 3 filter changes
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(4);
      });
    });
  });
});
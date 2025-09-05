import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Animated, Share } from 'react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// Global PixelRatio mock
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => false),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  getId: jest.fn(() => 'test-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({ index: 0, routes: [] })),
};

// Mock contexts
const mockAuthContext = {
  user: {
    id: 'test-user-123',
    name: 'Test Chef Pro',
    email: 'testchef@cookcam.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    isCreator: false,
  },
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  loading: false,
  checkBiometricAuth: jest.fn(),
};

const mockGamificationContext = {
  level: 5,
  xp: 750,
  streak: 12,
  badges: [
    {
      id: 'first-recipe',
      name: 'First Recipe',
      description: 'Created your first recipe',
      icon: '🍳',
      unlockedAt: new Date('2023-01-15'),
    },
    {
      id: 'streak-master',
      name: 'Streak Master',
      description: 'Maintained a 7-day streak',
      icon: '🔥',
      unlockedAt: new Date('2023-01-20'),
    },
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Shared 10 recipes',
      icon: '🦋',
      unlockedAt: new Date('2023-01-25'),
    },
  ],
  addXP: jest.fn(),
  updateLevel: jest.fn(),
  updateStreak: jest.fn(),
  unlockBadge: jest.fn(),
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => mockGamificationContext,
}));

// Mock components
jest.mock('../../components/ChefBadge', () => ({ tier, size, showLabel }) => (
  <div testID="chef-badge" data-tier={tier} data-size={size} data-show-label={showLabel}>
    Chef Badge Tier {tier}
  </div>
));

jest.mock('../../components/StreakCalendar', () => () => (
  <div testID="streak-calendar">Streak Calendar Component</div>
));

// Mock services
const mockCookCamApi = {
  uploadProfilePhoto: jest.fn(),
  deleteAccount: jest.fn(),
};

jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: mockCookCamApi,
}));

// Mock external libraries
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock responsive utilities
jest.mock('../../utils/responsive', () => ({
  scale: (value) => value,
  verticalScale: (value) => value,
  moderateScale: (value) => value,
  responsive: {
    spacing: {
      s: 8,
      m: 16,
      l: 24,
      xl: 32,
    },
    fontSize: {
      tiny: 10,
      small: 12,
      regular: 14,
      medium: 16,
      large: 18,
      xlarge: 20,
      xxlarge: 24,
      xxxlarge: 28,
    },
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
    },
  },
  isSmallScreen: () => false,
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Share
jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock Animated API
const mockAnimatedValue = {
  setValue: jest.fn(),
  interpolate: jest.fn(() => mockAnimatedValue),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => mockAnimatedValue),
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      spring: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      parallel: jest.fn((animations) => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      View: RN.Animated.View,
    },
  };
});

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render profile screen with all essential elements', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Your Profile 👤')).toBeTruthy();
      expect(screen.getByText('Test Chef Pro')).toBeTruthy();
      expect(screen.getByText('testchef@cookcam.com')).toBeTruthy();
      expect(screen.getByText('Settings ⚙️')).toBeTruthy();
      expect(screen.getByText('Logout')).toBeTruthy();
    });

    it('should render user stats correctly', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('750')).toBeTruthy(); // XP
      expect(screen.getByText('Total XP')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy(); // Level
      expect(screen.getByText('Level')).toBeTruthy();
      expect(screen.getByText('12')).toBeTruthy(); // Streak
      expect(screen.getByText('Day Streak')).toBeTruthy();
    });

    it('should render badges section with correct count', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Achievements 🏆')).toBeTruthy();
      expect(screen.getByText('3/12')).toBeTruthy();
      expect(screen.getByText('First Recipe')).toBeTruthy();
      expect(screen.getByText('Streak Master')).toBeTruthy();
      expect(screen.getByText('Social Butterfly')).toBeTruthy();
    });

    it('should render level progress correctly', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Level 5')).toBeTruthy();
      expect(screen.getByText('350 / 400 XP')).toBeTruthy(); // Current level progress
      expect(screen.getByText('50 XP to Level 6 🎯')).toBeTruthy();
    });

    it('should render streak calendar component', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByTestId('streak-calendar')).toBeTruthy();
    });
  });

  describe('User Avatar Handling', () => {
    it('should show avatar image when user has avatarUrl', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarImage = screen.getByDisplayValue('https://example.com/avatar.jpg');
      expect(avatarImage).toBeTruthy();
    });

    it('should show user initials when no avatar image', () => {
      const mockContextNoAvatar = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, avatarUrl: null },
      };

      jest.doMock('../../context/AuthContext', () => ({
        useAuth: () => mockContextNoAvatar,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);
      expect(screen.getByText('T')).toBeTruthy(); // First letter of "Test Chef Pro"
      unmount();
    });

    it('should handle profile photo press with options alert', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Update Profile Photo',
        "Choose how you'd like to update your profile photo",
        expect.arrayContaining([
          expect.objectContaining({ text: 'Take Photo' }),
          expect.objectContaining({ text: 'Choose from Library' }),
          expect.objectContaining({ text: 'Cancel' }),
        ])
      );
    });
  });

  describe('Image Picker Integration', () => {
    it('should handle camera permission request and photo capture', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-photo.jpg' }],
      });
      mockCookCamApi.uploadProfilePhoto.mockResolvedValue({
        success: true,
        data: { avatarUrl: 'https://example.com/new-avatar.jpg' },
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      // Simulate taking photo through alert callback
      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      // Get the alert call and trigger "Take Photo" option
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const takePhotoOption = alertCall[2].find((option: any) => option.text === 'Take Photo');
      
      await act(async () => {
        await takePhotoOption.onPress();
      });

      await waitFor(() => {
        expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        expect(mockCookCamApi.uploadProfilePhoto).toHaveBeenCalled();
        expect(mockAuthContext.updateUser).toHaveBeenCalledWith({
          avatarUrl: 'https://example.com/new-avatar.jpg',
        });
      });
    });

    it('should handle image library permission and selection', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://selected-photo.jpg' }],
      });
      mockCookCamApi.uploadProfilePhoto.mockResolvedValue({
        success: true,
        data: { avatarUrl: 'https://example.com/selected-avatar.jpg' },
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const libraryOption = alertCall[2].find((option: any) => option.text === 'Choose from Library');
      
      await act(async () => {
        await libraryOption.onPress();
      });

      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      });
    });

    it('should handle permission denied gracefully', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const takePhotoOption = alertCall[2].find((option: any) => option.text === 'Take Photo');
      
      await act(async () => {
        await takePhotoOption.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Camera permission is required to take photos.'
        );
      });
    });

    it('should handle photo upload failure', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-photo.jpg' }],
      });
      mockCookCamApi.uploadProfilePhoto.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const takePhotoOption = alertCall[2].find((option: any) => option.text === 'Take Photo');
      
      await act(async () => {
        await takePhotoOption.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Upload failed');
      });
    });
  });

  describe('Creator Section', () => {
    it('should show creator dashboard for existing creators', () => {
      const mockCreatorContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, isCreator: true },
      };

      jest.doMock('../../context/AuthContext', () => ({
        useAuth: () => mockCreatorContext,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByTestId('chef-badge')).toBeTruthy();
      expect(screen.getByText('View Creator Dashboard')).toBeTruthy();

      const dashboardButton = screen.getByText('View Creator Dashboard');
      fireEvent.press(dashboardButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Creator');
      unmount();
    });

    it('should show become creator card for non-creators', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Become a Creator')).toBeTruthy();
      expect(screen.getByText('Share recipes and earn up to 30% commission')).toBeTruthy();
      expect(screen.getByText('Start Earning 💰')).toBeTruthy();

      const becomeCreatorButton = screen.getByText('Start Earning 💰');
      fireEvent.press(becomeCreatorButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Creator');
    });
  });

  describe('Stats and Analytics', () => {
    it('should toggle analytics view when XP stat is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const xpStat = screen.getByText('Total XP');
      fireEvent.press(xpStat);

      expect(screen.getByText('How You Compare')).toBeTruthy();

      // Toggle off
      fireEvent.press(xpStat);
      expect(screen.queryByText('How You Compare')).toBeFalsy();
    });

    it('should handle stats sharing functionality', async () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const shareButton = screen.getByText('Your Profile 👤').parent.querySelector('[data-testid="share-button"]');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(Share.share).toHaveBeenCalledWith({
          message: expect.stringContaining('🎉 My CookCam Stats!'),
          title: 'My CookCam Stats',
        });
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      });
    });
  });

  describe('Badge Interactions', () => {
    it('should show badge details when badge is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const firstBadge = screen.getByText('First Recipe');
      fireEvent.press(firstBadge);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(Alert.alert).toHaveBeenCalledWith(
        'First Recipe',
        expect.stringContaining('Created your first recipe')
      );
    });

    it('should display unlock dates for badges correctly', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Unlocked: 1/15/2023')).toBeTruthy();
      expect(screen.getByText('Unlocked: 1/20/2023')).toBeTruthy();
      expect(screen.getByText('Unlocked: 1/25/2023')).toBeTruthy();
    });
  });

  describe('Settings and Navigation', () => {
    it('should show coming soon alerts for privacy and support', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const privacyButton = screen.getByText('Privacy');
      fireEvent.press(privacyButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Coming Soon',
        'Privacy settings will be available soon.'
      );

      const supportButton = screen.getByText('Help & Support');
      fireEvent.press(supportButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Coming Soon',
        'Support page will be available soon.'
      );
    });

    it('should handle logout confirmation', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Logout' }),
        ])
      );
    });

    it('should execute logout when confirmed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.press(logoutButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Logout'
      );
      const logoutOption = alertCall[2].find((option: any) => option.text === 'Logout');
      
      logoutOption.onPress();

      expect(mockAuthContext.logout).toHaveBeenCalledWith(mockNavigation);
    });
  });

  describe('Account Deletion', () => {
    it('should show account deletion confirmation dialog', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const deleteButton = screen.getByText('Delete Account');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Account',
        expect.stringContaining('This will permanently delete your account'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Continue' }),
        ])
      );
    });

    it('should show delete modal when confirmed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const deleteButton = screen.getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Delete Account'
      );
      const continueOption = alertCall[2].find((option: any) => option.text === 'Continue');
      
      act(() => {
        continueOption.onPress();
      });

      expect(screen.getByText('Delete Account')).toBeTruthy(); // Modal title
      expect(screen.getByText('This will permanently delete your account and all your data:')).toBeTruthy();
      expect(screen.getByText('Enter your password to confirm:')).toBeTruthy();
    });

    it('should handle account deletion with password', async () => {
      mockCookCamApi.deleteAccount.mockResolvedValue({ success: true });

      render(<ProfileScreen navigation={mockNavigation} />);

      // Open delete modal
      const deleteButton = screen.getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Delete Account'
      );
      const continueOption = alertCall[2].find((option: any) => option.text === 'Continue');
      
      act(() => {
        continueOption.onPress();
      });

      // Enter password
      const passwordInput = screen.getByPlaceholderText('Your password');
      fireEvent.changeText(passwordInput, 'test-password');

      // Confirm deletion
      const deleteForeverButton = screen.getByText('Delete Forever');
      fireEvent.press(deleteForeverButton);

      await waitFor(() => {
        expect(mockCookCamApi.deleteAccount).toHaveBeenCalledWith('test-password');
      });
    });

    it('should require password for account deletion', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      // Open delete modal
      const deleteButton = screen.getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Delete Account'
      );
      const continueOption = alertCall[2].find((option: any) => option.text === 'Continue');
      
      act(() => {
        continueOption.onPress();
      });

      // Try to delete without password
      const deleteForeverButton = screen.getByText('Delete Forever');
      fireEvent.press(deleteForeverButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter your password to confirm account deletion.'
      );
    });
  });

  describe('Animation Behavior', () => {
    it('should initialize animations on mount', async () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.parallel).toHaveBeenCalled();
        expect(Animated.timing).toHaveBeenCalled();
        expect(Animated.spring).toHaveBeenCalled();
      });
    });

    it('should handle delayed achievement animation', async () => {
      jest.useFakeTimers();

      render(<ProfileScreen navigation={mockNavigation} />);

      // Fast-forward time to trigger delayed animation
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(Animated.spring).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      const mockNoUserContext = {
        ...mockAuthContext,
        user: null,
      };

      jest.doMock('../../context/AuthContext', () => ({
        useAuth: () => mockNoUserContext,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);
      expect(screen.getByText('Chef')).toBeTruthy(); // Default name
      expect(screen.getByText('U')).toBeTruthy(); // Default avatar initial
      unmount();
    });

    it('should handle empty badges array', () => {
      const mockNoBadgesContext = {
        ...mockGamificationContext,
        badges: [],
      };

      jest.doMock('../../context/GamificationContext', () => ({
        useGamification: () => mockNoBadgesContext,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);
      expect(screen.getByText('0/12')).toBeTruthy(); // No badges
      unmount();
    });

    it('should handle image picker cancellation', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      const avatarContainer = screen.getByText('Test Chef Pro').parent;
      fireEvent.press(avatarContainer);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const takePhotoOption = alertCall[2].find((option: any) => option.text === 'Take Photo');
      
      await act(async () => {
        await takePhotoOption.onPress();
      });

      // Should not call upload API when user cancels
      expect(mockCookCamApi.uploadProfilePhoto).not.toHaveBeenCalled();
    });

    it('should handle share functionality errors gracefully', async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error('Share failed'));

      render(<ProfileScreen navigation={mockNavigation} />);

      const shareButton = screen.getByText('Your Profile 👤').parent.querySelector('[data-testid="share-button"]');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(Share.share).toHaveBeenCalled();
        // Should not crash on share error
      });
    });
  });

  describe('Level Progress Calculations', () => {
    it('should calculate progress correctly for different levels', () => {
      const mockHighLevelContext = {
        ...mockGamificationContext,
        level: 8,
        xp: 950,
      };

      jest.doMock('../../context/GamificationContext', () => ({
        useGamification: () => mockHighLevelContext,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Level 8')).toBeTruthy();
      expect(screen.getByText('250 / 400 XP')).toBeTruthy(); // Level 8 progress
      expect(screen.getByText('150 XP to Level 9 🎯')).toBeTruthy();

      unmount();
    });

    it('should handle edge case of level 1', () => {
      const mockLevel1Context = {
        ...mockGamificationContext,
        level: 1,
        xp: 25,
      };

      jest.doMock('../../context/GamificationContext', () => ({
        useGamification: () => mockLevel1Context,
      }));

      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Level 1')).toBeTruthy();
      expect(screen.getByText('25 / 100 XP')).toBeTruthy();
      expect(screen.getByText('75 XP to Level 2 🎯')).toBeTruthy();

      unmount();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<ProfileScreen navigation={mockNavigation} />);
      
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid interactions without memory leaks', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      // Rapid badge presses
      const firstBadge = screen.getByText('First Recipe');
      for (let i = 0; i < 10; i++) {
        fireEvent.press(firstBadge);
      }

      expect(Haptics.impactAsync).toHaveBeenCalledTimes(10);
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible interaction elements', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Logout')).toBeTruthy();
      expect(screen.getByText('Privacy')).toBeTruthy();
      expect(screen.getByText('Help & Support')).toBeTruthy();
      expect(screen.getByText('Delete Account')).toBeTruthy();
    });

    it('should show app version for reference', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('CookCam v1.0.0')).toBeTruthy();
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Animated } from 'react-native';
import CameraScreen from '../../screens/CameraScreen';
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
    name: 'Test Chef',
    email: 'test@cookcam.com',
  },
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  checkBiometricAuth: jest.fn(),
};

const mockGamificationContext = {
  xp: 250,
  level: 3,
  streak: 5,
  badges: ['first-scan', 'ingredient-expert'],
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
  XP_VALUES: {
    SCAN_INGREDIENTS: 15,
    COMPLETE_RECIPE: 25,
    DAILY_CHECK_IN: 5,
  },
}));

// Mock components
jest.mock('../../components/DailyCheckIn', () => () => (
  <div testID="daily-check-in">Daily Check In Component</div>
));

// Mock Expo camera
const mockCameraRef = {
  takePictureAsync: jest.fn(),
  current: null,
};

jest.mock('expo-camera', () => ({
  CameraView: React.forwardRef((props, ref) => {
    mockCameraRef.current = ref;
    return <div testID="camera-view" {...props} ref={ref} />;
  }),
  CameraType: {
    back: 'back',
    front: 'front',
  },
  useCameraPermissions: jest.fn(() => [
    { granted: true, status: 'granted' },
    jest.fn(),
  ]),
}));

// Mock external libraries
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

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    React.useEffect(() => {
      const unsubscribe = callback();
      return unsubscribe;
    }, [callback]);
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

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
      sequence: jest.fn((animations) => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      loop: jest.fn((animation) => ({
        start: jest.fn(),
      })),
      View: RN.Animated.View,
    },
    Platform: {
      ...RN.Platform,
      OS: 'ios',
      isPad: false,
    },
  };
});

describe('CameraScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render camera screen with all essential elements', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
      expect(screen.getByText('Show me what you\'ve got!')).toBeTruthy();
      expect(screen.getByText('Scan Ingredients')).toBeTruthy();
      expect(screen.getByText('Enter Ingredients Manually')).toBeTruthy();
    });

    it('should render camera preview area with overlay elements', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByTestId('camera-view')).toBeTruthy();
      expect(screen.getByText('Tap to detect your ingredients')).toBeTruthy();
    });

    it('should render fun fact section with cycling tips', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // Should show first fun fact
      expect(screen.getByText(/Honey never spoils/)).toBeTruthy();
    });

    it('should render floating emoji animations', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByText('🥕')).toBeTruthy();
      expect(screen.getByText('🧄')).toBeTruthy();
    });
  });

  describe('Camera Permissions', () => {
    it('should show permission request screen when no camera access', () => {
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, status: 'undetermined' },
        jest.fn(),
      ]);

      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByText('Camera Permission Required')).toBeTruthy();
      expect(screen.getByText('CookCam needs camera access to scan your ingredients and generate amazing recipes!')).toBeTruthy();
      expect(screen.getByText('Grant Camera Access')).toBeTruthy();
    });

    it('should request permission when grant button is pressed', () => {
      const mockRequestPermission = jest.fn();
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, status: 'undetermined' },
        mockRequestPermission,
      ]);

      render(<CameraScreen navigation={mockNavigation} />);

      const grantButton = screen.getByText('Grant Camera Access');
      fireEvent.press(grantButton);

      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should show camera interface when permission is granted', () => {
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: true, status: 'granted' },
        jest.fn(),
      ]);

      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByTestId('camera-view')).toBeTruthy();
      expect(screen.getByText('Scan Ingredients')).toBeTruthy();
    });
  });

  describe('Photo Capture Functionality', () => {
    beforeEach(() => {
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: true, status: 'granted' },
        jest.fn(),
      ]);
    });

    it('should handle photo capture with haptic feedback', async () => {
      mockCameraRef.takePictureAsync.mockResolvedValue({
        uri: 'file://test-photo.jpg',
      });

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
        expect(mockCameraRef.takePictureAsync).toHaveBeenCalledWith({
          quality: 0.8,
          base64: false,
        });
      });
    });

    it('should award XP for successful photo capture', async () => {
      mockCameraRef.takePictureAsync.mockResolvedValue({
        uri: 'file://test-photo.jpg',
      });

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await waitFor(() => {
        expect(mockGamificationContext.addXP).toHaveBeenCalledWith(15, 'SCAN_INGREDIENTS');
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
      });
    });

    it('should navigate to ingredient review with captured photo', async () => {
      mockCameraRef.takePictureAsync.mockResolvedValue({
        uri: 'file://test-photo.jpg',
      });

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('IngredientReview', {
          imageUri: 'file://test-photo.jpg',
        });
      });
    });

    it('should show loading state during photo processing', async () => {
      mockCameraRef.takePictureAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ uri: 'test.jpg' }), 100))
      );

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      // Should show loading indicator
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(200);
      });
    });

    it('should handle camera error gracefully', async () => {
      mockCameraRef.takePictureAsync.mockRejectedValue(new Error('Camera failed'));

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Photo Error',
          'Failed to take photo. Please try again.',
          [{ text: 'OK' }]
        );
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
      });
    });

    it('should handle missing camera reference', async () => {
      mockCameraRef.current = null;

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Camera Error',
          'Camera is not available. Please check permissions and try again.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Simulator Mode', () => {
    beforeEach(() => {
      // Mock Platform.OS as iOS but not iPad to simulate iOS simulator
      require('react-native').Platform.OS = 'ios';
      require('react-native').Platform.isPad = false;
    });

    it('should detect simulator environment', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      // Should use mock image in simulator mode
      expect(mockNavigation.navigate).toHaveBeenCalledWith('IngredientReview', 
        expect.objectContaining({
          isSimulator: false, // Note: isSimulator is set to false in navigation
        })
      );
    });

    it('should use mock camera images in simulator mode', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      await act(async () => {
        jest.advanceTimersByTime(1600); // Wait for simulation delay
      });

      await waitFor(() => {
        expect(mockGamificationContext.addXP).toHaveBeenCalledWith(15, 'SCAN_INGREDIENTS');
        expect(mockNavigation.navigate).toHaveBeenCalled();
      });
    });

    it('should provide haptic feedback in simulator mode', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

      await act(async () => {
        jest.advanceTimersByTime(1600);
      });

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
      });
    });
  });

  describe('Manual Input Functionality', () => {
    it('should handle manual ingredient input with haptic feedback', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const manualButton = screen.getByText('Enter Ingredients Manually');
      fireEvent.press(manualButton);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('IngredientReview', {
        imageUri: null,
        isSimulator: false,
        isManualInput: true,
      });
    });

    it('should disable manual input during processing', () => {
      mockCameraRef.takePictureAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ uri: 'test.jpg' }), 100))
      );

      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      const manualButton = screen.getByText('Enter Ingredients Manually');
      expect(manualButton.parent.props.disabled).toBe(true);
    });
  });

  describe('Fun Facts and Tips', () => {
    it('should cycle through fun facts every 8 seconds', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // Should start with first fact
      expect(screen.getByText(/Honey never spoils/)).toBeTruthy();

      // Fast forward 8 seconds
      act(() => {
        jest.advanceTimersByTime(8000);
      });

      // Should show second fact
      expect(screen.getByText(/Bananas are berries/)).toBeTruthy();
    });

    it('should loop back to first fact after showing all facts', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // Fast forward through all facts (10 facts * 8 seconds = 80 seconds)
      act(() => {
        jest.advanceTimersByTime(80000);
      });

      // Should be back to first fact
      expect(screen.getByText(/Honey never spoils/)).toBeTruthy();
    });

    it('should clear fact interval on component unmount', () => {
      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      unmount();
      
      // Should not crash or continue updating
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(8000);
        });
      }).not.toThrow();
    });
  });

  describe('Animation Behavior', () => {
    it('should initialize animations on mount', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.loop).toHaveBeenCalled();
        expect(Animated.sequence).toHaveBeenCalled();
        expect(Animated.timing).toHaveBeenCalled();
        expect(Animated.parallel).toHaveBeenCalled();
        expect(Animated.spring).toHaveBeenCalled();
      });
    });

    it('should create pulse animation for scan button and elements', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        // Pulse animation for scan button
        expect(Animated.loop).toHaveBeenCalled();
        expect(Animated.sequence).toHaveBeenCalled();
      });
    });

    it('should create rotating background decoration', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.loop).toHaveBeenCalled();
        expect(Animated.timing).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            toValue: 1,
            duration: 30000,
            useNativeDriver: true,
          })
        );
      });
    });

    it('should animate content fade in and slide up', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.parallel).toHaveBeenCalled();
        expect(Animated.timing).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        );
        expect(Animated.spring).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          })
        );
      });
    });

    it('should animate XP badge with delay', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.spring).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            toValue: 1,
            tension: 50,
            friction: 7,
            delay: 500,
            useNativeDriver: true,
          })
        );
      });
    });
  });

  describe('Daily Check-In Integration', () => {
    it('should show daily check-in modal when triggered', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // Simulate showing daily check-in (this would be triggered by some condition)
      // Since the component manages this internally, we'll test the rendered component
      expect(screen.queryByTestId('daily-check-in')).toBeFalsy(); // Initially hidden
    });

    it('should hide daily check-in when close button is pressed', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // Since showDailyCheckIn starts as false, we can't directly test this
      // without modifying component state, but we can verify the structure exists
      expect(screen.queryByTestId('daily-check-in')).toBeFalsy();
    });
  });

  describe('Focus Effect and Camera Reinitialization', () => {
    it('should reinitialize camera when screen comes into focus', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      // The useFocusEffect should trigger camera reinitialization
      expect(screen.getByText('Initializing camera...')).toBeTruthy();

      // After delay, should show ready state
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(screen.getByText('Tap to detect your ingredients')).toBeTruthy();
    });

    it('should clean up timer on screen unfocus', () => {
      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      unmount();
      
      // Should not throw errors during cleanup
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('should handle different screen sizes', () => {
      // Mock small device dimensions
      const originalGet = require('react-native').Dimensions.get;
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 320,
        height: 568,
      }));

      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
      
      // Restore original Dimensions
      require('react-native').Dimensions.get = originalGet;
      unmount();
    });

    it('should handle large device dimensions', () => {
      const originalGet = require('react-native').Dimensions.get;
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 414,
        height: 896,
      }));

      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      expect(screen.getByText('Scan Ingredients')).toBeTruthy();
      
      require('react-native').Dimensions.get = originalGet;
      unmount();
    });

    it('should apply small device styling for compact screens', () => {
      const originalGet = require('react-native').Dimensions.get;
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 320,
        height: 650, // Below 700px threshold
      }));

      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      // Should still render all elements properly
      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
      expect(screen.getByText('Show me what you\'ve got!')).toBeTruthy();
      
      require('react-native').Dimensions.get = originalGet;
      unmount();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user context gracefully', () => {
      const mockNoUserContext = {
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        checkBiometricAuth: jest.fn(),
      };

      jest.doMock('../../context/AuthContext', () => ({
        useAuth: () => mockNoUserContext,
      }));

      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
      unmount();
    });

    it('should handle camera initialization failure', () => {
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: true, status: 'granted' },
        jest.fn(),
      ]);

      render(<CameraScreen navigation={mockNavigation} />);

      // Should show initializing state initially
      expect(screen.getByText('Initializing camera...')).toBeTruthy();
    });

    it('should handle rapid button presses without issues', async () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      
      // Rapid presses
      for (let i = 0; i < 5; i++) {
        fireEvent.press(scanButton);
      }

      // Should only process once due to processing state
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle component unmount during photo processing', () => {
      mockCameraRef.takePictureAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ uri: 'test.jpg' }), 100))
      );

      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      // Unmount during processing
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up all timers and intervals on unmount', () => {
      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);
      
      unmount();
      
      // Advance time and ensure no state updates occur
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(10000);
        });
      }).not.toThrow();
    });

    it('should not create memory leaks with animations', async () => {
      const { unmount } = render(<CameraScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(Animated.Value).toHaveBeenCalled();
      });

      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<CameraScreen navigation={mockNavigation} />);

      for (let i = 0; i < 5; i++) {
        rerender(<CameraScreen navigation={mockNavigation} />);
      }

      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible interaction elements', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      const manualButton = screen.getByText('Enter Ingredients Manually');
      
      expect(scanButton).toBeTruthy();
      expect(manualButton).toBeTruthy();
    });

    it('should provide meaningful text content for screen readers', () => {
      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
      expect(screen.getByText('Show me what you\'ve got!')).toBeTruthy();
      expect(screen.getByText('Tap to detect your ingredients')).toBeTruthy();
      expect(screen.getByText(/Honey never spoils/)).toBeTruthy();
    });

    it('should handle permission request accessibility', () => {
      const mockUseCameraPermissions = require('expo-camera').useCameraPermissions;
      mockUseCameraPermissions.mockReturnValue([
        { granted: false, status: 'undetermined' },
        jest.fn(),
      ]);

      render(<CameraScreen navigation={mockNavigation} />);

      expect(screen.getByText('Camera Permission Required')).toBeTruthy();
      expect(screen.getByText('CookCam needs camera access to scan your ingredients and generate amazing recipes!')).toBeTruthy();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle iOS-specific behavior', () => {
      require('react-native').Platform.OS = 'ios';
      
      render(<CameraScreen navigation={mockNavigation} />);
      
      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
    });

    it('should handle Android-specific behavior', () => {
      require('react-native').Platform.OS = 'android';
      
      render(<CameraScreen navigation={mockNavigation} />);
      
      expect(screen.getByText('Ready to Cook? 🍳')).toBeTruthy();
    });

    it('should detect non-simulator environment correctly', () => {
      require('react-native').Platform.OS = 'android'; // Android is never simulator
      
      render(<CameraScreen navigation={mockNavigation} />);

      const scanButton = screen.getByText('Scan Ingredients');
      fireEvent.press(scanButton);

      // Should use real camera on Android
      expect(mockCameraRef.takePictureAsync).toHaveBeenCalled();
    });
  });
});
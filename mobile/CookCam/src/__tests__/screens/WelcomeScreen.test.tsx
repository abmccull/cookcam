import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import WelcomeScreen from '../../screens/WelcomeScreen';

// Mock react-native modules BEFORE any other imports
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios || config.default),
  },
  Animated: {
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    View: 'AnimatedView',
    createAnimatedComponent: jest.fn((component) => component),
  },
  UIManager: {
    getViewManagerConfig: jest.fn(() => ({})),
  },
  requireNativeComponent: jest.fn((name) => name),
}));

// Mock AIChefIcon component
jest.mock('../../components/AIChefIcon', () => {
  return function MockAIChefIcon({ size }: any) {
    return <div testID="ai-chef-icon" data-size={size} />;
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  User: ({ size, color }: any) => (
    <div testID="user-icon" data-size={size} data-color={color} />
  ),
  UserPlus: ({ size, color }: any) => (
    <div testID="user-plus-icon" data-size={size} data-color={color} />
  ),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

describe('WelcomeScreen', () => {
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
  } as any;

  const renderWithNavigation = () => {
    return render(<WelcomeScreen navigation={mockNavigation} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all main components', () => {
      renderWithNavigation();

      // Check for logo
      expect(screen.getByTestId('ai-chef-icon')).toBeTruthy();
      expect(screen.getByTestId('ai-chef-icon').props['data-size']).toBe(100);

      // Check for app name and tagline
      expect(screen.getByText('CookCam')).toBeTruthy();
      expect(screen.getByText('Your AI-powered cooking companion')).toBeTruthy();

      // Check for buttons
      expect(screen.getByText("I'm new")).toBeTruthy();
      expect(screen.getByText('Start your cooking journey')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
      expect(screen.getByText('Welcome back!')).toBeTruthy();

      // Check for footer
      expect(
        screen.getByText('Scan ingredients, get AI recipes, and level up your cooking skills')
      ).toBeTruthy();
    });

    it('should render button icons correctly', () => {
      renderWithNavigation();

      // Check UserPlus icon for "I'm new" button
      const userPlusIcon = screen.getByTestId('user-plus-icon');
      expect(userPlusIcon).toBeTruthy();
      expect(userPlusIcon.props['data-size']).toBe(24);
      expect(userPlusIcon.props['data-color']).toBe('#FFFFFF');

      // Check User icon for "Sign In" button
      const userIcon = screen.getByTestId('user-icon');
      expect(userIcon).toBeTruthy();
      expect(userIcon.props['data-size']).toBe(24);
      expect(userIcon.props['data-color']).toBe('#2D1B69');
    });
  });

  describe('Navigation', () => {
    it('should navigate to Login screen when Sign In is pressed', () => {
      renderWithNavigation();

      const signInButton = screen.getByText('Sign In').parent;
      fireEvent.press(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate to Onboarding screen when "I\'m new" is pressed', () => {
      renderWithNavigation();

      const imNewButton = screen.getByText("I'm new").parent;
      fireEvent.press(imNewButton);

      expect(mockNavigate).toHaveBeenCalledWith('Onboarding');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animations', () => {
    it('should initialize animation values correctly', () => {
      const mockAnimatedValue = require('react-native').Animated.Value;
      
      renderWithNavigation();

      // Check that Animated.Value was called with correct initial values
      expect(mockAnimatedValue).toHaveBeenCalledWith(0); // fadeAnim
      expect(mockAnimatedValue).toHaveBeenCalledWith(50); // slideAnim
      expect(mockAnimatedValue).toHaveBeenCalledWith(0.8); // scaleAnim
    });

    it('should start animations on mount', async () => {
      const mockAnimated = require('react-native').Animated;
      
      renderWithNavigation();

      await waitFor(() => {
        // Check that animation sequence was created and started
        expect(mockAnimated.sequence).toHaveBeenCalled();
        expect(mockAnimated.parallel).toHaveBeenCalled();
        expect(mockAnimated.timing).toHaveBeenCalled();
      });
    });

    it('should apply correct animation durations', () => {
      const mockAnimated = require('react-native').Animated;
      mockAnimated.timing.mockClear();
      
      renderWithNavigation();

      // Check timing configurations
      const timingCalls = mockAnimated.timing.mock.calls;
      
      // First timing for scale animation (600ms)
      expect(timingCalls[0][1]).toMatchObject({
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      });

      // Second and third timings for fade and slide (800ms each)
      expect(timingCalls[1][1]).toMatchObject({
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      });
      
      expect(timingCalls[2][1]).toMatchObject({
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      });
    });
  });

  describe('Styling', () => {
    it('should apply correct styles to primary button', () => {
      const { UNSAFE_getAllByType } = renderWithNavigation();
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      const primaryButton = touchables[0]; // First button is "I'm new"
      
      expect(primaryButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FF6B35',
          }),
        ])
      );
    });

    it('should apply correct styles to secondary button', () => {
      const { UNSAFE_getAllByType } = renderWithNavigation();
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      const secondaryButton = touchables[1]; // Second button is "Sign In"
      
      expect(secondaryButton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#E0E0E0',
          }),
        ])
      );
    });

    it('should apply correct activeOpacity to buttons', () => {
      const { UNSAFE_getAllByType } = renderWithNavigation();
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      
      touchables.forEach(button => {
        expect(button.props.activeOpacity).toBe(0.9);
      });
    });
  });

  describe('Layout', () => {
    it('should have correct container structure', () => {
      const { UNSAFE_getByType, UNSAFE_getAllByType } = renderWithNavigation();
      
      // Check SafeAreaView container
      const safeArea = UNSAFE_getByType('SafeAreaView');
      expect(safeArea.props.style).toMatchObject({
        flex: 1,
        backgroundColor: '#F8F8FF',
      });

      // Check content view
      const views = UNSAFE_getAllByType('View');
      const contentView = views[0]; // First View is the content container
      expect(contentView.props.style).toMatchObject({
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'space-between',
      });
    });

    it('should calculate logo section padding based on screen height', () => {
      const { UNSAFE_getAllByType } = renderWithNavigation();
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      const logoSection = animatedViews[0]; // First AnimatedView is logo section
      
      // Height is mocked as 844, so paddingTop should be 844 * 0.05 = 42.2
      expect(logoSection.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingTop: 42.2,
          }),
        ])
      );
    });
  });

  describe('Text Content', () => {
    it('should display correct text hierarchy', () => {
      renderWithNavigation();

      // App name should be present
      const appName = screen.getByText('CookCam');
      expect(appName).toBeTruthy();

      // Tagline should be present
      const tagline = screen.getByText('Your AI-powered cooking companion');
      expect(tagline).toBeTruthy();

      // Button texts
      expect(screen.getByText("I'm new")).toBeTruthy();
      expect(screen.getByText('Start your cooking journey')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
      expect(screen.getByText('Welcome back!')).toBeTruthy();

      // Footer text
      expect(
        screen.getByText('Scan ingredients, get AI recipes, and level up your cooking skills')
      ).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have touchable areas for buttons', () => {
      const { UNSAFE_getAllByType } = renderWithNavigation();
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      
      // Should have exactly 2 touchable buttons
      expect(touchables).toHaveLength(2);
    });

    it('should have readable text content', () => {
      renderWithNavigation();

      // All text should be findable
      const texts = [
        'CookCam',
        'Your AI-powered cooking companion',
        "I'm new",
        'Start your cooking journey',
        'Sign In',
        'Welcome back!',
        'Scan ingredients, get AI recipes, and level up your cooking skills',
      ];

      texts.forEach(text => {
        expect(screen.getByText(text)).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      renderWithNavigation();

      const signInButton = screen.getByText('Sign In').parent;
      
      // Press button multiple times rapidly
      fireEvent.press(signInButton);
      fireEvent.press(signInButton);
      fireEvent.press(signInButton);

      // Should still only navigate once per press
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('should handle component unmount during animations', () => {
      const { unmount } = renderWithNavigation();

      // Unmount should not throw errors even with ongoing animations
      expect(() => unmount()).not.toThrow();
    });
  });
});
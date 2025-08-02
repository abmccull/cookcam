// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CookModeScreen from '../../screens/CookModeScreen';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Alert: {
    alert: jest.fn(),
  },
  Vibration: {
    vibrate: jest.fn(),
  },
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
    Text: 'AnimatedText',
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
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

// Mock expo modules
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

jest.mock('expo-keep-awake', () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      recipe: {
        id: 'test-recipe-id',
        title: 'Test Recipe',
        instructions: [
          'Preheat oven to 350°F',
          'Mix ingredients in a bowl',
          'Bake for 30 minutes',
          'Let cool and serve',
        ],
        ingredients: [
          { name: 'Flour', amount: '2 cups' },
          { name: 'Sugar', amount: '1 cup' },
          { name: 'Eggs', amount: '2' },
        ],
        prep_time: 15,
        cook_time: 30,
      },
    },
  }),
}));

// Mock contexts
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id' },
  })),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    userStats: {
      level: 5,
      xp: 1200,
    },
    completeRecipe: jest.fn(),
  })),
}));

// Mock services
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    startCooking: jest.fn(),
    completeCooking: jest.fn(),
    trackCookingStep: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('CookModeScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;

  const mockRoute = {
    params: {
      recipe: {
        id: 'test-recipe-id',
        title: 'Test Recipe',
        instructions: [
          'Preheat oven to 350°F',
          'Mix ingredients in a bowl',
          'Bake for 30 minutes',
          'Let cool and serve',
        ],
        ingredients: [
          { name: 'Flour', amount: '2 cups' },
          { name: 'Sugar', amount: '1 cup' },
          { name: 'Eggs', amount: '2' },
        ],
        prep_time: 15,
        cook_time: 30,
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render recipe title', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(screen.getByText('Test Recipe')).toBeTruthy();
    });

    it('should render current step', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(screen.getByText(/Preheat oven to 350°F/)).toBeTruthy();
    });

    it('should render step counter', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(screen.getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('should render navigation buttons', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(screen.getByText('Next')).toBeTruthy();
      expect(screen.getByTestId('ChevronLeft-icon')).toBeTruthy();
    });

    it('should render timer controls', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(screen.getByTestId('Clock-icon')).toBeTruthy();
      expect(screen.getByText(/Timer/)).toBeTruthy();
    });

    it('should render ingredients list', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const ingredientsButton = screen.getByTestId('List-icon');
      fireEvent.press(ingredientsButton.parent);
      
      expect(screen.getByText('Flour')).toBeTruthy();
      expect(screen.getByText('2 cups')).toBeTruthy();
    });
  });

  describe('Navigation Through Steps', () => {
    it('should navigate to next step when next button is pressed', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);
      
      expect(screen.getByText(/Mix ingredients in a bowl/)).toBeTruthy();
      expect(screen.getByText(/Step 2 of 4/)).toBeTruthy();
    });

    it('should navigate to previous step when back button is pressed', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      // Go to step 2
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);
      
      // Go back to step 1
      const backButton = screen.getByTestId('ChevronLeft-icon').parent;
      fireEvent.press(backButton);
      
      expect(screen.getByText(/Preheat oven to 350°F/)).toBeTruthy();
      expect(screen.getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('should disable back button on first step', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const backButton = screen.getByTestId('ChevronLeft-icon').parent;
      expect(backButton.props.disabled).toBe(true);
    });

    it('should show finish button on last step', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      // Navigate to last step
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton); // Step 2
      fireEvent.press(nextButton); // Step 3
      fireEvent.press(nextButton); // Step 4
      
      expect(screen.getByText('Finish')).toBeTruthy();
    });

    it('should complete cooking when finish button is pressed', async () => {
      const mockCompleteCooking = require('../../services/cookCamApi').cookCamApi.completeCooking;
      const mockCompleteRecipe = require('../../context/GamificationContext').useGamification().completeRecipe;
      
      mockCompleteCooking.mockResolvedValueOnce({
        success: true,
        data: { xpEarned: 100 },
      });
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      // Navigate to last step
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton); // Step 2
      fireEvent.press(nextButton); // Step 3
      fireEvent.press(nextButton); // Step 4
      
      const finishButton = screen.getByText('Finish');
      fireEvent.press(finishButton);
      
      await waitFor(() => {
        expect(mockCompleteCooking).toHaveBeenCalledWith('test-recipe-id');
        expect(mockCompleteRecipe).toHaveBeenCalledWith('test-recipe-id');
      });
    });
  });

  describe('Timer Functionality', () => {
    it('should start timer when timer button is pressed', () => {
      jest.useFakeTimers();
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const timerButton = screen.getByTestId('Clock-icon').parent;
      fireEvent.press(timerButton);
      
      // Set timer for 5 minutes
      const setTimerButton = screen.getByText('5 min');
      fireEvent.press(setTimerButton);
      
      const startButton = screen.getByText('Start');
      fireEvent.press(startButton);
      
      expect(screen.getByText(/4:5/)).toBeTruthy();
      
      jest.useRealTimers();
    });

    it('should pause timer when pause button is pressed', () => {
      jest.useFakeTimers();
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const timerButton = screen.getByTestId('Clock-icon').parent;
      fireEvent.press(timerButton);
      
      const setTimerButton = screen.getByText('5 min');
      fireEvent.press(setTimerButton);
      
      const startButton = screen.getByText('Start');
      fireEvent.press(startButton);
      
      const pauseButton = screen.getByText('Pause');
      fireEvent.press(pauseButton);
      
      expect(screen.getByText('Resume')).toBeTruthy();
      
      jest.useRealTimers();
    });

    it('should vibrate and notify when timer completes', () => {
      jest.useFakeTimers();
      const mockVibrate = require('react-native').Vibration.vibrate;
      const mockNotificationAsync = require('expo-haptics').notificationAsync;
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const timerButton = screen.getByTestId('Clock-icon').parent;
      fireEvent.press(timerButton);
      
      const setTimerButton = screen.getByText('1 min');
      fireEvent.press(setTimerButton);
      
      const startButton = screen.getByText('Start');
      fireEvent.press(startButton);
      
      // Fast forward timer
      jest.advanceTimersByTime(60000);
      
      expect(mockVibrate).toHaveBeenCalled();
      expect(mockNotificationAsync).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Voice Assistance', () => {
    it('should speak instructions when voice button is pressed', () => {
      const mockSpeak = require('expo-speech').speak;
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const voiceButton = screen.getByTestId('Volume2-icon').parent;
      fireEvent.press(voiceButton);
      
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('Preheat oven to 350°F'),
        expect.any(Object)
      );
    });

    it('should stop speaking when stop button is pressed', async () => {
      const mockStop = require('expo-speech').stop;
      const mockIsSpeakingAsync = require('expo-speech').isSpeakingAsync;
      mockIsSpeakingAsync.mockResolvedValueOnce(true);
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const voiceButton = screen.getByTestId('Volume2-icon').parent;
      fireEvent.press(voiceButton);
      
      await waitFor(() => {
        const stopButton = screen.getByTestId('VolumeX-icon').parent;
        fireEvent.press(stopButton);
      });
      
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('Keep Screen Awake', () => {
    it('should activate keep awake on mount', () => {
      const mockActivateKeepAwake = require('expo-keep-awake').activateKeepAwake;
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      expect(mockActivateKeepAwake).toHaveBeenCalled();
    });

    it('should deactivate keep awake on unmount', () => {
      const mockDeactivateKeepAwake = require('expo-keep-awake').deactivateKeepAwake;
      
      const { unmount } = render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      unmount();
      
      expect(mockDeactivateKeepAwake).toHaveBeenCalled();
    });
  });

  describe('Exit Confirmation', () => {
    it('should show confirmation when exit button is pressed', () => {
      const mockAlert = require('react-native').Alert.alert;
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const exitButton = screen.getByTestId('X-icon').parent;
      fireEvent.press(exitButton);
      
      expect(mockAlert).toHaveBeenCalledWith(
        'Exit Cook Mode',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should navigate back when exit is confirmed', () => {
      const mockAlert = require('react-native').Alert.alert;
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate pressing "Yes" button
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const exitButton = screen.getByTestId('X-icon').parent;
      fireEvent.press(exitButton);
      
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Step Tracking', () => {
    it('should track step completion', async () => {
      const mockTrackCookingStep = require('../../services/cookCamApi').cookCamApi.trackCookingStep;
      mockTrackCookingStep.mockResolvedValueOnce({ success: true });
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);
      
      await waitFor(() => {
        expect(mockTrackCookingStep).toHaveBeenCalledWith('test-recipe-id', 1);
      });
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback on step navigation', () => {
      const mockImpactAsync = require('expo-haptics').impactAsync;
      
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);
      
      expect(mockImpactAsync).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('should show progress bar', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      // Progress bar should be visible
      const progressBar = screen.UNSAFE_queryByType('AnimatedView');
      expect(progressBar).toBeTruthy();
    });

    it('should update progress bar as steps complete', () => {
      render(<CookModeScreen navigation={mockNavigation} route={mockRoute} />);
      
      // Initially at 25% (1 of 4 steps)
      let progressBar = screen.UNSAFE_queryByType('AnimatedView');
      expect(progressBar.props.style).toMatchObject(expect.objectContaining({
        width: expect.any(Object),
      }));
      
      // Move to next step (50%)
      const nextButton = screen.getByText('Next');
      fireEvent.press(nextButton);
      
      progressBar = screen.UNSAFE_queryByType('AnimatedView');
      expect(progressBar).toBeTruthy();
    });
  });
});
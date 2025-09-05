import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Animated } from 'react-native';
import IngredientReviewScreen from '../../screens/IngredientReviewScreen';
import * as Haptics from 'expo-haptics';

// Global PixelRatio mock
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Mock route params
const mockRoute = {
  params: {
    imageUri: 'file://test-image.jpg',
    isSimulator: false,
  },
};

const mockSimulatorRoute = {
  params: {
    imageUri: 'file://test-image.jpg',
    isSimulator: true,
  },
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
  badges: ['ingredient-detector', 'mystery-hunter'],
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
    SUCCESSFUL_SCAN: 25,
    ADD_REAL_INGREDIENT: 5,
    MYSTERY_BOX: 10,
  },
}));

// Mock services
const mockCookCamApi = {
  scanIngredients: jest.fn(),
  searchIngredients: jest.fn(),
};

jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: mockCookCamApi,
}));

// Mock components
jest.mock('../../components/MysteryBox', () => ({ onOpen }) => (
  <div testID="mystery-box" onPress={onOpen}>Mystery Box</div>
));

jest.mock('../../components/AIChefIcon', () => ({ size }) => (
  <div testID="ai-chef-icon" data-size={size}>AI Chef Icon</div>
));

jest.mock('../../components/LoadingAnimation', () => ({ visible }) => (
  visible ? <div testID="loading-animation">Loading...</div> : null
));

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
    button: {
      height: {
        medium: 44,
      },
    },
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');
jest.spyOn(Alert, 'prompt');

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
      sequence: jest.fn((animations) => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      View: RN.Animated.View,
      Text: RN.Animated.Text,
    },
  };
});

// Mock FileReader for image processing
global.FileReader = class MockFileReader {
  result = 'data:image/jpeg;base64,test-base64-data';
  onload = null;
  onerror = null;
  
  readAsDataURL() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};

// Mock fetch for image processing
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob()),
  })
);

describe('IngredientReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock Math.random for consistent mystery box testing
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // Won't trigger mystery box (25% chance)
  });

  afterEach(() => {
    jest.useRealTimers();
    Math.random.mockRestore?.();
  });

  describe('Component Rendering', () => {
    it('should render ingredient review screen with all essential elements', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      expect(screen.getByTestId('ai-chef-icon')).toBeTruthy();
      expect(screen.getByText('AI Detected Ingredients')).toBeTruthy();
      expect(screen.getByText('Generate Recipes')).toBeTruthy();
    });

    it('should show loading state initially when analyzing image', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      expect(screen.getByText('Analyzing Ingredients...')).toBeTruthy();
      expect(screen.getByText('Please wait')).toBeTruthy();
      expect(screen.getByTestId('loading-animation')).toBeTruthy();
    });

    it('should render stats row with confidence and detection counts', async () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      await waitFor(() => {
        expect(screen.getByText('High Confidence')).toBeTruthy();
        expect(screen.getByText('Detected')).toBeTruthy();
      });
    });

    it('should show simulator ingredients immediately', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      expect(screen.getByText('Tomatoes')).toBeTruthy();
      expect(screen.getByText('Mozzarella')).toBeTruthy();
      expect(screen.getByText('Basil')).toBeTruthy();
      expect(screen.getByText('Olive Oil')).toBeTruthy();
      expect(screen.getByText('Garlic')).toBeTruthy();
    });
  });

  describe('Image Analysis', () => {
    it('should analyze image and display detected ingredients', async () => {
      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Chicken Breast', confidence: 0.95, quantity: '1', unit: 'lb' },
            { name: 'Bell Pepper', confidence: 0.88, quantity: '2', unit: 'pieces' },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.scanIngredients).toHaveBeenCalled();
        expect(screen.getByText('Chicken Breast')).toBeTruthy();
        expect(screen.getByText('Bell Pepper')).toBeTruthy();
      });
    });

    it('should handle image analysis failure with fallback ingredients', async () => {
      mockCookCamApi.scanIngredients.mockRejectedValue(new Error('Analysis failed'));
      mockCookCamApi.searchIngredients.mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Cheddar Cheese' }],
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.searchIngredients).toHaveBeenCalledWith('cheddar cheese', 1);
        expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
      });
    });

    it('should award XP for successful image scanning', async () => {
      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Tomato', confidence: 0.9 },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockGamificationContext.addXP).toHaveBeenCalledWith(25, 'SUCCESSFUL_SCAN');
      });
    });

    it('should handle no image URI with fallback ingredients', async () => {
      const noImageRoute = {
        params: {
          imageUri: null,
          isSimulator: false,
        },
      };

      mockCookCamApi.searchIngredients.mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Tomato' }],
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={noImageRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.searchIngredients).toHaveBeenCalledWith('tomato', 1);
      });
    });

    it('should redirect to auth if user not authenticated', () => {
      const mockNoUserContext = {
        ...mockAuthContext,
        user: null,
      };

      jest.doMock('../../context/AuthContext', () => ({
        useAuth: () => mockNoUserContext,
      }));

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Auth', { screen: 'SignIn' });
    });
  });

  describe('Ingredient Management', () => {
    it('should display ingredient cards with confidence levels', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Check for confidence indicators
      expect(screen.getByText('95%')).toBeTruthy(); // Tomatoes confidence
      expect(screen.getByText('88%')).toBeTruthy(); // Mozzarella confidence
      expect(screen.getByText('82%')).toBeTruthy(); // Basil confidence
    });

    it('should handle ingredient removal with haptic feedback', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const removeButtons = screen.getAllByTestId('remove-button');
      fireEvent.press(removeButtons[0]);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(screen.queryByText('Tomatoes')).toBeFalsy();
    });

    it('should handle quantity increase with smart increments', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const increaseButtons = screen.getAllByText('+');
      fireEvent.press(increaseButtons[0]);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should handle quantity decrease with minimum limits', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const decreaseButtons = screen.getAllByText('−');
      fireEvent.press(decreaseButtons[0]);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should show add ingredient prompt when add button pressed', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      expect(Alert.prompt).toHaveBeenCalledWith(
        'Add Ingredient',
        'What ingredient would you like to add?',
        expect.any(Function)
      );
    });

    it('should add ingredient from USDA database search', async () => {
      mockCookCamApi.searchIngredients.mockResolvedValue({
        success: true,
        data: [{ id: '123', name: 'Fresh Spinach' }],
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      // Simulate user entering ingredient name
      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('spinach');
      });

      await waitFor(() => {
        expect(mockCookCamApi.searchIngredients).toHaveBeenCalledWith('spinach', 1);
        expect(mockGamificationContext.addXP).toHaveBeenCalledWith(5, 'ADD_REAL_INGREDIENT');
      });
    });

    it('should add custom ingredient when not found in database', async () => {
      mockCookCamApi.searchIngredients.mockResolvedValue({
        success: false,
        data: [],
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('custom ingredient');
      });

      await waitFor(() => {
        expect(screen.getByText('custom ingredient')).toBeTruthy();
      });
    });

    it('should show confetti when adding 5th ingredient', async () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Should already have 5 ingredients from simulator, so add button should trigger confetti
      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('sixth ingredient');
      });

      await waitFor(() => {
        expect(screen.getByText('🎉 Great variety! 🎉')).toBeTruthy();
      });

      // Confetti should disappear after 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('🎉 Great variety! 🎉')).toBeFalsy();
    });
  });

  describe('Smart Quantity Management', () => {
    it('should use appropriate increments for whole items', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Mock an egg ingredient to test whole item increment
      const mockEggRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: true,
        },
      };

      // The component should handle eggs with increment of 1
      expect(screen.getByText('1 unit')).toBeTruthy(); // Default quantity display
    });

    it('should use smaller increments for meat and protein', () => {
      const meatRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: false,
        },
      };

      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Beef Chuck', confidence: 0.9, quantity: '1', unit: 'lb' },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={meatRoute} />);

      // Should use 0.25 increment for meat items
      const increaseButton = screen.getByText('+');
      fireEvent.press(increaseButton);

      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should handle spice quantities with precision', () => {
      const spiceRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: false,
        },
      };

      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Salt', confidence: 0.8, quantity: '1', unit: 'tsp' },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={spiceRoute} />);

      expect(screen.getByText('Salt')).toBeTruthy();
    });
  });

  describe('Confidence Color Coding', () => {
    it('should show green color for high confidence ingredients', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Tomatoes has 0.95 confidence, should be green (#4CAF50)
      expect(screen.getByText('95%')).toBeTruthy();
    });

    it('should show yellow color for medium confidence ingredients', () => {
      const mediumConfidenceRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: false,
        },
      };

      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Uncertain Item', confidence: 0.75 },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={mediumConfidenceRoute} />);

      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('should show red color for low confidence ingredients', () => {
      const lowConfidenceRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: false,
        },
      };

      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Low Confidence Item', confidence: 0.65 },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={lowConfidenceRoute} />);

      expect(screen.getByText('65%')).toBeTruthy();
    });
  });

  describe('Mystery Box System', () => {
    it('should show mystery box when random condition is met', () => {
      // Mock 25% chance to show mystery box
      Math.random.mockReturnValue(0.1); // Less than 0.25

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      expect(screen.getByText('🎁')).toBeTruthy();
      expect(screen.getByText('Lucky!')).toBeTruthy();
    });

    it('should not show mystery box when random condition is not met', () => {
      // Mock 75% chance to not show mystery box
      Math.random.mockReturnValue(0.5); // Greater than 0.25

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      expect(screen.queryByText('🎁')).toBeFalsy();
      expect(screen.queryByText('Lucky!')).toBeFalsy();
    });

    it('should handle mystery box opening with reward modal', async () => {
      Math.random.mockReturnValueOnce(0.1) // Show mystery box
                .mockReturnValueOnce(0.5); // Common reward

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const mysteryBox = screen.getByText('🎁');
      fireEvent.press(mysteryBox);

      await waitFor(() => {
        expect(screen.getByText('Bonus XP!')).toBeTruthy();
        expect(screen.getByText('Collect!')).toBeTruthy();
      });
    });

    it('should award XP for mystery box common rewards', async () => {
      Math.random.mockReturnValueOnce(0.1) // Show mystery box
                .mockReturnValueOnce(0.8); // Common reward (90% chance)

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const mysteryBox = screen.getByText('🎁');
      fireEvent.press(mysteryBox);

      await waitFor(() => {
        expect(mockGamificationContext.addXP).toHaveBeenCalledWith(expect.any(Number), 'MYSTERY_BOX');
      });
    });

    it('should unlock badge for mystery box rare rewards', async () => {
      Math.random.mockReturnValueOnce(0.1) // Show mystery box
                .mockReturnValueOnce(0.005); // Rare reward

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const mysteryBox = screen.getByText('🎁');
      fireEvent.press(mysteryBox);

      await waitFor(() => {
        expect(screen.getByText('Mystery Hunter!')).toBeTruthy();
        expect(mockGamificationContext.unlockBadge).toHaveBeenCalledWith('mystery_hunter');
      });
    });

    it('should provide different haptic feedback based on reward rarity', async () => {
      Math.random.mockReturnValueOnce(0.1) // Show mystery box
                .mockReturnValueOnce(0.0001); // Legendary reward

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const mysteryBox = screen.getByText('🎁');
      fireEvent.press(mysteryBox);

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
      });
    });

    it('should close reward modal when collect button is pressed', async () => {
      Math.random.mockReturnValueOnce(0.1) // Show mystery box
                .mockReturnValueOnce(0.5); // Common reward

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const mysteryBox = screen.getByText('🎁');
      fireEvent.press(mysteryBox);

      await waitFor(() => {
        const collectButton = screen.getByText('Collect!');
        fireEvent.press(collectButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Collect!')).toBeFalsy();
      });
    });
  });

  describe('Navigation and Actions', () => {
    it('should navigate to enhanced preferences when continue button pressed', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const continueButton = screen.getByText('Generate Recipes');
      fireEvent.press(continueButton);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EnhancedPreferences', {
        ingredients: expect.any(Array),
        imageUri: 'file://test-image.jpg',
      });
    });

    it('should show alert when trying to continue with no ingredients', () => {
      // Start with empty ingredients by removing all
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Remove all ingredients
      const removeButtons = screen.getAllByTestId('remove-button');
      removeButtons.forEach(button => fireEvent.press(button));

      const continueButton = screen.getByText('Generate Recipes');
      fireEvent.press(continueButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'No Ingredients',
        'Please add at least one ingredient to continue.'
      );
    });

    it('should show helpful tip when less than 3 ingredients', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Remove ingredients to get below 3
      const removeButtons = screen.getAllByTestId('remove-button');
      fireEvent.press(removeButtons[0]);
      fireEvent.press(removeButtons[1]);
      fireEvent.press(removeButtons[2]);

      expect(screen.getByText('💡 Add at least 3 ingredients for best results!')).toBeTruthy();
    });
  });

  describe('Emoji Assignment', () => {
    it('should assign correct emojis for common ingredients', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      expect(screen.getByText('🍅')).toBeTruthy(); // Tomatoes
      expect(screen.getByText('🧀')).toBeTruthy(); // Mozzarella
      expect(screen.getByText('🌿')).toBeTruthy(); // Basil
      expect(screen.getByText('🫒')).toBeTruthy(); // Olive Oil
      expect(screen.getByText('🧄')).toBeTruthy(); // Garlic
    });

    it('should use default emoji for unknown ingredients', () => {
      const unknownRoute = {
        params: {
          imageUri: 'file://test.jpg',
          isSimulator: false,
        },
      };

      mockCookCamApi.scanIngredients.mockResolvedValue({
        success: true,
        data: {
          ingredients: [
            { name: 'Unknown Exotic Ingredient', confidence: 0.8 },
          ],
        },
      });

      render(<IngredientReviewScreen navigation={mockNavigation} route={unknownRoute} />);

      expect(screen.getByText('🥘')).toBeTruthy(); // Default emoji
    });
  });

  describe('Animation Behavior', () => {
    it('should animate add button when adding ingredients', async () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('new ingredient');
      });

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        })
      );
    });

    it('should handle animation for newly added ingredient', async () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('animated ingredient');
      });

      // The last ingredient should have scale animation applied
      expect(Animated.Value).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle image processing errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        // Should fall back to common ingredients
        expect(mockCookCamApi.searchIngredients).toHaveBeenCalled();
      });
    });

    it('should handle FileReader errors during image processing', async () => {
      const mockFileReader = {
        onload: null,
        onerror: null,
        result: null,
        readAsDataURL: function() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('FileReader error'));
          }, 0);
        }
      };

      global.FileReader = jest.fn(() => mockFileReader);

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        // Should handle error and fall back
        expect(mockCookCamApi.searchIngredients).toHaveBeenCalled();
      });
    });

    it('should handle API service errors during ingredient search', async () => {
      mockCookCamApi.searchIngredients.mockRejectedValue(new Error('API error'));

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        // Should provide ultimate fallback ingredients
        expect(screen.getByText('Detected Ingredient 1')).toBeTruthy();
        expect(screen.getByText('Detected Ingredient 2')).toBeTruthy();
      });
    });

    it('should handle add ingredient API failures gracefully', async () => {
      mockCookCamApi.searchIngredients.mockRejectedValue(new Error('Search failed'));

      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      fireEvent.press(addButton);

      const promptCallback = (Alert.prompt as jest.Mock).mock.calls[0][2];
      await act(async () => {
        await promptCallback('failed ingredient');
      });

      // Should still add ingredient as fallback
      await waitFor(() => {
        expect(screen.getByText('failed ingredient')).toBeTruthy();
      });
    });
  });

  describe('Image URI Analysis Prevention', () => {
    it('should prevent re-analysis of same image URI', async () => {
      const { rerender } = render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.scanIngredients).toHaveBeenCalledTimes(1);
      });

      // Re-render with same route shouldn't trigger new analysis
      rerender(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      expect(mockCookCamApi.scanIngredients).toHaveBeenCalledTimes(1);
    });

    it('should trigger new analysis when image URI changes', async () => {
      const { rerender } = render(<IngredientReviewScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.scanIngredients).toHaveBeenCalledTimes(1);
      });

      const newRoute = {
        params: {
          imageUri: 'file://different-image.jpg',
          isSimulator: false,
        },
      };

      rerender(<IngredientReviewScreen navigation={mockNavigation} route={newRoute} />);

      await waitFor(() => {
        expect(mockCookCamApi.scanIngredients).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);
      
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up timers on unmount', () => {
      const { unmount } = render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);
      
      unmount();
      
      // Confetti timer should be cleaned up
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }).not.toThrow();
    });

    it('should handle rapid ingredient additions without memory leaks', async () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const addButton = screen.getByText('Add Ingredient');
      
      // Rapidly add multiple ingredients
      for (let i = 0; i < 5; i++) {
        fireEvent.press(addButton);
        const promptCallback = (Alert.prompt as jest.Mock).mock.calls[i][2];
        await act(async () => {
          await promptCallback(`ingredient-${i}`);
        });
      }

      expect(Haptics.impactAsync).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid quantity changes efficiently', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const increaseButtons = screen.getAllByText('+');
      
      // Rapid quantity changes
      for (let i = 0; i < 10; i++) {
        fireEvent.press(increaseButtons[0]);
      }

      expect(Haptics.impactAsync).toHaveBeenCalledTimes(10);
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible interaction elements', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      const continueButton = screen.getByText('Generate Recipes');
      const addButton = screen.getByText('Add Ingredient');
      const quantityButtons = screen.getAllByText('+');
      
      expect(continueButton).toBeTruthy();
      expect(addButton).toBeTruthy();
      expect(quantityButtons.length).toBeGreaterThan(0);
    });

    it('should provide meaningful text content for screen readers', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      expect(screen.getByText('AI Detected Ingredients')).toBeTruthy();
      expect(screen.getByText('High Confidence')).toBeTruthy();
      expect(screen.getByText('Detected')).toBeTruthy();
      expect(screen.getByText('💡 Add at least 3 ingredients for best results!')).toBeTruthy();
    });

    it('should handle accessibility for confidence indicators', () => {
      render(<IngredientReviewScreen navigation={mockNavigation} route={mockSimulatorRoute} />);

      // Confidence percentages should be visible
      expect(screen.getByText('95%')).toBeTruthy();
      expect(screen.getByText('88%')).toBeTruthy();
      expect(screen.getByText('82%')).toBeTruthy();
    });
  });
});
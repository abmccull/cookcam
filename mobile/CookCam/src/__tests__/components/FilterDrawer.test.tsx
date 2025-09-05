// Set up global mocks
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Mock React Native
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  actualRN.PixelRatio = global.PixelRatio;
  return {
    ...actualRN,
    PixelRatio: global.PixelRatio,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
    },
  };
});

// Mock environment config
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  X: 'X',
  Filter: 'Filter',
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import FilterDrawer from '../../components/FilterDrawer';

describe('FilterDrawer', () => {
  const mockOnClose = jest.fn();
  const mockOnApplyFilters = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onApplyFilters: mockOnApplyFilters,
    initialFilters: {
      dietary: [],
      cuisine: [],
      cookingTime: '',
      difficulty: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(<FilterDrawer {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render when visible', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Filter Recipes')).toBeTruthy();
    });

    it('should render Modal with correct props', () => {
      const { UNSAFE_getByType } = render(<FilterDrawer {...defaultProps} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(true);
      expect(modal.props.animationType).toBe('slide');
      expect(modal.props.presentationStyle).toBe('pageSheet');
    });

    it('should render header elements', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Filter Recipes')).toBeTruthy();
      expect(screen.getByText('Clear All')).toBeTruthy();
      expect(screen.UNSAFE_getByType('X')).toBeTruthy();
    });

    it('should render all dietary options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const dietaryOptions = [
        'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
        'Keto', 'Paleo', 'Low-Carb', 'High-Protein'
      ];
      
      dietaryOptions.forEach(option => {
        expect(screen.getByText(option)).toBeTruthy();
      });
    });

    it('should render all cuisine options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const cuisineOptions = [
        'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean',
        'American', 'French', 'Thai', 'Chinese', 'Japanese'
      ];
      
      cuisineOptions.forEach(option => {
        expect(screen.getByText(option)).toBeTruthy();
      });
    });

    it('should render all cooking time options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const cookingTimeOptions = [
        'Under 15 min', '15-30 min', '30-60 min', 'Over 1 hour'
      ];
      
      cookingTimeOptions.forEach(option => {
        expect(screen.getByText(option)).toBeTruthy();
      });
    });

    it('should render all difficulty options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const difficultyOptions = ['Easy', 'Medium', 'Hard'];
      
      difficultyOptions.forEach(option => {
        expect(screen.getByText(option)).toBeTruthy();
      });
    });

    it('should render section titles', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Dietary Restrictions')).toBeTruthy();
      expect(screen.getByText('Cuisine Type')).toBeTruthy();
      expect(screen.getByText('Cooking Time')).toBeTruthy();
      expect(screen.getByText('Difficulty')).toBeTruthy();
    });

    it('should render apply button with filter icon', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText(/Apply Filters/)).toBeTruthy();
      expect(screen.UNSAFE_getByType('Filter')).toBeTruthy();
    });
  });

  describe('Dietary Filters', () => {
    it('should toggle dietary filter on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getAllByText('Vegetarian')[0];
      fireEvent.press(vegetarianButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: ['Vegetarian'],
        })
      );
    });

    it('should allow multiple dietary selections', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getAllByText('Vegetarian')[0];
      const veganButton = screen.getAllByText('Vegan')[0];
      
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(veganButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: expect.arrayContaining(['Vegetarian', 'Vegan']),
        })
      );
    });

    it('should deselect dietary filter on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getAllByText('Vegetarian')[0];
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(vegetarianButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: [],
        })
      );
    });

    it('should show initial dietary selections', () => {
      const propsWithInitial = {
        ...defaultProps,
        initialFilters: {
          dietary: ['Vegetarian', 'Vegan'],
          cuisine: [],
          cookingTime: '',
          difficulty: '',
        },
      };
      
      render(<FilterDrawer {...propsWithInitial} />);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: ['Vegetarian', 'Vegan'],
        })
      );
    });
  });

  describe('Cuisine Filters', () => {
    it('should toggle cuisine filter on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const italianButton = screen.getAllByText('Italian')[0];
      fireEvent.press(italianButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: ['Italian'],
        })
      );
    });

    it('should allow multiple cuisine selections', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const italianButton = screen.getAllByText('Italian')[0];
      const mexicanButton = screen.getAllByText('Mexican')[0];
      
      fireEvent.press(italianButton.parent);
      fireEvent.press(mexicanButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: expect.arrayContaining(['Italian', 'Mexican']),
        })
      );
    });

    it('should deselect cuisine filter on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const italianButton = screen.getAllByText('Italian')[0];
      fireEvent.press(italianButton.parent);
      fireEvent.press(italianButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: [],
        })
      );
    });
  });

  describe('Cooking Time Filter', () => {
    it('should select cooking time on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const timeButton = screen.getByText('Under 15 min');
      fireEvent.press(timeButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cookingTime: 'Under 15 min',
        })
      );
    });

    it('should only allow one cooking time selection', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const time1 = screen.getByText('Under 15 min');
      const time2 = screen.getByText('15-30 min');
      
      fireEvent.press(time1.parent);
      fireEvent.press(time2.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cookingTime: '15-30 min',
        })
      );
    });

    it('should deselect cooking time on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const timeButton = screen.getByText('Under 15 min');
      fireEvent.press(timeButton.parent);
      fireEvent.press(timeButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cookingTime: '',
        })
      );
    });

    it('should handle initial cooking time', () => {
      const propsWithInitial = {
        ...defaultProps,
        initialFilters: {
          dietary: [],
          cuisine: [],
          cookingTime: '30-60 min',
          difficulty: '',
        },
      };
      
      render(<FilterDrawer {...propsWithInitial} />);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          cookingTime: '30-60 min',
        })
      );
    });
  });

  describe('Difficulty Filter', () => {
    it('should select difficulty on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const easyButton = screen.getAllByText('Easy')[0];
      fireEvent.press(easyButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'Easy',
        })
      );
    });

    it('should only allow one difficulty selection', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const easy = screen.getAllByText('Easy')[0];
      const medium = screen.getAllByText('Medium')[0];
      
      fireEvent.press(easy.parent);
      fireEvent.press(medium.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'Medium',
        })
      );
    });

    it('should deselect difficulty on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const easyButton = screen.getAllByText('Easy')[0];
      fireEvent.press(easyButton.parent);
      fireEvent.press(easyButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: '',
        })
      );
    });
  });

  describe('Clear All Functionality', () => {
    it('should clear all filters when Clear All is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select various filters
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      fireEvent.press(screen.getAllByText('Italian')[0].parent);
      fireEvent.press(screen.getByText('Under 15 min').parent);
      fireEvent.press(screen.getAllByText('Easy')[0].parent);
      
      // Clear all
      const clearButton = screen.getByText('Clear All');
      fireEvent.press(clearButton);
      
      // Apply
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: [],
        cuisine: [],
        cookingTime: '',
        difficulty: '',
      });
    });

    it('should clear filters with initial values', () => {
      const propsWithInitial = {
        ...defaultProps,
        initialFilters: {
          dietary: ['Vegetarian'],
          cuisine: ['Italian'],
          cookingTime: '15-30 min',
          difficulty: 'Medium',
        },
      };
      
      render(<FilterDrawer {...propsWithInitial} />);
      
      const clearButton = screen.getByText('Clear All');
      fireEvent.press(clearButton);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: [],
        cuisine: [],
        cookingTime: '',
        difficulty: '',
      });
    });
  });

  describe('Apply Filters', () => {
    it('should call onApplyFilters and onClose when applied', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show filter count in apply button', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select filters
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      fireEvent.press(screen.getAllByText('Vegan')[0].parent);
      fireEvent.press(screen.getAllByText('Italian')[0].parent);
      fireEvent.press(screen.getByText('Under 15 min').parent);
      fireEvent.press(screen.getAllByText('Easy')[0].parent);
      
      // Should show count (2 dietary + 1 cuisine + 1 time + 1 difficulty = 5)
      expect(screen.getByText(/Apply Filters.*\(5\)/)).toBeTruthy();
    });

    it('should not show count when no filters selected', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const applyText = screen.getByText(/Apply Filters/);
      expect(applyText.props.children).not.toContain('(');
    });

    it('should handle complex filter combinations', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select multiple filters
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      fireEvent.press(screen.getAllByText('Gluten-Free')[0].parent);
      fireEvent.press(screen.getAllByText('Italian')[0].parent);
      fireEvent.press(screen.getAllByText('Asian')[0].parent);
      fireEvent.press(screen.getByText('Under 15 min').parent);
      fireEvent.press(screen.getAllByText('Easy')[0].parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: expect.arrayContaining(['Vegetarian', 'Gluten-Free']),
        cuisine: expect.arrayContaining(['Italian', 'Asian']),
        cookingTime: 'Under 15 min',
        difficulty: 'Easy',
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when X button is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const closeButton = screen.UNSAFE_getByType('X');
      fireEvent.press(closeButton.parent);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not apply filters when closing without apply', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select a filter
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      
      // Close without applying
      const closeButton = screen.UNSAFE_getByType('X');
      fireEvent.press(closeButton.parent);
      
      expect(mockOnApplyFilters).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onRequestClose when modal requests close', () => {
      const { UNSAFE_getByType } = render(<FilterDrawer {...defaultProps} />);
      
      const modal = UNSAFE_getByType('Modal');
      modal.props.onRequestClose();
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should maintain filter state between interactions', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select filters
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      fireEvent.press(screen.getAllByText('Italian')[0].parent);
      
      // Deselect one
      fireEvent.press(screen.getAllByText('Vegetarian')[0].parent);
      
      // Add another
      fireEvent.press(screen.getAllByText('Mexican')[0].parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: [],
          cuisine: expect.arrayContaining(['Italian', 'Mexican']),
        })
      );
    });

    it('should reset to initial filters on mount', () => {
      const initialFilters = {
        dietary: ['Keto'],
        cuisine: ['French'],
        cookingTime: 'Over 1 hour',
        difficulty: 'Hard',
      };
      
      const { rerender } = render(
        <FilterDrawer {...defaultProps} initialFilters={initialFilters} />
      );
      
      // Apply without changes
      let applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(initialFilters);
      
      // Rerender with different initial filters
      const newInitialFilters = {
        dietary: ['Vegan'],
        cuisine: ['Thai'],
        cookingTime: '',
        difficulty: '',
      };
      
      rerender(
        <FilterDrawer {...defaultProps} initialFilters={newInitialFilters} />
      );
      
      applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      // Component maintains state between rerenders, so it should have the previous filters
      expect(mockOnApplyFilters).toHaveBeenLastCalledWith(initialFilters);
    });
  });

  describe('Accessibility', () => {
    it('should have scrollable content', () => {
      const { UNSAFE_getByType } = render(<FilterDrawer {...defaultProps} />);
      
      const scrollView = UNSAFE_getByType('ScrollView');
      expect(scrollView).toBeTruthy();
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);
    });

    it('should have touchable filter chips', () => {
      const { UNSAFE_getAllByType } = render(<FilterDrawer {...defaultProps} />);
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      // Should have many touchable chips plus buttons
      expect(touchables.length).toBeGreaterThan(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty initial filters', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: [],
        cuisine: [],
        cookingTime: '',
        difficulty: '',
      });
    });

    it('should handle undefined callbacks gracefully', () => {
      const propsWithoutCallbacks = {
        visible: true,
        onClose: undefined,
        onApplyFilters: undefined,
        initialFilters: defaultProps.initialFilters,
      };
      
      const { toJSON } = render(<FilterDrawer {...propsWithoutCallbacks} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle rapid filter toggling', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getAllByText('Vegetarian')[0];
      
      // Rapid toggling
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(vegetarianButton.parent);
      fireEvent.press(vegetarianButton.parent);
      
      const applyButton = screen.getByText(/Apply Filters/);
      fireEvent.press(applyButton.parent.parent);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: ['Vegetarian'], // Odd number of presses = selected
        })
      );
    });
  });
});
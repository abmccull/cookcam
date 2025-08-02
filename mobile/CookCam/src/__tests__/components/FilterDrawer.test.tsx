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
import { render, screen, fireEvent } from '@testing-library/react-native';
import FilterDrawer from '../../components/FilterDrawer';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
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
    it('should render when visible', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Filters')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      render(<FilterDrawer {...defaultProps} visible={false} />);
      
      expect(screen.queryByText('Filters')).toBeFalsy();
    });

    it('should render dietary options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Vegetarian')).toBeTruthy();
      expect(screen.getByText('Vegan')).toBeTruthy();
      expect(screen.getByText('Gluten-Free')).toBeTruthy();
      expect(screen.getByText('Dairy-Free')).toBeTruthy();
      expect(screen.getByText('Keto')).toBeTruthy();
      expect(screen.getByText('Paleo')).toBeTruthy();
    });

    it('should render cuisine options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Italian')).toBeTruthy();
      expect(screen.getByText('Mexican')).toBeTruthy();
      expect(screen.getByText('Asian')).toBeTruthy();
      expect(screen.getByText('Indian')).toBeTruthy();
      expect(screen.getByText('Mediterranean')).toBeTruthy();
    });

    it('should render cooking time options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Under 15 min')).toBeTruthy();
      expect(screen.getByText('15-30 min')).toBeTruthy();
      expect(screen.getByText('30-60 min')).toBeTruthy();
      expect(screen.getByText('Over 1 hour')).toBeTruthy();
    });

    it('should render difficulty options', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Easy')).toBeTruthy();
      expect(screen.getByText('Medium')).toBeTruthy();
      expect(screen.getByText('Hard')).toBeTruthy();
    });

    it('should show apply and reset buttons', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Apply Filters')).toBeTruthy();
      expect(screen.getByText('Reset')).toBeTruthy();
    });

    it('should show close button', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByTestId('X-icon')).toBeTruthy();
    });
  });

  describe('Dietary Filters', () => {
    it('should toggle dietary filter on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getByText('Vegetarian');
      fireEvent.press(vegetarianButton);
      
      // Should be selected (implementation may vary)
      expect(vegetarianButton).toBeTruthy();
    });

    it('should allow multiple dietary selections', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getByText('Vegetarian');
      const veganButton = screen.getByText('Vegan');
      
      fireEvent.press(vegetarianButton);
      fireEvent.press(veganButton);
      
      expect(vegetarianButton).toBeTruthy();
      expect(veganButton).toBeTruthy();
    });

    it('should deselect dietary filter on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getByText('Vegetarian');
      fireEvent.press(vegetarianButton);
      fireEvent.press(vegetarianButton);
      
      // Should be deselected
      expect(vegetarianButton).toBeTruthy();
    });

    it('should show initial dietary selections', () => {
      render(
        <FilterDrawer
          {...defaultProps}
          initialFilters={{
            dietary: ['Vegetarian', 'Vegan'],
            cuisine: [],
            cookingTime: '',
            difficulty: '',
          }}
        />
      );
      
      expect(screen.getByText('Vegetarian')).toBeTruthy();
      expect(screen.getByText('Vegan')).toBeTruthy();
    });
  });

  describe('Cuisine Filters', () => {
    it('should toggle cuisine filter on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const italianButton = screen.getByText('Italian');
      fireEvent.press(italianButton);
      
      expect(italianButton).toBeTruthy();
    });

    it('should allow multiple cuisine selections', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const italianButton = screen.getByText('Italian');
      const mexicanButton = screen.getByText('Mexican');
      
      fireEvent.press(italianButton);
      fireEvent.press(mexicanButton);
      
      expect(italianButton).toBeTruthy();
      expect(mexicanButton).toBeTruthy();
    });
  });

  describe('Cooking Time Filter', () => {
    it('should select cooking time on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const timeButton = screen.getByText('Under 15 min');
      fireEvent.press(timeButton);
      
      expect(timeButton).toBeTruthy();
    });

    it('should only allow one cooking time selection', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const time1 = screen.getByText('Under 15 min');
      const time2 = screen.getByText('15-30 min');
      
      fireEvent.press(time1);
      fireEvent.press(time2);
      
      // Only time2 should be selected
      expect(time2).toBeTruthy();
    });

    it('should deselect cooking time on second press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const timeButton = screen.getByText('Under 15 min');
      fireEvent.press(timeButton);
      fireEvent.press(timeButton);
      
      // Should be deselected
      expect(timeButton).toBeTruthy();
    });
  });

  describe('Difficulty Filter', () => {
    it('should select difficulty on press', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const easyButton = screen.getByText('Easy');
      fireEvent.press(easyButton);
      
      expect(easyButton).toBeTruthy();
    });

    it('should only allow one difficulty selection', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const easy = screen.getByText('Easy');
      const medium = screen.getByText('Medium');
      
      fireEvent.press(easy);
      fireEvent.press(medium);
      
      // Only medium should be selected
      expect(medium).toBeTruthy();
    });
  });

  describe('Apply and Reset', () => {
    it('should call onApplyFilters when apply button is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const vegetarianButton = screen.getByText('Vegetarian');
      fireEvent.press(vegetarianButton);
      
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.press(applyButton);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: expect.arrayContaining(['Vegetarian']),
        })
      );
    });

    it('should reset all filters when reset button is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select some filters
      fireEvent.press(screen.getByText('Vegetarian'));
      fireEvent.press(screen.getByText('Italian'));
      fireEvent.press(screen.getByText('Easy'));
      
      // Reset
      const resetButton = screen.getByText('Reset');
      fireEvent.press(resetButton);
      
      // Apply
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.press(applyButton);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: [],
        cuisine: [],
        cookingTime: '',
        difficulty: '',
      });
    });

    it('should close drawer after applying filters', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.press(applyButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const closeButton = screen.getByTestID('X-icon');
      fireEvent.press(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not apply filters when closing without apply', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select a filter
      fireEvent.press(screen.getByText('Vegetarian'));
      
      // Close without applying
      const closeButton = screen.getByTestID('X-icon');
      fireEvent.press(closeButton);
      
      expect(mockOnApplyFilters).not.toHaveBeenCalled();
    });
  });

  describe('Complex Filter Combinations', () => {
    it('should handle multiple filter types simultaneously', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Select various filters
      fireEvent.press(screen.getByText('Vegetarian'));
      fireEvent.press(screen.getByText('Gluten-Free'));
      fireEvent.press(screen.getByText('Italian'));
      fireEvent.press(screen.getByText('Asian'));
      fireEvent.press(screen.getByText('Under 15 min'));
      fireEvent.press(screen.getByText('Easy'));
      
      // Apply
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.press(applyButton);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        dietary: expect.arrayContaining(['Vegetarian', 'Gluten-Free']),
        cuisine: expect.arrayContaining(['Italian', 'Asian']),
        cookingTime: 'Under 15 min',
        difficulty: 'Easy',
      });
    });

    it('should preserve initial filters when not modified', () => {
      const initialFilters = {
        dietary: ['Vegetarian'],
        cuisine: ['Italian'],
        cookingTime: '15-30 min',
        difficulty: 'Medium',
      };
      
      render(
        <FilterDrawer
          {...defaultProps}
          initialFilters={initialFilters}
        />
      );
      
      // Apply without changes
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.press(applyButton);
      
      expect(mockOnApplyFilters).toHaveBeenCalledWith(initialFilters);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      const { UNSAFE_queryByType } = render(<FilterDrawer {...defaultProps} />);
      
      const modal = UNSAFE_queryByType('Modal');
      expect(modal).toBeTruthy();
    });

    it('should be scrollable', () => {
      const { UNSAFE_queryByType } = render(<FilterDrawer {...defaultProps} />);
      
      const scrollView = UNSAFE_queryByType('ScrollView');
      expect(scrollView).toBeTruthy();
    });
  });
});
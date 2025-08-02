// Set up mocks before imports
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

// Mock responsive utilities  
jest.mock('../../utils/responsive', () => ({
  scale: (size) => size,
  verticalScale: (size) => size,
  moderateScale: (size) => size,
  responsive: {
    fontSize: {
      tiny: 10,
      small: 12,
      regular: 14,
      large: 16,
    },
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
    },
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  Zap: 'Zap',
  Activity: 'Activity',
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NutritionBadge from '../../components/NutritionBadge';

describe('NutritionBadge', () => {
  const mockNutrition = {
    calories: 250,
    protein_g: 15,
    carbs_g: 30,
    fat_g: 10,
    fiber_g: 5,
    sodium_mg: 500,
  };

  const lowCalorieNutrition = {
    calories: 150,
    protein_g: 8,
    carbs_g: 20,
    fat_g: 5,
  };

  const highCalorieNutrition = {
    calories: 450,
    protein_g: 25,
    carbs_g: 50,
    fat_g: 20,
  };

  const highProteinNutrition = {
    calories: 300,
    protein_g: 30,
    carbs_g: 25,
    fat_g: 12,
  };

  describe('Full Variant', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(<NutritionBadge nutrition={mockNutrition} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render nutrition facts title', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('Nutrition Facts')).toBeTruthy();
      expect(screen.getByText('Per serving')).toBeTruthy();
    });

    it('should display calories', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('250')).toBeTruthy();
      expect(screen.getByText('calories')).toBeTruthy();
    });

    it('should display macronutrients', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('protein')).toBeTruthy();
      expect(screen.getByText('15g')).toBeTruthy();
      
      expect(screen.getByText('carbs')).toBeTruthy();
      expect(screen.getByText('30g')).toBeTruthy();
      
      expect(screen.getByText('fat')).toBeTruthy();
      expect(screen.getByText('10g')).toBeTruthy();
    });

    it('should display optional nutrients when provided', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('Fiber: 5g')).toBeTruthy();
      expect(screen.getByText('Sodium: 500mg')).toBeTruthy();
    });

    it('should not display optional nutrients when not provided', () => {
      const nutritionWithoutOptional = {
        calories: 250,
        protein_g: 15,
        carbs_g: 30,
        fat_g: 10,
      };
      
      render(<NutritionBadge nutrition={nutritionWithoutOptional} />);
      
      expect(screen.queryByText(/Fiber:/)).toBeFalsy();
      expect(screen.queryByText(/Sodium:/)).toBeFalsy();
    });

    it('should display icons in full mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="full" />);
      
      // Zap icon for calories
      expect(screen.UNSAFE_getAllByType('Zap')).toHaveLength(1);
      // Activity icon for protein
      expect(screen.UNSAFE_getAllByType('Activity')).toHaveLength(1);
    });
  });

  describe('Compact Variant', () => {
    it('should render correctly in compact mode', () => {
      const { toJSON } = render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render compact badges', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      // Should have two badges
      expect(screen.UNSAFE_getAllByType('View').length).toBeGreaterThan(1);
    });

    it('should display calories in compact mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      expect(screen.getByText('250')).toBeTruthy();
    });

    it('should display protein in compact mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      expect(screen.getByText('15g')).toBeTruthy();
    });

    it('should not display full nutrition facts in compact mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      expect(screen.queryByText('Nutrition Facts')).toBeFalsy();
      expect(screen.queryByText('carbs')).toBeFalsy();
      expect(screen.queryByText('fat')).toBeFalsy();
      expect(screen.queryByText('Per serving')).toBeFalsy();
    });

    it('should display icons in compact mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      // Zap icon for calories
      expect(screen.UNSAFE_getAllByType('Zap')).toHaveLength(1);
      // Activity icon for protein
      expect(screen.UNSAFE_getAllByType('Activity')).toHaveLength(1);
    });
  });

  describe('Servings Calculation', () => {
    it('should calculate per serving for 2 servings', () => {
      render(<NutritionBadge nutrition={mockNutrition} servings={2} />);
      
      expect(screen.getByText('125')).toBeTruthy(); // 250/2
      expect(screen.getByText('8g')).toBeTruthy(); // 15/2 rounded
    });

    it('should calculate per serving for 4 servings', () => {
      render(<NutritionBadge nutrition={mockNutrition} servings={4} />);
      
      expect(screen.getByText('63')).toBeTruthy(); // 250/4 rounded
      expect(screen.getByText('4g')).toBeTruthy(); // 15/4 rounded
    });

    it('should default to 1 serving when not specified', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('250')).toBeTruthy();
      expect(screen.getByText('15g')).toBeTruthy();
    });

    it('should round values correctly', () => {
      const nutrition = {
        calories: 333,
        protein_g: 17,
        carbs_g: 41,
        fat_g: 13,
      };
      
      render(<NutritionBadge nutrition={nutrition} servings={2} />);
      
      expect(screen.getByText('167')).toBeTruthy(); // 333/2 rounded
      expect(screen.getByText('9g')).toBeTruthy(); // 17/2 rounded
    });
  });

  describe('Calorie Level Classification', () => {
    it('should classify low calories (< 200)', () => {
      const { getByText } = render(<NutritionBadge nutrition={lowCalorieNutrition} variant="compact" />);
      
      // Low calorie should use green color (#4CAF50)
      const calorieText = getByText('150');
      expect(calorieText).toBeTruthy();
    });

    it('should classify moderate calories (200-400)', () => {
      const { getByText } = render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      // Moderate calorie should use orange color (#FF9800)
      const calorieText = getByText('250');
      expect(calorieText).toBeTruthy();
    });

    it('should classify high calories (> 400)', () => {
      const { getByText } = render(<NutritionBadge nutrition={highCalorieNutrition} variant="compact" />);
      
      // High calorie should use red color (#F44336)
      const calorieText = getByText('450');
      expect(calorieText).toBeTruthy();
    });
  });

  describe('Protein Level Classification', () => {
    it('should classify low protein (< 10g)', () => {
      render(<NutritionBadge nutrition={lowCalorieNutrition} variant="compact" />);
      
      expect(screen.getByText('8g')).toBeTruthy();
    });

    it('should classify moderate protein (10-20g)', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      expect(screen.getByText('15g')).toBeTruthy();
    });

    it('should classify high protein (>= 20g)', () => {
      render(<NutritionBadge nutrition={highProteinNutrition} variant="compact" />);
      
      expect(screen.getByText('30g')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const zeroNutrition = {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      };
      
      render(<NutritionBadge nutrition={zeroNutrition} />);
      
      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getAllByText('0g')).toHaveLength(3); // protein, carbs, fat
    });

    it('should handle very large values', () => {
      const largeNutrition = {
        calories: 9999,
        protein_g: 999,
        carbs_g: 999,
        fat_g: 999,
      };
      
      render(<NutritionBadge nutrition={largeNutrition} />);
      
      expect(screen.getByText('9999')).toBeTruthy();
      expect(screen.getAllByText('999g')).toHaveLength(3);
    });

    it('should handle decimal values with rounding', () => {
      const decimalNutrition = {
        calories: 255.7,
        protein_g: 15.4,
        carbs_g: 30.8,
        fat_g: 10.2,
      };
      
      render(<NutritionBadge nutrition={decimalNutrition} />);
      
      // Values should be rounded
      expect(screen.getByText('256')).toBeTruthy();
      expect(screen.getByText('15g')).toBeTruthy();
      expect(screen.getByText('31g')).toBeTruthy();
      expect(screen.getByText('10g')).toBeTruthy();
    });

    it('should handle negative values', () => {
      const negativeNutrition = {
        calories: -100,
        protein_g: -5,
        carbs_g: -10,
        fat_g: -3,
      };
      
      render(<NutritionBadge nutrition={negativeNutrition} />);
      
      // Should still render, even with negative values
      expect(screen.getByText('-100')).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('should have display name for debugging', () => {
      expect(NutritionBadge.displayName).toBe('NutritionBadge');
    });

    it('should memoize nutrition calculations', () => {
      const { rerender } = render(<NutritionBadge nutrition={mockNutrition} servings={2} />);
      
      // Initial render
      expect(screen.getByText('125')).toBeTruthy();
      
      // Re-render with same props
      rerender(<NutritionBadge nutrition={mockNutrition} servings={2} />);
      
      // Should still show same values
      expect(screen.getByText('125')).toBeTruthy();
    });

    it('should recalculate when servings change', () => {
      const { rerender } = render(<NutritionBadge nutrition={mockNutrition} servings={2} />);
      
      expect(screen.getByText('125')).toBeTruthy();
      
      rerender(<NutritionBadge nutrition={mockNutrition} servings={4} />);
      
      expect(screen.getByText('63')).toBeTruthy();
    });

    it('should recalculate when nutrition changes', () => {
      const { rerender } = render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('250')).toBeTruthy();
      
      rerender(<NutritionBadge nutrition={highCalorieNutrition} />);
      
      expect(screen.getByText('450')).toBeTruthy();
    });

    it('should maintain variant when re-rendering', () => {
      const { rerender } = render(<NutritionBadge nutrition={mockNutrition} variant="compact" />);
      
      expect(screen.queryByText('Nutrition Facts')).toBeFalsy();
      
      rerender(<NutritionBadge nutrition={mockNutrition} variant="full" />);
      
      expect(screen.getByText('Nutrition Facts')).toBeTruthy();
    });
  });

  describe('Display Text', () => {
    it('should use lowercase labels in full mode', () => {
      render(<NutritionBadge nutrition={mockNutrition} variant="full" />);
      
      expect(screen.getByText('calories')).toBeTruthy();
      expect(screen.getByText('protein')).toBeTruthy();
      expect(screen.getByText('carbs')).toBeTruthy();
      expect(screen.getByText('fat')).toBeTruthy();
    });

    it('should format additional nutrients correctly', () => {
      render(<NutritionBadge nutrition={mockNutrition} />);
      
      expect(screen.getByText('Fiber: 5g')).toBeTruthy();
      expect(screen.getByText('Sodium: 500mg')).toBeTruthy();
    });

    it('should not show additional nutrients section when both are missing', () => {
      const nutritionWithoutOptional = {
        calories: 250,
        protein_g: 15,
        carbs_g: 30,
        fat_g: 10,
      };
      
      render(<NutritionBadge nutrition={nutritionWithoutOptional} />);
      
      // Should not have the additional nutrients section at all
      expect(screen.queryByText(/Fiber:/)).toBeFalsy();
      expect(screen.queryByText(/Sodium:/)).toBeFalsy();
    });

    it('should show only fiber when sodium is missing', () => {
      const nutritionWithFiber = {
        calories: 250,
        protein_g: 15,
        carbs_g: 30,
        fat_g: 10,
        fiber_g: 8,
      };
      
      render(<NutritionBadge nutrition={nutritionWithFiber} />);
      
      expect(screen.getByText('Fiber: 8g')).toBeTruthy();
      expect(screen.queryByText(/Sodium:/)).toBeFalsy();
    });

    it('should show only sodium when fiber is missing', () => {
      const nutritionWithSodium = {
        calories: 250,
        protein_g: 15,
        carbs_g: 30,
        fat_g: 10,
        sodium_mg: 750,
      };
      
      render(<NutritionBadge nutrition={nutritionWithSodium} />);
      
      expect(screen.getByText('Sodium: 750mg')).toBeTruthy();
      expect(screen.queryByText(/Fiber:/)).toBeFalsy();
    });
  });
});
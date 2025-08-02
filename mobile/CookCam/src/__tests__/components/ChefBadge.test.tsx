import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChefBadge from '../../components/ChefBadge';

// Mock react-native first
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
  },
  Platform: {
    OS: 'ios',
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  ChefHat: ({ size, color, strokeWidth, ...props }: any) => (
    <div testID="chef-hat-icon" data-size={size} data-color={color} data-stroke-width={strokeWidth} {...props} />
  ),
  Crown: ({ size, color, strokeWidth, ...props }: any) => (
    <div testID="crown-icon" data-size={size} data-color={color} data-stroke-width={strokeWidth} {...props} />
  ),
  Star: ({ size, color, fill, style, ...props }: any) => (
    <div testID="star-icon" data-size={size} data-color={color} data-fill={fill} {...props} />
  ),
  Flame: ({ size, color, style, ...props }: any) => (
    <div testID="flame-icon" data-size={size} data-color={color} {...props} />
  ),
}));

// Mock responsive utilities
jest.mock('../../utils/responsive', () => ({
  scale: (value: number) => value,
  moderateScale: (value: number) => value,
  responsive: {
    fontSize: {
      tiny: 10,
      small: 12,
      regular: 14,
    },
  },
}));

describe('ChefBadge', () => {
  describe('Tier Configurations', () => {
    it('should render Sous Chef (tier 1) correctly', () => {
      render(<ChefBadge tier={1} showLabel={true} />);
      
      expect(screen.getByText('Sous Chef')).toBeTruthy();
      expect(screen.getByTestId('chef-hat-icon')).toBeTruthy();
      
      // Should have 1 star
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(1);
    });

    it('should render Pastry Chef (tier 2) correctly', () => {
      render(<ChefBadge tier={2} showLabel={true} />);
      
      expect(screen.getByText('Pastry Chef')).toBeTruthy();
      expect(screen.getByTestId('chef-hat-icon')).toBeTruthy();
      
      // Should have 2 stars
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(2);
    });

    it('should render Head Chef (tier 3) correctly', () => {
      render(<ChefBadge tier={3} showLabel={true} />);
      
      expect(screen.getByText('Head Chef')).toBeTruthy();
      expect(screen.getByTestId('chef-hat-icon')).toBeTruthy();
      
      // Should have 3 stars
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(3);
    });

    it('should render Executive Chef (tier 4) correctly', () => {
      render(<ChefBadge tier={4} showLabel={true} />);
      
      expect(screen.getByText('Executive Chef')).toBeTruthy();
      expect(screen.getByTestId('crown-icon')).toBeTruthy();
      
      // Should have sparkle effects (2 additional stars) + 3 tier stars = 5 total
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5);
    });

    it('should render Master Chef (tier 5) correctly', () => {
      render(<ChefBadge tier={5} showLabel={true} />);
      
      expect(screen.getByText('Master Chef')).toBeTruthy();
      expect(screen.getByTestId('crown-icon')).toBeTruthy();
      expect(screen.getByTestId('flame-icon')).toBeTruthy();
      
      // Should have sparkle effects (2) + 3 tier stars + flame = 6 total star elements (flame is separate)
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5); // 2 sparkles + 3 tier stars
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      const { getByTestId } = render(<ChefBadge tier={1} size="small" />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-size']).toBe(16); // moderateScale(16)
    });

    it('should render medium size correctly (default)', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-size']).toBe(24); // moderateScale(24)
    });

    it('should render large size correctly', () => {
      const { getByTestId } = render(<ChefBadge tier={1} size="large" />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-size']).toBe(32); // moderateScale(32)
    });
  });

  describe('Label Display', () => {
    it('should show label when showLabel is true', () => {
      render(<ChefBadge tier={1} showLabel={true} />);
      
      expect(screen.getByText('Sous Chef')).toBeTruthy();
    });

    it('should hide label when showLabel is false (default)', () => {
      render(<ChefBadge tier={1} />);
      
      expect(screen.queryByText('Sous Chef')).toBeFalsy();
    });

    it('should hide label when showLabel is explicitly false', () => {
      render(<ChefBadge tier={1} showLabel={false} />);
      
      expect(screen.queryByText('Sous Chef')).toBeFalsy();
    });
  });

  describe('Icon Selection', () => {
    it('should use ChefHat icon for tiers 1-3', () => {
      render(<ChefBadge tier={1} />);
      expect(screen.getByTestId('chef-hat-icon')).toBeTruthy();
      expect(screen.queryByTestId('crown-icon')).toBeFalsy();
    });

    it('should use Crown icon for tiers 4-5', () => {
      render(<ChefBadge tier={4} />);
      expect(screen.getByTestId('crown-icon')).toBeTruthy();
      expect(screen.queryByTestId('chef-hat-icon')).toBeFalsy();
    });
  });

  describe('Special Effects', () => {
    it('should not show sparkle effects for tier 3 and below', () => {
      render(<ChefBadge tier={3} />);
      
      // Only tier stars should be present (3 stars)
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(3);
    });

    it('should show sparkle effects for tier 4 and above', () => {
      render(<ChefBadge tier={4} />);
      
      // Should have 2 sparkle stars + 3 tier stars
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5);
    });

    it('should show flame effect only for tier 5', () => {
      render(<ChefBadge tier={4} />);
      expect(screen.queryByTestId('flame-icon')).toBeFalsy();
      
      render(<ChefBadge tier={5} />);
      expect(screen.getByTestId('flame-icon')).toBeTruthy();
    });
  });

  describe('Color Schemes', () => {
    it('should apply correct colors for tier 1', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-color']).toBe('#4CAF50');
    });

    it('should apply correct colors for tier 5', () => {
      const { getByTestId } = render(<ChefBadge tier={5} />);
      
      const crownIcon = getByTestId('crown-icon');
      expect(crownIcon.props['data-color']).toBe('#FFB800');
    });
  });

  describe('Star Limitation', () => {
    it('should limit tier stars to maximum of 3', () => {
      render(<ChefBadge tier={5} />);
      
      // Even though tier 5 should have 5 stars according to config,
      // the component limits to 3 via Math.min(currentTier.stars, 3)
      // Plus 2 sparkle stars = 5 total
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5); // 2 sparkles + 3 tier stars (limited)
    });
  });

  describe('Default Props', () => {
    it('should use medium size by default', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-size']).toBe(24); // medium size
    });

    it('should not show label by default', () => {
      render(<ChefBadge tier={1} />);
      
      expect(screen.queryByText('Sous Chef')).toBeFalsy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all tier values correctly', () => {
      const tiers: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
      const expectedTitles = ['Sous Chef', 'Pastry Chef', 'Head Chef', 'Executive Chef', 'Master Chef'];
      
      tiers.forEach((tier, index) => {
        const { unmount } = render(<ChefBadge tier={tier} showLabel={true} />);
        expect(screen.getByText(expectedTitles[index])).toBeTruthy();
        unmount();
      });
    });

    it('should handle all size values correctly', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      const expectedIconSizes = [16, 24, 32]; // moderateScale values
      
      sizes.forEach((size, index) => {
        const { getByTestId, unmount } = render(<ChefBadge tier={1} size={size} />);
        const chefHatIcon = getByTestId('chef-hat-icon');
        expect(chefHatIcon.props['data-size']).toBe(expectedIconSizes[index]);
        unmount();
      });
    });
  });

  describe('Icon Properties', () => {
    it('should set strokeWidth for main icons', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-stroke-width']).toBe(2.5);
    });

    it('should fill tier stars with color', () => {
      const { getAllByTestId } = render(<ChefBadge tier={1} />);
      
      const stars = getAllByTestId('star-icon');
      // At least one star should be filled with the tier color
      expect(stars[0].props['data-fill']).toBe('#4CAF50');
    });
  });
});
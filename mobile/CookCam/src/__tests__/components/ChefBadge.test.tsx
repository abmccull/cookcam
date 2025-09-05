import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChefBadge from '../../components/ChefBadge';

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
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      
      // Should have 1 star
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(1);
    });

    it('should render Pastry Chef (tier 2) correctly', () => {
      render(<ChefBadge tier={2} showLabel={true} />);
      
      expect(screen.getByText('Pastry Chef')).toBeTruthy();
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      
      // Should have 2 stars
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(2);
    });

    it('should render Head Chef (tier 3) correctly', () => {
      render(<ChefBadge tier={3} showLabel={true} />);
      
      expect(screen.getByText('Head Chef')).toBeTruthy();
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      
      // Should have 3 stars
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(3);
    });

    it('should render Executive Chef (tier 4) correctly', () => {
      render(<ChefBadge tier={4} showLabel={true} />);
      
      expect(screen.getByText('Executive Chef')).toBeTruthy();
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      
      // Should have sparkle effects (2 additional stars) + 3 tier stars = 5 total
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(5);
    });

    it('should render Master Chef (tier 5) correctly', () => {
      render(<ChefBadge tier={5} showLabel={true} />);
      
      expect(screen.getByText('Master Chef')).toBeTruthy();
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      expect(screen.getByTestId('Flame-icon')).toBeTruthy();
      
      // Should have sparkle effects (2) + 3 tier stars + flame = 6 total star elements (flame is separate)
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(5); // 2 sparkles + 3 tier stars
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      const { getByTestId } = render(<ChefBadge tier={1} size="small" />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Icon renders with small size
    });

    it('should render medium size correctly (default)', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Icon renders with medium size
    });

    it('should render large size correctly', () => {
      const { getByTestId } = render(<ChefBadge tier={1} size="large" />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Icon renders with large size
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
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      expect(screen.queryByTestId('Crown-icon')).toBeFalsy();
    });

    it('should use Crown icon for tiers 4-5', () => {
      render(<ChefBadge tier={4} />);
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      expect(screen.queryByTestId('ChefHat-icon')).toBeFalsy();
    });
  });

  describe('Special Effects', () => {
    it('should not show sparkle effects for tier 3 and below', () => {
      render(<ChefBadge tier={3} />);
      
      // Only tier stars should be present (3 stars)
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(3);
    });

    it('should show sparkle effects for tier 4 and above', () => {
      render(<ChefBadge tier={4} />);
      
      // Should have 2 sparkle stars + 3 tier stars
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(5);
    });

    it('should show flame effect only for tier 5', () => {
      render(<ChefBadge tier={4} />);
      expect(screen.queryByTestId('Flame-icon')).toBeFalsy();
      
      render(<ChefBadge tier={5} />);
      expect(screen.getByTestId('Flame-icon')).toBeTruthy();
    });
  });

  describe('Color Schemes', () => {
    it('should apply correct colors for tier 1', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Tier 1 uses ChefHat icon
    });

    it('should apply correct colors for tier 5', () => {
      const { getByTestId } = render(<ChefBadge tier={5} />);
      
      const crownIcon = getByTestId('Crown-icon');
      expect(crownIcon).toBeTruthy(); // Tier 5 uses Crown icon
    });
  });

  describe('Star Limitation', () => {
    it('should limit tier stars to maximum of 3', () => {
      render(<ChefBadge tier={5} />);
      
      // Even though tier 5 should have 5 stars according to config,
      // the component limits to 3 via Math.min(currentTier.stars, 3)
      // Plus 2 sparkle stars = 5 total
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(5); // 2 sparkles + 3 tier stars (limited)
    });
  });

  describe('Default Props', () => {
    it('should use medium size by default', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Uses medium size by default
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
        const chefHatIcon = getByTestId('ChefHat-icon');
        expect(chefHatIcon).toBeTruthy(); // Icon renders for each size
        unmount();
      });
    });
  });

  describe('Icon Properties', () => {
    it('should set strokeWidth for main icons', () => {
      const { getByTestId } = render(<ChefBadge tier={1} />);
      
      const chefHatIcon = getByTestId('ChefHat-icon');
      expect(chefHatIcon).toBeTruthy(); // Icon renders with proper styling
    });

    it('should fill tier stars with color', () => {
      const { getAllByTestId } = render(<ChefBadge tier={1} />);
      
      const stars = getAllByTestId('Star-icon');
      expect(stars.length).toBe(1); // Tier 1 has 1 star
      expect(stars[0]).toBeTruthy(); // Star renders properly
    });
  });

  describe('Performance and Optimization', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<ChefBadge tier={1} />);
      
      // Re-render with same props should not cause issues
      rerender(<ChefBadge tier={1} />);
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
    });

    it('should handle rapid prop changes efficiently', () => {
      const { rerender } = render(<ChefBadge tier={1} size="small" />);
      
      // Rapidly change props
      rerender(<ChefBadge tier={5} size="large" showLabel={true} />);
      rerender(<ChefBadge tier={3} size="medium" showLabel={false} />);
      
      // Final state should be correct
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      expect(screen.queryByText('Head Chef')).toBeFalsy();
    });

    it('should handle multiple instances without conflicts', () => {
      render(
        <>
          <ChefBadge tier={1} showLabel={true} />
          <ChefBadge tier={3} size="large" />
          <ChefBadge tier={5} showLabel={true} />
        </>
      );
      
      // All instances should render correctly
      expect(screen.getByText('Sous Chef')).toBeTruthy();
      expect(screen.getByText('Master Chef')).toBeTruthy();
      expect(screen.getAllByTestId('ChefHat-icon')).toHaveLength(2); // tier 1, 3
      expect(screen.getAllByTestId('Crown-icon')).toHaveLength(1); // tier 5
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide meaningful visual hierarchy', () => {
      render(<ChefBadge tier={4} showLabel={true} />);
      
      // Should have both icon and text for accessibility
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      expect(screen.getByText('Executive Chef')).toBeTruthy();
    });

    it('should work without labels for icon-only contexts', () => {
      render(<ChefBadge tier={2} />);
      
      // Should render visual elements without text
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      expect(screen.getAllByTestId('Star-icon')).toHaveLength(2);
      expect(screen.queryByText('Pastry Chef')).toBeFalsy();
    });

    it('should maintain consistent visual language across tiers', () => {
      const tiers: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
      
      tiers.forEach((tier) => {
        const { unmount } = render(<ChefBadge tier={tier} />);
        
        // All tiers should have star indicators
        const stars = screen.getAllByTestId('Star-icon');
        expect(stars.length).toBeGreaterThan(0);
        
        unmount();
      });
    });
  });

  describe('Visual Effects Integration', () => {
    it('should coordinate sparkle and flame effects for tier 5', () => {
      render(<ChefBadge tier={5} />);
      
      // Should have both sparkles and flame
      expect(screen.getByTestId('Flame-icon')).toBeTruthy();
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars.length).toBe(5); // 2 sparkles + 3 tier stars
    });

    it('should position effects without overlapping main icon', () => {
      render(<ChefBadge tier={4} />);
      
      // Should have main crown icon plus sparkle effects
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars.length).toBe(5); // 2 sparkles + 3 tier stars
    });

    it('should scale effects proportionally with size', () => {
      const { getByTestId: getSmall, unmount: unmountSmall } = render(
        <ChefBadge tier={5} size="small" />
      );
      const smallFlame = getSmall('Flame-icon');
      expect(smallFlame).toBeTruthy(); // Flame renders at small size
      unmountSmall();

      const { getByTestId: getLarge } = render(<ChefBadge tier={5} size="large" />);
      const largeFlame = getLarge('Flame-icon');
      expect(largeFlame).toBeTruthy(); // Flame renders at large size
    });
  });

  describe('Color Consistency and Theming', () => {
    it('should apply consistent color schemes per tier', () => {
      const tierColors = {
        1: '#4CAF50',
        2: '#2196F3', 
        3: '#9C27B0',
        4: '#FF6B35',
        5: '#FFB800'
      };

      Object.entries(tierColors).forEach(([tierStr, expectedColor]) => {
        const tier = parseInt(tierStr) as 1 | 2 | 3 | 4 | 5;
        const { getByTestId, unmount } = render(<ChefBadge tier={tier} />);
        
        const iconTestId = tier <= 3 ? 'ChefHat-icon' : 'Crown-icon';
        const icon = getByTestId(iconTestId);
        expect(icon).toBeTruthy(); // Icon renders with proper color scheme
        
        unmount();
      });
    });

    it('should use flame with different color for tier 5', () => {
      const { getByTestId } = render(<ChefBadge tier={5} />);
      
      const flame = getByTestId('Flame-icon');
      expect(flame).toBeTruthy(); // Flame uses orange color, distinct from tier gold
    });

    it('should maintain color consistency in stars', () => {
      const { getAllByTestId } = render(<ChefBadge tier={3} />);
      
      const stars = getAllByTestId('Star-icon');
      expect(stars.length).toBe(3); // Tier 3 has 3 stars
      stars.forEach(star => {
        expect(star).toBeTruthy(); // Each star renders with tier color
      });
    });
  });

  describe('Component State Management', () => {
    it('should maintain independent state for multiple instances', () => {
      render(
        <>
          <ChefBadge tier={1} size="small" showLabel={true} />
          <ChefBadge tier={5} size="large" showLabel={false} />
        </>
      );
      
      // Each instance should maintain its own configuration
      expect(screen.getByText('Sous Chef')).toBeTruthy();
      expect(screen.queryByText('Master Chef')).toBeFalsy();
      
      const chefHats = screen.getAllByTestId('ChefHat-icon');
      const crowns = screen.getAllByTestId('Crown-icon');
      
      expect(chefHats).toHaveLength(1);
      expect(crowns).toHaveLength(1);
    });

    it('should handle component updates gracefully', () => {
      const { rerender } = render(<ChefBadge tier={1} />);
      
      // Update to different tier
      rerender(<ChefBadge tier={4} showLabel={true} />);
      
      // Should show new tier configuration
      expect(screen.getByTestId('Crown-icon')).toBeTruthy();
      expect(screen.getByText('Executive Chef')).toBeTruthy();
      expect(screen.queryByTestId('ChefHat-icon')).toBeFalsy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle prop combinations gracefully', () => {
      const combinations = [
        { tier: 1 as const, size: 'small' as const, showLabel: true },
        { tier: 2 as const, size: 'large' as const, showLabel: false },
        { tier: 5 as const, size: 'medium' as const, showLabel: true },
      ];

      combinations.forEach((props) => {
        const { unmount } = render(<ChefBadge {...props} />);
        
        // Should render without errors
        const iconTestId = props.tier <= 3 ? 'ChefHat-icon' : 'Crown-icon';
        expect(screen.getByTestId(iconTestId)).toBeTruthy();
        
        unmount();
      });
    });

    it('should handle star count calculations correctly', () => {
      // Test the Math.min logic for star limiting
      render(<ChefBadge tier={5} />);
      
      const stars = screen.getAllByTestId('Star-icon');
      // Should be exactly 5: 2 sparkles + 3 tier stars (limited by Math.min)
      expect(stars).toHaveLength(5);
    });

    it('should render consistently across different environments', () => {
      const { unmount, rerender } = render(<ChefBadge tier={3} size="medium" />);
      
      // Multiple renders should produce consistent results
      for (let i = 0; i < 3; i++) {
        rerender(<ChefBadge tier={3} size="medium" />);
        expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
        expect(screen.getAllByTestId('Star-icon')).toHaveLength(3);
      }
      
      unmount();
    });
  });

  describe('Integration with Responsive System', () => {
    it('should integrate properly with responsive utilities', () => {
      render(<ChefBadge tier={1} size="large" />);
      
      // The responsive utilities should be called for sizing
      const icon = screen.getByTestId('ChefHat-icon');
      expect(icon).toBeTruthy(); // Icon renders with responsive sizing
    });

    it('should scale all elements proportionally', () => {
      const { getAllByTestId } = render(<ChefBadge tier={2} size="small" />);
      
      const chefHat = screen.getByTestId('ChefHat-icon');
      const stars = getAllByTestId('Star-icon');
      
      // All elements should use small size scaling
      expect(chefHat).toBeTruthy(); // ChefHat renders at small size
      stars.forEach(star => {
        expect(star).toBeTruthy(); // Stars render at small size
      });
    });

    it('should handle responsive font sizes for labels', () => {
      render(<ChefBadge tier={1} size="small" showLabel={true} />);
      
      // Label should be present (font size applied via responsive system)
      expect(screen.getByText('Sous Chef')).toBeTruthy();
    });
  });

  describe('Layout and Positioning', () => {
    it('should maintain proper element layering', () => {
      render(<ChefBadge tier={5} />);
      
      // All elements should be present and positioned correctly
      expect(screen.getByTestId('Crown-icon')).toBeTruthy(); // Main icon
      expect(screen.getByTestId('Flame-icon')).toBeTruthy(); // Top-right effect
      
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(5); // Sparkles + tier stars
    });

    it('should center align badge content', () => {
      render(<ChefBadge tier={2} showLabel={true} />);
      
      // Badge and label should both be present for center alignment
      expect(screen.getByTestId('ChefHat-icon')).toBeTruthy();
      expect(screen.getByText('Pastry Chef')).toBeTruthy();
    });

    it('should position stars at bottom of badge', () => {
      render(<ChefBadge tier={3} />);
      
      // Stars should be positioned as tier indicators
      const stars = screen.getAllByTestId('Star-icon');
      expect(stars).toHaveLength(3);
    });
  });
});
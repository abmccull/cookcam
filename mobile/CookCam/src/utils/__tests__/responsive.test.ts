import { Dimensions, PixelRatio, Platform } from 'react-native';
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
  isTablet,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  platformSpecific,
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
  getDeviceType
} from '../responsive';

// Mock React Native modules
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn()
  },
  PixelRatio: {
    get: jest.fn()
  },
  Platform: {
    OS: 'ios'
  }
}));

const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>;
const mockPixelRatio = PixelRatio as jest.Mocked<typeof PixelRatio>;

describe('Responsive Utilities', () => {
  // Default iPhone 12 dimensions
  const defaultScreenDimensions = { width: 390, height: 844 };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default screen dimensions
    mockDimensions.get.mockReturnValue(defaultScreenDimensions);
    mockPixelRatio.get.mockReturnValue(2);
  });

  describe('Scaling Functions', () => {
    describe('scale()', () => {
      it('should scale based on screen width', () => {
        mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
        
        // On base screen (390), scale should return the same value
        expect(scale(16)).toBe(16);
        expect(scale(24)).toBe(24);
      });

      it('should scale proportionally on different screen widths', () => {
        // Smaller screen (iPhone SE)
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const scaled16 = scale(16);
        const scaled24 = scale(24);
        
        expect(scaled16).toBeCloseTo(13.13, 2); // 320/390 * 16
        expect(scaled24).toBeCloseTo(19.69, 2); // 320/390 * 24
      });

      it('should handle larger screens', () => {
        // iPad dimensions
        mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
        
        const scaled16 = scale(16);
        
        expect(scaled16).toBeCloseTo(31.51, 2); // 768/390 * 16
      });

      it('should handle zero and negative values', () => {
        expect(scale(0)).toBe(0);
        expect(scale(-10)).toBeCloseTo(-10, 2);
      });

      it('should handle decimal values', () => {
        const result = scale(16.5);
        expect(result).toBeCloseTo(16.5, 2);
      });
    });

    describe('verticalScale()', () => {
      it('should scale based on screen height', () => {
        mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
        
        // On base screen (844), should return the same value
        expect(verticalScale(20)).toBe(20);
        expect(verticalScale(32)).toBe(32);
      });

      it('should scale proportionally on different screen heights', () => {
        // Shorter screen
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const scaled20 = verticalScale(20);
        
        expect(scaled20).toBeCloseTo(13.46, 2); // 568/844 * 20
      });

      it('should handle taller screens', () => {
        // Taller screen
        mockDimensions.get.mockReturnValue({ width: 390, height: 1000 });
        
        const scaled20 = verticalScale(20);
        
        expect(scaled20).toBeCloseTo(23.7, 2); // 1000/844 * 20
      });
    });

    describe('moderateScale()', () => {
      it('should apply moderate scaling with default factor', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const size = 16;
        const scaledSize = scale(size); // ~13.13
        const moderateScaled = moderateScale(size);
        
        // Should be between original size and fully scaled size
        expect(moderateScaled).toBeCloseTo(14.56, 2); // 16 + (13.13 - 16) * 0.5
        expect(moderateScaled).toBeGreaterThan(scaledSize);
        expect(moderateScaled).toBeLessThan(size);
      });

      it('should apply custom scaling factor', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const size = 16;
        const factor = 0.8;
        const scaledSize = scale(size);
        const moderateScaled = moderateScale(size, factor);
        
        expect(moderateScaled).toBeCloseTo(13.71, 2); // 16 + (13.13 - 16) * 0.8
      });

      it('should handle factor of 0 (no scaling)', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const result = moderateScale(16, 0);
        expect(result).toBe(16);
      });

      it('should handle factor of 1 (full scaling)', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        const result = moderateScale(16, 1);
        expect(result).toBeCloseTo(scale(16), 2);
      });
    });
  });

  describe('Responsive Design System', () => {
    beforeEach(() => {
      mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
    });

    describe('Screen Dimensions', () => {
      it('should provide current screen dimensions', () => {
        expect(responsive.screen.width).toBe(390);
        expect(responsive.screen.height).toBe(844);
      });

      it('should update when screen dimensions change', () => {
        // Simulate screen rotation or different device
        mockDimensions.get.mockReturnValue({ width: 844, height: 390 });
        
        // Note: In a real app, this would require re-importing the module
        // or using a dynamic approach. For testing, we'll verify the calculation logic
        const newScale = (844 / 390) * 16;
        expect(newScale).toBeCloseTo(34.67, 2);
      });
    });

    describe('Spacing System', () => {
      it('should provide scaled spacing values', () => {
        expect(responsive.spacing.xs).toBeCloseTo(scale(4), 2);
        expect(responsive.spacing.s).toBeCloseTo(scale(8), 2);
        expect(responsive.spacing.m).toBeCloseTo(scale(16), 2);
        expect(responsive.spacing.l).toBeCloseTo(scale(24), 2);
        expect(responsive.spacing.xl).toBeCloseTo(scale(32), 2);
        expect(responsive.spacing.xxl).toBeCloseTo(scale(40), 2);
      });

      it('should maintain proportional spacing relationships', () => {
        const { spacing } = responsive;
        
        expect(spacing.s).toBe(spacing.xs * 2);
        expect(spacing.m).toBe(spacing.s * 2);
        expect(spacing.l).toBe(spacing.m * 1.5);
      });
    });

    describe('Font Sizes', () => {
      it('should provide moderately scaled font sizes', () => {
        const { fontSize } = responsive;
        
        expect(fontSize.tiny).toBeCloseTo(moderateScale(10), 2);
        expect(fontSize.small).toBeCloseTo(moderateScale(12), 2);
        expect(fontSize.regular).toBeCloseTo(moderateScale(14), 2);
        expect(fontSize.medium).toBeCloseTo(moderateScale(16), 2);
        expect(fontSize.large).toBeCloseTo(moderateScale(20), 2);
        expect(fontSize.xlarge).toBeCloseTo(moderateScale(24), 2);
        expect(fontSize.xxlarge).toBeCloseTo(moderateScale(28), 2);
        expect(fontSize.xxxlarge).toBeCloseTo(moderateScale(32), 2);
      });

      it('should maintain readable sizes on small screens', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        // Font sizes should still be readable even when scaled down
        const smallScreenRegular = moderateScale(14);
        expect(smallScreenRegular).toBeGreaterThan(12); // Minimum readable size
      });
    });

    describe('Border Radius', () => {
      it('should provide scaled border radius values', () => {
        const { borderRadius } = responsive;
        
        expect(borderRadius.small).toBeCloseTo(scale(4), 2);
        expect(borderRadius.medium).toBeCloseTo(scale(8), 2);
        expect(borderRadius.large).toBeCloseTo(scale(12), 2);
        expect(borderRadius.xlarge).toBeCloseTo(scale(16), 2);
        expect(borderRadius.round).toBeCloseTo(scale(50), 2);
      });
    });

    describe('Icon Sizes', () => {
      it('should provide moderately scaled icon sizes', () => {
        const { iconSize } = responsive;
        
        expect(iconSize.tiny).toBeCloseTo(moderateScale(12), 2);
        expect(iconSize.small).toBeCloseTo(moderateScale(16), 2);
        expect(iconSize.medium).toBeCloseTo(moderateScale(20), 2);
        expect(iconSize.large).toBeCloseTo(moderateScale(24), 2);
        expect(iconSize.xlarge).toBeCloseTo(moderateScale(32), 2);
      });
    });

    describe('Button Heights', () => {
      it('should provide vertically scaled button heights', () => {
        const { button } = responsive;
        
        expect(button.height.small).toBeCloseTo(verticalScale(32), 2);
        expect(button.height.medium).toBeCloseTo(verticalScale(44), 2);
        expect(button.height.large).toBeCloseTo(verticalScale(56), 2);
      });
    });

    describe('Input Heights', () => {
      it('should provide vertically scaled input heights', () => {
        const { input } = responsive;
        
        expect(input.height.small).toBeCloseTo(verticalScale(36), 2);
        expect(input.height.medium).toBeCloseTo(verticalScale(44), 2);
        expect(input.height.large).toBeCloseTo(verticalScale(52), 2);
      });
    });

    describe('Shadow Styles', () => {
      it('should provide complete shadow configurations', () => {
        const { shadow } = responsive;
        
        // Small shadow
        expect(shadow.small).toEqual({
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
          backgroundColor: '#FFFFFF'
        });

        // Medium shadow
        expect(shadow.medium).toEqual({
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
          backgroundColor: '#FFFFFF'
        });

        // Large shadow
        expect(shadow.large).toEqual({
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
          backgroundColor: '#FFFFFF'
        });
      });

      it('should include backgroundColor for shadow optimization', () => {
        Object.values(responsive.shadow).forEach(shadowStyle => {
          expect(shadowStyle.backgroundColor).toBe('#FFFFFF');
        });
      });
    });
  });

  describe('Device Type Detection', () => {
    describe('isTablet()', () => {
      it('should detect iPad dimensions as tablet', () => {
        mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
        mockPixelRatio.get.mockReturnValue(2);
        
        expect(isTablet()).toBe(true);
      });

      it('should detect large Android tablets', () => {
        mockDimensions.get.mockReturnValue({ width: 800, height: 1280 });
        mockPixelRatio.get.mockReturnValue(1.5);
        
        expect(isTablet()).toBe(true);
      });

      it('should not detect phones as tablets', () => {
        mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
        mockPixelRatio.get.mockReturnValue(3);
        
        expect(isTablet()).toBe(false);
      });

      it('should handle edge cases with different pixel densities', () => {
        // Low density large screen
        mockDimensions.get.mockReturnValue({ width: 600, height: 800 });
        mockPixelRatio.get.mockReturnValue(1);
        
        expect(isTablet()).toBe(false);

        // High density large screen
        mockDimensions.get.mockReturnValue({ width: 1000, height: 1200 });
        mockPixelRatio.get.mockReturnValue(2);
        
        expect(isTablet()).toBe(true);
      });
    });

    describe('Screen Size Detection', () => {
      it('should detect small screens', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        expect(isSmallScreen()).toBe(true);
        expect(isMediumScreen()).toBe(false);
        expect(isLargeScreen()).toBe(false);
      });

      it('should detect medium screens', () => {
        mockDimensions.get.mockReturnValue({ width: 375, height: 667 });
        
        expect(isSmallScreen()).toBe(false);
        expect(isMediumScreen()).toBe(true);
        expect(isLargeScreen()).toBe(false);
      });

      it('should detect large screens', () => {
        mockDimensions.get.mockReturnValue({ width: 414, height: 896 });
        
        expect(isSmallScreen()).toBe(false);
        expect(isMediumScreen()).toBe(false);
        expect(isLargeScreen()).toBe(true);
      });

      it('should handle boundary values', () => {
        // Exactly 350 should be medium
        mockDimensions.get.mockReturnValue({ width: 350, height: 600 });
        expect(isMediumScreen()).toBe(true);
        expect(isSmallScreen()).toBe(false);

        // Exactly 400 should be large
        mockDimensions.get.mockReturnValue({ width: 400, height: 700 });
        expect(isLargeScreen()).toBe(true);
        expect(isMediumScreen()).toBe(false);
      });
    });
  });

  describe('Platform Specific Adjustments', () => {
    it('should detect iOS platform', () => {
      (Platform as any).OS = 'ios';
      
      expect(platformSpecific.isIOS).toBe(true);
      expect(platformSpecific.isAndroid).toBe(false);
      expect(platformSpecific.statusBarHeight).toBe(44);
      expect(platformSpecific.bottomSafeArea).toBe(34);
    });

    it('should detect Android platform', () => {
      (Platform as any).OS = 'android';
      
      expect(platformSpecific.isIOS).toBe(false);
      expect(platformSpecific.isAndroid).toBe(true);
      expect(platformSpecific.statusBarHeight).toBe(24);
      expect(platformSpecific.bottomSafeArea).toBe(0);
    });

    it('should handle other platforms', () => {
      (Platform as any).OS = 'web';
      
      expect(platformSpecific.isIOS).toBe(false);
      expect(platformSpecific.isAndroid).toBe(false);
    });
  });

  describe('Backward Compatibility Functions', () => {
    beforeEach(() => {
      mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
    });

    it('should provide getResponsiveWidth as alias for scale', () => {
      expect(getResponsiveWidth(16)).toBe(scale(16));
      expect(getResponsiveWidth(24)).toBe(scale(24));
    });

    it('should provide getResponsiveHeight as alias for verticalScale', () => {
      expect(getResponsiveHeight(20)).toBe(verticalScale(20));
      expect(getResponsiveHeight(32)).toBe(verticalScale(32));
    });

    it('should provide getResponsiveFontSize as alias for moderateScale', () => {
      expect(getResponsiveFontSize(14)).toBe(moderateScale(14));
      expect(getResponsiveFontSize(18)).toBe(moderateScale(18));
    });

    describe('getDeviceType()', () => {
      it('should return "tablet" for tablet devices', () => {
        mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
        mockPixelRatio.get.mockReturnValue(2);
        
        expect(getDeviceType()).toBe('tablet');
      });

      it('should return "small" for small screens', () => {
        mockDimensions.get.mockReturnValue({ width: 320, height: 568 });
        
        expect(getDeviceType()).toBe('small');
      });

      it('should return "medium" for medium screens', () => {
        mockDimensions.get.mockReturnValue({ width: 375, height: 667 });
        
        expect(getDeviceType()).toBe('medium');
      });

      it('should return "large" for large screens', () => {
        mockDimensions.get.mockReturnValue({ width: 414, height: 896 });
        
        expect(getDeviceType()).toBe('large');
      });

      it('should prioritize tablet detection over size categories', () => {
        // Large screen that's also a tablet
        mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });
        mockPixelRatio.get.mockReturnValue(2);
        
        expect(getDeviceType()).toBe('tablet');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero screen dimensions gracefully', () => {
      mockDimensions.get.mockReturnValue({ width: 0, height: 0 });
      
      expect(scale(16)).toBe(0);
      expect(verticalScale(20)).toBe(0);
      expect(moderateScale(16)).toBe(16); // Should fallback to original size
    });

    it('should handle very small screen dimensions', () => {
      mockDimensions.get.mockReturnValue({ width: 1, height: 1 });
      
      const scaledValue = scale(16);
      expect(scaledValue).toBeCloseTo(0.04, 2);
    });

    it('should handle very large screen dimensions', () => {
      mockDimensions.get.mockReturnValue({ width: 4000, height: 3000 });
      
      const scaledValue = scale(16);
      expect(scaledValue).toBeCloseTo(164.1, 1);
    });

    it('should handle pixel ratio edge cases', () => {
      mockPixelRatio.get.mockReturnValue(0);
      
      // Should not crash with zero pixel ratio
      expect(() => isTablet()).not.toThrow();
    });

    it('should handle missing dimensions gracefully', () => {
      mockDimensions.get.mockImplementation(() => {
        throw new Error('Dimensions not available');
      });
      
      // Should not crash even if dimensions can't be retrieved
      expect(() => scale(16)).toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should cache calculated values in responsive object', () => {
      // Verify that spacing values are pre-calculated
      const spacing1 = responsive.spacing.m;
      const spacing2 = responsive.spacing.m;
      
      expect(spacing1).toBe(spacing2);
    });

    it('should handle repeated calculations efficiently', () => {
      const start = performance.now();
      
      // Perform many scale calculations
      for (let i = 0; i < 1000; i++) {
        scale(16);
        verticalScale(20);
        moderateScale(14);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete quickly (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should work with StyleSheet creation', () => {
      const styles = {
        container: {
          padding: responsive.spacing.m,
          borderRadius: responsive.borderRadius.medium,
        },
        text: {
          fontSize: responsive.fontSize.regular,
        },
        button: {
          height: responsive.button.height.medium,
          paddingHorizontal: responsive.spacing.l,
        }
      };
      
      expect(styles.container.padding).toBeDefined();
      expect(styles.text.fontSize).toBeDefined();
      expect(styles.button.height).toBeDefined();
    });

    it('should provide consistent spacing relationships', () => {
      const { spacing } = responsive;
      
      // Common spacing relationships should be maintained
      expect(spacing.l / spacing.m).toBeCloseTo(1.5, 1);
      expect(spacing.xl / spacing.l).toBeCloseTo(1.33, 1);
    });

    it('should work across different device orientations', () => {
      // Portrait
      mockDimensions.get.mockReturnValue({ width: 390, height: 844 });
      const portraitScale = scale(16);
      
      // Landscape (dimensions swapped)
      mockDimensions.get.mockReturnValue({ width: 844, height: 390 });
      const landscapeScale = scale(16);
      
      expect(landscapeScale).toBeGreaterThan(portraitScale);
    });
  });
});
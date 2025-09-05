import { Dimensions } from 'react-native';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  wp,
  hp,
  isSmallDevice,
  isTablet,
  getOrientation,
  scale,
  verticalScale,
  moderateScale,
} from '../../utils/responsive';

// Mock react-native Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('responsive utilities', () => {
  const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>;

  beforeEach(() => {
    // Default to iPhone 12 dimensions
    mockDimensions.get.mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
  });

  describe('responsiveWidth', () => {
    it('should calculate responsive width', () => {
      const width = responsiveWidth(50); // 50% of screen width
      expect(width).toBe(195); // 50% of 390
    });

    it('should handle 100% width', () => {
      const width = responsiveWidth(100);
      expect(width).toBe(390);
    });

    it('should handle 0% width', () => {
      const width = responsiveWidth(0);
      expect(width).toBe(0);
    });

    it('should handle decimal percentages', () => {
      const width = responsiveWidth(33.33);
      expect(width).toBeCloseTo(129.987, 2);
    });
  });

  describe('responsiveHeight', () => {
    it('should calculate responsive height', () => {
      const height = responsiveHeight(50); // 50% of screen height
      expect(height).toBe(422); // 50% of 844
    });

    it('should handle 100% height', () => {
      const height = responsiveHeight(100);
      expect(height).toBe(844);
    });

    it('should handle 0% height', () => {
      const height = responsiveHeight(0);
      expect(height).toBe(0);
    });
  });

  describe('responsiveFontSize', () => {
    it('should calculate responsive font size', () => {
      const fontSize = responsiveFontSize(4); // 4% of screen width
      expect(fontSize).toBe(15.6); // 4% of 390
    });

    it('should handle small font sizes', () => {
      const fontSize = responsiveFontSize(2);
      expect(fontSize).toBe(7.8);
    });

    it('should handle large font sizes', () => {
      const fontSize = responsiveFontSize(10);
      expect(fontSize).toBe(39);
    });
  });

  describe('wp and hp shortcuts', () => {
    it('wp should return width percentage', () => {
      expect(wp(50)).toBe(195);
      expect(wp(25)).toBe(97.5);
    });

    it('hp should return height percentage', () => {
      expect(hp(50)).toBe(422);
      expect(hp(25)).toBe(211);
    });
  });

  describe('isSmallDevice', () => {
    it('should return true for small devices', () => {
      mockDimensions.get.mockReturnValue({
        width: 320,
        height: 568,
        scale: 2,
        fontScale: 1,
      });
      expect(isSmallDevice()).toBe(true);
    });

    it('should return false for normal devices', () => {
      mockDimensions.get.mockReturnValue({
        width: 390,
        height: 844,
        scale: 3,
        fontScale: 1,
      });
      expect(isSmallDevice()).toBe(false);
    });

    it('should return false for large devices', () => {
      mockDimensions.get.mockReturnValue({
        width: 428,
        height: 926,
        scale: 3,
        fontScale: 1,
      });
      expect(isSmallDevice()).toBe(false);
    });
  });

  describe('isTablet', () => {
    it('should return true for iPad dimensions', () => {
      mockDimensions.get.mockReturnValue({
        width: 768,
        height: 1024,
        scale: 2,
        fontScale: 1,
      });
      expect(isTablet()).toBe(true);
    });

    it('should return true for iPad Pro dimensions', () => {
      mockDimensions.get.mockReturnValue({
        width: 1024,
        height: 1366,
        scale: 2,
        fontScale: 1,
      });
      expect(isTablet()).toBe(true);
    });

    it('should return false for phone dimensions', () => {
      mockDimensions.get.mockReturnValue({
        width: 390,
        height: 844,
        scale: 3,
        fontScale: 1,
      });
      expect(isTablet()).toBe(false);
    });
  });

  describe('getOrientation', () => {
    it('should return portrait for tall screens', () => {
      mockDimensions.get.mockReturnValue({
        width: 390,
        height: 844,
        scale: 3,
        fontScale: 1,
      });
      expect(getOrientation()).toBe('portrait');
    });

    it('should return landscape for wide screens', () => {
      mockDimensions.get.mockReturnValue({
        width: 844,
        height: 390,
        scale: 3,
        fontScale: 1,
      });
      expect(getOrientation()).toBe('landscape');
    });

    it('should return portrait for square screens', () => {
      mockDimensions.get.mockReturnValue({
        width: 500,
        height: 500,
        scale: 2,
        fontScale: 1,
      });
      expect(getOrientation()).toBe('portrait');
    });
  });

  describe('scale functions', () => {
    describe('scale', () => {
      it('should scale based on device width', () => {
        // iPhone 12 (390px width)
        mockDimensions.get.mockReturnValue({
          width: 390,
          height: 844,
          scale: 3,
          fontScale: 1,
        });
        expect(scale(10)).toBeCloseTo(10.4, 1); // 390/375 * 10

        // iPhone SE (320px width)
        mockDimensions.get.mockReturnValue({
          width: 320,
          height: 568,
          scale: 2,
          fontScale: 1,
        });
        expect(scale(10)).toBeCloseTo(8.53, 1); // 320/375 * 10
      });
    });

    describe('verticalScale', () => {
      it('should scale based on device height', () => {
        // iPhone 12 (844px height)
        mockDimensions.get.mockReturnValue({
          width: 390,
          height: 844,
          scale: 3,
          fontScale: 1,
        });
        expect(verticalScale(10)).toBeCloseTo(12.6, 1); // 844/667 * 10

        // iPhone SE (568px height)
        mockDimensions.get.mockReturnValue({
          width: 320,
          height: 568,
          scale: 2,
          fontScale: 1,
        });
        expect(verticalScale(10)).toBeCloseTo(8.52, 1); // 568/667 * 10
      });
    });

    describe('moderateScale', () => {
      it('should apply moderate scaling', () => {
        mockDimensions.get.mockReturnValue({
          width: 390,
          height: 844,
          scale: 3,
          fontScale: 1,
        });
        // Default factor of 0.5
        expect(moderateScale(10)).toBeCloseTo(10.2, 1);
      });

      it('should handle custom factor', () => {
        mockDimensions.get.mockReturnValue({
          width: 390,
          height: 844,
          scale: 3,
          fontScale: 1,
        });
        // Factor of 0 = no scaling
        expect(moderateScale(10, 0)).toBe(10);
        // Factor of 1 = full scaling
        expect(moderateScale(10, 1)).toBeCloseTo(10.4, 1);
      });

      it('should scale differently on small devices', () => {
        mockDimensions.get.mockReturnValue({
          width: 320,
          height: 568,
          scale: 2,
          fontScale: 1,
        });
        expect(moderateScale(10)).toBeCloseTo(9.27, 1);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle negative values', () => {
      expect(responsiveWidth(-10)).toBe(-39);
      expect(responsiveHeight(-10)).toBe(-84.4);
      expect(scale(-10)).toBeCloseTo(-10.4, 1);
    });

    it('should handle very large percentages', () => {
      expect(responsiveWidth(200)).toBe(780);
      expect(responsiveHeight(200)).toBe(1688);
    });

    it('should handle fractional values', () => {
      expect(responsiveWidth(0.5)).toBe(1.95);
      expect(responsiveFontSize(0.1)).toBe(0.39);
    });
  });

  describe('different device sizes', () => {
    it('should work with iPhone 14 Pro Max', () => {
      mockDimensions.get.mockReturnValue({
        width: 430,
        height: 932,
        scale: 3,
        fontScale: 1,
      });
      expect(responsiveWidth(50)).toBe(215);
      expect(isSmallDevice()).toBe(false);
      expect(isTablet()).toBe(false);
    });

    it('should work with iPhone SE (1st gen)', () => {
      mockDimensions.get.mockReturnValue({
        width: 320,
        height: 568,
        scale: 2,
        fontScale: 1,
      });
      expect(responsiveWidth(50)).toBe(160);
      expect(isSmallDevice()).toBe(true);
      expect(isTablet()).toBe(false);
    });

    it('should work with iPad Mini', () => {
      mockDimensions.get.mockReturnValue({
        width: 768,
        height: 1024,
        scale: 2,
        fontScale: 1,
      });
      expect(responsiveWidth(50)).toBe(384);
      expect(isSmallDevice()).toBe(false);
      expect(isTablet()).toBe(true);
    });

    it('should work with iPad Pro 12.9"', () => {
      mockDimensions.get.mockReturnValue({
        width: 1024,
        height: 1366,
        scale: 2,
        fontScale: 1,
      });
      expect(responsiveWidth(50)).toBe(512);
      expect(isSmallDevice()).toBe(false);
      expect(isTablet()).toBe(true);
    });
  });
});
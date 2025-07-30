import { Dimensions } from 'react-native';
import { 
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
  isTablet,
  getDeviceType
} from '../../utils/responsive';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(),
  },
}));

const mockDimensions = Dimensions.get as jest.MockedFunction<typeof Dimensions.get>;

describe('responsive utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResponsiveWidth', () => {
    it('should calculate responsive width for phone', () => {
      mockDimensions.mockReturnValue({ width: 375, height: 812 });
      
      const result = getResponsiveWidth(50);
      expect(result).toBe(187.5); // 50% of 375
    });

    it('should calculate responsive width for tablet', () => {
      mockDimensions.mockReturnValue({ width: 768, height: 1024 });
      
      const result = getResponsiveWidth(50);
      expect(result).toBe(384); // 50% of 768
    });
  });

  describe('getResponsiveHeight', () => {
    it('should calculate responsive height', () => {
      mockDimensions.mockReturnValue({ width: 375, height: 812 });
      
      const result = getResponsiveHeight(10);
      expect(result).toBe(81.2); // 10% of 812
    });
  });

  describe('getResponsiveFontSize', () => {
    it('should scale font size for different screen sizes', () => {
      mockDimensions.mockReturnValue({ width: 375, height: 812 });
      
      const result = getResponsiveFontSize(16);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should have different font sizes for different screen widths', () => {
      // Test with small screen
      mockDimensions.mockReturnValue({ width: 320, height: 568 });
      const smallScreenSize = getResponsiveFontSize(16);

      // Test with large screen
      mockDimensions.mockReturnValue({ width: 414, height: 896 });
      const largeScreenSize = getResponsiveFontSize(16);

      expect(largeScreenSize).toBeGreaterThan(smallScreenSize);
    });
  });

  describe('isTablet', () => {
    it('should return false for phone dimensions', () => {
      mockDimensions.mockReturnValue({ width: 375, height: 812 });
      
      const result = isTablet();
      expect(result).toBe(false);
    });

    it('should return true for tablet dimensions', () => {
      mockDimensions.mockReturnValue({ width: 768, height: 1024 });
      
      const result = isTablet();
      expect(result).toBe(true);
    });

    it('should handle landscape orientation', () => {
      mockDimensions.mockReturnValue({ width: 1024, height: 768 });
      
      const result = isTablet();
      expect(result).toBe(true);
    });
  });

  describe('getDeviceType', () => {
    it('should return "phone" for phone dimensions', () => {
      mockDimensions.mockReturnValue({ width: 375, height: 812 });
      
      const result = getDeviceType();
      expect(result).toBe('phone');
    });

    it('should return "tablet" for tablet dimensions', () => {
      mockDimensions.mockReturnValue({ width: 768, height: 1024 });
      
      const result = getDeviceType();
      expect(result).toBe('tablet');
    });

    it('should handle edge cases', () => {
      // Test with very small screen
      mockDimensions.mockReturnValue({ width: 240, height: 320 });
      const smallResult = getDeviceType();
      expect(['phone', 'tablet']).toContain(smallResult);

      // Test with very large screen
      mockDimensions.mockReturnValue({ width: 1200, height: 1600 });
      const largeResult = getDeviceType();
      expect(['phone', 'tablet']).toContain(largeResult);
    });
  });
});
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

// Helper to create a proper ScaledSize mock
const createScaledSizeMock = (width: number, height: number) => ({
  width,
  height,
  scale: 1,
  fontScale: 1,
});

describe('responsive utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResponsiveWidth', () => {
    it('should calculate responsive width for phone', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(375, 812));
      
      const result = getResponsiveWidth(50);
      expect(result).toBe(187.5); // 50% of 375
    });

    it('should calculate responsive width for tablet', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(768, 1024));
      
      const result = getResponsiveWidth(50);
      expect(result).toBe(384); // 50% of 768
    });
  });

  describe('getResponsiveHeight', () => {
    it('should calculate responsive height', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(375, 812));
      
      const result = getResponsiveHeight(10);
      expect(result).toBe(81.2); // 10% of 812
    });
  });

  describe('getResponsiveFontSize', () => {
    it('should scale font size for different screen sizes', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(375, 812));
      
      const result = getResponsiveFontSize(16);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should have different font sizes for different screen widths', () => {
      // Test with small screen
      mockDimensions.mockReturnValue(createScaledSizeMock(320, 568));
      const smallScreenSize = getResponsiveFontSize(16);

      // Test with large screen
      mockDimensions.mockReturnValue(createScaledSizeMock(414, 896));
      const largeScreenSize = getResponsiveFontSize(16);

      expect(largeScreenSize).toBeGreaterThan(smallScreenSize);
    });
  });

  describe('isTablet', () => {
    it('should return false for phone dimensions', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(375, 812));
      
      const result = isTablet();
      expect(result).toBe(false);
    });

    it('should return true for tablet dimensions', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(768, 1024));
      
      const result = isTablet();
      expect(result).toBe(true);
    });

    it('should handle landscape orientation', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(1024, 768));
      
      const result = isTablet();
      expect(result).toBe(true);
    });
  });

  describe('getDeviceType', () => {
    it('should return "medium" for phone dimensions', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(375, 812));
      
      const result = getDeviceType();
      expect(result).toBe('medium');
    });

    it('should return "tablet" for tablet dimensions', () => {
      mockDimensions.mockReturnValue(createScaledSizeMock(768, 1024));
      
      const result = getDeviceType();
      expect(result).toBe('tablet');
    });

    it('should handle edge cases', () => {
      // Test with very small screen
      mockDimensions.mockReturnValue(createScaledSizeMock(240, 320));
      const smallResult = getDeviceType();
      expect(['small', 'medium', 'large', 'tablet']).toContain(smallResult);

      // Test with very large screen
      mockDimensions.mockReturnValue(createScaledSizeMock(1200, 1600));
      const largeResult = getDeviceType();
      expect(['small', 'medium', 'large', 'tablet']).toContain(largeResult);
    });
  });
});
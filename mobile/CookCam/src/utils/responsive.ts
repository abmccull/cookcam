import {Dimensions, Platform} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Base dimensions (iPhone X)
const baseWidth = 375;
const baseHeight = 812;

// Scaling functions
export const scale = (size: number): number => (screenWidth / baseWidth) * size;
export const verticalScale = (size: number): number => (screenHeight / baseHeight) * size;
export const moderateScale = (size: number, factor = 0.5): number => 
  size + (scale(size) - size) * factor;

// Device type helpers
export const isSmallDevice = screenHeight < 700;
export const isLargeDevice = screenHeight > 850;
export const isTablet = screenWidth > 600;

// Common responsive values
export const responsive = {
  // Font sizes
  fontSize: {
    tiny: moderateScale(10),
    small: moderateScale(12),
    regular: moderateScale(14),
    medium: moderateScale(16),
    large: moderateScale(18),
    xlarge: moderateScale(24),
    xxlarge: moderateScale(28),
    huge: moderateScale(32),
  },
  
  // Spacing
  spacing: {
    xs: scale(4),
    s: scale(8),
    m: scale(16),
    l: scale(24),
    xl: scale(32),
    xxl: scale(48),
  },
  
  // Border radius
  borderRadius: {
    small: moderateScale(8),
    medium: moderateScale(12),
    large: moderateScale(16),
    xlarge: moderateScale(20),
    round: moderateScale(100),
  },
  
  // Common component sizes
  button: {
    height: verticalScale(48),
    largeHeight: verticalScale(56),
    smallHeight: verticalScale(40),
  },
  
  // Safe area padding
  safeArea: {
    top: Platform.OS === 'ios' ? verticalScale(44) : verticalScale(24),
    bottom: Platform.OS === 'ios' ? verticalScale(34) : verticalScale(16),
  },
};

// Responsive breakpoints
export const breakpoints = {
  small: 320,
  medium: 375,
  large: 414,
  xlarge: 768,
};

// Get responsive value based on screen size
export const getResponsiveValue = <T>(values: {small?: T; medium?: T; large?: T; default: T}): T => {
  if (isSmallDevice && values.small !== undefined) return values.small;
  if (isLargeDevice && values.large !== undefined) return values.large;
  if (values.medium !== undefined) return values.medium;
  return values.default;
}; 
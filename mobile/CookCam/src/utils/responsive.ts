import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Guideline sizes are based on standard iPhone 12 dimensions
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

// Scaling functions
export const scale = (size: number): number =>
  (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size: number): number =>
  (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5): number =>
  size + (scale(size) - size) * factor;

// Responsive design system
export const responsive = {
  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // Spacing system
  spacing: {
    xs: scale(4),
    s: scale(8),
    m: scale(16),
    l: scale(24),
    xl: scale(32),
    xxl: scale(40),
  },

  // Font sizes
  fontSize: {
    tiny: moderateScale(10),
    small: moderateScale(12),
    regular: moderateScale(14),
    medium: moderateScale(16),
    large: moderateScale(20),
    xlarge: moderateScale(24),
    xxlarge: moderateScale(28),
    xxxlarge: moderateScale(32),
  },

  // Border radius
  borderRadius: {
    small: scale(4),
    medium: scale(8),
    large: scale(12),
    xlarge: scale(16),
    round: scale(50),
  },

  // Icon sizes
  iconSize: {
    tiny: moderateScale(12),
    small: moderateScale(16),
    medium: moderateScale(20),
    large: moderateScale(24),
    xlarge: moderateScale(32),
  },

  // Button styles (matching the expected structure)
  button: {
    height: {
      small: verticalScale(32),
      medium: verticalScale(44),
      large: verticalScale(56),
    },
  },

  // Input styles
  input: {
    height: {
      small: verticalScale(36),
      medium: verticalScale(44),
      large: verticalScale(52),
    },
  },

  // Shadow depths
  shadow: {
    small: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      backgroundColor: "#FFFFFF", // Required for efficient shadow calculation
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      backgroundColor: "#FFFFFF", // Required for efficient shadow calculation
    },
    large: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      backgroundColor: "#FFFFFF", // Required for efficient shadow calculation
    },
  },
};

// Device type helpers
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;

  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else if (
    pixelDensity === 2 &&
    (adjustedWidth >= 1920 || adjustedHeight >= 1920)
  ) {
    return true;
  } else {
    return false;
  }
};

export const isSmallScreen = () => SCREEN_WIDTH < 350;
export const isMediumScreen = () => SCREEN_WIDTH >= 350 && SCREEN_WIDTH < 400;
export const isLargeScreen = () => SCREEN_WIDTH >= 400;

// Platform-specific adjustments
export const platformSpecific = {
  isIOS: Platform.OS === "ios",
  isAndroid: Platform.OS === "android",
  statusBarHeight: Platform.OS === "ios" ? 44 : 24,
  bottomSafeArea: Platform.OS === "ios" ? 34 : 0,
};

export default responsive;

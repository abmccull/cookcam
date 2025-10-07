/**
 * Style System Index
 * Central export for all style-related utilities
 */

// Export design tokens
import {
  Colors,
  Typography as TypographyTokens,
  Spacing,
  BorderRadius,
  Shadow,
} from "./tokens";

export { Colors as colors, Spacing as spacing, BorderRadius as borderRadius, Shadow as shadow };
export const Typography = TypographyTokens;

// Re-export for convenience
export const fontSize = TypographyTokens.fontSize;
export const fontWeight = TypographyTokens.fontWeight;

// Create unified tokens object
export const tokens = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadow: Shadow,
  fontSize: TypographyTokens.fontSize,
  fontWeight: TypographyTokens.fontWeight,
};

// Export mixins
export {
  default as mixins,
  layout,
  cards,
  buttons,
  text,
  inputs,
  containers,
  avatars,
  badges,
} from "./mixins";

// Re-export responsive utilities for convenience
export {
  scale,
  verticalScale,
  moderateScale,
  responsive,
} from "../utils/responsive";

// Common style utilities
export const styleUtils = {
  // Helper to combine styles safely
  combine: (...styles: unknown[]) => {
    return styles
      .filter(Boolean)
      .reduce((acc, style) => ({ ...acc, ...style }), {});
  },

  // Helper to create conditional styles
  conditional: (condition: boolean, trueStyle: unknown, falseStyle: unknown = {}) => {
    return condition ? trueStyle : falseStyle;
  },

  // Helper to create platform-specific styles
  platform: (ios: unknown, android: unknown, web: unknown = {}) => {
    const Platform = require("react-native").Platform;
    switch (Platform.OS) {
      case "ios":
        return ios;
      case "android":
        return android;
      case "web":
        return web;
      default:
        return ios;
    }
  },
};

/**
 * Style System Index
 * Central export for all style-related utilities
 */

// Export design tokens
export { default as tokens, colors, spacing, borderRadius, fontSize, fontWeight, shadow, animation, zIndex } from './tokens';
export type { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from './tokens';

// Export mixins
export { default as mixins, layout, cards, buttons, text, inputs, containers, avatars, badges } from './mixins';

// Re-export responsive utilities for convenience
export { scale, verticalScale, moderateScale, responsive } from '../utils/responsive';

// Common style utilities
export const styleUtils = {
  // Helper to combine styles safely
  combine: (...styles: any[]) => {
    return styles.filter(Boolean).reduce((acc, style) => ({ ...acc, ...style }), {});
  },
  
  // Helper to create conditional styles
  conditional: (condition: boolean, trueStyle: any, falseStyle: any = {}) => {
    return condition ? trueStyle : falseStyle;
  },
  
  // Helper to create platform-specific styles
  platform: (ios: any, android: any, web: any = {}) => {
    const Platform = require('react-native').Platform;
    switch (Platform.OS) {
      case 'ios':
        return ios;
      case 'android':
        return android;
      case 'web':
        return web;
      default:
        return ios;
    }
  },
}; 
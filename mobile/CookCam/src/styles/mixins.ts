/**
 * Style Mixins for CookCam
 * Reusable style patterns to reduce duplication
 */

import { ViewStyle, TextStyle } from "react-native";
import tokens from "./tokens";

// Layout Mixins
export const layout = {
  // Flex patterns
  flex1: {
    flex: 1,
  } as ViewStyle,

  flexRow: {
    flexDirection: "row",
  } as ViewStyle,

  flexColumn: {
    flexDirection: "column",
  } as ViewStyle,

  // Alignment patterns
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  centerHorizontal: {
    alignItems: "center",
  } as ViewStyle,

  centerVertical: {
    justifyContent: "center",
  } as ViewStyle,

  spaceBetween: {
    justifyContent: "space-between",
  } as ViewStyle,

  spaceAround: {
    justifyContent: "space-around",
  } as ViewStyle,

  spaceEvenly: {
    justifyContent: "space-evenly",
  } as ViewStyle,

  // Position patterns
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,

  absoluteTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
  } as ViewStyle,

  absoluteTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
  } as ViewStyle,

  absoluteBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
  } as ViewStyle,
};

// Card Mixins
export const cards = {
  // Base card style
  base: {
    backgroundColor: tokens.colors.background.card,
    borderRadius: tokens.borderRadius.large,
    ...tokens.shadow.md,
  } as ViewStyle,

  // Elevated card
  elevated: {
    backgroundColor: tokens.colors.background.card,
    borderRadius: tokens.borderRadius.large,
    ...tokens.shadow.lg,
  } as ViewStyle,

  // Flat card (no shadow)
  flat: {
    backgroundColor: tokens.colors.background.card,
    borderRadius: tokens.borderRadius.large,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
  } as ViewStyle,

  // Interactive card
  interactive: {
    backgroundColor: tokens.colors.background.card,
    borderRadius: tokens.borderRadius.large,
    ...tokens.shadow.md,
    transform: [{ scale: 1 }], // For animation
  } as ViewStyle,
};

// Button Mixins
export const buttons = {
  // Base button styles
  base: {
    borderRadius: tokens.borderRadius.medium,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    ...layout.centerContent,
  } as ViewStyle,

  // Primary button
  primary: {
    backgroundColor: tokens.colors.brand.primary,
    borderRadius: tokens.borderRadius.medium,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    ...layout.centerContent,
  } as ViewStyle,

  // Secondary button
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: tokens.colors.brand.primary,
    borderRadius: tokens.borderRadius.medium,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    ...layout.centerContent,
  } as ViewStyle,

  // Danger button
  danger: {
    backgroundColor: tokens.colors.status.error,
    borderRadius: tokens.borderRadius.medium,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    ...layout.centerContent,
  } as ViewStyle,

  // Icon button
  icon: {
    width: 48,
    height: 48,
    borderRadius: tokens.borderRadius.large,
    ...layout.centerContent,
  } as ViewStyle,

  // Floating action button
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.brand.primary,
    ...layout.centerContent,
    ...tokens.shadow.lg,
  } as ViewStyle,
};

// Text Mixins
export const text = {
  // Headings
  h1: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.tight,
  } as TextStyle,

  h2: {
    fontSize: tokens.fontSize.xxxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.tight,
  } as TextStyle,

  h3: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  h4: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  // Body text
  body: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.regular,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  bodySecondary: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.regular,
    color: tokens.colors.text.secondary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  // Small text
  caption: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.regular,
    color: tokens.colors.text.secondary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  // Labels
  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text.primary,
    lineHeight: tokens.lineHeight.normal,
  } as TextStyle,

  // Button text
  buttonPrimary: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.inverse,
    textAlign: "center",
  } as TextStyle,

  buttonSecondary: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.brand.primary,
    textAlign: "center",
  } as TextStyle,
};

// Input Mixins
export const inputs = {
  base: {
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
    borderRadius: tokens.borderRadius.medium,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.background.primary,
  } as ViewStyle,

  focused: {
    borderColor: tokens.colors.border.focus,
    ...tokens.shadow.sm,
  } as ViewStyle,

  error: {
    borderColor: tokens.colors.status.error,
  } as ViewStyle,
};

// Container Mixins
export const containers = {
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background.tertiary,
  } as ViewStyle,

  screenPadded: {
    flex: 1,
    backgroundColor: tokens.colors.background.tertiary,
    paddingHorizontal: tokens.spacing.md,
  } as ViewStyle,

  section: {
    paddingVertical: tokens.spacing.lg,
  } as ViewStyle,

  sectionPadded: {
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.md,
  } as ViewStyle,
};

// Avatar Mixins
export const avatars = {
  small: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.brand.chef,
    ...layout.centerContent,
    borderWidth: 2,
    borderColor: tokens.colors.text.inverse,
  } as ViewStyle,

  medium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.brand.chef,
    ...layout.centerContent,
    borderWidth: 2,
    borderColor: tokens.colors.text.inverse,
  } as ViewStyle,

  large: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.brand.chef,
    ...layout.centerContent,
    borderWidth: 2,
    borderColor: tokens.colors.text.inverse,
  } as ViewStyle,
};

// Badge Mixins
export const badges = {
  base: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.pill,
    ...layout.centerContent,
  } as ViewStyle,

  success: {
    backgroundColor: tokens.colors.status.success,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.pill,
  } as ViewStyle,

  warning: {
    backgroundColor: tokens.colors.status.warning,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.pill,
  } as ViewStyle,

  error: {
    backgroundColor: tokens.colors.status.error,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.pill,
  } as ViewStyle,
};

// Export all mixins
export const mixins = {
  layout,
  cards,
  buttons,
  text,
  inputs,
  containers,
  avatars,
  badges,
};

export default mixins;

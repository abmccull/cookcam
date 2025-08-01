import { Platform } from "react-native";
import logger from "./logger";

// Type definitions
type HapticFeedbackType =
  | "impactLight"
  | "impactMedium"
  | "impactHeavy"
  | "notificationSuccess"
  | "notificationWarning"
  | "notificationError"
  | "selection";

interface HapticOptions {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
}

// Safe haptic feedback wrapper
class HapticFeedback {
  private isAvailable = false;
  private nativeModule: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Try to import the native module

      const ReactNativeHapticFeedback = require("react-native-haptic-feedback");
      this.nativeModule = ReactNativeHapticFeedback;
      this.isAvailable = true;
      logger.debug("✅ HapticFeedback: Native module loaded successfully");
    } catch (error) {
      logger.warn("⚠️ HapticFeedback: Native module not available:", error);
      this.isAvailable = false;
    }
  }

  trigger(type: HapticFeedbackType, options?: HapticOptions) {
    if (!this.isAvailable || !this.nativeModule) {
      logger.debug(
        `🔇 HapticFeedback: Skipping ${type} (module not available)`,
      );
      return;
    }

    try {
      const defaultOptions = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
        ...options,
      };

      this.nativeModule.trigger(type, defaultOptions);
      logger.debug(`✨ HapticFeedback: Triggered ${type}`);
    } catch (error) {
      logger.warn(`⚠️ HapticFeedback: Failed to trigger ${type}:`, error);
    }
  }

  // Platform-specific helpers
  success(options?: HapticOptions) {
    this.trigger("notificationSuccess", options);
  }

  warning(options?: HapticOptions) {
    this.trigger("notificationWarning", options);
  }

  error(options?: HapticOptions) {
    this.trigger("notificationError", options);
  }

  impact(
    intensity: "light" | "medium" | "heavy" = "medium",
    options?: HapticOptions,
  ) {
    const typeMap = {
      light: "impactLight" as const,
      medium: "impactMedium" as const,
      heavy: "impactHeavy" as const,
    };
    this.trigger(typeMap[intensity], options);
  }

  selection(options?: HapticOptions) {
    this.trigger("selection", options);
  }

  // Check if haptics are available
  isSupported(): boolean {
    return this.isAvailable && Platform.OS !== "web";
  }
}

// Export singleton instance
export const haptics = new HapticFeedback();

// Export for backward compatibility
export default haptics;

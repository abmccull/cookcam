import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import logger from "../utils/logger";

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  fingerprintAvailable: boolean;
  faceIdAvailable: boolean;
  irisAvailable: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string | undefined;
  warning?: string | undefined;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;
  private capabilities: BiometricCapabilities | null = null;

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check device biometric capabilities
   */
  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      const capabilities: BiometricCapabilities = {
        isAvailable: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
        fingerprintAvailable: supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT,
        ),
        faceIdAvailable: supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        ),
        irisAvailable: supportedTypes.includes(
          LocalAuthentication.AuthenticationType.IRIS,
        ),
      };

      this.capabilities = capabilities;

      logger.debug("🔐 Biometric capabilities:", {
        platform: Platform.OS,
        hasHardware,
        isEnrolled,
        supportedTypes: supportedTypes.map((type) =>
          this.getAuthTypeString(type),
        ),
        fingerprintAvailable: capabilities.fingerprintAvailable,
        faceIdAvailable: capabilities.faceIdAvailable,
      });

      return capabilities;
    } catch (error) {
      logger.error("❌ Error checking biometric capabilities:", error);
      const fallbackCapabilities: BiometricCapabilities = {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        fingerprintAvailable: false,
        faceIdAvailable: false,
        irisAvailable: false,
      };
      this.capabilities = fallbackCapabilities;
      return fallbackCapabilities;
    }
  }

  /**
   * Get user-friendly authentication type string
   */
  private getAuthTypeString(
    type: LocalAuthentication.AuthenticationType,
  ): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return "Fingerprint";
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
      case LocalAuthentication.AuthenticationType.IRIS:
        return "Iris";
      default:
        return "Unknown";
    }
  }

  /**
   * Get primary biometric method name for UI display
   */
  async getPrimaryBiometricMethod(): Promise<string> {
    if (!this.capabilities) {
      await this.checkBiometricCapabilities();
    }

    if (!this.capabilities?.isAvailable) {
      return "Biometric Authentication";
    }

    // Prioritize Face ID on iOS, then fingerprint
    if (this.capabilities.faceIdAvailable && Platform.OS === "ios") {
      return "Face ID";
    } else if (this.capabilities.fingerprintAvailable) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    } else if (this.capabilities.faceIdAvailable) {
      return "Face Recognition";
    } else if (this.capabilities.irisAvailable) {
      return "Iris";
    }

    return "Biometric Authentication";
  }

  /**
   * Get appropriate icon for the primary biometric method
   */
  async getBiometricIcon(): Promise<string> {
    if (!this.capabilities) {
      await this.checkBiometricCapabilities();
    }

    if (!this.capabilities?.isAvailable) {
      return "🔐";
    }

    if (this.capabilities.faceIdAvailable && Platform.OS === "ios") {
      return "👤"; // Face ID
    } else if (this.capabilities.fingerprintAvailable) {
      return "👆"; // Fingerprint
    } else if (this.capabilities.faceIdAvailable) {
      return "👤"; // Face Recognition
    } else if (this.capabilities.irisAvailable) {
      return "👁️"; // Iris
    }

    return "🔐";
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
  }): Promise<BiometricAuthResult> {
    try {
      // Check capabilities first
      if (!this.capabilities) {
        await this.checkBiometricCapabilities();
      }

      if (!this.capabilities?.isAvailable) {
        return {
          success: false,
          error: !this.capabilities?.hasHardware
            ? "Biometric hardware not available on this device"
            : "No biometric authentication enrolled. Please set up fingerprint or face authentication in your device settings.",
        };
      }

      const primaryMethod = await this.getPrimaryBiometricMethod();

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          options?.promptMessage || `Authenticate with ${primaryMethod}`,
        cancelLabel: options?.cancelLabel || "Cancel",
        fallbackLabel: options?.fallbackLabel || "Use Password",
        requireConfirmation: false,
        disableDeviceFallback: false,
      });

      if (result.success) {
        logger.debug("✅ Biometric authentication successful");
        return { success: true };
      } else {
        const errorMessage = this.getErrorMessage(result.error);
        logger.debug("❌ Biometric authentication failed:", errorMessage);

        return {
          success: false,
          error: errorMessage,
          warning:
            result.error === "user_cancel"
              ? "Authentication was cancelled"
              : undefined,
        };
      }
    } catch (error) {
      logger.error("❌ Biometric authentication error:", error);
      return {
        success: false,
        error: "An unexpected error occurred during biometric authentication",
      };
    }
  }

  /**
   * Convert LocalAuthentication error to user-friendly message
   */
  private getErrorMessage(error?: string): string {
    switch (error) {
      case "unknown":
        return "An unknown error occurred";
      case "authentication_canceled":
        return "Authentication was cancelled";
      case "user_cancel":
        return "You cancelled the authentication";
      case "user_fallback":
        return "Fallback authentication method selected";
      case "system_cancel":
        return "Authentication was cancelled by the system";
      case "passcode_not_set":
        return "Device passcode is not set";
      case "biometry_not_available":
        return "Biometric authentication is not available";
      case "biometry_not_enrolled":
        return "No biometric authentication enrolled";
      case "biometry_lockout":
        return "Biometric authentication is locked. Please try again later.";
      case "biometry_lockout_permanent":
        return "Biometric authentication is permanently locked. Please use your passcode.";
      case "too_many_attempts":
        return "Too many failed attempts. Please try again later.";
      case "invalid_context":
        return "Invalid authentication context";
      case "not_interactive":
        return "Authentication requires user interaction";
      case "reused_context":
        return "Authentication context was reused";
      default:
        return error || "Biometric authentication failed";
    }
  }

  /**
   * Store biometric login preference
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync("biometric_enabled", enabled.toString());
      logger.debug(
        `🔐 Biometric authentication ${enabled ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      logger.error("❌ Error storing biometric preference:", error);
    }
  }

  /**
   * Get biometric login preference
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync("biometric_enabled");
      return enabled === "true";
    } catch (error) {
      logger.error("❌ Error retrieving biometric preference:", error);
      return false;
    }
  }

  /**
   * Store user credentials securely for biometric login
   */
  async storeCredentialsForBiometric(
    email: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    try {
      await SecureStore.setItemAsync("biometric_email", email);
      await SecureStore.setItemAsync("biometric_access_token", accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync("biometric_refresh_token", refreshToken);
      }
      logger.debug("🔐 Credentials stored securely for biometric login", {
        hasRefreshToken: !!refreshToken,
      });
    } catch (error) {
      logger.error("❌ Error storing biometric credentials:", error);
      throw error;
    }
  }

  /**
   * Retrieve stored credentials for biometric login
   */
  async getStoredCredentials(): Promise<{
    email: string;
    token: string;
    refreshToken?: string | undefined;
  } | null> {
    try {
      const email = await SecureStore.getItemAsync("biometric_email");
      const accessToken = await SecureStore.getItemAsync(
        "biometric_access_token",
      );
      const refreshToken = await SecureStore.getItemAsync(
        "biometric_refresh_token",
      );

      // Try legacy storage first for backward compatibility
      const legacyToken = await SecureStore.getItemAsync("biometric_token");

      const finalToken = accessToken || legacyToken;

      if (email && finalToken) {
        return {
          email,
          token: finalToken,
          refreshToken: refreshToken || undefined,
        };
      }
      return null;
    } catch (error) {
      logger.error("❌ Error retrieving stored credentials:", error);
      return null;
    }
  }

  /**
   * Clear stored biometric credentials
   */
  async clearStoredCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync("biometric_email");
      await SecureStore.deleteItemAsync("biometric_token"); // Legacy
      await SecureStore.deleteItemAsync("biometric_access_token");
      await SecureStore.deleteItemAsync("biometric_refresh_token");
      await SecureStore.deleteItemAsync("biometric_enabled");
      logger.debug("🔐 Biometric credentials cleared");
    } catch (error) {
      logger.error("❌ Error clearing biometric credentials:", error);
    }
  }

  /**
   * Check if biometric login is available and enabled
   */
  async canUseBiometricLogin(): Promise<boolean> {
    const capabilities = await this.checkBiometricCapabilities();
    const isEnabled = await this.isBiometricEnabled();
    const hasCredentials = (await this.getStoredCredentials()) !== null;

    return capabilities.isAvailable && isEnabled && hasCredentials;
  }
}

export default BiometricAuthService;

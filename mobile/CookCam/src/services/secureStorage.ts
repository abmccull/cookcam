import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import logger from "../utils/logger";

/**
 * Secure Storage Service
 * Uses React Native Keychain for sensitive data (tokens, passwords)
 * and AsyncStorage for non-sensitive data (preferences, cache)
 */

// Keychain service identifiers
const KEYCHAIN_SERVICE = "CookCam";

// Keys for sensitive data (stored in Keychain)
export const SECURE_KEYS = {
  ACCESS_TOKEN: "supabase-access-token",
  REFRESH_TOKEN: "supabase-refresh-token",
  USER_ID: "user-id",
} as const;

// Keys for non-sensitive data (stored in AsyncStorage)
export const STORAGE_KEYS = {
  USER_PREFERENCES: "user-preferences",
  TEMP_SCAN_DATA: "temp-scan-data",
  ONBOARDING_COMPLETED: "onboarding-completed",
  LAST_CHECK_IN: "last-check-in-date",
  ANALYTICS_SESSION: "analytics_session",
  NOTIFICATION_PREFERENCES: "notification_preferences",
  WEEKLY_CHECK_INS: "weekly_check_ins",
  USER_BEHAVIOR: "user_behavior",
  CREATOR_KYC_COMPLETED: "creator_kyc_completed",
  SUBSCRIPTION_EXPIRED_AT: "subscription_expired_at",
  PAYMENT_FAILED_AT: "payment_failed_at",
  GRACE_PERIOD_END: "grace_period_end",
} as const;

class SecureStorage {
  private static instance: SecureStorage;
  private keychainAvailable: boolean | null = null;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Check if Keychain is available and cache the result
   */
  private async checkKeychainAvailability(): Promise<boolean> {
    if (this.keychainAvailable !== null) {
      return this.keychainAvailable;
    }

    try {
      // Try a simple keychain operation to test availability
      await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
      this.keychainAvailable = true;
      return true;
    } catch (error) {
      logger.warn(
        "⚠️ Keychain not available, falling back to AsyncStorage for tokens. This is less secure but allows development to continue.",
      );
      this.keychainAvailable = false;
      return false;
    }
  }

  // ===== SECURE STORAGE METHODS (using Keychain with AsyncStorage fallback) =====

  /**
   * Store sensitive data securely in Keychain, fallback to AsyncStorage if unavailable
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error(`Error setting secure item for key: ${key}`, error);
      throw new Error("Failed to set secure item.");
    }
  }

  /**
   * Retrieve sensitive data from Keychain, fallback to AsyncStorage if unavailable
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error(`Error getting secure item for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data from Keychain, also clean fallback AsyncStorage
   */
  async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error(`Error removing secure item for key: ${key}`, error);
    }
  }

  /**
   * Clear all secure data from Keychain
   */
  async clearAllSecureData(): Promise<void> {
    try {
      const allKeys = Object.values(SECURE_KEYS);
      const promises = allKeys.map((key) => this.removeSecureItem(key));
      await Promise.all(promises);
      logger.debug("All secure data cleared.");
    } catch (error) {
      logger.error("Failed to clear all secure data.", error);
    }
  }

  // ===== TOKEN MANAGEMENT (convenience methods) =====

  /**
   * Store authentication tokens securely
   */
  async setAuthTokens(
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    await this.setSecureItem(SECURE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await this.setSecureItem(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    return this.getSecureItem(SECURE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.getSecureItem(SECURE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Clear all authentication tokens
   */
  async clearAuthTokens(): Promise<void> {
    await Promise.all([
      this.removeSecureItem(SECURE_KEYS.ACCESS_TOKEN),
      this.removeSecureItem(SECURE_KEYS.REFRESH_TOKEN),
    ]);
  }

  // ===== REGULAR STORAGE METHODS (using AsyncStorage) =====

  /**
   * Store non-sensitive data in AsyncStorage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      logger.error(`Error setting item in AsyncStorage for key: ${key}`, error);
    }
  }

  /**
   * Store JSON data in AsyncStorage
   */
  async setJsonItem(key: string, value: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.setItem(key, jsonString);
    } catch (error) {
      logger.error(`Error storing JSON item ${key}:`, error);
      throw new Error(`Failed to store JSON data: ${key}`);
    }
  }

  /**
   * Get data from AsyncStorage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      logger.error(
        `Error getting item from AsyncStorage for key: ${key}`,
        error,
      );
      return null;
    }
  }

  /**
   * Get JSON data from AsyncStorage
   */
  async getJsonItem<T>(key: string): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key);
      if (jsonString) {
        return JSON.parse(jsonString) as T;
      }
      return null;
    } catch (error) {
      logger.error(`Error retrieving JSON item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from AsyncStorage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error(
        `Error removing item from AsyncStorage for key: ${key}`,
        error,
      );
    }
  }

  /**
   * Remove multiple items from AsyncStorage
   */
  async removeItems(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      logger.error("Error removing multiple items:", error);
    }
  }

  /**
   * Clear all non-sensitive data
   */
  async clearAllData(): Promise<void> {
    try {
      const allKeys = Object.values(STORAGE_KEYS);
      await this.removeItems(allKeys);
    } catch (error) {
      logger.error("Error clearing all data:", error);
    }
  }

  /**
   * Clear ALL data (both secure and non-secure) - use with caution!
   */
  async clearAllAppData(): Promise<void> {
    await Promise.all([this.clearAllSecureData(), this.clearAllData()]);
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if Keychain is available on this device
   */
  async isKeychainAvailable(): Promise<boolean> {
    try {
      await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
      return true; // If this doesn't throw, Keychain is available
    } catch (error) {
      logger.warn("Keychain not available on this device:", error);
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  async getBiometryType(): Promise<string | null> {
    try {
      const biometryType = await SecureStore.getItemAsync(
        SECURE_KEYS.ACCESS_TOKEN,
      );
      return biometryType;
    } catch (error) {
      logger.error("Error getting biometry type:", error);
      return null;
    }
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance();
export default SecureStorage;

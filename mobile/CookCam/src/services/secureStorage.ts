import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure Storage Service
 * Uses React Native Keychain for sensitive data (tokens, passwords)
 * and AsyncStorage for non-sensitive data (preferences, cache)
 */

// Keychain service identifiers
const KEYCHAIN_SERVICE = 'CookCam';

// Keys for sensitive data (stored in Keychain)
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_CREDENTIALS: 'user_credentials',
} as const;

// Keys for non-sensitive data (stored in AsyncStorage)
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  ANALYTICS_SESSION: 'analytics_session',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_CHECK_IN: 'last_check_in',
  WEEKLY_CHECK_INS: 'weekly_check_ins',
  USER_BEHAVIOR: 'user_behavior',
  CREATOR_KYC_COMPLETED: 'creator_kyc_completed',
  SUBSCRIPTION_EXPIRED_AT: 'subscription_expired_at',
  PAYMENT_FAILED_AT: 'payment_failed_at',
  GRACE_PERIOD_END: 'grace_period_end',
} as const;

class SecureStorage {
  private keychainAvailable: boolean | null = null;

  /**
   * Check if Keychain is available and cache the result
   */
  private async checkKeychainAvailability(): Promise<boolean> {
    if (this.keychainAvailable !== null) {
      return this.keychainAvailable;
    }

    try {
      // Try a simple keychain operation to test availability
      await Keychain.getSupportedBiometryType();
      this.keychainAvailable = true;
      return true;
    } catch (error) {
      console.warn('⚠️ Keychain not available, falling back to AsyncStorage for tokens. This is less secure but allows development to continue.');
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
      const keychainAvailable = await this.checkKeychainAvailability();
      
      if (keychainAvailable) {
        await Keychain.setGenericPassword(key, value, {
          service: `${KEYCHAIN_SERVICE}_${key}`,
        });
      } else {
        // Fallback to AsyncStorage with a warning prefix
        console.warn(`🔒 Using AsyncStorage fallback for secure item: ${key}`);
        await AsyncStorage.setItem(`SECURE_FALLBACK_${key}`, value);
      }
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      // Try AsyncStorage as final fallback
      try {
        console.warn(`🔒 Final fallback to AsyncStorage for: ${key}`);
        await AsyncStorage.setItem(`SECURE_FALLBACK_${key}`, value);
      } catch (fallbackError) {
        console.error(`Final fallback failed for ${key}:`, fallbackError);
        throw new Error(`Failed to store secure data: ${key}`);
      }
    }
  }

  /**
   * Retrieve sensitive data from Keychain, fallback to AsyncStorage if unavailable
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const keychainAvailable = await this.checkKeychainAvailability();
      
      if (keychainAvailable) {
        const credentials = await Keychain.getGenericPassword({
          service: `${KEYCHAIN_SERVICE}_${key}`,
        });

        if (credentials && credentials.password) {
          return credentials.password;
        }
      } else {
        // Fallback to AsyncStorage
        const value = await AsyncStorage.getItem(`SECURE_FALLBACK_${key}`);
        return value;
      }

      return null;
    } catch (error) {
      console.error(`Error retrieving secure item ${key}:`, error);
      // Try AsyncStorage fallback
      try {
        const fallbackValue = await AsyncStorage.getItem(`SECURE_FALLBACK_${key}`);
        return fallbackValue;
      } catch (fallbackError) {
        console.error(`Fallback retrieval failed for ${key}:`, fallbackError);
        return null;
      }
    }
  }

  /**
   * Remove sensitive data from Keychain, also clean fallback AsyncStorage
   */
  async removeSecureItem(key: string): Promise<void> {
    try {
      const keychainAvailable = await this.checkKeychainAvailability();
      
      if (keychainAvailable) {
        await Keychain.resetGenericPassword({
          service: `${KEYCHAIN_SERVICE}_${key}`,
        });
      }
      
      // Always also try to remove from AsyncStorage fallback (in case data was stored there)
      await AsyncStorage.removeItem(`SECURE_FALLBACK_${key}`);
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      // Still try to remove from AsyncStorage fallback
      try {
        await AsyncStorage.removeItem(`SECURE_FALLBACK_${key}`);
      } catch (fallbackError) {
        console.error(`Fallback removal failed for ${key}:`, fallbackError);
      }
    }
  }

  /**
   * Clear all secure data from Keychain
   */
  async clearAllSecureData(): Promise<void> {
    try {
      const secureKeys = Object.values(SECURE_KEYS);
      await Promise.all(secureKeys.map(key => this.removeSecureItem(key)));
    } catch (error) {
      console.error('Error clearing secure data:', error);
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
      console.error(`Error storing item ${key}:`, error);
      throw new Error(`Failed to store data: ${key}`);
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
      console.error(`Error storing JSON item ${key}:`, error);
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
      console.error(`Error retrieving item ${key}:`, error);
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
      console.error(`Error retrieving JSON item ${key}:`, error);
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
      console.error(`Error removing item ${key}:`, error);
    }
  }

  /**
   * Remove multiple items from AsyncStorage
   */
  async removeItems(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
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
      console.error('Error clearing all data:', error);
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
      const supportedType = await Keychain.getSupportedBiometryType();
      return true; // If this doesn't throw, Keychain is available
    } catch (error) {
      console.warn('Keychain not available on this device:', error);
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  async getBiometryType(): Promise<string | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType;
    } catch (error) {
      console.error('Error getting biometry type:', error);
      return null;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();
export default secureStorage;

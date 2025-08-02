// Mock dependencies before imports
jest.mock('expo-local-authentication');
jest.mock('expo-secure-store');
jest.mock('../../utils/logger');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios)
  }
}));

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from '../../utils/logger';
import BiometricAuthService, { BiometricCapabilities, BiometricAuthResult } from '../biometricAuth';

const mockedLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('BiometricAuthService', () => {
  let biometricService: BiometricAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    biometricService = BiometricAuthService.getInstance();
    // Reset cached capabilities
    (biometricService as any).capabilities = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BiometricAuthService.getInstance();
      const instance2 = BiometricAuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkBiometricCapabilities', () => {
    it('should return full capabilities when biometrics available', async () => {
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ]);

      const capabilities = await biometricService.checkBiometricCapabilities();

      expect(capabilities).toEqual({
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [
          LocalAuthentication.AuthenticationType.FINGERPRINT,
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        ],
        fingerprintAvailable: true,
        faceIdAvailable: true,
        irisAvailable: false
      });

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔐 Biometric capabilities:',
        expect.objectContaining({
          platform: 'ios',
          hasHardware: true,
          isEnrolled: true,
          fingerprintAvailable: true,
          faceIdAvailable: true
        })
      );
    });

    it('should handle no hardware available', async () => {
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const capabilities = await biometricService.checkBiometricCapabilities();

      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.hasHardware).toBe(false);
      expect(capabilities.supportedTypes).toEqual([]);
    });

    it('should handle hardware but not enrolled', async () => {
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(false);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);

      const capabilities = await biometricService.checkBiometricCapabilities();

      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.hasHardware).toBe(true);
      expect(capabilities.isEnrolled).toBe(false);
    });

    it('should detect iris authentication', async () => {
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS
      ]);

      const capabilities = await biometricService.checkBiometricCapabilities();

      expect(capabilities.irisAvailable).toBe(true);
      expect(capabilities.fingerprintAvailable).toBe(false);
      expect(capabilities.faceIdAvailable).toBe(false);
    });

    it('should cache capabilities', async () => {
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      await biometricService.checkBiometricCapabilities();
      
      expect((biometricService as any).capabilities).not.toBeNull();
    });

    it('should handle errors and return fallback capabilities', async () => {
      mockedLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));

      const capabilities = await biometricService.checkBiometricCapabilities();

      expect(capabilities).toEqual({
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        fingerprintAvailable: false,
        faceIdAvailable: false,
        irisAvailable: false
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '❌ Error checking biometric capabilities:',
        expect.any(Error)
      );
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      // Set up capabilities
      (biometricService as any).capabilities = {
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION],
        fingerprintAvailable: false,
        faceIdAvailable: true,
        irisAvailable: false
      };
    });

    it('should authenticate successfully', async () => {
      mockedLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined
      });

      const result = await biometricService.authenticate('Access your account');

      expect(result.success).toBe(true);
      expect(mockedLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Access your account',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });
    });

    it('should handle authentication failure', async () => {
      mockedLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel',
        warning: undefined
      });

      const result = await biometricService.authenticate('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_cancel');
    });

    it('should check capabilities if not cached', async () => {
      (biometricService as any).capabilities = null;
      
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      mockedLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined
      });

      await biometricService.authenticate('Test');

      expect(mockedLocalAuth.hasHardwareAsync).toHaveBeenCalled();
    });

    it('should return error if biometrics not available', async () => {
      (biometricService as any).capabilities = {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: []
      };

      const result = await biometricService.authenticate('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication is not available on this device');
      expect(mockedLocalAuth.authenticateAsync).not.toHaveBeenCalled();
    });

    it('should handle authentication exceptions', async () => {
      mockedLocalAuth.authenticateAsync.mockRejectedValue(new Error('Auth failed'));

      const result = await biometricService.authenticate('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should use custom options', async () => {
      mockedLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
        warning: undefined
      });

      await biometricService.authenticate('Test', {
        fallbackLabel: 'Custom Fallback',
        disableDeviceFallback: true,
        cancelLabel: 'Custom Cancel'
      });

      expect(mockedLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test',
        fallbackLabel: 'Custom Fallback',
        disableDeviceFallback: true,
        cancelLabel: 'Custom Cancel'
      });
    });
  });

  describe('Platform-specific behavior', () => {
    it('should show Face ID for iOS', async () => {
      Platform.OS = 'ios';
      
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ]);

      await biometricService.checkBiometricCapabilities();

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          supportedTypes: expect.arrayContaining(['Face ID'])
        })
      );
    });

    it('should show Face Recognition for Android', async () => {
      Platform.OS = 'android';
      
      mockedLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockedLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockedLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ]);

      await biometricService.checkBiometricCapabilities();

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          supportedTypes: expect.arrayContaining(['Face Recognition'])
        })
      );
    });
  });

  describe('Secure Storage', () => {
    it('should save credentials securely', async () => {
      await biometricService.saveCredentials('user123', 'token123');

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_user_id',
        'user123'
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometric_token',
        'token123'
      );
    });

    it('should retrieve credentials', async () => {
      mockedSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'biometric_user_id') return Promise.resolve('user123');
        if (key === 'biometric_token') return Promise.resolve('token123');
        return Promise.resolve(null);
      });

      const credentials = await biometricService.getCredentials();

      expect(credentials).toEqual({
        userId: 'user123',
        token: 'token123'
      });
    });

    it('should clear credentials', async () => {
      await biometricService.clearCredentials();

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_user_id');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_token');
    });

    it('should handle storage errors', async () => {
      mockedSecureStore.setItemAsync.mockRejectedValue(new Error('Storage error'));

      const result = await biometricService.saveCredentials('user', 'token');

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('isBiometricAuthEnabled', () => {
    it('should return true if credentials exist', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue('user123');

      const isEnabled = await biometricService.isBiometricAuthEnabled();

      expect(isEnabled).toBe(true);
    });

    it('should return false if no credentials', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const isEnabled = await biometricService.isBiometricAuthEnabled();

      expect(isEnabled).toBe(false);
    });
  });
});
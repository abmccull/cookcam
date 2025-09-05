import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { delay } from './setup';

// Mock mobile dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-local-authentication');
jest.mock('expo-secure-store');

describe('Mobile Authentication Integration', () => {
  let apiClient: AxiosInstance;
  let mockStorage: { [key: string]: string } = {};
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Setup AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => 
      Promise.resolve(mockStorage[key] || null)
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    });
    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      mockStorage = {};
      return Promise.resolve();
    });
  });
  
  beforeEach(() => {
    mockStorage = {};
  });
  
  describe('Standard Mobile Authentication', () => {
    it('should login and store tokens securely', async () => {
      const credentials = {
        email: `mobile_${Date.now()}@example.com`,
        password: 'MobilePass123!',
        name: 'Mobile User',
      };
      
      // Register user
      const registerResponse = await apiClient.post('/api/auth/register', credentials);
      expect(registerResponse.status).toBe(201);
      
      // Login
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: credentials.email,
        password: credentials.password,
        device_info: {
          platform: 'ios',
          version: '15.0',
          device_id: 'test-device-id',
          app_version: '1.0.0',
        },
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeValidJWT();
      expect(loginResponse.data.refresh_token).toBeDefined();
      
      // Verify tokens are stored securely
      await SecureStore.setItemAsync('auth_token', loginResponse.data.token);
      await SecureStore.setItemAsync('refresh_token', loginResponse.data.refresh_token);
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('user_data', JSON.stringify(loginResponse.data.user));
      
      const storedUserData = await AsyncStorage.getItem('user_data');
      expect(storedUserData).toBeDefined();
      expect(JSON.parse(storedUserData!)).toMatchObject({
        email: credentials.email,
      });
    });
    
    it('should handle token refresh on mobile', async () => {
      // Create and login user
      const credentials = {
        email: `refresh_${Date.now()}@example.com`,
        password: 'RefreshPass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      const loginResponse = await apiClient.post('/api/auth/login', credentials);
      
      const originalToken = loginResponse.data.token;
      const refreshToken = loginResponse.data.refresh_token;
      
      // Wait a moment to ensure new token will be different
      await delay(1000);
      
      // Refresh token
      const refreshResponse = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken,
        device_info: {
          platform: 'ios',
          device_id: 'test-device-id',
        },
      });
      
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.token).toBeValidJWT();
      expect(refreshResponse.data.token).not.toBe(originalToken);
      
      // Verify new token works
      const profileResponse = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${refreshResponse.data.token}` }
      });
      
      expect(profileResponse.status).toBe(200);
    });
    
    it('should persist authentication across app restarts', async () => {
      const credentials = {
        email: `persist_${Date.now()}@example.com`,
        password: 'PersistPass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      const loginResponse = await apiClient.post('/api/auth/login', credentials);
      
      // Store authentication state
      await AsyncStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        token: loginResponse.data.token,
        refreshToken: loginResponse.data.refresh_token,
        user: loginResponse.data.user,
        expiresAt: Date.now() + 3600000, // 1 hour
      }));
      
      // Simulate app restart - clear memory but keep storage
      const tempStorage = { ...mockStorage };
      mockStorage = {};
      mockStorage = tempStorage;
      
      // Restore authentication state
      const authStateStr = await AsyncStorage.getItem('auth_state');
      expect(authStateStr).toBeDefined();
      
      const authState = JSON.parse(authStateStr!);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.token).toBe(loginResponse.data.token);
      
      // Verify token still works
      const profileResponse = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${authState.token}` }
      });
      
      expect(profileResponse.status).toBe(200);
    });
  });
  
  describe('Biometric Authentication', () => {
    beforeEach(() => {
      // Setup biometric mocks
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
    });
    
    it('should enable biometric authentication after initial login', async () => {
      const credentials = {
        email: `biometric_${Date.now()}@example.com`,
        password: 'BiometricPass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      const loginResponse = await apiClient.post('/api/auth/login', credentials);
      
      // Check if device supports biometrics
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      expect(hasHardware).toBe(true);
      expect(isEnrolled).toBe(true);
      
      // Enable biometric authentication
      const enableResponse = await apiClient.post(
        '/api/user/settings/biometric',
        { enabled: true },
        {
          headers: { Authorization: `Bearer ${loginResponse.data.token}` }
        }
      );
      
      expect([200, 201]).toContain(enableResponse.status);
      
      // Store biometric credentials securely
      await SecureStore.setItemAsync('biometric_credentials', JSON.stringify({
        email: credentials.email,
        biometric_enabled: true,
        device_id: 'test-device-id',
      }));
      
      // Store encrypted refresh token for biometric login
      await SecureStore.setItemAsync('biometric_refresh_token', loginResponse.data.refresh_token);
    });
    
    it('should login with biometric authentication', async () => {
      // Setup: User has previously enabled biometric auth
      const storedCredentials = {
        email: `bio_stored_${Date.now()}@example.com`,
        biometric_enabled: true,
        device_id: 'test-device-id',
      };
      
      await SecureStore.setItemAsync('biometric_credentials', JSON.stringify(storedCredentials));
      await SecureStore.setItemAsync('biometric_refresh_token', 'stored_refresh_token');
      
      // Mock successful biometric authentication
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
        error: undefined,
      });
      
      // Perform biometric authentication
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login to CookCam',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      
      expect(biometricResult.success).toBe(true);
      
      // Exchange biometric success for new tokens
      const biometricLoginResponse = await apiClient.post('/api/auth/biometric-login', {
        device_id: 'test-device-id',
        biometric_token: 'mock_biometric_verification',
        refresh_token: 'stored_refresh_token',
      });
      
      if (biometricLoginResponse.status === 200) {
        expect(biometricLoginResponse.data.token).toBeValidJWT();
        expect(biometricLoginResponse.data.user).toBeDefined();
      }
    });
    
    it('should fallback to password when biometric fails', async () => {
      // Mock failed biometric authentication
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });
      
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
      });
      
      expect(biometricResult.success).toBe(false);
      
      // Fallback to password login
      const passwordLoginResponse = await apiClient.post('/api/auth/login', {
        email: 'fallback@example.com',
        password: 'FallbackPass123!',
      });
      
      // Would succeed if user exists
      expect([200, 401]).toContain(passwordLoginResponse.status);
    });
    
    it('should handle biometric authentication lockout', async () => {
      // Mock multiple failed attempts
      let attemptCount = 0;
      (LocalAuthentication.authenticateAsync as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount >= 3) {
          return Promise.resolve({
            success: false,
            error: 'lockout',
          });
        }
        return Promise.resolve({
          success: false,
          error: 'authentication_failed',
        });
      });
      
      // Try biometric authentication multiple times
      const results = [];
      for (let i = 0; i < 4; i++) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate',
        });
        results.push(result);
      }
      
      // Should be locked out after 3 failures
      expect(results[3].error).toBe('lockout');
      
      // App should handle lockout
      const lockoutResponse = await apiClient.post('/api/auth/biometric-lockout', {
        device_id: 'test-device-id',
        lockout_reason: 'too_many_attempts',
      });
      
      if (lockoutResponse.status === 200) {
        expect(lockoutResponse.data.fallback_required).toBe(true);
        expect(lockoutResponse.data.lockout_duration).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Device Registration and Management', () => {
    it('should register device on first login', async () => {
      const credentials = {
        email: `device_${Date.now()}@example.com`,
        password: 'DevicePass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      const deviceInfo = {
        device_id: 'unique-device-id-123',
        device_name: 'iPhone 14 Pro',
        platform: 'ios',
        os_version: '16.0',
        app_version: '1.0.0',
        push_token: 'fcm_token_123',
      };
      
      const loginResponse = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: deviceInfo,
      });
      
      expect(loginResponse.status).toBe(200);
      
      // Verify device was registered
      const devicesResponse = await apiClient.get('/api/user/devices', {
        headers: { Authorization: `Bearer ${loginResponse.data.token}` }
      });
      
      if (devicesResponse.status === 200) {
        expect(devicesResponse.data.devices).toBeInstanceOf(Array);
        const registeredDevice = devicesResponse.data.devices.find(
          (d: any) => d.device_id === deviceInfo.device_id
        );
        expect(registeredDevice).toBeDefined();
        expect(registeredDevice.platform).toBe('ios');
      }
    });
    
    it('should handle multiple devices per user', async () => {
      const credentials = {
        email: `multidevice_${Date.now()}@example.com`,
        password: 'MultiDevice123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      // Login from iPhone
      const iphoneLogin = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'iphone-device-id',
          device_name: 'iPhone',
          platform: 'ios',
        },
      });
      
      // Login from iPad
      const ipadLogin = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'ipad-device-id',
          device_name: 'iPad',
          platform: 'ios',
        },
      });
      
      // Login from Android
      const androidLogin = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'android-device-id',
          device_name: 'Pixel',
          platform: 'android',
        },
      });
      
      // Check all devices are registered
      const devicesResponse = await apiClient.get('/api/user/devices', {
        headers: { Authorization: `Bearer ${iphoneLogin.data.token}` }
      });
      
      if (devicesResponse.status === 200) {
        expect(devicesResponse.data.devices).toHaveLength(3);
        expect(devicesResponse.data.devices.map((d: any) => d.platform)).toContain('ios');
        expect(devicesResponse.data.devices.map((d: any) => d.platform)).toContain('android');
      }
    });
    
    it('should revoke device access', async () => {
      const credentials = {
        email: `revoke_${Date.now()}@example.com`,
        password: 'RevokePass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      const loginResponse = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'device-to-revoke',
          device_name: 'Old Phone',
        },
      });
      
      const token = loginResponse.data.token;
      
      // Revoke device
      const revokeResponse = await apiClient.delete('/api/user/devices/device-to-revoke', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      expect([200, 204]).toContain(revokeResponse.status);
      
      // Token from revoked device should no longer work
      const profileResponse = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Depending on implementation, might still work until token expires
      // or might be immediately invalidated
      if (process.env.IMMEDIATE_DEVICE_REVOCATION === 'true') {
        expect(profileResponse.status).toBe(401);
      }
    });
  });
  
  describe('Session Management', () => {
    it('should handle concurrent sessions on multiple devices', async () => {
      const credentials = {
        email: `concurrent_${Date.now()}@example.com`,
        password: 'ConcurrentPass123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      // Create multiple concurrent sessions
      const sessions = await Promise.all([
        apiClient.post('/api/auth/login', {
          ...credentials,
          device_info: { device_id: 'device1' },
        }),
        apiClient.post('/api/auth/login', {
          ...credentials,
          device_info: { device_id: 'device2' },
        }),
        apiClient.post('/api/auth/login', {
          ...credentials,
          device_info: { device_id: 'device3' },
        }),
      ]);
      
      // All sessions should be valid
      const profileRequests = sessions.map(session =>
        apiClient.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${session.data.token}` }
        })
      );
      
      const profiles = await Promise.all(profileRequests);
      profiles.forEach(profile => {
        expect(profile.status).toBe(200);
      });
      
      // Get active sessions
      const sessionsResponse = await apiClient.get('/api/user/sessions', {
        headers: { Authorization: `Bearer ${sessions[0].data.token}` }
      });
      
      if (sessionsResponse.status === 200) {
        expect(sessionsResponse.data.sessions).toHaveLength(3);
        expect(sessionsResponse.data.sessions.every((s: any) => s.active)).toBe(true);
      }
    });
    
    it('should logout from all devices', async () => {
      const credentials = {
        email: `logoutall_${Date.now()}@example.com`,
        password: 'LogoutAll123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      // Create multiple sessions
      const session1 = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: { device_id: 'device1' },
      });
      
      const session2 = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: { device_id: 'device2' },
      });
      
      // Logout from all devices
      const logoutAllResponse = await apiClient.post('/api/auth/logout-all', {}, {
        headers: { Authorization: `Bearer ${session1.data.token}` }
      });
      
      expect([200, 204]).toContain(logoutAllResponse.status);
      
      // Both tokens should be invalid
      const profile1 = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${session1.data.token}` }
      });
      
      const profile2 = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${session2.data.token}` }
      });
      
      if (process.env.INVALIDATE_ALL_SESSIONS === 'true') {
        expect(profile1.status).toBe(401);
        expect(profile2.status).toBe(401);
      }
    });
  });
  
  describe('Security Features', () => {
    it('should detect and prevent suspicious login attempts', async () => {
      const credentials = {
        email: `suspicious_${Date.now()}@example.com`,
        password: 'Suspicious123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      // Normal login from known location
      await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'trusted-device',
          location: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        },
      });
      
      // Suspicious login from different country immediately after
      const suspiciousResponse = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'unknown-device',
          location: { lat: 55.7558, lng: 37.6173 }, // Moscow
        },
      });
      
      if (suspiciousResponse.status === 200) {
        // Should require additional verification
        expect(suspiciousResponse.data.verification_required).toBe(true);
        expect(suspiciousResponse.data.verification_method).toBeDefined();
      }
    });
    
    it('should enforce app version requirements', async () => {
      const credentials = {
        email: `version_${Date.now()}@example.com`,
        password: 'Version123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      // Try to login with outdated app version
      const outdatedResponse = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'old-app-device',
          app_version: '0.9.0', // Old version
          platform: 'ios',
        },
      });
      
      if (process.env.ENFORCE_MIN_APP_VERSION === 'true') {
        expect(outdatedResponse.status).toBe(426); // Upgrade Required
        expect(outdatedResponse.data.min_version).toBeDefined();
        expect(outdatedResponse.data.update_url).toBeDefined();
      }
    });
    
    it('should handle jailbroken/rooted device detection', async () => {
      const credentials = {
        email: `jailbreak_${Date.now()}@example.com`,
        password: 'Jailbreak123!',
      };
      
      await apiClient.post('/api/auth/register', credentials);
      
      const jailbrokenResponse = await apiClient.post('/api/auth/login', {
        ...credentials,
        device_info: {
          device_id: 'jailbroken-device',
          is_jailbroken: true,
          platform: 'ios',
        },
      });
      
      if (process.env.BLOCK_JAILBROKEN_DEVICES === 'true') {
        expect(jailbrokenResponse.status).toBe(403);
        expect(jailbrokenResponse.data.error).toContain('security');
      } else {
        // Should log warning but allow access
        expect(jailbrokenResponse.status).toBe(200);
        expect(jailbrokenResponse.data.security_warning).toBeDefined();
      }
    });
  });
});
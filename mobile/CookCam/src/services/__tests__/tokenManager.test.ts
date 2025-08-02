// Mock dependencies before imports
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../supabase');
jest.mock('../../utils/logger');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import logger from '../../utils/logger';
import TokenManager from '../tokenManager';

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('TokenManager', () => {
  let tokenManager: TokenManager;
  const mockTokenData = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000 // 1 hour from now
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Get a fresh instance for each test
    tokenManager = TokenManager.getInstance();
    // Reset private state
    (tokenManager as any).tokenData = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should load token from AsyncStorage', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

      await tokenManager.initialize();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('@CookCam:token');
      expect((tokenManager as any).tokenData).toEqual(mockTokenData);
    });

    it('should handle no stored token', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      await tokenManager.initialize();

      expect((tokenManager as any).tokenData).toBeNull();
    });

    it('should handle invalid JSON', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('invalid-json');

      await tokenManager.initialize();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to initialize token manager',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle AsyncStorage errors', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await tokenManager.initialize();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to initialize token manager',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('saveToken', () => {
    it('should save token data to AsyncStorage', async () => {
      const expiresIn = 3600; // 1 hour
      const expectedExpiresAt = Date.now() + expiresIn * 1000;

      await tokenManager.saveToken('access-token', 'refresh-token', expiresIn);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@CookCam:token',
        expect.stringContaining('access-token')
      );

      const savedData = JSON.parse(
        mockedAsyncStorage.setItem.mock.calls[0][1]
      );
      expect(savedData.accessToken).toBe('access-token');
      expect(savedData.refreshToken).toBe('refresh-token');
      expect(savedData.expiresAt).toBeCloseTo(expectedExpiresAt, -2);
    });

    it('should update internal token data', async () => {
      await tokenManager.saveToken('new-access', 'new-refresh', 7200);

      expect((tokenManager as any).tokenData).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: expect.any(Number)
      });
    });

    it('should handle save errors', async () => {
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Save error'));

      await tokenManager.saveToken('access', 'refresh', 3600);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to save token',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return stored access token', async () => {
      (tokenManager as any).tokenData = mockTokenData;

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('mock-access-token');
    });

    it('should initialize if no token data', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

      const token = await tokenManager.getAccessToken();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
      expect(token).toBe('mock-access-token');
    });

    it('should refresh token if near expiry', async () => {
      const nearExpiryToken = {
        ...mockTokenData,
        expiresAt: Date.now() + 4 * 60 * 1000 // 4 minutes from now
      };
      (tokenManager as any).tokenData = nearExpiryToken;

      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          }
        },
        error: null
      });

      const token = await tokenManager.getAccessToken();

      expect(mockedSupabase.auth.refreshSession).toHaveBeenCalled();
      expect(token).toBe('new-access-token');
    });

    it('should not refresh if token is still valid', async () => {
      const validToken = {
        ...mockTokenData,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
      };
      (tokenManager as any).tokenData = validToken;

      const token = await tokenManager.getAccessToken();

      expect(mockedSupabase.auth.refreshSession).not.toHaveBeenCalled();
      expect(token).toBe('mock-access-token');
    });

    it('should return null if no token available', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const token = await tokenManager.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', async () => {
      const expiredToken = {
        ...mockTokenData,
        expiresAt: Date.now() - 1000 // 1 second ago
      };
      (tokenManager as any).tokenData = expiredToken;

      const isExpired = await tokenManager.isTokenExpired();

      expect(isExpired).toBe(true);
    });

    it('should return false for valid token', async () => {
      (tokenManager as any).tokenData = mockTokenData;

      const isExpired = await tokenManager.isTokenExpired();

      expect(isExpired).toBe(false);
    });

    it('should return true if no token data', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const isExpired = await tokenManager.isTokenExpired();

      expect(isExpired).toBe(true);
    });

    it('should initialize if needed', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

      await tokenManager.isTokenExpired();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      (tokenManager as any).tokenData = mockTokenData;
    });

    it('should refresh token successfully', async () => {
      const newSessionData = {
        access_token: 'refreshed-access',
        refresh_token: 'refreshed-refresh',
        expires_in: 3600
      };

      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: newSessionData },
        error: null
      });

      const newToken = await tokenManager.refreshToken();

      expect(mockedSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'mock-refresh-token'
      });
      expect(newToken).toBe('refreshed-access');
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle refresh failure', async () => {
      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' }
      });

      const newToken = await tokenManager.refreshToken();

      expect(newToken).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Token refresh failed',
        expect.objectContaining({ error: expect.any(Object) })
      );
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@CookCam:token');
    });

    it('should return null if no refresh token', async () => {
      (tokenManager as any).tokenData = null;

      const newToken = await tokenManager.refreshToken();

      expect(newToken).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith('No refresh token available');
    });

    it('should handle refresh exceptions', async () => {
      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn()
        .mockRejectedValue(new Error('Network error'));

      const newToken = await tokenManager.refreshToken();

      expect(newToken).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Token refresh error',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should use default expires_in if not provided', async () => {
      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expires_in: undefined
          }
        },
        error: null
      });

      await tokenManager.refreshToken();

      const savedData = JSON.parse(
        mockedAsyncStorage.setItem.mock.calls[0][1]
      );
      expect(savedData.expiresAt).toBeCloseTo(Date.now() + 3600000, -3);
    });
  });

  describe('forceRefresh', () => {
    it('should call refreshToken', async () => {
      const refreshSpy = jest.spyOn(tokenManager, 'refreshToken')
        .mockResolvedValue('new-token');

      const result = await tokenManager.forceRefresh();

      expect(refreshSpy).toHaveBeenCalled();
      expect(result).toBe('new-token');
    });
  });

  describe('clearToken', () => {
    it('should clear token data and AsyncStorage', async () => {
      (tokenManager as any).tokenData = mockTokenData;

      await tokenManager.clearToken();

      expect((tokenManager as any).tokenData).toBeNull();
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@CookCam:token');
    });

    it('should handle clear errors', async () => {
      mockedAsyncStorage.removeItem.mockRejectedValue(new Error('Clear error'));

      await tokenManager.clearToken();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to clear token',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('getStoredSession', () => {
    it('should return stored session data', async () => {
      (tokenManager as any).tokenData = mockTokenData;

      const session = await tokenManager.getStoredSession();

      expect(session).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    });

    it('should initialize if no token data', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

      const session = await tokenManager.getStoredSession();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
      expect(session).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    });

    it('should return null if no token available', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const session = await tokenManager.getStoredSession();

      expect(session).toBeNull();
    });
  });

  describe('shouldRefresh (private)', () => {
    it('should return true when token is near expiry', () => {
      const nearExpiryToken = {
        ...mockTokenData,
        expiresAt: Date.now() + 3 * 60 * 1000 // 3 minutes from now
      };
      (tokenManager as any).tokenData = nearExpiryToken;

      const shouldRefresh = (tokenManager as any).shouldRefresh();

      expect(shouldRefresh).toBe(true);
    });

    it('should return false when token has enough time', () => {
      const validToken = {
        ...mockTokenData,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
      };
      (tokenManager as any).tokenData = validToken;

      const shouldRefresh = (tokenManager as any).shouldRefresh();

      expect(shouldRefresh).toBe(false);
    });

    it('should return false when no token data', () => {
      (tokenManager as any).tokenData = null;

      const shouldRefresh = (tokenManager as any).shouldRefresh();

      expect(shouldRefresh).toBe(false);
    });
  });
});
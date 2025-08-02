// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { cookCamApi } from '../../services/cookCamApi';
import tokenManager from '../../services/tokenManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../services/cookCamApi');
jest.mock('../../services/tokenManager');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('AuthContext', () => {
  const mockCookCamApi = cookCamApi as jest.Mocked<typeof cookCamApi>;
  const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockTokenManager.getAccessToken.mockResolvedValue(null);
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load stored user on mount', async () => {
      const storedUser = { id: '123', email: 'stored@example.com' };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedUser));
      mockTokenManager.getAccessToken.mockResolvedValueOnce('stored-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toEqual(storedUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Login', () => {
    it('should login user successfully', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockTokens = {
        access: 'access-token',
        refresh: 'refresh-token',
      };

      mockCookCamApi.login.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(mockCookCamApi.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@user',
        JSON.stringify(mockUser)
      );
    });

    it('should handle login failure', async () => {
      mockCookCamApi.login.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network error during login', async () => {
      mockCookCamApi.login.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'password');
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Logout', () => {
    it('should logout user successfully', async () => {
      // Setup authenticated state
      const mockUser = { id: '123', email: 'test@example.com' };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockUser));
      mockTokenManager.getAccessToken.mockResolvedValueOnce('token');
      mockCookCamApi.logout.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockCookCamApi.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@user');
    });

    it('should handle logout error gracefully', async () => {
      mockCookCamApi.logout.mockRejectedValueOnce(new Error('Logout failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if API fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Signup', () => {
    it('should signup user successfully', async () => {
      const mockUser = { id: '123', email: 'new@example.com' };
      const mockTokens = {
        access: 'access-token',
        refresh: 'refresh-token',
      };

      mockCookCamApi.signup.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signup('new@example.com', 'password', 'New User');
      });

      expect(mockCookCamApi.signup).toHaveBeenCalledWith(
        'new@example.com',
        'password',
        'New User'
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle signup failure', async () => {
      mockCookCamApi.signup.mockResolvedValueOnce({
        success: false,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signup('existing@example.com', 'password', 'User');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('Biometric Login', () => {
    it('should login with biometrics successfully', async () => {
      const mockUser = { id: '123', email: 'bio@example.com' };
      const biometricData = {
        email: 'bio@example.com',
        token: 'biometric-token',
      };

      mockCookCamApi.loginWithBiometrics.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: {
            access: 'access-token',
            refresh: 'refresh-token',
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithBiometrics(biometricData);
      });

      expect(mockCookCamApi.loginWithBiometrics).toHaveBeenCalledWith(biometricData);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should enable biometric login', async () => {
      mockCookCamApi.enableBiometricLogin.mockResolvedValueOnce({
        success: true,
        data: { enabled: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.enableBiometricLogin('test@example.com', 'refresh-token');
      });

      expect(mockCookCamApi.enableBiometricLogin).toHaveBeenCalledWith(
        'test@example.com',
        'refresh-token'
      );
    });
  });

  describe('Update User', () => {
    it('should update user profile', async () => {
      const initialUser = { id: '123', email: 'test@example.com', name: 'Test' };
      const updatedUser = { ...initialUser, name: 'Updated Name' };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(initialUser));
      mockTokenManager.getAccessToken.mockResolvedValueOnce('token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      await act(async () => {
        await result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@user',
        JSON.stringify(updatedUser)
      );
    });
  });

  describe('Refresh Token', () => {
    it('should refresh token when expired', async () => {
      const newTokens = {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      };

      mockTokenManager.getRefreshToken.mockResolvedValueOnce('old-refresh-token');
      mockCookCamApi.refreshToken.mockResolvedValueOnce({
        success: true,
        data: newTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockCookCamApi.refreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(newTokens);
    });

    it('should logout when refresh fails', async () => {
      mockTokenManager.getRefreshToken.mockResolvedValueOnce('old-refresh-token');
      mockCookCamApi.refreshToken.mockResolvedValueOnce({
        success: false,
        error: 'Invalid refresh token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      // Should logout on refresh failure
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Password Reset', () => {
    it('should request password reset', async () => {
      mockCookCamApi.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        data: { message: 'Reset email sent' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.requestPasswordReset('test@example.com');
      });

      expect(mockCookCamApi.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should reset password with token', async () => {
      mockCookCamApi.resetPassword.mockResolvedValueOnce({
        success: true,
        data: { message: 'Password reset successfully' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resetPassword('reset-token', 'new-password');
      });

      expect(mockCookCamApi.resetPassword).toHaveBeenCalledWith(
        'reset-token',
        'new-password'
      );
    });
  });
});
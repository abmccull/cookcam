// Mock dependencies before imports
jest.mock('../../services/secureStorage');
jest.mock('../../services/supabaseClient');
jest.mock('../../services/biometricAuth');
jest.mock('../../services/api');
jest.mock('../../utils/logger');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { secureStorage, SECURE_KEYS } from '../../services/secureStorage';
import { supabase } from '../../services/supabaseClient';
import BiometricAuthService from '../../services/biometricAuth';
import { apiClient } from '../../services/api';
import logger from '../../utils/logger';

const mockedSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  isCreator: false,
  level: 5,
  xp: 1250,
  streak: 7,
  badges: ['first_recipe', 'week_streak'],
  avatarUrl: 'https://example.com/avatar.jpg'
};

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600
};

describe('useAuth Hook', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (mockedSupabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    });

    (mockedSupabase.auth.onAuthStateChange as jest.Mock) = jest.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    });

    mockedApiClient.getUserProfile.mockResolvedValue({
      success: true,
      data: mockUser
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isCreatingProfile).toBe(false);
    });

    it('should check for existing session on mount', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockedSupabase.auth.getSession).toHaveBeenCalled();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should load user profile if session exists', async () => {
      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedSecureStorage.setSecureItem).toHaveBeenCalledWith(
        SECURE_KEYS.ACCESS_TOKEN,
        'mock-access-token'
      );
    });
  });

  describe('Login', () => {
    it('should login with email and password', async () => {
      (mockedSupabase.auth.signInWithPassword as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(mockedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle login errors', async () => {
      (mockedSupabase.auth.signInWithPassword as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong');
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle profile creation for new users', async () => {
      (mockedSupabase.auth.signInWithPassword as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });

      mockedApiClient.getUserProfile.mockResolvedValueOnce({
        success: false,
        error: 'Profile not found'
      });

      mockedApiClient.createUserProfile.mockResolvedValue({
        success: true,
        data: mockUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('new@example.com', 'password');
      });

      await waitFor(() => {
        expect(mockedApiClient.createUserProfile).toHaveBeenCalled();
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('Biometric Login', () => {
    const mockBiometricService = {
      checkBiometricCapabilities: jest.fn(),
      getStoredCredentials: jest.fn(),
      storeCredentialsForBiometric: jest.fn()
    };

    beforeEach(() => {
      (BiometricAuthService.getInstance as jest.Mock) = jest.fn().mockReturnValue(mockBiometricService);
    });

    it('should login with biometrics', async () => {
      const credentials = {
        email: 'test@example.com',
        token: 'biometric-token',
        refreshToken: 'biometric-refresh'
      };

      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithBiometrics(credentials);
      });

      expect(mockedSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'biometric-refresh'
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockBiometricService.storeCredentialsForBiometric).toHaveBeenCalledWith(
        'test@example.com',
        'mock-access-token',
        'mock-refresh-token'
      );
    });

    it('should handle biometric login failure', async () => {
      const credentials = {
        email: 'test@example.com',
        token: 'expired-token'
      };

      (mockedSupabase.auth.refreshSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.loginWithBiometrics(credentials);
        })
      ).rejects.toThrow('Failed to refresh session');
    });

    it('should enable biometric login', async () => {
      mockBiometricService.checkBiometricCapabilities.mockResolvedValue({
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true
      });

      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.enableBiometricLogin('test@example.com', 'token');
      });

      expect(mockBiometricService.checkBiometricCapabilities).toHaveBeenCalled();
      expect(mockBiometricService.storeCredentialsForBiometric).toHaveBeenCalled();
    });

    it('should handle biometric not available', async () => {
      mockBiometricService.checkBiometricCapabilities.mockResolvedValue({
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.enableBiometricLogin('test@example.com', 'token');
        })
      ).rejects.toThrow('Biometric authentication is not available');
    });

    it('should disable biometric login', async () => {
      mockBiometricService.clearStoredCredentials = jest.fn();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.disableBiometricLogin();
      });

      expect(mockBiometricService.clearStoredCredentials).toHaveBeenCalled();
    });
  });

  describe('Signup', () => {
    it('should signup new user', async () => {
      (mockedSupabase.auth.signUp as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });

      mockedApiClient.createUserProfile.mockResolvedValue({
        success: true,
        data: mockUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signup('new@example.com', 'password', 'New User', false);
      });

      expect(mockedSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password'
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle signup errors', async () => {
      (mockedSupabase.auth.signUp as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Email already exists' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signup('existing@example.com', 'password', 'User', false);
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should handle creator signup', async () => {
      (mockedSupabase.auth.signUp as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });

      const creatorUser = { ...mockUser, isCreator: true, creatorTier: 1 };
      mockedApiClient.createUserProfile.mockResolvedValue({
        success: true,
        data: creatorUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signup('creator@example.com', 'password', 'Creator', true);
      });

      await waitFor(() => {
        expect(result.current.user?.isCreator).toBe(true);
      });
    });
  });

  describe('Logout', () => {
    it('should logout user', async () => {
      (mockedSupabase.auth.signOut as jest.Mock) = jest.fn().mockResolvedValue({
        error: null
      });

      const mockNavigation = {
        reset: jest.fn()
      };

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Set initial user
      act(() => {
        result.current.updateUser(mockUser);
      });

      await act(async () => {
        await result.current.logout(mockNavigation);
      });

      expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockedSecureStorage.clearAllSecureData).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    });

    it('should handle logout errors', async () => {
      (mockedSupabase.auth.signOut as jest.Mock) = jest.fn().mockResolvedValue({
        error: { message: 'Logout failed' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Logout error:',
        expect.objectContaining({ message: 'Logout failed' })
      );
    });
  });

  describe('Update User', () => {
    it('should update user data', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.updateUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      const updates = { level: 6, xp: 1500 };
      act(() => {
        result.current.updateUser(updates);
      });

      expect(result.current.user).toEqual({
        ...mockUser,
        ...updates
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state changes', async () => {
      let authChangeCallback: any;
      
      (mockedSupabase.auth.onAuthStateChange as jest.Mock) = jest.fn((callback) => {
        authChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate auth state change
      await act(async () => {
        authChangeCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out
      await act(async () => {
        authChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('should cleanup subscription on unmount', () => {
      const unsubscribe = jest.fn();
      
      (mockedSupabase.auth.onAuthStateChange as jest.Mock) = jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe
          }
        }
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle session check errors', async () => {
      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Session check error:',
        expect.objectContaining({ message: 'Session error' })
      );
    });

    it('should handle profile loading errors', async () => {
      (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      mockedApiClient.getUserProfile.mockResolvedValue({
        success: false,
        error: 'API error'
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('getUserProfile'),
        expect.any(String)
      );
    });
  });
});
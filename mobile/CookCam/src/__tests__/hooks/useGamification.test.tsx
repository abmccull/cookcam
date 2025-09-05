// Mock dependencies before imports
jest.mock('../../context/AuthContext');
jest.mock('../../services/gamificationService');
jest.mock('../../services/streakService');
jest.mock('expo-secure-store');
jest.mock('../../utils/logger');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { GamificationProvider, useGamification, XP_VALUES } from '../../context/GamificationContext';
import { useAuth } from '../../context/AuthContext';
import GamificationService from '../../services/gamificationService';
import { StreakService } from '../../services/streakService';
import * as SecureStore from 'expo-secure-store';
import logger from '../../utils/logger';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGamificationService = GamificationService.getInstance() as jest.Mocked<GamificationService>;
const mockedStreakService = StreakService as jest.Mocked<typeof StreakService>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
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
  badges: ['first_recipe', 'week_streak']
};

describe('useGamification Hook', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <GamificationProvider>{children}</GamificationProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    mockedUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isCreatingProfile: false,
      login: jest.fn(),
      loginWithBiometrics: jest.fn(),
      enableBiometricLogin: jest.fn(),
      disableBiometricLogin: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn()
    });

    // Default mock implementations
    mockedGamificationService.getProgress = jest.fn().mockResolvedValue({
      success: true,
      data: {
        total_xp: 1250,
        current_xp: 250,
        level: 5
      }
    });

    mockedStreakService.getStreakData = jest.fn().mockResolvedValue({
      current_streak: 7,
      longest_streak: 15,
      freeze_tokens: 2,
      last_cook_date: '2024-01-14'
    });

    mockedSecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
    mockedSecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      expect(result.current.xp).toBe(0);
      expect(result.current.level).toBe(1);
      expect(result.current.levelProgress).toBe(0);
      expect(result.current.streak).toBe(0);
      expect(result.current.freezeTokens).toBe(0);
      expect(result.current.badges).toEqual([]);
      expect(result.current.xpNotification.visible).toBe(false);
    });

    it('should load gamification progress on mount', async () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(mockedGamificationService.getProgress).toHaveBeenCalled();
      });

      expect(result.current.xp).toBe(1250);
      expect(result.current.level).toBe(5);
    });

    it('should load streak data on mount', async () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(mockedStreakService.getStreakData).toHaveBeenCalledWith('user-123');
      });

      expect(result.current.streak).toBe(7);
      expect(result.current.freezeTokens).toBe(2);
    });
  });

  describe('Add XP', () => {
    it('should add XP successfully', async () => {
      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xp_gained: 50,
          total_xp: 1300,
          level: 5
        }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(50, 'recipe_created');
      });

      expect(mockedGamificationService.addXP).toHaveBeenCalledWith(
        'user-123',
        50,
        'recipe_created',
        expect.any(Object)
      );

      expect(result.current.xpNotification).toEqual({
        visible: true,
        xpGained: 50,
        reason: 'recipe_created',
        showConfetti: false
      });
    });

    it('should show confetti for large XP gains', async () => {
      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xp_gained: 150,
          total_xp: 1400,
          level: 5
        }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(150, 'achievement_unlocked');
      });

      expect(result.current.xpNotification.showConfetti).toBe(true);
    });

    it('should handle level up', async () => {
      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: {
          xp_gained: 500,
          total_xp: 2000,
          level: 6
        }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(500, 'level_up');
      });

      await waitFor(() => {
        expect(result.current.level).toBe(6);
      });
    });

    it('should handle XP addition failure', async () => {
      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to add XP'
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(50, 'test');
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '❌ Failed to add XP:',
        'Failed to add XP'
      );
    });

    it('should not add XP for anonymous users', async () => {
      mockedUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isCreatingProfile: false,
        login: jest.fn(),
        loginWithBiometrics: jest.fn(),
        enableBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn()
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(50, 'test');
      });

      expect(mockedGamificationService.addXP).not.toHaveBeenCalled();
    });
  });

  describe('Streak Management', () => {
    it('should check streak', async () => {
      mockedStreakService.updateStreak = jest.fn().mockResolvedValue(true);
      mockedStreakService.getStreakData = jest.fn().mockResolvedValue({
        current_streak: 8,
        longest_streak: 15,
        freeze_tokens: 2
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.checkStreak();
      });

      expect(mockedStreakService.updateStreak).toHaveBeenCalledWith('user-123');
      expect(result.current.streak).toBe(8);
    });

    it('should handle streak milestones', async () => {
      mockedStreakService.updateStreak = jest.fn().mockResolvedValue(true);
      mockedStreakService.getStreakData = jest.fn().mockResolvedValue({
        current_streak: 7,
        longest_streak: 7,
        freeze_tokens: 3
      });

      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: { xp_gained: 50 }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.checkStreak();
      });

      // Should award bonus XP for 7-day streak
      expect(mockedGamificationService.addXP).toHaveBeenCalledWith(
        'user-123',
        50,
        'Week Warrior! 7 day streak',
        expect.any(Object)
      );
    });

    it('should use freeze token', async () => {
      mockedStreakService.useFreezeToken = jest.fn().mockResolvedValue(true);
      mockedStreakService.getStreakData = jest.fn().mockResolvedValue({
        current_streak: 7,
        freeze_tokens: 1
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      let freezeResult: boolean = false;
      await act(async () => {
        freezeResult = await result.current.useFreeze();
      });

      expect(freezeResult).toBe(true);
      expect(mockedStreakService.useFreezeToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String)
      );
      expect(result.current.freezeTokens).toBe(1);
    });

    it('should handle freeze token failure', async () => {
      mockedStreakService.useFreezeToken = jest.fn().mockResolvedValue(false);

      const { result } = renderHook(() => useGamification(), { wrapper });

      let freezeResult: boolean = true;
      await act(async () => {
        freezeResult = await result.current.useFreeze();
      });

      expect(freezeResult).toBe(false);
    });
  });

  describe('Badge Management', () => {
    it('should unlock badge', async () => {
      mockedGamificationService.unlockBadge = jest.fn().mockResolvedValue({
        success: true,
        data: {
          badge_id: 'master_chef',
          unlocked_at: '2024-01-15'
        }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.unlockBadge('master_chef');
      });

      expect(mockedGamificationService.unlockBadge).toHaveBeenCalledWith(
        'master_chef',
        expect.any(Object)
      );

      // Should add XP for unlocking achievement
      expect(mockedGamificationService.addXP).toHaveBeenCalledWith(
        'user-123',
        XP_VALUES.UNLOCK_ACHIEVEMENT,
        'Achievement Unlocked!',
        expect.any(Object)
      );
    });

    it('should handle badge unlock failure', async () => {
      mockedGamificationService.unlockBadge = jest.fn().mockResolvedValue({
        success: false,
        error: 'Badge already unlocked'
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.unlockBadge('existing_badge');
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '❌ Failed to unlock badge:',
        'Badge already unlocked'
      );
    });

    it('should load badges from storage', async () => {
      const storedBadges = [
        { id: 'badge1', name: 'First Recipe', unlockedAt: '2024-01-01' },
        { id: 'badge2', name: 'Week Streak', unlockedAt: '2024-01-07' }
      ];

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(storedBadges));

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(result.current.badges).toHaveLength(2);
      });
    });
  });

  describe('Level Progress', () => {
    it('should calculate level progress correctly', async () => {
      mockedGamificationService.getProgress = jest.fn().mockResolvedValue({
        success: true,
        data: {
          total_xp: 1250,
          current_xp: 250,
          level: 5
        }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(result.current.levelProgress).toBeGreaterThan(0);
        expect(result.current.levelProgress).toBeLessThan(100);
      });
    });

    it('should calculate next level XP', async () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(result.current.nextLevelXP).toBeGreaterThan(0);
      });
    });
  });

  describe('XP Notification', () => {
    it('should show XP notification', async () => {
      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: { xp_gained: 25 }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(25, 'daily_bonus');
      });

      expect(result.current.xpNotification).toEqual({
        visible: true,
        xpGained: 25,
        reason: 'daily_bonus',
        showConfetti: false
      });
    });

    it('should hide XP notification', () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      act(() => {
        result.current.hideXPNotification();
      });

      expect(result.current.xpNotification.visible).toBe(false);
    });

    it('should auto-hide notification after delay', async () => {
      jest.useFakeTimers();

      mockedGamificationService.addXP = jest.fn().mockResolvedValue({
        success: true,
        data: { xp_gained: 10 }
      });

      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.addXP(10, 'test');
      });

      expect(result.current.xpNotification.visible).toBe(true);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.xpNotification.visible).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Force Refresh', () => {
    it('should force refresh user stats', async () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.refreshUserStats();
      });

      expect(mockedGamificationService.getProgress).toHaveBeenCalled();
      expect(mockedStreakService.getStreakData).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should cache gamification data', async () => {
      const { result } = renderHook(() => useGamification(), { wrapper });

      await act(async () => {
        await result.current.loadGamificationProgress();
      });

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'gamification_progress',
        expect.any(String)
      );
    });

    it('should load from cache if available', async () => {
      const cachedData = {
        xp: 2000,
        level: 8,
        streak: 10,
        freezeTokens: 3,
        badges: [],
        lastUpdated: Date.now()
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(result.current.xp).toBe(2000);
        expect(result.current.level).toBe(8);
      });
    });

    it('should invalidate stale cache', async () => {
      const staleData = {
        xp: 2000,
        level: 8,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000) // 25 hours old
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(staleData));

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(mockedGamificationService.getProgress).toHaveBeenCalled();
      });
    });
  });

  describe('XP Values', () => {
    it('should have correct XP values defined', () => {
      expect(XP_VALUES.SCAN_INGREDIENTS).toBe(15);
      expect(XP_VALUES.COMPLETE_RECIPE).toBe(75);
      expect(XP_VALUES.LEVEL_UP).toBe(300);
      expect(XP_VALUES.BECOME_CREATOR).toBe(500);
      expect(XP_VALUES.VIRAL_PHOTO).toBe(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle gamification service errors', async () => {
      mockedGamificationService.getProgress = jest.fn().mockRejectedValue(
        new Error('Service error')
      );

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(mockedLogger.error).toHaveBeenCalled();
      });

      // Should still be usable with default values
      expect(result.current.xp).toBe(0);
      expect(result.current.level).toBe(1);
    });

    it('should handle streak service errors', async () => {
      mockedStreakService.getStreakData = jest.fn().mockRejectedValue(
        new Error('Streak error')
      );

      const { result } = renderHook(() => useGamification(), { wrapper });

      await waitFor(() => {
        expect(mockedLogger.error).toHaveBeenCalled();
      });

      expect(result.current.streak).toBe(0);
    });
  });
});
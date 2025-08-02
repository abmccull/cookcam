import logger from '../../utils/logger';

// Mock dependencies before importing the service
jest.mock('../../utils/logger');

// Mock the supabaseClient service
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Mock the API service
jest.mock('../../services/api', () => ({
  gamificationService: {
    addXP: jest.fn(),
  },
}));

// Now import after mocking
import GamificationService from '../../services/gamificationService';
import { supabase } from '../../services/supabaseClient';
import { gamificationService } from '../../services/api';

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGamificationAPI = gamificationService as jest.Mocked<typeof gamificationService>;

describe('GamificationService', () => {
  let service: GamificationService;
  const mockUserId = 'test-user-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton instance for testing
    (GamificationService as any).instance = null;
    service = GamificationService.getInstance();

    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GamificationService.getInstance();
      const instance2 = GamificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addXP', () => {
    const mockXPData = {
      action: 'recipe_completed',
      points: 50,
      metadata: { recipe_id: 'recipe-123' }
    };

    it('should add XP successfully', async () => {
      const expectedResult = {
        new_total_xp: 150,
        new_level: 5,
        level_up: false,
        badges_earned: []
      };

      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: true,
        data: expectedResult
      });

      const result = await service.addXP(mockXPData);

      expect(result).toEqual(expectedResult);
      expect(mockGamificationAPI.addXP).toHaveBeenCalledWith({
        userId: mockUserId,
        ...mockXPData
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Added XP:',
        expect.objectContaining(mockXPData)
      );
    });

    it('should handle level up with badges', async () => {
      const levelUpResult = {
        new_total_xp: 500,
        new_level: 6,
        level_up: true,
        badges_earned: ['level_6_achiever', 'xp_master']
      };

      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: true,
        data: levelUpResult
      });

      const result = await service.addXP(mockXPData);

      expect(result.level_up).toBe(true);
      expect(result.badges_earned).toHaveLength(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Level up! New level:',
        6
      );
    });

    it('should handle API errors', async () => {
      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: false,
        error: 'XP addition failed'
      });

      await expect(service.addXP(mockXPData)).rejects.toThrow('XP addition failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to add XP:',
        'XP addition failed'
      );
    });

    it('should handle network errors', async () => {
      mockGamificationAPI.addXP.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.addXP(mockXPData)).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'XP addition error:',
        expect.any(Error)
      );
    });

    it('should require user authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      await expect(service.addXP(mockXPData)).rejects.toThrow('User not authenticated');
      expect(mockGamificationAPI.addXP).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    const mockProfile = {
      user_id: mockUserId,
      total_xp: 1250,
      current_level: 5,
      xp_to_next_level: 250,
      current_streak: 7,
      longest_streak: 15,
      recipes_completed: 23,
      ingredients_scanned: 45,
      badges_earned: ['first_recipe', 'streak_master']
    };

    it('should get user profile successfully', async () => {
      const mockQuery = mockSupabase.from().single;
      mockQuery.mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      const result = await service.getUserProfile();

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_gamification_profiles');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should handle profile not found', async () => {
      const mockQuery = mockSupabase.from().single;
      mockQuery.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const result = await service.getUserProfile();

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('User profile not found');
    });

    it('should handle database errors', async () => {
      const mockQuery = mockSupabase.from().single;
      mockQuery.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(service.getUserProfile()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user profile:',
        expect.any(Object)
      );
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboard = [
      { user_id: 'user-1', username: 'Player1', total_xp: 2000, rank: 1 },
      { user_id: 'user-2', username: 'Player2', total_xp: 1500, rank: 2 },
      { user_id: mockUserId, username: 'TestUser', total_xp: 1250, rank: 3 }
    ];

    it('should get leaderboard with default limit', async () => {
      const mockQuery = mockSupabase.from().limit;
      mockQuery.mockResolvedValueOnce({
        data: mockLeaderboard,
        error: null
      });

      const result = await service.getLeaderboard();

      expect(result).toEqual(mockLeaderboard);
      expect(mockSupabase.from).toHaveBeenCalledWith('leaderboard_view');
      expect(mockSupabase.from().order).toHaveBeenCalledWith('total_xp', { ascending: false });
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(50);
    });

    it('should get leaderboard with custom limit', async () => {
      const mockQuery = mockSupabase.from().limit;
      mockQuery.mockResolvedValueOnce({
        data: mockLeaderboard.slice(0, 10),
        error: null
      });

      const result = await service.getLeaderboard(10);

      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(3); // Mock data length
    });

    it('should handle leaderboard errors', async () => {
      const mockQuery = mockSupabase.from().limit;
      mockQuery.mockResolvedValueOnce({
        data: null,
        error: { message: 'Leaderboard unavailable' }
      });

      await expect(service.getLeaderboard()).rejects.toThrow('Leaderboard unavailable');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get leaderboard:',
        expect.any(Object)
      );
    });
  });

  describe('getUserBadges', () => {
    const mockBadges = [
      {
        badge_id: 'first_recipe',
        name: 'First Recipe',
        description: 'Completed your first recipe',
        icon_url: 'https://example.com/badges/first_recipe.png',
        earned_at: '2024-01-10T09:00:00Z',
        rarity: 'common'
      },
      {
        badge_id: 'streak_master',
        name: 'Streak Master',
        description: 'Maintained a 7-day cooking streak',
        icon_url: 'https://example.com/badges/streak_master.png',
        earned_at: '2024-01-15T10:30:00Z',
        rarity: 'rare'
      }
    ];

    it('should get user badges successfully', async () => {
      const mockQuery = mockSupabase.from().order;
      mockQuery.mockResolvedValueOnce({
        data: mockBadges,
        error: null
      });

      const result = await service.getUserBadges();

      expect(result).toEqual(mockBadges);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_badges');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockSupabase.from().order).toHaveBeenCalledWith('earned_at', { ascending: false });
    });

    it('should return empty array when no badges found', async () => {
      const mockQuery = mockSupabase.from().order;
      mockQuery.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await service.getUserBadges();

      expect(result).toEqual([]);
    });

    it('should handle badges query errors', async () => {
      const mockQuery = mockSupabase.from().order;
      mockQuery.mockResolvedValueOnce({
        data: null,
        error: { message: 'Badges query failed' }
      });

      await expect(service.getUserBadges()).rejects.toThrow('Badges query failed');
    });
  });

  describe('updateStreak', () => {
    const mockStreakData = {
      action: 'recipe_completed',
      date: '2024-01-15'
    };

    it('should update streak successfully', async () => {
      const mockStreakResult = {
        current_streak: 8,
        longest_streak: 15,
        streak_broken: false,
        new_badges: []
      };

      mockGamificationAPI.updateStreak.mockResolvedValueOnce({
        success: true,
        data: mockStreakResult
      });

      const result = await service.updateStreak(mockStreakData);

      expect(result).toEqual(mockStreakResult);
      expect(mockGamificationAPI.updateStreak).toHaveBeenCalledWith({
        userId: mockUserId,
        ...mockStreakData
      });
    });

    it('should handle streak break', async () => {
      const mockStreakResult = {
        current_streak: 1,
        longest_streak: 15,
        streak_broken: true,
        previous_streak: 7
      };

      mockGamificationAPI.updateStreak.mockResolvedValueOnce({
        success: true,
        data: mockStreakResult
      });

      const result = await service.updateStreak(mockStreakData);

      expect(result.streak_broken).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Streak broken! Previous streak:',
        7
      );
    });

    it('should handle streak update errors', async () => {
      mockGamificationAPI.updateStreak.mockResolvedValueOnce({
        success: false,
        error: 'Streak update failed'
      });

      await expect(service.updateStreak(mockStreakData)).rejects.toThrow('Streak update failed');
    });
  });

  describe('Caching', () => {
    it('should cache user profile data', async () => {
      const mockProfile = {
        user_id: mockUserId,
        total_xp: 1250,
        current_level: 5
      };

      const mockQuery = mockSupabase.from().single;
      mockQuery.mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      // First call should hit database
      const result1 = await service.getUserProfile();
      expect(result1).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);

      // Clear mocks to verify cache usage
      jest.clearAllMocks();

      // Second call should use cache
      const result2 = await service.getUserProfile();
      expect(result2).toEqual(mockProfile);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should clear cache on profile updates', async () => {
      // Cache initial profile
      const mockQuery = mockSupabase.from().single;
      mockQuery.mockResolvedValueOnce({
        data: { user_id: mockUserId, total_xp: 1250 },
        error: null
      });

      await service.getUserProfile();

      // Add XP should clear cache
      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: true,
        data: { new_total_xp: 1300, new_level: 5, level_up: false }
      });

      await service.addXP({ action: 'test', points: 50 });

      // Next profile call should hit database again
      mockQuery.mockResolvedValueOnce({
        data: { user_id: mockUserId, total_xp: 1300 },
        error: null
      });

      const updatedProfile = await service.getUserProfile();
      expect(updatedProfile.total_xp).toBe(1300);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = GamificationService.getInstance();
      const instance2 = GamificationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('addXP', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);
    });

    it('should successfully add XP', async () => {
      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: true,
        data: {
          new_total_xp: 150,
          new_level: 2,
          xp_gained: 50,
        },
      });

      const result = await service.addXP(mockUserId, 50, 'recipe_completed');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        xp_gained: 50,
        total_xp: 150,
        level: 2,
      });
      expect(mockGamificationAPI.addXP).toHaveBeenCalledWith(50, 'recipe_completed', {});
      expect(mockLogger.debug).toHaveBeenCalledWith('🎮 Adding 50 XP for action: recipe_completed');
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      const result = await service.addXP(mockUserId, 50, 'recipe_completed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(mockLogger.debug).toHaveBeenCalledWith('❌ No authenticated user found');
    });

    it('should implement cooldown mechanism', async () => {
      const mockNow = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      mockGamificationAPI.addXP.mockResolvedValue({
        success: true,
        data: { new_total_xp: 150, new_level: 2 },
      });

      // First call should succeed
      let result = await service.addXP(mockUserId, 50, 'recipe_completed');
      expect(result.success).toBe(true);

      // Immediate second call should be blocked by cooldown
      jest.spyOn(Date, 'now').mockReturnValue(mockNow + 1000); // 1 second later
      result = await service.addXP(mockUserId, 50, 'recipe_completed');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Action on cooldown');
      expect(mockLogger.debug).toHaveBeenCalledWith('⏳ XP call for recipe_completed is on cooldown');

      jest.restoreAllMocks();
    });

    it('should handle API failures', async () => {
      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      const result = await service.addXP(mockUserId, 50, 'recipe_completed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ API call failed:', 'Database error');
    });

    it('should handle API exceptions', async () => {
      mockGamificationAPI.addXP.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.addXP(mockUserId, 50, 'recipe_completed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to call XP API');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ API call exception:', expect.any(Error));
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'));

      const result = await service.addXP(mockUserId, 50, 'recipe_completed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add XP');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Unexpected error adding XP:', expect.any(Error));
    });
  });

  describe('checkStreak', () => {
    it('should return streak data for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      } as any);

      const result = await service.checkStreak();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        current_streak: 1,
        longest_streak: 1,
        last_check_in: expect.any(String),
      });
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      const result = await service.checkStreak();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle auth errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'));

      const result = await service.checkStreak();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check streak');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Error checking streak:', expect.any(Error));
    });
  });

  describe('getProgress', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);
    });

    it('should successfully get user progress', async () => {
      const mockProgressData = {
        total_xp: 150,
        xp: 50,
        level: 2,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockProgressData,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getProgress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total_xp: 150,
        current_xp: 50,
        level: 2,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockQuery.select).toHaveBeenCalledWith('total_xp, xp, level');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should handle database errors', async () => {
      const error = { message: 'Database error' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getProgress();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Error getting progress:', error);
    });

    it('should handle missing data gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: {},
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getProgress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total_xp: 0,
        current_xp: 0,
        level: 1,
      });
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboardData = [
      {
        id: 'user-1',
        name: 'Chef Master',
        avatar_url: 'avatar1.jpg',
        level: 5,
        total_xp: 500,
        is_creator: true,
        creator_tier: 2,
      },
      {
        id: 'user-2',
        name: 'Cooking Pro',
        avatar_url: 'avatar2.jpg',
        level: 3,
        total_xp: 300,
        is_creator: false,
        creator_tier: null,
      },
    ];

    it('should successfully get leaderboard', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockLeaderboardData,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getLeaderboard('xp', 'weekly');

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(2);
      expect(result.data?.leaderboard[0]).toEqual({
        rank: 1,
        xp_total: 500,
        xp_gained: 0,
        users: {
          id: 'user-1',
          name: 'Chef Master',
          avatar_url: 'avatar1.jpg',
          level: 5,
          is_creator: true,
          creator_tier: 2,
        },
      });
      expect(result.data?.metadata.type).toBe('xp');
      expect(result.data?.metadata.period).toBe('weekly');
    });

    it('should filter out users with zero XP', async () => {
      const dataWithZeroXP = [
        ...mockLeaderboardData,
        {
          id: 'user-3',
          name: 'Newbie',
          avatar_url: null,
          level: 1,
          total_xp: 0,
          is_creator: false,
          creator_tier: null,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: dataWithZeroXP,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getLeaderboard();

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(2); // Should exclude the zero XP user
    });

    it('should handle database errors', async () => {
      const error = { message: 'Query failed' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: null,
          error,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getLeaderboard();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Error fetching leaderboard:', error);
    });

    it('should handle empty leaderboard data', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await service.getLeaderboard();

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(0);
    });
  });

  describe('unlockBadge', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);
    });

    it('should successfully unlock badge', async () => {
      const result = await service.unlockBadge('first_recipe');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        badge_id: 'first_recipe',
        unlocked_at: expect.any(String),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('🏅 Unlocking badge: first_recipe');
      expect(mockLogger.debug).toHaveBeenCalledWith(`✅ Badge first_recipe unlocked for user ${mockUserId}`);
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      const result = await service.unlockBadge('first_recipe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle auth errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'));

      const result = await service.unlockBadge('first_recipe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to unlock badge');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Error unlocking badge:', expect.any(Error));
    });
  });

  describe('getUserRank', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);
    });

    it('should successfully get user rank', async () => {
      // Mock user data query
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 300 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUserQuery as any);

      // Mock count query
      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValueOnce({
          count: 2, // 2 users have more XP
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockCountQuery as any);

      const result = await service.getUserRank();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rank: 3, // 2 users ahead + this user = rank 3
        total_xp: 300,
      });
    });

    it('should get rank for specific user ID', async () => {
      const targetUserId = 'other-user-456';
      
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 150 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUserQuery as any);

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValueOnce({
          count: 5,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockCountQuery as any);

      const result = await service.getUserRank(targetUserId);

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe(6);
      expect(mockUserQuery.eq).toHaveBeenCalledWith('id', targetUserId);
    });

    it('should handle user not found', async () => {
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'User not found' },
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUserQuery as any);

      const result = await service.getUserRank();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle count query errors', async () => {
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 300 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockUserQuery as any);

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValueOnce({
          count: null,
          error: { message: 'Count failed' },
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockCountQuery as any);

      const result = await service.getUserRank();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count failed');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete gamification workflow', async () => {
      // Setup authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      // 1. Add XP for completing a recipe
      mockGamificationAPI.addXP.mockResolvedValueOnce({
        success: true,
        data: { new_total_xp: 150, new_level: 2, xp_gained: 50 },
      });

      let result = await service.addXP(mockUserId, 50, 'recipe_completed');
      expect(result.success).toBe(true);

      // 2. Check streak
      result = await service.checkStreak();
      expect(result.success).toBe(true);

      // 3. Get updated progress
      const mockProgressQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 150, xp: 50, level: 2 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockProgressQuery as any);

      result = await service.getProgress();
      expect(result.success).toBe(true);
      expect(result.data?.level).toBe(2);

      // 4. Unlock a badge
      result = await service.unlockBadge('level_2_reached');
      expect(result.success).toBe(true);
    });
  });
});
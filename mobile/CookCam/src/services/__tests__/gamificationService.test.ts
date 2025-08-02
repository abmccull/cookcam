// Mock dependencies before imports
jest.mock('../supabaseClient');
jest.mock('../../utils/logger');
jest.mock('../api');

import GamificationService from '../gamificationService';
import { supabase } from '../supabaseClient';
import logger from '../../utils/logger';
import { gamificationService as apiGamificationService } from '../api';

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedApiGamificationService = apiGamificationService as jest.Mocked<typeof apiGamificationService>;

// Get singleton instance
const gamificationService = GamificationService.getInstance();

describe('GamificationService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset cooldown tracking
    (gamificationService as any).lastXPCall = {};
    
    // Default mock setup
    (mockedSupabase.auth.getUser as jest.Mock) = jest.fn().mockResolvedValue({
      data: { user: mockUser }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GamificationService.getInstance();
      const instance2 = GamificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addXP', () => {
    it('should add XP successfully', async () => {
      mockedApiGamificationService.addXP.mockResolvedValue({
        success: true,
        data: {
          new_total_xp: 1250,
          new_level: 5,
          xp_gained: 50
        }
      });

      const result = await gamificationService.addXP('user-123', 50, 'recipe_created');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        xp_gained: 50,
        total_xp: 1250,
        level: 5
      });
      expect(mockedApiGamificationService.addXP).toHaveBeenCalledWith(
        50,
        'recipe_created',
        {}
      );
    });

    it('should prevent spam calls with cooldown', async () => {
      mockedApiGamificationService.addXP.mockResolvedValue({
        success: true,
        data: { new_total_xp: 100, new_level: 1 }
      });

      // First call should succeed
      const result1 = await gamificationService.addXP('user-123', 10, 'scan_complete');
      expect(result1.success).toBe(true);

      // Immediate second call should be blocked
      const result2 = await gamificationService.addXP('user-123', 10, 'scan_complete');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Action on cooldown');
      expect(mockedApiGamificationService.addXP).toHaveBeenCalledTimes(1);
    });

    it('should allow calls after cooldown period', async () => {
      mockedApiGamificationService.addXP.mockResolvedValue({
        success: true,
        data: { new_total_xp: 100, new_level: 1 }
      });

      // First call
      await gamificationService.addXP('user-123', 10, 'scan_complete');
      
      // Advance time past cooldown
      jest.advanceTimersByTime(5001);
      
      // Second call should succeed
      const result = await gamificationService.addXP('user-123', 10, 'scan_complete');
      expect(result.success).toBe(true);
      expect(mockedApiGamificationService.addXP).toHaveBeenCalledTimes(2);
    });

    it('should handle unauthenticated user', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null }
      });

      const result = await gamificationService.addXP('user-123', 50, 'recipe_created');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(mockedApiGamificationService.addXP).not.toHaveBeenCalled();
    });

    it('should handle API failure', async () => {
      mockedApiGamificationService.addXP.mockResolvedValue({
        success: false,
        error: 'Server error'
      });

      const result = await gamificationService.addXP('user-123', 50, 'recipe_created');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle API exception', async () => {
      mockedApiGamificationService.addXP.mockRejectedValue(new Error('Network error'));

      const result = await gamificationService.addXP('user-123', 50, 'recipe_created');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to call XP API');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        '❌ API call exception:',
        expect.any(Error)
      );
    });

    it('should handle unexpected errors', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const result = await gamificationService.addXP('user-123', 50, 'recipe_created');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add XP');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should pass metadata to API', async () => {
      mockedApiGamificationService.addXP.mockResolvedValue({
        success: true,
        data: { new_total_xp: 100 }
      });

      const metadata = { recipeId: 'recipe-123', difficulty: 'hard' };
      await gamificationService.addXP('user-123', 75, 'recipe_created', metadata);

      expect(mockedApiGamificationService.addXP).toHaveBeenCalledWith(
        75,
        'recipe_created',
        metadata
      );
    });
  });

  describe('checkStreak', () => {
    it('should return streak data for authenticated user', async () => {
      const result = await gamificationService.checkStreak();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('current_streak', 1);
      expect(result.data).toHaveProperty('longest_streak', 1);
      expect(result.data).toHaveProperty('last_check_in');
    });

    it('should handle unauthenticated user', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null }
      });

      const result = await gamificationService.checkStreak();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle errors', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const result = await gamificationService.checkStreak();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check streak');
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should fetch user progress successfully', async () => {
      const mockProgress = {
        total_xp: 1500,
        xp: 250,
        level: 5
      };

      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProgress,
              error: null
            })
          })
        })
      });

      const result = await gamificationService.getProgress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total_xp: 1500,
        current_xp: 250,
        level: 5
      });
    });

    it('should handle missing data with defaults', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          })
        })
      });

      const result = await gamificationService.getProgress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total_xp: 0,
        current_xp: 0,
        level: 1
      });
    });

    it('should handle database errors', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const result = await gamificationService.getProgress();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null }
      });

      const result = await gamificationService.getProgress();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboardData = [
      { id: '1', name: 'User 1', total_xp: 5000, level: 10, avatar_url: 'url1', is_creator: true, creator_tier: 2 },
      { id: '2', name: 'User 2', total_xp: 3000, level: 7, avatar_url: 'url2', is_creator: false, creator_tier: null },
      { id: '3', name: 'User 3', total_xp: 1000, level: 3, avatar_url: null, is_creator: false, creator_tier: null }
    ];

    beforeEach(() => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockLeaderboardData,
                error: null
              })
            })
          })
        })
      });
    });

    it('should fetch leaderboard successfully', async () => {
      const result = await gamificationService.getLeaderboard('xp', 'weekly');

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(3);
      expect(result.data?.leaderboard[0]).toEqual({
        rank: 1,
        xp_total: 5000,
        xp_gained: 0,
        users: {
          id: '1',
          name: 'User 1',
          avatar_url: 'url1',
          level: 10,
          is_creator: true,
          creator_tier: 2
        }
      });
      expect(result.data?.metadata).toEqual({
        type: 'xp',
        period: 'weekly',
        updated_at: expect.any(String),
        note: 'Simplified leaderboard based on total XP'
      });
    });

    it('should filter out users with zero XP', async () => {
      const dataWithZeroXP = [
        ...mockLeaderboardData,
        { id: '4', name: 'User 4', total_xp: 0, level: 1 },
        { id: '5', name: 'User 5', total_xp: null, level: 1 }
      ];

      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: dataWithZeroXP,
                error: null
              })
            })
          })
        })
      });

      const result = await gamificationService.getLeaderboard();

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(3);
    });

    it('should handle database errors', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      });

      const result = await gamificationService.getLeaderboard();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle empty leaderboard', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const result = await gamificationService.getLeaderboard();

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard).toHaveLength(0);
    });

    it('should use default parameters', async () => {
      await gamificationService.getLeaderboard();

      expect(mockedSupabase.from).toHaveBeenCalledWith('users');
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🏆 Fetching xp leaderboard for allTime'
      );
    });
  });

  describe('unlockBadge', () => {
    it('should unlock badge successfully', async () => {
      const result = await gamificationService.unlockBadge('first_recipe', { recipeId: '123' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('badge_id', 'first_recipe');
      expect(result.data).toHaveProperty('unlocked_at');
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        `✅ Badge first_recipe unlocked for user ${mockUser.id}`
      );
    });

    it('should handle unauthenticated user', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null }
      });

      const result = await gamificationService.unlockBadge('badge_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle errors', async () => {
      (mockedSupabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const result = await gamificationService.unlockBadge('badge_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to unlock badge');
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserRank', () => {
    beforeEach(() => {
      // Mock user data fetch
      (mockedSupabase.from as jest.Mock) = jest.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockImplementation((fields) => {
              if (fields === 'total_xp') {
                return {
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { total_xp: 1500 },
                      error: null
                    })
                  })
                };
              } else {
                return {
                  gt: jest.fn().mockResolvedValue({
                    count: 10,
                    error: null
                  })
                };
              }
            })
          };
        }
      });
    });

    it('should get user rank successfully', async () => {
      const result = await gamificationService.getUserRank();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rank: 11,
        total_xp: 1500
      });
    });

    it('should get rank for specific user', async () => {
      const result = await gamificationService.getUserRank('other-user-id');

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe(11);
    });

    it('should handle user not found', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      });

      const result = await gamificationService.getUserRank();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle rank 1 user', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockImplementation((fields) => {
          if (fields === 'total_xp') {
            return {
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { total_xp: 10000 },
                  error: null
                })
              })
            };
          } else {
            return {
              gt: jest.fn().mockResolvedValue({
                count: 0,
                error: null
              })
            };
          }
        })
      }));

      const result = await gamificationService.getUserRank();

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe(1);
    });
  });
});
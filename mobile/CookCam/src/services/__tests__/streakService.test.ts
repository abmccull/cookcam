// Mock dependencies before imports
jest.mock('../supabaseClient');
jest.mock('../../utils/logger');

import { StreakService } from '../streakService';
import { supabase } from '../supabaseClient';
import logger from '../../utils/logger';

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('StreakService', () => {
  const mockUserId = 'user-123';
  const mockDate = '2024-01-15';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('updateStreak', () => {
    it('should update streak successfully', async () => {
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
        data: true,
        error: null
      });

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(true);
      expect(mockedSupabase.rpc).toHaveBeenCalledWith('update_user_streak', {
        p_user_id: mockUserId
      });
      expect(mockedLogger.info).toHaveBeenCalledWith('Streak updated successfully');
    });

    it('should handle RPC errors', async () => {
      const error = { message: 'RPC function not found' };
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
        data: null,
        error
      });

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to update streak:', error);
    });

    it('should handle exceptions', async () => {
      const error = new Error('Network error');
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockRejectedValue(error);

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith('Error updating streak:', error);
    });
  });

  describe('getStreakData', () => {
    const mockStreakData = {
      user_id: mockUserId,
      current_streak: 7,
      longest_streak: 15,
      freeze_tokens: 2,
      last_cook_date: '2024-01-14'
    };

    it('should get streak data successfully', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStreakData,
              error: null
            })
          })
        })
      });

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toEqual(mockStreakData);
      expect(mockedSupabase.from).toHaveBeenCalledWith('user_streaks');
    });

    it('should handle user not found (PGRST116)', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' }
            })
          })
        })
      });

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toBeNull();
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('should handle other database errors', async () => {
      const error = { code: 'OTHER_ERROR', message: 'Database error' };
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      });

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to get streak data:', error);
    });

    it('should handle exceptions', async () => {
      const error = new Error('Connection failed');
      (mockedSupabase.from as jest.Mock) = jest.fn().mockRejectedValue(error);

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toBeNull();
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to get streak data:', error);
    });
  });

  describe('getCookingHistory', () => {
    const mockCookingHistory = [
      { id: '1', user_id: mockUserId, cook_date: '2024-01-10', recipes_cooked: 2 },
      { id: '2', user_id: mockUserId, cook_date: '2024-01-11', recipes_cooked: 1 },
      { id: '3', user_id: mockUserId, cook_date: '2024-01-12', recipes_cooked: 3 }
    ];

    it('should get cooking history successfully', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockCookingHistory,
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await StreakService.getCookingHistory(
        mockUserId,
        '2024-01-10',
        '2024-01-15'
      );

      expect(result).toEqual(mockCookingHistory);
      expect(mockedSupabase.from).toHaveBeenCalledWith('daily_cooks');
    });

    it('should return empty array on error', async () => {
      const error = { message: 'Database error' };
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error
                })
              })
            })
          })
        })
      });

      const result = await StreakService.getCookingHistory(
        mockUserId,
        '2024-01-10',
        '2024-01-15'
      );

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to get cooking history:', error);
    });

    it('should handle empty history', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await StreakService.getCookingHistory(
        mockUserId,
        '2024-01-01',
        '2024-01-31'
      );

      expect(result).toEqual([]);
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('useFreezeToken', () => {
    it('should use freeze token successfully', async () => {
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
        data: true,
        error: null
      });

      const result = await StreakService.useFreezeToken(mockUserId, mockDate);

      expect(result).toBe(true);
      expect(mockedSupabase.rpc).toHaveBeenCalledWith('use_freeze_token', {
        p_user_id: mockUserId,
        p_date: mockDate
      });
    });

    it('should return false when no tokens available', async () => {
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
        data: false,
        error: null
      });

      const result = await StreakService.useFreezeToken(mockUserId, mockDate);

      expect(result).toBe(false);
    });

    it('should handle RPC errors', async () => {
      const error = { message: 'Insufficient freeze tokens' };
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
        data: null,
        error
      });

      const result = await StreakService.useFreezeToken(mockUserId, mockDate);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to use freeze token:', error);
    });

    it('should handle exceptions', async () => {
      const error = new Error('Network error');
      (mockedSupabase.rpc as jest.Mock) = jest.fn().mockRejectedValue(error);

      const result = await StreakService.useFreezeToken(mockUserId, mockDate);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith('Error using freeze token:', error);
    });
  });

  describe('hasCookedToday', () => {
    it('should return true if cooked today', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cook-123' },
                error: null
              })
            })
          })
        })
      });

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(true);
      expect(mockedSupabase.from).toHaveBeenCalledWith('daily_cooks');
    });

    it('should return false if not cooked today', async () => {
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              })
            })
          })
        })
      });

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(false);
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = { code: 'OTHER_ERROR', message: 'Database error' };
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error
              })
            })
          })
        })
      });

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(false);
      expect(mockedLogger.error).toHaveBeenCalledWith('Failed to check if cooked today:', error);
    });

    it('should use correct date format', async () => {
      let capturedDate: string = '';
      (mockedSupabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockImplementation((field, value) => {
            if (field === 'cook_date') {
              capturedDate = value;
            }
            return {
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            };
          })
        })
      });

      await StreakService.hasCookedToday(mockUserId);

      expect(capturedDate).toBe('2024-01-15');
    });
  });

  describe('getStreakMilestones', () => {
    it('should return all milestones', () => {
      const milestones = StreakService.getStreakMilestones();

      expect(milestones).toHaveLength(7);
      expect(milestones[0]).toEqual({
        days: 3,
        name: 'Starter Chef',
        reward: '10 XP',
        description: 'Cook for 3 days in a row'
      });
      expect(milestones[6]).toEqual({
        days: 365,
        name: 'Legendary Chef',
        reward: 'Hall of Fame + Special Title',
        description: 'A full year of cooking mastery'
      });
    });

    it('should have ascending day values', () => {
      const milestones = StreakService.getStreakMilestones();
      
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].days).toBeGreaterThan(milestones[i - 1].days);
      }
    });
  });

  describe('checkAndAwardMilestones', () => {
    it('should log milestone achievement', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 7);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'User user-123 reached Week Warrior milestone!'
      );
    });

    it('should not log for non-milestone days', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 5);

      expect(mockedLogger.info).not.toHaveBeenCalled();
    });

    it('should check all applicable milestones', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 30);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'User user-123 reached Monthly Master milestone!'
      );
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should handle 100 day milestone', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 100);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'User user-123 reached Century Chef milestone!'
      );
    });

    it('should handle 365 day milestone', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 365);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'User user-123 reached Legendary Chef milestone!'
      );
    });
  });
});
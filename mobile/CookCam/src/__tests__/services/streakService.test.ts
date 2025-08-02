import logger from '../../utils/logger';

// Mock dependencies before importing the service
jest.mock('../../utils/logger');

// Mock the supabaseClient service
jest.mock('../../services/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Now import after mocking
import { StreakService } from '../../services/streakService';
import { supabase } from '../../services/supabaseClient';

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('StreakService', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStreak', () => {
    it('should successfully update user streak', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: null,
      });

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_user_streak', {
        p_user_id: mockUserId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Streak updated successfully');
    });

    it('should handle RPC errors', async () => {
      const error = { message: 'Database error' };
      mockSupabase.rpc.mockResolvedValueOnce({
        error,
      });

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update streak:', error);
    });

    it('should handle thrown exceptions', async () => {
      const error = new Error('Network error');
      mockSupabase.rpc.mockRejectedValueOnce(error);

      const result = await StreakService.updateStreak(mockUserId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating streak:', error);
    });
  });

  describe('getStreakData', () => {
    it('should successfully retrieve streak data', async () => {
      const mockStreakData = {
        user_id: mockUserId,
        current_streak: 7,
        longest_streak: 14,
        freeze_tokens: 2,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockStreakData,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toEqual(mockStreakData);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_streaks');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should handle not found error gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows found
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toBeNull();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = { message: 'Database connection failed' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getStreakData(mockUserId);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get streak data:', error);
    });
  });

  describe('getCookingHistory', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-07';

    it('should successfully retrieve cooking history', async () => {
      const mockHistory = [
        { user_id: mockUserId, cook_date: '2024-01-01', recipes_cooked: 2 },
        { user_id: mockUserId, cook_date: '2024-01-02', recipes_cooked: 1 },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: mockHistory,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getCookingHistory(mockUserId, startDate, endDate);

      expect(result).toEqual(mockHistory);
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_cooks');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.gte).toHaveBeenCalledWith('cook_date', startDate);
      expect(mockQuery.lte).toHaveBeenCalledWith('cook_date', endDate);
      expect(mockQuery.order).toHaveBeenCalledWith('cook_date', { ascending: true });
    });

    it('should return empty array on error', async () => {
      const error = { message: 'Query failed' };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: null,
          error,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getCookingHistory(mockUserId, startDate, endDate);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get cooking history:', error);
    });

    it('should handle null data gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.getCookingHistory(mockUserId, startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('useFreezeToken', () => {
    const testDate = '2024-01-15';

    it('should successfully use freeze token', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const result = await StreakService.useFreezeToken(mockUserId, testDate);

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('use_freeze_token', {
        p_user_id: mockUserId,
        p_date: testDate,
      });
    });

    it('should handle RPC errors', async () => {
      const error = { message: 'Insufficient freeze tokens' };
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await StreakService.useFreezeToken(mockUserId, testDate);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to use freeze token:', error);
    });

    it('should handle false return from RPC', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await StreakService.useFreezeToken(mockUserId, testDate);

      expect(result).toBe(false);
    });

    it('should handle thrown exceptions', async () => {
      const error = new Error('Network error');
      mockSupabase.rpc.mockRejectedValueOnce(error);

      const result = await StreakService.useFreezeToken(mockUserId, testDate);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error using freeze token:', error);
    });
  });

  describe('hasCookedToday', () => {
    beforeEach(() => {
      // Mock Date to return consistent results
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:00.000Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true when user has cooked today', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'cook-id-123' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_cooks');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.eq).toHaveBeenCalledWith('cook_date', '2024-01-15');
    });

    it('should return false when user has not cooked today', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows found
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery as any);

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(false);
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

      const result = await StreakService.hasCookedToday(mockUserId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to check if cooked today:', error);
    });
  });

  describe('getStreakMilestones', () => {
    it('should return all streak milestones', () => {
      const milestones = StreakService.getStreakMilestones();

      expect(milestones).toHaveLength(7);
      expect(milestones[0]).toEqual({
        days: 3,
        name: 'Starter Chef',
        reward: '10 XP',
        description: 'Cook for 3 days in a row',
      });
      expect(milestones[6]).toEqual({
        days: 365,
        name: 'Legendary Chef',
        reward: 'Hall of Fame + Special Title',
        description: 'A full year of cooking mastery',
      });
    });

    it('should have milestones in ascending order', () => {
      const milestones = StreakService.getStreakMilestones();
      
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].days).toBeGreaterThan(milestones[i - 1].days);
      }
    });
  });

  describe('checkAndAwardMilestones', () => {
    it('should log achievement when user reaches milestone', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 7);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockUserId} reached Week Warrior milestone!`
      );
    });

    it('should log multiple achievements for multiple milestones', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 30);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockUserId} reached Monthly Master milestone!`
      );
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should not log anything when no milestone is reached', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 5);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle milestone of 100 days', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 100);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockUserId} reached Century Chef milestone!`
      );
    });

    it('should handle the legendary milestone', async () => {
      await StreakService.checkAndAwardMilestones(mockUserId, 365);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockUserId} reached Legendary Chef milestone!`
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete streak workflow', async () => {
      // User starts cooking, update streak
      mockSupabase.rpc.mockResolvedValueOnce({ error: null });
      let result = await StreakService.updateStreak(mockUserId);
      expect(result).toBe(true);

      // Check if they cooked today
      const mockQuery1 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'cook-123' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery1 as any);
      
      result = await StreakService.hasCookedToday(mockUserId);
      expect(result).toBe(true);

      // Get their streak data  
      const mockQuery2 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { current_streak: 7, freeze_tokens: 1 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValueOnce(mockQuery2 as any);
      
      const streakData = await StreakService.getStreakData(mockUserId);
      expect(streakData?.current_streak).toBe(7);

      // Award milestone if reached
      await StreakService.checkAndAwardMilestones(mockUserId, 7);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockUserId} reached Week Warrior milestone!`
      );
    });
  });
});
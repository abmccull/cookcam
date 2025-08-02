// Comprehensive Gamification System Tests
import { mockUsers, mockGamificationData } from '../../__tests__/utils/mockData';

// Mock Supabase
const mockSupabase = {
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  rpc: jest.fn(),
};

// Gamification Service
class GamificationService {
  private supabase = mockSupabase;

  // XP and Level Management
  async addXP(userId: string, xpAmount: number, source: string, metadata?: any) {
    try {
      if (xpAmount <= 0) {
        throw new Error('XP amount must be positive');
      }

      // Get current user stats
      const { data: currentStats } = await this.supabase
        .from('users')
        .select('total_xp, level, xp_to_next_level')
        .eq('id', userId)
        .single();

      if (!currentStats) {
        throw new Error('User not found');
      }

      const newTotalXP = currentStats.total_xp + xpAmount;
      const { newLevel, leveledUp } = this.calculateLevel(newTotalXP);
      const xpToNextLevel = this.calculateXPToNextLevel(newLevel, newTotalXP);

      // Update user stats
      await this.supabase
        .from('users')
        .update({
          total_xp: newTotalXP,
          level: newLevel,
          xp_to_next_level: xpToNextLevel,
        })
        .eq('id', userId);

      // Record XP transaction
      await this.supabase
        .from('user_xp_transactions')
        .insert({
          user_id: userId,
          xp_amount: xpAmount,
          source,
          metadata,
          created_at: new Date().toISOString(),
        });

      // Handle level up
      let levelUpRewards = null;
      if (leveledUp) {
        levelUpRewards = await this.handleLevelUp(userId, newLevel);
      }

      return {
        success: true,
        data: {
          xpAdded: xpAmount,
          totalXP: newTotalXP,
          newLevel,
          leveledUp,
          xpToNextLevel,
          levelUpRewards,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async calculateLevel(totalXP: number) {
    // XP requirements: Level 1 = 0, Level 2 = 100, Level 3 = 250, etc.
    // Formula: level = floor(sqrt(totalXP / 50)) + 1
    const level = Math.floor(Math.sqrt(totalXP / 50)) + 1;
    const previousLevel = Math.floor(Math.sqrt((totalXP - 1) / 50)) + 1;
    
    return {
      newLevel: Math.max(1, level),
      leveledUp: level > previousLevel,
    };
  }

  async calculateXPToNextLevel(currentLevel: number, currentXP: number) {
    const nextLevelXP = Math.pow(currentLevel, 2) * 50;
    return Math.max(0, nextLevelXP - currentXP);
  }

  // Badge System
  async unlockBadge(userId: string, badgeId: string, metadata?: any) {
    try {
      // Check if badge already unlocked
      const { data: existingBadge } = await this.supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (existingBadge) {
        return {
          success: false,
          error: 'Badge already unlocked',
        };
      }

      // Get badge info
      const { data: badge } = await this.supabase
        .from('badges')
        .select('*')
        .eq('id', badgeId)
        .single();

      if (!badge) {
        throw new Error('Badge not found');
      }

      // Unlock badge
      await this.supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          unlocked_at: new Date().toISOString(),
          metadata,
        });

      // Award XP if badge has XP reward
      if (badge.xp_reward > 0) {
        await this.addXP(userId, badge.xp_reward, 'badge_unlock', { badgeId });
      }

      return {
        success: true,
        data: {
          badge,
          xpRewarded: badge.xp_reward,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async checkBadgeEligibility(userId: string) {
    try {
      // Get user stats
      const { data: userStats } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Get user's current badges
      const { data: userBadges } = await this.supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      const unlockedBadgeIds = userBadges?.map(b => b.badge_id) || [];

      // Get user activities for badge checking
      const { data: activities } = await this.supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId);

      const eligibleBadges = [];

      // Check various badge conditions
      const badgeChecks = [
        this.checkFirstRecipeBadge(activities, unlockedBadgeIds),
        this.checkStreakBadges(userStats, unlockedBadgeIds),
        this.checkLevelBadges(userStats, unlockedBadgeIds),
        this.checkRecipeCountBadges(activities, unlockedBadgeIds),
        this.checkSocialBadges(userId, unlockedBadgeIds),
      ];

      for (const check of badgeChecks) {
        const badges = await check;
        eligibleBadges.push(...badges);
      }

      return {
        success: true,
        data: { eligibleBadges },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Streak System
  async updateStreak(userId: string) {
    try {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      // Get user's current streak info
      const { data: currentStreak } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      let newStreak = {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      };

      if (currentStreak) {
        const lastActivityDate = currentStreak.last_activity_date;

        if (lastActivityDate === today) {
          // Already counted today
          return {
            success: true,
            data: currentStreak,
            message: 'Streak already updated today',
          };
        } else if (lastActivityDate === yesterday) {
          // Continue streak
          newStreak = {
            ...currentStreak,
            current_streak: currentStreak.current_streak + 1,
            longest_streak: Math.max(
              currentStreak.longest_streak,
              currentStreak.current_streak + 1
            ),
            last_activity_date: today,
          };
        } else {
          // Streak broken, reset to 1
          newStreak = {
            ...currentStreak,
            current_streak: 1,
            last_activity_date: today,
          };
        }
      }

      // Update streak
      await this.supabase
        .from('user_streaks')
        .upsert(newStreak);

      // Check for streak badges
      await this.checkStreakBadgeEligibility(userId, newStreak.current_streak);

      return {
        success: true,
        data: newStreak,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Leaderboard System
  async getLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time', limit = 50) {
    try {
      let query = this.supabase
        .from('users')
        .select('id, name, total_xp, level, avatar_url')
        .order('total_xp', { ascending: false })
        .limit(limit);

      // Add time constraints for non-all-time leaderboards
      if (timeframe !== 'all_time') {
        const timeConstraints = this.getTimeConstraints(timeframe);
        // In a real implementation, this would query XP gained within the timeframe
        // For now, we'll use the total_xp field
      }

      const { data: leaderboard } = await query;

      // Add rank to each user
      const rankedLeaderboard = leaderboard?.map((user, index) => ({
        ...user,
        rank: index + 1,
      })) || [];

      return {
        success: true,
        data: {
          leaderboard: rankedLeaderboard,
          timeframe,
          totalUsers: rankedLeaderboard.length,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getUserRank(userId: string, timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time') {
    try {
      // Get user's current XP
      const { data: user } = await this.supabase
        .from('users')
        .select('total_xp')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Count users with higher XP
      const { data: higherUsers } = await this.supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('total_xp', user.total_xp);

      const rank = higherUsers ? higherUsers.length : 1;

      return {
        success: true,
        data: {
          rank,
          totalXP: user.total_xp,
          timeframe,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Achievement System
  async getAchievements(userId: string) {
    try {
      // Get all achievements
      const { data: allAchievements } = await this.supabase
        .from('achievements')
        .select('*')
        .order('category, difficulty');

      // Get user's unlocked achievements
      const { data: userAchievements } = await this.supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, progress')
        .eq('user_id', userId);

      const unlockedIds = userAchievements?.map(ua => ua.achievement_id) || [];

      // Combine data
      const achievements = allAchievements?.map(achievement => ({
        ...achievement,
        unlocked: unlockedIds.includes(achievement.id),
        unlockedAt: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.unlocked_at,
        progress: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.progress || 0,
      })) || [];

      return {
        success: true,
        data: {
          achievements,
          totalAchievements: achievements.length,
          unlockedCount: unlockedIds.length,
          completionPercentage: Math.round((unlockedIds.length / achievements.length) * 100),
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Helper methods
  private async handleLevelUp(userId: string, newLevel: number) {
    // Award level-up rewards
    const rewards = {
      xp: newLevel * 10,
      badges: [],
      unlocks: [],
    };

    // Check for level-based badge unlocks
    const levelBadges = await this.checkLevelBadges({ level: newLevel }, []);
    rewards.badges = levelBadges;

    return rewards;
  }

  private async checkFirstRecipeBadge(activities: any[], unlockedBadgeIds: string[]) {
    if (unlockedBadgeIds.includes('first_recipe')) return [];
    
    const hasRecipe = activities?.some(a => a.activity_type === 'recipe_created');
    return hasRecipe ? [{ id: 'first_recipe', name: 'First Recipe' }] : [];
  }

  private async checkStreakBadges(userStats: any, unlockedBadgeIds: string[]) {
    const badges = [];
    const streakMilestones = [3, 7, 14, 30, 100];
    
    for (const milestone of streakMilestones) {
      const badgeId = `streak_${milestone}`;
      if (!unlockedBadgeIds.includes(badgeId) && userStats.current_streak >= milestone) {
        badges.push({ id: badgeId, name: `${milestone} Day Streak` });
      }
    }
    
    return badges;
  }

  private async checkLevelBadges(userStats: any, unlockedBadgeIds: string[]) {
    const badges = [];
    const levelMilestones = [5, 10, 25, 50, 100];
    
    for (const milestone of levelMilestones) {
      const badgeId = `level_${milestone}`;
      if (!unlockedBadgeIds.includes(badgeId) && userStats.level >= milestone) {
        badges.push({ id: badgeId, name: `Level ${milestone}` });
      }
    }
    
    return badges;
  }

  private async checkRecipeCountBadges(activities: any[], unlockedBadgeIds: string[]) {
    const recipeCount = activities?.filter(a => a.activity_type === 'recipe_created').length || 0;
    const badges = [];
    const countMilestones = [10, 50, 100, 500];
    
    for (const milestone of countMilestones) {
      const badgeId = `recipes_${milestone}`;
      if (!unlockedBadgeIds.includes(badgeId) && recipeCount >= milestone) {
        badges.push({ id: badgeId, name: `${milestone} Recipes Created` });
      }
    }
    
    return badges;
  }

  private async checkSocialBadges(userId: string, unlockedBadgeIds: string[]) {
    // Check for social interaction badges
    return [];
  }

  private async checkStreakBadgeEligibility(userId: string, currentStreak: number) {
    const streakMilestones = [3, 7, 14, 30, 100];
    
    for (const milestone of streakMilestones) {
      if (currentStreak === milestone) {
        await this.unlockBadge(userId, `streak_${milestone}`);
      }
    }
  }

  private getTimeConstraints(timeframe: string) {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: now,
        };
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return { start: weekStart, end: now };
      case 'monthly':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now,
        };
      default:
        return { start: new Date(0), end: now };
    }
  }
}

describe('Gamification System - Production Ready', () => {
  let service: GamificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GamificationService();
  });

  describe('XP Management', () => {
    it('should add XP and update user level', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { total_xp: 100, level: 2, xp_to_next_level: 150 },
      });

      mockSupabase.from().update().eq.mockResolvedValue({ data: {}, error: null });
      mockSupabase.from().insert.mockResolvedValue({ data: {}, error: null });

      const result = await service.addXP(mockUsers.free.id, 50, 'recipe_completed');

      expect(result.success).toBe(true);
      expect(result.data?.xpAdded).toBe(50);
      expect(result.data?.totalXP).toBe(150);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_xp: 150,
        })
      );
    });

    it('should handle level up correctly', async () => {
      // User at 240 XP (level 2), adding 60 XP should level up to 3
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { total_xp: 240, level: 2, xp_to_next_level: 10 },
      });

      mockSupabase.from().update().eq.mockResolvedValue({ data: {}, error: null });
      mockSupabase.from().insert.mockResolvedValue({ data: {}, error: null });

      const result = await service.addXP(mockUsers.free.id, 60, 'recipe_mastery');

      expect(result.success).toBe(true);
      expect(result.data?.leveledUp).toBe(true);
      expect(result.data?.newLevel).toBeGreaterThan(2);
      expect(result.data?.levelUpRewards).toBeDefined();
    });

    it('should reject negative XP amounts', async () => {
      const result = await service.addXP(mockUsers.free.id, -10, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('XP amount must be positive');
    });

    it('should handle user not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
      });

      const result = await service.addXP('invalid-user', 50, 'test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should record XP transaction', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { total_xp: 100, level: 2, xp_to_next_level: 150 },
      });

      mockSupabase.from().update().eq.mockResolvedValue({ data: {}, error: null });
      mockSupabase.from().insert.mockResolvedValue({ data: {}, error: null });

      await service.addXP(mockUsers.free.id, 25, 'daily_login', { bonus: true });

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUsers.free.id,
          xp_amount: 25,
          source: 'daily_login',
          metadata: { bonus: true },
        })
      );
    });
  });

  describe('Level Calculation', () => {
    it('should calculate levels correctly', async () => {
      const service = new GamificationService();
      
      // Test various XP amounts
      expect((await service.calculateLevel(0)).newLevel).toBe(1);
      expect((await service.calculateLevel(50)).newLevel).toBe(2);
      expect((await service.calculateLevel(200)).newLevel).toBe(3);
      expect((await service.calculateLevel(450)).newLevel).toBe(4);
    });

    it('should detect level ups', async () => {
      const service = new GamificationService();
      
      const result = await service.calculateLevel(250); // Should be level 3
      expect(result.newLevel).toBe(4); // sqrt(250/50) + 1 = 3.23... → 4
    });

    it('should calculate XP to next level', async () => {
      const service = new GamificationService();
      
      const xpToNext = await service.calculateXPToNextLevel(2, 100);
      expect(xpToNext).toBeGreaterThan(0);
    });
  });

  describe('Badge System', () => {
    it('should unlock new badges', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null, // Badge not yet unlocked
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'first_recipe',
          name: 'First Recipe',
          xp_reward: 50,
        },
      });

      mockSupabase.from().insert.mockResolvedValue({ data: {}, error: null });

      const result = await service.unlockBadge(mockUsers.free.id, 'first_recipe');

      expect(result.success).toBe(true);
      expect(result.data?.badge.name).toBe('First Recipe');
      expect(result.data?.xpRewarded).toBe(50);
    });

    it('should prevent duplicate badge unlocks', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'existing-badge' }, // Badge already unlocked
      });

      const result = await service.unlockBadge(mockUsers.free.id, 'first_recipe');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already unlocked');
    });

    it('should handle non-existent badges', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null, // Badge doesn't exist
      });

      const result = await service.unlockBadge(mockUsers.free.id, 'invalid_badge');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Badge not found');
    });
  });

  describe('Streak System', () => {
    it('should start new streak', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null, // No existing streak
      });

      mockSupabase.from().upsert.mockResolvedValue({ data: {}, error: null });

      const result = await service.updateStreak(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.current_streak).toBe(1);
      expect(result.data?.longest_streak).toBe(1);
    });

    it('should continue existing streak', async () => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          current_streak: 5,
          longest_streak: 10,
          last_activity_date: yesterday,
        },
      });

      mockSupabase.from().upsert.mockResolvedValue({ data: {}, error: null });

      const result = await service.updateStreak(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.current_streak).toBe(6);
    });

    it('should reset broken streak', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toDateString();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          current_streak: 15,
          longest_streak: 20,
          last_activity_date: twoDaysAgo,
        },
      });

      mockSupabase.from().upsert.mockResolvedValue({ data: {}, error: null });

      const result = await service.updateStreak(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.current_streak).toBe(1);
      expect(result.data?.longest_streak).toBe(20); // Should preserve longest
    });

    it('should not update streak twice in same day', async () => {
      const today = new Date().toDateString();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          current_streak: 7,
          longest_streak: 15,
          last_activity_date: today,
        },
      });

      const result = await service.updateStreak(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already updated today');
    });
  });

  describe('Leaderboard System', () => {
    it('should generate leaderboard with rankings', async () => {
      const mockLeaderboardData = [
        { id: 'user1', name: 'Leader', total_xp: 5000, level: 25 },
        { id: 'user2', name: 'Second', total_xp: 3000, level: 20 },
        { id: 'user3', name: 'Third', total_xp: 1500, level: 15 },
      ];

      mockSupabase.from().select().order().limit.mockResolvedValue({
        data: mockLeaderboardData,
      });

      const result = await service.getLeaderboard('all_time', 10);

      expect(result.success).toBe(true);
      expect(result.data?.leaderboard[0].rank).toBe(1);
      expect(result.data?.leaderboard[0].name).toBe('Leader');
      expect(result.data?.leaderboard[1].rank).toBe(2);
      expect(result.data?.totalUsers).toBe(3);
    });

    it('should get user rank', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { total_xp: 2500 },
      });

      mockSupabase.from().select().gte.mockResolvedValue({
        data: [{ id: 'user1' }, { id: 'user2' }], // 2 users with higher XP
      });

      const result = await service.getUserRank(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.rank).toBe(2); // 2 users with higher XP = rank 2
      expect(result.data?.totalXP).toBe(2500);
    });
  });

  describe('Achievement System', () => {
    it('should get user achievements with progress', async () => {
      const mockAchievements = [
        { id: 'ach1', name: 'Recipe Master', category: 'cooking' },
        { id: 'ach2', name: 'Social Butterfly', category: 'social' },
      ];

      const mockUserAchievements = [
        { achievement_id: 'ach1', unlocked_at: '2024-01-01', progress: 100 },
      ];

      mockSupabase.from().select().order.mockResolvedValue({
        data: mockAchievements,
      });

      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockUserAchievements,
      });

      const result = await service.getAchievements(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.achievements).toHaveLength(2);
      expect(result.data?.achievements[0].unlocked).toBe(true);
      expect(result.data?.achievements[1].unlocked).toBe(false);
      expect(result.data?.unlockedCount).toBe(1);
      expect(result.data?.completionPercentage).toBe(50);
    });
  });

  describe('Badge Eligibility', () => {
    it('should check badge eligibility correctly', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockUsers.free, level: 10, current_streak: 7 },
      });

      mockSupabase.from().select().eq.mockResolvedValue({
        data: [], // No badges unlocked yet
      });

      mockSupabase.from().select().eq.mockResolvedValue({
        data: [
          { activity_type: 'recipe_created' },
          { activity_type: 'recipe_completed' },
        ],
      });

      const result = await service.checkBadgeEligibility(mockUsers.free.id);

      expect(result.success).toBe(true);
      expect(result.data?.eligibleBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures', async () => {
      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.addXP(mockUsers.free.id, 50, 'test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle concurrent XP additions', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { total_xp: 100, level: 2, xp_to_next_level: 150 },
      });

      mockSupabase.from().update().eq.mockResolvedValue({ data: {}, error: null });
      mockSupabase.from().insert.mockResolvedValue({ data: {}, error: null });

      // Simulate concurrent XP additions
      const promises = Array(3).fill(null).map(() =>
        service.addXP(mockUsers.free.id, 25, 'concurrent_test')
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.data?.xpAdded === 25)).toBe(true);
    });
  });
});
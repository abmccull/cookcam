import request from 'supertest';
import express from 'express';
import gamificationRouter from '../gamification';
import { supabase, createAuthenticatedClient } from '../../index';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
  createAuthenticatedClient: jest.fn(),
  supabaseServiceRole: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateUser: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 'test-user-123', email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  }),
  AuthenticatedRequest: {},
}));

// Setup Express app
const app = express();
app.use(express.json());
app.use('/gamification', gamificationRouter);

describe('Gamification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /gamification/add-xp', () => {
    it('should add XP successfully', async () => {
      const mockRpcResponse = {
        new_xp: 150,
        new_level: 5,
        level_up: false,
        old_level: 5,
        xp_for_next_level: 200,
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockRpcResponse,
        error: null,
      });

      const response = await request(app)
        .post('/gamification/add-xp')
        .set('Authorization', 'Bearer mock-token')
        .send({
          xp_amount: 50,
          action: 'recipe_completed',
          metadata: { recipe_id: 'recipe-123' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        result: mockRpcResponse,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('add_user_xp', {
        p_user_id: 'test-user-123',
        p_xp_amount: 50,
        p_action: 'recipe_completed',
        p_metadata: { recipe_id: 'recipe-123' },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/gamification/add-xp').send({
        xp_amount: 50,
        action: 'recipe_completed',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/gamification/add-xp')
        .set('Authorization', 'Bearer mock-token')
        .send({
          xp_amount: 50,
          // missing action
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('XP amount and action are required');
    });

    it('should handle database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app)
        .post('/gamification/add-xp')
        .set('Authorization', 'Bearer mock-token')
        .send({
          xp_amount: 50,
          action: 'recipe_completed',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add XP');
      expect(logger.error).toHaveBeenCalledWith('Error adding XP:', expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .post('/gamification/add-xp')
        .set('Authorization', 'Bearer mock-token')
        .send({
          xp_amount: 50,
          action: 'recipe_completed',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(logger.error).toHaveBeenCalledWith('Add XP error:', expect.any(Error));
    });
  });

  describe('POST /gamification/check-streak', () => {
    it('should check streak successfully', async () => {
      const mockStreakData = {
        current_streak: 5,
        longest_streak: 10,
        checked_in_today: false,
        last_check_in: '2024-01-01T00:00:00Z',
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockStreakData,
        error: null,
      });

      const response = await request(app)
        .post('/gamification/check-streak')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        streak_data: mockStreakData,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('check_user_streak', {
        p_user_id: 'test-user-123',
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/gamification/check-streak');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app)
        .post('/gamification/check-streak')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to check streak');
      expect(logger.error).toHaveBeenCalledWith('Error checking streak:', expect.any(Object));
    });
  });

  describe('GET /gamification/progress', () => {
    it('should get user progress successfully', async () => {
      const mockUser = {
        level: 5,
        xp: 250,
        total_xp: 1250,
        streak_current: 3,
        streak_shields: 2,
      };

      const mockProgress = {
        user_id: 'test-user-123',
        recipes_cooked: 25,
        recipes_created: 5,
        achievements_unlocked: 10,
      };

      const mockAchievements = [
        {
          achievement_id: 'ach-1',
          unlocked_at: '2024-01-01',
          achievements: {
            id: 'ach-1',
            name: 'First Recipe',
            description: 'Cook your first recipe',
            icon: '🍳',
            xp_reward: 50,
          },
        },
      ];

      // Create a mock authenticated client
      const mockAuthClient = {
        from: jest.fn(),
      };

      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      // First query - user stats
      const userStatsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockUser, error: null }),
      };

      // Second query - user progress
      const userProgressQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProgress, error: null }),
      };

      // Third query - achievements
      const achievementsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({ data: mockAchievements, error: null }),
      };

      // Set up the from() method to return different queries
      let fromCallCount = 0;
      mockAuthClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return userStatsQuery;
        } else if (fromCallCount === 2) {
          return userProgressQuery;
        } else if (fromCallCount === 3) {
          return achievementsQuery;
        }
      });

      const response = await request(app)
        .get('/gamification/progress')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_stats');
      expect(response.body).toHaveProperty('recent_progress');
      expect(response.body).toHaveProperty('achievements');
      expect(response.body.user_stats).toEqual(mockUser);
      expect(response.body.recent_progress).toEqual(mockProgress);
      expect(response.body.achievements).toEqual(mockAchievements);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/gamification/progress');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /gamification/leaderboard', () => {
    it('should get weekly leaderboard', async () => {
      const mockLeaderboardData = [
        {
          rank: 1,
          user_id: 'user-1',
          name: 'Player 1',
          xp_gained: 500,
          xp_total: 5000,
          level: 10,
          avatar_url: null,
          is_creator: false,
          creator_tier: null,
        },
        {
          rank: 2,
          user_id: 'user-2',
          name: 'Player 2',
          xp_gained: 450,
          xp_total: 4500,
          level: 9,
          avatar_url: null,
          is_creator: false,
          creator_tier: null,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockLeaderboardData,
        error: null,
      });

      const response = await request(app)
        .get('/gamification/leaderboard')
        .query({ type: 'global', period: 'weekly', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('leaderboard');
      expect(response.body.leaderboard).toHaveLength(2);
      expect(response.body.leaderboard[0]).toHaveProperty('rank', 1);
      expect(response.body.leaderboard[0]).toHaveProperty('xp_gained', 500);

      expect(supabase.rpc).toHaveBeenCalledWith('get_leaderboard_data', {
        p_period: 'weekly',
        p_limit: 10,
      });
    });

    it('should filter out users with 0 XP for weekly period', async () => {
      const mockLeaderboardData = [
        {
          rank: 1,
          user_id: 'user-1',
          name: 'Player 1',
          xp_gained: 500,
          xp_total: 5000,
          level: 10,
        },
        {
          rank: 2,
          user_id: 'user-2',
          name: 'Player 2',
          xp_gained: 0, // Should be filtered out
          xp_total: 4500,
          level: 9,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockLeaderboardData,
        error: null,
      });

      const response = await request(app)
        .get('/gamification/leaderboard')
        .query({ period: 'weekly' });

      expect(response.status).toBe(200);
      expect(response.body.leaderboard).toHaveLength(1);
      expect(response.body.leaderboard[0].rank).toBe(1);
    });

    it('should use fallback query when RPC fails', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function not found' },
      });

      // Mock users query
      const mockUsers = [
        {
          id: 'user-1',
          name: 'User 1',
          avatar_url: null,
          level: 5,
          total_xp: 1000,
          xp: 100,
          is_creator: false,
          creator_tier: null,
        },
        {
          id: 'user-2',
          name: 'User 2',
          avatar_url: null,
          level: 3,
          total_xp: 500,
          xp: 50,
          is_creator: false,
          creator_tier: null,
        },
      ];

      const usersQuery = {
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValueOnce({
          data: mockUsers,
          error: null,
        }),
      };

      // Mock user_progress query for period XP
      const progressQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValueOnce({
          data: [
            { user_id: 'user-1', xp_gained: 100 },
            { user_id: 'user-2', xp_gained: 50 },
          ],
          error: null,
        }),
      };

      let fromCallCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        fromCallCount++;
        if (fromCallCount === 1 && table === 'users') {
          return usersQuery;
        } else if (fromCallCount === 2 && table === 'user_progress') {
          return progressQuery;
        }
      });

      const response = await request(app).get('/gamification/leaderboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('leaderboard');
      expect(response.body.leaderboard).toHaveLength(2);
    });
  });

  describe('GET /gamification/rank/:userId', () => {
    it('should get user rank successfully', async () => {
      // Mock the RPC call to fail so it uses fallback
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Function not found'));

      // Mock user query
      const userQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 4000 },
          error: null,
        }),
      };

      let fromCallCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return userQuery;
        } else if (fromCallCount === 2) {
          return {
            select: jest.fn((fields, options) => {
              if (options && options.count === 'exact' && options.head === true) {
                return {
                  gt: jest.fn(() => Promise.resolve({ count: 2, error: null })),
                };
              }
              return { gt: jest.fn() };
            }),
          };
        } else if (fromCallCount === 3) {
          return {
            select: jest.fn((fields, options) => {
              if (options && options.count === 'exact' && options.head === true) {
                return {
                  gt: jest.fn(() => Promise.resolve({ count: 10, error: null })),
                };
              }
              return { gt: jest.fn() };
            }),
          };
        }
      });

      const response = await request(app)
        .get('/gamification/rank/test-user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rank');
      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('user_xp');
      expect(response.body).toHaveProperty('period_xp');
      expect(response.body.rank).toBe(3); // 2 users have higher XP, so rank 3
      expect(response.body.total_users).toBe(10);
      expect(response.body.user_xp).toBe(4000);
      expect(response.body.period_xp).toBe(4000); // Fallback uses total_xp for period_xp
    });

    it('should get current user rank when no userId provided', async () => {
      // Mock the RPC call to fail so it uses fallback
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Function not found'));

      // Mock user query for current user
      const userQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { total_xp: 3000 },
          error: null,
        }),
      };

      let fromCallCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return userQuery;
        } else if (fromCallCount === 2) {
          return {
            select: jest.fn((fields, options) => {
              if (options && options.count === 'exact' && options.head === true) {
                return {
                  gt: jest.fn(() => Promise.resolve({ count: 4, error: null })),
                };
              }
              return { gt: jest.fn() };
            }),
          };
        } else if (fromCallCount === 3) {
          return {
            select: jest.fn((fields, options) => {
              if (options && options.count === 'exact' && options.head === true) {
                return {
                  gt: jest.fn(() => Promise.resolve({ count: 15, error: null })),
                };
              }
              return { gt: jest.fn() };
            }),
          };
        }
      });

      const response = await request(app)
        .get('/gamification/rank')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.rank).toBe(5); // 4 users have higher XP, so rank 5
      expect(response.body.total_users).toBe(15);
    });
  });

  describe('GET /gamification/debug-xp', () => {
    it('should get debug XP data', async () => {
      const mockRecentProgress = [
        {
          id: 1,
          user_id: 'user-1',
          xp_amount: 100,
          action: 'recipe_completed',
          created_at: '2024-01-01',
        },
      ];
      const mockTopUsers = [{ id: 'user-1', name: 'Top Player', total_xp: 5000, level: 10 }];
      const mockTodayProgress = [
        {
          user_id: 'user-1',
          xp_gained: 100,
          action: 'recipe_completed',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      let queryCount = 0;
      const mockFrom = jest.fn().mockImplementation(() => {
        queryCount++;
        const query = {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
        };

        if (queryCount === 1) {
          // Recent progress query
          query.limit.mockResolvedValueOnce({ data: mockRecentProgress, error: null });
        } else if (queryCount === 2) {
          // Top users query
          query.limit.mockResolvedValueOnce({ data: mockTopUsers, error: null });
        } else if (queryCount === 3) {
          // Today's progress query
          query.gte.mockResolvedValueOnce({ data: mockTodayProgress, error: null });
        }

        return query;
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const response = await request(app).get('/gamification/debug-xp');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('debug', 'XP Debug Data');
      expect(response.body).toHaveProperty('timestamps');
      expect(response.body).toHaveProperty('recent_progress');
      expect(response.body).toHaveProperty('top_users');
      expect(response.body).toHaveProperty('today_progress');
    });
  });
});

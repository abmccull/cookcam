import request from 'supertest';
import express from 'express';
import analyticsRouter from '../analytics';
import { supabase, createAuthenticatedClient } from '../../index';
import { authenticateUser } from '../../middleware/auth';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('../../middleware/auth', () => ({
  authenticateUser: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com', is_admin: false };
    next();
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/analytics', analyticsRouter);

describe('Analytics Routes', () => {
  let mockUserClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock user client
    mockUserClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    (createAuthenticatedClient as jest.Mock).mockReturnValue(mockUserClient);
  });

  describe('POST /analytics/track', () => {
    it('should track analytics event successfully with XP gain', async () => {
      const trackingData = {
        event_type: 'recipe_created',
        event_data: { recipe_id: 'recipe-123', title: 'Test Recipe' },
        metadata: { source: 'mobile' },
        xp_gained: 50,
      };

      // Mock user data fetch
      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 100, level: 2 },
        error: null,
      });

      // Mock progress tracking insert
      mockUserClient.single.mockResolvedValueOnce({
        data: {
          id: 'progress-123',
          user_id: 'test-user-123',
          event_type: 'recipe_created',
          xp_gained: 50,
          total_xp: 150,
          level: 2,
        },
        error: null,
      });

      // Mock user update
      mockUserClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123', total_xp: 150, level: 2 },
        error: null,
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send(trackingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.xp_gained).toBe(50);
      expect(response.body.data.total_xp).toBe(150);
      expect(mockUserClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          event_type: 'recipe_created',
          xp_gained: 50,
          total_xp: 150,
        })
      );
    });

    it('should track event without XP gain', async () => {
      const trackingData = {
        event_type: 'page_view',
        event_data: { page: '/recipes' },
        xp_gained: 0,
      };

      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 100, level: 2 },
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: {
          id: 'progress-124',
          user_id: 'test-user-123',
          event_type: 'page_view',
          xp_gained: 0,
          total_xp: 100,
        },
        error: null,
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send(trackingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.xp_gained).toBe(0);
      expect(response.body.data.total_xp).toBe(100);
    });

    it('should handle level up when XP threshold is reached', async () => {
      const trackingData = {
        event_type: 'recipe_completed',
        xp_gained: 150,
      };

      // Mock user with 950 XP (level 9, close to level 10 at 1000 XP)
      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 950, level: 10 },
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: {
          user_id: 'test-user-123',
          event_type: 'recipe_completed',
          xp_gained: 150,
          total_xp: 1100,
          level: 11,
          level_up: true,
        },
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: { id: 'test-user-123', total_xp: 1100, level: 11 },
        error: null,
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send(trackingData);

      expect(response.status).toBe(201);
      expect(response.body.data.level_up).toBe(true);
      expect(response.body.data.level).toBe(11);
    });

    it('should require event_type', async () => {
      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send({ event_data: { test: 'data' } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Event type is required');
    });

    it('should require authentication', async () => {
      // Mock authenticateUser to simulate no user
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = null;
        next();
      });

      const response = await request(app)
        .post('/analytics/track')
        .send({ event_type: 'test_event' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User authentication required');
    });

    it('should handle user data fetch errors', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send({ event_type: 'test_event' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch user data');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user data for analytics',
        expect.any(Object)
      );
    });

    it('should handle progress tracking insert errors', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 100, level: 2 },
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send({ event_type: 'test_event' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to track event');
    });

    it('should handle user update errors when XP is gained', async () => {
      // Mock initial user data fetch
      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 100, level: 2 },
        error: null,
      });
      
      // Mock analytics insert success
      mockUserClient.single.mockResolvedValueOnce({
        data: { xp_gained: 50, total_xp: 150, level: 2 },
        error: null,
      });
      
      // Mock user update failure
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send({ event_type: 'test_event', xp_gained: 50 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /analytics/dashboard', () => {
    it('should get user analytics dashboard successfully', async () => {
      const mockDashboardData = {
        total_recipes: 25,
        total_xp: 1250,
        current_level: 13,
        recipes_this_week: 5,
        streak_days: 7,
        favorite_cuisine: 'Italian',
        completion_rate: 0.85,
      };

      // Mock progress data
      mockUserClient.single.mockResolvedValueOnce({
        data: [
          { event_type: 'recipe_created', xp_gained: 50, created_at: '2024-01-01' },
          { event_type: 'recipe_completed', xp_gained: 25, created_at: '2024-01-02' },
        ],
        error: null,
      });

      // Mock user data
      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 1250, level: 13 },
        error: null,
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_xp');
      expect(response.body.data).toHaveProperty('current_level');
    });

    it('should handle dashboard data fetch errors', async () => {
      mockUserClient.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch analytics dashboard');
    });

    it('should handle empty progress data', async () => {
      mockUserClient.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 0, level: 1 },
        error: null,
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.total_events).toBe(0);
      expect(response.body.data.total_xp).toBe(0);
    });
  });

  describe('GET /analytics/global', () => {
    it('should get global analytics successfully', async () => {
      const mockGlobalData = [
        { event_type: 'recipe_created', count: 150 },
        { event_type: 'recipe_completed', count: 89 },
        { event_type: 'user_registered', count: 45 },
      ];

      // Mock global query
      const mockGlobalQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: mockGlobalData,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockGlobalQuery);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toEqual(mockGlobalData);
      expect(response.body.data.total_events).toBe(284); // Sum of counts
    });

    it('should handle custom date range for global analytics', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app)
        .get('/analytics/global?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', 'Bearer mock-token');

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-01-31T23:59:59.999Z');
    });

    it('should require admin access', async () => {
      // Mock non-admin user
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = { id: 'test-user-123', email: 'test@example.com', is_admin: false };
        next();
      });

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should allow admin access', async () => {
      // Mock admin user
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
    });

    it('should handle global analytics fetch errors', async () => {
      // Mock admin user
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch global analytics');
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all endpoints', async () => {
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      // Test track endpoint
      const trackResponse = await request(app)
        .post('/analytics/track')
        .send({ event_type: 'test' });
      expect(trackResponse.status).toBe(401);

      // Test dashboard endpoint
      const dashboardResponse = await request(app).get('/analytics/dashboard');
      expect(dashboardResponse.status).toBe(401);

      // Test global endpoint
      const globalResponse = await request(app).get('/analytics/global');
      expect(globalResponse.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate XP gained values', async () => {
      const trackingData = {
        event_type: 'test_event',
        xp_gained: -10, // Negative XP
      };

      mockUserClient.single.mockResolvedValueOnce({
        data: { total_xp: 100, level: 2 },
        error: null,
      });

      mockUserClient.single.mockResolvedValueOnce({
        data: { xp_gained: 0, total_xp: 100 },
        error: null,
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send(trackingData);

      // Should handle negative XP gracefully (likely converts to 0)
      expect(response.status).toBe(200);
    });

    it('should handle malformed date parameters in global analytics', async () => {
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/analytics/global?start_date=invalid-date')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200); // Should handle gracefully
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected server errors', async () => {
      (createAuthenticatedClient as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/analytics/track')
        .set('Authorization', 'Bearer mock-token')
        .send({ event_type: 'test_event' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});

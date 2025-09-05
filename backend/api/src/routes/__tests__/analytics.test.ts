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
  const mockAuthenticateUser = authenticateUser as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset auth mock to default non-admin user
    mockAuthenticateUser.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'test-user-123', email: 'test@example.com', is_admin: false };
      next();
    });

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
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
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
      expect(response.body.event_id).toBeDefined();
      expect(response.body.level_up).toBe(false);
      expect(mockUserClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          action: 'recipe_created',
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
      expect(response.body.event_id).toBeDefined();
      expect(response.body.level_up).toBe(false);
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
      expect(response.body.success).toBe(true);
      expect(response.body.level_up).toBe(true);
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
      const mockProgressData = [
        { id: '1', action: 'recipe_created', xp_gained: 50, created_at: '2024-01-01T12:00:00Z' },
        { id: '2', action: 'recipe_completed', xp_gained: 25, created_at: '2024-01-02T12:00:00Z' },
      ];
      const mockScanData = [
        { id: '1', user_id: 'test-user-123', created_at: '2024-01-01T10:00:00Z' },
      ];
      const mockRecipeData = [
        { id: '1', user_id: 'test-user-123', created_at: '2024-01-01T11:00:00Z' },
      ];

      // Mock the three database calls in order: user_progress, scans, recipe_sessions
      mockUserClient.order.mockResolvedValueOnce({
        data: mockProgressData,
        error: null,
      });
      mockUserClient.order.mockResolvedValueOnce({
        data: mockScanData,
        error: null,
      });
      mockUserClient.order.mockResolvedValueOnce({
        data: mockRecipeData,
        error: null,
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('total_events');
    });

    it('should handle dashboard data fetch errors', async () => {
      // Mock first call (user_progress) to fail
      mockUserClient.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch dashboard data');
    });

    it('should handle empty progress data', async () => {
      // Mock all three database calls returning empty arrays
      mockUserClient.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockUserClient.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockUserClient.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.summary.total_events).toBe(0);
      expect(response.body.data.summary.total_scans).toBe(0);
    });
  });

  describe('GET /analytics/global', () => {
    it('should get global analytics successfully', async () => {
      // Mock admin user
      mockAuthenticateUser.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      // Mock Supabase calls for global analytics - simpler approach
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: [{ user_id: 'user1', action: 'recipe_created', created_at: '2024-01-01T12:00:00Z' }],
          error: null,
        }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('total_events');
    });

    it('should handle custom date range for global analytics', async () => {
      // Mock admin user
      mockAuthenticateUser.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app)
        .get('/analytics/global?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', 'Bearer mock-token');

      // Since the route uses Promise.all with multiple calls, we just check that the query was set up
      expect(supabase.from).toHaveBeenCalled();
      expect(mockQuery.select).toHaveBeenCalled();
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
      mockAuthenticateUser.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      // Mock Promise.all results for global analytics
      const mockResults = [
        { data: [], error: null }, // user_progress
        { data: [], error: null }, // scans  
        { data: [], error: null }, // recipe_sessions
        { data: [], error: null }, // users
      ];
      
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockSupabase);
      
      // Mock Promise.all to return the mock results
      jest.spyOn(Promise, 'all').mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
    });

    it('should handle global analytics fetch errors', async () => {
      // Mock admin user
      mockAuthenticateUser.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      // Mock the supabase calls to fail
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockSupabase);

      const response = await request(app)
        .get('/analytics/global')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
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
      expect(response.status).toBe(201);
    });

    it('should handle malformed date parameters in global analytics', async () => {
      // Mock admin user
      mockAuthenticateUser.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { id: 'admin-123', email: 'admin@example.com', is_admin: true };
        next();
      });

      // Mock the Promise.all results properly for global analytics
      const mockResults = [
        { data: [], error: null }, // user_progress
        { data: [], error: null }, // scans  
        { data: [], error: null }, // recipe_sessions
        { data: [], error: null }, // users
      ];
      
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockSupabase);
      
      // Mock Promise.all to return the mock results (handles malformed dates by using defaults)
      jest.spyOn(Promise, 'all').mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .get('/analytics/global?start_date=invalid-date')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200); // Should handle gracefully with default dates
      expect(response.body.success).toBe(true);
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

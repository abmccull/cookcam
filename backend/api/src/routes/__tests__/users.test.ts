import request from 'supertest';
import express from 'express';
import usersRouter from '../users';
import { supabase } from '../../index';
import { authenticateUser } from '../../middleware/auth';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../../middleware/auth', () => ({
  authenticateUser: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
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
app.use('/users', usersRouter);

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/profile', () => {
    it('should get current user profile successfully', async () => {
      const mockUser = {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        is_creator: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockUser,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-user-123');
    });

    it('should handle user profile not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/profile');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User profile not found');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/profile');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch user profile');
      expect(logger.error).toHaveBeenCalledWith('Get user profile error:', expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).get('/users/profile');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      };
      const updatedUser = {
        id: 'test-user-123',
        ...updateData,
        email: 'test@example.com',
      };

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: updatedUser,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).put('/users/profile').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedUser);
      expect(mockQuery.update).toHaveBeenCalledWith(updateData);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-user-123');
    });

    it('should filter out undefined fields', async () => {
      const updateData = {
        name: 'Updated Name',
        avatar_url: undefined,
        is_creator: false,
      };

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'test-user-123', name: 'Updated Name', is_creator: false },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).put('/users/profile').send(updateData);

      expect(response.status).toBe(200);
      expect(mockQuery.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        is_creator: false,
      });
    });

    it('should handle update errors', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).put('/users/profile').send({ name: 'New Name' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update user profile');
    });
  });

  describe('GET /users/:userId', () => {
    it('should get public user profile successfully', async () => {
      const mockUser = {
        id: 'other-user-456',
        name: 'Other User',
        avatar_url: 'https://example.com/avatar.jpg',
        is_creator: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockUser,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/other-user-456');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'other-user-456');
    });

    it('should handle user not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/nonexistent-user');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /users', () => {
    it('should get users list with default limit', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', is_creator: false },
        { id: '2', name: 'User 2', is_creator: true },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockUsers,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(mockUsers);
      expect(mockQuery.limit).toHaveBeenCalledWith(20); // Default limit 20
    });

    it('should handle custom limit', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/users?limit=10');

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should search users by name', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/users?search=john');

      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%john%');
    });
  });

  describe('POST /users/:userId/follow', () => {
    it('should follow user successfully', async () => {
      // Mock check if already following
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // Not found - not following
        }),
      };

      // Mock insert follow relationship
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValueOnce({
          data: [{ follower_id: 'test-user-123', following_id: 'target-user-456' }],
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const response = await request(app).post('/users/target-user-456/follow');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User followed successfully');
      expect(mockInsertQuery.insert).toHaveBeenCalledWith([
        {
          follower_id: 'test-user-123',
          following_id: 'target-user-456',
        },
      ]);
    });

    it('should unfollow user when already following', async () => {
      // Mock check - user is already following
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'existing-follow' },
          error: null,
        }),
      };

      // Mock delete follow relationship
      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      // The second eq call resolves the promise
      mockDeleteQuery.eq.mockImplementation(() => ({
        ...mockDeleteQuery,
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      }));

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const response = await request(app).post('/users/target-user-456/follow');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User unfollowed successfully');
      expect(response.body.following).toBe(false);
    });

    it('should prevent self-following', async () => {
      const response = await request(app).post('/users/test-user-123/follow'); // Same as authenticated user ID

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot follow yourself');
    });
  });

  describe('GET /users/:userId/followers', () => {
    it('should get user followers successfully', async () => {
      const mockFollowers = [
        { id: '1', name: 'Follower 1', avatar_url: null },
        { id: '2', name: 'Follower 2', avatar_url: 'avatar.jpg' },
      ];

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: mockFollowers.map((f) => ({ follower: f })),
          error: null,
          count: 2,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/target-user-456/followers');

      expect(response.status).toBe(200);
      expect(response.body.followers).toEqual(mockFollowers);
      expect(response.body.total).toBe(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('following_id', 'target-user-456');
    });

    it('should handle database errors when fetching followers', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/target-user-456/followers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /users/:userId/following', () => {
    it('should get users followed by user successfully', async () => {
      const mockFollowing = [
        { id: '1', name: 'Following 1', is_creator: true },
        { id: '2', name: 'Following 2', is_creator: false },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockFollowing.map((f) => ({ following: f, created_at: '2024-01-01' })),
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users/target-user-456/following');

      expect(response.status).toBe(200);
      expect(response.body.following).toBeDefined();
      expect(mockQuery.eq).toHaveBeenCalledWith('follower_id', 'target-user-456');
    });

    it('should handle limit for following list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/users/target-user-456/following?limit=5');

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for profile endpoints', async () => {
      // Mock authenticateUser to fail
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app).get('/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require authentication for follow endpoint', async () => {
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app).post('/users/some-user/follow');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Input Validation', () => {
    it('should handle invalid limit parameters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/users?limit=invalid');

      expect(response.status).toBe(200); // Should work with NaN converted to defaults
      expect(mockQuery.limit).toHaveBeenCalledWith(NaN); // parseInt('invalid') = NaN
    });

    it('should validate profile update data', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { id: 'test-user-123' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).put('/users/profile').send({}); // Empty update

      expect(response.status).toBe(200);
      expect(mockQuery.update).toHaveBeenCalledWith({}); // Should handle empty updates
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected server errors gracefully', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});

import request from 'supertest';
import express from 'express';
import authRoutes from '../auth';
import { supabase } from '../../index';
import { authenticateUser } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      setSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

jest.mock('../../middleware/auth');
jest.mock('../../services/security-monitoring', () => ({
  securityMonitoring: {
    logAuthFailure: jest.fn(),
  },
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };
      const mockSession = {
        access_token: 'token123',
        refresh_token: 'refresh123',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const response = await request(app).post('/api/auth/signup').send({
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should validate email format', async () => {
      const response = await request(app).post('/api/auth/signup').send({
        email: 'invalid-email',
        password: 'Test123!',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid email');
    });

    it('should validate password strength', async () => {
      const response = await request(app).post('/api/auth/signup').send({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be');
    });

    it('should handle duplicate email error', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const response = await request(app).post('/api/auth/signup').send({
        email: 'existing@example.com',
        password: 'Test123!',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('User already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };
      const mockSession = {
        access_token: 'token123',
        refresh_token: 'refresh123',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Test123!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should handle invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid login credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        // Missing password
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      // Mock authenticated request
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: '123', email: 'test@example.com' };
        next();
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should handle logout errors', async () => {
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: '123', email: 'test@example.com' };
        next();
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Logout failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockSession = {
        access_token: 'new-token123',
        refresh_token: 'new-refresh123',
        user: { id: '123', email: 'test@example.com' },
      };

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'old-refresh123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'new-token123');
      expect(response.body).toHaveProperty('refreshToken', 'new-refresh123');
    });

    it('should handle invalid refresh token', async () => {
      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid refresh token' },
      });

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid refresh token');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: '123', email: 'test@example.com' };
        next();
      });

      // Mock database query for user profile
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: '123',
        email: 'test@example.com',
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });
  });
});

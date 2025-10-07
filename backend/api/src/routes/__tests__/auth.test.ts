import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { supabase } from '../../index';
import { logger } from '../../utils/logger';
import { securityMonitoring } from '../../services/security-monitoring';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      setSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
  createAuthenticatedClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../services/security-monitoring', () => ({
  securityMonitoring: {
    logAuthFailure: jest.fn(),
    trackSecurityEvent: jest.fn(),
  },
}));

// Setup Express app with the router
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    const validSignupData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully create a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: validSignupData.email,
        created_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: null,
        }),
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', mockSession.access_token);
      expect(response.body).toHaveProperty('refreshToken', mockSession.refresh_token);
      expect(response.body).toHaveProperty('session');
      expect(response.body.message).toBe('User created successfully');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: validSignupData.email,
        password: validSignupData.password,
        options: {
          data: {
            name: validSignupData.name,
          },
        },
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app).post('/auth/signup').send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle Supabase signup errors', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          code: 'user_already_exists',
        },
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already registered');
      expect(response.body.code).toBe('SIGNUP_ERROR');
    });

    it('should retry on 504 timeout errors', async () => {
      // First attempt: 504 error
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          name: 'AuthRetryableFetchError',
          status: 504,
          message: 'Gateway timeout',
        },
      });

      // Second attempt: success
      const mockUser = {
        id: 'user-123',
        email: validSignupData.email,
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({ error: null }),
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(201);
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('Supabase signup timeout on attempt 1/3');
    });

    it('should handle profile creation errors gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: validSignupData.email,
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: { message: 'Profile creation failed' },
        }),
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      // Should still succeed even if profile creation fails
      expect(response.status).toBe(201);
      expect(logger.error).toHaveBeenCalledWith('Profile creation error:', expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      (supabase.auth.signUp as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SIGNUP_ERROR');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('should successfully log in a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: validLoginData.email,
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const response = await request(app).post('/auth/login').send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', mockSession.access_token);
      expect(response.body).toHaveProperty('refreshToken', mockSession.refresh_token);
      expect(response.body).toHaveProperty('session');
      expect(response.body.message).toBe('Signed in successfully');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: validLoginData.email,
        password: validLoginData.password,
      });
    });

    it('should handle missing credentials', async () => {
      const response = await request(app).post('/auth/login').send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          code: 'invalid_credentials',
        },
      });

      const response = await request(app).post('/auth/login').send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid login credentials');

      expect(securityMonitoring.logAuthFailure).toHaveBeenCalledWith(
        expect.any(Object), // req object
        'Invalid login credentials'
      );
    });

    it('should handle unexpected errors', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const response = await request(app).post('/auth/login').send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
      expect(response.body.code).toBe('INVALID_CREDENTIALS');

      expect(securityMonitoring.logAuthFailure).toHaveBeenCalledWith(
        expect.any(Object),
        'Unexpected error during signin'
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      const mockNewSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'user@example.com',
        },
      };

      (supabase.auth.setSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockNewSession },
        error: null,
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: mockRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', mockNewSession.access_token);
      expect(response.body).toHaveProperty('refreshToken', mockNewSession.refresh_token);
      expect(response.body).toHaveProperty('access_token', mockNewSession.access_token);
      expect(response.body).toHaveProperty('refresh_token', mockNewSession.refresh_token);
      expect(response.body).toHaveProperty('expires_in', mockNewSession.expires_in);
      expect(response.body).toHaveProperty('user');

      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: '',
        refresh_token: mockRefreshToken,
      });
    });

    it('should handle missing refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Refresh token is required');
    });

    it('should handle invalid refresh token', async () => {
      (supabase.auth.setSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: {
          message: 'Invalid refresh token',
          code: 'invalid_grant',
        },
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should successfully log out a user', async () => {
      // Mock successful auth
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      // Mock successful auth
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Logout failed' },
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Logout failed');
    });
  });
});

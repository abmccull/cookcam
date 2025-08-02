import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { createMockSupabaseClient, createMockRequest, createMockResponse } from '../../__tests__/utils/testHelpers';
import { mockUsers } from '../../__tests__/utils/mockData';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: mockSupabaseClient,
}));

jest.mock('jsonwebtoken');
jest.mock('bcrypt');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSupabaseClient = createMockSupabaseClient();
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Authentication Routes - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    const validSignupData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User',
    };

    it('should create new user account successfully', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            email: validSignupData.email,
            email_confirmed_at: null,
          },
          session: null,
        },
        error: null,
      });

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: [{ id: 'new-user-id', email: validSignupData.email }],
        error: null,
      });

      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verification email');
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: validSignupData.email,
        password: validSignupData.password,
        options: {
          data: {
            name: validSignupData.name,
          },
        },
      });
    });

    it('should handle existing email registration', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already registered');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          ...validSignupData,
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid email');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          ...validSignupData,
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password must be');
    });

    it('should handle database profile creation errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: validSignupData.email },
          session: null,
        },
        error: null,
      });

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: null,
        error: { message: 'Profile creation failed' },
      });

      const response = await request(app)
        .post('/auth/signup')
        .send(validSignupData);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('profile creation failed');
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: mockUsers.free.email,
      password: 'CorrectPassword123!',
    };

    it('should authenticate user with valid credentials', async () => {
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: {
          id: mockUsers.free.id,
          email: mockUsers.free.email,
        },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession,
        },
        error: null,
      });

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.free,
        error: null,
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(mockUsers.free.id);
      expect(response.body.data.token).toBe(mockSession.access_token);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: validLoginData.email,
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should handle unverified email', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('verify your email');
    });

    it('should update last login timestamp', async () => {
      const mockSession = {
        access_token: 'mock-access-token',
        user: { id: mockUsers.free.id, email: mockUsers.free.email },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.free,
        error: null,
      });

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: {},
        error: null,
      });

      await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        last_login: expect.any(String),
      });
    });

    it('should implement rate limiting for failed attempts', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: validLoginData.email,
            password: 'WrongPassword',
          });
      }

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: validLoginData.email,
          password: 'WrongPassword',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many failed attempts');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user and clear session', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toContain('clear');
    });

    it('should handle logout errors gracefully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Session not found' },
      });

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true); // Still successful for user experience
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockNewSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        user: { id: mockUsers.free.id },
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: mockNewSession,
          user: mockNewSession.user,
        },
        error: null,
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe(mockNewSession.access_token);
    });

    it('should handle invalid refresh token', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid refresh token' },
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid refresh token');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUsers.free.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link sent');
    });

    it('should handle non-existent email gracefully', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null, // Supabase doesn't expose if email exists
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Don't reveal if email exists for security
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid email');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const newPassword = 'NewSecurePassword123!';
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: mockUsers.free.id } },
        error: null,
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .set('Authorization', 'Bearer valid-reset-token')
        .send({ password: newPassword });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .set('Authorization', 'Bearer valid-reset-token')
        .send({ password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password must be');
    });

    it('should handle invalid reset token', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({ password: 'NewPassword123!' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUsers.free.id, email: mockUsers.free.email } },
        error: null,
      });

      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockUsers.free,
        error: null,
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(mockUsers.free.id);
      expect(response.body.data.user.email).toBe(mockUsers.free.email);
    });

    it('should handle invalid token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authorization required');
    });
  });

  describe('Security Features', () => {
    describe('Password validation', () => {
      it('should require minimum length', async () => {
        const response = await request(app)
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            password: '1234567', // Too short
            name: 'Test User',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('8 characters');
      });

      it('should require uppercase letter', async () => {
        const response = await request(app)
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'lowercase123!',
            name: 'Test User',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('uppercase');
      });

      it('should require special character', async () => {
        const response = await request(app)
          .post('/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'Password123',
            name: 'Test User',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('special character');
      });
    });

    describe('Input sanitization', () => {
      it('should sanitize email input', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: '  TEST@EXAMPLE.COM  ',
            password: 'Password123!',
          });

        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
      });

      it('should prevent SQL injection attempts', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: "'; DROP TABLE users; --",
            password: 'password',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valid email');
      });
    });

    describe('Session management', () => {
      it('should set secure cookie flags in production', async () => {
        process.env.NODE_ENV = 'production';

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: mockUsers.free.id, email: mockUsers.free.email },
            session: { access_token: 'token', refresh_token: 'refresh' },
          },
          error: null,
        });

        mockSupabaseClient.from().select().eq().single().mockResolvedValue({
          data: mockUsers.free,
          error: null,
        });

        const response = await request(app)
          .post('/auth/login')
          .send({
            email: mockUsers.free.email,
            password: 'Password123!',
          });

        expect(response.headers['set-cookie'][0]).toContain('Secure');
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
        expect(response.headers['set-cookie'][0]).toContain('SameSite=Strict');

        process.env.NODE_ENV = 'test';
      });
    });
  });
});
import request from 'supertest';
import express from 'express';
import authRouter from '../auth';
import { supabase, createAuthenticatedClient } from '../../index';
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
    rpc: jest.fn(),
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

describe('Auth Routes - Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/me', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return user profile data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const mockProfile = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        level: 5,
        xp: 250,
        total_xp: 1250,
        is_creator: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: mockProfile,
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle missing user profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch - not found
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User profile not found');
    });

    it('should handle database errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch - database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' },
        }),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch user profile');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('PUT /auth/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update user profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const updateData = {
        name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
        is_creator: true,
        creator_bio: 'Professional chef',
        creator_specialty: 'Italian cuisine',
        creator_tier: 2,
      };

      const updatedProfile = {
        id: 'user-123',
        email: 'user@example.com',
        ...updateData,
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedProfile,
          error: null,
        }),
      });

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: updatedProfile,
        message: 'Profile updated successfully',
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle profile update errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile update error
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update profile');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should mark onboarding as completed when updating profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const updateData = {
        name: 'Updated Name',
        onboarding_completed: true,
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, ...updateData },
          error: null,
        }),
      });

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.onboarding_completed).toBe(true);
    });
  });

  describe('POST /auth/profile/photo', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/auth/profile/photo')
        .send({ photoUrl: 'https://example.com/photo.jpg' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should update profile photo', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const photoUrl = 'https://example.com/new-photo.jpg';

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock photo update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, avatar_url: photoUrl },
          error: null,
        }),
      });

      const response = await request(app)
        .post('/auth/profile/photo')
        .set('Authorization', 'Bearer mock-token')
        .send({ photoUrl });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: { ...mockUser, avatar_url: photoUrl },
        message: 'Profile photo updated successfully',
      });
    });

    it('should validate photo URL', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/auth/profile/photo')
        .set('Authorization', 'Bearer mock-token')
        .send({ photoUrl: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid photo URL');
    });

    it('should handle missing photo URL', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/auth/profile/photo')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Photo URL is required');
    });
  });

  describe('DELETE /auth/account', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/auth/account');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should delete user account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock createAuthenticatedClient
      const mockAuthClient = {
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          },
        },
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValue(mockAuthClient);

      // Mock user data deletion
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      });

      const response = await request(app)
        .delete('/auth/account')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');
      expect(mockAuthClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle account deletion errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock createAuthenticatedClient with error
      const mockAuthClient = {
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Deletion failed' },
            }),
          },
        },
      };
      (createAuthenticatedClient as jest.Mock).mockReturnValue(mockAuthClient);

      const response = await request(app)
        .delete('/auth/account')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete account');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /auth/link-referral', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/auth/link-referral')
        .send({ referralCode: 'REF123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should link referral code to user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      const referralCode = 'REF123';

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock referral link
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const response = await request(app)
        .post('/auth/link-referral')
        .set('Authorization', 'Bearer mock-token')
        .send({ referralCode });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Referral code linked successfully',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('link_referral_code', {
        user_id: mockUser.id,
        code: referralCode,
      });
    });

    it('should handle missing referral code', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const response = await request(app)
        .post('/auth/link-referral')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Referral code is required');
    });

    it('should handle invalid referral code', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock referral link error
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid referral code' },
      });

      const response = await request(app)
        .post('/auth/link-referral')
        .set('Authorization', 'Bearer mock-token')
        .send({ referralCode: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid referral code');
    });

    it('should handle database errors during referral linking', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock RPC error
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/auth/link-referral')
        .set('Authorization', 'Bearer mock-token')
        .send({ referralCode: 'REF123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to link referral code');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Error Handling - Signup Retry Logic', () => {
    const validSignupData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should retry maximum times on persistent 504 errors', async () => {
      // All attempts fail with 504
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          name: 'AuthRetryableFetchError',
          status: 504,
          message: 'Gateway timeout',
        },
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(400);
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(3); // Max retries
      expect(logger.warn).toHaveBeenCalledTimes(3);
    });

    it('should handle non-retryable errors immediately', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          name: 'AuthApiError',
          status: 400,
          message: 'Bad request',
        },
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(400);
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1); // No retry
    });

    it('should handle unexpected errors during signup', async () => {
      (supabase.auth.signUp as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).post('/auth/signup').send(validSignupData);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SIGNUP_ERROR');
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error during Supabase signup:',
        expect.any(Error)
      );
    });
  });
});
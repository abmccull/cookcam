import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticateUser,
  optionalAuth,
  AuthenticatedRequest,
} from '../auth';
import { supabase } from '../../index';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  const mockUserId = 'test-user-123';
  const mockEmail = 'test@example.com';
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
  const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    describe('generateAccessToken', () => {
      it('should generate a valid access token', () => {
        const token = generateAccessToken(mockUserId, mockEmail);
        expect(typeof token).toBe('string');

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        expect(decoded.userId).toBe(mockUserId);
        expect(decoded.email).toBe(mockEmail);
        expect(decoded.type).toBe('access');
      });

      it('should include expiration time', () => {
        const token = generateAccessToken(mockUserId, mockEmail);
        const decoded = jwt.decode(token) as any;

        expect(decoded.exp).toBeDefined();
        expect(decoded.iat).toBeDefined();
        expect(decoded.exp > decoded.iat).toBe(true);
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a valid refresh token', () => {
        const token = generateRefreshToken(mockUserId, mockEmail);
        expect(typeof token).toBe('string');

        const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
        expect(decoded.userId).toBe(mockUserId);
        expect(decoded.email).toBe(mockEmail);
        expect(decoded.type).toBe('refresh');
      });

      it('should have longer expiration than access token', () => {
        const accessToken = generateAccessToken(mockUserId, mockEmail);
        const refreshToken = generateRefreshToken(mockUserId, mockEmail);

        const accessDecoded = jwt.decode(accessToken) as any;
        const refreshDecoded = jwt.decode(refreshToken) as any;

        const accessLifetime = accessDecoded.exp - accessDecoded.iat;
        const refreshLifetime = refreshDecoded.exp - refreshDecoded.iat;

        expect(refreshLifetime).toBeGreaterThan(accessLifetime);
      });
    });
  });

  describe('Token Verification', () => {
    describe('verifyAccessToken', () => {
      it('should verify a valid access token', () => {
        const token = generateAccessToken(mockUserId, mockEmail);
        const decoded = verifyAccessToken(token);

        expect(decoded.userId).toBe(mockUserId);
        expect(decoded.email).toBe(mockEmail);
        expect(decoded.type).toBe('access');
      });

      it('should throw error for invalid token', () => {
        expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid or expired token');
      });

      it('should throw error for refresh token', () => {
        const refreshToken = generateRefreshToken(mockUserId, mockEmail);
        expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid or expired token');
      });

      it('should throw error for expired token', () => {
        const expiredToken = jwt.sign(
          { userId: mockUserId, email: mockEmail, type: 'access' },
          JWT_SECRET,
          { expiresIn: '-1h' }
        );

        expect(() => verifyAccessToken(expiredToken)).toThrow('Invalid or expired token');
      });
    });

    describe('verifyRefreshToken', () => {
      it('should verify a valid refresh token', () => {
        const token = generateRefreshToken(mockUserId, mockEmail);
        const decoded = verifyRefreshToken(token);

        expect(decoded.userId).toBe(mockUserId);
        expect(decoded.email).toBe(mockEmail);
        expect(decoded.type).toBe('refresh');
      });

      it('should throw error for invalid token', () => {
        expect(() => verifyRefreshToken('invalid-token')).toThrow(
          'Invalid or expired refresh token'
        );
      });

      it('should throw error for access token', () => {
        const accessToken = generateAccessToken(mockUserId, mockEmail);
        expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid or expired refresh token');
      });
    });
  });

  describe('authenticateUser middleware', () => {
    let req: AuthenticatedRequest;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        headers: {},
      } as AuthenticatedRequest;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      next = jest.fn();
    });

    it('should reject request without authorization header', async () => {
      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', async () => {
      req.headers.authorization = 'Invalid format';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate valid Supabase token', async () => {
      const mockUser = { id: mockUserId, email: mockEmail };
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      req.headers.authorization = 'Bearer valid-supabase-token';

      await authenticateUser(req, res, next);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-supabase-token');
      expect(req.user).toEqual({ id: mockUserId, email: mockEmail });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle Supabase token without email', async () => {
      const mockUser = { id: mockUserId };
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      req.headers.authorization = 'Bearer valid-supabase-token';

      await authenticateUser(req, res, next);

      expect(req.user).toEqual({ id: mockUserId });
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid Supabase token', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      req.headers.authorization = 'Bearer invalid-token';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your session',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Supabase API errors', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      req.headers.authorization = 'Bearer some-token';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your session',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      req.headers = null as any; // Cause an unexpected error

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    let req: AuthenticatedRequest;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        headers: {},
        path: '/test-path',
      } as AuthenticatedRequest;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      next = jest.fn();
    });

    it('should continue as guest without authorization header', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.isFreeTier).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue as guest with invalid authorization format', async () => {
      req.headers.authorization = 'Invalid format';

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.isFreeTier).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate valid Supabase token', async () => {
      const mockUser = { id: mockUserId, email: mockEmail };
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      req.headers.authorization = 'Bearer valid-supabase-token';

      await optionalAuth(req, res, next);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-supabase-token');
      expect(req.user).toEqual({ id: mockUserId, email: mockEmail });
      expect(req.isFreeTier).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should continue as guest with invalid Supabase token', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      req.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.isFreeTier).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue as guest on Supabase API error', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      req.headers.authorization = 'Bearer some-token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.isFreeTier).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Token validation error - continuing as guest');
    });

    it('should continue as guest on unexpected errors', async () => {
      req.headers = null as any; // Cause an unexpected error

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.isFreeTier).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log debug messages for tracing', async () => {
      await optionalAuth(req, res, next);

      expect(logger.debug).toHaveBeenCalledWith('OptionalAuth middleware called for:', {
        path: '/test-path',
      });
      expect(logger.debug).toHaveBeenCalledWith('No auth header - continuing as guest');
    });
  });
});

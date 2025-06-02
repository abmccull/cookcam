import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

// Generate access token
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: TokenPayload = { userId, email, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: TokenPayload = { userId, email, type: 'refresh' };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY } as SignOptions);
};

// Verify access token
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch {
    throw new Error('Invalid or expired token');
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email?: string };
  isFreeTier?: boolean;
}

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);

    // Demo mode support
    if (process.env.DEMO_MODE === 'true' && token.startsWith('demo_token_')) {
      const demoUserId = token.replace('demo_token_', '');
      req.user = { id: demoUserId };
      return next();
    }

    // Verify JWT token
    try {
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.userId, email: decoded.email };
      next();
    } catch {
      // Token might be expired, suggest using refresh token
      return res.status(401).json({ 
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED',
        message: 'Please use refresh token to get a new access token'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({ error: 'Authentication failed' });
  }
}; 
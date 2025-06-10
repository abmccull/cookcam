import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { supabase } from '../index';

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

      // Demo mode removed - using Supabase auth only

    // Production mode - use Supabase auth validation
    try {
      logger.info('🔐 Validating Supabase token:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...'
      });

      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        logger.warn('❌ Supabase token validation failed:', {
          error: error?.message,
          hasUser: !!user,
          tokenPrefix: token.substring(0, 20) + '...'
        });
        return res.status(401).json({ 
          error: 'Token expired or invalid',
          code: 'TOKEN_EXPIRED',
          message: 'Please refresh your session'
        });
      }

      logger.info('✅ Supabase token validation successful:', {
        userId: user.id,
        email: user.email
      });

      req.user = { id: user.id, email: user.email };
      next();
    } catch (validationError: unknown) {
      logger.error('❌ Supabase token validation error:', {
        error: validationError instanceof Error ? validationError.message : 'Unknown error',
        tokenPrefix: token.substring(0, 20) + '...'
      });
      
      return res.status(401).json({ 
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your session'
      });
    }
  } catch (error: unknown) {
    logger.error('Auth middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional authentication - allows both authenticated and guest users
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('👥 OptionalAuth middleware called for:', req.path);
    const authHeader = req.headers.authorization;
    
    // No auth header = continue as guest
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('👤 No auth header - continuing as guest');
      req.user = undefined;
      req.isFreeTier = true;
      return next();
    }

    const token = authHeader.substring(7);

    // Demo mode removed - using Supabase auth only

    // Production mode - use Supabase auth validation for optional auth
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log('❌ Invalid token - continuing as guest');
        req.user = undefined;
        req.isFreeTier = true;
        next();
      } else {
        console.log('✅ Valid token - authenticated user');
        req.user = { id: user.id, email: user.email };
        req.isFreeTier = false;
        next();
      }
    } catch {
      // Invalid token = continue as guest (don't fail)
      console.log('❌ Token validation error - continuing as guest');
      req.user = undefined;
      req.isFreeTier = true;
      next();
    }
  } catch (error: unknown) {
    logger.error('Optional auth middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
    // Even on error, continue as guest
    console.log('⚠️ Error in optionalAuth - continuing as guest');
    req.user = undefined;
    req.isFreeTier = true;
    next();
  }
}; 
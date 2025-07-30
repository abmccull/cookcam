import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { securityMonitoring } from '../services/security-monitoring';
import { logger } from '../utils/logger';

// Simple rate limiting implementation without external dependencies
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Rate limiting middleware
export const rateLimiter = (
  options: {
    windowMs?: number;
    max?: number;
    message?: string;
  } = {}
) => {
  const windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  const max = options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  const message = options.message || 'Too many requests from this IP, please try again later.';

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up old entries
    Object.keys(rateLimitStore).forEach((key) => {
      const entry = rateLimitStore[key];
      if (entry && entry.resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    // Check rate limit
    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else if (rateLimitStore[ip].resetTime > now) {
      rateLimitStore[ip].count++;

      if (rateLimitStore[ip].count > max) {
        // Log rate limit violation
        securityMonitoring
          .logRateLimitViolation(req)
          .catch((err) => logger.error('Failed to log rate limit violation:', err));

        res.status(429).json({
          error: message,
          retryAfter: Math.ceil((rateLimitStore[ip].resetTime - now) / 1000),
        });
        return;
      }
    } else {
      // Reset window
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
    }

    next();
  };
};

// Strict rate limiting for auth endpoints
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window (more reasonable for refresh attempts)
  message: 'Too many authentication attempts, please try again later.',
});

// API key validation for sensitive endpoints
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
};

// Security headers using helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Request validation middleware
export const validateRequest = (schema: {
  validate: (body: unknown) => { error?: { details: { message: string }[] } };
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);

    if (error?.details?.[0]?.message) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message,
      });
      return;
    }

    next();
  };
};

// Sanitize user input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any potential script tags or SQL injection attempts
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '')
        .trim();
    } else if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map((item) => sanitize(item));
      } else {
        const sanitized: Record<string, unknown> = {};
        for (const key in obj) {
          sanitized[key] = sanitize((obj as Record<string, unknown>)[key]);
        }
        return sanitized;
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body) as Record<string, unknown>;
  }
  if (req.query) {
    req.query = sanitize(req.query) as typeof req.query;
  }
  if (req.params) {
    req.params = sanitize(req.params) as typeof req.params;
  }

  next();
};

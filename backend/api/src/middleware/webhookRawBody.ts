import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to preserve raw body for webhook signature verification
 * Stripe and other payment providers need the raw body to verify signatures
 * 
 * IMPORTANT: This must be applied BEFORE express.json() middleware
 */
export function webhookRawBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.originalUrl.includes('/webhook')) {
    let data = '';
    
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
}

/**
 * Express middleware that uses buffer for Stripe webhooks
 * Use this with express.raw() for webhook endpoints
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply to webhook routes
  if (req.path.includes('/webhook')) {
    logger.debug('Webhook request detected, preserving raw body');
    next();
  } else {
    next();
  }
};


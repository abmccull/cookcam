import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorResponse } from '../utils/errors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Extend Request to include requestId
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let isOperational = false;

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
    isOperational = err.isOperational;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    isOperational = true;
  } else if (err.name === 'CastError') {
    // Mongoose cast error
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
    isOperational = true;
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
    isOperational = true;
  }

  // Log error
  const errorLog = {
    error: err.message,
    code,
    statusCode,
    isOperational,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    requestId: req.id,
  };

  if (!isOperational) {
    // Log non-operational errors (programming errors)
    logger.error('Unexpected error:', errorLog);
  } else {
    // Log operational errors at warn level
    logger.warn('Operational error:', errorLog);
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: code,
    message: process.env.NODE_ENV === 'production' && !isOperational
      ? 'Something went wrong'
      : message,
    code,
    statusCode,
    ...(req.id && { requestId: req.id }),
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add additional details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      ...errorLog,
      stack: err.stack,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    statusCode: 404,
    ...(req.id && { requestId: req.id }),
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(404).json(errorResponse);
};

// Validation error formatter
export const formatValidationErrors = (errors: any[]): string => {
  return errors
    .map(err => {
      if (err.param) {
        return `${err.param}: ${err.msg}`;
      }
      return err.msg || err.message;
    })
    .join(', ');
};

// Database error handler
export const handleDatabaseError = (error: any): AppError => {
  // PostgreSQL error codes
  if (error.code === '23505') {
    // Unique constraint violation
    return new AppError('Resource already exists', 409, 'DUPLICATE_ENTRY');
  } else if (error.code === '23503') {
    // Foreign key violation
    return new AppError('Related resource not found', 400, 'FOREIGN_KEY_ERROR');
  } else if (error.code === '22P02') {
    // Invalid input syntax
    return new AppError('Invalid input format', 400, 'INVALID_INPUT');
  }

  // Default database error
  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
};

// External service error handler
export const handleExternalServiceError = (service: string, error: any): AppError => {
  if (error.response) {
    // The request was made and the server responded with a status code
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    if (status === 429) {
      return new AppError(`${service} rate limit exceeded`, 429, 'RATE_LIMIT_ERROR');
    } else if (status >= 500) {
      return new AppError(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
    } else if (status === 401) {
      return new AppError(`${service} authentication failed`, 500, 'SERVICE_AUTH_ERROR');
    }

    return new AppError(`${service} error: ${message}`, 502, 'SERVICE_ERROR');
  } else if (error.request) {
    // The request was made but no response was received
    return new AppError(`Cannot connect to ${service}`, 503, 'SERVICE_UNAVAILABLE');
  }

  // Something happened in setting up the request
  return new AppError(`${service} configuration error`, 500, 'SERVICE_CONFIG_ERROR');
};
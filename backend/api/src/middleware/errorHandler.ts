import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorResponse } from '../utils/errors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from './auth';

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
  req.id = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
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
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error (though we primarily use Supabase auth)
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
  } else if ('code' in err && typeof (err as any).code === 'string') {
    // PostgreSQL/Supabase error codes
    const pgError = err as any;
    const dbErrorResult = handleDatabaseError(pgError);
    statusCode = dbErrorResult.statusCode;
    message = dbErrorResult.message;
    code = dbErrorResult.code || code;
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
    userId: (req as AuthenticatedRequest).user?.id,
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
    message:
      process.env.NODE_ENV === 'production' && !isOperational ? 'Something went wrong' : message,
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
export const asyncHandler =
  (fn: Function) =>
  (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
interface ValidationError {
  param?: string;
  msg?: string;
  message?: string;
}

export const formatValidationErrors = (errors: ValidationError[]): string => {
  return errors
    .map((err) => {
      if (err.param) {
        return `${err.param}: ${err.msg}`;
      }
      return err.msg || err.message;
    })
    .join(', ');
};

// Database error handler
export const handleDatabaseError = (error: { code?: string; message?: string; details?: string }): AppError => {
  // PostgreSQL error codes - https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (error.code) {
    case '23505':
      // Unique constraint violation
      return new AppError('Resource already exists', 409, 'DUPLICATE_ENTRY');
    
    case '23503':
      // Foreign key violation
      return new AppError('Related resource not found', 400, 'FOREIGN_KEY_ERROR');
    
    case '22P02':
      // Invalid text representation
      return new AppError('Invalid input format', 400, 'INVALID_INPUT');
    
    case '23502':
      // Not null violation
      return new AppError('Required field is missing', 400, 'REQUIRED_FIELD_MISSING');
    
    case '23514':
      // Check constraint violation
      return new AppError('Value does not meet constraints', 400, 'CONSTRAINT_VIOLATION');
    
    case '42501':
      // Insufficient privilege
      return new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    
    case '42P01':
      // Undefined table
      return new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    
    case '40001':
      // Serialization failure (deadlock)
      return new AppError('Database transaction failed, please retry', 409, 'TRANSACTION_CONFLICT');
    
    case '53300':
      // Too many connections
      return new AppError('Service temporarily unavailable', 503, 'SERVICE_OVERLOADED');
    
    case 'PGRST116':
      // PostgREST: No rows found (Supabase specific)
      return new AppError('Resource not found', 404, 'NOT_FOUND');
    
    case 'PGRST301':
      // PostgREST: JWT expired (Supabase specific)
      return new AppError('Session expired', 401, 'TOKEN_EXPIRED');
    
    default:
      // Generic database error - don't expose internal details
      logger.error('Unhandled database error', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }
};

// External service error handler
export const handleExternalServiceError = (service: string, error: unknown): AppError => {
  const axiosError = error as {
    response?: {
      status: number;
      data?: { message?: string };
    };
    request?: unknown;
    message?: string;
  };

  if (axiosError.response) {
    // The request was made and the server responded with a status code
    const status = axiosError.response.status;
    const message = axiosError.response.data?.message || axiosError.message;

    if (status === 429) {
      return new AppError(`${service} rate limit exceeded`, 429, 'RATE_LIMIT_ERROR');
    } else if (status >= 500) {
      return new AppError(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
    } else if (status === 401) {
      return new AppError(`${service} authentication failed`, 500, 'SERVICE_AUTH_ERROR');
    }

    return new AppError(`${service} error: ${message}`, 502, 'SERVICE_ERROR');
  } else if (axiosError.request) {
    // The request was made but no response was received
    return new AppError(`Cannot connect to ${service}`, 503, 'SERVICE_UNAVAILABLE');
  }

  // Something happened in setting up the request
  return new AppError(`${service} configuration error`, 500, 'SERVICE_CONFIG_ERROR');
};

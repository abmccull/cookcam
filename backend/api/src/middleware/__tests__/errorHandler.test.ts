import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  requestIdMiddleware,
  asyncHandler,
  notFoundHandler,
  formatValidationErrors,
  handleDatabaseError,
  handleExternalServiceError,
} from '../errorHandler';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  PaymentError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      url: '/test-route',
      method: 'GET',
      path: '/test-route',
      ip: '192.168.1.1',
      headers: {},
    } as any;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.NODE_ENV;
  });

  describe('requestIdMiddleware', () => {
    it('should generate request ID when not provided', () => {
      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.id).toBe('test-uuid-123');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-uuid-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID from headers', () => {
      mockReq.headers = { 'x-request-id': 'existing-id-456' };

      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.id).toBe('existing-id-456');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id-456');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError instances', () => {
      process.env.NODE_ENV = 'production'; // Set to production to avoid details
      const error = new AppError('Custom error message', 400, 'CUSTOM_ERROR');
      mockReq.id = 'test-request-id';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'CUSTOM_ERROR',
        message: 'Custom error message',
        code: 'CUSTOM_ERROR',
        statusCode: 400,
        requestId: 'test-request-id',
        timestamp: expect.any(String),
        path: '/test-route',
      });
      expect(logger.warn).toHaveBeenCalledWith('Operational error:', expect.any(Object));
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        })
      );
    });

    it('should handle CastError', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_ID',
          message: 'Invalid ID format',
          code: 'INVALID_ID',
          statusCode: 400,
        })
      );
    });

    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_TOKEN',
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          statusCode: 401,
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'TOKEN_EXPIRED',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          statusCode: 401,
        })
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        })
      );
      expect(logger.error).toHaveBeenCalledWith('Unexpected error:', expect.any(Object));
    });

    it('should include user information when available', () => {
      const error = new AppError('Test error', 400);
      (mockReq as any).user = { id: 'user-123' };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        'Operational error:',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should hide error details in production for non-operational errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection failed');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      );
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should call next with error when async function throws', async () => {
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });

    it('should not call next when async function succeeds', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 error response', () => {
      const testReq = {
        ...mockReq,
        method: 'POST',
        path: '/non-existent',
        id: 'test-request-id',
      } as any;

      notFoundHandler(testReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'NOT_FOUND',
        message: 'Cannot POST /non-existent',
        code: 'NOT_FOUND',
        statusCode: 404,
        requestId: 'test-request-id',
        timestamp: expect.any(String),
        path: '/non-existent',
      });
    });

    it('should handle missing request ID', () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requestId: expect.anything(),
        })
      );
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors with param and msg', () => {
      const errors = [
        { param: 'email', msg: 'Invalid email format' },
        { param: 'password', msg: 'Password too short' },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('email: Invalid email format, password: Password too short');
    });

    it('should format errors with only msg', () => {
      const errors = [{ msg: 'General validation error' }, { message: 'Another error' }];

      const result = formatValidationErrors(errors);

      expect(result).toBe('General validation error, Another error');
    });

    it('should handle empty errors array', () => {
      const result = formatValidationErrors([]);
      expect(result).toBe('');
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle unique constraint violation (23505)', () => {
      const error = { code: '23505', message: 'Duplicate key error' };

      const result = handleDatabaseError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Resource already exists');
      expect(result.statusCode).toBe(409);
      expect(result.code).toBe('DUPLICATE_ENTRY');
    });

    it('should handle foreign key constraint violation (23503)', () => {
      const error = { code: '23503', message: 'Foreign key error' };

      const result = handleDatabaseError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Related resource not found');
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('FOREIGN_KEY_ERROR');
    });

    it('should handle invalid input syntax (22P02)', () => {
      const error = { code: '22P02', message: 'Invalid input syntax' };

      const result = handleDatabaseError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Invalid input format');
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('should handle unknown database errors', () => {
      const error = { code: 'UNKNOWN', message: 'Unknown database error' };

      const result = handleDatabaseError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Database operation failed');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('DATABASE_ERROR');
    });
  });

  describe('handleExternalServiceError', () => {
    it('should handle rate limit errors (429)', () => {
      const axiosError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      };

      const result = handleExternalServiceError('OpenAI', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('OpenAI rate limit exceeded');
      expect(result.statusCode).toBe(429);
      expect(result.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should handle server errors (5xx)', () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      const result = handleExternalServiceError('Stripe', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Stripe is temporarily unavailable');
      expect(result.statusCode).toBe(503);
      expect(result.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle authentication errors (401)', () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      const result = handleExternalServiceError('Supabase', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Supabase authentication failed');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('SERVICE_AUTH_ERROR');
    });

    it('should handle other response errors', () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };

      const result = handleExternalServiceError('TestService', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('TestService error: Bad request');
      expect(result.statusCode).toBe(502);
      expect(result.code).toBe('SERVICE_ERROR');
    });

    it('should handle network errors (no response)', () => {
      const axiosError = {
        request: {},
        message: 'Network error',
      };

      const result = handleExternalServiceError('TestService', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Cannot connect to TestService');
      expect(result.statusCode).toBe(503);
      expect(result.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle configuration errors', () => {
      const axiosError = {
        message: 'Config error',
      };

      const result = handleExternalServiceError('TestService', axiosError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('TestService configuration error');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('SERVICE_CONFIG_ERROR');
    });
  });
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test message', 400, 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_CODE');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should work without code parameter', () => {
      const error = new AppError('Test message', 500);

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with resource name', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError', () => {
      const error = new ConflictError('Resource conflict');

      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('RateLimitError', () => {
    it('should create RateLimitError with retryAfter', () => {
      const error = new RateLimitError(60);

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryAfter).toBe(60);
    });

    it('should create RateLimitError without retryAfter', () => {
      const error = new RateLimitError();

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('ExternalServiceError', () => {
    it('should create ExternalServiceError', () => {
      const error = new ExternalServiceError('OpenAI', 'Service unavailable');

      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.service).toBe('OpenAI');
    });
  });

  describe('DatabaseError', () => {
    it('should create DatabaseError', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('PaymentError', () => {
    it('should create PaymentError', () => {
      const error = new PaymentError('Payment declined');

      expect(error.message).toBe('Payment declined');
      expect(error.statusCode).toBe(402);
      expect(error.code).toBe('PAYMENT_ERROR');
    });
  });
});

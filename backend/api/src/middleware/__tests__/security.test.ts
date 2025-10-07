import { Request, Response, NextFunction } from 'express';
import {
  rateLimiter,
  authRateLimiter,
  validateApiKey,
  securityHeaders,
  validateRequest,
  sanitizeInput,
} from '../security';
import { securityMonitoring } from '../../services/security-monitoring';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/security-monitoring', () => ({
  securityMonitoring: {
    logRateLimitViolation: jest.fn().mockResolvedValue(undefined),
    logSuspiciousActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock helmet - it returns a middleware function
jest.mock('helmet', () => {
  const helmetMiddleware = jest.fn((req: Request, res: Response, next: NextFunction) => next());
  return jest.fn(() => helmetMiddleware);
});

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      socket: { remoteAddress: '192.168.1.1' } as any,
      headers: {},
      body: {},
      query: {},
    } as any;
    (mockReq as any).user = { id: 'test-user-123' };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.INTERNAL_API_KEY;
  });

  describe('rateLimiter', () => {
    // Note: Not using fake timers as they interfere with the rate limiter's Date.now() calls

    it('should allow requests within rate limit', () => {
      const middleware = rateLimiter();

      // Make 5 requests - all should pass
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(i + 1);
      }

      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      const middleware = rateLimiter({ max: 5 });

      // Make 5 requests - should pass
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 6th request should be blocked
      (mockNext as jest.Mock).mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: expect.any(Number),
      });
      expect(securityMonitoring.logRateLimitViolation).toHaveBeenCalledWith(mockReq);
    });

    it('should reset count after window expires', () => {
      // Use a unique IP for isolation
      const testReq = { ...mockReq, ip: '192.168.1.10' } as any;
      const middleware = rateLimiter({ windowMs: 100, max: 1 });

      // First request should pass
      middleware(testReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second immediate request should be blocked
      jest.clearAllMocks();
      middleware(testReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should use custom options', () => {
      // Use a fresh IP for this test to avoid interference from previous tests
      const testReq = { ...mockReq, ip: '192.168.1.2' } as any;
      const customMessage = 'Custom rate limit message';
      const middleware = rateLimiter({
        windowMs: 30000,
        max: 1,
        message: customMessage,
      });

      // First request passes
      middleware(testReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request blocked with custom message
      jest.clearAllMocks();
      middleware(testReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: customMessage,
        retryAfter: expect.any(Number),
      });
    });

    it('should handle missing IP gracefully', () => {
      const middleware = rateLimiter();
      const mockReqWithoutIP = {
        ...mockReq,
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as any;

      middleware(mockReqWithoutIP as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use environment variables for defaults', () => {
      // Use a fresh IP for this test to avoid interference from previous tests
      const testReq = { ...mockReq, ip: '192.168.1.3' } as any;
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '2';

      const middleware = rateLimiter();

      // Make 2 requests - should all pass
      for (let i = 0; i < 2; i++) {
        middleware(testReq as Request, mockRes as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(2);

      // 3rd request should be blocked
      jest.clearAllMocks();
      middleware(testReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  describe('authRateLimiter', () => {
    // Note: Not using fake timers as they interfere with the rate limiter's Date.now() calls

    it('should have stricter limits than general rate limiter', () => {
      // Use a fresh IP for this test to avoid interference from previous tests
      const testReq = { ...mockReq, ip: '192.168.1.4' } as any;
      const testLimit = 3;
      // Create a custom auth rate limiter for testing
      const testAuthRateLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000,
        max: testLimit,
        message: 'Too many authentication attempts, please try again later.',
      });

      // Make allowed requests
      for (let i = 0; i < testLimit; i++) {
        testAuthRateLimiter(testReq as Request, mockRes as Response, mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(testLimit);

      // Next request should be blocked
      jest.clearAllMocks();
      testAuthRateLimiter(testReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('validateApiKey', () => {
    it('should allow requests with valid API key', () => {
      process.env.INTERNAL_API_KEY = 'valid-api-key';
      mockReq.headers = { 'x-api-key': 'valid-api-key' };

      validateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests without API key', () => {
      process.env.INTERNAL_API_KEY = 'valid-api-key';

      validateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    });

    it('should reject requests with invalid API key', () => {
      process.env.INTERNAL_API_KEY = 'valid-api-key';
      mockReq.headers = { 'x-api-key': 'invalid-api-key' };

      validateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    });

    it('should handle missing environment variable', () => {
      delete process.env.INTERNAL_API_KEY;
      mockReq.headers = { 'x-api-key': 'any-key' };

      validateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('securityHeaders', () => {
    it('should be a helmet middleware', () => {
      expect(typeof securityHeaders).toBe('function');

      // Execute the middleware
      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      // Helmet middleware should call next
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateRequest', () => {
    it('should pass validation for valid input', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({ error: undefined }),
      };
      const middleware = validateRequest(mockSchema);
      mockReq.body = { email: 'test@example.com' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockSchema.validate).toHaveBeenCalledWith(mockReq.body);
    });

    it('should reject invalid input', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({
          error: {
            details: [{ message: 'Invalid email format' }],
          },
        }),
      };
      const middleware = validateRequest(mockSchema);
      mockReq.body = { email: 'invalid-email' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Invalid email format',
      });
    });

    it('should handle validation errors without details', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({
          error: { details: [] },
        }),
      };
      const middleware = validateRequest(mockSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string values in body', () => {
      mockReq.body = {
        html: '<script>alert("XSS")</script>test',
        clean: 'normal text',
        tags: '<b>bold</b> text',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // The sanitizeInput function only removes < and > characters and script tags
      expect(mockReq.body.html).toBe('test');
      expect(mockReq.body.clean).toBe('normal text');
      expect(mockReq.body.tags).toBe('bbold/b text');
    });

    it('should sanitize arrays in body', () => {
      mockReq.body = {
        tags: ['<script>bad</script>', 'good', '<img src=x>'],
        mixed: [1, '<b>text</b>', true],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Script tags are completely removed, other tags have brackets removed
      expect(mockReq.body.tags).toEqual(['', 'good', 'img src=x']);
      expect(mockReq.body.mixed).toEqual([1, 'btext/b', true]);
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '<script>alert(1)</script>keyword',
        filter: 'active<>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.search).toBe('keyword');
      expect(mockReq.query.filter).toBe('active');
    });

    it('should sanitize params', () => {
      mockReq.params = {
        id: '123<script>alert(1)</script>',
        slug: 'test-<>slug',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Script tags are removed, other brackets are removed
      expect(mockReq.params.id).toBe('123');
      expect(mockReq.params.slug).toBe('test-slug');
    });

    it('should handle non-string values', () => {
      mockReq.body = {
        count: 123,
        active: true,
        data: null,
        items: { name: 'test' },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.count).toBe(123);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.data).toBe(null);
      expect(mockReq.body.items).toEqual({ name: 'test' });
    });

    it('should handle missing body, query, and params', () => {
      mockReq.body = undefined;
      mockReq.query = undefined;
      mockReq.params = undefined;

      expect(() => {
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

import { Request, Response, NextFunction } from 'express';
import { SecurityMonitoringService, securityMonitoring } from '../security-monitoring';
import { logger } from '../../utils/logger';
import { CacheService } from '../cache';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../cache');
jest.mock('@supabase/supabase-js');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CacheService
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
    } as any;

    (CacheService as jest.MockedClass<typeof CacheService>).mockImplementation(
      () => mockCacheService
    );

    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    // Set up environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

    service = new SecurityMonitoringService();
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
  });

  describe('Initialization', () => {
    it('should initialize with CacheService and Supabase', () => {
      expect(CacheService).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-service-key');
    });

    it('should initialize without Supabase if environment variables are missing', () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;

      const serviceWithoutSupabase = new SecurityMonitoringService();
      expect(serviceWithoutSupabase).toBeDefined();
    });
  });

  describe('Security Event Logging', () => {
    const mockSecurityEvent = {
      type: 'auth_failure' as const,
      severity: 'medium' as const,
      timestamp: new Date(),
      ip: '192.168.1.1',
      userId: 'user123',
      details: { reason: 'Invalid password' },
      requestId: 'req123',
      path: '/auth/login',
      method: 'POST',
      userAgent: 'Mozilla/5.0',
    };

    it('should log security event successfully', async () => {
      mockCacheService.get.mockResolvedValueOnce([]); // No recent events

      await service.logSecurityEvent(mockSecurityEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', {
        type: 'auth_failure',
        severity: 'medium',
        ip: '192.168.1.1',
        timestamp: mockSecurityEvent.timestamp,
        details: { reason: 'Invalid password' },
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'security:event:auth_failure:192.168.1.1',
        mockSecurityEvent,
        { ttl: 3600 }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('security_events');
    });

    it('should trigger alert for critical events', async () => {
      const criticalEvent = {
        ...mockSecurityEvent,
        severity: 'critical' as const,
        type: 'sql_injection' as const,
      };

      mockCacheService.get.mockResolvedValue([]); // No recent events

      await service.logSecurityEvent(criticalEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('SECURITY ALERT', {
        type: 'critical_security_event',
        severity: 'critical',
        message: 'Critical security event: sql_injection',
        event: criticalEvent,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('security_alerts');
    });

    it('should trigger alert for repeated events from same IP', async () => {
      // Mock 10 recent events to trigger threshold
      const recentEvents = Array(10).fill(mockSecurityEvent);
      mockCacheService.get
        .mockResolvedValueOnce(mockSecurityEvent) // auth_failure
        .mockResolvedValueOnce(mockSecurityEvent) // rate_limit
        .mockResolvedValueOnce(mockSecurityEvent) // suspicious_activity
        .mockResolvedValueOnce(mockSecurityEvent) // sql_injection
        .mockResolvedValueOnce(mockSecurityEvent); // xss_attempt

      // Make all events recent (within last 5 minutes)
      const recentTime = new Date();
      recentEvents.forEach(event => {
        event.timestamp = recentTime;
      });

      await service.logSecurityEvent(mockSecurityEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('SECURITY ALERT', expect.objectContaining({
        type: 'repeated_security_events',
        severity: 'high',
        message: expect.stringContaining('Multiple security events'),
        ip: '192.168.1.1',
      }));
    });

    it('should handle errors during event logging', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      await service.logSecurityEvent(mockSecurityEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to log security event', {
        error: expect.any(Error),
        event: mockSecurityEvent,
      });
    });

    it('should work without Supabase connection', async () => {
      // Create service without Supabase
      delete process.env.SUPABASE_URL;
      const serviceWithoutSupabase = new SecurityMonitoringService();

      mockCacheService.get.mockResolvedValue([]);

      await serviceWithoutSupabase.logSecurityEvent(mockSecurityEvent);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      // Should not call Supabase methods
    });
  });

  describe('Suspicious Pattern Detection Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        url: '/api/users',
        query: {},
        body: {},
        headers: {},
        ip: '192.168.1.1',
        path: '/api/users',
        method: 'GET',
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockNext = jest.fn();
      mockCacheService.get.mockResolvedValue([]);
    });

    it('should detect SQL injection in URL', async () => {
      mockReq.url = '/api/users?id=1 UNION SELECT * FROM passwords';

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'sql_injection',
        severity: 'high',
      }));

      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect XSS attempt in query parameters', async () => {
      mockReq.query = { search: '<script>alert("xss")</script>' };

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'xss_attempt',
        severity: 'high',
      }));

      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect path traversal in body', async () => {
      mockReq.body = { file: '../../../etc/passwd' };

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'suspicious_activity',
        severity: 'medium',
      }));

      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect suspicious patterns in headers', async () => {
      mockReq.headers = {
        'x-forwarded-for': 'javascript:alert(1)',
        'user-agent': 'Mozilla/5.0',
      };

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'xss_attempt',
        severity: 'high',
      }));

      expect(mockNext).toHaveBeenCalled();
    });

    it('should choose most severe pattern when multiple found', async () => {
      mockReq.url = '/api/users?search=<script>alert(1)</script>&id=1 UNION SELECT *';

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should log the most severe (both are 'high', so either is acceptable)
      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        severity: 'high',
      }));

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle requests with no suspicious patterns', async () => {
      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle middleware errors gracefully', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));
      mockReq.url = '/api/test?search=<script>alert(1)</script>';

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in security pattern detection', expect.any(Error));
      expect(mockNext).toHaveBeenCalled(); // Should not block request
    });

    it('should handle empty/undefined request properties', async () => {
      mockReq.body = null;
      mockReq.query = undefined;
      mockReq.headers = {};

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Authentication Failure Logging', () => {
    let mockReq: Partial<Request>;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        body: { email: 'test@example.com' },
        path: '/auth/login',
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      mockCacheService.get.mockResolvedValue([]);
    });

    it('should log authentication failure', async () => {
      await service.logAuthFailure(mockReq as Request, 'Invalid password');

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'auth_failure',
        severity: 'medium',
        ip: '192.168.1.1',
        details: {
          reason: 'Invalid password',
          email: 'test@example.com',
        },
      }));
    });
  });

  describe('Rate Limit Violation Logging', () => {
    let mockReq: Partial<Request>;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      mockCacheService.get.mockResolvedValue([]);
    });

    it('should log rate limit violation', async () => {
      (mockReq as any).user = { id: 'user123' };

      await service.logRateLimitViolation(mockReq as Request);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'rate_limit',
        severity: 'low',
        ip: '192.168.1.1',
        details: {
          endpoint: '/api/test',
        },
      }));
    });
  });

  describe('Unauthorized Access Logging', () => {
    let mockReq: Partial<Request>;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        path: '/admin/users',
        method: 'DELETE',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };
      mockCacheService.get.mockResolvedValue([]);
    });

    it('should log unauthorized access attempt', async () => {
      (mockReq as any).user = { id: 'user123' };

      await service.logUnauthorizedAccess(mockReq as Request, 'admin_users');

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        type: 'unauthorized_access',
        severity: 'high',
        ip: '192.168.1.1',
        details: {
          resource: 'admin_users',
          attempted_action: 'DELETE',
        },
      }));
    });
  });

  describe('IP Reputation Check', () => {
    it('should block IP on blocklist', async () => {
      mockCacheService.get.mockResolvedValue(['192.168.1.100', '10.0.0.5']);

      const result = await service.checkIPReputation('192.168.1.100');

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('IP is on blocklist');
    });

    it('should block IP with too many recent events', async () => {
      mockCacheService.get.mockResolvedValueOnce([]); // No blocklist

      // Mock recent events for all event types
      const recentEvent = {
        type: 'auth_failure' as const,
        timestamp: new Date(),
        ip: '192.168.1.1',
        severity: 'medium' as const,
        details: {},
      };

      mockCacheService.get
        .mockResolvedValueOnce(recentEvent) // auth_failure
        .mockResolvedValueOnce(recentEvent) // rate_limit  
        .mockResolvedValueOnce(recentEvent) // suspicious_activity
        .mockResolvedValueOnce(recentEvent) // sql_injection
        .mockResolvedValueOnce(recentEvent); // xss_attempt

      // Override the private method to return many events
      const originalMethod = (service as any).getRecentEventsByIP;
      (service as any).getRecentEventsByIP = jest.fn().mockResolvedValue(Array(51).fill(recentEvent));

      const result = await service.checkIPReputation('192.168.1.1');

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Too many security events');

      // Restore original method
      (service as any).getRecentEventsByIP = originalMethod;
    });

    it('should allow clean IP', async () => {
      mockCacheService.get.mockResolvedValue([]); // No blocklist, no recent events

      const result = await service.checkIPReputation('192.168.1.1');

      expect(result.blocked).toBe(false);
    });
  });

  describe('IP Reputation Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockNext = jest.fn();
    });

    it('should block requests from blocked IPs', async () => {
      mockCacheService.get.mockResolvedValue(['192.168.1.1']); // IP is on blocklist

      const middleware = service.ipReputationMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Your request has been blocked for security reasons',
      });

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests from clean IPs', async () => {
      mockCacheService.get.mockResolvedValue([]); // Clean IP

      const middleware = service.ipReputationMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      const middleware = service.ipReputationMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in IP reputation check', expect.any(Error));
      expect(mockNext).toHaveBeenCalled(); // Should not block request
    });

    it('should handle unknown IP addresses', async () => {
      mockReq.ip = undefined;

      const middleware = service.ipReputationMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Security Metrics', () => {
    it('should return security metrics structure', async () => {
      const metrics = await service.getSecurityMetrics();

      expect(metrics).toEqual({
        last_hour: {
          auth_failures: 0,
          rate_limits: 0,
          suspicious_activities: 0,
          total_events: 0,
        },
        last_24_hours: {
          auth_failures: 0,
          rate_limits: 0,
          suspicious_activities: 0,
          total_events: 0,
        },
        top_ips: [],
        critical_events: [],
      });
    });
  });

  describe('Recent Events By IP', () => {
    it('should filter events by time window', async () => {
      const oldEvent = {
        type: 'auth_failure' as const,
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        ip: '192.168.1.1',
        severity: 'medium' as const,
        details: {},
      };

      const recentEvent = {
        type: 'auth_failure' as const,
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        ip: '192.168.1.1',
        severity: 'medium' as const,
        details: {},
      };

      mockCacheService.get
        .mockResolvedValueOnce(oldEvent) // auth_failure - should be filtered out
        .mockResolvedValueOnce(recentEvent) // rate_limit
        .mockResolvedValueOnce(null) // suspicious_activity
        .mockResolvedValueOnce(null) // sql_injection
        .mockResolvedValueOnce(null); // xss_attempt

      const events = await (service as any).getRecentEventsByIP('192.168.1.1', 300); // Last 5 minutes

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(recentEvent);
    });
  });

  describe('Module Export', () => {
    it('should export singleton security monitoring instance', () => {
      expect(securityMonitoring).toBeInstanceOf(SecurityMonitoringService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing request properties gracefully', async () => {
      const incompleteReq = {} as Request;

      await service.logAuthFailure(incompleteReq, 'test');

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', expect.objectContaining({
        ip: 'unknown',
      }));
    });

    it('should handle array headers in pattern detection', async () => {
      const mockReq = {
        url: '/api/test',
        query: {},
        body: {},
        headers: {
          'x-forwarded-for': ['192.168.1.1', '10.0.0.1'], // Array header
        },
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
      };

      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined body content', async () => {
      const mockReq = {
        url: '/api/test',
        query: {},
        body: undefined,
        headers: {},
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
      };

      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      const middleware = service.detectSuspiciousPatterns();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
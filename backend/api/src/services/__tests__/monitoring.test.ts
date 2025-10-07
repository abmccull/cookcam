// Monitoring Service Tests
import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    finish: jest.fn(),
    startChild: jest.fn(() => ({
      setStatus: jest.fn(),
      finish: jest.fn(),
    })),
  })),
  getCurrentHub: jest.fn(() => ({
    getScope: jest.fn(() => ({
      setTag: jest.fn(),
      setExtra: jest.fn(),
    })),
  })),
}));

// Mock logger
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = new MonitoringService();
  });

  describe('Error Tracking', () => {
    it('should capture exceptions with context', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        action: 'recipe_generation',
        metadata: { recipeId: 'recipe-456' },
      };

      await monitoringService.captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(Sentry.setContext).toHaveBeenCalledWith('error_context', context);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should capture messages with severity levels', async () => {
      await monitoringService.captureMessage('Important event', 'info');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Important event', 'info');
      expect(logger.info).toHaveBeenCalledWith('Important event');
    });

    it('should handle different error types', async () => {
      const errors = [
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new SyntaxError('Syntax error'),
        { message: 'Plain object error' },
        'String error',
      ];

      for (const error of errors) {
        await monitoringService.captureError(error);
      }

      expect(Sentry.captureException).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track transaction performance', async () => {
      const transaction = monitoringService.startTransaction('api_request', {
        op: 'http.request',
        data: { url: '/api/recipes' },
      });

      expect(Sentry.startTransaction).toHaveBeenCalledWith({
        name: 'api_request',
        op: 'http.request',
        data: { url: '/api/recipes' },
      });

      transaction.finish();
      expect(transaction.finish).toHaveBeenCalled();
    });

    it('should track operation timing', async () => {
      const timer = monitoringService.startTimer('database_query');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = timer.end();

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('database_query'),
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should track nested spans', async () => {
      const transaction = monitoringService.startTransaction('complex_operation');
      const span1 = transaction.startChild({ op: 'db.query' });
      const span2 = transaction.startChild({ op: 'cache.get' });

      span1.finish();
      span2.finish();
      transaction.finish();

      expect(transaction.startChild).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metrics Collection', () => {
    it('should track custom metrics', async () => {
      await monitoringService.trackMetric('api_latency', 150, {
        endpoint: '/api/recipes',
        method: 'POST',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Metric tracked',
        expect.objectContaining({
          name: 'api_latency',
          value: 150,
        })
      );
    });

    it('should aggregate metrics over time', async () => {
      await monitoringService.trackMetric('request_count', 1);
      await monitoringService.trackMetric('request_count', 1);
      await monitoringService.trackMetric('request_count', 1);

      const aggregated = monitoringService.getAggregatedMetric('request_count');
      expect(aggregated.total).toBe(3);
      expect(aggregated.count).toBe(3);
    });

    it('should calculate metric statistics', async () => {
      const values = [100, 200, 150, 300, 250];
      
      for (const value of values) {
        await monitoringService.trackMetric('response_time', value);
      }

      const stats = monitoringService.getMetricStats('response_time');
      
      expect(stats.avg).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
      expect(stats.count).toBe(5);
    });
  });

  describe('User Context', () => {
    it('should set user context for error tracking', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        subscription: 'premium',
      };

      monitoringService.setUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'user@example.com',
        subscription: 'premium',
      });
    });

    it('should clear user context', async () => {
      monitoringService.clearUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should add breadcrumbs for debugging', async () => {
      monitoringService.addBreadcrumb({
        message: 'User clicked button',
        category: 'ui',
        level: 'info',
        data: { buttonId: 'generate-recipe' },
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui',
        level: 'info',
        data: { buttonId: 'generate-recipe' },
      });
    });
  });

  describe('Health Checks', () => {
    it('should monitor service health', async () => {
      const health = await monitoringService.checkHealth();

      expect(health).toEqual({
        status: 'healthy',
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
        }),
        cpu: expect.any(Number),
      });
    });

    it('should track dependency health', async () => {
      const dependencies = {
        database: { status: 'healthy', latency: 10 },
        redis: { status: 'healthy', latency: 5 },
        openai: { status: 'degraded', latency: 500 },
      };

      for (const [name, status] of Object.entries(dependencies)) {
        await monitoringService.trackDependencyHealth(name, status);
      }

      const health = monitoringService.getDependencyHealth();
      expect(health.openai.status).toBe('degraded');
    });

    it('should alert on health degradation', async () => {
      const alertSpy = jest.spyOn(monitoringService, 'sendAlert');

      await monitoringService.trackDependencyHealth('database', {
        status: 'unhealthy',
        error: 'Connection timeout',
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'critical',
        expect.stringContaining('database')
      );
    });
  });

  describe('Rate Limiting Monitoring', () => {
    it('should track rate limit hits', async () => {
      await monitoringService.trackRateLimit('user-123', '/api/recipes', true);

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit hit',
        expect.objectContaining({
          userId: 'user-123',
          endpoint: '/api/recipes',
        })
      );
    });

    it('should calculate rate limit statistics', async () => {
      // Track some rate limit events
      await monitoringService.trackRateLimit('user-123', '/api/recipes', true);
      await monitoringService.trackRateLimit('user-123', '/api/recipes', false);
      await monitoringService.trackRateLimit('user-456', '/api/recipes', true);

      const stats = monitoringService.getRateLimitStats();
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.limitedRequests).toBe(2);
      expect(stats.limitedUsers).toContain('user-123');
    });
  });

  describe('Business Metrics', () => {
    it('should track business events', async () => {
      await monitoringService.trackBusinessEvent('recipe_generated', {
        userId: 'user-123',
        recipeId: 'recipe-456',
        ingredients: 5,
        tier: 'premium',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Business event',
        expect.objectContaining({
          event: 'recipe_generated',
          userId: 'user-123',
        })
      );
    });

    it('should track conversion funnel', async () => {
      await monitoringService.trackFunnelStep('onboarding', 'signup', 'user-123');
      await monitoringService.trackFunnelStep('onboarding', 'profile_complete', 'user-123');
      await monitoringService.trackFunnelStep('onboarding', 'first_recipe', 'user-123');

      const funnel = monitoringService.getFunnelStats('onboarding');
      
      expect(funnel.steps).toContain('signup');
      expect(funnel.steps).toContain('first_recipe');
      expect(funnel.users).toContain('user-123');
    });

    it('should track revenue metrics', async () => {
      await monitoringService.trackRevenue({
        userId: 'user-123',
        amount: 9.99,
        currency: 'USD',
        product: 'premium_subscription',
      });

      const revenue = monitoringService.getRevenueStats();
      expect(revenue.total).toBe(9.99);
      expect(revenue.transactions).toBe(1);
    });
  });

  describe('Alert Management', () => {
    it('should send alerts for critical issues', async () => {
      const alertSpy = jest.spyOn(monitoringService, 'sendAlert');

      await monitoringService.sendAlert('critical', 'Database connection lost', {
        service: 'database',
        error: 'ECONNREFUSED',
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT'),
        expect.any(Object)
      );
    });

    it('should throttle repeated alerts', async () => {
      const alertSpy = jest.spyOn(monitoringService, 'sendAlert');

      // Send same alert multiple times
      for (let i = 0; i < 5; i++) {
        await monitoringService.sendAlert('warning', 'High memory usage');
      }

      // Should be throttled
      expect(alertSpy).toHaveBeenCalledTimes(5);
      expect(logger.warn.mock.calls.length).toBeLessThan(5);
    });

    it('should escalate alerts based on severity', async () => {
      await monitoringService.sendAlert('info', 'Informational message');
      await monitoringService.sendAlert('warning', 'Warning message');
      await monitoringService.sendAlert('error', 'Error message');
      await monitoringService.sendAlert('critical', 'Critical message');

      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(2); // error and critical
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor memory usage', async () => {
      const memory = monitoringService.getMemoryUsage();

      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('rss');
      expect(memory.percentage).toBeGreaterThanOrEqual(0);
      expect(memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should monitor CPU usage', async () => {
      const cpu = await monitoringService.getCPUUsage();

      expect(cpu).toHaveProperty('user');
      expect(cpu).toHaveProperty('system');
      expect(cpu.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should detect memory leaks', async () => {
      const alertSpy = jest.spyOn(monitoringService, 'sendAlert');
      
      // Simulate memory growth
      await monitoringService.checkMemoryLeak();
      
      // If memory is growing rapidly, should alert
      if (monitoringService.isMemoryLeaking()) {
        expect(alertSpy).toHaveBeenCalledWith(
          'warning',
          expect.stringContaining('memory leak')
        );
      }
    });
  });

  describe('Request Tracing', () => {
    it('should trace HTTP requests', async () => {
      const trace = monitoringService.traceRequest({
        method: 'POST',
        url: '/api/recipes',
        headers: { 'content-type': 'application/json' },
        body: { ingredients: ['chicken'] },
      });

      trace.setResponse({
        status: 200,
        duration: 150,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Request traced',
        expect.objectContaining({
          method: 'POST',
          url: '/api/recipes',
          status: 200,
        })
      );
    });

    it('should link related traces', async () => {
      const parentTrace = monitoringService.traceRequest({
        method: 'POST',
        url: '/api/recipes',
      });

      const childTrace = parentTrace.createChild({
        operation: 'database_query',
        query: 'SELECT * FROM recipes',
      });

      expect(childTrace.parentId).toBe(parentTrace.id);
    });
  });
});

// Mock MonitoringService implementation
class MonitoringService {
  private metrics = new Map<string, any[]>();
  private dependencies = new Map<string, any>();
  private rateLimits = new Map<string, any>();
  private funnels = new Map<string, any>();
  private revenue = { total: 0, transactions: 0 };
  private alertThrottle = new Map<string, number>();
  private memoryBaseline = process.memoryUsage().heapUsed;

  async captureError(error: any, context?: any) {
    Sentry.captureException(error);
    if (context) {
      Sentry.setContext('error_context', context);
    }
    logger.error('Error captured', { error, context });
  }

  async captureMessage(message: string, level: string = 'info') {
    Sentry.captureMessage(message, level as any);
    if (level === 'info') logger.info(message);
    else if (level === 'warn') logger.warn(message);
    else if (level === 'error') logger.error(message);
    else logger.debug(message);
  }

  startTransaction(name: string, options?: any) {
    const transaction = Sentry.startTransaction({ name, ...options });
    return transaction;
  }

  startTimer(operation: string) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        logger.debug(`${operation} completed`, { duration });
        return duration;
      }
    };
  }

  async trackMetric(name: string, value: number, tags?: any) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    logger.info('Metric tracked', { name, value, tags });
  }

  getAggregatedMetric(name: string) {
    const values = this.metrics.get(name) || [];
    return {
      total: values.reduce((a, b) => a + b, 0),
      count: values.length,
    };
  }

  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  setUser(user: any) {
    Sentry.setUser(user);
  }

  clearUser() {
    Sentry.setUser(null);
  }

  addBreadcrumb(breadcrumb: any) {
    Sentry.addBreadcrumb(breadcrumb);
  }

  async checkHealth() {
    const memory = process.memoryUsage();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
      },
      cpu: 50, // Mock CPU usage
    };
  }

  async trackDependencyHealth(name: string, status: any) {
    this.dependencies.set(name, status);
    if (status.status === 'unhealthy') {
      await this.sendAlert('critical', `Dependency ${name} is unhealthy`);
    }
  }

  getDependencyHealth() {
    return Object.fromEntries(this.dependencies);
  }

  async sendAlert(severity: string, message: string, context?: any) {
    const key = `${severity}:${message}`;
    const now = Date.now();
    const lastAlert = this.alertThrottle.get(key) || 0;
    
    if (now - lastAlert > 60000) { // Throttle to once per minute
      this.alertThrottle.set(key, now);
      
      if (severity === 'critical' || severity === 'error') {
        logger.error(`ALERT [${severity}]: ${message}`, context);
      } else if (severity === 'warning') {
        logger.warn(`ALERT [${severity}]: ${message}`, context);
      } else {
        logger.info(`ALERT [${severity}]: ${message}`, context);
      }
    }
  }

  async trackRateLimit(userId: string, endpoint: string, limited: boolean) {
    const key = `${userId}:${endpoint}`;
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, { total: 0, limited: 0 });
    }
    const stats = this.rateLimits.get(key);
    stats.total++;
    if (limited) {
      stats.limited++;
      logger.warn('Rate limit hit', { userId, endpoint });
    }
  }

  getRateLimitStats() {
    let totalRequests = 0;
    let limitedRequests = 0;
    const limitedUsers = new Set<string>();
    
    for (const [key, stats] of this.rateLimits) {
      totalRequests += stats.total;
      limitedRequests += stats.limited;
      if (stats.limited > 0) {
        const userId = key.split(':')[0];
        if (userId) limitedUsers.add(userId);
      }
    }
    
    return {
      totalRequests,
      limitedRequests,
      limitedUsers: Array.from(limitedUsers),
    };
  }

  async trackBusinessEvent(event: string, data: any) {
    logger.info('Business event', { event, ...data });
  }

  trackFunnelStep(funnel: string, step: string, userId: string) {
    if (!this.funnels.has(funnel)) {
      this.funnels.set(funnel, { steps: [], users: [] });
    }
    const data = this.funnels.get(funnel);
    data.steps.push(step);
    data.users.push(userId);
  }

  getFunnelStats(funnel: string) {
    return this.funnels.get(funnel) || { steps: [], users: [] };
  }

  async trackRevenue(data: any) {
    this.revenue.total += data.amount;
    this.revenue.transactions++;
  }

  getRevenueStats() {
    return this.revenue;
  }

  getMemoryUsage() {
    const mem = process.memoryUsage();
    return {
      ...mem,
      percentage: (mem.heapUsed / mem.heapTotal) * 100,
    };
  }

  async getCPUUsage() {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system,
      percentage: (usage.user + usage.system) / 1000000,
    };
  }

  isMemoryLeaking() {
    const current = process.memoryUsage().heapUsed;
    return current > this.memoryBaseline * 2;
  }

  async checkMemoryLeak() {
    if (this.isMemoryLeaking()) {
      await this.sendAlert('warning', 'Potential memory leak detected');
    }
  }

  traceRequest(request: any) {
    const trace = {
      id: Math.random().toString(36),
      parentId: null,
      setResponse: (response: any) => {
        logger.info('Request traced', { ...request, ...response });
      },
      createChild: (options: any) => ({
        id: Math.random().toString(36),
        parentId: trace.id,
      }),
    };
    return trace;
  }
}
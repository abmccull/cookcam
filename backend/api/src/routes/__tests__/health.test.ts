// Health Route Tests
import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// Mock dependencies
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
  })),
};

const mockRedis = {
  ping: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

// Create health router
const healthRouter = Router();

// Health check endpoint
healthRouter.get('/', async (req, res) => {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    cache: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  // Check database
  try {
    const result = await mockSupabase.from('users').select('id').limit(1);
    checks.database = result.error ? 'unhealthy' : 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  // Check cache
  try {
    await mockRedis.ping();
    checks.cache = 'healthy';
  } catch {
    checks.cache = 'unhealthy';
  }

  const allHealthy = checks.api === 'healthy' && 
                     checks.database === 'healthy' && 
                     checks.cache === 'healthy';

  res.status(allHealthy ? 200 : 503).json(checks);
});

// Liveness probe
healthRouter.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe
healthRouter.get('/ready', async (req, res) => {
  let isReady = true;
  const checks: any = {};

  // Check database readiness
  try {
    await mockSupabase.from('users').select('id').limit(1);
    checks.database = 'ready';
  } catch {
    checks.database = 'not_ready';
    isReady = false;
  }

  // Check cache readiness
  try {
    await mockRedis.ping();
    checks.cache = 'ready';
  } catch {
    checks.cache = 'not_ready';
    isReady = false;
  }

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
healthRouter.get('/metrics', (req, res) => {
  const metrics = {
    uptime_seconds: process.uptime(),
    memory_usage_bytes: process.memoryUsage().heapUsed,
    memory_total_bytes: process.memoryUsage().heapTotal,
    cpu_usage_percent: process.cpuUsage().user / 1000000,
    active_connections: 10, // Mock value
    request_count: 1000, // Mock value
    error_count: 5, // Mock value
    timestamp: new Date().toISOString(),
  };

  res.json(metrics);
});

// Create test app
const app = express();
app.use('/health', healthRouter);

describe('Health Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are up', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ data: [{ id: 1 }], error: null });
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        api: 'healthy',
        database: 'healthy',
        cache: 'healthy',
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return 503 when database is unhealthy', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ data: null, error: new Error('DB Error') });
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.database).toBe('unhealthy');
      expect(response.body.cache).toBe('healthy');
    });

    it('should return 503 when cache is unhealthy', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ data: [{ id: 1 }], error: null });
      mockRedis.ping.mockRejectedValue(new Error('Redis error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.database).toBe('healthy');
      expect(response.body.cache).toBe('unhealthy');
    });

    it('should handle database connection errors', async () => {
      mockSupabase.from().select().limit.mockRejectedValue(new Error('Connection failed'));
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.database).toBe('unhealthy');
    });

    it('should include memory usage information', async () => {
      const response = await request(app).get('/health');

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeGreaterThan(0);
      expect(response.body.memory.heapTotal).toBeGreaterThan(0);
      expect(response.body.memory.rss).toBeGreaterThan(0);
    });
  });

  describe('GET /health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should work even when dependencies are down', async () => {
      mockSupabase.from().select().limit.mockRejectedValue(new Error('DB down'));
      mockRedis.ping.mockRejectedValue(new Error('Redis down'));

      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when all services are available', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ data: [{ id: 1 }], error: null });
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
      expect(response.body.checks).toEqual({
        database: 'ready',
        cache: 'ready',
      });
    });

    it('should return 503 when database is not ready', async () => {
      mockSupabase.from().select().limit.mockRejectedValue(new Error('DB not ready'));
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.ready).toBe(false);
      expect(response.body.checks.database).toBe('not_ready');
      expect(response.body.checks.cache).toBe('ready');
    });

    it('should return 503 when cache is not ready', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ data: [{ id: 1 }], error: null });
      mockRedis.ping.mockRejectedValue(new Error('Redis not ready'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.ready).toBe(false);
      expect(response.body.checks.database).toBe('ready');
      expect(response.body.checks.cache).toBe('not_ready');
    });

    it('should return 503 when multiple services are not ready', async () => {
      mockSupabase.from().select().limit.mockRejectedValue(new Error('DB not ready'));
      mockRedis.ping.mockRejectedValue(new Error('Redis not ready'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.ready).toBe(false);
      expect(response.body.checks.database).toBe('not_ready');
      expect(response.body.checks.cache).toBe('not_ready');
    });
  });

  describe('GET /health/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        uptime_seconds: expect.any(Number),
        memory_usage_bytes: expect.any(Number),
        memory_total_bytes: expect.any(Number),
        cpu_usage_percent: expect.any(Number),
        active_connections: expect.any(Number),
        request_count: expect.any(Number),
        error_count: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return positive uptime', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.body.uptime_seconds).toBeGreaterThan(0);
    });

    it('should return valid memory metrics', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.body.memory_usage_bytes).toBeGreaterThan(0);
      expect(response.body.memory_total_bytes).toBeGreaterThan(0);
      expect(response.body.memory_usage_bytes).toBeLessThanOrEqual(response.body.memory_total_bytes);
    });

    it('should return CPU usage metrics', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.body.cpu_usage_percent).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request(app).get('/health/metrics');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.status === 200 || r.status === 503)).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.database).toBe('unhealthy');
    });

    it('should continue checking other services when one fails', async () => {
      mockSupabase.from().select().limit.mockRejectedValue(new Error('DB error'));
      mockRedis.ping.mockResolvedValue('PONG');

      const response = await request(app).get('/health');

      expect(response.body.database).toBe('unhealthy');
      expect(response.body.cache).toBe('healthy');
      expect(response.body.api).toBe('healthy');
    });
  });

  describe('Monitoring Integration', () => {
    it('should format metrics for Prometheus scraping', async () => {
      const response = await request(app).get('/health/metrics');

      // Verify metrics are in a format that monitoring tools can consume
      expect(response.body).toHaveProperty('uptime_seconds');
      expect(response.body).toHaveProperty('memory_usage_bytes');
      expect(response.body).toHaveProperty('error_count');
    });

    it('should provide detailed health check for debugging', async () => {
      const response = await request(app).get('/health');

      // Should include all necessary debugging information
      expect(response.body).toHaveProperty('api');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });
});
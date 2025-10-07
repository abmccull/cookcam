// Cache Service Tests
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    pipeline: jest.fn(() => ({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
    scan: jest.fn(),
    flushdb: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
    mockRedis = (cacheService as any).redis;
  });

  describe('Basic Operations', () => {
    it('should set a value in cache', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', { data: 'test' }, 3600);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ data: 'test' })
      );
    });

    it('should get a value from cache', async () => {
      const testData = { data: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent keys', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should delete a key from cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('TTL Management', () => {
    it('should set TTL for existing key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.setTTL('test-key', 7200);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 7200);
    });

    it('should get TTL for a key', async () => {
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await cacheService.getTTL('test-key');

      expect(result).toBe(3600);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
    });

    it('should handle permanent keys (no TTL)', async () => {
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await cacheService.getTTL('permanent-key');

      expect(result).toBe(-1);
    });
  });

  describe('Pattern Operations', () => {
    it('should find keys by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);

      const result = await cacheService.getKeysByPattern('user:*');

      expect(result).toEqual(['user:1', 'user:2', 'user:3']);
      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
    });

    it('should delete keys by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['temp:1', 'temp:2']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.deleteByPattern('temp:*');

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('temp:*');
      expect(mockRedis.del).toHaveBeenCalledWith('temp:1', 'temp:2');
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      const values = [
        JSON.stringify({ id: 1 }),
        JSON.stringify({ id: 2 }),
        null
      ];
      mockRedis.mget.mockResolvedValue(values);

      const result = await cacheService.getMultiple(['key1', 'key2', 'key3']);

      expect(result).toEqual([{ id: 1 }, { id: 2 }, null]);
      expect(mockRedis.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('should set multiple values', async () => {
      mockRedis.pipeline().exec.mockResolvedValue([['OK'], ['OK']]);

      const result = await cacheService.setMultiple([
        { key: 'key1', value: { id: 1 }, ttl: 3600 },
        { key: 'key2', value: { id: 2 }, ttl: 7200 }
      ]);

      expect(result).toBe(true);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate user cache', async () => {
      mockRedis.keys.mockResolvedValue(['user:123:profile', 'user:123:settings']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.invalidateUserCache('123');

      expect(result).toBe(true);
      expect(mockRedis.keys).toHaveBeenCalledWith('user:123:*');
    });

    it('should invalidate recipe cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.invalidateRecipeCache('recipe-456');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('recipe:recipe-456');
    });

    it('should flush entire cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const result = await cacheService.flushAll();

      expect(result).toBe(true);
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle set operation failures', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Set failed'));

      const result = await cacheService.set('test-key', { data: 'test' }, 3600);

      expect(result).toBe(false);
    });
  });

  describe('Cache Strategies', () => {
    it('should implement cache-aside pattern', async () => {
      // Cache miss scenario
      mockRedis.get.mockResolvedValue(null);
      
      const loader = jest.fn().mockResolvedValue({ data: 'fresh' });
      const result = await cacheService.getOrSet('test-key', loader, 3600);

      expect(result).toEqual({ data: 'fresh' });
      expect(loader).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should implement cache-through pattern', async () => {
      // Cache hit scenario
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      
      const loader = jest.fn();
      const result = await cacheService.getOrSet('test-key', loader, 3600);

      expect(result).toEqual({ data: 'cached' });
      expect(loader).not.toHaveBeenCalled();
    });

    it('should handle cache stampede prevention', async () => {
      const promises = [];
      const loader = jest.fn().mockResolvedValue({ data: 'loaded' });
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      // Simulate concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(cacheService.getOrSet('same-key', loader, 3600));
      }

      await Promise.all(promises);

      // Loader should only be called once despite multiple concurrent requests
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track cache hit rate', async () => {
      // Simulate hits and misses
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'hit' }));
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'hit' }));

      await cacheService.get('key1');
      await cacheService.get('key2');
      await cacheService.get('key3');

      const stats = await cacheService.getStats();
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should monitor cache size', async () => {
      mockRedis.keys.mockResolvedValue(new Array(150));

      const size = await cacheService.getCacheSize();

      expect(size).toBe(150);
    });
  });

  describe('Connection Management', () => {
    it('should handle Redis reconnection', async () => {
      const onReconnect = jest.fn();
      cacheService.onReconnect(onReconnect);

      // Simulate reconnection
      const reconnectHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'reconnecting'
      );
      
      if (reconnectHandler) {
        reconnectHandler[1]();
      }

      expect(onReconnect).toHaveBeenCalled();
    });

    it('should gracefully close connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await cacheService.close();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

// Mock CacheService implementation for testing
class CacheService {
  private redis: any;
  private stats = { hits: 0, misses: 0 };
  private pendingLoads = new Map<string, Promise<any>>();

  constructor() {
    this.redis = new (Redis as any)();
  }

  async set(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      }
      this.stats.misses++;
      return null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result > 0;
  }

  async setTTL(key: string, ttl: number): Promise<boolean> {
    const result = await this.redis.expire(key, ttl);
    return result > 0;
  }

  async getTTL(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.redis.del(...keys);
  }

  async getMultiple(keys: string[]): Promise<any[]> {
    const values = await this.redis.mget(keys);
    return values.map((v: string | null) => v ? JSON.parse(v) : null);
  }

  async setMultiple(items: Array<{ key: string; value: any; ttl: number }>): Promise<boolean> {
    const pipeline = this.redis.pipeline();
    items.forEach(item => {
      pipeline.set(item.key, JSON.stringify(item.value));
    });
    await pipeline.exec();
    return true;
  }

  async getOrSet(key: string, loader: () => Promise<any>, ttl: number): Promise<any> {
    const cached = await this.get(key);
    if (cached) return cached;

    // Prevent cache stampede
    if (this.pendingLoads.has(key)) {
      return await this.pendingLoads.get(key);
    }

    const loadPromise = loader();
    this.pendingLoads.set(key, loadPromise);

    try {
      const value = await loadPromise;
      await this.set(key, value, ttl);
      return value;
    } finally {
      this.pendingLoads.delete(key);
    }
  }

  async invalidateUserCache(userId: string): Promise<boolean> {
    await this.deleteByPattern(`user:${userId}:*`);
    return true;
  }

  async invalidateRecipeCache(recipeId: string): Promise<boolean> {
    await this.delete(`recipe:${recipeId}`);
    return true;
  }

  async flushAll(): Promise<boolean> {
    await this.redis.flushdb();
    return true;
  }

  async getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  async getCacheSize(): Promise<number> {
    const keys = await this.redis.keys('*');
    return keys.length;
  }

  onReconnect(callback: () => void) {
    this.redis.on('reconnecting', callback);
  }

  async close() {
    await this.redis.quit();
  }
}
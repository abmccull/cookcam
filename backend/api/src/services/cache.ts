import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

interface CacheItem {
  value: unknown;
  expires: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheItem>;
  private redis?: Redis;
  private isRedisAvailable: boolean = false;
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.memoryCache = new Map();
    this.initializeRedis();
    this.startCleanupInterval();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
          }
          return false;
        },
      });

      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isRedisAvailable = false;
      });

      this.redis.on('close', () => {
        this.isRedisAvailable = false;
        logger.warn('Redis connection closed');
      });

      // Test connection
      this.redis
        .ping()
        .then(() => {
          this.isRedisAvailable = true;
        })
        .catch((err) => {
          logger.error('Redis ping failed:', err);
          this.isRedisAvailable = false;
        });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.isRedisAvailable = false;
    }
  }

  // Get key with namespace
  private getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  // Set cache value
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    const { ttl = this.defaultTTL, namespace } = options;
    const fullKey = this.getKey(key, namespace);

    try {
      if (this.isRedisAvailable && this.redis) {
        const serialized = JSON.stringify(value);
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        // Fallback to memory cache
        const expires = Date.now() + ttl * 1000;
        this.memoryCache.set(fullKey, { value, expires });
      }
    } catch (error) {
      logger.error('Cache set error:', error);
      // Fallback to memory cache on error
      const expires = Date.now() + ttl * 1000;
      this.memoryCache.set(fullKey, { value, expires });
    }
  }

  // Get cache value
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.getKey(key, namespace);

    try {
      if (this.isRedisAvailable && this.redis) {
        const data = await this.redis.get(fullKey);
        return data ? JSON.parse(data) : null;
      } else {
        // Fallback to memory cache
        const item = this.memoryCache.get(fullKey);
        if (!item) {
          return null;
        }

        if (Date.now() > item.expires) {
          this.memoryCache.delete(fullKey);
          return null;
        }

        return item.value as T;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      // Fallback to memory cache on error
      const item = this.memoryCache.get(fullKey);
      if (!item || Date.now() > item.expires) {
        return null;
      }
      return item.value as T;
    }
  }

  // Delete cache value
  async del(key: string, namespace?: string): Promise<void> {
    const fullKey = this.getKey(key, namespace);

    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(fullKey);
      }
      this.memoryCache.delete(fullKey);
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.memoryCache.delete(fullKey);
    }
  }

  // Clear entire namespace or all cache
  async clear(namespace?: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        if (namespace) {
          const pattern = `${namespace}:*`;
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushdb();
        }
      }

      // Also clear memory cache
      if (namespace) {
        const prefix = `${namespace}:`;
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(prefix)) {
            this.memoryCache.delete(key);
          }
        }
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  // Invalidate cache by pattern
  async invalidate(pattern: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // Also invalidate in memory cache
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
    }
  }

  // Get or set pattern
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {
      logger.debug(`Cache hit for ${key}`);
      return cached;
    }

    logger.debug(`Cache miss for ${key}`);
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // Cache wrapper for functions
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options: CacheOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    }) as T;
  }

  // Cache decorator
  static cacheable(keyPrefix: string, ttl?: number) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cache = cacheService;
        const key = `${keyPrefix}:${JSON.stringify(args)}`;

        // Try to get from cache
        const cached = await cache.get(key);
        if (cached !== null) {
          logger.debug(`Cache hit for ${propertyName}`);
          return cached;
        }

        // Execute original method
        logger.debug(`Cache miss for ${propertyName}`);
        const result = await originalMethod.apply(this, args);

        // Store in cache
        await cache.set(key, result, { ttl });

        return result;
      };

      return descriptor;
    };
  }

  // Cleanup expired entries (for memory cache)
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Start cleanup interval
  private startCleanupInterval(): void {
    setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  // Get cache stats
  async getStats(): Promise<{
    type: string;
    isRedisAvailable: boolean;
    memoryCacheSize: number;
    redisCacheSize?: number;
    memoryUsage: number;
  }> {
    const stats: any = {
      type: this.isRedisAvailable ? 'redis' : 'memory',
      isRedisAvailable: this.isRedisAvailable,
      memoryCacheSize: this.memoryCache.size,
      memoryUsage: process.memoryUsage().heapUsed,
    };

    if (this.isRedisAvailable && this.redis) {
      try {
        const info = await this.redis.info('memory');
        const usedMemory = info.match(/used_memory:(\d+)/);
        if (usedMemory && usedMemory[1]) {
          stats.redisMemoryUsage = parseInt(usedMemory[1]);
        }

        const dbSize = await this.redis.dbsize();
        stats.redisCacheSize = dbSize;
      } catch (error) {
        logger.error('Failed to get Redis stats:', error);
      }
    }

    return stats;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.redis) {
      return true;
    } // Memory cache is always healthy

    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Common cache namespaces
export const CacheNamespaces = {
  RECIPES: 'recipes',
  INGREDIENTS: 'ingredients',
  USER_PROFILES: 'users',
  LEADERBOARD: 'leaderboard',
  NUTRITION: 'nutrition',
  SCANS: 'scans',
  API_RESPONSES: 'api',
  SESSIONS: 'sessions',
  RATE_LIMITS: 'ratelimits',
} as const;

// Common TTL values (in seconds)
export const CacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Export default instance
export default cacheService;

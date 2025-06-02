interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

interface CacheItem {
  value: unknown;
  expires: number;
}

class CacheService {
  private cache: Map<string, CacheItem>;
  private isRedisAvailable: boolean = false;
  
  constructor() {
    this.cache = new Map();
    this.startCleanupInterval();
  }
  
  // Get key with namespace
  private getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
  
  // Set cache value
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    const { ttl = 3600, namespace } = options;
    const fullKey = this.getKey(key, namespace);
    const expires = Date.now() + (ttl * 1000);
    
    this.cache.set(fullKey, { value, expires });
  }
  
  // Get cache value
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.getKey(key, namespace);
    const item = this.cache.get(fullKey);
    
    if (!item) {return null;}
    
    if (Date.now() > item.expires) {
      this.cache.delete(fullKey);
      return null;
    }
    
    return item.value as T;
  }
  
  // Delete cache value
  async del(key: string, namespace?: string): Promise<void> {
    const fullKey = this.getKey(key, namespace);
    this.cache.delete(fullKey);
  }
  
  // Clear entire namespace or all cache
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const prefix = `${namespace}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  // Get or set pattern
  async getOrSet<T = any>(
    key: string, 
    factory: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {return cached;}
    
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }
  
  // Cache wrapper for functions
  wrap<T extends (...args: unknown[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options: CacheOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    }) as T;
  }
  
  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  // Start cleanup interval
  private startCleanupInterval(): void {
    setInterval(() => this.cleanup(), 60000); // Clean every minute
  }
  
  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const cache = new CacheService();

// Common cache namespaces
export const CacheNamespaces = {
  RECIPES: 'recipes',
  INGREDIENTS: 'ingredients',
  USER_PROFILES: 'users',
  LEADERBOARD: 'leaderboard',
  NUTRITION: 'nutrition',
  SCANS: 'scans'
};

// Common TTL values (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  DAY: 86400,      // 24 hours
  WEEK: 604800     // 7 days
}; 
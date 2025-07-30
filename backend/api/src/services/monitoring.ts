import { supabase } from '../index';
import { createClient } from '@supabase/supabase-js';
import os from 'os';
import { logger } from '../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    storage: ServiceHealth;
    external_apis: ServiceHealth;
  };
  system: SystemMetrics;
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

export class MonitoringService {
  private startTime: Date;
  private serviceRoleClient: any;
  
  constructor() {
    this.startTime = new Date();
    
    // Create service role client for monitoring functions
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.serviceRoleClient = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }
  
  // Get comprehensive health status
  async getHealthStatus(): Promise<HealthStatus> {
    const [database, cache, storage, externalApis] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkStorage(),
      this.checkExternalAPIs()
    ]);
    
    const system = this.getSystemMetrics();
    
    // Determine overall status
    const services = { database, cache, storage, external_apis: externalApis };
    const statuses = Object.values(services).map(s => s.status);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (statuses.includes('down')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: this.getUptime(),
      services,
      system
    };
  }
  
  // Check database health
  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      
      // Simple query to check connection
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - start;
      
      if (error) {
        return {
          status: 'down',
          error: error.message
        };
      }
      
      // Check if latency is acceptable
      if (latency > 1000) {
        return {
          status: 'degraded',
          latency,
          error: 'High latency detected'
        };
      }
      
      return {
        status: 'up',
        latency
      };
    } catch (error: unknown) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Check cache health (mock for now)
  private async checkCache(): Promise<ServiceHealth> {
    try {
      // If using Redis, check connection here
      // For now, we'll just check if our in-memory cache is accessible
      return {
        status: 'up',
        latency: 1
      };
    } catch (error: unknown) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Check storage health
  private async checkStorage(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      
      // Check if we can list buckets
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      const latency = Date.now() - start;
      
      if (error) {
        return {
          status: 'down',
          error: error.message
        };
      }
      
      // Check if we got bucket data successfully
      if (!buckets) {
        return {
          status: 'degraded',
          latency,
          error: 'No bucket data returned'
        };
      }
      
      return {
        status: 'up',
        latency
      };
    } catch (error: unknown) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Check external APIs
  private async checkExternalAPIs(): Promise<ServiceHealth> {
    const apis = [
      { name: 'OpenAI', check: this.checkOpenAI },
      { name: 'USDA', check: this.checkUSDA }
    ];
    
    const results = await Promise.all(
      apis.map(api => api.check.call(this))
    );
    
    // If any API is down, mark as degraded (not unhealthy)
    const hasDown = results.some(r => r === false);
    
    return {
      status: hasDown ? 'degraded' : 'up'
    };
  }
  
  // Check OpenAI API
  private async checkOpenAI(): Promise<boolean> {
    try {
      // Mock check - in production, make a simple API call
      return !!process.env.OPENAI_API_KEY;
    } catch {
      return false;
    }
  }
  
  // Check USDA API
  private async checkUSDA(): Promise<boolean> {
    try {
      // Mock check - in production, make a simple API call
      return !!process.env.USDA_API_KEY;
    } catch {
      return false;
    }
  }
  
  // Get system metrics
  private getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    return {
      cpu: {
        usage: Math.round(cpuUsage),
        count: cpus.length
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      disk: {
        // Mock disk usage - in production, use a proper disk usage library
        used: 0,
        total: 0,
        percentage: 0
      }
    };
  }
  
  // Get uptime in seconds
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }
  
  // Log metrics (for monitoring services)
  async logMetrics(): Promise<void> {
    try {
      const health = await this.getHealthStatus();
      
      // Log to monitoring service (DataDog, New Relic, etc.)
      console.log('📊 System metrics:', {
        status: health.status,
        uptime: health.uptime,
        cpu: health.system.cpu.usage,
        memory: health.system.memory.percentage
      });
      
      // Get API response times (using service role client if available)
      const client = this.serviceRoleClient || supabase;
      const { data: apiMetrics, error } = await client
        .rpc('get_performance_metrics');

      if (error) {
        logger.error('Failed to get API metrics', { error });
      }

            // Get slow queries  
      const { data: slowQueries } = await client
        .from('slow_queries')
        .select('query, execution_time, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('execution_time', { ascending: false })
        .limit(10);
      
      // Log metrics for monitoring
      console.log('📊 API Metrics:', {
        metricsCount: apiMetrics?.length || 0,
        slowQueriesCount: slowQueries?.length || 0
      });
      
      // Log to database for historical tracking
      await client
        .from('system_metrics')
        .insert({
          status: health.status,
          cpu_usage: health.system.cpu.usage,
          memory_usage: health.system.memory.percentage,
          database_latency: health.services.database.latency,
          created_at: new Date().toISOString()
        });
    } catch (metricsError: unknown) {
      logger.error('Metrics logging error', { error: metricsError });
    }
  }
  
  // Start periodic health checks
  startHealthChecks(intervalMs = 60000): void {
    setInterval(() => {
      this.logMetrics();
    }, intervalMs);
  }
  
  // Get performance metrics
  async getPerformanceMetrics(): Promise<any> {
    try {
      // Get API response times (using service role client if available)
      const client = this.serviceRoleClient || supabase;
      const { data: apiMetrics, error } = await client
        .rpc('get_performance_metrics');

      if (error) {
        logger.error('Failed to get API metrics', { error });
      }

      // Get slow queries  
      const { data: slowQueries } = await client
        .from('slow_queries')
        .select('query, execution_time, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('execution_time', { ascending: false })
        .limit(10);
      
      return {
        apiMetrics: apiMetrics || [],
        slowQueries: slowQueries || [],
        measured_at: new Date().toISOString()
      };
    } catch (error: unknown) {
      logger.error('Performance metrics error', { error });
      return {
        apiMetrics: [],
        slowQueries: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        measured_at: new Date().toISOString()
      };
    }
  }
  
  // Get individual database health
  async checkDatabaseHealth(): Promise<ServiceHealth> {
    return this.checkDatabase();
  }
  
  // Get individual cache health
  async checkCacheHealth(): Promise<ServiceHealth> {
    return this.checkCache();
  }
  
  // Get security metrics
  async getSecurityMetrics(): Promise<any> {
    try {
      // In a real implementation, this would query security events
      return {
        timestamp: new Date().toISOString(),
        events: {
          last_24h: {
            total: 0,
            auth_failures: 0,
            rate_limits: 0,
            suspicious_activities: 0
          }
        },
        blocked_ips: [],
        active_sessions: 0,
        failed_login_attempts: 0
      };
    } catch (error) {
      logger.error('Failed to get security metrics', { error });
      return {
        error: 'Failed to get security metrics',
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Start periodic health checks
  startHealthChecks(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status !== 'healthy') {
          logger.warn('System health degraded', { health });
        }
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, intervalMs);
    
    logger.info('Periodic health checks started', { intervalMs });
  }
}

export const monitoringService = new MonitoringService(); 
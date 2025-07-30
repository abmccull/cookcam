import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { CacheService } from './cache';
import { createClient } from '@supabase/supabase-js';

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'sql_injection' | 'xss_attempt' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip: string;
  userId?: string;
  details: any;
  requestId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
}

interface ThreatPattern {
  pattern: RegExp;
  type: SecurityEvent['type'];
  severity: SecurityEvent['severity'];
  description: string;
}

export class SecurityMonitoringService {
  private cacheService: CacheService;
  private supabase: ReturnType<typeof createClient> | null = null;
  private threatPatterns: ThreatPattern[] = [
    {
      pattern: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)\b)/gi,
      type: 'sql_injection',
      severity: 'high',
      description: 'Potential SQL injection attempt',
    },
    {
      pattern: /(<script|<iframe|javascript:|onerror=|onload=|onclick=|<img\s+src.*=)/gi,
      type: 'xss_attempt',
      severity: 'high',
      description: 'Potential XSS attempt',
    },
    {
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|%2e%2e%5c)/gi,
      type: 'suspicious_activity',
      severity: 'medium',
      description: 'Path traversal attempt',
    },
  ];

  constructor() {
    this.cacheService = new CacheService();
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    }
  }

  // Log security event
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to console/file
      logger.warn('Security event detected', {
        type: event.type,
        severity: event.severity,
        ip: event.ip,
        timestamp: event.timestamp,
        details: event.details
      });

      // Store in cache for quick access
      const key = `security:event:${event.type}:${event.ip}`;
      await this.cacheService.set(key, event, { ttl: 3600 }); // 1 hour

      // Store in database for long-term analysis
      if (this.supabase) {
        await this.supabase.from('security_events').insert({
          type: event.type,
          severity: event.severity,
          timestamp: event.timestamp,
          ip: event.ip,
          user_id: event.userId,
          details: event.details,
          request_id: event.requestId,
          path: event.path,
          method: event.method,
          user_agent: event.userAgent,
        });
      }

      // Check if we need to trigger alerts
      await this.checkAlertThresholds(event);
    } catch (error) {
      logger.error('Failed to log security event', { error, event });
    }
  }

  // Check if we need to trigger alerts based on thresholds
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    // Check for repeated failures from same IP
    const recentEvents = await this.getRecentEventsByIP(event.ip, 300); // Last 5 minutes
    
    if (recentEvents.length >= 10) {
      await this.triggerAlert({
        type: 'repeated_security_events',
        severity: 'high',
        message: `Multiple security events (${recentEvents.length}) from IP ${event.ip}`,
        ip: event.ip,
        events: recentEvents,
      });
    }

    // Check for critical events
    if (event.severity === 'critical') {
      await this.triggerAlert({
        type: 'critical_security_event',
        severity: 'critical',
        message: `Critical security event: ${event.type}`,
        event,
      });
    }
  }

  // Get recent security events by IP
  private async getRecentEventsByIP(ip: string, secondsAgo: number): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    // const pattern = `security:event:*:${ip}`;
    
    // This is a simplified implementation
    // In production, you'd want to use Redis SCAN or maintain an index
    for (const type of ['auth_failure', 'rate_limit', 'suspicious_activity', 'sql_injection', 'xss_attempt']) {
      const key = `security:event:${type}:${ip}`;
      const event = await this.cacheService.get<SecurityEvent>(key);
      if (event) {
        const eventTime = new Date(event.timestamp).getTime();
        const cutoffTime = Date.now() - (secondsAgo * 1000);
        if (eventTime > cutoffTime) {
          events.push(event);
        }
      }
    }
    
    return events;
  }

  // Trigger security alert
  private async triggerAlert(alert: any): Promise<void> {
    logger.error('SECURITY ALERT', alert);
    
    // In production, this would:
    // - Send email/SMS to security team
    // - Post to Slack/Discord
    // - Create PagerDuty incident
    // - Log to SIEM system
    
    if (this.supabase) {
      await this.supabase.from('security_alerts').insert({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert,
        created_at: new Date(),
      });
    }
  }

  // Middleware to detect suspicious patterns
  detectSuspiciousPatterns(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const suspiciousPatterns: Array<{pattern: ThreatPattern; location: string; value: string}> = [];

        // Check URL
        for (const pattern of this.threatPatterns) {
          if (pattern.pattern.test(req.url)) {
            suspiciousPatterns.push({
              pattern,
              location: 'url',
              value: req.url,
            });
          }
        }

        // Check query parameters
        const queryString = JSON.stringify(req.query);
        for (const pattern of this.threatPatterns) {
          if (pattern.pattern.test(queryString)) {
            suspiciousPatterns.push({
              pattern,
              location: 'query',
              value: queryString,
            });
          }
        }

        // Check body
        if (req.body) {
          const bodyString = JSON.stringify(req.body);
          for (const pattern of this.threatPatterns) {
            if (pattern.pattern.test(bodyString)) {
              suspiciousPatterns.push({
                pattern,
                location: 'body',
                value: bodyString.substring(0, 200), // Limit logged content
              });
            }
          }
        }

        // Check headers
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'referer'];
        for (const header of suspiciousHeaders) {
          const value = req.headers[header];
          if (value && typeof value === 'string') {
            for (const pattern of this.threatPatterns) {
              if (pattern.pattern.test(value)) {
                suspiciousPatterns.push({
                  pattern,
                  location: `header:${header}`,
                  value,
                });
              }
            }
          }
        }

        // If suspicious patterns found, log them
        if (suspiciousPatterns.length > 0) {
          const mostSevere = suspiciousPatterns.reduce((prev, curr) => 
            prev.pattern.severity === 'critical' || 
            (prev.pattern.severity === 'high' && curr.pattern.severity !== 'critical') ? prev : curr
          );

          await this.logSecurityEvent({
            type: mostSevere.pattern.type,
            severity: mostSevere.pattern.severity,
            timestamp: new Date(),
            ip: req.ip || 'unknown',
            userId: (req as any).user?.id,
            details: {
              patterns: suspiciousPatterns.map(p => ({
                type: p.pattern.type,
                description: p.pattern.description,
                location: p.location,
              })),
            },
            requestId: (req as any).id,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
          });
        }

        next();
      } catch (error) {
        logger.error('Error in security pattern detection', error);
        next(); // Don't block requests due to monitoring errors
      }
    };
  }

  // Monitor authentication failures
  async logAuthFailure(req: Request, reason: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'auth_failure',
      severity: 'medium',
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      details: {
        reason,
        email: req.body?.email,
      },
      requestId: (req as any).id,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  }

  // Monitor rate limit violations
  async logRateLimitViolation(req: Request): Promise<void> {
    await this.logSecurityEvent({
      type: 'rate_limit',
      severity: 'low',
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userId: (req as any).user?.id,
      details: {
        endpoint: req.path,
      },
      requestId: (req as any).id,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  }

  // Monitor unauthorized access attempts
  async logUnauthorizedAccess(req: Request, resource: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'unauthorized_access',
      severity: 'high',
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userId: (req as any).user?.id,
      details: {
        resource,
        attempted_action: req.method,
      },
      requestId: (req as any).id,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  }

  // Get security metrics
  async getSecurityMetrics(): Promise<any> {
    const metrics = {
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
    };

    // In a production environment, these would be aggregated from the database
    // For now, return the structure
    return metrics;
  }

  // IP reputation check
  async checkIPReputation(ip: string): Promise<{blocked: boolean; reason?: string}> {
    // Check local blocklist
    const blockedIPs = await this.cacheService.get<string[]>('security:blocked_ips') || [];
    if (blockedIPs.includes(ip)) {
      return { blocked: true, reason: 'IP is on blocklist' };
    }

    // Check recent violations
    const recentEvents = await this.getRecentEventsByIP(ip, 3600); // Last hour
    if (recentEvents.length > 50) {
      return { blocked: true, reason: 'Too many security events' };
    }

    // In production, you might also check:
    // - External IP reputation services (AbuseIPDB, etc.)
    // - GeoIP location restrictions
    // - Known VPN/proxy/Tor exit nodes

    return { blocked: false };
  }

  // Middleware to block suspicious IPs
  ipReputationMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || 'unknown';
        const reputation = await this.checkIPReputation(ip);

        if (reputation.blocked) {
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            timestamp: new Date(),
            ip,
            details: {
              action: 'blocked',
              reason: reputation.reason,
            },
            requestId: (req as any).id,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
          });

          return res.status(403).json({
            error: 'Access denied',
            message: 'Your request has been blocked for security reasons',
          });
        }

        next();
      } catch (error) {
        logger.error('Error in IP reputation check', error);
        next(); // Don't block requests due to monitoring errors
      }
    };
  }
}

// Create singleton instance
export const securityMonitoring = new SecurityMonitoringService();
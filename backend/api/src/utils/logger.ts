interface LogContext {
  [key: string]: unknown;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty format for development
      const contextStr =
        context && Object.keys(context).length > 0
          ? `\n  Context: ${JSON.stringify(context, null, 2)}`
          : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    } else {
      // JSON format for production (better for log aggregation)
      return JSON.stringify(baseLog);
    }
  }

  private formatError(error: unknown): LogContext {
    if (error instanceof Error) {
      return {
        error: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return {
        error: (error as any).message,
        details: JSON.stringify(error),
      };
    }

    return {
      error: String(error),
    };
  }

  error(message: string, errorOrContext?: unknown): void {
    let context: LogContext;

    if (
      errorOrContext instanceof Error ||
      (errorOrContext && typeof errorOrContext === 'object' && 'message' in errorOrContext)
    ) {
      context = this.formatError(errorOrContext);
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      context = errorOrContext as LogContext;
    } else if (errorOrContext) {
      context = { error: String(errorOrContext) };
    } else {
      context = {};
    }

    console.error(this.formatMessage(LogLevel.ERROR, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment || process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  // Convenience methods for common patterns
  apiRequest(method: string, path: string, userId?: string): void {
    this.info('API Request', { method, path, userId });
  }

  apiResponse(method: string, path: string, statusCode: number, duration?: number): void {
    this.info('API Response', { method, path, statusCode, duration });
  }

  dbQuery(query: string, duration?: number): void {
    this.debug('Database Query', { query: query.substring(0, 100), duration });
  }

  authAttempt(email: string, success: boolean, reason?: string): void {
    this.info('Authentication Attempt', { email, success, reason });
  }

  subscriptionEvent(userId: string, event: string, details?: LogContext): void {
    this.info('Subscription Event', { userId, event, ...details });
  }

  aiRequest(type: string, inputSize: number, responseSize?: number, duration?: number): void {
    this.info('AI Request', { type, inputSize, responseSize, duration });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or when you need a new instance
export { Logger };

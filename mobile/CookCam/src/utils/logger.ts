// Production-safe logging utility
interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  private static instance: Logger;
  private logLevel: number;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: number): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    if (this.isProduction && level === 'DEBUG') return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level}: ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage, ...args);
        break;
      case 'WARN':
        console.warn(formattedMessage, ...args);
        break;
      case 'INFO':
        console.info(formattedMessage, ...args);
        break;
      case 'DEBUG':
      default:
        console.log(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      this.formatMessage('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      this.formatMessage('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      this.formatMessage('WARN', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      this.formatMessage('ERROR', message, ...args);
    }
  }

  // Convenience methods for common patterns
  success(message: string, ...args: any[]): void {
    this.info(`✅ ${message}`, ...args);
  }

  apiCall(method: string, url: string, ...args: any[]): void {
    this.debug(`🔄 API ${method.toUpperCase()} ${url}`, ...args);
  }

  gamification(message: string, ...args: any[]): void {
    this.debug(`🎮 ${message}`, ...args);
  }

  deepLink(message: string, ...args: any[]): void {
    this.debug(`🔗 ${message}`, ...args);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
export default logger; 
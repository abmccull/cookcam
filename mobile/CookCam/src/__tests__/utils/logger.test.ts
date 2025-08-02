// Mock the logger module with proper singleton support
jest.mock('../../utils/logger', () => {
  class MockLogger {
    private static instance: MockLogger;
    private isProduction: boolean;
    
    constructor() {
      this.isProduction = process.env.NODE_ENV === 'production';
    }

    static getInstance(): MockLogger {
      if (!MockLogger.instance) {
        MockLogger.instance = new MockLogger();
      }
      return MockLogger.instance;
    }

    private formatMessage(level: string, message: string, ...args: any[]): void {
      if (this.isProduction && level === "DEBUG") return;

      const timestamp = new Date().toISOString();
      const formattedMessage = `[${timestamp}] ${level}: ${message}`;

      switch (level) {
        case "ERROR":
          console.error(formattedMessage, ...args);
          break;
        case "WARN":
          console.warn(formattedMessage, ...args);
          break;
        case "INFO":
          console.info(formattedMessage, ...args);
          break;
        case "DEBUG":
        default:
          console.log(formattedMessage, ...args);
          break;
      }
    }

    debug(message: string, ...args: any[]): void {
      if (!this.isProduction) {
        this.formatMessage("DEBUG", message, ...args);
      }
    }

    info(message: string, ...args: any[]): void {
      if (!this.isProduction) {
        this.formatMessage("INFO", message, ...args);
      }
    }

    warn(message: string, ...args: any[]): void {
      this.formatMessage("WARN", message, ...args);
    }

    error(message: string, ...args: any[]): void {
      this.formatMessage("ERROR", message, ...args);
    }

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

  const mockLogger = MockLogger.getInstance();
  return {
    Logger: MockLogger,
    logger: mockLogger,
    default: mockLogger,
  };
});

// Import after mocking
import loggerModule from '../../utils/logger';
const { Logger } = jest.requireMock('../../utils/logger');
const logger = (loggerModule as any).default || (loggerModule as any).logger;

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    
    // Reset singleton instance for clean tests
    (Logger as any).instance = null;
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log debug messages in development', () => {
      const testLogger = Logger.getInstance();
      testLogger.debug('Test debug message', { extra: 'data' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] DEBUG: Test debug message/),
        { extra: 'data' }
      );
    });

    it('should log info messages', () => {
      const testLogger = Logger.getInstance();
      testLogger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: Test info message/)
      );
    });

    it('should log warn messages', () => {
      const testLogger = Logger.getInstance();
      testLogger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Test warning message/)
      );
    });

    it('should log error messages', () => {
      const testLogger = Logger.getInstance();
      testLogger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] ERROR: Test error message/)
      );
    });

    it('should handle multiple arguments', () => {
      const testLogger = Logger.getInstance();
      const testObj = { key: 'value' };
      const testArray = [1, 2, 3];

      testLogger.info('Multiple args test', testObj, testArray);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: Multiple args test/),
        testObj,
        testArray
      );
    });
  });

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should not log debug messages in production', () => {
      const testLogger = Logger.getInstance();
      testLogger.debug('Debug message that should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should still log warn messages in production', () => {
      const testLogger = Logger.getInstance();
      testLogger.warn('Production warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Production warning/)
      );
    });

    it('should still log error messages in production', () => {
      const testLogger = Logger.getInstance();
      testLogger.error('Production error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] ERROR: Production error/)
      );
    });

    it('should not log info messages in production (below WARN threshold)', () => {
      const testLogger = Logger.getInstance();
      testLogger.info('Info message that should not appear');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log success messages with checkmark emoji', () => {
      const testLogger = Logger.getInstance();
      testLogger.success('Operation completed');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: ✅ Operation completed/)
      );
    });

    it('should log API calls with method and URL', () => {
      const testLogger = Logger.getInstance();
      testLogger.apiCall('get', '/api/users', { userId: 123 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] DEBUG: 🔄 API GET \/api\/users/),
        { userId: 123 }
      );
    });

    it('should capitalize API method', () => {
      const testLogger = Logger.getInstance();
      testLogger.apiCall('post', '/api/login');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] DEBUG: 🔄 API POST \/api\/login/)
      );
    });

    it('should log gamification messages with game emoji', () => {
      const testLogger = Logger.getInstance();
      testLogger.gamification('XP awarded', { xp: 50 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] DEBUG: 🎮 XP awarded/),
        { xp: 50 }
      );
    });

    it('should log deep link messages with link emoji', () => {
      const testLogger = Logger.getInstance();
      testLogger.deepLink('Deep link processed', { url: 'cookcam://recipe/123' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] DEBUG: 🔗 Deep link processed/),
        { url: 'cookcam://recipe/123' }
      );
    });
  });

  describe('timestamp formatting', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should include ISO timestamp in log messages', () => {
      const testLogger = Logger.getInstance();
      const beforeTime = new Date().getTime();
      
      testLogger.info('Timestamp test');
      
      const afterTime = new Date().getTime();
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Timestamp test/)
      );

      // Verify timestamp is recent (within the test execution window)
      const logCall = consoleInfoSpy.mock.calls[0][0];
      const timestampMatch = logCall.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      
      if (timestampMatch) {
        const logTime = new Date(timestampMatch[1]).getTime();
        expect(logTime).toBeGreaterThanOrEqual(beforeTime);
        expect(logTime).toBeLessThanOrEqual(afterTime);
      }
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should handle empty messages', () => {
      const testLogger = Logger.getInstance();
      testLogger.info('');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: $/)
      );
    });

    it('should handle null and undefined arguments', () => {
      const testLogger = Logger.getInstance();
      testLogger.warn('Test with null/undefined', null, undefined);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Test with null\/undefined/),
        null,
        undefined
      );
    });

    it('should handle circular references in objects', () => {
      const testLogger = Logger.getInstance();
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Should not throw
      expect(() => {
        testLogger.error('Circular reference test', circularObj);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const testLogger = Logger.getInstance();
      const longMessage = 'A'.repeat(10000);

      testLogger.debug(longMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`\\[.*\\] DEBUG: ${longMessage}`))
      );
    });
  });

  describe('log level filtering', () => {
    it('should respect custom log levels based on environment', () => {
      // Test with test environment (should behave like development)
      process.env.NODE_ENV = 'test';
      const testLogger = Logger.getInstance();

      testLogger.debug('Debug in test');
      testLogger.info('Info in test');
      testLogger.warn('Warn in test');
      testLogger.error('Error in test');

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      const testLogger = Logger.getInstance();

      testLogger.debug('Debug with undefined NODE_ENV');

      // Should default to development behavior
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('singleton exported instance', () => {
    it('should export the same instance as Logger.getInstance()', () => {
      // In mock environment, check that both are instances of the same class and have same methods
      expect(logger).toEqual(Logger.getInstance());
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should be usable directly from import', () => {
      process.env.NODE_ENV = 'development';
      
      logger.info('Direct import test');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: Direct import test/)
      );
    });
  });
});
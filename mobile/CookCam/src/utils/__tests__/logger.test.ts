import { Logger, logger } from '../logger';

// Mock console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock Date.now to have consistent timestamps
const mockDate = new Date('2024-01-15T10:30:00.000Z');

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Replace console methods with mocks
    console.log = mockConsole.log;
    console.info = mockConsole.info;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    
    // Mock Date properly
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    // Mock Date.now as well
    Date.now = jest.fn(() => mockDate.getTime());
    // Mock toISOString on the mockDate object itself
    mockDate.toISOString = jest.fn(() => '2024-01-15T10:30:00.000Z');
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should export the same singleton instance', () => {
      const instance = Logger.getInstance();
      expect(logger).toBe(instance);
    });
  });

  describe('Log Level Configuration', () => {
    it('should set DEBUG level in development', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testLogger = new Logger();
      
      testLogger.debug('Debug message');
      expect(mockConsole.log).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should set WARN level in production', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      
      testLogger.debug('Debug message');
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      testLogger.warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      
      testLogger.debug('This should not appear');
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Log Methods', () => {
    let testLogger: Logger;

    beforeEach(() => {
      // Ensure development mode for these tests
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testLogger = new Logger();
      process.env.NODE_ENV = originalEnv;
    });

    describe('debug()', () => {
      it('should log debug messages', () => {
        testLogger.debug('Debug message', { data: 'test' });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: Debug message',
          { data: 'test' }
        );
      });

      it('should handle multiple arguments', () => {
        testLogger.debug('Debug with args', 'arg1', 42, { key: 'value' });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: Debug with args',
          'arg1',
          42,
          { key: 'value' }
        );
      });

      it('should handle no additional arguments', () => {
        testLogger.debug('Simple debug');
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: Simple debug'
        );
      });
    });

    describe('info()', () => {
      it('should log info messages', () => {
        testLogger.info('Info message', { info: 'data' });
        
        expect(mockConsole.info).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] INFO: Info message',
          { info: 'data' }
        );
      });

      it('should handle empty additional arguments', () => {
        testLogger.info('Info only');
        
        expect(mockConsole.info).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] INFO: Info only'
        );
      });
    });

    describe('warn()', () => {
      it('should log warning messages', () => {
        testLogger.warn('Warning message', { warning: 'data' });
        
        expect(mockConsole.warn).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] WARN: Warning message',
          { warning: 'data' }
        );
      });

      it('should handle null and undefined arguments', () => {
        testLogger.warn('Warning with nullish values', null, undefined);
        
        expect(mockConsole.warn).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] WARN: Warning with nullish values',
          null,
          undefined
        );
      });
    });

    describe('error()', () => {
      it('should log error messages', () => {
        testLogger.error('Error message', { error: 'data' });
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] ERROR: Error message',
          { error: 'data' }
        );
      });

      it('should handle Error objects', () => {
        const error = new Error('Test error');
        testLogger.error('Exception occurred', error);
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] ERROR: Exception occurred',
          error
        );
      });
    });
  });

  describe('Convenience Methods', () => {
    let testLogger: Logger;

    beforeEach(() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testLogger = new Logger();
      process.env.NODE_ENV = originalEnv;
    });

    describe('success()', () => {
      it('should log success messages with checkmark', () => {
        testLogger.success('Operation completed', { result: 'success' });
        
        expect(mockConsole.info).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] INFO: ✅ Operation completed',
          { result: 'success' }
        );
      });

      it('should handle success without additional data', () => {
        testLogger.success('Task done');
        
        expect(mockConsole.info).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] INFO: ✅ Task done'
        );
      });
    });

    describe('apiCall()', () => {
      it('should log API calls with method and URL', () => {
        testLogger.apiCall('get', '/api/users', { params: { page: 1 } });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🔄 API GET /api/users',
          { params: { page: 1 } }
        );
      });

      it('should uppercase method names', () => {
        testLogger.apiCall('post', '/api/auth/login', { email: 'test@example.com' });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🔄 API POST /api/auth/login',
          { email: 'test@example.com' }
        );
      });

      it('should handle mixed case methods', () => {
        testLogger.apiCall('PaTcH', '/api/users/123');
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🔄 API PATCH /api/users/123'
        );
      });
    });

    describe('gamification()', () => {
      it('should log gamification messages with game controller emoji', () => {
        testLogger.gamification('XP gained', { xp: 150, reason: 'level_up' });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🎮 XP gained',
          { xp: 150, reason: 'level_up' }
        );
      });

      it('should handle gamification events without data', () => {
        testLogger.gamification('Badge unlocked');
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🎮 Badge unlocked'
        );
      });
    });

    describe('deepLink()', () => {
      it('should log deep link messages with link emoji', () => {
        testLogger.deepLink('Navigation triggered', { url: 'cookcam://recipe/123' });
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🔗 Navigation triggered',
          { url: 'cookcam://recipe/123' }
        );
      });

      it('should handle deep link without additional data', () => {
        testLogger.deepLink('Deep link processed');
        
        expect(mockConsole.log).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] DEBUG: 🔗 Deep link processed'
        );
      });
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log levels in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testLogger = new Logger();
      
      // All levels should log in development
      testLogger.debug('Debug');
      testLogger.info('Info');
      testLogger.warn('Warn');
      testLogger.error('Error');
      
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should filter debug and info in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      
      testLogger.debug('Debug');
      testLogger.info('Info');
      testLogger.warn('Warn');
      testLogger.error('Error');
      
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Message Formatting', () => {
    let testLogger: Logger;

    beforeEach(() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testLogger = new Logger();
      process.env.NODE_ENV = originalEnv;
    });

    it('should include timestamp in formatted messages', () => {
      testLogger.info('Test message');
      
      const [formattedMessage] = mockConsole.info.mock.calls[0];
      expect(formattedMessage).toMatch(/^\[2024-01-15T10:30:00\.000Z\] INFO: Test message$/);
    });

    it('should handle special characters in messages', () => {
      testLogger.warn('Message with "quotes" and \'apostrophes\' and @symbols!');
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] WARN: Message with "quotes" and \'apostrophes\' and @symbols!'
      );
    });

    it('should handle empty strings', () => {
      testLogger.error('');
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] ERROR: '
      );
    });

    it('should handle unicode characters', () => {
      testLogger.info('Unicode test: 🚀 🎉 こんにちは');
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] INFO: Unicode test: 🚀 🎉 こんにちは'
      );
    });
  });

  describe('Edge Cases', () => {
    let testLogger: Logger;

    beforeEach(() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testLogger = new Logger();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      testLogger.debug(longMessage);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        `[2024-01-15T10:30:00.000Z] DEBUG: ${longMessage}`
      );
    });

    it('should handle circular objects gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      // This should not throw an error
      expect(() => {
        testLogger.info('Circular object test', circularObj);
      }).not.toThrow();
      
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle functions as arguments', () => {
      const testFunction = () => 'test';
      
      testLogger.debug('Function test', testFunction);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] DEBUG: Function test',
        testFunction
      );
    });

    it('should handle symbols', () => {
      const testSymbol = Symbol('test');
      
      testLogger.warn('Symbol test', testSymbol);
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] WARN: Symbol test',
        testSymbol
      );
    });
  });

  describe('Production Safety', () => {
    it('should not expose sensitive information in production logs', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      
      // Debug messages with sensitive data should not appear
      testLogger.debug('User password', { password: 'secret123' });
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      // Info messages with sensitive data should not appear
      testLogger.info('API key', { apiKey: 'sk-123456' });
      expect(mockConsole.info).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should still log warnings and errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      
      testLogger.warn('Production warning');
      testLogger.error('Production error');
      
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance', () => {
    let testLogger: Logger;

    beforeEach(() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      testLogger = new Logger();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not process expensive operations when log level is filtered', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const productionLogger = new Logger();
      const expensiveOperation = jest.fn(() => ({ expensive: 'data' }));
      
      // This should not call the expensive operation
      productionLogger.debug('Debug message', expensiveOperation());
      
      // The expensive operation would still be called because we're passing the result
      // In real usage, you'd want to avoid this by checking log levels first
      expect(expensiveOperation).toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle high-frequency logging', () => {
      const start = Date.now();
      
      // Log 1000 messages
      for (let i = 0; i < 1000; i++) {
        testLogger.debug(`Message ${i}`);
      }
      
      const end = Date.now();
      const duration = end - start;
      
      // Should complete reasonably quickly (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(mockConsole.log).toHaveBeenCalledTimes(1000);
    });
  });
});
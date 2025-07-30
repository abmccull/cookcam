import { logger, Logger } from '../logger';

describe('Logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('error', () => {
    it('should log error messages with context', () => {
      const testLogger = new Logger();
      const error = new Error('Test error');
      
      testLogger.error('Test error message', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
    });

    it('should handle non-Error objects', () => {
      const testLogger = new Logger();
      
      testLogger.error('Test error message', { custom: 'error' });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message')
      );
    });

    it('should handle string errors', () => {
      const testLogger = new Logger();
      
      testLogger.error('Test error message', 'String error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('String error')
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const testLogger = new Logger();
      
      testLogger.warn('Test warning', { detail: 'warning detail' });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning')
      );
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      const testLogger = new Logger();
      
      testLogger.info('Test info', { detail: 'info detail' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info')
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testLogger = new Logger();
      testLogger.debug('Test debug', { detail: 'debug detail' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production by default', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      testLogger.debug('Test debug', { detail: 'debug detail' });
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('convenience methods', () => {
    it('should log API requests', () => {
      logger.apiRequest('GET', '/api/users', 'user123');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Request')
      );
    });

    it('should log API responses', () => {
      logger.apiResponse('GET', '/api/users', 200, 150);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Response')
      );
    });

    it('should log database queries', () => {
      logger.dbQuery('SELECT * FROM users WHERE id = $1', 50);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database Query')
      );
    });

    it('should log authentication attempts', () => {
      logger.authAttempt('test@example.com', true);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication Attempt')
      );
    });

    it('should log subscription events', () => {
      logger.subscriptionEvent('user123', 'upgrade', { plan: 'premium' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscription Event')
      );
    });

    it('should log AI requests', () => {
      logger.aiRequest('recipe_generation', 100, 500, 200);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI Request')
      );
    });
  });

  describe('formatting', () => {
    it('should format logs as JSON in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const testLogger = new Logger();
      testLogger.info('Test message', { key: 'value' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/) // Should be valid JSON
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should format logs prettily in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testLogger = new Logger();
      testLogger.info('Test message', { key: 'value' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context:')
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
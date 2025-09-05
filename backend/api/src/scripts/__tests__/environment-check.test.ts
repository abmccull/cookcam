import { jest } from '@jest/globals';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
  throw new Error(`Process exit with code ${code}`);
}) as any);

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('Environment Check Script', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Critical Variables Check', () => {
    it('should pass with all critical variables present', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key-12345',
        SUPABASE_SERVICE_KEY: 'test-service-key-12345',
        OPENAI_API_KEY: 'sk-test-openai-key',
        JWT_SECRET: 'test-jwt-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await expect(checkEnvironmentVariables()).resolves.toEqual({
        productionReady: true,
        criticalMissing: 0,
        requiredMissing: 0,
        totalMissing: expect.any(Number),
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 CookCam Environment Variables Check')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ READY FOR PRODUCTION DEPLOYMENT')
      );
    });

    it('should fail with missing critical variables', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await expect(checkEnvironmentVariables()).resolves.toEqual({
        productionReady: false,
        criticalMissing: 5, // All critical vars missing
        requiredMissing: 6, // Critical + NODE_ENV
        totalMissing: expect.any(Number),
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL VARIABLES MISSING:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ NOT READY FOR PRODUCTION')
      );
    });

    it('should handle missing SUPABASE_URL', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      const result = await checkEnvironmentVariables();
      expect(result.criticalMissing).toBe(1);
      expect(result.productionReady).toBe(false);
    });

    it('should handle missing OpenAI API key', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      const result = await checkEnvironmentVariables();
      expect(result.criticalMissing).toBe(1);
      expect(result.productionReady).toBe(false);
    });
  });

  describe('Optional Variables Check', () => {
    it('should handle optional variables gracefully', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
        USDA_API_KEY: 'test-usda-key',
        STRIPE_SECRET_KEY: 'sk_test_stripe',
        FCM_SERVER_KEY: 'test-fcm-key',
        REDIS_URL: 'redis://localhost:6379',
        DATABASE_URL: 'postgresql://test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      const result = await checkEnvironmentVariables();
      expect(result.productionReady).toBe(true);
      expect(result.criticalMissing).toBe(0);
    });

    it('should show optional variables as warnings when missing', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️')
      );
    });
  });

  describe('Value Display and Masking', () => {
    it('should mask sensitive values appropriately', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://very-long-supabase-url.supabase.co',
        SUPABASE_ANON_KEY: 'very-long-anon-key-that-should-be-masked',
        SUPABASE_SERVICE_KEY: 'very-long-service-key-that-should-be-masked',
        OPENAI_API_KEY: 'sk-very-long-openai-key',
        JWT_SECRET: 'very-long-jwt-secret',
        JWT_REFRESH_SECRET: 'very-long-refresh-secret',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('...')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PRESENT]')
      );
    });

    it('should display NODE_ENV value directly', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'production',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Value: production')
      );
    });

    it('should show default port when PORT is missing', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('3000 (default)')
      );
    });
  });

  describe('Summary and Statistics', () => {
    it('should display correct statistics', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
        USDA_API_KEY: 'test-usda-key',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Summary:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Total Variables:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Present:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Missing:')
      );
    });

    it('should show production readiness status', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Production Readiness:')
      );
    });
  });

  describe('Payment and Push Notification Variables', () => {
    it('should handle payment variables', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
        STRIPE_SECRET_KEY: 'sk_test_stripe_key',
        APP_STORE_SHARED_SECRET: 'app-store-secret',
        GOOGLE_SERVICE_ACCOUNT_KEY: 'google-service-key',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      const result = await checkEnvironmentVariables();
      expect(result.productionReady).toBe(true);
    });

    it('should handle push notification variables', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
        FCM_SERVER_KEY: 'fcm-server-key',
        APNS_KEY_ID: 'apns-key-id',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      const result = await checkEnvironmentVariables();
      expect(result.productionReady).toBe(true);
    });
  });

  describe('Script Execution', () => {
    it('should exit with code 1 when not production ready', async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
      };

      // Mock the module to avoid actual execution
      jest.doMock('../environment-check', () => ({
        checkEnvironmentVariables: jest.fn().mockResolvedValue({
          productionReady: false,
          criticalMissing: 5,
          requiredMissing: 6,
          totalMissing: 10,
        }),
      }));

      await expect(async () => {
        // Import and run the script
        await import('../environment-check');
      }).rejects.toThrow('Process exit with code 1');
    });

    it('should complete successfully when production ready', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      // Mock the module to avoid actual execution
      jest.doMock('../environment-check', () => ({
        checkEnvironmentVariables: jest.fn().mockResolvedValue({
          productionReady: true,
          criticalMissing: 0,
          requiredMissing: 0,
          totalMissing: 5,
        }),
      }));

      // Should not throw
      await expect(import('../environment-check')).resolves.toBeDefined();
    });

    it('should handle errors in environment check', async () => {
      // Mock the module to throw an error
      jest.doMock('../environment-check', () => ({
        checkEnvironmentVariables: jest.fn().mockRejectedValue(new Error('Test error')),
      }));

      await expect(async () => {
        await import('../environment-check');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Environment check failed:',
        expect.any(Error)
      );
    });
  });

  describe('Environment Variable Categories', () => {
    it('should categorize variables correctly', async () => {
      process.env = {
        ...originalEnv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        OPENAI_API_KEY: 'sk-test-key',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh',
        NODE_ENV: 'test',
      };

      const { checkEnvironmentVariables } = await import('../environment-check');
      
      await checkEnvironmentVariables();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[REQUIRED]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[OPTIONAL]')
      );
    });
  });
});
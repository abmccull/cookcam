import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('dotenv');

const mockCreateClient = jest.fn();
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue({ data: [], error: null }),
};

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

describe('Create Gamification Tables Script', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    };

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: mockCreateClient,
    }));

    mockCreateClient.mockReturnValue(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ error: null });
    
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Gamification Tables Creation', () => {
    it('should create all gamification tables successfully', async () => {
      await import('../create-gamification-tables');

      expect(console.log).toHaveBeenCalledWith('🎮 Creating CookCam Gamification Tables...');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Created table: users'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Created table: user_progress'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Created table: achievements'));
      expect(console.log).toHaveBeenCalledWith('🎉 All gamification tables created successfully!');
    });

    it('should handle table creation errors', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: { message: 'Users table creation failed' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      await import('../create-gamification-tables');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error creating table users:',
        { message: 'Users table creation failed' }
      );
    });

    it('should create tables in correct order', async () => {
      await import('../create-gamification-tables');

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(expect.any(Number));
      
      // Verify users table is created first (has no foreign keys)
      const firstCall = mockSupabase.rpc.mock.calls[0];
      expect(firstCall[1].sql).toContain('CREATE TABLE IF NOT EXISTS users');
    });

    it('should handle database connection errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'));

      await expect(async () => {
        await import('../create-gamification-tables');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to create gamification tables:',
        expect.any(Error)
      );
    });
  });

  describe('SQL Schema Validation', () => {
    it('should use IF NOT EXISTS for all tables', async () => {
      await import('../create-gamification-tables');

      mockSupabase.rpc.mock.calls.forEach((call: any) => {
        expect(call[1].sql).toContain('CREATE TABLE IF NOT EXISTS');
      });
    });

    it('should have proper foreign key relationships', async () => {
      await import('../create-gamification-tables');

      const progressTableCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('user_progress')
      );

      if (progressTableCall) {
        expect(progressTableCall[1].sql).toContain('user_id UUID REFERENCES users(id)');
      }
    });

    it('should have proper primary keys', async () => {
      await import('../create-gamification-tables');

      mockSupabase.rpc.mock.calls.forEach((call: any) => {
        expect(call[1].sql).toContain('PRIMARY KEY');
      });
    });
  });

  describe('Environment Variables', () => {
    it('should use correct Supabase configuration', async () => {
      await import('../create-gamification-tables');

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
    });

    it('should handle missing environment variables', async () => {
      process.env.SUPABASE_URL = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';

      await import('../create-gamification-tables');

      expect(mockCreateClient).toHaveBeenCalledWith('', '');
    });
  });
});
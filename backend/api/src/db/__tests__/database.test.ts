import { Pool, PoolClient, QueryResult } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger';
import { supabase, pool, executeQuery, executeTransaction } from '../database';

// Mock dependencies
jest.mock('pg');
jest.mock('@supabase/supabase-js');
jest.mock('dotenv');
jest.mock('../../utils/logger');

const mockPool = Pool as jest.MockedClass<typeof Pool>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockDotenv = dotenv as jest.Mocked<typeof dotenv>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Database Configuration', () => {
  let mockPoolInstance: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PoolClient
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Mock Pool instance
    mockPoolInstance = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn(),
      query: jest.fn(),
    } as any;

    mockPool.mockImplementation(() => mockPoolInstance);

    // Mock Supabase client
    const mockSupabaseClient = {
      from: jest.fn(),
      auth: jest.fn(),
      storage: jest.fn(),
    };
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);

    // Set up environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  describe('Module Initialization', () => {
    it('should configure dotenv', () => {
      expect(mockDotenv.config).toHaveBeenCalled();
    });

    it('should create Supabase client with correct configuration', () => {
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
    });

    it('should create Supabase client with empty strings when env vars missing', () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      // Clear the mock to test fresh call
      mockCreateClient.mockClear();

      // Re-import to trigger fresh initialization
      jest.resetModules();
      require('../database');

      expect(mockCreateClient).toHaveBeenCalledWith('', '');
    });

    it('should create PostgreSQL pool with correct configuration', () => {
      expect(mockPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
        ssl: false, // NODE_ENV is 'test', not 'production'
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });

    it('should configure SSL for production environment', () => {
      process.env.NODE_ENV = 'production';

      // Clear the mock to test fresh call
      mockPool.mockClear();

      // Re-import to trigger fresh initialization
      jest.resetModules();
      require('../database');

      expect(mockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        })
      );
    });

    it('should export pool as default export', () => {
      expect(pool).toBeDefined();
    });

    it('should export supabase client', () => {
      expect(supabase).toBeDefined();
    });
  });

  describe('executeQuery Function', () => {
    it('should execute query successfully with parameters', async () => {
      const mockQueryResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockQueryResult);

      const result = await executeQuery(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );

      expect(mockPoolInstance.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockQueryResult);
    });

    it('should execute query successfully without parameters', async () => {
      const mockQueryResult: QueryResult = {
        rows: [{ count: 5 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockQueryResult);

      const result = await executeQuery('SELECT COUNT(*) FROM users');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM users',
        []
      );
      expect(result).toEqual(mockQueryResult);
    });

    it('should handle query errors and release client', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValue(queryError);

      await expect(
        executeQuery('SELECT * FROM nonexistent_table')
      ).rejects.toThrow('Query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database query error',
        {
          query: 'SELECT * FROM nonexistent_table',
          error: queryError,
        }
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should truncate long queries in error logs', async () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'a'.repeat(200);
      const queryError = new Error('Long query failed');
      mockClient.query.mockRejectedValue(queryError);

      await expect(executeQuery(longQuery)).rejects.toThrow('Long query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database query error',
        {
          query: longQuery.substring(0, 100),
          error: queryError,
        }
      );
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPoolInstance.connect.mockRejectedValue(connectionError);

      await expect(
        executeQuery('SELECT 1')
      ).rejects.toThrow('Connection failed');

      expect(mockClient.release).not.toHaveBeenCalled();
    });

    it('should release client even if query throws', async () => {
      mockClient.query.mockRejectedValue(new Error('Query error'));

      await expect(executeQuery('SELECT 1')).rejects.toThrow('Query error');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('executeTransaction Function', () => {
    it('should execute multiple operations in a transaction successfully', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');
      const operation3 = jest.fn().mockResolvedValue('result3');

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const results = await executeTransaction([operation1, operation2, operation3]);

      expect(mockPoolInstance.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(operation1).toHaveBeenCalledWith(mockClient);
      expect(operation2).toHaveBeenCalledWith(mockClient);
      expect(operation3).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should execute empty operations array', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const results = await executeTransaction([]);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(results).toEqual([]);
    });

    it('should rollback transaction on operation failure', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const operation3 = jest.fn(); // Should not be called

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        executeTransaction([operation1, operation2, operation3])
      ).rejects.toThrow('Operation failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(operation1).toHaveBeenCalledWith(mockClient);
      expect(operation2).toHaveBeenCalledWith(mockClient);
      expect(operation3).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database transaction error',
        expect.any(Error)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on BEGIN failure', async () => {
      const beginError = new Error('BEGIN failed');
      mockClient.query
        .mockRejectedValueOnce(beginError) // BEGIN fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const operation1 = jest.fn();

      await expect(
        executeTransaction([operation1])
      ).rejects.toThrow('BEGIN failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(operation1).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle ROLLBACK failure gracefully', async () => {
      const operationError = new Error('Operation failed');
      const rollbackError = new Error('Rollback failed');

      const operation1 = jest.fn().mockRejectedValue(operationError);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(rollbackError); // ROLLBACK fails

      await expect(
        executeTransaction([operation1])
      ).rejects.toThrow('Operation failed'); // Should still throw original error

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection errors in transactions', async () => {
      const connectionError = new Error('Connection failed');
      mockPoolInstance.connect.mockRejectedValue(connectionError);

      await expect(
        executeTransaction([jest.fn()])
      ).rejects.toThrow('Connection failed');

      expect(mockClient.release).not.toHaveBeenCalled();
    });

    it('should release client even if transaction fails', async () => {
      const operation1 = jest.fn().mockRejectedValue(new Error('Failed'));

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        executeTransaction([operation1])
      ).rejects.toThrow('Failed');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should execute operations sequentially, not in parallel', async () => {
      const executionOrder: number[] = [];
      
      const operation1 = jest.fn().mockImplementation(async () => {
        executionOrder.push(1);
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result1';
      });
      
      const operation2 = jest.fn().mockImplementation(async () => {
        executionOrder.push(2);
        return 'result2';
      });
      
      const operation3 = jest.fn().mockImplementation(async () => {
        executionOrder.push(3);
        return 'result3';
      });

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      await executeTransaction([operation1, operation2, operation3]);

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error objects in executeQuery', async () => {
      mockClient.query.mockRejectedValue('String error');

      await expect(executeQuery('SELECT 1')).rejects.toBe('String error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database query error',
        {
          query: 'SELECT 1',
          error: 'String error',
        }
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle non-Error objects in executeTransaction', async () => {
      const operation1 = jest.fn().mockRejectedValue('String error');

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(executeTransaction([operation1])).rejects.toBe('String error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database transaction error',
        'String error'
      );
    });

    it('should handle very large query parameters', async () => {
      const largeParams = Array(1000).fill('test');
      const mockQueryResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockQueryResult);

      const result = await executeQuery('SELECT 1', largeParams);

      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1', largeParams);
      expect(result).toEqual(mockQueryResult);
    });

    it('should handle null and undefined parameters', async () => {
      const mockQueryResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockClient.query.mockResolvedValue(mockQueryResult);

      await executeQuery('SELECT * FROM users WHERE name = $1 AND age = $2', [null, undefined]);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = $1 AND age = $2',
        [null, undefined]
      );
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL;

      jest.resetModules();
      require('../database');

      expect(mockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: undefined,
        })
      );
    });

    it('should handle different NODE_ENV values', () => {
      const testEnvs = ['development', 'staging', 'production'];

      testEnvs.forEach(env => {
        process.env.NODE_ENV = env;
        mockPool.mockClear();

        jest.resetModules();
        require('../database');

        const expectedSsl = env === 'production' ? { rejectUnauthorized: false } : false;
        expect(mockPool).toHaveBeenCalledWith(
          expect.objectContaining({
            ssl: expectedSsl,
          })
        );
      });
    });
  });
});
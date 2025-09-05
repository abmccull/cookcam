import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('dotenv');
jest.mock('fs');

const mockCreateClient = jest.fn();
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
};

const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

const mockPath = {
  join: jest.fn(),
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

describe('Quick Database Status Script', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
    };

    // Setup mocks
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: mockCreateClient,
    }));

    jest.doMock('fs', () => mockFs);
    jest.doMock('path', () => mockPath);

    mockCreateClient.mockReturnValue(mockSupabase);
    mockPath.join.mockReturnValue('/mock/path/seeding-progress.json');
    
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Database Status Check', () => {
    it('should display database statistics successfully', async () => {
      // Mock successful database queries
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 15000,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 12000,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    name: 'Tomato',
                    created_at: '2024-01-01T00:00:00Z',
                    category: 'Vegetables',
                    fdc_id: '12345',
                  },
                  {
                    name: 'Chicken Breast',
                    created_at: '2024-01-02T00:00:00Z',
                    category: 'Meat',
                    fdc_id: null,
                  },
                ],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [
                { category: 'Vegetables' },
                { category: 'Vegetables' },
                { category: 'Meat' },
                { category: 'Dairy' },
              ],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 CookCam Database Status Check')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Total Ingredients: 15,000')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🇺🇸 With USDA Data: 12,000')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📈 USDA Coverage: 80.0%')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🆕 Most Recent Ingredients:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📂 Category Breakdown:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Database status check complete!')
      );
    });

    it('should handle ingredient count errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Connection failed' },
        }),
      });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error counting ingredients:',
        'Connection failed'
      );
    });

    it('should handle USDA count errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 1000,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'USDA query failed' },
            }),
          }),
        });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error counting USDA ingredients:',
        'USDA query failed'
      );
    });

    it('should handle recent ingredients errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 1000,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 800,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Recent ingredients query failed' },
              }),
            }),
          }),
        });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error fetching recent ingredients:',
        'Recent ingredients query failed'
      );
    });

    it('should handle categories errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 1000,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 800,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Categories query failed' },
            }),
          }),
        });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error fetching categories:',
        'Categories query failed'
      );
    });
  });

  describe('Recent Ingredients Display', () => {
    it('should display recent ingredients correctly', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    name: 'Apple',
                    created_at: '2024-01-15T10:30:00Z',
                    category: 'Fruits',
                    fdc_id: '12345',
                  },
                  {
                    name: 'Beef',
                    created_at: '2024-01-14T09:15:00Z',
                    category: 'Meat',
                    fdc_id: null,
                  },
                ],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [{ category: 'Fruits' }],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('1. Apple (Fruits) ✅')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2. Beef (Meat) ❌')
      );
    });

    it('should handle no recent ingredients', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 0,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No ingredients found')
      );
    });
  });

  describe('Category Breakdown', () => {
    it('should display top categories correctly', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [
                { category: 'Vegetables' },
                { category: 'Vegetables' },
                { category: 'Vegetables' },
                { category: 'Fruits' },
                { category: 'Fruits' },
                { category: 'Meat' },
              ],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Vegetables: 3')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Fruits: 2')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Meat: 1')
      );
    });

    it('should handle null categories', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [
                { category: 'Vegetables' },
                { category: null },
                { category: 'Fruits' },
              ],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      // Should only count non-null categories
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Vegetables: 1')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Fruits: 1')
      );
    });
  });

  describe('Seeding Progress', () => {
    it('should display seeding progress when file exists', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          processedItems: 15000,
          totalItems: 20000,
          successfulInserts: 14500,
          errors: ['Error 1', 'Error 2'],
          skippedDuplicates: 300,
        })
      );

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Seeding Progress:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Processed: 15,000/20,000')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Success: 14,500')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Errors: 2')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Skipped: 300')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Progress: 75.00%')
      );
    });

    it('should handle corrupted progress file', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('• Progress file exists but cannot be read')
      );
    });

    it('should handle no progress file', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔄 No seeding progress file found')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Could not get database status')
      );
    });

    it('should handle undefined counts', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: undefined,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: undefined,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      const { checkDatabaseStatus } = await import('../quick-db-status');
      await checkDatabaseStatus();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Total Ingredients: 0')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🇺🇸 With USDA Data: 0')
      );
    });
  });

  describe('Script Execution', () => {
    it('should exit with code 0 after completion', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 80,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      mockFs.existsSync.mockReturnValue(false);

      await expect(async () => {
        await import('../quick-db-status');
      }).rejects.toThrow('Process exit with code 0');
    });
  });
});
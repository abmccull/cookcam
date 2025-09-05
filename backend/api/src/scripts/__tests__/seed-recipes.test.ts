import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../db/database');

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
  select: jest.fn().mockResolvedValue({ data: [], error: null }),
  upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
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

describe('Seed Recipes Script', () => {
  beforeEach(() => {
    jest.doMock('../db/database', () => ({
      supabase: mockSupabase,
    }));

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    
    jest.resetModules();
  });

  describe('Recipe Seeding', () => {
    it('should seed recipes successfully', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ 
            data: [
              { id: 1, name: 'tomato' },
              { id: 2, name: 'onion' },
              { id: 3, name: 'garlic' }
            ], 
            error: null 
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(console.log).toHaveBeenCalledWith('🌱 Starting recipe seeding...');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Seeded'));
      expect(console.log).toHaveBeenCalledWith('🎉 Recipe seeding completed!');
    });

    it('should handle ingredient lookup', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ 
            data: [
              { id: 1, name: 'tomato' },
              { id: 2, name: 'onion' },
            ], 
            error: null 
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(mockSupabase.from).toHaveBeenCalledWith('ingredients');
    });

    it('should handle recipe insertion errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Recipe insertion failed' } 
          }),
        });

      await expect(async () => {
        await import('../seed-recipes');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to seed recipes:',
        expect.any(Error)
      );
    });

    it('should handle ingredient lookup errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Ingredient lookup failed' } 
          }),
        });

      await expect(async () => {
        await import('../seed-recipes');
      }).rejects.toThrow('Process exit with code 1');
    });

    it('should create recipe ingredients relationships', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ 
            data: [
              { id: 1, name: 'tomato' },
              { id: 2, name: 'onion' },
            ], 
            error: null 
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(mockSupabase.from).toHaveBeenCalledWith('recipe_ingredients');
    });
  });

  describe('Recipe Data Validation', () => {
    it('should process recipe data correctly', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      const insertCall = mockSupabase.from.mock.calls.find(
        (call: any) => call[0] === 'recipes'
      );
      expect(insertCall).toBeDefined();
    });

    it('should handle empty ingredients list', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(console.log).toHaveBeenCalledWith('🌱 Starting recipe seeding...');
    });

    it('should handle missing ingredient matches', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(console.log).toHaveBeenCalledWith('🌱 Starting recipe seeding...');
    });
  });

  describe('Database Operations', () => {
    it('should use correct table names', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(mockSupabase.from).toHaveBeenCalledWith('ingredients');
      expect(mockSupabase.from).toHaveBeenCalledWith('recipes');
    });

    it('should handle database connection failures', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(async () => {
        await import('../seed-recipes');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to seed recipes:',
        expect.any(Error)
      );
    });
  });

  describe('Recipe Content', () => {
    it('should contain valid recipe data structure', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            // Validate recipe structure
            if (Array.isArray(data)) {
              data.forEach(recipe => {
                expect(recipe).toHaveProperty('title');
                expect(recipe).toHaveProperty('description');
                expect(recipe).toHaveProperty('prep_time');
                expect(recipe).toHaveProperty('cook_time');
                expect(recipe).toHaveProperty('difficulty');
                expect(recipe).toHaveProperty('servings');
              });
            }
            return Promise.resolve({ data: [{ id: 1 }], error: null });
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');
    });

    it('should process multiple recipes', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            return Promise.resolve({ data: [{ id: 1 }], error: null });
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Recipe ingredients insertion failed' } 
          }),
        });

      await expect(async () => {
        await import('../seed-recipes');
      }).rejects.toThrow('Process exit with code 1');
    });

    it('should log appropriate success messages', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      await import('../seed-recipes');

      expect(console.log).toHaveBeenCalledWith('🎉 Recipe seeding completed!');
    });
  });
});
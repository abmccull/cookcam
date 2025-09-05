import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../db/database');

const mockSupabase = {
  rpc: jest.fn(),
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

describe('Setup USDA Script', () => {
  beforeEach(() => {
    jest.doMock('../db/database', () => ({
      supabase: mockSupabase,
    }));

    mockSupabase.rpc.mockResolvedValue({ error: null });
    jest.resetModules();
  });

  describe('USDA Integration Setup', () => {
    it('should create all USDA tables successfully', async () => {
      await import('../setup-usda');

      expect(console.log).toHaveBeenCalledWith('🚀 Setting up USDA Integration...');
      expect(console.log).toHaveBeenCalledWith('📝 Creating usda_foods table...');
      expect(console.log).toHaveBeenCalledWith('✅ usda_foods table created successfully');
      expect(console.log).toHaveBeenCalledWith('📝 Creating usda_nutrients table...');
      expect(console.log).toHaveBeenCalledWith('✅ usda_nutrients table created successfully');
      expect(console.log).toHaveBeenCalledWith('📝 Creating usda_food_nutrients table...');
      expect(console.log).toHaveBeenCalledWith('✅ usda_food_nutrients table created successfully');
      expect(console.log).toHaveBeenCalledWith('🎉 USDA Integration setup completed!');
    });

    it('should create usda_foods table with correct schema', async () => {
      await import('../setup-usda');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('exec', {
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS usda_foods'),
      });

      const foodsTableCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_foods')
      );

      expect(foodsTableCall[1].sql).toContain('fdc_id INT PRIMARY KEY');
      expect(foodsTableCall[1].sql).toContain('description TEXT NOT NULL');
      expect(foodsTableCall[1].sql).toContain('data_type TEXT NOT NULL');
      expect(foodsTableCall[1].sql).toContain('publication_date DATE');
      expect(foodsTableCall[1].sql).toContain('brand_owner TEXT');
      expect(foodsTableCall[1].sql).toContain('gtin_upc TEXT');
      expect(foodsTableCall[1].sql).toContain('ingredients_text TEXT');
      expect(foodsTableCall[1].sql).toContain('serving_size FLOAT');
      expect(foodsTableCall[1].sql).toContain('serving_size_unit TEXT');
      expect(foodsTableCall[1].sql).toContain('category TEXT');
      expect(foodsTableCall[1].sql).toContain('food_category_id INT');
      expect(foodsTableCall[1].sql).toContain('scientific_name TEXT');
      expect(foodsTableCall[1].sql).toContain('common_names TEXT[]');
      expect(foodsTableCall[1].sql).toContain('additional_descriptions TEXT');
      expect(foodsTableCall[1].sql).toContain('data_source TEXT');
      expect(foodsTableCall[1].sql).toContain('created_at TIMESTAMPTZ DEFAULT now()');
      expect(foodsTableCall[1].sql).toContain('updated_at TIMESTAMPTZ DEFAULT now()');
    });

    it('should create usda_nutrients table with correct schema', async () => {
      await import('../setup-usda');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('exec', {
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS usda_nutrients'),
      });

      const nutrientsTableCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_nutrients') && !call[1].sql.includes('food_nutrients')
      );

      expect(nutrientsTableCall[1].sql).toContain('id SERIAL PRIMARY KEY');
      expect(nutrientsTableCall[1].sql).toContain('nutrient_id INT NOT NULL UNIQUE');
      expect(nutrientsTableCall[1].sql).toContain('name TEXT NOT NULL');
      expect(nutrientsTableCall[1].sql).toContain('unit_name TEXT NOT NULL');
      expect(nutrientsTableCall[1].sql).toContain('nutrient_nbr TEXT');
      expect(nutrientsTableCall[1].sql).toContain('rank INT');
    });

    it('should create usda_food_nutrients table with correct schema and relationships', async () => {
      await import('../setup-usda');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('exec', {
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS usda_food_nutrients'),
      });

      const foodNutrientsTableCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_food_nutrients')
      );

      expect(foodNutrientsTableCall[1].sql).toContain('id SERIAL PRIMARY KEY');
      expect(foodNutrientsTableCall[1].sql).toContain('fdc_id INT REFERENCES usda_foods(fdc_id) ON DELETE CASCADE');
      expect(foodNutrientsTableCall[1].sql).toContain('nutrient_id INT REFERENCES usda_nutrients(nutrient_id)');
      expect(foodNutrientsTableCall[1].sql).toContain('amount FLOAT');
      expect(foodNutrientsTableCall[1].sql).toContain('data_points INT');
      expect(foodNutrientsTableCall[1].sql).toContain('derivation_id INT');
      expect(foodNutrientsTableCall[1].sql).toContain('min_value FLOAT');
      expect(foodNutrientsTableCall[1].sql).toContain('max_value FLOAT');
      expect(foodNutrientsTableCall[1].sql).toContain('median_value FLOAT');
      expect(foodNutrientsTableCall[1].sql).toContain('footnote TEXT');
      expect(foodNutrientsTableCall[1].sql).toContain('min_year_acquired INT');
      expect(foodNutrientsTableCall[1].sql).toContain('UNIQUE(fdc_id, nutrient_id)');
    });

    it('should execute table creation in correct order', async () => {
      await import('../setup-usda');

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);

      // First call should be for usda_foods
      expect(mockSupabase.rpc.mock.calls[0][1].sql).toContain('usda_foods');
      // Second call should be for usda_nutrients
      expect(mockSupabase.rpc.mock.calls[1][1].sql).toContain('usda_nutrients');
      expect(mockSupabase.rpc.mock.calls[1][1].sql).not.toContain('food_nutrients');
      // Third call should be for usda_food_nutrients
      expect(mockSupabase.rpc.mock.calls[2][1].sql).toContain('usda_food_nutrients');
    });
  });

  describe('Error Handling', () => {
    it('should handle usda_foods table creation error', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: { message: 'Foods table creation failed' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      await import('../setup-usda');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error creating usda_foods:',
        { message: 'Foods table creation failed' }
      );
      expect(console.log).not.toHaveBeenCalledWith('✅ usda_foods table created successfully');
      expect(console.log).toHaveBeenCalledWith('✅ usda_nutrients table created successfully');
      expect(console.log).toHaveBeenCalledWith('✅ usda_food_nutrients table created successfully');
    });

    it('should handle usda_nutrients table creation error', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Nutrients table creation failed' } })
        .mockResolvedValueOnce({ error: null });

      await import('../setup-usda');

      expect(console.log).toHaveBeenCalledWith('✅ usda_foods table created successfully');
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error creating usda_nutrients:',
        { message: 'Nutrients table creation failed' }
      );
      expect(console.log).not.toHaveBeenCalledWith('✅ usda_nutrients table created successfully');
      expect(console.log).toHaveBeenCalledWith('✅ usda_food_nutrients table created successfully');
    });

    it('should handle usda_food_nutrients table creation error', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Food nutrients table creation failed' } });

      await import('../setup-usda');

      expect(console.log).toHaveBeenCalledWith('✅ usda_foods table created successfully');
      expect(console.log).toHaveBeenCalledWith('✅ usda_nutrients table created successfully');
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error creating usda_food_nutrients:',
        { message: 'Food nutrients table creation failed' }
      );
      expect(console.log).not.toHaveBeenCalledWith('✅ usda_food_nutrients table created successfully');
    });

    it('should handle multiple table creation errors', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: { message: 'Foods error' } })
        .mockResolvedValueOnce({ error: { message: 'Nutrients error' } })
        .mockResolvedValueOnce({ error: { message: 'Food nutrients error' } });

      await import('../setup-usda');

      expect(console.error).toHaveBeenCalledWith('❌ Error creating usda_foods:', { message: 'Foods error' });
      expect(console.error).toHaveBeenCalledWith('❌ Error creating usda_nutrients:', { message: 'Nutrients error' });
      expect(console.error).toHaveBeenCalledWith('❌ Error creating usda_food_nutrients:', { message: 'Food nutrients error' });
      
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(console.log).toHaveBeenCalledWith('🎉 USDA Integration setup completed!');
    });

    it('should exit with code 1 on database connection failure', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'));

      await expect(async () => {
        await import('../setup-usda');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to setup USDA integration:',
        expect.any(Error)
      );
    });

    it('should exit with code 1 on unexpected error', async () => {
      mockSupabase.rpc.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(async () => {
        await import('../setup-usda');
      }).rejects.toThrow('Process exit with code 1');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to setup USDA integration:',
        expect.any(Error)
      );
    });
  });

  describe('Database RPC Calls', () => {
    it('should use correct RPC method for table creation', async () => {
      await import('../setup-usda');

      mockSupabase.rpc.mock.calls.forEach((call: any) => {
        expect(call[0]).toBe('exec');
        expect(call[1]).toHaveProperty('sql');
        expect(typeof call[1].sql).toBe('string');
      });
    });

    it('should handle RPC rejection gracefully', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ error: null })
        .mockRejectedValueOnce(new Error('RPC failed'))
        .mockResolvedValueOnce({ error: null });

      await expect(async () => {
        await import('../setup-usda');
      }).rejects.toThrow('Process exit with code 1');
    });

    it('should handle null/undefined responses', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ error: null });

      await import('../setup-usda');

      expect(console.log).toHaveBeenCalledWith('🎉 USDA Integration setup completed!');
    });
  });

  describe('SQL Schema Validation', () => {
    it('should use IF NOT EXISTS for all tables', async () => {
      await import('../setup-usda');

      mockSupabase.rpc.mock.calls.forEach((call: any) => {
        expect(call[1].sql).toContain('CREATE TABLE IF NOT EXISTS');
      });
    });

    it('should have proper foreign key constraints', async () => {
      await import('../setup-usda');

      const foodNutrientsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_food_nutrients')
      );

      expect(foodNutrientsCall[1].sql).toContain('REFERENCES usda_foods(fdc_id)');
      expect(foodNutrientsCall[1].sql).toContain('REFERENCES usda_nutrients(nutrient_id)');
      expect(foodNutrientsCall[1].sql).toContain('ON DELETE CASCADE');
    });

    it('should have proper unique constraints', async () => {
      await import('../setup-usda');

      const nutrientsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_nutrients') && !call[1].sql.includes('food_nutrients')
      );
      const foodNutrientsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_food_nutrients')
      );

      expect(nutrientsCall[1].sql).toContain('nutrient_id INT NOT NULL UNIQUE');
      expect(foodNutrientsCall[1].sql).toContain('UNIQUE(fdc_id, nutrient_id)');
    });

    it('should have proper primary keys', async () => {
      await import('../setup-usda');

      const foodsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_foods')
      );
      const nutrientsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_nutrients') && !call[1].sql.includes('food_nutrients')
      );
      const foodNutrientsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_food_nutrients')
      );

      expect(foodsCall[1].sql).toContain('fdc_id INT PRIMARY KEY');
      expect(nutrientsCall[1].sql).toContain('id SERIAL PRIMARY KEY');
      expect(foodNutrientsCall[1].sql).toContain('id SERIAL PRIMARY KEY');
    });

    it('should have proper timestamp defaults', async () => {
      await import('../setup-usda');

      const foodsCall = mockSupabase.rpc.mock.calls.find(
        (call: any) => call[1].sql.includes('usda_foods')
      );

      expect(foodsCall[1].sql).toContain('created_at TIMESTAMPTZ DEFAULT now()');
      expect(foodsCall[1].sql).toContain('updated_at TIMESTAMPTZ DEFAULT now()');
    });
  });

  describe('Setup Function', () => {
    it('should complete successfully with all operations', async () => {
      await import('../setup-usda');

      expect(console.log).toHaveBeenCalledWith('🚀 Setting up USDA Integration...');
      expect(console.log).toHaveBeenCalledWith('🎉 USDA Integration setup completed!');
    });
  });
});
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

export class TestDatabase {
  private client: SupabaseClient | null = null;
  private dbName: string;
  private isSetup: boolean = false;

  constructor() {
    this.dbName = `test_${Date.now()}`;
  }

  async setup() {
    try {
      console.log('🔧 Creating test database...');
      
      // For CI environment, use existing database
      if (process.env.CI) {
        this.dbName = 'testdb';
      } else {
        // Create test database locally
        execSync(`createdb ${this.dbName}`, { stdio: 'inherit' });
      }
      
      // Run migrations
      console.log('📝 Running migrations...');
      const migrationsPath = path.join(__dirname, '../../backend/supabase/migrations');
      
      if (fs.existsSync(migrationsPath)) {
        const migrations = fs.readdirSync(migrationsPath)
          .filter(file => file.endsWith('.sql'))
          .sort();
        
        for (const migration of migrations) {
          console.log(`  - Running migration: ${migration}`);
          const sqlPath = path.join(migrationsPath, migration);
          const sql = fs.readFileSync(sqlPath, 'utf8');
          
          // Execute migration using psql
          const dbUrl = process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5432/${this.dbName}`;
          execSync(`psql "${dbUrl}" -c "${sql.replace(/"/g, '\\"')}"`, { 
            stdio: 'pipe',
            encoding: 'utf8'
          });
        }
      }
      
      // Initialize Supabase client
      const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:54321';
      const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'test-key';
      
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      
      await this.seedTestData();
      this.isSetup = true;
      
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error);
      throw error;
    }
  }

  async seedTestData() {
    if (!this.client) return;
    
    console.log('🌱 Seeding test data...');
    
    // Create test users
    const testUsers = [
      { 
        email: 'test1@example.com', 
        password: 'TestPass123!',
        metadata: {
          name: 'Test User 1',
          level: 1,
          xp: 0,
          streak: 0
        }
      },
      { 
        email: 'test2@example.com', 
        password: 'TestPass123!',
        metadata: {
          name: 'Test User 2',
          level: 5,
          xp: 500,
          streak: 7
        }
      },
      { 
        email: 'premium@example.com', 
        password: 'TestPass123!',
        metadata: {
          name: 'Premium User',
          level: 10,
          xp: 2500,
          streak: 30,
          subscription_tier: 'premium'
        }
      }
    ];
    
    for (const userData of testUsers) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: { 
            data: userData.metadata
          }
        });
        
        if (error) {
          console.warn(`  ⚠️ Could not create user ${userData.email}:`, error.message);
        } else {
          console.log(`  ✓ Created test user: ${userData.email}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Error creating user ${userData.email}:`, err);
      }
    }
    
    // Create test recipes
    const recipes = [
      {
        title: 'Test Recipe 1',
        description: 'A delicious test recipe',
        ingredients: JSON.stringify(['Ingredient 1', 'Ingredient 2']),
        instructions: JSON.stringify(['Step 1', 'Step 2']),
        cook_time: 30,
        prep_time: 15,
        servings: 4,
        difficulty: 'easy',
        cuisine: 'Italian',
        dietary_tags: ['vegetarian'],
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 8
      },
      {
        title: 'Test Recipe 2',
        description: 'Another test recipe',
        ingredients: JSON.stringify(['Ingredient A', 'Ingredient B', 'Ingredient C']),
        instructions: JSON.stringify(['Step A', 'Step B', 'Step C']),
        cook_time: 45,
        prep_time: 20,
        servings: 6,
        difficulty: 'medium',
        cuisine: 'Mexican',
        dietary_tags: ['gluten-free', 'vegan'],
        calories: 320,
        protein: 15,
        carbs: 40,
        fat: 12
      }
    ];
    
    // Insert recipes if table exists
    try {
      const { error } = await this.client.from('recipes').insert(recipes);
      if (error) {
        console.warn('  ⚠️ Could not seed recipes:', error.message);
      } else {
        console.log('  ✓ Seeded test recipes');
      }
    } catch (err) {
      console.warn('  ⚠️ Recipes table might not exist yet');
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test database...');
    
    try {
      if (this.client) {
        await this.client.auth.signOut();
      }
      
      if (!process.env.CI && this.isSetup) {
        execSync(`dropdb --if-exists ${this.dbName}`, { stdio: 'pipe' });
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this.client;
  }

  getDatabaseUrl(): string {
    return process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5432/${this.dbName}`;
  }

  getDatabaseName(): string {
    return this.dbName;
  }
}

// Export singleton instance for tests
export const testDb = new TestDatabase();
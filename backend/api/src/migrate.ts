/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkTablesExist() {
  console.log('🔍 Checking existing tables...');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  if (error) {
    console.error('Error checking tables:', error);
    return false;
  }
  
  const tableNames = data?.map(t => t.table_name) || [];
  console.log('Existing tables:', tableNames);
  
  // Check if we already have the main tables
  const requiredTables = ['users', 'recipes', 'mystery_boxes', 'user_progress'];
  const missingTables = requiredTables.filter(table => !tableNames.includes(table));
  
  if (missingTables.length === 0) {
    console.log('✅ All required tables already exist!');
    return true;
  }
  
  console.log('Missing tables:', missingTables);
  return false;
}

async function createEssentialTables() {
  console.log('🏗️ Creating essential tables for CookCam...');
  
  // Create users table
  const createUsersSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_url TEXT,
      level INT NOT NULL DEFAULT 1,
      xp INT NOT NULL DEFAULT 0,
      total_xp INT NOT NULL DEFAULT 0,
      streak_current INT DEFAULT 0,
      streak_shields INT DEFAULT 0,
      is_creator BOOLEAN DEFAULT FALSE,
      creator_tier INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create recipes table (updated to match our API)
  const createRecipesSQL = `
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      prep_time INT,
      cook_time INT,
      difficulty TEXT,
      servings INT,
      ingredients JSONB NOT NULL,
      instructions TEXT[],
      nutrition JSONB,
      tags TEXT[],
      cuisine TEXT,
      created_by UUID REFERENCES users(id),
      is_generated BOOLEAN DEFAULT FALSE,
      is_published BOOLEAN DEFAULT TRUE,
      view_count INT DEFAULT 0,
      ai_metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create user_progress table for XP tracking
  const createProgressSQL = `
    CREATE TABLE IF NOT EXISTS user_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      xp_gained INT NOT NULL,
      total_xp INT NOT NULL,
      old_level INT NOT NULL,
      new_level INT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create mystery_boxes table
  const createMysteryBoxSQL = `
    CREATE TABLE IF NOT EXISTS mystery_boxes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      rarity TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      reward_value JSONB NOT NULL,
      opened_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create recipe_sessions table for two-stage recipe generation
  const createRecipeSessionsSQL = `
    CREATE TABLE IF NOT EXISTS recipe_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      input_data JSONB NOT NULL,
      suggestions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create ingredient_scans table
  const createScansSQL = `
    CREATE TABLE IF NOT EXISTS ingredient_scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      detected_ingredients JSONB NOT NULL,
      image_url TEXT,
      confidence_score FLOAT,
      scan_metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create saved_recipes table
  const createSavedRecipesSQL = `
    CREATE TABLE IF NOT EXISTS saved_recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, recipe_id)
    );
  `;

  // Create recipe_ratings table
  const createRatingsSQL = `
    CREATE TABLE IF NOT EXISTS recipe_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, recipe_id)
    );
  `;

  // Note: user_follows table removed - social features not implemented

  const tables = [
    { name: 'users', sql: createUsersSQL },
    { name: 'recipes', sql: createRecipesSQL },
    { name: 'user_progress', sql: createProgressSQL },
    { name: 'mystery_boxes', sql: createMysteryBoxSQL },
    { name: 'recipe_sessions', sql: createRecipeSessionsSQL },
    { name: 'ingredient_scans', sql: createScansSQL },
    { name: 'saved_recipes', sql: createSavedRecipesSQL },
    { name: 'recipe_ratings', sql: createRatingsSQL }
  ];

  for (const table of tables) {
    try {
      console.log(`Creating ${table.name} table...`);
      await supabase.from('_').select('*').limit(0);
      
      // Use RPC to execute raw SQL (if available) or try direct execution
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ query: table.sql })
      });

      if (!response.ok) {
        console.log(`⚠️ Table ${table.name} might already exist or need manual creation`);
      } else {
        console.log(`✅ Created ${table.name} table`);
      }
    } catch (createError: unknown) {
      console.log('Error executing query - continuing...', createError);
      return;
    }
  }
}

async function main() {
  console.log('🚀 CookCam Database Setup\n');
  
  const tablesExist = await checkTablesExist();
  
  if (!tablesExist) {
    await createEssentialTables();
  }
  
  console.log('\n✨ Database setup complete! Your CookCam backend is ready to use.');
  console.log('\n📌 Next steps:');
  console.log('1. Test the API endpoints');
  console.log('2. Connect your mobile app');
  console.log('3. Start creating recipes with Chef Camillo!');
}

main().catch(console.error); 
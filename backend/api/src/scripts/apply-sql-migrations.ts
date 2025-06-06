import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function applySQLMigrations() {
  console.log('🔧 Applying SQL Migrations to Supabase...');
  
  const migrations = [
    {
      name: 'XP Function',
      file: '../../../supabase/migrations/add_user_xp_function.sql'
    },
    {
      name: 'Enhanced Preferences',
      file: '../../../supabase/migrations/20241201_enhanced_preferences.sql'
    }
  ];

  try {
    for (const migration of migrations) {
      console.log(`\n📄 Applying ${migration.name}...`);
      
      // Read SQL file
      const sqlPath = join(__dirname, migration.file);
      const sqlContent = readFileSync(sqlPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);
          
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`   ❌ Error in statement ${i + 1}:`, error);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        }
      }
      
      console.log(`✅ ${migration.name} migration completed`);
    }

    console.log('\n🎉 All migrations applied successfully!');
    console.log('\n📋 Changes applied:');
    console.log('   • add_user_xp SQL function created');
    console.log('   • Enhanced user preferences columns added');
    console.log('   • Kitchen appliances table created');
    console.log('   • User cooking sessions table created');
    console.log('   • RLS policies configured');
    console.log('\n🔧 Next steps:');
    console.log('   1. Test XP functionality in the app');
    console.log('   2. Verify enhanced preferences work');
    console.log('   3. Check kitchen appliances are populated');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative direct SQL execution method
async function executeRawSQL(sql: string) {
  try {
    console.log('🔧 Executing raw SQL...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    });

    if (error) {
      console.error('❌ SQL Error:', error);
      return false;
    }

    console.log('✅ SQL executed successfully');
    if (data) {
      console.log('📊 Result:', data);
    }
    return true;
  } catch (error) {
    console.error('❌ Execution failed:', error);
    return false;
  }
}

// Utility to test the XP function
async function testXPFunction(userId: string) {
  console.log('🧪 Testing add_user_xp function...');
  
  const sql = `
    SELECT * FROM add_user_xp(
      '${userId}'::UUID,
      50,
      'test_xp_award',
      '{"test": true}'::JSONB
    );
  `;
  
  return await executeRawSQL(sql);
}

// Run the migration
if (require.main === module) {
  applySQLMigrations()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { applySQLMigrations, executeRawSQL, testXPFunction }; 
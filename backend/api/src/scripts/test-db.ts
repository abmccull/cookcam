import { supabase } from '../db/database';

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing Supabase database connection...');
    
    // Test 1: Simple query to check connection
    console.log('📝 Test 1: Checking connection with simple query...');
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Database connection error:', error);
      return;
    }
    
    console.log(`✅ Database connection successful!`);
    console.log(`📊 Found ${data?.length || 0} ingredients in database`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample ingredients:');
      data.forEach((ingredient: any, index: number) => {
        console.log(`   ${index + 1}. ${ingredient.name} (Category: ${ingredient.category || 'N/A'})`);
      });
    } else {
      console.log('📝 No ingredients found in database');
    }
    
    // Test 2: Check if tables exist
    console.log('\n📝 Test 2: Checking if USDA tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%usda%');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('✅ USDA tables found:', tables?.map(t => t.table_name) || []);
    }
    
    console.log('\n🎉 Database connection test completed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the test
testDatabaseConnection(); 
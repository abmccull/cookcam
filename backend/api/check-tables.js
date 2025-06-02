const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('🔍 Checking database tables...\n');
  
  const tables = [
    'ingredients',
    'recipes', 
    'users',
    'user_progress',
    'user_achievements', 
    'achievements',
    'leaderboards',
    'recipe_sessions',
    'ingredient_scans',
    'streaks',
    'mystery_boxes',
    'creator_tiers'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${data ? data.length : 0} sample rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

checkTables().catch(console.error); 
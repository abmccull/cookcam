import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function fixXPFunctionOverloading() {
  console.log('🔧 Fixing add_user_xp function overloading issue...');
  
  try {
    console.log('1️⃣ Dropping redundant 3-parameter add_user_xp function...');
    
    const dropFunctionSQL = `
      DROP FUNCTION IF EXISTS add_user_xp(p_user_id UUID, p_xp_amount INTEGER, p_action TEXT);
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropFunctionSQL
    });

    if (dropError) {
      console.error('❌ Error dropping 3-parameter function:', dropError);
      return false;
    }
    
    console.log('✅ Successfully dropped 3-parameter function');
    console.log('\n🎉 XP function overloading issue fixed!');
    
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

if (require.main === module) {
  fixXPFunctionOverloading()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

export { fixXPFunctionOverloading }; 
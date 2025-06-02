import { supabase } from '../db/database';

async function testUSDASync() {
  try {
    console.log('🧪 Testing USDA sync database operations...');
    
    // Test 1: Get ingredient 1
    console.log('📝 Test 1: Fetching ingredient 1...');
    const { data: ingredient, error: fetchError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }
    
    console.log('✅ Found ingredient:', ingredient.name);
    console.log('📊 Current data:', JSON.stringify(ingredient, null, 2));
    
    // Test 2: Try simple update
    console.log('\n📝 Test 2: Trying simple update...');
    const updateData = {
      fdc_id: 12345,
      usda_sync_date: new Date().toISOString()
    };
    console.log('📤 Update data:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', 1)
      .select();
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
      return;
    }
    
    console.log('✅ Update successful!');
    console.log('📊 Updated data:', JSON.stringify(updateResult, null, 2));
    
    // Test 3: Try nutrition update
    console.log('\n📝 Test 3: Trying nutrition update...');
    const nutritionData = {
      calories_per_100g: 20,
      protein_g_per_100g: 0.9,
      carbs_g_per_100g: 4.0,
      fat_g_per_100g: 0.3
    };
    console.log('🥗 Nutrition data:', nutritionData);
    
    const { data: nutritionResult, error: nutritionError } = await supabase
      .from('ingredients')
      .update(nutritionData)
      .eq('id', 1)
      .select();
    
    if (nutritionError) {
      console.error('❌ Nutrition update error:', nutritionError);
      return;
    }
    
    console.log('✅ Nutrition update successful!');
    console.log('📊 Final data:', JSON.stringify(nutritionResult, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUSDASync(); 
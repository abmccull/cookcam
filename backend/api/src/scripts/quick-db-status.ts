import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client directly
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkDatabaseStatus() {
  try {
    console.log('🔍 CookCam Database Status Check\n');
    
    // Check total ingredients
    const { count: totalIngredients, error: countError } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting ingredients:', countError.message);
      return;
    }
    
    console.log(`📊 Total Ingredients: ${totalIngredients?.toLocaleString() || 0}`);
    
    // Check ingredients with USDA data
    const { count: usdaCount, error: usdaError } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
      .not('fdc_id', 'is', null);
    
    if (usdaError) {
      console.error('❌ Error counting USDA ingredients:', usdaError.message);
      return;
    }
    
    console.log(`🇺🇸 With USDA Data: ${usdaCount?.toLocaleString() || 0}`);
    console.log(`📈 USDA Coverage: ${((usdaCount || 0) / (totalIngredients || 1) * 100).toFixed(1)}%`);
    
    // Check recent ingredients
    const { data: recentIngredients, error: recentError } = await supabase
      .from('ingredients')
      .select('name, created_at, category, fdc_id')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ Error fetching recent ingredients:', recentError.message);
      return;
    }
    
    console.log('\n🆕 Most Recent Ingredients:');
    if (recentIngredients && recentIngredients.length > 0) {
      recentIngredients.forEach((ingredient, index) => {
        const date = new Date(ingredient.created_at).toLocaleDateString();
        const usdaStatus = ingredient.fdc_id ? '✅' : '❌';
        console.log(`   ${index + 1}. ${ingredient.name} (${ingredient.category}) ${usdaStatus} - ${date}`);
      });
    } else {
      console.log('   No ingredients found');
    }
    
    // Check categories breakdown
    const { data: categories, error: categoriesError } = await supabase
      .from('ingredients')
      .select('category')
      .not('category', 'is', null);
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError.message);
      return;
    }
    
    const categoryCount: Record<string, number> = {};
    categories?.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });
    
    console.log('\n📂 Category Breakdown:');
    const sortedCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedCategories.forEach(([category, count]) => {
      console.log(`   • ${category}: ${count.toLocaleString()}`);
    });
    
    // Check if seeding progress file exists
    const fs = require('fs');
    const path = require('path');
    const progressFile = path.join(__dirname, '../../seeding-progress.json');
    
    if (fs.existsSync(progressFile)) {
      try {
        const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        console.log('\n🔄 Seeding Progress:');
        console.log(`   • Processed: ${progressData.processedItems?.toLocaleString() || 0}/${progressData.totalItems?.toLocaleString() || 0}`);
        console.log(`   • Success: ${progressData.successfulInserts?.toLocaleString() || 0}`);
        console.log(`   • Errors: ${progressData.errors?.length || 0}`);
        console.log(`   • Skipped: ${progressData.skippedDuplicates || 0}`);
        const percentage = ((progressData.processedItems || 0) / (progressData.totalItems || 1) * 100).toFixed(2);
        console.log(`   • Progress: ${percentage}%`);
      } catch {
        console.log('   • Progress file exists but cannot be read');
      }
    } else {
      console.log('\n🔄 No seeding progress file found');
    }
    
    console.log('\n✅ Database status check complete!');
    
  } catch {
    console.log('⚠️  Could not get database status');
  }
}

// Run the status check
checkDatabaseStatus().then(() => process.exit(0)); 
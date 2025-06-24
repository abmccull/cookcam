// Load required modules first
const path = require('path');

// Load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Extract nutritional data using correct USDA nutrient IDs
function extractNutritionalData(food) {
  if (!food.foodNutrients) return {};

  const nutrition = {};
  
  food.foodNutrients.forEach(nutrient => {
    // Handle different API response formats
    const nutrientId = nutrient.nutrientId || nutrient.nutrient?.id;
    const amount = nutrient.value || nutrient.amount;

    // Using correct USDA nutrient IDs from the search API
    switch (nutrientId) {
      case 2047: // Energy (Atwater General Factors)
      case 2048: // Energy (Atwater Specific Factors)
        nutrition.calories_per_100g = amount;
        break;
      case 1003: // Protein
        nutrition.protein_g_per_100g = amount;
        break;
      case 1005: // Carbohydrate, by difference
      case 1050: // Carbohydrate, by summation
        nutrition.carbs_g_per_100g = amount;
        break;
      case 1004: // Total lipid (fat)
        nutrition.fat_g_per_100g = amount;
        break;
      case 1079: // Fiber, total dietary
        nutrition.fiber_g_per_100g = amount;
        break;
      case 2000: // Total Sugars
      case 1063: // Sugars, Total
        nutrition.sugar_g_per_100g = amount;
        break;
      case 1093: // Sodium, Na
        nutrition.sodium_mg_per_100g = amount;
        break;
      case 1087: // Calcium, Ca
        nutrition.calcium_mg_per_100g = amount;
        break;
      case 1089: // Iron, Fe
        nutrition.iron_mg_per_100g = amount;
        break;
      case 1162: // Vitamin C, total ascorbic acid
        nutrition.vitamin_c_mg_per_100g = amount;
        break;
    }
  });

  return nutrition;
}

async function testNutrientParsing() {
  try {
    console.log('🔑 Using API key:', USDA_API_KEY.substring(0, 8) + '...');
    console.log('🧪 Testing nutrient extraction...');
    
    const response = await axios.get(`${USDA_BASE_URL}/foods/search`, {
      params: { 
        query: '*',
        dataType: 'Foundation',
        pageSize: 1,
        pageNumber: 1,
        api_key: USDA_API_KEY
      },
      timeout: 30000
    });
    
    const food = response.data.foods[0];
    console.log('🍎 Testing food:', food.description);
    console.log('🔢 Nutrients available:', food.foodNutrients?.length || 0);
    
    // Test our extraction function
    const nutritionData = extractNutritionalData(food);
    
    console.log('📊 Extracted nutrition data:');
    console.log(JSON.stringify(nutritionData, null, 2));
    
    // Count how many nutrients we extracted
    const extractedCount = Object.keys(nutritionData).length;
    console.log(`✅ Successfully extracted ${extractedCount} nutrition values`);
    
    if (extractedCount > 0) {
      console.log('🎉 Nutrient parsing is working correctly!');
      return true;
    } else {
      console.log('❌ No nutrients were extracted - check the parsing logic');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting nutrient parsing test...\n');
  
  const success = await testNutrientParsing();
  
  console.log('\n📝 Test complete!');
  console.log(success ? '✅ Nutrient parsing is working' : '❌ Nutrient parsing needs fixing');
}

main().catch(console.error); 
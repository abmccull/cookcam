// Load required modules first
const path = require('path');

// Load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

function extractNutritionalData(food) {
  if (!food.foodNutrients) return {};
  const nutrition = {};
  
  console.log('🔍 Available nutrients:', food.foodNutrients.length);
  
  food.foodNutrients.forEach(nutrient => {
    const nutrientId = nutrient.nutrientId || nutrient.nutrient?.id;
    const amount = nutrient.value || nutrient.amount;
    
    // Log the nutrients we're looking for
    if ([1008, 2047, 2048, 1003, 1005, 1050, 1004, 1093].includes(nutrientId)) {
      console.log(`   Found: ${nutrientId} - ${nutrient.nutrientName} = ${amount}`);
    }

    switch (nutrientId) {
      case 1008: // Energy (branded foods)
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
      case 1093: // Sodium, Na
        nutrition.sodium_mg_per_100g = amount;
        break;
    }
  });
  return nutrition;
}

async function testBrandedNutrients() {
  try {
    console.log('🔑 Using API key:', USDA_API_KEY.substring(0, 8) + '...');
    console.log('🧪 Testing branded food nutrient extraction...');
    
    const response = await axios.get(`${USDA_BASE_URL}/foods/search`, {
      params: { 
        query: '*',
        dataType: 'Branded',
        pageSize: 1,
        pageNumber: 1,
        api_key: USDA_API_KEY
      }
    });
    
    const food = response.data.foods[0];
    console.log('🍔 Testing branded food:', food.description.substring(0, 50) + '...');
    
    const nutrition = extractNutritionalData(food);
    console.log('📊 Final nutrition extracted:');
    console.log(nutrition);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting branded food nutrient test...\n');
  
  const success = await testBrandedNutrients();
  
  console.log('\n📝 Test complete!');
  console.log(success ? '✅ Branded nutrient extraction test passed' : '❌ Branded nutrient extraction test failed');
}

main().catch(console.error); 
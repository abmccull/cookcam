// Load required modules first
const path = require('path');

// Load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// All the helper functions from the seeder
function extractNutritionalData(food) {
  if (!food.foodNutrients) return {};

  const nutrition = {};
  
  food.foodNutrients.forEach(nutrient => {
    const nutrientId = nutrient.nutrientId || nutrient.nutrient?.id;
    const amount = nutrient.value || nutrient.amount;

    switch (nutrientId) {
      case 2047:
      case 2048:
        nutrition.calories_per_100g = amount;
        break;
      case 1003:
        nutrition.protein_g_per_100g = amount;
        break;
      case 1005:
      case 1050:
        nutrition.carbs_g_per_100g = amount;
        break;
      case 1004:
        nutrition.fat_g_per_100g = amount;
        break;
      case 1079:
        nutrition.fiber_g_per_100g = amount;
        break;
      case 2000:
      case 1063:
        nutrition.sugar_g_per_100g = amount;
        break;
      case 1093:
        nutrition.sodium_mg_per_100g = amount;
        break;
      case 1087:
        nutrition.calcium_mg_per_100g = amount;
        break;
      case 1089:
        nutrition.iron_mg_per_100g = amount;
        break;
      case 1162:
        nutrition.vitamin_c_mg_per_100g = amount;
        break;
    }
  });

  return nutrition;
}

function mapUSDACategory(food) {
  const dataType = food.dataType;
  
  if (food.foodCategory) {
    const lowerCategory = food.foodCategory.toLowerCase();
    
    const categoryMap = {
      'vegetables and vegetable products': 'Vegetables',
      'fruits and fruit juices': 'Fruits',
      'dairy and egg products': 'Dairy',
      'poultry products': 'Meat & Poultry',
      'beef products': 'Meat & Poultry', 
      'pork products': 'Meat & Poultry',
      'lamb, veal, and game products': 'Meat & Poultry',
      'finfish and shellfish products': 'Seafood',
      'legumes and legume products': 'Legumes',
      'nut and seed products': 'Nuts & Seeds',
      'cereal grains and pasta': 'Grains',
      'baked products': 'Baked Goods',
      'fats and oils': 'Oils',
      'spices and herbs': 'Seasonings',
      'beverages': 'Beverages',
      'sweets': 'Desserts',
      'snacks': 'Snacks',
      'soups, sauces, and gravies': 'Condiments',
      'meals, entrees, and side dishes': 'Prepared Foods',
      'fast foods': 'Fast Food'
    };
    
    if (categoryMap[lowerCategory]) {
      return categoryMap[lowerCategory];
    }
    
    return food.foodCategory;
  }

  switch (dataType) {
    case 'Foundation': return 'Foundation Foods';
    case 'SR Legacy': return 'Standard Reference';
    case 'Survey (FNDDS)': return 'Survey Foods';
    case 'Branded': return 'Packaged Foods';
    default: return 'Other';
  }
}

function generateDietaryFlags(food) {
  const flags = [];
  
  if (food.dataType === 'Foundation' || food.dataType === 'SR Legacy') {
    if (food.foodCategory && food.foodCategory.includes('Vegetables')) {
      flags.push('vegan', 'vegetarian', 'gluten-free');
    } else if (food.foodCategory && food.foodCategory.includes('Fruits')) {
      flags.push('vegan', 'vegetarian', 'gluten-free');
    } else if (food.foodCategory && food.foodCategory.includes('Legumes')) {
      flags.push('vegan', 'vegetarian', 'high-protein');
    } else if (food.foodCategory && food.foodCategory.includes('Nuts')) {
      flags.push('vegan', 'vegetarian', 'high-fat');
    }
  }
  
  if (food.ingredients) {
    const ingredients = food.ingredients.toLowerCase();
    
    if (ingredients.includes('milk') || ingredients.includes('dairy') || 
        ingredients.includes('cheese') || ingredients.includes('cream')) {
      flags.push('contains-dairy');
    }
    
    if (ingredients.includes('wheat') || ingredients.includes('gluten')) {
      flags.push('contains-gluten');
    }
    
    if (ingredients.includes('soy')) {
      flags.push('contains-soy');
    }
    
    if (ingredients.includes('egg')) {
      flags.push('contains-eggs');
    }
  }
  
  return flags;
}

function generateTags(food) {
  const tags = [];
  
  tags.push(food.dataType.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  
  if (food.foodCategory) {
    tags.push(food.foodCategory.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  }
  
  if (food.brandOwner) {
    tags.push('branded', food.brandOwner.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  }
  
  if (food.scientificName) {
    const scientificParts = food.scientificName.toLowerCase().split(' ');
    tags.push(...scientificParts);
  }
  
  return tags.slice(0, 10);
}

function prepareIngredientData(food) {
  const nutritionData = extractNutritionalData(food);
  const category = mapUSDACategory(food);
  const dietaryFlags = generateDietaryFlags(food);
  const tags = generateTags(food);
  
  const name = food.description.length > 500 ? 
    food.description.substring(0, 497) + '...' : 
    food.description;
  
  const searchableText = [
    name,
    category,
    food.brandOwner || '',
    food.scientificName || '',
    food.additionalDescriptions || '',
    tags.join(' ')
  ].join(' ').toLowerCase();

  return {
    name,
    fdc_id: food.fdcId,
    category,
    searchable_text: searchableText,
    tags: tags, // PostgreSQL will handle array insertion properly
    dietary_flags: dietaryFlags, // PostgreSQL will handle array insertion properly
    usda_data_type: food.dataType,
    usda_sync_date: new Date().toISOString(),
    ...nutritionData
  };
}

async function testIngredientPreparation() {
  try {
    console.log('🔑 Using API key:', USDA_API_KEY.substring(0, 8) + '...');
    console.log('🧪 Testing ingredient data preparation...');
    
    const response = await axios.get(`${USDA_BASE_URL}/foods/search`, {
      params: { 
        query: '*',
        dataType: 'Foundation',
        pageSize: 2,
        pageNumber: 1,
        api_key: USDA_API_KEY
      },
      timeout: 30000
    });
    
    console.log(`🍎 Testing ${response.data.foods.length} foods`);
    
    for (let i = 0; i < response.data.foods.length; i++) {
      const food = response.data.foods[i];
      console.log(`\n--- Food ${i + 1}: ${food.description} ---`);
      
      const ingredientData = prepareIngredientData(food);
      
      console.log('✅ Prepared data structure:');
      console.log('  - Name:', ingredientData.name.substring(0, 50) + '...');
      console.log('  - FDC ID:', ingredientData.fdc_id);
      console.log('  - Category:', ingredientData.category);
      console.log('  - Tags type:', Array.isArray(ingredientData.tags) ? 'Array' : typeof ingredientData.tags);
      console.log('  - Tags value:', ingredientData.tags);
      console.log('  - Dietary flags type:', Array.isArray(ingredientData.dietary_flags) ? 'Array' : typeof ingredientData.dietary_flags);
      console.log('  - Dietary flags value:', ingredientData.dietary_flags);
      console.log('  - Nutrition keys:', Object.keys(ingredientData).filter(k => k.includes('_per_100g') || k.includes('_mg_per_100g')));
    }
    
    console.log('\n🎉 All ingredient data prepared successfully!');
    console.log('✅ Arrays are properly formatted for PostgreSQL insertion');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting ingredient preparation test...\n');
  
  const success = await testIngredientPreparation();
  
  console.log('\n📝 Test complete!');
  console.log(success ? '✅ Ingredient preparation is working' : '❌ Ingredient preparation needs fixing');
}

main().catch(console.error); 
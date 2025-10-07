// Load required modules first
const path = require('path');

// Load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

const axios = require('axios');

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

console.log('🔑 Using API key:', USDA_API_KEY.substring(0, 8) + '...');

async function testUSDAAPI() {
  try {
    console.log('🧪 Testing USDA search endpoint...');
    
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
    
    console.log('✅ API call successful!');
    console.log('📊 Total hits:', response.data.totalHits);
    console.log('📄 Foods returned:', response.data.foods?.length || 0);
    console.log('🍎 First food:', response.data.foods?.[0]?.description || 'none');
    
    if (response.data.foods?.[0]) {
      console.log('🧬 Sample food structure:');
      const food = response.data.foods[0];
      console.log('  - fdcId:', food.fdcId);
      console.log('  - dataType:', food.dataType);
      console.log('  - foodCategory:', food.foodCategory);
      console.log('  - nutrients count:', food.foodNutrients?.length || 0);
    }
    
    return true;
  } catch (error) {
    console.error('❌ API call failed:');
    console.error('  - Status:', error.response?.status);
    console.error('  - Message:', error.message);
    console.error('  - URL:', error.config?.url);
    console.error('  - Params:', error.config?.params);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting USDA API test...\n');
  
  const success = await testUSDAAPI();
  
  console.log('\n📝 Test complete!');
  console.log(success ? '✅ API is working correctly' : '❌ API test failed');
}

main().catch(console.error); 
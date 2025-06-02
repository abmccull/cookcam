import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testUSDAConnection() {
  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  const baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  
  console.log('🧪 Testing USDA API Connection\n');
  console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`🌐 Testing URL: ${baseUrl}\n`);
  
  try {
    console.log('📡 Testing basic connectivity...');
    
    // Test a simple search query
    const response = await axios.get(`${baseUrl}/foods/search`, {
      params: {
        query: 'apple',
        pageSize: 1,
        api_key: apiKey
      },
      timeout: 10000
    });
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📦 Data received: ${JSON.stringify(response.data).length} bytes`);
    
    if (response.data.foods && response.data.foods.length > 0) {
      console.log(`🍎 Sample food: ${response.data.foods[0].description}`);
      console.log(`📊 Total hits available: ${response.data.totalHits}`);
    }
    
    console.log('\n✅ USDA API is accessible! The seeding can continue.');
    
    console.log('\n🚀 Ready to resume seeding!');
    console.log('   Run: npm run seed-usda:resume');
    
    return true;
    
  } catch (_error) {
    console.error('❌ Connection failed:', _error instanceof Error ? _error.message : 'Unknown error');
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check your internet connection');
    console.log('   • Verify USDA_API_KEY in .env file');
    console.log('   • Try again in a few minutes');
    
    return false;
  }
}

// Run tests
testUSDAConnection()
  .then(async (success) => {
    if (success) {
      console.log('\n🚀 Ready to resume seeding!');
      console.log('   Run: npm run seed-usda:resume');
    } else {
      console.log('\n⏳ Wait and try again later');
    }
  })
  .finally(() => process.exit(0)); 
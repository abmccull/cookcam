import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = process.env.USDA_API_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';

async function testUSDAAPI() {
  try {
    console.log('🧪 Testing USDA FoodData Central API...');
    console.log(`🔑 Using API Key: ${USDA_API_KEY}`);
    console.log(`🌐 Base URL: ${USDA_BASE_URL}`);
    
    // Test 1: Search for "apple"
    console.log('\n📝 Test 1: Searching for "apple"...');
    const searchResponse = await axios.get(`${USDA_BASE_URL}/foods/search`, {
      params: {
        query: 'apple',
        pageSize: 5,
        api_key: USDA_API_KEY
      }
    });
    
    console.log(`✅ Search successful! Found ${searchResponse.data.totalHits} results`);
    console.log('📋 First few results:');
    searchResponse.data.foods.slice(0, 3).forEach((food: any, index: number) => {
      console.log(`   ${index + 1}. ${food.description} (FDC ID: ${food.fdcId})`);
    });
    
    // Test 2: Get details for the first food item
    if (searchResponse.data.foods.length > 0) {
      const firstFood = searchResponse.data.foods[0];
      console.log(`\n📝 Test 2: Getting details for "${firstFood.description}"...`);
      
      const detailResponse = await axios.get(`${USDA_BASE_URL}/food/${firstFood.fdcId}`, {
        params: {
          api_key: USDA_API_KEY
        }
      });
      
      console.log(`✅ Details retrieved successfully!`);
      console.log(`📊 Food: ${detailResponse.data.description}`);
      console.log(`🏷️  Data Type: ${detailResponse.data.dataType}`);
      
      if (detailResponse.data.foodNutrients) {
        console.log(`🥗 Nutrients found: ${detailResponse.data.foodNutrients.length}`);
        
        // Show key nutrients
        const keyNutrients = detailResponse.data.foodNutrients.filter((n: any) => 
          ['Energy', 'Protein', 'Carbohydrate', 'Total lipid (fat)'].includes(n.nutrient.name)
        );
        
        console.log('🔍 Key nutrients:');
        keyNutrients.forEach((nutrient: any) => {
          console.log(`   • ${nutrient.nutrient.name}: ${nutrient.amount} ${nutrient.nutrient.unitName}`);
        });
      }
    }
    
    console.log('\n🎉 USDA API integration test completed successfully!');
    console.log('✨ Ready to integrate with CookCam database');
    
  } catch (error: any) {
    console.error('❌ USDA API test failed:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
    
    if (error.response?.status === 403) {
      console.log('\n💡 Tip: You may need to get a real API key from https://fdc.nal.usda.gov/api-key-signup.html');
      console.log('   The DEMO_KEY has limited functionality.');
    }
  }
}

// Run the test
testUSDAAPI(); 
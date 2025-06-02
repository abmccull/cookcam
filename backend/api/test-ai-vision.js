const fetch = require('node-fetch');

const testAIVision = async () => {
  try {
    console.log('🧪 Testing OpenAI Vision API integration...\n');
    
    // Get auth token
    console.log('1. Getting authentication token...');
    const authResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' })
    });
    
    const authData = await authResponse.json();
    const token = authData.session?.access_token;
    
    if (!token) {
      throw new Error('Failed to get auth token');
    }
    console.log('✅ Authentication successful\n');
    
    // Test with a simple 1x1 pixel food-colored image
    console.log('2. Testing image analysis...');
    const testImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/9k=';
    
    const scanResponse = await fetch('http://localhost:3000/api/scan/analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image_data: testImageData })
    });
    
    const result = await scanResponse.json();
    
    console.log('📊 API Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.ingredients) {
      console.log('\n✅ OpenAI Vision Analysis Results:');
      result.ingredients.forEach((ing, index) => {
        console.log(`   ${index + 1}. ${ing.name} (${Math.round(ing.confidence * 100)}% confidence) - ${ing.category}`);
      });
      
      if (result.ingredients.length > 0 && result.ingredients[0].name !== 'tomato') {
        console.log('\n🎉 SUCCESS: Real AI analysis is working! (Different from fallback mock data)');
      } else {
        console.log('\n⚠️  Note: May be using fallback data, check OpenAI API logs');
      }
    } else {
      console.log('\n❌ Analysis failed:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
};

// Run the test
testAIVision(); 
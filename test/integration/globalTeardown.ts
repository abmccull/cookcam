import { testDb } from './setup-db';

export default async function globalTeardown() {
  console.log('\n🧹 Starting global test teardown...\n');
  
  try {
    // Cleanup test database
    await testDb.cleanup();
    
    console.log('✅ Global teardown complete\n');
  } catch (error) {
    console.error('⚠️ Global teardown warning:', error);
  }
}
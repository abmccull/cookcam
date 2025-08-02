import { testDb } from './setup-db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

export default async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');
  
  try {
    // Setup test database
    await testDb.setup();
    
    // Store database info for tests
    process.env.TEST_DB_NAME = testDb.getDatabaseName();
    process.env.TEST_DB_URL = testDb.getDatabaseUrl();
    
    console.log('✅ Global setup complete\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
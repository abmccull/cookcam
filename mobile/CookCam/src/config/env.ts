// Environment configuration
// For production, replace these values with production URLs

type Environment = 'development' | 'production';

const ENV: Environment = __DEV__ ? 'development' : 'production';

const config = {
  development: {
    API_URL: 'http://localhost:3000',
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    ENVIRONMENT: 'development',
    DEMO_MODE: true,
  },
  production: {
    API_URL: 'https://api.cookcam.app', // Replace with your production API URL
    SUPABASE_URL: 'YOUR_PRODUCTION_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_PRODUCTION_SUPABASE_ANON_KEY',
    ENVIRONMENT: 'production',
    DEMO_MODE: false,
  },
};

export default config[ENV]; 
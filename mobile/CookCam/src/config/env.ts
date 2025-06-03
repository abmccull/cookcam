// Environment configuration
// For production, replace these values with production URLs

import Config from 'react-native-config';

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_BASE_URL: string;
}

const development: EnvConfig = {
  SUPABASE_URL: Config.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here',
  API_BASE_URL: Config.API_BASE_URL || 'http://localhost:3000/api/v1',
};

const production: EnvConfig = {
  SUPABASE_URL: Config.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here',
  API_BASE_URL: Config.API_BASE_URL || 'http://64.23.236.43:3000/api/v1',
};

const getEnvVars = (): EnvConfig => {
  if (__DEV__) {
    return development;
  }
  return production;
};

export default getEnvVars; 
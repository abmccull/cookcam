// Environment configuration
// Reads from .env file using react-native-config

import Config from 'react-native-config';

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_BASE_URL: string;
}

const getEnvVars = (): EnvConfig => {
  // Environment variables are required - no hardcoded fallbacks for security
  if (!Config.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!Config.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  if (!Config.API_BASE_URL) {
    throw new Error('API_BASE_URL environment variable is required');
  }

  return {
    SUPABASE_URL: Config.SUPABASE_URL,
    SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY,
    API_BASE_URL: Config.API_BASE_URL,
  };
};

export default getEnvVars;

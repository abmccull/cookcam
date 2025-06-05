// Environment configuration
// Reads from .env file using react-native-config

import Config from 'react-native-config';

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_BASE_URL: string;
}

const getEnvVars = (): EnvConfig => {
  // Always use values from .env file first, with sensible fallbacks
  return {
    SUPABASE_URL: Config.SUPABASE_URL || 'https://prpvrnxtpvilxakxzajm.supabase.co',
    SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZybnh0cHZpbHhha3h6YWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDI3OTMsImV4cCI6MjA2NDExODc5M30.Yy-sEHdASoSnjjoi0DjeICSvnWj0g5svYS5Crok8J8k',
    API_BASE_URL: Config.API_BASE_URL || 'http://64.23.236.43:3000',
  };
};

export default getEnvVars; 
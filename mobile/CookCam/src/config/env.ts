// Environment configuration
// Reads from .env file using react-native-config

import Constants from "expo-constants";
import logger from "../utils/logger";


interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_BASE_URL: string;
}

const getEnvVars = (): EnvConfig => {
  // DIAGNOSTIC LOG: Log the entire expoConfig object to see what's available
  logger.debug(
    "🔒 [DEBUG] Constants.expoConfig:",
    JSON.stringify(Constants.expoConfig, null, 2),
  );

  // Environment variables are required - no hardcoded fallbacks for security
  const extra = Constants.expoConfig?.extra || {};

  if (!extra.SUPABASE_URL) {
    logger.error("❌ SUPABASE_URL not found in expoConfig.extra!");
    throw new Error("SUPABASE_URL environment variable is required");
  }

  if (!extra.SUPABASE_ANON_KEY) {
    logger.error("❌ SUPABASE_ANON_KEY not found in expoConfig.extra!");
    throw new Error("SUPABASE_ANON_KEY environment variable is required");
  }

  if (!extra.API_BASE_URL) {
    logger.error("❌ API_BASE_URL not found in expoConfig.extra!");
    throw new Error("API_BASE_URL environment variable is required");
  }

  return {
    SUPABASE_URL: extra.SUPABASE_URL,
    SUPABASE_ANON_KEY: extra.SUPABASE_ANON_KEY,
    API_BASE_URL: extra.API_BASE_URL,
  };
};

export default getEnvVars;

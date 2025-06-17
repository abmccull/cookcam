// Placeholder for Supabase integration
// Note: Install @supabase/supabase-js when ready to use
import config from "../config/env";

// These should be configured via environment variables or build configuration
// For React Native, you can use react-native-config or similar
const envConfig = config();
const SUPABASE_URL = envConfig.SUPABASE_URL;
const SUPABASE_ANON_KEY = envConfig.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
  logger.warn(
    "⚠️ Supabase URL not configured. Please update src/config/env.ts",
  );
}

// This will be used once we install @supabase/supabase-js
/*
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import logger from "../utils/logger";


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: AsyncStorage,
  },
})
*/

// Export config for other services if needed
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

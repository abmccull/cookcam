import { createClient } from "@supabase/supabase-js";
import getEnvVars from "../config/env";

// Get Supabase configuration from environment variables
const envVars = getEnvVars();

if (!envVars.SUPABASE_URL || envVars.SUPABASE_URL === "YOUR_SUPABASE_URL") {
  throw new Error("SUPABASE_URL is required. Please check your .env file.");
}

if (
  !envVars.SUPABASE_ANON_KEY ||
  envVars.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
) {
  throw new Error(
    "SUPABASE_ANON_KEY is required. Please check your .env file.",
  );
}

export const supabase = createClient(
  envVars.SUPABASE_URL,
  envVars.SUPABASE_ANON_KEY,
);

export default supabase;

import dotenv from 'dotenv';
import { envSchema, ValidatedEnv } from './env.schema';
import { logger } from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates and returns environment variables
 * Fails fast if required variables are missing or invalid
 */
export function validateEnv(): ValidatedEnv {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false, // Collect all errors
    stripUnknown: true, // Remove unknown env vars
  });

  if (error) {
    const errorMessages = error.details.map((detail) => {
      return `  ❌ ${detail.message}`;
    });

    console.error('\n🚨 Environment Variable Validation Failed!\n');
    console.error(errorMessages.join('\n'));
    console.error('\n📖 Please check your .env file and ensure all required variables are set.\n');
    console.error('💡 Tip: Copy .env.example to .env and fill in the values.\n');

    process.exit(1);
  }

  // Log successful validation (but don't log secrets!)
  const safeConfig = {
    NODE_ENV: value.NODE_ENV,
    PORT: value.PORT,
    SUPABASE_URL: value.SUPABASE_URL,
    hasSupabaseAnonKey: !!value.SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!(value.SUPABASE_SERVICE_ROLE_KEY || value.SUPABASE_SERVICE_KEY),
    hasJwtSecret: !!value.JWT_SECRET,
    hasJwtRefreshSecret: !!value.JWT_REFRESH_SECRET,
    hasOpenAIKey: !!value.OPENAI_API_KEY,
    hasSentryDsn: !!value.SENTRY_DSN,
    hasStripeKey: !!value.STRIPE_SECRET_KEY,
    hasStripeWebhookSecret: !!value.STRIPE_WEBHOOK_SECRET,
    hasAppleSharedSecret: !!value.APPLE_SHARED_SECRET,
    hasGoogleServiceAccount: !!value.GOOGLE_SERVICE_ACCOUNT_KEY,
    CORS_ORIGIN: value.CORS_ORIGIN,
    LOG_LEVEL: value.LOG_LEVEL,
  };

  logger.info('✅ Environment validation successful', safeConfig);

  return value as ValidatedEnv;
}

/**
 * Validated environment configuration
 * Only use this after validateEnv() has been called in index.ts
 */
let env: ValidatedEnv;

export function getEnv(): ValidatedEnv {
  if (!env) {
    throw new Error('Environment not initialized. Call validateEnv() first.');
  }
  return env;
}

export function setEnv(validatedEnv: ValidatedEnv): void {
  env = validatedEnv;
}

// Export for backward compatibility (will be removed after refactor)
export { ValidatedEnv };


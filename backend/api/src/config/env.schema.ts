import Joi from 'joi';

/**
 * Environment variable validation schema
 * All required variables must be present for the application to start
 */
export const envSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),

  // Server Configuration
  PORT: Joi.number().port().default(3000),

  // Supabase Configuration (CRITICAL)
  SUPABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'SUPABASE_URL is required. Get it from your Supabase dashboard.',
    'string.uri': 'SUPABASE_URL must be a valid URL',
  }),
  SUPABASE_ANON_KEY: Joi.string().required().messages({
    'any.required': 'SUPABASE_ANON_KEY is required. Get it from your Supabase dashboard.',
  }),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional(),
  SUPABASE_SERVICE_KEY: Joi.string().optional(),

  // JWT Configuration (CRITICAL - no defaults in production)
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'JWT_SECRET is required in production (minimum 32 characters)',
    'string.min': 'JWT_SECRET must be at least 32 characters long',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'JWT_REFRESH_SECRET is required in production (minimum 32 characters)',
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters long',
  }),
  JWT_EXPIRY: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // OpenAI Configuration (CRITICAL)
  OPENAI_API_KEY: Joi.string().required().messages({
    'any.required': 'OPENAI_API_KEY is required for ingredient detection and recipe generation',
  }),

  // USDA API (Optional)
  USDA_API_KEY: Joi.string().optional(),

  // Sentry Configuration (Required in production)
  SENTRY_DSN: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'SENTRY_DSN is required in production for error tracking',
  }),

  // Stripe Configuration (Required for payments)
  STRIPE_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'STRIPE_SECRET_KEY is required in production',
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'STRIPE_WEBHOOK_SECRET is required in production for secure webhook processing',
  }),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),

  // Apple IAP Configuration (Required for iOS subscriptions)
  APPLE_SHARED_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'APPLE_SHARED_SECRET is required in production for iOS IAP validation',
  }),

  // Google Play Configuration (Required for Android subscriptions)
  GOOGLE_PLAY_PACKAGE_NAME: Joi.string().default('com.cookcam.app'),
  GOOGLE_SERVICE_ACCOUNT_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({
    'any.required': 'GOOGLE_SERVICE_ACCOUNT_KEY is required in production for Android IAP validation',
  }),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('http://localhost:8081'),

  // Redis Configuration (Optional)
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().optional(),
  REDIS_PASSWORD: Joi.string().optional(),

  // Email Configuration (Optional for now)
  SENDGRID_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),

  // Feature Flags
  ENABLE_WEBSOCKETS: Joi.boolean().default(true),
  ENABLE_ANALYTICS: Joi.boolean().default(true),
  ENABLE_RATE_LIMITING: Joi.boolean().default(true),

  // Monitoring
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).custom((value, helpers) => {
  // Custom validation: at least one service key must be present
  if (!value.SUPABASE_SERVICE_ROLE_KEY && !value.SUPABASE_SERVICE_KEY) {
    return helpers.error('custom.serviceKey', {
      message: 'Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY must be provided',
    });
  }
  return value;
});

/**
 * Validated environment variables type
 */
export interface ValidatedEnv {
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: number;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  OPENAI_API_KEY: string;
  USDA_API_KEY?: string;
  SENTRY_DSN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  APPLE_SHARED_SECRET?: string;
  GOOGLE_PLAY_PACKAGE_NAME: string;
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  CORS_ORIGIN: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  ENABLE_WEBSOCKETS: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_RATE_LIMITING: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}


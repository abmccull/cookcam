import getEnvVars from "./env";

const envVars = getEnvVars();

// API Configuration
export const API_CONFIG = {
  // Base URL - will use environment variable or fallback to environment-specific URL
  baseURL: envVars.API_BASE_URL,

  // Timeout settings
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second

  // Headers
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication - ✅ CORRECT
  auth: {
    login: "/api/v1/auth/signin",
    register: "/api/v1/auth/signup",
    logout: "/api/v1/auth/signout",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
    profile: "/api/v1/auth/profile",
    deleteAccount: "/api/v1/auth/account",
  },

  // Ingredient scanning - UPDATED TO MATCH BACKEND
  scan: {
    upload: "/api/v1/scan/ingredients", // Backend uses /ingredients not /upload
    detect: "/api/v1/scan/analyze", // Backend uses /analyze not /detect
    history: "/api/v1/scan/history",
    get: (scanId: string) => `/api/v1/scan/${scanId}`,
    updateIngredients: (scanId: string) => `/api/v1/scan/${scanId}/ingredients`,
  },

  // Recipes - UPDATED TO MATCH BACKEND
  recipes: {
    generate: "/api/v1/recipes/generate",
    generateFull: "/api/v1/recipes/generate-full", // Backend has this endpoint
    suggestions: "/api/v1/recipes/suggestions", // Backend has this endpoint
    save: "/api/v1/recipes/save",
    list: "/api/v1/recipes", // Backend uses / for list
    get: (id: string) => `/api/v1/recipes/${id}`,
    delete: (id: string) => `/api/v1/recipes/${id}`,
    favorite: (id: string) => `/api/v1/recipes/${id}/favorite`,
    nutrition: (id: string) => `/api/v1/recipes/${id}/nutrition`,
    saveNutrition: (id: string) => `/api/v1/recipes/${id}/save-nutrition`,
    variations: (id: string) => `/api/v1/recipes/${id}/variations`,
    tip: (id: string) => `/api/v1/recipe/${id}/tip`,
  },

  // Ingredients - UPDATED TO MATCH BACKEND
  ingredients: {
    search: "/api/v1/ingredients/search",
    usdaSearch: "/api/v1/ingredients/usda/search", // Backend has this
    list: "/api/v1/ingredients", // Backend uses / for list
    details: (id: string) => `/api/v1/ingredients/${id}`,
    syncUsda: (id: string) => `/api/v1/ingredients/${id}/sync-usda`,
    categories: "/api/v1/ingredients/categories", // Keep for compatibility
  },

  // Gamification - UPDATED TO MATCH BACKEND
  gamification: {
    xp: "/api/v1/gamification/add-xp",
    profile: "/api/v1/gamification/progress", // Backend uses /progress not /profile
    leaderboard: "/api/v1/gamification/leaderboard",
    checkStreak: "/api/v1/gamification/check-streak", // Backend has this
    achievements: "/api/v1/gamification/achievements", // Keep for compatibility
  },

  // Subscription endpoints - UPDATED TO MATCH BACKEND
  subscription: {
    tiers: "/api/v1/subscription/tiers",
    status: "/api/v1/subscription/status",
    checkout: "/api/v1/subscription/create-checkout", // Backend uses create-checkout
    changeTier: "/api/v1/subscription/change-tier", // Backend has this
    cancel: "/api/v1/subscription/cancel",
    webhook: "/api/v1/subscription/webhook/stripe",
    feature: (feature: string) => `/api/v1/subscription/feature/${feature}`, // Keep for compatibility
    validatePurchase: "/api/v1/subscription/validate-purchase",
    refreshStatus: "/api/v1/subscription/refresh-status",
    upgradeToCreator: "/api/v1/subscription/upgrade-to-creator",
    products: "/api/v1/subscription/products",
    creator: {
      revenue: "/api/v1/subscription/creator/revenue",
      payout: "/api/v1/subscription/creator/payout",
      analytics: "/api/v1/subscription/creator/analytics",
    },
    affiliate: {
      generate: "/api/v1/subscription/affiliate/generate",
      links: "/api/v1/subscription/affiliate/links",
      track: (linkCode: string) =>
        `/api/v1/subscription/affiliate/track/${linkCode}`,
    },
  },

  // Analytics endpoints - ✅ IMPLEMENTED
  analytics: {
    track: "/api/v1/analytics/track", // ✅ Uses existing user_progress table
    dashboard: "/api/v1/analytics/dashboard", // ✅ Comprehensive user analytics
    global: "/api/v1/analytics/global", // ✅ Admin-only global analytics
  },

  // User management - UPDATED TO MATCH BACKEND
  users: {
    profile: "/api/v1/users/profile",
    preferences: "/api/v1/users/preferences",
    subscription: "/api/v1/users/subscription",
    get: (userId: string) => `/api/v1/users/${userId}`,
    list: "/api/v1/users",
    follow: (userId: string) => `/api/v1/users/${userId}/follow`,
    followers: (userId: string) => `/api/v1/users/${userId}/followers`,
    following: (userId: string) => `/api/v1/users/${userId}/following`,
  },

  // Mystery Box - NEW BACKEND FEATURE
  mysteryBox: {
    open: "/api/v1/mysteryBox/open",
    history: (userId: string) => `/api/v1/mysteryBox/history/${userId}`,
    stats: "/api/v1/mysteryBox/stats",
  },

  // Debug endpoints (development only)
  debug: {
    env: "/api/v1/debug/env",
    testOpenAI: "/api/v1/debug/test-openai",
  },

  // Health check (correct path based on backend)
  health: "/health",
};

// Error codes mapping
export const API_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
};

// Success status codes
export const SUCCESS_CODES = [200, 201, 202, 204];

// Development vs Production settings
export const IS_DEVELOPMENT = __DEV__;
export const IS_PRODUCTION = !__DEV__;

// Logging configuration
export const LOG_API_REQUESTS = IS_DEVELOPMENT;
export const LOG_API_RESPONSES = IS_DEVELOPMENT;
export const LOG_API_ERRORS = true;

// Image upload configuration
export const IMAGE_UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
};

// Cache configuration
export const CACHE_CONFIG = {
  // Cache durations in milliseconds
  shortTerm: 5 * 60 * 1000, // 5 minutes
  mediumTerm: 30 * 60 * 1000, // 30 minutes
  longTerm: 24 * 60 * 60 * 1000, // 24 hours

  // Cache keys
  keys: {
    user: "user_profile",
    ingredients: "ingredients_list",
    recipes: "user_recipes",
    achievements: "user_achievements",
  },
};

// Feature flags (can be controlled from backend)
export const FEATURE_FLAGS = {
  enablePushNotifications: true,
  enableSocialFeatures: false, // Initially disabled
  enableOfflineMode: false,
  enableAdvancedAnalytics: true,
  enableBetaFeatures: IS_DEVELOPMENT,
};

export default API_CONFIG;

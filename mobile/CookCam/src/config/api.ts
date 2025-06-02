import Config from 'react-native-config';

// API Configuration
export const API_CONFIG = {
  // Base URL - will use environment variable or fallback to local development
  baseURL: Config.API_BASE_URL || 'http://localhost:3000',
  
  // Timeout settings
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    profile: '/auth/profile',
    deleteAccount: '/auth/account',
  },
  
  // Ingredient scanning
  scan: {
    upload: '/scan/upload',
    detect: '/scan/detect',
    history: '/scan/history',
  },
  
  // Recipes
  recipes: {
    generate: '/recipes/generate',
    save: '/recipes/save',
    list: '/recipes',
    get: (id: string) => `/recipes/${id}`,
    delete: (id: string) => `/recipes/${id}`,
    favorite: (id: string) => `/recipes/${id}/favorite`,
    nutrition: (id: string) => `/recipes/${id}/nutrition`,
  },
  
  // Ingredients
  ingredients: {
    search: '/ingredients/search',
    details: (id: string) => `/ingredients/${id}`,
    categories: '/ingredients/categories',
  },
  
  // Gamification
  gamification: {
    xp: '/gamification/add-xp',
    profile: '/gamification/profile',
    leaderboard: '/gamification/leaderboard',
    achievements: '/gamification/achievements',
  },
  
  // User management
  users: {
    profile: '/users/profile',
    preferences: '/users/preferences',
    subscription: '/users/subscription',
  },
  
  // Health check
  health: '/health',
};

// Error codes mapping
export const API_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
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
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
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
    user: 'user_profile',
    ingredients: 'ingredients_list',
    recipes: 'user_recipes',
    achievements: 'user_achievements',
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
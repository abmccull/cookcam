/**
 * API Type Definitions for CookCam
 * Central location for all API request/response types
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  isCreator?: boolean;
  subscription_tier?: 'free' | 'regular' | 'creator';
}

export interface AuthResponse {
  user?: User;
  session?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
  };
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[] | Ingredient[];
  instructions: string[] | Instruction[];
  cuisine_type?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings?: number;
  image_url?: string;
  created_at?: string;
  user_id?: string;
}

export interface Ingredient {
  id?: string;
  name: string;
  quantity?: string;
  unit?: string;
  variety?: string;
  category?: string;
  confidence?: number;
  emoji?: string;
}

export interface Instruction {
  step: number;
  instruction: string;
  time?: number;
  temperature?: string;
}

export interface RecipeFilters {
  cuisine?: string;
  difficulty?: string;
  maxTime?: number;
  ingredients?: string[];
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionTier {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  limits?: Record<string, number>;
  revenue_share_percentage?: number;
}

export interface SubscriptionStatus {
  tier: 'free' | 'regular' | 'creator';
  status: 'active' | 'trialing' | 'canceled' | 'expired';
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export interface FeatureUsage {
  count: number;
  limit: number;
  reset_at?: string;
}

// ============================================================================
// Gamification Types
// ============================================================================

export interface GamificationProgress {
  user_id: string;
  xp: number;
  level: number;
  streak: number;
  badges: Badge[];
  last_activity?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  rank: number;
}

// ============================================================================
// Creator Types
// ============================================================================

export interface CreatorProfile {
  user_id: string;
  display_name: string;
  bio?: string;
  social_links?: Record<string, string>;
  follower_count: number;
  recipe_count: number;
  total_earnings: number;
  stripe_account_id?: string;
}

export interface CreatorStats {
  total_views: number;
  total_likes: number;
  total_saves: number;
  revenue_this_month: number;
  revenue_all_time: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
  session_id?: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface CreateRecipeRequest {
  title: string;
  description?: string;
  ingredients: string[] | Ingredient[];
  instructions: string[] | Instruction[];
  cuisine_type?: string;
  difficulty?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  image_url?: string;
}

export interface UpdateUserRequest {
  name?: string;
  avatar_url?: string;
  preferences?: Record<string, unknown>;
}

export interface IngredientScanRequest {
  image_uri: string;
  user_id?: string;
}

export interface IngredientScanResponse {
  ingredients: Ingredient[];
  confidence: number;
  processing_time_ms: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Use for truly dynamic data that needs runtime validation
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];


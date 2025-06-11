import apiService, {ApiResponse} from './apiService';
import {API_ENDPOINTS} from '../config/api';

// Types for CookCam API responses
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_creator: boolean;
  creator_tier?: number;
  onboarding_completed: boolean;
  // Enhanced preferences fields
  default_serving_size?: number;
  meal_prep_enabled?: boolean;
  default_meal_prep_count?: number;
  kitchen_appliances?: string[];
  dietary_preferences?: string[];
  cuisine_preferences?: string[];
  cooking_skill_level?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface DetectedIngredient {
  name: string;
  variety: string;
  quantity: string;
  unit: string;
  confidence: number;
  category: string;
}

export interface ScanResult {
  id: string;
  user_id: string;
  detected_ingredients: DetectedIngredient[];
  image_url?: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine_type?: string;
  dietary_tags?: string[];
  nutrition_info?: NutritionInfo;
  image_url?: string;
  created_at: string;
  is_favorited?: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export interface GamificationProfile {
  user_id: string;
  total_xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  achievements_earned: number;
  recipes_created: number;
  scans_completed: number;
  streak_days: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned: boolean;
  earned_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
}

// Add new types for subscription
export interface SubscriptionTier {
  id: string;
  slug: 'free' | 'regular' | 'creator';
  name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  limits: {
    daily_scans?: number;
    monthly_recipes?: number;
    saved_recipes?: number;
  };
  revenue_share_percentage?: number; // For creator tier
}

export interface UserSubscription {
  id: string;
  tier_slug: 'free' | 'regular' | 'creator';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  revenue_share_enabled?: boolean; // For creator tier
}

export interface CreatorRevenue {
  total_earnings: number;
  monthly_earnings: number;
  affiliate_earnings: number; // 30% of referral subscriptions
  tips_earnings: number; // 100% of tips
  collections_earnings: number; // 70% of collections revenue
  unpaid_balance: number;
  active_referrals: number;
  revenue_breakdown: {
    referrals_rate: 30; // 30% lifetime recurring
    tips_rate: 100; // 100% of tips
    collections_rate: 70; // 70% of collections
  };
}

export interface AffiliateLink {
  id: string;
  link_code: string;
  custom_slug?: string;
  campaign_name?: string;
  full_url: string;
  click_count: number;
  conversion_count: number;
  is_active: boolean;
}

class CookCamApi {
  // Authentication Methods
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.auth.login,
      {
        email,
        password,
      },
    );

    // Store auth token if login successful
    if (response.success && response.data?.access_token) {
      await apiService.setAuthToken(response.data.access_token);
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.auth.register,
      userData,
    );

    // Store auth token if registration successful
    if (response.success && response.data?.access_token) {
      await apiService.setAuthToken(response.data.access_token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await apiService.post(API_ENDPOINTS.auth.logout);
    await apiService.removeAuthToken(); // Clear local tokens regardless of response
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.get<User>(API_ENDPOINTS.auth.me);
  }

  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.put<User>(API_ENDPOINTS.auth.profile, updates);
  }

  async deleteAccount(confirmPassword: string): Promise<
    ApiResponse<{
      message: string;
      deletedAt: string;
    }>
  > {
    return apiService.delete<{
      message: string;
      deletedAt: string;
    }>(API_ENDPOINTS.auth.deleteAccount, {
      confirmPassword,
    });
  }

  // Ingredient Scanning Methods
  async scanIngredients(imageFile: any): Promise<ApiResponse<ScanResult>> {
    return apiService.uploadFile(API_ENDPOINTS.scan.detect, imageFile);
  }

  async getScanHistory(
    limit: number = 20,
    offset: number = 0,
  ): Promise<ApiResponse<ScanResult[]>> {
    return apiService.get<ScanResult[]>(
      `${API_ENDPOINTS.scan.history}?limit=${limit}&offset=${offset}`,
    );
  }

  // Recipe Methods
  async generateRecipe(
    ingredients: string[],
    preferences?: {
      cuisine?: string;
      difficulty?: string;
      time?: number;
      dietary?: string[];
    },
  ): Promise<ApiResponse<Recipe>> {
    return apiService.post<Recipe>(API_ENDPOINTS.recipes.generate, {
      ingredients,
      preferences,
    });
  }

  async saveRecipe(recipe: Partial<Recipe>): Promise<ApiResponse<Recipe>> {
    return apiService.post<Recipe>(API_ENDPOINTS.recipes.save, recipe);
  }

  async getUserRecipes(
    limit: number = 20,
    offset: number = 0,
  ): Promise<ApiResponse<Recipe[]>> {
    return apiService.get<Recipe[]>(
      `${API_ENDPOINTS.recipes.list}?limit=${limit}&offset=${offset}`,
    );
  }

  async getRecipe(recipeId: string): Promise<ApiResponse<Recipe>> {
    return apiService.get<Recipe>(API_ENDPOINTS.recipes.get(recipeId));
  }

  async deleteRecipe(recipeId: string): Promise<ApiResponse> {
    return apiService.delete(API_ENDPOINTS.recipes.delete(recipeId));
  }

  async toggleFavoriteRecipe(recipeId: string): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.recipes.favorite(recipeId));
  }

  async getRecipeNutrition(
    recipeId: string,
  ): Promise<ApiResponse<NutritionInfo>> {
    return apiService.get<NutritionInfo>(
      API_ENDPOINTS.recipes.nutrition(recipeId),
    );
  }

  // Ingredient Search Methods
  async searchIngredients(
    query: string,
    limit: number = 20,
  ): Promise<ApiResponse<any[]>> {
    return apiService.get(
      `${API_ENDPOINTS.ingredients.search}?q=${encodeURIComponent(
        query,
      )}&limit=${limit}`,
    );
  }

  async getIngredientCategories(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>(API_ENDPOINTS.ingredients.categories);
  }

  async getIngredientDetails(ingredientId: string): Promise<ApiResponse<any>> {
    return apiService.get(API_ENDPOINTS.ingredients.details(ingredientId));
  }

  // Gamification Methods
  async addXP(
    xpAmount: number,
    action: string,
    metadata?: any,
  ): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.gamification.xp, {
      xp_amount: xpAmount,
      action,
      metadata,
    });
  }

  async getGamificationProfile(): Promise<ApiResponse<GamificationProfile>> {
    return apiService.get<GamificationProfile>(
      API_ENDPOINTS.gamification.profile,
    );
  }

  async getLeaderboard(
    limit: number = 50,
  ): Promise<ApiResponse<LeaderboardEntry[]>> {
    return apiService.get<LeaderboardEntry[]>(
      `${API_ENDPOINTS.gamification.leaderboard}?limit=${limit}`,
    );
  }

  async getAchievements(): Promise<ApiResponse<Achievement[]>> {
    return apiService.get<Achievement[]>(
      API_ENDPOINTS.gamification.achievements,
    );
  }

  // Subscription Methods
  async getSubscriptionTiers(): Promise<ApiResponse<SubscriptionTier[]>> {
    return apiService.get<SubscriptionTier[]>(API_ENDPOINTS.subscription.tiers);
  }

  async getSubscriptionStatus(): Promise<ApiResponse<UserSubscription>> {
    return apiService.get<UserSubscription>(API_ENDPOINTS.subscription.status);
  }

  async createCheckoutSession(
    tierId: string,
  ): Promise<ApiResponse<{checkoutUrl: string}>> {
    return apiService.post<{checkoutUrl: string}>(
      API_ENDPOINTS.subscription.checkout,
      {
        tier_id: tierId,
      },
    );
  }

  async cancelSubscription(): Promise<ApiResponse> {
    // This will mark subscription as cancelled in our system
    // Actual cancellation happens through App Store/Google Play
    return apiService.post(API_ENDPOINTS.subscription.cancel);
  }

  async checkFeatureAccess(
    feature: string,
  ): Promise<ApiResponse<{hasAccess: boolean; usage?: any}>> {
    return apiService.get<{hasAccess: boolean; usage?: any}>(
      API_ENDPOINTS.subscription.feature(feature),
    );
  }

  // Creator Methods
  async getCreatorRevenue(): Promise<ApiResponse<CreatorRevenue>> {
    return apiService.get<CreatorRevenue>(
      API_ENDPOINTS.subscription.creator.revenue,
    );
  }

  async generateAffiliateLink(
    campaignName?: string,
    customSlug?: string,
  ): Promise<ApiResponse<AffiliateLink>> {
    return apiService.post<AffiliateLink>(
      API_ENDPOINTS.subscription.affiliate.generate,
      {
        campaign_name: campaignName,
        custom_slug: customSlug,
      },
    );
  }

  async getAffiliateLinks(): Promise<ApiResponse<AffiliateLink[]>> {
    return apiService.get<AffiliateLink[]>(
      API_ENDPOINTS.subscription.affiliate.links,
    );
  }

  async requestPayout(
    amount: number,
    method: 'stripe' | 'paypal' | 'bank_transfer' = 'stripe',
  ): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.subscription.creator.payout, {
      amount,
      method,
    });
  }

  async getCreatorAnalytics(
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<ApiResponse<any>> {
    return apiService.get(
      `${API_ENDPOINTS.subscription.creator.analytics}?period=${period}`,
    );
  }

  async tipCreator(
    recipeId: string,
    amount: number,
    message?: string,
  ): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.recipes.tip(recipeId), {
      amount,
      message,
    });
  }

  // App Store/Google Play Subscription Methods
  async validateSubscriptionPurchase(validationData: {
    platform: 'ios' | 'android';
    receipt?: string;
    purchaseToken?: string;
    transactionId?: string;
    productId?: string;
  }): Promise<ApiResponse> {
    return apiService.post(
      API_ENDPOINTS.subscription.validatePurchase,
      validationData,
    );
  }

  async refreshSubscriptionStatus(): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.subscription.refreshStatus);
  }

  // Creator upgrade method
  async upgradeToCreator(data: {
    subscriptionData?: {
      productId: string;
      transactionId: string;
      tier: 'creator';
    };
  }): Promise<ApiResponse<User>> {
    return apiService.post(API_ENDPOINTS.subscription.upgradeToCreator, data);
  }

  // Subscription Management (App Store based)
  async getSubscriptionProducts(): Promise<
    ApiResponse<{
      products: Array<{
        productId: string;
        price: string;
        localizedPrice: string;
        currency: string;
        title: string;
        description: string;
        tier: 'regular' | 'creator';
        revenue_share?: {
          referrals: number; // 30% lifetime recurring revenue for referrals
          tips: number; // 100% of tips
          collections: number; // 70% of curated recipes/collections
        };
      }>;
    }>
  > {
    return apiService.get(API_ENDPOINTS.subscription.products);
  }

  // Analytics Methods
  async trackEvent(
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<ApiResponse> {
    return apiService.post(API_ENDPOINTS.analytics.track, {
      event_type: eventName,
      event_data: properties || {},
      metadata: {
        timestamp: new Date().toISOString(),
        platform: 'mobile',
      },
    });
  }

  async getAnalyticsDashboard(
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<
    ApiResponse<{
      totalUsers: number;
      activeUsers: number;
      totalScans: number;
      totalRecipes: number;
      revenue: number;
      growthRate: number;
      engagement: {
        avgSessionDuration: number;
        avgScansPerUser: number;
        recipeConversionRate: number;
      };
      charts: {
        userGrowth: Array<{date: string; count: number}>;
        scanActivity: Array<{date: string; count: number}>;
        revenueGrowth: Array<{date: string; amount: number}>;
      };
    }>
  > {
    return apiService.get(
      `${API_ENDPOINTS.analytics.dashboard}?period=${period}`,
    );
  }

  // Utility Methods
  async healthCheck(): Promise<boolean> {
    return apiService.healthCheck();
  }

  // Helper method to test API connectivity
  async testConnection(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.healthCheck();
      const latency = Date.now() - startTime;

      return {
        connected: isHealthy,
        latency: isHealthy ? latency : undefined,
        error: isHealthy ? undefined : 'Health check failed',
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message || 'Connection failed',
      };
    }
  }
}

// Export singleton instance
export const cookCamApi = new CookCamApi();
export default cookCamApi;

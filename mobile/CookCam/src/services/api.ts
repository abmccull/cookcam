// API service for CookCam backend integration
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/env';

// Use configuration for API URL
const API_URL = config().API_BASE_URL;

// Configuration
const TOKEN_KEY = '@cookcam_token';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  user?: any;
  session?: {
    access_token: string;
    refresh_token?: string;
  };
  message?: string;
}

// API Client with authentication
class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(`${API_URL}/api/v1`);
    }
    return ApiClient.instance;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Set longer timeout for recipe generation endpoints
      const isRecipeGeneration = endpoint.includes('/recipes/generate');
      const timeoutMs = isRecipeGeneration ? 150000 : 30000; // 2.5 minutes for recipe generation, 30s for others

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      
      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Recipe generation may take longer than usual.',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.makeRequest('/health');
  }

  // Authentication endpoints - Updated to match our backend
  async signUp(email: string, password: string, name: string): Promise<ApiResponse<AuthResponse>> {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async signIn(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.makeRequest<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token if login successful
    if (response.success && response.data?.session?.access_token) {
      await AsyncStorage.setItem(TOKEN_KEY, response.data.session.access_token);
    }

    return response;
  }

  async signOut(): Promise<ApiResponse<any>> {
    const response = await this.makeRequest('/auth/signout', {
      method: 'POST',
    });

    // Clear stored token
    await AsyncStorage.removeItem(TOKEN_KEY);
    
    return response;
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest('/auth/me');
  }

  async updateProfile(data: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Recipe endpoints - Updated paths
  async generateRecipeSuggestions(data: {
    detectedIngredients: string[];
    dietaryTags?: string[];
    cuisinePreferences?: string[];
    timeAvailable?: string;
    skillLevel?: string;
    servingSize?: number;
    mealPrepEnabled?: boolean;
    mealPrepPortions?: number;
    selectedAppliances?: string[];
  }): Promise<ApiResponse<any>> {
    return this.makeRequest('/recipes/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateFullRecipe(selectedTitle: string, sessionId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/recipes/generate-full', {
      method: 'POST',
      body: JSON.stringify({ selectedTitle, sessionId }),
    });
  }

  async getRecipes(params?: {
    search?: string;
    tags?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/recipes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async getRecipe(recipeId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}`);
  }

  async saveRecipe(recipeId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/save`, {
      method: 'POST',
    });
  }

  async getSavedRecipes(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/recipes/saved/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async unsaveRecipe(recipeId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/save`, {
      method: 'DELETE',
    });
  }

  async rateRecipe(recipeId: string, rating: number, review?: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review }),
    });
  }

  // Recipe nutrition endpoints
  async getRecipeNutrition(recipeId: string, servings?: number): Promise<ApiResponse<any>> {
    const params = servings ? `?servings=${servings}` : '';
    return this.makeRequest(`/recipes/${recipeId}/nutrition${params}`);
  }

  async saveRecipeNutrition(recipeId: string, servings?: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/save-nutrition`, {
      method: 'POST',
      body: JSON.stringify({ servings: servings || 1 }),
    });
  }

  async testNutritionAnalysis(): Promise<ApiResponse<any>> {
    return this.makeRequest('/recipes/test-nutrition', {
      method: 'POST',
    });
  }

  // Recipe completion photo endpoints
  async uploadCompletionPhoto(recipeId: string, imageData: string, description?: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/upload-completion-photo`, {
      method: 'POST',
      body: JSON.stringify({ imageData, description }),
    });
  }

  async getCompletionPhotos(recipeId: string, limit = 20, offset = 0): Promise<ApiResponse<any>> {
    return this.makeRequest(`/recipes/${recipeId}/completion-photos?limit=${limit}&offset=${offset}`);
  }

  // Gamification endpoints
  async addXP(xpAmount: number, action: string, metadata?: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/gamification/add-xp', {
      method: 'POST',
      body: JSON.stringify({ xp_amount: xpAmount, action, metadata }),
    });
  }

  async checkStreak(): Promise<ApiResponse<any>> {
    return this.makeRequest('/gamification/check-streak', {
      method: 'POST',
    });
  }

  async getProgress(): Promise<ApiResponse<any>> {
    return this.makeRequest('/gamification/progress');
  }

  async getLeaderboard(type = 'global', period = 'weekly'): Promise<ApiResponse<any>> {
    return this.makeRequest(`/gamification/leaderboard?type=${type}&period=${period}`);
  }

  // Mystery box endpoint
  async openMysteryBox(): Promise<ApiResponse<any>> {
    return this.makeRequest('/mystery-box/open', {
      method: 'POST',
    });
  }

  async getMysteryBoxHistory(): Promise<ApiResponse<any>> {
    return this.makeRequest('/mystery-box/history');
  }

  // User endpoints
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest('/users/profile');
  }

  async updateUserProfile(data: any): Promise<ApiResponse<any>> {
    return this.makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async followUser(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/users/follow/${userId}`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/users/follow/${userId}`, {
      method: 'DELETE',
    });
  }

  async getFollowers(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/users/${userId}/followers`);
  }

  async getFollowing(userId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/users/${userId}/following`);
  }

  // Scanning endpoints
  async analyzeScan(imageData: any, detectedIngredients: string[]): Promise<ApiResponse<any>> {
    return this.makeRequest('/scan/analyze', {
      method: 'POST',
      body: JSON.stringify({ 
        image_data: imageData,
        detected_ingredients: detectedIngredients 
      }),
    });
  }

  async getScanHistory(limit = 20): Promise<ApiResponse<any>> {
    return this.makeRequest(`/scan/history?limit=${limit}`);
  }

  async getScan(scanId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/scan/${scanId}`);
  }

  // Ingredients endpoints (USDA integration) - Updated paths
  async searchIngredients(query: string, limit = 20): Promise<ApiResponse<any>> {
    return this.makeRequest(`/ingredients/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getIngredients(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    has_nutrition?: boolean;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/ingredients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async getIngredient(id: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/ingredients/${id}`);
  }

  async getIngredientNutrition(id: string, servingSize = 100, unit = 'g'): Promise<ApiResponse<any>> {
    return this.makeRequest(`/ingredients/${id}/nutrition?serving_size=${servingSize}&unit=${unit}`);
  }

  async syncIngredientWithUSDA(ingredientName: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/ingredients/sync-usda', {
      method: 'POST',
      body: JSON.stringify({ ingredientName }),
    });
  }

  async batchSyncIngredientsWithUSDA(ingredientNames: string[]): Promise<ApiResponse<any>> {
    return this.makeRequest('/ingredients/batch-sync-usda', {
      method: 'POST',
      body: JSON.stringify({ ingredientNames }),
    });
  }

  async searchUSDADirect(query: string, dataType = 'Foundation', pageSize = 25): Promise<ApiResponse<any>> {
    return this.makeRequest(`/ingredients/usda/search?query=${encodeURIComponent(query)}&dataType=${dataType}&pageSize=${pageSize}`);
  }

  async getIngredientCategories(): Promise<ApiResponse<any>> {
    return this.makeRequest('/ingredients/meta/categories');
  }

  async getIngredientSuggestions(query: string, limit = 10): Promise<ApiResponse<any>> {
    return this.makeRequest(`/ingredients/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async batchSearchIngredients(queries: string[]): Promise<ApiResponse<any>> {
    return this.makeRequest('/ingredients/batch-search', {
      method: 'POST',
      body: JSON.stringify({ queries }),
    });
  }
}

// Create and export the API client instance
export const apiClient = ApiClient.getInstance();

// Helper functions for common operations
export const authService = {
  signUp: apiClient.signUp.bind(apiClient),
  signIn: apiClient.signIn.bind(apiClient),
  signOut: apiClient.signOut.bind(apiClient),
  getProfile: apiClient.getProfile.bind(apiClient),
  updateProfile: apiClient.updateProfile.bind(apiClient),
};

export const recipeService = {
  generateSuggestions: apiClient.generateRecipeSuggestions.bind(apiClient),
  generateFullRecipe: apiClient.generateFullRecipe.bind(apiClient),
  getRecipes: apiClient.getRecipes.bind(apiClient),
  getRecipe: apiClient.getRecipe.bind(apiClient),
  saveRecipe: apiClient.saveRecipe.bind(apiClient),
  rateRecipe: apiClient.rateRecipe.bind(apiClient),
  getRecipeNutrition: apiClient.getRecipeNutrition.bind(apiClient),
  saveRecipeNutrition: apiClient.saveRecipeNutrition.bind(apiClient),
  testNutritionAnalysis: apiClient.testNutritionAnalysis.bind(apiClient),
  uploadCompletionPhoto: apiClient.uploadCompletionPhoto.bind(apiClient),
  getCompletionPhotos: apiClient.getCompletionPhotos.bind(apiClient),
};

export const gamificationService = {
  addXP: apiClient.addXP.bind(apiClient),
  checkStreak: apiClient.checkStreak.bind(apiClient),
  getProgress: apiClient.getProgress.bind(apiClient),
  getLeaderboard: apiClient.getLeaderboard.bind(apiClient),
  openMysteryBox: apiClient.openMysteryBox.bind(apiClient),
  getMysteryBoxHistory: apiClient.getMysteryBoxHistory.bind(apiClient),
};

export const userService = {
  getUserProfile: apiClient.getUserProfile.bind(apiClient),
  updateUserProfile: apiClient.updateUserProfile.bind(apiClient),
  followUser: apiClient.followUser.bind(apiClient),
  unfollowUser: apiClient.unfollowUser.bind(apiClient),
  getFollowers: apiClient.getFollowers.bind(apiClient),
  getFollowing: apiClient.getFollowing.bind(apiClient),
};

export const scanService = {
  analyzeScan: apiClient.analyzeScan.bind(apiClient),
  getScanHistory: apiClient.getScanHistory.bind(apiClient),
  getScan: apiClient.getScan.bind(apiClient),
};

export const ingredientService = {
  searchIngredients: apiClient.searchIngredients.bind(apiClient),
  getIngredients: apiClient.getIngredients.bind(apiClient),
  getIngredient: apiClient.getIngredient.bind(apiClient),
  getIngredientNutrition: apiClient.getIngredientNutrition.bind(apiClient),
  syncIngredientWithUSDA: apiClient.syncIngredientWithUSDA.bind(apiClient),
  batchSyncIngredientsWithUSDA: apiClient.batchSyncIngredientsWithUSDA.bind(apiClient),
  searchUSDADirect: apiClient.searchUSDADirect.bind(apiClient),
  getIngredientCategories: apiClient.getIngredientCategories.bind(apiClient),
  getIngredientSuggestions: apiClient.getIngredientSuggestions.bind(apiClient),
  batchSearchIngredients: apiClient.batchSearchIngredients.bind(apiClient),
};

export default apiClient; 
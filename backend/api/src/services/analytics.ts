import { supabase } from '../index';

interface AnalyticsEvent {
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  session_id?: string;
  device_info?: Record<string, unknown>;
  timestamp: string;
}

interface RecipeAnalytics {
  recipe_id: string;
  views: number;
  likes: number;
  saves: number;
  completion_photos: number;
  avg_rating: number;
  engagement_score: number;
}

interface UserAnalytics {
  user_id: string;
  total_scans: number;
  recipes_generated: number;
  recipes_completed: number;
  active_days: number;
  avg_session_length: number;
  favorite_cuisine: string | null;
  most_scanned_ingredient: string | null;
}

export class AnalyticsService {
  // Track event
  async trackEvent(
    userId: string, 
    eventType: string, 
    eventData: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('analytics_events')
        .insert(event);
      
      if (error) {
        console.error('Track event error:', error);
        // Don't throw - analytics shouldn't break app flow
      }
    } catch (error: unknown) {
      console.error('Analytics tracking error:', error);
    }
  }
  
  // Track recipe view
  async trackRecipeView(recipeId: string, userId: string): Promise<void> {
    await this.trackEvent(userId, 'recipe_viewed', { recipe_id: recipeId });
    
    // Increment view counter
    await supabase.rpc('increment_recipe_views', { p_recipe_id: recipeId });
  }
  
  // Track scan
  async trackScan(userId: string, ingredientsCount: number, scanId: string): Promise<void> {
    await this.trackEvent(userId, 'ingredients_scanned', {
      scan_id: scanId,
      ingredients_count: ingredientsCount
    });
  }
  
  // Track recipe generation
  async trackRecipeGeneration(userId: string, recipeId: string, ingredients: string[]): Promise<void> {
    await this.trackEvent(userId, 'recipe_generated', {
      recipe_id: recipeId,
      ingredients: ingredients
    });
  }
  
  // Get popular recipes
  async getPopularRecipes(timeframe: 'day' | 'week' | 'month' = 'week', limit = 10): Promise<RecipeAnalytics[]> {
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      // Get recipe metrics
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          id,
          title,
          view_count,
          rating_avg,
          rating_count,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .order('view_count', { ascending: false })
        .limit(limit);
      
      if (error) {throw error;}
      
      // Calculate engagement scores
      const analyticsData = (recipes || []).map(recipe => {
        const engagement_score = 
          (recipe.view_count * 1) + 
          (recipe.rating_count * 5) + 
          (recipe.rating_avg * 10);
        
        return {
          recipe_id: recipe.id,
          views: recipe.view_count,
          likes: recipe.rating_count,
          saves: 0, // Would need to query saved_recipes table
          completion_photos: 0, // Would need to query completion photos
          avg_rating: recipe.rating_avg,
          engagement_score
        };
      });
      
      // Sort by engagement score
      return analyticsData.sort((a, b) => b.engagement_score - a.engagement_score);
    } catch (error: unknown) {
      console.error('Get popular recipes error:', error);
      throw error;
    }
  }
  
  // Get user analytics
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      // Get scan count
      const { count: scanCount } = await supabase
        .from('ingredient_scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // Get recipes generated
      const { count: recipesGenerated } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('is_generated', true);
      
      // Get active days (from analytics events)
      const { data: activeDays } = await supabase
        .from('analytics_events')
        .select('timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      
      const uniqueDays = new Set(
        (activeDays || []).map(event => 
          new Date(event.timestamp).toDateString()
        )
      );
      
      // Get most scanned ingredient
      const { data: scans } = await supabase
        .from('ingredient_scans')
        .select('detected_ingredients')
        .eq('user_id', userId);
      
      const ingredientCounts: Record<string, number> = {};
      (scans || []).forEach(scan => {
        (scan.detected_ingredients || []).forEach((ing: Record<string, unknown>) => {
          if (ing && typeof ing === 'object' && 'name' in ing && typeof ing.name === 'string') {
            const name = ing.name.toLowerCase() || '';
            if (name) {
              ingredientCounts[name] = (ingredientCounts[name] || 0) + 1;
            }
          }
        });
      });
      
      const mostScanned = Object.entries(ingredientCounts)
        .sort(([, a], [, b]) => b - a)[0];
      
      return {
        user_id: userId,
        total_scans: scanCount || 0,
        recipes_generated: recipesGenerated || 0,
        recipes_completed: 0, // Would need completion photo data
        active_days: uniqueDays.size,
        avg_session_length: 0, // Would need session tracking
        favorite_cuisine: null, // Would need to analyze recipe preferences
        most_scanned_ingredient: mostScanned?.[0] || null
      };
    } catch (error: unknown) {
      console.error('Get user analytics error:', error);
      throw error;
    }
  }
  
  // Get trending ingredients
  async getTrendingIngredients(limit = 10): Promise<Array<{ name: string; count: number }>> {
    try {
      // Get recent scans
      const { data: recentScans } = await supabase
        .from('ingredient_scans')
        .select('detected_ingredients')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);
      
      // Count ingredients
      const ingredientCounts: Record<string, number> = {};
      (recentScans || []).forEach(scan => {
        (scan.detected_ingredients || []).forEach((ing: Record<string, unknown>) => {
          if (ing && typeof ing === 'object' && 'name' in ing && typeof ing.name === 'string') {
            const name = ing.name.toLowerCase() || '';
            if (name) {
              ingredientCounts[name] = (ingredientCounts[name] || 0) + 1;
            }
          }
        });
      });
      
      // Sort and return top ingredients
      return Object.entries(ingredientCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
    } catch (error: unknown) {
      console.error('Get trending ingredients error:', error);
      throw error;
    }
  }
  
  // Get app-wide statistics
  async getAppStatistics(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() - 7);
      
      // Get various counts
      const [
        totalUsers,
        activeUsersToday,
        activeUsersWeek,
        totalScans,
        totalRecipes,
        totalPhotos
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('analytics_events')
          .select('user_id', { count: 'exact', head: true })
          .gte('timestamp', today.toISOString()),
        supabase.from('analytics_events')
          .select('user_id', { count: 'exact', head: true })
          .gte('timestamp', thisWeek.toISOString()),
        supabase.from('ingredient_scans').select('*', { count: 'exact', head: true }),
        supabase.from('recipes').select('*', { count: 'exact', head: true }),
        supabase.from('recipe_completion_photos').select('*', { count: 'exact', head: true })
      ]);
      
      return {
        users: {
          total: totalUsers.count || 0,
          active_today: activeUsersToday.count || 0,
          active_week: activeUsersWeek.count || 0
        },
        content: {
          total_scans: totalScans.count || 0,
          total_recipes: totalRecipes.count || 0,
          total_photos: totalPhotos.count || 0
        },
        timestamp: now.toISOString()
      };
    } catch (error: unknown) {
      console.error('Get app statistics error:', error);
      throw error;
    }
  }

  // Track ingredient scan patterns
  async trackIngredientScanPatterns(userId: string, scanId: string): Promise<void> {
    try {
      const { data: scan } = await supabase
        .from('ingredient_scans')
        .select('detected_ingredients')
        .eq('id', scanId)
        .single();

      if (scan?.detected_ingredients) {
        const ingredientNames: string[] = [];
        
        (scan.detected_ingredients as Record<string, unknown>[]).forEach((ing) => {
          if (ing && typeof ing === 'object' && 'name' in ing && typeof ing.name === 'string') {
            const name = ing.name?.toLowerCase() || '';
            if (name) {
              ingredientNames.push(name);
            }
          }
        });

        if (ingredientNames.length > 0) {
          await this.trackEvent(userId, 'ingredient_patterns', {
            ingredients: ingredientNames,
            count: ingredientNames.length,
            scan_id: scanId
          });
        }
      }
    } catch (error: unknown) {
      console.log('Track ingredient scan patterns error:', error);
    }
  }

  // Track recipe generation patterns  
  async trackRecipeGenerationPatterns(userId: string, sessionId?: string): Promise<void> {
    try {
      if (!sessionId) {return;}

      const { data: session } = await supabase
        .from('recipe_sessions')
        .select('input_data')
        .eq('id', sessionId)
        .single();

      if (session?.input_data?.detectedIngredients) {
        const ingredientNames: string[] = [];
        
        (session.input_data.detectedIngredients as Record<string, unknown>[]).forEach((ing) => {
          if (ing && typeof ing === 'object' && 'name' in ing && typeof ing.name === 'string') {
            const name = ing.name?.toLowerCase() || '';
            if (name) {
              ingredientNames.push(name);
            }
          }
        });

        if (ingredientNames.length > 0) {
          await this.trackEvent(userId, 'recipe_generation_patterns', {
            ingredients: ingredientNames,
            count: ingredientNames.length,
            session_id: sessionId
          });
        }
      }
    } catch (error: unknown) {
      console.log('Track recipe generation patterns error:', error);
    }
  }
}

export const analyticsService = new AnalyticsService(); 
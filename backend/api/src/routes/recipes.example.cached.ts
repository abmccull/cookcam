// Example of how to implement caching in the recipes route
import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { CacheService, cacheService, CacheNamespaces, CacheTTL } from '../services/cache';
import { supabase } from '../index';
import { logger } from '../utils/logger';

const router = Router();

// Get recipe suggestions with caching
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { ingredients, dietaryPreferences, cuisineType } = req.body;
    
    // Generate cache key based on request parameters
    const cacheKey = `suggestions:${JSON.stringify({ ingredients, dietaryPreferences, cuisineType })}`;
    
    // Try to get from cache
    const cachedSuggestions = await cacheService.get(cacheKey, CacheNamespaces.RECIPES);
    
    if (cachedSuggestions) {
      logger.info('Recipe suggestions served from cache');
      return res.json({
        success: true,
        data: cachedSuggestions,
        cached: true
      });
    }
    
    // If not in cache, generate new suggestions
    const suggestions = await generateRecipeSuggestions({ ingredients, dietaryPreferences, cuisineType });
    
    // Cache the results
    await cacheService.set(cacheKey, suggestions, {
      namespace: CacheNamespaces.RECIPES,
      ttl: CacheTTL.MEDIUM // 30 minutes
    });
    
    res.json({
      success: true,
      data: suggestions,
      cached: false
    });
  } catch (error) {
    logger.error('Error generating recipes:', error);
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

// Get popular recipes with caching
router.get('/popular', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Use cache wrapper for the database query
    const getPopularRecipes = cacheService.wrap(
      async (page: number, limit: number) => {
        const { data, error } = await supabase
          .from('recipes')
          .select('*, creator:users!creator_id(name, avatar_url)')
          .order('views_count', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
          
        if (error) {
          throw error;
        }
        return data;
      },
      (page, limit) => `popular:${page}:${limit}`, // Key generator
      { namespace: CacheNamespaces.RECIPES, ttl: CacheTTL.SHORT } // 5 minutes
    );
    
    const recipes = await getPopularRecipes(page, limit);
    
    res.json({
      success: true,
      data: recipes,
      page,
      limit
    });
  } catch (error) {
    logger.error('Error fetching popular recipes:', error);
    res.status(500).json({ error: 'Failed to fetch popular recipes' });
  }
});

// Get recipe by ID with caching using decorator pattern
class RecipeService {
  @CacheService.cacheable('recipe-details', CacheTTL.LONG)
  async getRecipeById(recipeId: string) {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        creator:users!creator_id(name, avatar_url),
        ingredients:recipe_ingredients(*),
        steps:recipe_steps(*)
      `)
      .eq('id', recipeId)
      .single();
      
    if (error) {
      throw error;
    }
    return data;
  }
}

const recipeService = new RecipeService();

router.get('/:id', async (req, res) => {
  try {
    const recipe = await recipeService.getRecipeById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    logger.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Clear cache when recipe is updated
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Update recipe in database
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    // Invalidate related caches
    await cacheService.del(`recipe-details:[\"${id}\"]`);
    await cacheService.invalidate(`${CacheNamespaces.RECIPES}:popular:*`);
    await cacheService.invalidate(`${CacheNamespaces.RECIPES}:suggestions:*`);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Get cache statistics (admin only)
router.get('/admin/cache-stats', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    // Check if user is admin (you'd implement this check properly)
    if (req.user?.email !== 'admin@cookcam.ai') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Placeholder function - would be imported from OpenAI service
async function generateRecipeSuggestions(params: any) {
  // Implementation would go here
  return [];
}

export default router;
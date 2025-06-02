import { Router } from 'express';
import { supabase } from '../index';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = Router();

// USDA API configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = process.env.USDA_API_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';

// Helper function to search USDA foods
async function searchUSDAFoods(query: string, limit: number = 5) {
  try {
    const response = await axios.get(`${USDA_BASE_URL}/foods/search`, {
      params: {
        query,
        pageSize: limit,
        api_key: USDA_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    logger.error('USDA search error:', error);
    throw error;
  }
}

// Helper function to get USDA food details
async function getUSDAFoodDetails(fdcId: number) {
  try {
    const response = await axios.get(`${USDA_BASE_URL}/food/${fdcId}`, {
      params: {
        api_key: USDA_API_KEY
      }
    });
    return response.data;
  } catch (error) {
    logger.error('USDA food details error:', error);
    throw error;
  }
}

// Helper function to extract nutrition data
function extractNutritionalData(food: any) {
  if (!food.foodNutrients) {return {};}

  const nutrition: any = {};
  
  food.foodNutrients.forEach((nutrient: any) => {
    const nutrientId = nutrient.nutrient.id;
    const amount = nutrient.amount;

    switch (nutrientId) {
      case 1008: // Energy (calories) - was 208
        nutrition.calories_per_100g = amount;
        break;
      case 1003: // Protein - was 203
        nutrition.protein_g_per_100g = amount;
        break;
      case 1005: // Carbohydrates - was 205
        nutrition.carbs_g_per_100g = amount;
        break;
      case 1004: // Total fat - was 204
        nutrition.fat_g_per_100g = amount;
        break;
      case 1079: // Fiber - was 291
        nutrition.fiber_g_per_100g = amount;
        break;
      case 1063: // Sugars - was 269
        nutrition.sugar_g_per_100g = amount;
        break;
      case 1093: // Sodium - was 307
        nutrition.sodium_mg_per_100g = amount;
        break;
      case 1087: // Calcium - was 301
        nutrition.calcium_mg_per_100g = amount;
        break;
      case 1089: // Iron - was 303
        nutrition.iron_mg_per_100g = amount;
        break;
      case 1162: // Vitamin C - was 401
        nutrition.vitamin_c_mg_per_100g = amount;
        break;
    }
  });

  return nutrition;
}

// GET /api/ingredients/search - Search ingredients
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Search local ingredients
    const { data: results, error } = await supabase
      .from('ingredients')
      .select('*')
      .or(`name.ilike.%${query}%,searchable_text.ilike.%${query}%`)
      .limit(parseInt(limit as string));

    if (error) {
      logger.error('Database search error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search ingredients'
      });
    }

    res.json({
      success: true,
      data: {
        source: 'local',
        results: results || [],
        total: results?.length || 0
      }
    });

  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search ingredients'
    });
  }
});

// GET /api/ingredients/usda/search - Direct USDA search
router.get('/usda/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const results = await searchUSDAFoods(query, parseInt(limit as string));
    
    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('USDA search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search USDA database'
    });
  }
});

// POST /api/ingredients/:id/sync-usda - Sync ingredient with USDA data
router.post('/:id/sync-usda', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`🔄 Starting USDA sync for ingredient ID: ${id}`);

    // Get the ingredient
    const { data: ingredient, error: getError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      logger.error('❌ Fetch error:', getError);
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }

    logger.info(`📝 Found ingredient: ${ingredient.name}`);

    // Search USDA for this ingredient
    const usdaResults = await searchUSDAFoods(ingredient.name, 10); // Get more results
    logger.info(`🔍 USDA search results: ${usdaResults.foods?.length || 0} found`);
    
    if (!usdaResults.foods || usdaResults.foods.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No USDA data found for this ingredient'
      });
    }

    // Find the best match (prefer Survey/Foundation data over Branded)
    const bestMatch = usdaResults.foods.find((food: any) => 
      food.dataType === 'Survey (FNDDS)' || food.dataType === 'Foundation'
    ) || usdaResults.foods[0]; // Fall back to first result if no Survey/Foundation data
    
    logger.info(`🎯 Best match: ${bestMatch.description} (FDC ID: ${bestMatch.fdcId}, Type: ${bestMatch.dataType})`);
    
    const foodDetails = await getUSDAFoodDetails(bestMatch.fdcId);
    logger.info(`📊 Food details received, nutrients: ${foodDetails.foodNutrients?.length || 0}`);
    
    // Update the ingredient with USDA data
    const updateData = {
      fdc_id: bestMatch.fdcId,
      usda_sync_date: new Date().toISOString()
    };
    logger.info('📤 Update data (simplified):', updateData);

    const { error: updateError } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      logger.error('❌ Update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update ingredient',
        details: updateError.message
      });
    }

    // Now try to update with nutrition data separately
    const nutritionData = extractNutritionalData(foodDetails);
    logger.info('🥗 Extracted nutrition data:', nutritionData);

    if (Object.keys(nutritionData).length > 0) {
      const { error: nutritionError } = await supabase
        .from('ingredients')
        .update(nutritionData)
        .eq('id', id);

      if (nutritionError) {
        logger.error('❌ Nutrition update error:', nutritionError);
      } else {
        logger.info('✅ Nutrition data updated successfully');
      }
    }

    // Fetch the updated ingredient to return
    const { data: finalIngredient, error: finalFetchError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (finalFetchError) {
      logger.error('❌ Fetch updated ingredient error:', finalFetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch updated ingredient'
      });
    }

    logger.info('✅ Ingredient updated successfully');

    res.json({
      success: true,
      data: {
        ingredient: finalIngredient,
        usda_match: {
          fdcId: bestMatch.fdcId,
          description: bestMatch.description,
          dataType: bestMatch.dataType
        },
        nutrition: nutritionData
      }
    });

  } catch (error) {
    logger.error('❌ USDA sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with USDA data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ingredients - Get all ingredients (paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabase
      .from('ingredients')
      .select('*', { count: 'exact' })
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query
      .range(offset, offset + parseInt(limit as string) - 1);

    if (error) {
      logger.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch ingredients'
      });
    }

    res.json({
      success: true,
      data: {
        ingredients: data || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Fetch ingredients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients'
    });
  }
});

// GET /api/ingredients/:id - Get specific ingredient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Ingredient not found'
        });
      }
      logger.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch ingredient'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    logger.error('Fetch ingredient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient'
    });
  }
});

export default router; 
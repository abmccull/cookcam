import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../index';
import { generateRecipeSuggestions, generateFullRecipe, RecipeInput } from '../services/openai';
import { logger } from '../utils/logger';
import enhancedRecipeService from '../services/enhancedRecipeGeneration';

const router = Router();

// Interfaces for better type safety
interface RecipeIngredient {
  ingredient: {
    name: string;
    calories_per_100g?: number;
    protein_g_per_100g?: number;
    carbs_g_per_100g?: number;
    fat_g_per_100g?: number;
    fiber_g_per_100g?: number;
    sodium_mg_per_100g?: number;
  };
  quantity: number;
  unit: string;
}

interface IngredientNutrition {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
}

interface NutritionCalculation {
  totals: NutritionTotals;
  breakdown: IngredientNutrition[];
}

// Generate recipe suggestions from ingredients (Stage 1)
router.post('/suggestions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { 
      detectedIngredients, 
      dietaryTags, 
      cuisinePreferences, 
      timeAvailable, 
      skillLevel 
    } = req.body;

    if (!detectedIngredients || !Array.isArray(detectedIngredients) || detectedIngredients.length === 0) {
      return res.status(400).json({ error: 'Detected ingredients array is required' });
    }

    // Prepare input for Chef Camillo
    const recipeInput: RecipeInput = {
      detectedIngredients,
      assumedStaples: ['salt', 'black pepper', 'olive oil', 'water'],
      dietaryTags: dietaryTags || ['NONE'],
      cuisinePreferences: cuisinePreferences || ['SURPRISE_ME'],
      timeAvailable: timeAvailable || 'FLEXIBLE',
      skillLevel: skillLevel || 'SURPRISE_ME'
    };

    // Generate recipe suggestions using OpenAI
    const suggestions = await generateRecipeSuggestions(recipeInput);

    // Store the input for potential full recipe generation
    const { data: sessionData, error: sessionError } = await supabase
      .from('recipe_sessions')
      .insert([{
        user_id: userId,
        input_data: recipeInput,
        suggestions: suggestions,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (sessionError) {
      logger.error('Session storage error', { error: sessionError.message });
      // Continue without storing session - not critical
    }

    // Award XP for generating suggestions
    await supabase.rpc('add_user_xp', {
      p_user_id: userId,
      p_xp_amount: 20,
      p_action: 'recipe_suggestions_generated',
      p_metadata: { 
        session_id: sessionData?.id,
        ingredients_count: detectedIngredients.length,
        suggestions_count: suggestions.length 
      }
    });

    res.json({
      session_id: sessionData?.id,
      suggestions,
      xp_awarded: 20,
      message: 'Recipe suggestions generated successfully'
    });
  } catch (error) {
    logger.error('Generate suggestions error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Failed to generate recipe suggestions' });
  }
});

// Generate full recipe from selected suggestion (Stage 2)
router.post('/generate-full', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { selectedTitle, sessionId } = req.body;

    if (!selectedTitle) {
      return res.status(400).json({ error: 'Selected recipe title is required' });
    }

    // Get the original input from the session
    let originalInput: RecipeInput;
    
    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('recipe_sessions')
        .select('input_data')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'Recipe session not found' });
      }
      
      originalInput = session.input_data;
    } else {
      // Fallback if no session ID provided
      originalInput = req.body.originalInput;
      if (!originalInput) {
        return res.status(400).json({ error: 'Either sessionId or originalInput is required' });
      }
    }

    // Generate full recipe using OpenAI
    const fullRecipe = await generateFullRecipe(selectedTitle, originalInput);

    // Store the generated recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert([{
        title: fullRecipe.title,
        description: `A ${fullRecipe.cuisine} dish featuring ${originalInput.detectedIngredients.join(', ')}`,
        prep_time: Math.floor(fullRecipe.totalTimeMinutes * 0.3), // Estimate 30% prep time
        cook_time: Math.ceil(fullRecipe.totalTimeMinutes * 0.7),  // Estimate 70% cook time
        difficulty: fullRecipe.difficulty.toLowerCase(),
        servings: fullRecipe.servings,
        ingredients: fullRecipe.ingredients,
        instructions: fullRecipe.steps.map(step => step.instruction),
        nutrition: {
          calories: fullRecipe.caloriesPerServing,
          protein: fullRecipe.macros.protein_g,
          carbs: fullRecipe.macros.carbs_g,
          fat: fullRecipe.macros.fat_g
        },
        tags: originalInput.cuisinePreferences?.filter(c => c !== 'SURPRISE_ME') || [fullRecipe.cuisine],
        created_by: userId,
        is_generated: true,
        cuisine: fullRecipe.cuisine,
        ai_metadata: {
          chef_camillo_version: '1.0',
          session_id: sessionId,
          original_ingredients: originalInput.detectedIngredients,
          social_caption: fullRecipe.socialCaption,
          finishing_tip: fullRecipe.finishingTip,
          techniques: fullRecipe.steps.filter(s => s.technique).map(s => s.technique),
          pro_tips: fullRecipe.steps.filter(s => s.proTip).map(s => s.proTip)
        }
      }])
      .select()
      .single();

    if (recipeError) {
      logger.error('Recipe storage error', { error: recipeError.message });
      return res.status(500).json({ error: 'Failed to store recipe' });
    }

    if (!recipe) {
      return res.status(500).json({ error: 'Failed to create recipe record' });
    }

    // Award XP for generating full recipe
    await supabase.rpc('add_user_xp', {
      p_user_id: userId,
      p_xp_amount: 100,
      p_action: 'full_recipe_generated',
      p_metadata: { 
        recipe_id: recipe.id,
        session_id: sessionId,
        selected_title: selectedTitle
      }
    });

    res.json({
      recipe_id: recipe.id,
      full_recipe: fullRecipe,
      stored_recipe: recipe,
      xp_awarded: 100,
      message: 'Full recipe generated successfully'
    });
  } catch (error) {
    logger.error('Generate full recipe error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ error: 'Failed to generate full recipe' });
  }
});

// Generate recipe with enhanced personalization
router.post('/generate', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { ingredients, detectedIngredients, preferences, recipeType, nutritionGoals, context } = req.body;
    
    // Handle both 'ingredients' and 'detectedIngredients' field names for compatibility
    const ingredientsList = ingredients || detectedIngredients;
    
    logger.info('🍳 Enhanced recipe generation request', {
      userId: userId,
      ingredients: ingredientsList?.length,
      hasPreferences: !!preferences,
      recipeType,
      requestBody: req.body
    });

    if (!ingredientsList || !Array.isArray(ingredientsList) || ingredientsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients list is required (as "ingredients" or "detectedIngredients")'
      });
    }

    // Use enhanced recipe generation service
    const recipe = await enhancedRecipeService.generateRecipe({
      ingredients: ingredientsList,
      userPreferences: preferences,
      recipeType,
      nutritionGoals,
      context
    });

    // Award XP for recipe generation
    if (userId) {
      try {
        await supabase
          .from('gamification_events')
          .insert({
            user_id: userId,
            action_type: 'recipe_generated',
            xp_earned: 25,
            metadata: { 
              recipe_title: recipe.title,
              ingredients_count: ingredientsList?.length || 0,
              difficulty: recipe.metadata.difficulty
            }
          });
      } catch (xpError) {
        logger.error('❌ Failed to award XP for recipe generation', { xpError });
        // Don't fail the request if XP tracking fails
      }
    }

    res.json({
      success: true,
      data: recipe,
      message: 'Enhanced recipe generated successfully'
    });

  } catch (error) {
    logger.error('❌ Enhanced recipe generation failed', { 
      error,
      userId: (req as any).user?.id,
      ingredients: req.body.ingredients || req.body.detectedIngredients
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate enhanced recipe'
    });
  }
});

// Generate recipe variations
router.post('/:recipeId/variations', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { recipeId } = req.params;
    const { count = 3 } = req.body;

    // First, get the original recipe
    const { data: originalRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('created_by', userId)
      .single();

    if (fetchError || !originalRecipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Generate variations using the enhanced service
    const variations = await enhancedRecipeService.generateRecipeVariations(
      originalRecipe as any, // Cast to GeneratedRecipe interface
      Math.min(count, 5) // Limit to max 5 variations
    );

    res.json({
      success: true,
      data: {
        original: originalRecipe,
        variations
      },
      message: `Generated ${variations.length} recipe variations`
    });

  } catch (error) {
    logger.error('❌ Recipe variation generation failed', { 
      error,
      recipeId: req.params.recipeId,
      userId: (req as any).user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate recipe variations'
    });
  }
});

// Test endpoint for recipe suggestions (no auth required)
router.post('/test-suggestions', async (req: Request, res: Response) => {
  try {
    const { 
      detectedIngredients, 
      dietaryTags, 
      cuisinePreferences, 
      timeAvailable, 
      skillLevel 
    } = req.body;

    if (!detectedIngredients || !Array.isArray(detectedIngredients) || detectedIngredients.length === 0) {
      return res.status(400).json({ error: 'Detected ingredients array is required' });
    }

    // Prepare input for Chef Camillo
    const recipeInput: RecipeInput = {
      detectedIngredients,
      assumedStaples: ['salt', 'black pepper', 'olive oil', 'water'],
      dietaryTags: dietaryTags || ['NONE'],
      cuisinePreferences: cuisinePreferences || ['SURPRISE_ME'],
      timeAvailable: timeAvailable || 'FLEXIBLE',
      skillLevel: skillLevel || 'SURPRISE_ME'
    };

    // Generate recipe suggestions using OpenAI
    const suggestions = await generateRecipeSuggestions(recipeInput);

    res.json({
      suggestions,
      message: 'Recipe suggestions generated successfully (test mode)',
      input_used: recipeInput
    });
  } catch (error) {
    logger.error('Test suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint for full recipe generation (no auth required)
router.post('/test-full-recipe', async (req: Request, res: Response) => {
  try {
    const { selectedTitle, originalInput } = req.body;

    if (!selectedTitle || !originalInput) {
      return res.status(400).json({ error: 'Selected title and original input are required' });
    }

    // Generate full recipe using OpenAI
    const fullRecipe = await generateFullRecipe(selectedTitle, originalInput);

    res.json({
      full_recipe: fullRecipe,
      message: 'Full recipe generated successfully (test mode)'
    });
  } catch (error) {
    logger.error('Test full recipe error:', error);
    res.status(500).json({ 
      error: 'Failed to generate full recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/recipes - Get all recipes (paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, user_id } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            category,
            calories_per_100g,
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            fiber_g_per_100g,
            sodium_mg_per_100g
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error, count } = await query
      .range(offset, offset + parseInt(limit as string) - 1);

    if (error) {
      logger.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recipes'
      });
    }

    res.json({
      success: true,
      data: {
        recipes: data || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Fetch recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes'
    });
  }
});

// GET /api/recipes/:id - Get specific recipe with ingredients
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            category,
            calories_per_100g,
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            fiber_g_per_100g,
            sodium_mg_per_100g
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found'
        });
      }
      logger.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recipe'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    logger.error('Fetch recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe'
    });
  }
});

// GET /api/recipes/:id/nutrition - Get nutritional analysis for a recipe
router.get('/:id/nutrition', async (req, res) => {
  try {
    const { id } = req.params;
    const { servings = 1 } = req.query;

    // Get recipe with ingredients
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            category,
            calories_per_100g,
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            fiber_g_per_100g,
            sodium_mg_per_100g
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Recipe not found'
        });
      }
      logger.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recipe'
      });
    }

    if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
      return res.json({
        success: true,
        data: {
          recipe_id: id,
          recipe_name: recipe.name,
          servings: parseInt(servings as string),
          nutrition: {
            totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 },
            breakdown: []
          },
          per_serving: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 }
        }
      });
    }

    // Calculate nutrition
    const nutrition = calculateNutrition(recipe.recipe_ingredients);
    const servingCount = parseInt(servings as string);
    
    // Calculate per-serving values
    const perServing = {
      calories: Math.round((nutrition.totals.calories / servingCount) * 10) / 10,
      protein_g: Math.round((nutrition.totals.protein_g / servingCount) * 10) / 10,
      carbs_g: Math.round((nutrition.totals.carbs_g / servingCount) * 10) / 10,
      fat_g: Math.round((nutrition.totals.fat_g / servingCount) * 10) / 10,
      fiber_g: Math.round((nutrition.totals.fiber_g / servingCount) * 10) / 10,
      sodium_mg: Math.round((nutrition.totals.sodium_mg / servingCount) * 10) / 10
    };

    res.json({
      success: true,
      data: {
        recipe_id: id,
        recipe_name: recipe.name,
        servings: servingCount,
        nutrition,
        per_serving: perServing
      }
    });

  } catch (error) {
    logger.error('Recipe nutrition analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate recipe nutrition'
    });
  }
});

// POST /api/recipes/:id/save-nutrition - Save nutrition analysis to database
router.post('/:id/save-nutrition', async (req, res) => {
  try {
    const { id } = req.params;
    const { servings = 1 } = req.body;

    // Get recipe with ingredients
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredient:ingredients (
            id,
            name,
            category,
            calories_per_100g,
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            fiber_g_per_100g,
            sodium_mg_per_100g
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    const nutrition = calculateNutrition(recipe.recipe_ingredients);
    const servingCount = parseInt(servings);

    // Save to recipe_nutrition table
    const { data: savedNutrition, error: saveError } = await supabase
      .from('recipe_nutrition')
      .upsert({
        recipe_id: id,
        servings: servingCount,
        total_calories: nutrition.totals.calories,
        total_protein_g: nutrition.totals.protein_g,
        total_carbs_g: nutrition.totals.carbs_g,
        total_fat_g: nutrition.totals.fat_g,
        total_fiber_g: nutrition.totals.fiber_g,
        total_sodium_mg: nutrition.totals.sodium_mg,
        calories_per_serving: nutrition.totals.calories / servingCount,
        protein_g_per_serving: nutrition.totals.protein_g / servingCount,
        carbs_g_per_serving: nutrition.totals.carbs_g / servingCount,
        fat_g_per_serving: nutrition.totals.fat_g / servingCount,
        fiber_g_per_serving: nutrition.totals.fiber_g / servingCount,
        sodium_mg_per_serving: nutrition.totals.sodium_mg / servingCount
      })
      .select()
      .single();

    if (saveError) {
      logger.error('Save nutrition error:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save nutrition data'
      });
    }

    res.json({
      success: true,
      data: savedNutrition
    });

  } catch (error) {
    logger.error('Save recipe nutrition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save recipe nutrition'
    });
  }
});

// Save/unsave recipe
router.post('/:recipeId/save', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    const userId = (req as any).user.id;

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .single();

    if (existing) {
      // Unsave
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId);

      if (error) {
        return res.status(500).json({ error: 'Failed to unsave recipe' });
      }

      res.json({ message: 'Recipe unsaved successfully', saved: false });
    } else {
      // Save
      const { error } = await supabase
        .from('saved_recipes')
        .insert([{
          user_id: userId,
          recipe_id: recipeId
        }]);

      if (error) {
        return res.status(500).json({ error: 'Failed to save recipe' });
      }

      res.json({ message: 'Recipe saved successfully', saved: true });
    }
  } catch (error) {
    logger.error('Save/unsave recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate recipe
router.post('/:recipeId/rate', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    const { rating } = req.body;
    const userId = (req as any).user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Upsert rating
    const { error } = await supabase
      .from('recipe_ratings')
      .upsert([{
        user_id: userId,
        recipe_id: recipeId,
        rating: rating
      }]);

    if (error) {
      return res.status(500).json({ error: 'Failed to rate recipe' });
    }

    res.json({ message: 'Recipe rated successfully' });
  } catch (error) {
    logger.error('Rate recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's saved recipes
router.get('/saved/my', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: savedRecipes, error } = await supabase
      .from('saved_recipes')
      .select(`
        created_at,
        recipe:recipe_id (
          *,
          creator:created_by (id, name, avatar_url, level)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }

    res.json({ saved_recipes: savedRecipes || [] });
  } catch (error) {
    logger.error('Get saved recipes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recipes/test-nutrition - Test nutrition analysis with mock data
router.post('/test-nutrition', async (req, res) => {
  try {
    logger.info('🧪 Testing nutrition analysis with mock data...');

    // Mock recipe ingredients data
    const mockRecipeIngredients = [
      {
        quantity: 2,
        unit: 'whole',
        ingredient: {
          id: 1,
          name: 'Tomato',
          category: 'Vegetables',
          calories_per_100g: 18,
          protein_g_per_100g: 0.9,
          carbs_g_per_100g: 3.9,
          fat_g_per_100g: 0.2,
          fiber_g_per_100g: 1.2,
          sodium_mg_per_100g: 5
        }
      },
      {
        quantity: 1,
        unit: 'small',
        ingredient: {
          id: 2,
          name: 'Onion',
          category: 'Vegetables',
          calories_per_100g: 40,
          protein_g_per_100g: 1.1,
          carbs_g_per_100g: 9.3,
          fat_g_per_100g: 0.1,
          fiber_g_per_100g: 1.7,
          sodium_mg_per_100g: 4
        }
      },
      {
        quantity: 2,
        unit: 'tbsp',
        ingredient: {
          id: 4,
          name: 'Olive Oil',
          category: 'Oils',
          calories_per_100g: 884,
          protein_g_per_100g: 0,
          carbs_g_per_100g: 0,
          fat_g_per_100g: 100,
          fiber_g_per_100g: 0,
          sodium_mg_per_100g: 2
        }
      }
    ];

    const servings = 2;

    // Calculate nutrition
    const nutrition = calculateNutrition(mockRecipeIngredients);
    
    // Calculate per-serving values
    const perServing = {
      calories: Math.round((nutrition.totals.calories / servings) * 10) / 10,
      protein_g: Math.round((nutrition.totals.protein_g / servings) * 10) / 10,
      carbs_g: Math.round((nutrition.totals.carbs_g / servings) * 10) / 10,
      fat_g: Math.round((nutrition.totals.fat_g / servings) * 10) / 10,
      fiber_g: Math.round((nutrition.totals.fiber_g / servings) * 10) / 10,
      sodium_mg: Math.round((nutrition.totals.sodium_mg / servings) * 10) / 10
    };

    res.json({
      success: true,
      data: {
        recipe_name: 'Mock Tomato Salad',
        servings: servings,
        nutrition,
        per_serving: perServing,
        message: 'This is a test with mock nutritional data'
      }
    });

  } catch (error) {
    logger.error('Test nutrition analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test nutrition analysis'
    });
  }
});

// Upload completed recipe photo
router.post('/:recipeId/upload-completion-photo', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    const userId = (req as any).user.id;
    const { imageData, description } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // In demo mode, simulate photo upload
    if (req.headers['demo-mode'] || userId.startsWith('demo_')) {
      const mockPhotoUrl = `https://images.unsplash.com/photo-${Date.now()}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80`;
      
      return res.json({
        photoUrl: mockPhotoUrl,
        uploadedAt: new Date(),
        message: 'Demo photo uploaded successfully'
      });
    }

    // Production: Save to database and cloud storage
    const { data: photo, error } = await supabase
      .from('recipe_completion_photos')
      .insert([{
        recipe_id: recipeId,
        user_id: userId,
        photo_url: imageData, // In production, this would be uploaded to cloud storage first
        description: description || null,
        uploaded_at: new Date()
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Award XP for sharing completion photo
    try {
      await supabase.rpc('add_user_xp', {
        p_user_id: userId,
        p_xp_amount: 75,
        p_action: 'RECIPE_COMPLETION_PHOTO',
        p_metadata: { recipe_id: recipeId }
      });
    } catch (xpError) {
      logger.error('XP award error:', xpError);
    }

    res.json({
      photo,
      message: 'Recipe completion photo uploaded successfully'
    });
  } catch (error) {
    logger.error('Upload completion photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get completion photos for a recipe
router.get('/:recipeId/completion-photos', async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // In demo mode, return mock photos
    if (req.headers['demo-mode']) {
      const mockPhotos = [
        {
          id: 1,
          photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          user_name: 'Chef Sarah',
          uploaded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          description: 'Turned out amazing! Added extra herbs.'
        },
        {
          id: 2,
          photo_url: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          user_name: 'FoodLover42',
          uploaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          description: 'Family loved it! Making again next week.'
        },
        {
          id: 3,
          photo_url: 'https://images.unsplash.com/photo-1565299585323-38174c26008d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          user_name: 'HomeCook',
          uploaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          description: null
        }
      ];
      
      return res.json({
        photos: mockPhotos.slice(Number(offset), Number(offset) + Number(limit)),
        total: mockPhotos.length
      });
    }

    // Production: Get from database
    const { data: photos, error } = await supabase
      .from('recipe_completion_photos')
      .select(`
        id,
        photo_url,
        description,
        uploaded_at,
        user:users(name)
      `)
      .eq('recipe_id', recipeId)
      .order('uploaded_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      photos: photos || [],
      total: photos?.length || 0
    });
  } catch (error) {
    logger.error('Get completion photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to convert units to grams
function convertToGrams(quantity: number, unit: string): number {
  const conversions: { [key: string]: number } = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'pounds': 453.59,
    'cup': 240, // Approximate for most ingredients
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
    'ml': 1, // Assuming 1ml ≈ 1g for most liquid ingredients
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000
  };

  const multiplier = conversions[unit.toLowerCase()] || 100; // Default to 100g if unknown
  return quantity * multiplier;
}

// Helper function to calculate nutritional values
function calculateNutrition(recipeIngredients: RecipeIngredient[]): NutritionCalculation {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSodium = 0;

  const ingredientBreakdown: IngredientNutrition[] = [];

  recipeIngredients.forEach((recipeIngredient: RecipeIngredient) => {
    const ingredient = recipeIngredient.ingredient;
    if (!ingredient) {return;}

    const gramsAmount = convertToGrams(recipeIngredient.quantity, recipeIngredient.unit);
    const factor = gramsAmount / 100; // Convert to per-100g values

    const ingredientNutrition: IngredientNutrition = {
      name: ingredient.name,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
      grams: gramsAmount,
      calories: (ingredient.calories_per_100g || 0) * factor,
      protein: (ingredient.protein_g_per_100g || 0) * factor,
      carbs: (ingredient.carbs_g_per_100g || 0) * factor,
      fat: (ingredient.fat_g_per_100g || 0) * factor,
      fiber: (ingredient.fiber_g_per_100g || 0) * factor,
      sodium: (ingredient.sodium_mg_per_100g || 0) * factor
    };

    totalCalories += ingredientNutrition.calories;
    totalProtein += ingredientNutrition.protein;
    totalCarbs += ingredientNutrition.carbs;
    totalFat += ingredientNutrition.fat;
    totalFiber += ingredientNutrition.fiber;
    totalSodium += ingredientNutrition.sodium;

    ingredientBreakdown.push(ingredientNutrition);
  });

  return {
    totals: {
      calories: Math.round(totalCalories * 10) / 10,
      protein_g: Math.round(totalProtein * 10) / 10,
      carbs_g: Math.round(totalCarbs * 10) / 10,
      fat_g: Math.round(totalFat * 10) / 10,
      fiber_g: Math.round(totalFiber * 10) / 10,
      sodium_mg: Math.round(totalSodium * 10) / 10
    },
    breakdown: ingredientBreakdown
  };
}

export default router; 
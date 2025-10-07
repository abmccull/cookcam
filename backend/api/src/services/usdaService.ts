// USDA FoodData Central API Service
import axios from 'axios';
import { Pool } from 'pg';

// Types for USDA API responses
interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: string;
  foodCategoryId?: number;
  scientificName?: string;
  commonNames?: string[];
  additionalDescriptions?: string;
  foodNutrients?: USDANutrient[];
}

interface USDANutrient {
  type: string;
  id: number;
  nutrient: {
    id: number;
    number: string;
    name: string;
    rank: number;
    unitName: string;
  };
  amount: number;
  dataPoints?: number;
  derivationId?: number;
  min?: number;
  max?: number;
  median?: number;
  footnote?: string;
  minYearAcquired?: number;
}

interface USDASearchResponse {
  foods: USDAFood[];
  currentPage: number;
  totalPages: number;
  totalHits: number;
  pageList: number[];
}

interface NutritionalData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
}

class USDAService {
  private apiKey: string;
  private baseUrl: string = 'https://api.nal.usda.gov/fdc/v1';
  private rateLimit: number = 1000; // requests per hour
  private requestCount: number = 0;
  private lastReset: Date = new Date();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private checkRateLimit(): boolean {
    const now = new Date();
    const hoursPassed = (now.getTime() - this.lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursPassed >= 1) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    return this.requestCount < this.rateLimit;
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!this.checkRateLimit()) {
      throw new Error('USDA API rate limit exceeded. Try again in an hour.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          api_key: this.apiKey,
          ...params,
        },
        timeout: 10000,
      });

      this.requestCount++;
      return response.data;
    } catch (error: unknown) {
      console.error('USDA API request failed:', error);
      throw error;
    }
  }

  // Search for foods by query
  async searchFoods(
    query: string,
    dataType: string[] = ['Foundation', 'SR Legacy'],
    pageSize: number = 25,
    pageNumber: number = 1
  ): Promise<USDASearchResponse> {
    const params = {
      query,
      dataType,
      pageSize,
      pageNumber,
      sortBy: 'fdcId',
      sortOrder: 'asc',
    };

    return this.makeRequest('/foods/search', params) as Promise<USDASearchResponse>;
  }

  // Get detailed food information by FDC ID
  async getFoodDetails(fdcId: number): Promise<USDAFood> {
    return this.makeRequest(`/food/${fdcId}`) as Promise<USDAFood>;
  }

  // Get multiple foods by FDC IDs
  async getMultipleFoods(fdcIds: number[]): Promise<USDAFood[]> {
    const params = {
      fdcIds: fdcIds.join(','),
      nutrients: ['203', '204', '205', '208', '269', '291', '301', '303', '401'], // Common nutrients
    };

    return this.makeRequest('/foods', params) as Promise<USDAFood[]>;
  }

  // Extract standardized nutritional data per 100g
  extractNutritionalData(food: USDAFood): NutritionalData {
    if (!food.foodNutrients) {
      return {};
    }

    const nutrition: NutritionalData = {};

    food.foodNutrients.forEach((nutrient) => {
      const nutrientId = nutrient.nutrient.id;
      const amount = nutrient.amount;

      switch (nutrientId) {
        case 208: // Energy (calories)
          nutrition.calories = amount;
          break;
        case 203: // Protein
          nutrition.protein = amount;
          break;
        case 205: // Carbohydrates
          nutrition.carbs = amount;
          break;
        case 204: // Total fat
          nutrition.fat = amount;
          break;
        case 291: // Fiber
          nutrition.fiber = amount;
          break;
        case 269: // Sugars
          nutrition.sugar = amount;
          break;
        case 307: // Sodium
          nutrition.sodium = amount;
          break;
        case 301: // Calcium
          nutrition.calcium = amount;
          break;
        case 303: // Iron
          nutrition.iron = amount;
          break;
        case 401: // Vitamin C
          nutrition.vitaminC = amount;
          break;
      }
    });

    return nutrition;
  }

  // Store USDA food data in our database
  async storeFoodData(pool: Pool, food: USDAFood): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Store main food data
      const insertFoodQuery = `
        INSERT INTO usda_foods (
          fdc_id, description, data_type, publication_date, brand_owner,
          gtin_upc, ingredients_text, serving_size, serving_size_unit,
          category, food_category_id, scientific_name, common_names,
          additional_descriptions, data_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (fdc_id) DO UPDATE SET
          description = EXCLUDED.description,
          data_type = EXCLUDED.data_type,
          publication_date = EXCLUDED.publication_date,
          brand_owner = EXCLUDED.brand_owner,
          gtin_upc = EXCLUDED.gtin_upc,
          ingredients_text = EXCLUDED.ingredients_text,
          serving_size = EXCLUDED.serving_size,
          serving_size_unit = EXCLUDED.serving_size_unit,
          category = EXCLUDED.category,
          food_category_id = EXCLUDED.food_category_id,
          scientific_name = EXCLUDED.scientific_name,
          common_names = EXCLUDED.common_names,
          additional_descriptions = EXCLUDED.additional_descriptions,
          data_source = EXCLUDED.data_source,
          updated_at = now()
      `;

      await client.query(insertFoodQuery, [
        food.fdcId,
        food.description,
        food.dataType,
        food.publicationDate || null,
        food.brandOwner || null,
        food.gtinUpc || null,
        food.ingredients || null,
        food.servingSize || null,
        food.servingSizeUnit || null,
        food.foodCategory || null,
        food.foodCategoryId || null,
        food.scientificName || null,
        food.commonNames || null,
        food.additionalDescriptions || null,
        'USDA FDC API',
      ]);

      // Store nutrients
      if (food.foodNutrients) {
        for (const nutrient of food.foodNutrients) {
          // First ensure nutrient exists
          const insertNutrientQuery = `
            INSERT INTO usda_nutrients (nutrient_id, name, unit_name, nutrient_nbr, rank)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (nutrient_id) DO NOTHING
          `;

          await client.query(insertNutrientQuery, [
            nutrient.nutrient.id,
            nutrient.nutrient.name,
            nutrient.nutrient.unitName,
            nutrient.nutrient.number,
            nutrient.nutrient.rank,
          ]);

          // Then store food nutrient relationship
          const insertFoodNutrientQuery = `
            INSERT INTO usda_food_nutrients (
              fdc_id, nutrient_id, amount, data_points, derivation_id,
              min_value, max_value, median_value, footnote, min_year_acquired
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (fdc_id, nutrient_id) DO UPDATE SET
              amount = EXCLUDED.amount,
              data_points = EXCLUDED.data_points,
              derivation_id = EXCLUDED.derivation_id,
              min_value = EXCLUDED.min_value,
              max_value = EXCLUDED.max_value,
              median_value = EXCLUDED.median_value,
              footnote = EXCLUDED.footnote,
              min_year_acquired = EXCLUDED.min_year_acquired
          `;

          await client.query(insertFoodNutrientQuery, [
            food.fdcId,
            nutrient.nutrient.id,
            nutrient.amount,
            nutrient.dataPoints || null,
            nutrient.derivationId || null,
            nutrient.min || null,
            nutrient.max || null,
            nutrient.median || null,
            nutrient.footnote || null,
            nutrient.minYearAcquired || null,
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Sync ingredient with USDA data
  async syncIngredientWithUSDA(pool: Pool, ingredientName: string): Promise<number | null> {
    try {
      // Search for the ingredient in USDA database
      const searchResults = await this.searchFoods(ingredientName, ['Foundation', 'SR Legacy'], 5);

      if (searchResults.foods.length === 0) {
        console.log(`No USDA data found for ingredient: ${ingredientName}`);
        return null;
      }

      // Get the best match (first result, typically highest relevance)
      const bestMatch = searchResults.foods[0];

      if (!bestMatch) {
        console.log(`No valid match found for ingredient: ${ingredientName}`);
        return null;
      }

      // Get detailed food information
      const detailedFood = await this.getFoodDetails(bestMatch.fdcId);

      // Store in USDA tables
      await this.storeFoodData(pool, detailedFood);

      // Extract nutritional data
      const nutrition = this.extractNutritionalData(detailedFood);

      // Update our ingredients table
      const updateIngredientQuery = `
        UPDATE ingredients 
        SET 
          fdc_id = $1,
          calories_per_100g = $2,
          protein_g_per_100g = $3,
          carbs_g_per_100g = $4,
          fat_g_per_100g = $5,
          fiber_g_per_100g = $6,
          sugar_g_per_100g = $7,
          sodium_mg_per_100g = $8,
          calcium_mg_per_100g = $9,
          iron_mg_per_100g = $10,
          vitamin_c_mg_per_100g = $11,
          usda_sync_date = now()
        WHERE LOWER(name) = LOWER($12) OR $12 = ANY(common_names)
        RETURNING id
      `;

      const result = await pool.query(updateIngredientQuery, [
        detailedFood.fdcId,
        nutrition.calories || null,
        nutrition.protein || null,
        nutrition.carbs || null,
        nutrition.fat || null,
        nutrition.fiber || null,
        nutrition.sugar || null,
        nutrition.sodium || null,
        nutrition.calcium || null,
        nutrition.iron || null,
        nutrition.vitaminC || null,
        ingredientName,
      ]);

      if (result.rows.length > 0) {
        console.log(
          `Successfully synced ingredient "${ingredientName}" with USDA FDC ID: ${detailedFood.fdcId}`
        );
        return detailedFood.fdcId;
      } else {
        // Create new ingredient if not found
        const insertIngredientQuery = `
          INSERT INTO ingredients (
            name, fdc_id, category,
            calories_per_100g, protein_g_per_100g, carbs_g_per_100g,
            fat_g_per_100g, fiber_g_per_100g, sugar_g_per_100g,
            sodium_mg_per_100g, calcium_mg_per_100g, iron_mg_per_100g,
            vitamin_c_mg_per_100g, usda_sync_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
          RETURNING id
        `;

        await pool.query(insertIngredientQuery, [
          detailedFood.description,
          detailedFood.fdcId,
          nutrition.protein || null,
          nutrition.carbs || null,
          nutrition.fat || null,
          nutrition.fiber || null,
          nutrition.sugar || null,
          nutrition.sodium || null,
          nutrition.calcium || null,
          nutrition.iron || null,
          nutrition.vitaminC || null,
          nutrition.calories || null,
          nutrition.fiber || null,
          nutrition.sugar || null,
          nutrition.sodium || null,
          nutrition.calcium || null,
          nutrition.iron || null,
          nutrition.vitaminC || null,
        ]);

        console.log(
          `Created new ingredient "${detailedFood.description}" with USDA FDC ID: ${detailedFood.fdcId}`
        );
        return detailedFood.fdcId;
      }
    } catch (error: unknown) {
      console.error(`Failed to sync ingredient "${ingredientName}" with USDA:`, error);
      return null;
    }
  }

  // Batch sync multiple ingredients
  async batchSyncIngredients(
    pool: Pool,
    ingredientNames: string[]
  ): Promise<{ [key: string]: number | null }> {
    const results: { [key: string]: number | null } = {};

    for (const ingredientName of ingredientNames) {
      // Add delay to respect rate limits
      if (this.requestCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      }

      results[ingredientName] = await this.syncIngredientWithUSDA(pool, ingredientName);
    }

    return results;
  }

  // Search our local ingredients database with USDA fallback
  async searchIngredientsWithFallback(
    pool: Pool,
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    // First search local database
    const localSearchQuery = `
      SELECT * FROM search_ingredients($1, $2)
    `;

    const localResults = await pool.query(localSearchQuery, [query, limit]);

    if (localResults.rows.length >= limit) {
      return localResults.rows;
    }

    // If we don't have enough local results, search USDA and sync
    try {
      const usdaResults = await this.searchFoods(query, ['Foundation', 'SR Legacy'], 5);

      for (const food of usdaResults.foods.slice(0, 3)) {
        await this.syncIngredientWithUSDA(pool, food.description);
      }

      // Search again after syncing
      const updatedResults = await pool.query(localSearchQuery, [query, limit]);
      return updatedResults.rows;
    } catch (error: unknown) {
      console.error('USDA fallback search failed:', error);
      return localResults.rows;
    }
  }
}

export default USDAService;

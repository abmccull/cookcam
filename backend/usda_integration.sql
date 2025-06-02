-- USDA FoodData Central API Integration Schema
-- Run this after your main database setup to add USDA API support

-- USDA Food Data Central Integration Tables
-- These tables map to the USDA FDC API structure

-- Main foods/ingredients table based on USDA FDC
CREATE TABLE IF NOT EXISTS usda_foods (
  fdc_id INT PRIMARY KEY,
  description TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'
  publication_date DATE,
  brand_owner TEXT,
  gtin_upc TEXT,
  ingredients_text TEXT,
  serving_size FLOAT,
  serving_size_unit TEXT,
  category TEXT,
  food_category_id INT,
  scientific_name TEXT,
  common_names TEXT[],
  additional_descriptions TEXT,
  data_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Nutritional facts table (maps to USDA food nutrients)
CREATE TABLE IF NOT EXISTS usda_nutrients (
  id SERIAL PRIMARY KEY,
  nutrient_id INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  nutrient_nbr TEXT,
  rank INT
);

-- Food nutrients join table (actual nutritional values per food)
CREATE TABLE IF NOT EXISTS usda_food_nutrients (
  id SERIAL PRIMARY KEY,
  fdc_id INT REFERENCES usda_foods(fdc_id) ON DELETE CASCADE,
  nutrient_id INT REFERENCES usda_nutrients(nutrient_id),
  amount FLOAT,
  data_points INT,
  derivation_id INT,
  min_value FLOAT,
  max_value FLOAT,
  median_value FLOAT,
  footnote TEXT,
  min_year_acquired INT,
  UNIQUE(fdc_id, nutrient_id)
);

-- Food categories for organization
CREATE TABLE IF NOT EXISTS usda_food_categories (
  id SERIAL PRIMARY KEY,
  code TEXT,
  description TEXT NOT NULL
);

-- CookCam ingredients table - enhanced with USDA integration
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  fdc_id INT REFERENCES usda_foods(fdc_id),
  common_names TEXT[],
  category TEXT,
  subcategory TEXT,
  
  -- Nutritional data (per 100g standardized)
  calories_per_100g FLOAT,
  protein_g_per_100g FLOAT,
  carbs_g_per_100g FLOAT,
  fat_g_per_100g FLOAT,
  fiber_g_per_100g FLOAT,
  sugar_g_per_100g FLOAT,
  sodium_mg_per_100g FLOAT,
  calcium_mg_per_100g FLOAT,
  iron_mg_per_100g FLOAT,
  vitamin_c_mg_per_100g FLOAT,
  
  -- CookCam specific fields
  confidence_threshold FLOAT DEFAULT 0.7,
  common_pairings TEXT[],
  storage_tips TEXT,
  peak_season TEXT,
  prep_suggestions TEXT[],
  substitutes TEXT[],
  
  -- Search and classification
  searchable_text TEXT, -- For full-text search
  tags TEXT[],
  allergens TEXT[],
  dietary_flags TEXT[], -- 'vegan', 'vegetarian', 'gluten-free', etc.
  
  -- Metadata
  usda_sync_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced ingredient_scans to reference our ingredients table
ALTER TABLE ingredient_scans 
ADD COLUMN IF NOT EXISTS ingredient_ids INT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usda_lookup_performed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nutritional_analysis JSONB;

-- Recipe ingredients join table for better normalization
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id),
  fdc_id INT REFERENCES usda_foods(fdc_id),
  quantity FLOAT,
  unit TEXT,
  preparation TEXT, -- 'chopped', 'diced', 'whole', etc.
  notes TEXT,
  order_index INT DEFAULT 0
);

-- Nutritional analysis cache for recipes
CREATE TABLE IF NOT EXISTS recipe_nutrition (
  recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  total_calories FLOAT,
  calories_per_serving FLOAT,
  
  -- Macronutrients per serving
  protein_g FLOAT,
  carbs_g FLOAT,
  fat_g FLOAT,
  fiber_g FLOAT,
  sugar_g FLOAT,
  
  -- Micronutrients per serving  
  sodium_mg FLOAT,
  calcium_mg FLOAT,
  iron_mg FLOAT,
  vitamin_c_mg FLOAT,
  
  -- Nutritional scores
  nutrition_score FLOAT, -- 0-100 healthiness score
  dietary_flags TEXT[], -- 'high-protein', 'low-sodium', etc.
  
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- USDA API request log for rate limiting and caching
CREATE TABLE IF NOT EXISTS usda_api_requests (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  query_params JSONB,
  response_data JSONB,
  status_code INT,
  rate_limit_remaining INT,
  cache_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usda_foods_description ON usda_foods USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_usda_foods_data_type ON usda_foods(data_type);
CREATE INDEX IF NOT EXISTS idx_usda_foods_category ON usda_foods(category);
CREATE INDEX IF NOT EXISTS idx_usda_food_nutrients_fdc_id ON usda_food_nutrients(fdc_id);
CREATE INDEX IF NOT EXISTS idx_usda_food_nutrients_nutrient_id ON usda_food_nutrients(nutrient_id);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_fdc_id ON ingredients(fdc_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_searchable_text ON ingredients USING GIN(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_tags ON ingredients USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ingredients_dietary_flags ON ingredients USING GIN(dietary_flags);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Functions for USDA integration

-- Function to search ingredients with USDA fallback
CREATE OR REPLACE FUNCTION search_ingredients(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id INT,
  name TEXT,
  fdc_id INT,
  category TEXT,
  calories_per_100g FLOAT,
  protein_g_per_100g FLOAT,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.fdc_id,
    i.category,
    i.calories_per_100g,
    i.protein_g_per_100g,
    ts_rank(to_tsvector('english', i.searchable_text), to_tsquery('english', p_query)) as match_score
  FROM ingredients i
  WHERE 
    to_tsvector('english', i.searchable_text) @@ to_tsquery('english', p_query)
    OR i.name ILIKE '%' || p_query || '%'
    OR p_query = ANY(i.common_names)
  ORDER BY match_score DESC, i.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate recipe nutrition from ingredients
CREATE OR REPLACE FUNCTION calculate_recipe_nutrition(p_recipe_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_nutrition JSONB;
  v_servings INT;
  v_total_calories FLOAT := 0;
  v_total_protein FLOAT := 0;
  v_total_carbs FLOAT := 0;
  v_total_fat FLOAT := 0;
  v_total_fiber FLOAT := 0;
  v_total_sodium FLOAT := 0;
  v_ingredient RECORD;
BEGIN
  -- Get recipe servings
  SELECT servings INTO v_servings FROM recipes WHERE id = p_recipe_id;
  IF v_servings IS NULL OR v_servings = 0 THEN
    v_servings := 4; -- Default servings
  END IF;
  
  -- Sum nutrition from all ingredients
  FOR v_ingredient IN 
    SELECT 
      ri.quantity,
      ri.unit,
      i.calories_per_100g,
      i.protein_g_per_100g,
      i.carbs_g_per_100g,
      i.fat_g_per_100g,
      i.fiber_g_per_100g,
      i.sodium_mg_per_100g
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    -- Convert quantity to grams (simplified - would need unit conversion)
    DECLARE
      v_grams FLOAT := COALESCE(v_ingredient.quantity, 0);
    BEGIN
      -- Simple unit conversion (extend this for real implementation)
      IF v_ingredient.unit IN ('cup', 'cups') THEN
        v_grams := v_grams * 240; -- Approximate
      ELSIF v_ingredient.unit IN ('tbsp', 'tablespoon') THEN
        v_grams := v_grams * 15;
      ELSIF v_ingredient.unit IN ('tsp', 'teaspoon') THEN
        v_grams := v_grams * 5;
      END IF;
      
      -- Calculate nutrition per 100g ratio
      DECLARE
        v_ratio FLOAT := v_grams / 100.0;
      BEGIN
        v_total_calories := v_total_calories + (COALESCE(v_ingredient.calories_per_100g, 0) * v_ratio);
        v_total_protein := v_total_protein + (COALESCE(v_ingredient.protein_g_per_100g, 0) * v_ratio);
        v_total_carbs := v_total_carbs + (COALESCE(v_ingredient.carbs_g_per_100g, 0) * v_ratio);
        v_total_fat := v_total_fat + (COALESCE(v_ingredient.fat_g_per_100g, 0) * v_ratio);
        v_total_fiber := v_total_fiber + (COALESCE(v_ingredient.fiber_g_per_100g, 0) * v_ratio);
        v_total_sodium := v_total_sodium + (COALESCE(v_ingredient.sodium_mg_per_100g, 0) * v_ratio);
      END;
    END;
  END LOOP;
  
  -- Store nutrition data
  INSERT INTO recipe_nutrition (
    recipe_id, total_calories, calories_per_serving,
    protein_g, carbs_g, fat_g, fiber_g, sodium_mg
  ) VALUES (
    p_recipe_id, v_total_calories, v_total_calories / v_servings,
    v_total_protein / v_servings, v_total_carbs / v_servings, 
    v_total_fat / v_servings, v_total_fiber / v_servings,
    v_total_sodium / v_servings
  )
  ON CONFLICT (recipe_id) DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    calories_per_serving = EXCLUDED.calories_per_serving,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    fiber_g = EXCLUDED.fiber_g,
    sodium_mg = EXCLUDED.sodium_mg,
    calculated_at = now();
  
  -- Return nutrition summary
  RETURN jsonb_build_object(
    'total_calories', v_total_calories,
    'calories_per_serving', v_total_calories / v_servings,
    'protein_g_per_serving', v_total_protein / v_servings,
    'carbs_g_per_serving', v_total_carbs / v_servings,
    'fat_g_per_serving', v_total_fat / v_servings,
    'fiber_g_per_serving', v_total_fiber / v_servings,
    'sodium_mg_per_serving', v_total_sodium / v_servings,
    'servings', v_servings
  );
END;
$$ LANGUAGE plpgsql;

-- Seed some common ingredients (you can expand this)
INSERT INTO ingredients (name, common_names, category, searchable_text, tags, dietary_flags) VALUES 
('Tomato', ARRAY['tomatoes', 'roma tomato', 'cherry tomato'], 'Vegetables', 'tomato red vegetable fruit', ARRAY['fresh', 'produce'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Onion', ARRAY['onions', 'yellow onion', 'white onion'], 'Vegetables', 'onion vegetable aromatic', ARRAY['fresh', 'produce'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Garlic', ARRAY['garlic cloves', 'garlic bulb'], 'Vegetables', 'garlic aromatic vegetable spice', ARRAY['fresh', 'produce', 'aromatic'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Basil', ARRAY['fresh basil', 'basil leaves'], 'Herbs', 'basil herb fresh green aromatic', ARRAY['herbs', 'fresh'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Olive Oil', ARRAY['extra virgin olive oil', 'EVOO'], 'Oils', 'olive oil cooking fat healthy', ARRAY['cooking', 'healthy-fat'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Salt', ARRAY['table salt', 'sea salt'], 'Seasonings', 'salt seasoning sodium', ARRAY['seasoning', 'basic'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Black Pepper', ARRAY['pepper', 'ground black pepper'], 'Spices', 'black pepper spice seasoning', ARRAY['spice', 'seasoning'], ARRAY['vegan', 'vegetarian', 'gluten-free'])
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update searchable_text
CREATE OR REPLACE FUNCTION update_ingredient_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.searchable_text := LOWER(NEW.name || ' ' || 
    COALESCE(array_to_string(NEW.common_names, ' '), '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), ''));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ingredient_searchable_text
  BEFORE INSERT OR UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_ingredient_searchable_text();

-- Enable Row Level Security
ALTER TABLE usda_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_food_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_api_requests ENABLE ROW LEVEL SECURITY;

-- Public read access for USDA data
CREATE POLICY "Public read access for USDA foods" ON usda_foods FOR SELECT USING (true);
CREATE POLICY "Public read access for USDA nutrients" ON usda_nutrients FOR SELECT USING (true);
CREATE POLICY "Public read access for USDA food nutrients" ON usda_food_nutrients FOR SELECT USING (true);
CREATE POLICY "Public read access for USDA categories" ON usda_food_categories FOR SELECT USING (true);
CREATE POLICY "Public read access for ingredients" ON ingredients FOR SELECT USING (true);

-- 🎉 USDA Integration Ready! 
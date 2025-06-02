-- USDA FoodData Central Integration Migration
-- Run this in the Supabase SQL Editor

-- 1. Create USDA Foods table
CREATE TABLE IF NOT EXISTS usda_foods (
  fdc_id INT PRIMARY KEY,
  description TEXT NOT NULL,
  data_type TEXT NOT NULL,
  publication_date DATE,
  brand_owner TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create USDA Nutrients table
CREATE TABLE IF NOT EXISTS usda_nutrients (
  id SERIAL PRIMARY KEY,
  nutrient_id INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_name TEXT NOT NULL
);

-- 3. Create USDA Food Nutrients junction table
CREATE TABLE IF NOT EXISTS usda_food_nutrients (
  id SERIAL PRIMARY KEY,
  fdc_id INT REFERENCES usda_foods(fdc_id) ON DELETE CASCADE,
  nutrient_id INT REFERENCES usda_nutrients(nutrient_id),
  amount FLOAT,
  UNIQUE(fdc_id, nutrient_id)
);

-- 4. Create enhanced ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  fdc_id INT REFERENCES usda_foods(fdc_id),
  category TEXT,
  
  -- Nutritional data (per 100g standardized)
  calories_per_100g FLOAT,
  protein_g_per_100g FLOAT,
  carbs_g_per_100g FLOAT,
  fat_g_per_100g FLOAT,
  fiber_g_per_100g FLOAT,
  sodium_mg_per_100g FLOAT,
  
  -- Search and metadata
  searchable_text TEXT,
  tags TEXT[],
  dietary_flags TEXT[],
  usda_sync_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create recipe ingredients junction table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id),
  quantity FLOAT,
  unit TEXT,
  preparation TEXT,
  order_index INT DEFAULT 0
);

-- 6. Create recipe nutrition cache table
CREATE TABLE IF NOT EXISTS recipe_nutrition (
  recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  total_calories FLOAT,
  calories_per_serving FLOAT,
  protein_g FLOAT,
  carbs_g FLOAT,
  fat_g FLOAT,
  fiber_g FLOAT,
  sodium_mg FLOAT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create USDA API requests log for rate limiting
CREATE TABLE IF NOT EXISTS usda_api_requests (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  query_params JSONB,
  response_data JSONB,
  status_code INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usda_foods_description ON usda_foods USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_searchable_text ON ingredients USING GIN(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

-- 9. Insert some sample ingredients
INSERT INTO ingredients (name, category, searchable_text, tags, dietary_flags) VALUES 
('Tomato', 'Vegetables', 'tomato red vegetable fruit', ARRAY['fresh', 'produce'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Onion', 'Vegetables', 'onion vegetable aromatic', ARRAY['fresh', 'produce'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Garlic', 'Vegetables', 'garlic aromatic vegetable spice', ARRAY['fresh', 'produce'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Olive Oil', 'Oils', 'olive oil cooking fat healthy', ARRAY['cooking'], ARRAY['vegan', 'vegetarian', 'gluten-free']),
('Salt', 'Seasonings', 'salt seasoning sodium', ARRAY['seasoning'], ARRAY['vegan', 'vegetarian', 'gluten-free'])
ON CONFLICT (name) DO NOTHING;

-- 10. Create trigger to update searchable_text
CREATE OR REPLACE FUNCTION update_ingredient_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.searchable_text := LOWER(NEW.name || ' ' || COALESCE(NEW.category, '') || ' ' || COALESCE(array_to_string(NEW.tags, ' '), ''));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ingredient_searchable_text
  BEFORE INSERT OR UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_ingredient_searchable_text();

-- 11. Enable RLS (Row Level Security)
ALTER TABLE usda_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE usda_food_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;

-- 12. Create policies for public read access
CREATE POLICY "Public read access for USDA foods" ON usda_foods FOR SELECT USING (true);
CREATE POLICY "Public read access for USDA nutrients" ON usda_nutrients FOR SELECT USING (true);
CREATE POLICY "Public read access for USDA food nutrients" ON usda_food_nutrients FOR SELECT USING (true);
CREATE POLICY "Public read access for ingredients" ON ingredients FOR SELECT USING (true);

-- Migration completed successfully! 
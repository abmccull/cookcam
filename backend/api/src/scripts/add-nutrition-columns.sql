-- Add missing nutrition columns to ingredients table
-- Run this in Supabase SQL Editor before starting bulk seeding

-- Add missing nutrition columns
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS sugar_g_per_100g FLOAT,
ADD COLUMN IF NOT EXISTS calcium_mg_per_100g FLOAT,
ADD COLUMN IF NOT EXISTS iron_mg_per_100g FLOAT,
ADD COLUMN IF NOT EXISTS vitamin_c_mg_per_100g FLOAT,
ADD COLUMN IF NOT EXISTS usda_data_type TEXT,
ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Update searchable_text for existing ingredients
UPDATE ingredients 
SET searchable_text = LOWER(name) 
WHERE searchable_text IS NULL;

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_ingredients_searchable_text ON ingredients USING gin(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_ingredients_fdc_id ON ingredients(fdc_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

-- Create text search function for ingredients
CREATE OR REPLACE FUNCTION search_ingredients(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  category TEXT,
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
  fdc_id INTEGER,
  usda_data_type TEXT,
  usda_sync_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.category,
    i.calories_per_100g,
    i.protein_g_per_100g,
    i.carbs_g_per_100g,
    i.fat_g_per_100g,
    i.fiber_g_per_100g,
    i.sugar_g_per_100g,
    i.sodium_mg_per_100g,
    i.calcium_mg_per_100g,
    i.iron_mg_per_100g,
    i.vitamin_c_mg_per_100g,
    i.fdc_id,
    i.usda_data_type,
    i.usda_sync_date
  FROM ingredients i
  WHERE 
    i.name ILIKE '%' || search_query || '%' 
    OR i.searchable_text ILIKE '%' || search_query || '%'
    OR to_tsvector('english', i.name) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    CASE 
      WHEN i.name ILIKE search_query || '%' THEN 1  -- Starts with query
      WHEN i.name ILIKE '%' || search_query || '%' THEN 2  -- Contains query
      ELSE 3  -- Text search match
    END,
    i.name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql; 
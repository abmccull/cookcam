-- Simple SQL to seed test recipes
-- Run this in Supabase SQL Editor to bypass RLS policies

-- First, let's see the table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recipes';

-- Insert recipes with correct data types:
-- ingredients: jsonb format
-- instructions: text[] arrays  
-- tags: text[] arrays
INSERT INTO recipes (title, description, prep_time, cook_time, difficulty, servings, ingredients, instructions, tags) VALUES

('Fresh Tomato Salad', 
 'A light and refreshing tomato salad with herbs and olive oil dressing', 
 10, 0, 'easy', 2,
 '["2 large tomatoes", "1 small onion", "2 cloves garlic", "2 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
 ARRAY['Wash and dice the tomatoes', 'Finely chop onion and garlic', 'Combine in bowl', 'Add olive oil and salt', 'Let sit 5 minutes'],
 ARRAY['healthy', 'vegetarian', 'quick']),

('Simple Garlic Oil Sauce', 
 'Classic Italian aglio e olio - garlic and olive oil sauce', 
 5, 15, 'easy', 4,
 '["6 cloves garlic", "1/2 cup olive oil", "1 tsp salt", "1 small onion"]'::jsonb,
 ARRAY['Slice garlic thinly', 'Heat olive oil', 'Cook garlic until golden', 'Add onion', 'Season with salt'],
 ARRAY['italian', 'vegetarian', 'pasta']),

('Roasted Tomato & Onion', 
 'Slow-roasted vegetables with garlic and herbs', 
 15, 45, 'medium', 4,
 '["4 large tomatoes", "2 medium onions", "4 cloves garlic", "3 tbsp olive oil", "1 tsp salt"]'::jsonb,
 ARRAY['Preheat oven to 400F', 'Cut vegetables', 'Drizzle with oil', 'Roast 45 minutes'],
 ARRAY['healthy', 'vegetarian', 'roasted']),

('Classic Bruschetta', 
 'Fresh tomato topping with garlic and olive oil', 
 15, 0, 'easy', 6,
 '["3 large tomatoes", "1 small onion", "3 cloves garlic", "3 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
 ARRAY['Dice tomatoes', 'Chop onion and garlic', 'Mix with oil and salt', 'Marinate 15 minutes'],
 ARRAY['appetizer', 'italian', 'fresh']),

('Caramelized Onion Compote', 
 'Sweet caramelized onions with fresh tomatoes', 
 10, 30, 'medium', 3,
 '["3 large onions", "2 large tomatoes", "2 cloves garlic", "2 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
 ARRAY['Slice onions', 'Cook slowly until caramelized', 'Add garlic and tomatoes', 'Cook until soft'],
 ARRAY['condiment', 'vegetarian', 'caramelized']);

-- Get the recipe IDs for inserting ingredients
-- You'll need to run this after the above insert to get the actual IDs
SELECT id, title FROM recipes WHERE title IN (
  'Fresh Tomato Salad',
  'Simple Garlic Oil Sauce', 
  'Roasted Tomato & Onion',
  'Classic Bruschetta',
  'Caramelized Onion Compote'
) ORDER BY title;

-- Example ingredient inserts (adjust recipe_id values based on above query results)
-- Replace X, Y, Z, A, B with actual recipe IDs from the query above

-- INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
-- -- Fresh Tomato Salad (recipe_id = X)
-- (X, 1, 2, 'large'),      -- Tomato
-- (X, 2, 1, 'small'),      -- Onion  
-- (X, 3, 2, 'cloves'),     -- Garlic
-- (X, 4, 2, 'tbsp'),       -- Olive Oil
-- (X, 5, 0.5, 'tsp'),      -- Salt

-- -- Simple Garlic Oil Sauce (recipe_id = Y)
-- (Y, 3, 6, 'cloves'),     -- Garlic
-- (Y, 4, 8, 'tbsp'),       -- Olive Oil
-- (Y, 5, 1, 'tsp'),        -- Salt  
-- (Y, 2, 1, 'small'),      -- Onion

-- -- And so on for other recipes...

-- Verify the data
SELECT COUNT(*) as recipe_count FROM recipes;
SELECT COUNT(*) as ingredient_count FROM recipe_ingredients; 
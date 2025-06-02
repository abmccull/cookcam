-- Seed Test Recipes for CookCam Nutrition Testing
-- Uses existing ingredients: Tomato (1), Onion (2), Garlic (3), Olive Oil (4), Salt (5)

-- Insert test recipes
INSERT INTO recipes (
  title, 
  description, 
  prep_time, 
  cook_time, 
  difficulty, 
  servings,
  ingredients,
  instructions,
  tags,
  is_generated,
  created_at
) VALUES 

-- Recipe 1: Simple Tomato Salad
(
  'Fresh Tomato Salad',
  'A light and refreshing tomato salad with herbs and olive oil dressing',
  10,
  0,
  'easy',
  2,
  '["2 large tomatoes", "1 small onion", "2 cloves garlic", "2 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
  ARRAY['Wash and dice the tomatoes into bite-sized pieces', 'Finely chop the onion and mince the garlic', 'In a large bowl, combine tomatoes, onion, and garlic', 'Drizzle with olive oil and season with salt', 'Toss gently and let sit for 5 minutes before serving'],
  ARRAY['healthy', 'vegetarian', 'quick', 'mediterranean'],
  false,
  NOW()
),

-- Recipe 2: Garlic Olive Oil Pasta Sauce
(
  'Simple Garlic Oil Sauce',
  'Classic Italian aglio e olio - garlic and olive oil sauce perfect for pasta',
  5,
  15,
  'easy',
  4,
  '["6 cloves garlic", "1/2 cup olive oil", "1 tsp salt", "1 small onion (optional)"]'::jsonb,
  ARRAY['Slice garlic thinly and dice onion if using', 'Heat olive oil in a large pan over medium-low heat', 'Add garlic and cook until fragrant and lightly golden (2-3 minutes)', 'Add onion if using and cook until softened', 'Season with salt and remove from heat', 'Toss with cooked pasta and serve immediately'],
  ARRAY['italian', 'vegetarian', 'quick', 'pasta'],
  false,
  NOW()
),

-- Recipe 3: Roasted Tomato and Onion
(
  'Roasted Tomato & Onion Medley',
  'Slow-roasted vegetables with garlic and herbs - perfect as a side dish',
  15,
  45,
  'medium',
  4,
  '["4 large tomatoes", "2 medium onions", "4 cloves garlic", "3 tbsp olive oil", "1 tsp salt"]'::jsonb,
  ARRAY['Preheat oven to 400°F (200°C)', 'Cut tomatoes and onions into wedges', 'Mince garlic or leave whole cloves', 'Place vegetables on a baking sheet', 'Drizzle with olive oil and season with salt', 'Roast for 45 minutes until caramelized and tender', 'Serve hot as a side dish'],
  ARRAY['healthy', 'vegetarian', 'roasted', 'mediterranean'],
  false,
  NOW()
),

-- Recipe 4: Quick Tomato Bruschetta Topping
(
  'Classic Tomato Bruschetta',
  'Fresh tomato topping with garlic and olive oil - perfect for appetizers',
  15,
  0,
  'easy',
  6,
  '["3 large tomatoes", "1 small onion", "3 cloves garlic", "3 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
  ARRAY['Dice tomatoes and remove excess juice', 'Finely chop onion and mince garlic', 'Combine tomatoes, onion, and garlic in a bowl', 'Add olive oil and salt, mix well', 'Let marinate for 15 minutes', 'Serve on toasted bread or crackers'],
  ARRAY['appetizer', 'italian', 'fresh', 'quick'],
  false,
  NOW()
),

-- Recipe 5: Caramelized Onion with Tomatoes
(
  'Caramelized Onion & Tomato Compote',
  'Sweet caramelized onions with fresh tomatoes - great as a condiment or side',
  10,
  30,
  'medium',
  3,
  '["3 large onions", "2 large tomatoes", "2 cloves garlic", "2 tbsp olive oil", "1/2 tsp salt"]'::jsonb,
  ARRAY['Slice onions thinly and dice tomatoes', 'Heat olive oil in a large skillet over medium heat', 'Add onions and cook slowly until caramelized (20-25 minutes)', 'Add minced garlic and cook for 1 minute', 'Add tomatoes and salt, cook until softened', 'Serve warm or at room temperature'],
  ARRAY['condiment', 'vegetarian', 'caramelized', 'slow-cooked'],
  false,
  NOW()
);

-- Get the recipe IDs for the recipe_ingredients inserts
-- Note: You may need to adjust these IDs based on your actual inserted recipe IDs

-- Insert recipe ingredients relationships
-- Recipe 1: Fresh Tomato Salad
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
((SELECT id FROM recipes WHERE title = 'Fresh Tomato Salad'), 1, 2, 'large'),      -- Tomato
((SELECT id FROM recipes WHERE title = 'Fresh Tomato Salad'), 2, 1, 'small'),      -- Onion
((SELECT id FROM recipes WHERE title = 'Fresh Tomato Salad'), 3, 2, 'cloves'),     -- Garlic
((SELECT id FROM recipes WHERE title = 'Fresh Tomato Salad'), 4, 2, 'tbsp'),       -- Olive Oil
((SELECT id FROM recipes WHERE title = 'Fresh Tomato Salad'), 5, 0.5, 'tsp');      -- Salt

-- Recipe 2: Simple Garlic Oil Sauce
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
((SELECT id FROM recipes WHERE title = 'Simple Garlic Oil Sauce'), 3, 6, 'cloves'),  -- Garlic
((SELECT id FROM recipes WHERE title = 'Simple Garlic Oil Sauce'), 4, 8, 'tbsp'),    -- Olive Oil (1/2 cup = 8 tbsp)
((SELECT id FROM recipes WHERE title = 'Simple Garlic Oil Sauce'), 5, 1, 'tsp'),     -- Salt
((SELECT id FROM recipes WHERE title = 'Simple Garlic Oil Sauce'), 2, 1, 'small');   -- Onion (optional)

-- Recipe 3: Roasted Tomato & Onion Medley
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
((SELECT id FROM recipes WHERE title = 'Roasted Tomato & Onion Medley'), 1, 4, 'large'),     -- Tomato
((SELECT id FROM recipes WHERE title = 'Roasted Tomato & Onion Medley'), 2, 2, 'medium'),    -- Onion
((SELECT id FROM recipes WHERE title = 'Roasted Tomato & Onion Medley'), 3, 4, 'cloves'),    -- Garlic
((SELECT id FROM recipes WHERE title = 'Roasted Tomato & Onion Medley'), 4, 3, 'tbsp'),      -- Olive Oil
((SELECT id FROM recipes WHERE title = 'Roasted Tomato & Onion Medley'), 5, 1, 'tsp');       -- Salt

-- Recipe 4: Classic Tomato Bruschetta
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
((SELECT id FROM recipes WHERE title = 'Classic Tomato Bruschetta'), 1, 3, 'large'),     -- Tomato
((SELECT id FROM recipes WHERE title = 'Classic Tomato Bruschetta'), 2, 1, 'small'),     -- Onion
((SELECT id FROM recipes WHERE title = 'Classic Tomato Bruschetta'), 3, 3, 'cloves'),    -- Garlic
((SELECT id FROM recipes WHERE title = 'Classic Tomato Bruschetta'), 4, 3, 'tbsp'),      -- Olive Oil
((SELECT id FROM recipes WHERE title = 'Classic Tomato Bruschetta'), 5, 0.5, 'tsp');     -- Salt

-- Recipe 5: Caramelized Onion & Tomato Compote
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
((SELECT id FROM recipes WHERE title = 'Caramelized Onion & Tomato Compote'), 2, 3, 'large'),     -- Onion
((SELECT id FROM recipes WHERE title = 'Caramelized Onion & Tomato Compote'), 1, 2, 'large'),     -- Tomato
((SELECT id FROM recipes WHERE title = 'Caramelized Onion & Tomato Compote'), 3, 2, 'cloves'),    -- Garlic
((SELECT id FROM recipes WHERE title = 'Caramelized Onion & Tomato Compote'), 4, 2, 'tbsp'),      -- Olive Oil
((SELECT id FROM recipes WHERE title = 'Caramelized Onion & Tomato Compote'), 5, 0.5, 'tsp');     -- Salt

-- Verify the data was inserted
SELECT 
  r.id,
  r.title,
  r.servings,
  r.prep_time,
  r.cook_time,
  r.difficulty,
  COUNT(ri.id) as ingredient_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE r.title IN (
  'Fresh Tomato Salad',
  'Simple Garlic Oil Sauce', 
  'Roasted Tomato & Onion Medley',
  'Classic Tomato Bruschetta',
  'Caramelized Onion & Tomato Compote'
)
GROUP BY r.id, r.title, r.servings, r.prep_time, r.cook_time, r.difficulty
ORDER BY r.title; 
-- Fix RLS Policies Migration
-- Add missing RLS policies for recipe generation tables

-- Enable RLS on tables if not already enabled
ALTER TABLE ingredient_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_previews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view their own ingredient scans" ON ingredient_scans;
DROP POLICY IF EXISTS "Users can insert their own ingredient scans" ON ingredient_scans;
DROP POLICY IF EXISTS "Users can update their own ingredient scans" ON ingredient_scans;

DROP POLICY IF EXISTS "Users can view public recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;

DROP POLICY IF EXISTS "Users can view their own cooking sessions" ON cooking_sessions;
DROP POLICY IF EXISTS "Users can insert their own cooking sessions" ON cooking_sessions;
DROP POLICY IF EXISTS "Users can update their own cooking sessions" ON cooking_sessions;

DROP POLICY IF EXISTS "Users can view their own recipe previews" ON recipe_previews;
DROP POLICY IF EXISTS "Users can insert their own recipe previews" ON recipe_previews;
DROP POLICY IF EXISTS "Users can update their own recipe previews" ON recipe_previews;

-- INGREDIENT_SCANS policies
CREATE POLICY "Users can view their own ingredient scans" 
ON ingredient_scans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingredient scans" 
ON ingredient_scans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredient scans" 
ON ingredient_scans FOR UPDATE 
USING (auth.uid() = user_id);

-- RECIPES policies  
CREATE POLICY "Users can view public recipes" 
ON recipes FOR SELECT 
USING (is_published = true OR created_by = auth.uid());

CREATE POLICY "Users can insert their own recipes" 
ON recipes FOR INSERT 
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Users can update their own recipes" 
ON recipes FOR UPDATE 
USING (created_by = auth.uid());

-- COOKING_SESSIONS policies
CREATE POLICY "Users can view their own cooking sessions" 
ON cooking_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooking sessions" 
ON cooking_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooking sessions" 
ON cooking_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- RECIPE_PREVIEWS policies
CREATE POLICY "Users can view their own recipe previews" 
ON recipe_previews FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipe previews" 
ON recipe_previews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipe previews" 
ON recipe_previews FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredient_scans_user_id ON ingredient_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_scans_created_at ON ingredient_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_user_id ON cooking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_session_id ON cooking_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_recipe_previews_user_id ON recipe_previews(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_previews_session_id ON recipe_previews(session_id);
CREATE INDEX IF NOT EXISTS idx_recipe_previews_preview_id ON recipe_previews(preview_id);

-- Fix duplicate key constraint by making preview_id more unique
-- First, let's remove the unique constraint if it exists
ALTER TABLE recipe_previews DROP CONSTRAINT IF EXISTS recipe_previews_preview_id_key;

-- Add a composite unique constraint instead (session + preview_id should be unique)
ALTER TABLE recipe_previews ADD CONSTRAINT recipe_previews_session_preview_unique 
UNIQUE (session_id, preview_id);

COMMENT ON TABLE ingredient_scans IS 'Stores ingredient detection results from user scans';
COMMENT ON TABLE recipes IS 'Stores recipe data with AI-generated and user-created content';
COMMENT ON TABLE cooking_sessions IS 'Tracks user cooking sessions and preferences'; 
COMMENT ON TABLE recipe_previews IS 'Stores recipe preview data for two-step generation'; 
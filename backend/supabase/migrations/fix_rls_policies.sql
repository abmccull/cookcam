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

-- Fix RLS Policies for CookCam Backend
-- Run this in Supabase SQL Editor to resolve RLS violations

-- 1. Fix user_progress table (for XP system)
DROP POLICY IF EXISTS "Allow XP function to insert progress" ON user_progress;
CREATE POLICY "Allow XP function to insert progress" ON user_progress
  FOR INSERT WITH CHECK (true);

-- Also ensure users can insert their own progress
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Fix ingredient_scans table 
DROP POLICY IF EXISTS "Users can view their own scans" ON ingredient_scans;
CREATE POLICY "Users can view their own scans" ON ingredient_scans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scans" ON ingredient_scans;
CREATE POLICY "Users can insert their own scans" ON ingredient_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scans" ON ingredient_scans;
CREATE POLICY "Users can update their own scans" ON ingredient_scans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all scans" ON ingredient_scans;
CREATE POLICY "Service role can manage all scans" ON ingredient_scans
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Fix cooking_sessions table
DROP POLICY IF EXISTS "Users can manage their own cooking sessions" ON cooking_sessions;
CREATE POLICY "Users can manage their own cooking sessions" ON cooking_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Fix recipe_previews table
DROP POLICY IF EXISTS "Users can manage their own recipe previews" ON recipe_previews;
CREATE POLICY "Users can manage their own recipe previews" ON recipe_previews
  FOR ALL USING (auth.uid() = user_id);

-- 5. Update the add_user_xp function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB
SECURITY DEFINER  -- This allows function to bypass RLS
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_total_xp INTEGER;
  v_new_total_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Get current user stats
  SELECT COALESCE(total_xp, 0), COALESCE(level, 1) 
  INTO v_old_total_xp, v_old_level
  FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Calculate new XP and level
  v_new_total_xp := v_old_total_xp + p_xp_amount;
  v_new_level := FLOOR(v_new_total_xp / 100.0) + 1;  -- 100 XP per level
  v_level_up := v_new_level > v_old_level;
  
  -- Update user's total XP and level
  UPDATE users 
  SET total_xp = v_new_total_xp, 
      xp = v_new_total_xp,
      level = v_new_level,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert progress record (SECURITY DEFINER allows this to bypass RLS)
  INSERT INTO user_progress (
    user_id, action, xp_gained, total_xp, old_level, new_level, metadata, created_at
  ) VALUES (
    p_user_id, p_action, p_xp_amount, v_new_total_xp, v_old_level, v_new_level, p_metadata, NOW()
  );
  
  -- Return result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'xp_gained', p_xp_amount,
    'old_total_xp', v_old_total_xp,
    'new_total_xp', v_new_total_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'action', p_action
  );
  
  RETURN v_result;
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, JSONB) TO authenticated, service_role;

-- 7. Ensure all required tables have proper RLS policies
-- Enable RLS on any tables that might not have it
ALTER TABLE ingredient_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_previews ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS policies fixed successfully! XP system and scanning should now work.' as status; 
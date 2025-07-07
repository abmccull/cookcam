-- Safe RLS Fix for CookCam Backend
-- Focuses on critical issues: ingredient_scans, user_progress, and XP system

-- 1. Fix user_progress table (for XP system)
DROP POLICY IF EXISTS "Allow XP function to insert progress" ON user_progress;
CREATE POLICY "Allow XP function to insert progress" ON user_progress
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Fix ingredient_scans table - Critical for scanning functionality
DROP POLICY IF EXISTS "Users can view their own scans" ON ingredient_scans;
CREATE POLICY "Users can view their own scans" ON ingredient_scans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scans" ON ingredient_scans;
CREATE POLICY "Users can insert their own scans" ON ingredient_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scans" ON ingredient_scans;
CREATE POLICY "Users can update their own scans" ON ingredient_scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to manage all scans (for backend operations)
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

-- 6. Ensure RLS is enabled on critical tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_previews ENABLE ROW LEVEL SECURITY;

-- 7. Create essential indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_ingredient_scans_user_id ON ingredient_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_scans_created_at ON ingredient_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE ingredient_scans TO authenticated;
GRANT ALL ON TABLE user_progress TO authenticated;
GRANT ALL ON TABLE cooking_sessions TO authenticated;
GRANT ALL ON TABLE recipe_previews TO authenticated;

-- Comments for clarity
COMMENT ON POLICY "Users can insert their own scans" ON ingredient_scans IS 'Critical for scanning functionality';
COMMENT ON POLICY "Allow XP function to insert progress" ON user_progress IS 'Critical for XP system to work';
COMMENT ON FUNCTION add_user_xp IS 'XP function with SECURITY DEFINER to bypass RLS for progress tracking'; 
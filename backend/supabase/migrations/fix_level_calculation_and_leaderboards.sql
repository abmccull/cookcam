-- Fix Level Calculation and Leaderboard Issues
-- This migration corrects the level calculation formula to use proper thresholds
-- and fixes leaderboard data aggregation problems

-- 1. First, create the correct level calculation function
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level_thresholds INTEGER[] := ARRAY[0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600];
  i INTEGER;
BEGIN
  -- Start from highest level and work down
  FOR i IN REVERSE array_length(level_thresholds, 1)..1 LOOP
    IF total_xp >= level_thresholds[i] THEN
      RETURN i;
    END IF;
  END LOOP;
  
  -- Default to level 1
  RETURN 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update the add_user_xp function with correct level calculation
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  user_id UUID,
  old_xp INTEGER,
  new_xp INTEGER,
  old_level INTEGER,
  new_level INTEGER,
  level_up BOOLEAN
) AS $$
DECLARE
  current_user RECORD;
  new_total_xp INTEGER;
  new_level INTEGER;
  old_level INTEGER;
  level_changed BOOLEAN := FALSE;
BEGIN
  -- Get current user stats
  SELECT 
    u.total_xp, 
    u.level, 
    u.xp
  INTO current_user
  FROM users u 
  WHERE u.id = p_user_id;
  
  -- If user doesn't exist, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate new totals
  new_total_xp := COALESCE(current_user.total_xp, 0) + p_xp_amount;
  old_level := COALESCE(current_user.level, 1);
  
  -- Calculate new level using correct threshold function
  new_level := calculate_level_from_xp(new_total_xp);
  level_changed := new_level > old_level;
  
  -- Update user stats
  UPDATE users 
  SET 
    total_xp = new_total_xp,
    xp = new_total_xp,
    level = new_level,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert progress record
  INSERT INTO user_progress (
    user_id,
    action,
    xp_gained,
    total_xp,
    old_level,
    new_level,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_xp_amount,
    new_total_xp,
    old_level,
    new_level,
    p_metadata,
    NOW()
  );
  
  -- Return the results
  RETURN QUERY SELECT 
    p_user_id,
    COALESCE(current_user.total_xp, 0),
    new_total_xp,
    old_level,
    new_level,
    level_changed;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix existing user levels using correct calculation
UPDATE users 
SET level = calculate_level_from_xp(total_xp)
WHERE total_xp > 0;

-- 4. Create function for leaderboard aggregation
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_period TEXT DEFAULT 'weekly',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  rank INTEGER,
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  level INTEGER,
  is_creator BOOLEAN,
  creator_tier INTEGER,
  xp_total INTEGER,
  xp_gained INTEGER
) AS $$
DECLARE
  start_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
BEGIN
  -- Calculate date range based on period
  end_date := NOW();
  
  CASE p_period
    WHEN 'daily' THEN
      start_date := DATE_TRUNC('day', NOW());
    WHEN 'weekly' THEN
      start_date := DATE_TRUNC('week', NOW());
    WHEN 'monthly' THEN
      start_date := DATE_TRUNC('month', NOW());
    WHEN 'allTime' THEN
      -- For all-time, just use total_xp from users table
      RETURN QUERY
      SELECT 
        ROW_NUMBER() OVER (ORDER BY u.total_xp DESC)::INTEGER as rank,
        u.id as user_id,
        u.name,
        u.avatar_url,
        u.level,
        u.is_creator,
        COALESCE(u.creator_tier, 0) as creator_tier,
        COALESCE(u.total_xp, 0) as xp_total,
        0 as xp_gained
      FROM users u
      WHERE u.total_xp > 0
      ORDER BY u.total_xp DESC
      LIMIT p_limit;
      RETURN;
    ELSE
      start_date := DATE_TRUNC('week', NOW());
  END CASE;
  
  -- For daily/weekly/monthly, aggregate XP gained in period
  RETURN QUERY
  WITH period_xp AS (
    SELECT 
      up.user_id,
      SUM(up.xp_gained) as period_xp_total
    FROM user_progress up
    WHERE up.created_at >= start_date 
      AND up.created_at <= end_date
    GROUP BY up.user_id
    HAVING SUM(up.xp_gained) > 0
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY px.period_xp_total DESC)::INTEGER as rank,
    u.id as user_id,
    u.name,
    u.avatar_url,
    u.level,
    u.is_creator,
    COALESCE(u.creator_tier, 0) as creator_tier,
    COALESCE(u.total_xp, 0) as xp_total,
    px.period_xp_total::INTEGER as xp_gained
  FROM period_xp px
  JOIN users u ON u.id = px.user_id
  ORDER BY px.period_xp_total DESC
  LIMIT p_limit;
  
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_data(TEXT, INTEGER) TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_period_lookup 
  ON user_progress(user_id, created_at DESC, xp_gained);
CREATE INDEX IF NOT EXISTS idx_users_leaderboard 
  ON users(total_xp DESC) WHERE total_xp > 0;

-- Success message
SELECT 'Level calculation and leaderboard fixes applied successfully!' as status; 
-- Step 2: Create Database Functions
-- Run this second in Supabase SQL Editor

-- Create performance metrics function
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS TABLE(
  avg_response_time NUMERIC,
  total_requests BIGINT,
  error_rate NUMERIC,
  measured_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Return mock data for now - in production this would analyze request logs
  RETURN QUERY SELECT 
    150.5::NUMERIC as avg_response_time,
    1000::BIGINT as total_requests, 
    0.5::NUMERIC as error_rate,
    NOW() as measured_at;
END;
$$ LANGUAGE plpgsql;

-- Create user XP function for gamification
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
  user_data RECORD;
  new_total_xp INTEGER;
  new_level INTEGER;
  old_level INTEGER;
  level_changed BOOLEAN := FALSE;
BEGIN
  -- Get current user stats from auth.users metadata or create default
  SELECT 
    COALESCE((raw_user_meta_data->>'total_xp')::INTEGER, 0) as total_xp,
    COALESCE((raw_user_meta_data->>'level')::INTEGER, 1) as level
  INTO user_data
  FROM auth.users 
  WHERE id = p_user_id;
  
  -- If user doesn't exist, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate new totals
  new_total_xp := COALESCE(user_data.total_xp, 0) + p_xp_amount;
  old_level := COALESCE(user_data.level, 1);
  
  -- Calculate new level (simple formula: level = floor(total_xp / 100) + 1, max level 100)
  new_level := LEAST(FLOOR(new_total_xp / 100.0) + 1, 100);
  level_changed := new_level > old_level;
  
  -- Update user metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::JSONB) || 
                        jsonb_build_object(
                          'total_xp', new_total_xp,
                          'level', new_level,
                          'updated_at', NOW()
                        )
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
    COALESCE(user_data.total_xp, 0),
    new_total_xp,
    old_level,
    new_level,
    level_changed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Step 2: Database functions created successfully!' as status; 
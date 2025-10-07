-- Add user XP function for CookCam gamification
-- This function handles XP addition, level calculation, and progress tracking

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER, TEXT);

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
  
  -- Calculate new level using progressive formula: 100 + (level * 50) + (level^2 * 10)
  -- This matches the frontend calculation for consistency
  new_level := 1;
  FOR potential_level IN 1..100 LOOP
    DECLARE
      base_xp INTEGER := 100;
      linear_mult INTEGER := 50;
      quad_mult INTEGER := 10;
      xp_for_level INTEGER;
      total_xp_needed INTEGER := 0;
    BEGIN
      -- Calculate cumulative XP needed for this level
      FOR calc_level IN 1..potential_level LOOP
        xp_for_level := base_xp + (calc_level * linear_mult) + (calc_level * calc_level * quad_mult);
        total_xp_needed := total_xp_needed + xp_for_level;
      END LOOP;
      
      IF new_total_xp >= total_xp_needed THEN
        new_level := potential_level + 1;
      ELSE
        EXIT;
      END IF;
    END;
  END LOOP;
  
  new_level := LEAST(new_level, 100);
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, JSONB) TO authenticated;

-- Create a simple version for backwards compatibility
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT
)
RETURNS TABLE(
  user_id UUID,
  old_xp INTEGER,
  new_xp INTEGER,
  old_level INTEGER,
  new_level INTEGER,
  level_up BOOLEAN
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM add_user_xp(p_user_id, p_xp_amount, p_action, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT) TO authenticated; 
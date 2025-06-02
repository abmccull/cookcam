-- ==========================================
-- Fix Missing Columns in Recipes Table
-- ==========================================
-- Add missing columns that are expected by the gamification system

-- Add missing columns to recipes table if they don't exist
DO $$ 
BEGIN
    -- Check and add rating_avg column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'rating_avg') THEN
        ALTER TABLE recipes ADD COLUMN rating_avg DECIMAL(3,2) DEFAULT 0;
        RAISE NOTICE '✅ Added rating_avg column to recipes table';
    ELSE
        RAISE NOTICE '✅ rating_avg column already exists';
    END IF;

    -- Check and add rating_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'rating_count') THEN
        ALTER TABLE recipes ADD COLUMN rating_count INT DEFAULT 0;
        RAISE NOTICE '✅ Added rating_count column to recipes table';
    ELSE
        RAISE NOTICE '✅ rating_count column already exists';
    END IF;

    -- Check and add trending_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'trending_score') THEN
        ALTER TABLE recipes ADD COLUMN trending_score DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added trending_score column to recipes table';
    ELSE
        RAISE NOTICE '✅ trending_score column already exists';
    END IF;

    -- Check and add is_featured column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'is_featured') THEN
        ALTER TABLE recipes ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_featured column to recipes table';
    ELSE
        RAISE NOTICE '✅ is_featured column already exists';
    END IF;

    -- Check and add creator_id column (might be named differently)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'creator_id') THEN
        -- Check if created_by exists and we need to alias it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'created_by') THEN
            -- Create a view or just note that created_by should be used as creator_id
            RAISE NOTICE '✅ created_by column exists (use as creator_id)';
        ELSE
            ALTER TABLE recipes ADD COLUMN creator_id UUID REFERENCES users(id);
            RAISE NOTICE '✅ Added creator_id column to recipes table';
        END IF;
    ELSE
        RAISE NOTICE '✅ creator_id column already exists';
    END IF;

END $$;

-- ==========================================
-- Essential Gamification SQL Functions
-- ==========================================

-- Function to calculate user level from total XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp INT)
RETURNS INT AS $$
DECLARE
  level INT := 1;
  required_xp INT := 0;
BEGIN
  -- Level progression: 0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000
  WHILE required_xp <= total_xp LOOP
    level := level + 1;
    required_xp := required_xp + (level * 50) + ((level - 1) * 50);
  END LOOP;
  
  RETURN level - 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP required for next level
CREATE OR REPLACE FUNCTION xp_for_next_level(current_level INT)
RETURNS INT AS $$
DECLARE
  total_required INT := 0;
  i INT;
BEGIN
  FOR i IN 1..current_level LOOP
    total_required := total_required + (i * 50) + ((i - 1) * 50);
  END LOOP;
  
  RETURN total_required;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP and handle level up
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INT,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_current_xp INT;
  v_current_total_xp INT;
  v_current_level INT;
  v_new_xp INT;
  v_new_total_xp INT;
  v_new_level INT;
  v_level_up BOOLEAN := false;
BEGIN
  -- Get current user stats (handle missing user gracefully)
  SELECT COALESCE(xp, 0), COALESCE(total_xp, 0), COALESCE(level, 1) 
  INTO v_current_xp, v_current_total_xp, v_current_level
  FROM users WHERE id = p_user_id;
  
  -- If user doesn't exist, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Calculate new values
  v_new_total_xp := v_current_total_xp + p_xp_amount;
  v_new_level := calculate_level(v_new_total_xp);
  
  -- Calculate XP in current level
  IF v_new_level > v_current_level THEN
    v_level_up := true;
    v_new_xp := v_new_total_xp - xp_for_next_level(v_new_level - 1);
  ELSE
    v_new_xp := v_current_xp + p_xp_amount;
  END IF;
  
  -- Update user
  UPDATE users 
  SET xp = v_new_xp,
      total_xp = v_new_total_xp,
      level = v_new_level,
      last_active = now()
  WHERE id = p_user_id;
  
  -- Log progress
  INSERT INTO user_progress (user_id, action, xp_gained, total_xp, old_level, new_level, metadata)
  VALUES (p_user_id, p_action, p_xp_amount, v_new_total_xp, v_current_level, v_new_level, p_metadata);
  
  RETURN jsonb_build_object(
    'xp_gained', p_xp_amount,
    'new_xp', v_new_xp,
    'new_total_xp', v_new_total_xp,
    'old_level', v_current_level,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check and update user streak
CREATE OR REPLACE FUNCTION check_user_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_streak_date DATE;
  v_current_streak INT;
  v_today DATE := CURRENT_DATE;
  v_streak_broken BOOLEAN := false;
  v_streak_shields INT;
BEGIN
  -- Get current streak info
  SELECT COALESCE(streak_current, 0), COALESCE(streak_shields, 0) 
  INTO v_current_streak, v_streak_shields
  FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Get last streak date
  SELECT streak_date INTO v_last_streak_date
  FROM streaks 
  WHERE user_id = p_user_id 
  ORDER BY streak_date DESC 
  LIMIT 1;
  
  -- Check if streak is broken
  IF v_last_streak_date IS NULL THEN
    -- First streak
    v_current_streak := 1;
  ELSIF v_last_streak_date = v_today THEN
    -- Already checked in today
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'current_streak', v_current_streak
    );
  ELSIF v_last_streak_date = v_today - 1 THEN
    -- Streak continues
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken
    v_streak_broken := true;
    v_current_streak := 1;
  END IF;
  
  -- Record today's streak
  INSERT INTO streaks (user_id, streak_date, completed)
  VALUES (p_user_id, v_today, true)
  ON CONFLICT (user_id, streak_date) DO NOTHING;
  
  -- Update user record
  UPDATE users 
  SET streak_current = v_current_streak
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'streak_broken', v_streak_broken,
    'shields_remaining', v_streak_shields
  );
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '🎯 Missing Columns Fixed and Gamification Functions Deployed!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   • Fixed missing recipe columns (rating_avg, rating_count, etc.)';
    RAISE NOTICE '   • Deployed core gamification SQL functions';
    RAISE NOTICE '   • calculate_level() - XP to level conversion';
    RAISE NOTICE '   • add_user_xp() - XP addition with level progression';
    RAISE NOTICE '   • check_user_streak() - Daily streak management';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready to test gamification API endpoints!';
END $$; 
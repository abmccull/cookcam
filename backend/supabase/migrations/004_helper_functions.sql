-- Helper functions for CookCam gamification

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
  v_unlocked_achievements UUID[];
BEGIN
  -- Get current user stats
  SELECT xp, total_xp, level INTO v_current_xp, v_current_total_xp, v_current_level
  FROM users WHERE id = p_user_id FOR UPDATE;
  
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
  
  -- Check for achievements (simplified example)
  -- In production, this would check all achievement conditions
  IF v_new_level >= 5 AND v_current_level < 5 THEN
    -- Award level 5 achievement
    INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at)
    SELECT p_user_id, id, true, now()
    FROM achievements 
    WHERE key = 'level_5_reached'
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id INTO v_unlocked_achievements;
  END IF;
  
  RETURN jsonb_build_object(
    'xp_gained', p_xp_amount,
    'new_xp', v_new_xp,
    'new_total_xp', v_new_total_xp,
    'old_level', v_current_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'unlocked_achievements', v_unlocked_achievements
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check and update user streak
CREATE OR REPLACE FUNCTION check_user_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_streak_date DATE;
  v_current_streak INT;
  v_streak_start DATE;
  v_today DATE := CURRENT_DATE;
  v_streak_broken BOOLEAN := false;
  v_streak_shields INT;
BEGIN
  -- Get current streak info
  SELECT streak_start, streak_current, streak_shields 
  INTO v_streak_start, v_current_streak, v_streak_shields
  FROM users WHERE id = p_user_id;
  
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
    v_streak_start := v_today;
  ELSIF v_last_streak_date = v_today THEN
    -- Already checked in today
    RETURN jsonb_build_object(
      'already_checked_in', true,
      'current_streak', v_current_streak
    );
  ELSIF v_last_streak_date = v_today - 1 THEN
    -- Streak continues
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_streak_date = v_today - 2 AND v_streak_shields > 0 THEN
    -- Use shield to save streak
    v_current_streak := v_current_streak + 1;
    v_streak_shields := v_streak_shields - 1;
    
    -- Mark shield used for missed day
    INSERT INTO streaks (user_id, streak_date, completed, shield_used)
    VALUES (p_user_id, v_today - 1, true, true);
  ELSE
    -- Streak broken
    v_streak_broken := true;
    v_current_streak := 1;
    v_streak_start := v_today;
  END IF;
  
  -- Record today's streak
  INSERT INTO streaks (user_id, streak_date, completed)
  VALUES (p_user_id, v_today, true)
  ON CONFLICT (user_id, streak_date) DO NOTHING;
  
  -- Update user record
  UPDATE users 
  SET streak_current = v_current_streak,
      streak_start = v_streak_start,
      streak_shields = v_streak_shields
  WHERE id = p_user_id;
  
  -- Award streak shields (1 shield per 7 days)
  IF v_current_streak % 7 = 0 AND NOT v_streak_broken THEN
    UPDATE users 
    SET streak_shields = streak_shields + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'streak_broken', v_streak_broken,
    'shields_remaining', v_streak_shields,
    'shield_used', v_last_streak_date = v_today - 2 AND v_streak_shields > 0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate mystery box rewards
CREATE OR REPLACE FUNCTION open_mystery_box(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_random FLOAT := random();
  v_rarity TEXT;
  v_reward_type TEXT;
  v_reward_value JSONB;
  v_xp_reward INT;
BEGIN
  -- Determine rarity (70% common, 25% rare, 5% ultra-rare)
  IF v_random <= 0.70 THEN
    v_rarity := 'common';
    v_xp_reward := 5 + floor(random() * 6)::INT; -- 5-10 XP
    v_reward_type := 'xp';
    v_reward_value := jsonb_build_object('xp', v_xp_reward);
  ELSIF v_random <= 0.95 THEN
    v_rarity := 'rare';
    -- Rare rewards: 25 XP, recipe unlock, or badge
    CASE floor(random() * 3)::INT
      WHEN 0 THEN
        v_xp_reward := 25;
        v_reward_type := 'xp';
        v_reward_value := jsonb_build_object('xp', v_xp_reward);
      WHEN 1 THEN
        v_reward_type := 'recipe_unlock';
        v_reward_value := jsonb_build_object('type', 'premium_recipe');
      ELSE
        v_reward_type := 'badge';
        v_reward_value := jsonb_build_object('badge_key', 'rare_finder');
    END CASE;
  ELSE
    v_rarity := 'ultra-rare';
    -- Ultra-rare rewards: 100 XP or free creator features
    IF random() < 0.5 THEN
      v_xp_reward := 100;
      v_reward_type := 'xp';
      v_reward_value := jsonb_build_object('xp', v_xp_reward);
    ELSE
      v_reward_type := 'creator_unlock';
      v_reward_value := jsonb_build_object('days', 30);
    END IF;
  END IF;
  
  -- Record the mystery box
  INSERT INTO mystery_boxes (user_id, rarity, reward_type, reward_value)
  VALUES (p_user_id, v_rarity, v_reward_type, v_reward_value);
  
  -- Apply XP reward if applicable
  IF v_reward_type = 'xp' THEN
    PERFORM add_user_xp(p_user_id, v_xp_reward, 'MYSTERY_BOX', 
      jsonb_build_object('rarity', v_rarity));
  END IF;
  
  RETURN jsonb_build_object(
    'rarity', v_rarity,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate creator tier
CREATE OR REPLACE FUNCTION calculate_creator_tier(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_follower_count INT;
  v_current_tier INT;
  v_new_tier INT;
  v_tier_name TEXT;
BEGIN
  -- Get follower count
  SELECT COUNT(*) INTO v_follower_count
  FROM user_follows
  WHERE following_id = p_user_id;
  
  -- Update follower count
  UPDATE users SET follower_count = v_follower_count WHERE id = p_user_id;
  
  -- Determine tier
  CASE
    WHEN v_follower_count >= 5000 THEN
      v_new_tier := 5;
      v_tier_name := 'Master Chef';
    WHEN v_follower_count >= 1000 THEN
      v_new_tier := 4;
      v_tier_name := 'Head Chef';
    WHEN v_follower_count >= 500 THEN
      v_new_tier := 3;
      v_tier_name := 'Station Chef';
    WHEN v_follower_count >= 100 THEN
      v_new_tier := 2;
      v_tier_name := 'Line Cook';
    ELSE
      v_new_tier := 1;
      v_tier_name := 'Sous Chef';
  END CASE;
  
  -- Get current tier
  SELECT creator_tier INTO v_current_tier FROM users WHERE id = p_user_id;
  
  -- Update if changed
  IF v_new_tier != COALESCE(v_current_tier, 0) THEN
    UPDATE users SET creator_tier = v_new_tier WHERE id = p_user_id;
    
    -- Record tier achievement
    INSERT INTO creator_tiers (user_id, tier, tier_name)
    VALUES (p_user_id, v_new_tier, v_tier_name);
  END IF;
  
  RETURN jsonb_build_object(
    'tier', v_new_tier,
    'tier_name', v_tier_name,
    'followers', v_follower_count,
    'tier_changed', v_new_tier != COALESCE(v_current_tier, 0)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trending score for recipes
CREATE OR REPLACE FUNCTION calculate_trending_score(
  p_view_count INT,
  p_rating_avg DECIMAL,
  p_rating_count INT,
  p_created_at TIMESTAMPTZ
)
RETURNS INT AS $$
DECLARE
  v_age_hours INT;
  v_score FLOAT;
BEGIN
  -- Calculate age in hours
  v_age_hours := EXTRACT(EPOCH FROM (now() - p_created_at)) / 3600;
  
  -- Trending score algorithm
  -- Considers: views, rating average, rating count, and recency
  v_score := (p_view_count * 1.0) + 
             (p_rating_avg * p_rating_count * 10.0) + 
             (100.0 / (v_age_hours + 2.0));
  
  RETURN FLOOR(v_score)::INT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update trending scores
CREATE OR REPLACE FUNCTION update_recipe_trending_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trending_score := calculate_trending_score(
    NEW.view_count,
    NEW.rating_avg,
    NEW.rating_count,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_trending_trigger
BEFORE INSERT OR UPDATE OF view_count, rating_avg, rating_count
ON recipes
FOR EACH ROW
EXECUTE FUNCTION update_recipe_trending_score(); 
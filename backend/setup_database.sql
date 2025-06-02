-- CookCam Database Setup Script
-- Copy and paste this into your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  streak_current INT DEFAULT 0,
  streak_shields INT DEFAULT 0,
  is_creator BOOLEAN DEFAULT FALSE,
  creator_tier INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  prep_time INT,
  cook_time INT,
  difficulty TEXT,
  servings INT,
  ingredients JSONB NOT NULL,
  instructions TEXT[],
  nutrition JSONB,
  tags TEXT[],
  cuisine TEXT,
  created_by UUID REFERENCES users(id),
  is_generated BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  ai_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_progress table for XP tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_gained INT NOT NULL,
  total_xp INT NOT NULL,
  old_level INT NOT NULL,
  new_level INT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create mystery_boxes table
CREATE TABLE IF NOT EXISTS mystery_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipe_sessions table for two-stage recipe generation
CREATE TABLE IF NOT EXISTS recipe_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ingredient_scans table
CREATE TABLE IF NOT EXISTS ingredient_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_ingredients JSONB NOT NULL,
  image_url TEXT,
  confidence_score FLOAT,
  scan_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Create recipe_ratings table
CREATE TABLE IF NOT EXISTS recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Essential functions for XP and gamification
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
  v_new_total_xp INT;
  v_new_level INT;
  v_level_up BOOLEAN := false;
BEGIN
  -- Get current user stats
  SELECT xp, total_xp, level INTO v_current_xp, v_current_total_xp, v_current_level
  FROM users WHERE id = p_user_id FOR UPDATE;
  
  -- Calculate new values
  v_new_total_xp := v_current_total_xp + p_xp_amount;
  v_new_level := calculate_level(v_new_total_xp);
  
  IF v_new_level > v_current_level THEN
    v_level_up := true;
  END IF;
  
  -- Update user
  UPDATE users 
  SET xp = xp + p_xp_amount,
      total_xp = v_new_total_xp,
      level = v_new_level
  WHERE id = p_user_id;
  
  -- Log progress
  INSERT INTO user_progress (user_id, action, xp_gained, total_xp, old_level, new_level, metadata)
  VALUES (p_user_id, p_action, p_xp_amount, v_new_total_xp, v_current_level, v_new_level, p_metadata);
  
  RETURN jsonb_build_object(
    'xp_gained', p_xp_amount,
    'new_total_xp', v_new_total_xp,
    'old_level', v_current_level,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate mystery box rewards
CREATE OR REPLACE FUNCTION trigger_mystery_box(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_random FLOAT := random();
  v_rarity TEXT;
  v_reward_type TEXT;
  v_reward_value JSONB;
  v_xp_reward INT;
BEGIN
  -- 25% chance to trigger mystery box
  IF v_random > 0.25 THEN
    RETURN jsonb_build_object('triggered', false);
  END IF;

  -- Determine rarity (70% common, 25% rare, 4% epic, 1% legendary)
  IF v_random <= 0.175 THEN -- 70% of 25%
    v_rarity := 'common';
    v_xp_reward := 5 + floor(random() * 6)::INT; -- 5-10 XP
  ELSIF v_random <= 0.2375 THEN -- 25% of 25% 
    v_rarity := 'rare';
    v_xp_reward := 15 + floor(random() * 11)::INT; -- 15-25 XP
  ELSIF v_random <= 0.248 THEN -- 4% of 25%
    v_rarity := 'epic';
    v_xp_reward := 30 + floor(random() * 21)::INT; -- 30-50 XP
  ELSE -- 1% of 25%
    v_rarity := 'legendary';
    v_xp_reward := 75 + floor(random() * 26)::INT; -- 75-100 XP
  END IF;
  
  v_reward_type := 'xp';
  v_reward_value := jsonb_build_object('xp', v_xp_reward);
  
  -- Record the mystery box
  INSERT INTO mystery_boxes (user_id, rarity, reward_type, reward_value)
  VALUES (p_user_id, v_rarity, v_reward_type, v_reward_value);
  
  -- Award the XP
  PERFORM add_user_xp(p_user_id, v_xp_reward, 'mystery_box_opened', 
    jsonb_build_object('rarity', v_rarity));
  
  RETURN jsonb_build_object(
    'triggered', true,
    'rarity', v_rarity,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you can customize these further)
CREATE POLICY "Users can view all public profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public recipes visible to all" ON recipes FOR SELECT USING (is_published = true);
CREATE POLICY "Users can create recipes" ON recipes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own recipes" ON recipes FOR UPDATE USING (auth.uid() = created_by);

-- You're all set! 🎉 
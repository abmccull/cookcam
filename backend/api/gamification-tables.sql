-- ==========================================
-- CookCam Gamification Tables Setup
-- ==========================================
-- Run this in Supabase SQL Editor or via psql
-- This creates all tables needed for the full gamification experience

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Core User Management
-- ==========================================

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
  follower_count INT DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- XP and Progression System
-- ==========================================

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

-- ==========================================
-- Streak Management
-- ==========================================

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  shield_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_date)
);

-- ==========================================
-- Achievement System
-- ==========================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  xp_reward INT DEFAULT 0,
  rarity TEXT DEFAULT 'common',
  requirements JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, achievement_id)
);

-- ==========================================
-- Engagement Features
-- ==========================================

CREATE TABLE IF NOT EXISTS mystery_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  suggested_recipe TEXT,
  checkin_date DATE NOT NULL,
  xp_earned INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- ==========================================
-- Recipe System
-- ==========================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  difficulty TEXT,
  prep_time INT,
  cook_time INT,
  servings INT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  macros JSONB,
  image_url TEXT,
  is_claimed BOOLEAN DEFAULT FALSE,
  creator_id UUID REFERENCES users(id),
  view_count INT DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  trending_score INT DEFAULT 0,
  tags TEXT[],
  ai_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  xp_earned INT DEFAULT 100,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id)
);

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  taste_rating INT CHECK (taste_rating >= 1 AND taste_rating <= 5),
  difficulty_rating INT CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  accuracy_rating INT CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  review_text TEXT,
  is_helpful BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  collection_name TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, recipe_id)
);

-- ==========================================
-- Creator System
-- ==========================================

CREATE TABLE IF NOT EXISTS creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier INT NOT NULL,
  tier_name TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  uses INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents INT NOT NULL,
  period DATE NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Social Features
-- ==========================================

CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  period TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  xp_total INT NOT NULL,
  movement INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, period, user_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  requirements JSONB NOT NULL,
  xp_reward INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_challenges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, challenge_id)
);

-- ==========================================
-- Scanning System
-- ==========================================

CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ingredients_detected INT DEFAULT 0,
  xp_earned INT DEFAULT 10,
  mystery_box_triggered BOOLEAN DEFAULT FALSE,
  scan_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Performance Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_creator ON users(is_creator, creator_tier) WHERE is_creator = true;
CREATE INDEX IF NOT EXISTS idx_recipes_trending ON recipes(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_lookup ON leaderboards(type, period, rank);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_user_date ON streaks(user_id, streak_date DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category, rarity);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe ON recipe_ratings(recipe_id, overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id, checkin_date DESC);

-- ==========================================
-- Default Achievements Data
-- ==========================================

INSERT INTO achievements (key, name, description, category, xp_reward, rarity, requirements) VALUES
('first_scan', 'First Scan', 'Complete your first ingredient scan', 'scanning', 50, 'common', '{"scans": 1}'),
('scanner_pro', 'Scanner Pro', 'Complete 50 ingredient scans', 'scanning', 250, 'uncommon', '{"scans": 50}'),
('ingredient_detective', 'Ingredient Detective', 'Scan 20 unique ingredients', 'scanning', 300, 'rare', '{"unique_ingredients": 20}'),

('first_recipe', 'First Recipe', 'Generate your first recipe', 'recipes', 25, 'common', '{"recipes_generated": 1}'),
('recipe_master', 'Recipe Master', 'Generate 10 recipes', 'recipes', 200, 'rare', '{"recipes_generated": 10}'),
('culinary_genius', 'Culinary Genius', 'Generate 100 recipes', 'recipes', 1000, 'legendary', '{"recipes_generated": 100}'),

('streak_starter', 'Streak Starter', 'Maintain a 3-day streak', 'engagement', 100, 'common', '{"streak_days": 3}'),
('streak_warrior', 'Streak Warrior', 'Maintain a 7-day streak', 'engagement', 300, 'epic', '{"streak_days": 7}'),
('streak_legend', 'Streak Legend', 'Maintain a 30-day streak', 'engagement', 1500, 'legendary', '{"streak_days": 30}'),

('social_butterfly', 'Social Butterfly', 'Follow 5 creators', 'social', 100, 'uncommon', '{"follows": 5}'),
('community_leader', 'Community Leader', 'Get 100 followers as a creator', 'social', 500, 'epic', '{"followers": 100}'),

('daily_visitor', 'Daily Visitor', 'Complete 7 daily check-ins', 'engagement', 150, 'uncommon', '{"daily_checkins": 7}'),
('photo_enthusiast', 'Photo Enthusiast', 'Complete 30 daily check-ins', 'engagement', 500, 'rare', '{"daily_checkins": 30}'),

('mystery_hunter', 'Mystery Hunter', 'Open 10 mystery boxes', 'engagement', 200, 'rare', '{"mystery_boxes": 10}'),
('treasure_seeker', 'Treasure Seeker', 'Find a legendary reward', 'engagement', 500, 'epic', '{"legendary_rewards": 1}'),

('cuisine_explorer', 'Cuisine Explorer', 'Try 10 different cuisines', 'recipes', 250, 'uncommon', '{"cuisines_tried": 10}'),
('master_chef', 'Master Chef', 'Achieve level 10', 'progression', 1000, 'epic', '{"level": 10}'),
('grandmaster_chef', 'Grandmaster Chef', 'Achieve level 25', 'progression', 2500, 'legendary', '{"level": 25}')

ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- Default Challenges Data
-- ==========================================

INSERT INTO challenges (title, description, type, requirements, xp_reward, start_date, end_date) VALUES
('Weekly Scan Challenge', 'Complete 10 scans this week', 'scanning', '{"scans": 10}', 200, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Recipe Explorer', 'Generate 5 recipes from different cuisines', 'recipes', '{"recipes": 5, "unique_cuisines": true}', 300, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Daily Streak Master', 'Maintain your streak for 7 days', 'engagement', '{"streak_days": 7}', 500, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days')

ON CONFLICT DO NOTHING;

-- ==========================================
-- Row Level Security (RLS) Setup
-- Note: Run these after testing to enable security
-- ==========================================

-- Enable RLS on all user tables
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mystery_boxes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment and customize as needed)
-- CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check table creation
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
--   'users', 'user_progress', 'streaks', 'achievements', 'user_achievements',
--   'mystery_boxes', 'daily_checkins', 'recipes', 'recipe_claims', 'recipe_ratings',
--   'favorites', 'creator_tiers', 'referral_codes', 'commissions', 'leaderboards',
--   'challenges', 'user_challenges', 'scans'
-- );

-- Check achievements inserted
-- SELECT key, name, category, rarity FROM achievements ORDER BY category, rarity;

-- Check challenges inserted
-- SELECT title, type, xp_reward FROM challenges;

-- ==========================================
-- Success Message
-- ==========================================

DO $$ 
BEGIN 
    RAISE NOTICE '🎉 CookCam Gamification Tables Created Successfully!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   • 18 tables created';
    RAISE NOTICE '   • 10 performance indexes added';
    RAISE NOTICE '   • 15 default achievements inserted';
    RAISE NOTICE '   • 3 weekly challenges added';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   1. Test API endpoints';
    RAISE NOTICE '   2. Connect frontend to backend';
    RAISE NOTICE '   3. Enable RLS policies when ready';
END $$; 
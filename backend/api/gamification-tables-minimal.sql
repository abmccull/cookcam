-- ==========================================
-- CookCam Gamification Tables (MINIMAL SAFE VERSION)
-- ==========================================
-- This creates only the essential tables without problematic constraints

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Core User Management
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
-- 2. XP and Progression System
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
-- 3. Achievement System
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 4. Streak Management
-- ==========================================

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  shield_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. Engagement Features
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 6. Social Features
-- ==========================================

CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  period TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  xp_total INT NOT NULL,
  movement INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 7. Scanning System
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
-- 8. Recipe Ratings (Simplified)
-- ==========================================

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_rating INT NOT NULL,
  taste_rating INT,
  difficulty_rating INT,
  accuracy_rating INT,
  review_text TEXT,
  is_helpful BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 9. Favorites (Simplified)
-- ==========================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID,
  collection_name TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Basic Indexes (Only Safe Ones)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category, rarity);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);

-- ==========================================
-- Default Achievements Data
-- ==========================================

INSERT INTO achievements (key, name, description, category, xp_reward, rarity, requirements) VALUES
('first_scan', 'First Scan', 'Complete your first ingredient scan', 'scanning', 50, 'common', '{"scans": 1}'),
('scanner_pro', 'Scanner Pro', 'Complete 50 ingredient scans', 'scanning', 250, 'uncommon', '{"scans": 50}'),
('first_recipe', 'First Recipe', 'Generate your first recipe', 'recipes', 25, 'common', '{"recipes_generated": 1}'),
('recipe_master', 'Recipe Master', 'Generate 10 recipes', 'recipes', 200, 'rare', '{"recipes_generated": 10}'),
('streak_starter', 'Streak Starter', 'Maintain a 3-day streak', 'engagement', 100, 'common', '{"streak_days": 3}'),
('streak_warrior', 'Streak Warrior', 'Maintain a 7-day streak', 'engagement', 300, 'epic', '{"streak_days": 7}'),
('social_butterfly', 'Social Butterfly', 'Follow 5 creators', 'social', 100, 'uncommon', '{"follows": 5}'),
('daily_visitor', 'Daily Visitor', 'Complete 7 daily check-ins', 'engagement', 150, 'uncommon', '{"daily_checkins": 7}'),
('mystery_hunter', 'Mystery Hunter', 'Open 10 mystery boxes', 'engagement', 200, 'rare', '{"mystery_boxes": 10}'),
('master_chef', 'Master Chef', 'Achieve level 10', 'progression', 1000, 'epic', '{"level": 10}')

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
-- Success Message
-- ==========================================

DO $$ 
BEGIN 
    RAISE NOTICE '🎉 CookCam Minimal Gamification Tables Created Successfully!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   • 12 core gamification tables created';
    RAISE NOTICE '   • 4 safe performance indexes added';
    RAISE NOTICE '   • 10 essential achievements inserted';
    RAISE NOTICE '   • 3 starter challenges added';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready to test API endpoints!';
    RAISE NOTICE '   - Ingredient search: /api/ingredients/search';
    RAISE NOTICE '   - Achievements: /api/gamification/achievements';
    RAISE NOTICE '   - User progress: /api/gamification/xp';
    RAISE NOTICE '   - Challenges: /api/gamification/challenges';
END $$; 
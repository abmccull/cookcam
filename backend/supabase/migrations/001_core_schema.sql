-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Enhanced Users table with gamification
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  streak_start DATE,
  streak_current INT DEFAULT 0,
  streak_shields INT DEFAULT 0,
  is_creator BOOLEAN DEFAULT FALSE,
  creator_tier INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  install_ref TEXT,
  preferences JSONB DEFAULT '{}',
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Progress tracking
CREATE TABLE user_progress (
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

-- Streak management
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  shield_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_date)
);

-- Achievement system
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  xp_reward INT DEFAULT 0,
  rarity TEXT DEFAULT 'common',
  requirements JSONB NOT NULL
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, achievement_id)
);

-- Mystery Box system
CREATE TABLE mystery_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Check-ins
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  suggested_recipe TEXT,
  checkin_date DATE NOT NULL,
  xp_earned INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Enhanced Ingredients Master List
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  fdc_id INT UNIQUE NOT NULL,
  macros JSONB,
  category TEXT,
  common_pairings TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced Scans with gamification
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ingredients_detected INT DEFAULT 0,
  xp_earned INT DEFAULT 10,
  mystery_box_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan ingredients join table
CREATE TABLE scan_ingredients (
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity TEXT,
  unit TEXT,
  PRIMARY KEY(scan_id, ingredient_id)
);

-- Enhanced Recipes with creator attribution
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recipe Claims for creators
CREATE TABLE recipe_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  xp_earned INT DEFAULT 100,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id)
);

-- Recipe Ratings with sub-categories
CREATE TABLE recipe_ratings (
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

-- User Favorites with collections
CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  collection_name TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, recipe_id)
);

-- Creator system
CREATE TABLE creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier INT NOT NULL,
  tier_name TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now()
);

-- Referral and commission system
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  uses INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'referral', 'subscription', 'recipe_performance'
  amount_cents INT NOT NULL,
  period DATE NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  cooking_reminders BOOLEAN DEFAULT TRUE,
  streak_alerts BOOLEAN DEFAULT TRUE,
  achievement_updates BOOLEAN DEFAULT TRUE,
  social_activity BOOLEAN DEFAULT TRUE,
  challenge_invites BOOLEAN DEFAULT TRUE,
  recipe_performance BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  max_daily INT DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled notifications
CREATE TABLE scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leaderboards (cached for performance)
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'global', 'friends', 'cuisine'
  period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  xp_total INT NOT NULL,
  movement INT DEFAULT 0, -- rank change
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, period, user_id)
);

-- Weekly Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'cuisine', 'ingredient', 'social', 'streak'
  requirements JSONB NOT NULL,
  xp_reward INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_challenges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, challenge_id)
);

-- Social following system
CREATE TABLE user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX idx_users_level_xp ON users(level DESC, xp DESC);
CREATE INDEX idx_users_creator ON users(is_creator, creator_tier) WHERE is_creator = true;
CREATE INDEX idx_recipes_creator ON recipes(creator_id, created_at DESC) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_recipes_trending ON recipes(trending_score DESC);
CREATE INDEX idx_leaderboards_lookup ON leaderboards(type, period, rank);
CREATE INDEX idx_notifications_pending ON scheduled_notifications(scheduled_for, sent) WHERE sent = false;
CREATE INDEX idx_scans_user ON scans(user_id, created_at DESC);
CREATE INDEX idx_user_progress_user ON user_progress(user_id, created_at DESC);
CREATE INDEX idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY; 
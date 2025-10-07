-- Complete CookCam Database Setup
-- This script creates all necessary tables, functions, and RLS policies

-- 1. Create monitoring tables
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL,
  cpu_usage INTEGER,
  memory_usage INTEGER,
  database_latency INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slow_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  execution_time INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user progress table for gamification
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  old_level INTEGER DEFAULT 1,
  new_level INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create performance metrics function
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

-- 4. Add user XP function for gamification
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

-- 5. Create/update subscription tiers table
-- First, check if table exists and add missing columns
DO $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'price') THEN
    ALTER TABLE subscription_tiers ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'currency') THEN
    ALTER TABLE subscription_tiers ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'billing_period') THEN
    ALTER TABLE subscription_tiers ADD COLUMN billing_period TEXT DEFAULT 'monthly';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'features') THEN
    ALTER TABLE subscription_tiers ADD COLUMN features JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'limits') THEN
    ALTER TABLE subscription_tiers ADD COLUMN limits JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'revenue_share_percentage') THEN
    ALTER TABLE subscription_tiers ADD COLUMN revenue_share_percentage INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'active') THEN
    ALTER TABLE subscription_tiers ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END
$$;

-- 6. Insert default subscription tiers
INSERT INTO subscription_tiers (slug, name, price, features, limits) VALUES
('free', 'Free', 0, 
 '["Basic recipe generation", "5 scans per day", "Community recipes"]',
 '{"daily_scans": 5, "monthly_recipes": 10, "saved_recipes": 50}'),
('premium', 'Premium', 399,
 '["Unlimited scans", "Premium recipes", "Meal planning", "Nutrition tracking"]', 
 '{"monthly_recipes": 500, "saved_recipes": 1000}'),
('creator', 'Creator', 999,
 '["All Premium features", "Recipe publishing", "Analytics", "Revenue sharing"]',
 '{"saved_recipes": 5000}')
ON CONFLICT (slug) DO NOTHING;

-- 7. Enable RLS on all tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- System metrics (admin only)
CREATE POLICY "Allow service role access to system_metrics" ON system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Slow queries (admin only)  
CREATE POLICY "Allow service role access to slow_queries" ON slow_queries
  FOR ALL USING (auth.role() = 'service_role');

-- User progress (users can view their own)
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user progress" ON user_progress
  FOR ALL USING (auth.role() = 'service_role');

-- Subscription tiers (public read access)
CREATE POLICY "Anyone can view subscription tiers" ON subscription_tiers
  FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage subscription tiers" ON subscription_tiers
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION get_performance_metrics() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, JSONB) TO authenticated, service_role;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries(created_at);

-- Success message
SELECT 'CookCam database setup completed successfully!' as status; 
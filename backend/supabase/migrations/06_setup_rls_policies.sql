-- Step 6: Setup RLS Policies and Permissions
-- Run this sixth in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system metrics (admin only)
DROP POLICY IF EXISTS "Allow service role access to system_metrics" ON system_metrics;
CREATE POLICY "Allow service role access to system_metrics" ON system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for slow queries (admin only)  
DROP POLICY IF EXISTS "Allow service role access to slow_queries" ON slow_queries;
CREATE POLICY "Allow service role access to slow_queries" ON slow_queries
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for user progress (users can view their own)
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user progress" ON user_progress;
CREATE POLICY "Service role can manage user progress" ON user_progress
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for subscription tiers (public read access)
DROP POLICY IF EXISTS "Anyone can view subscription tiers" ON subscription_tiers;
CREATE POLICY "Anyone can view subscription tiers" ON subscription_tiers
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role can manage subscription tiers" ON subscription_tiers;
CREATE POLICY "Service role can manage subscription tiers" ON subscription_tiers
  FOR ALL USING (auth.role() = 'service_role');

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_performance_metrics() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, TEXT, JSONB) TO authenticated, service_role;

-- Success message
SELECT 'Step 6: RLS policies and permissions setup completed!' as status; 
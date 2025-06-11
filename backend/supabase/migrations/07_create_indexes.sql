-- Step 7: Create Performance Indexes
-- Run this seventh (final) in Supabase SQL Editor

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries(created_at);

-- Create additional useful indexes
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_slug ON subscription_tiers(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(active);
CREATE INDEX IF NOT EXISTS idx_system_metrics_status ON system_metrics(status);
CREATE INDEX IF NOT EXISTS idx_user_progress_action ON user_progress(action);

-- Success message
SELECT 'Step 7: All indexes created successfully!' as status;

-- Final completion message
SELECT 'CookCam database setup completed successfully! All scripts have been run.' as final_status; 
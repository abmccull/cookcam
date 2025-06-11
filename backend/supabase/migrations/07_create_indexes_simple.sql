-- Step 7: Create Essential Indexes (SIMPLE VERSION)
-- Run this if the safe version has DO block issues

-- Create basic indexes that should work on most common columns
-- These will fail silently if columns don't exist

-- Essential user_progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

-- Essential subscription_tiers indexes  
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_slug ON subscription_tiers(slug);

-- Try to create timestamp indexes (may fail if columns don't exist)
-- CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);
-- CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at); 
-- CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries(created_at);

-- Success message
SELECT 'Step 7: Essential indexes created!' as status;
SELECT 'CookCam database setup completed!' as final_status; 
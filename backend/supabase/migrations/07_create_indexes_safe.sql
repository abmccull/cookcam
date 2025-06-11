-- Step 7: Create Performance Indexes (SAFE VERSION)
-- Run this instead of the original step 7

-- Create indexes only if columns exist
DO $$
BEGIN
  -- Index on user_progress(user_id) - should always exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
  END IF;

  -- Index on user_progress(created_at) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_user_progress_created_at ON user_progress(created_at);
  END IF;

  -- Index on system_metrics(created_at) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_metrics' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
  END IF;

  -- Index on slow_queries(created_at) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slow_queries' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries(created_at);
  END IF;

  -- Index on subscription_tiers(slug) - should exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'slug') THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_tiers_slug ON subscription_tiers(slug);
  END IF;

  -- Index on subscription_tiers(active) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'active') THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active ON subscription_tiers(active);
  END IF;

  -- Index on system_metrics(status) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_metrics' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_system_metrics_status ON system_metrics(status);
  END IF;

  -- Index on user_progress(action) - check if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'action') THEN
    CREATE INDEX IF NOT EXISTS idx_user_progress_action ON user_progress(action);
  END IF;

END $$;

-- Success message
SELECT 'Step 7: Safe indexes created successfully!' as status;

-- Final completion message
SELECT 'CookCam database setup completed successfully!' as final_status; 
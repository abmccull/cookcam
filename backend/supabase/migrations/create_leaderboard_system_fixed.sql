-- =============================================================================
-- CookCam Leaderboard System - Complete Implementation
-- =============================================================================
-- This script creates a comprehensive leaderboard system with:
-- 1. Time-based XP aggregation (daily, weekly, monthly, all-time)
-- 2. Automatic leaderboard population
-- 3. Efficient ranking functions
-- 4. Performance optimized queries
-- =============================================================================

-- Drop existing functions and triggers if they exist
DROP FUNCTION IF EXISTS get_leaderboard_data(TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_leaderboard_rankings();
DROP FUNCTION IF EXISTS calculate_period_xp(UUID, TEXT);
DROP TRIGGER IF EXISTS update_leaderboard_on_xp_change ON user_progress;

-- =============================================================================
-- 1. Create Enhanced Leaderboard Views for Performance
-- =============================================================================

-- Daily XP aggregation view
CREATE OR REPLACE VIEW daily_xp_summary AS
SELECT 
  user_id,
  DATE(created_at) as date,
  SUM(xp_gained) as daily_xp,
  COUNT(*) as actions_count
FROM user_progress 
GROUP BY user_id, DATE(created_at);

-- Weekly XP aggregation view  
CREATE OR REPLACE VIEW weekly_xp_summary AS
SELECT 
  user_id,
  DATE_TRUNC('week', created_at) as week_start,
  SUM(xp_gained) as weekly_xp,
  COUNT(*) as actions_count
FROM user_progress 
GROUP BY user_id, DATE_TRUNC('week', created_at);

-- Monthly XP aggregation view
CREATE OR REPLACE VIEW monthly_xp_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) as month_start,
  SUM(xp_gained) as monthly_xp,
  COUNT(*) as actions_count
FROM user_progress 
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- =============================================================================
-- 2. Period XP Calculation Function
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_period_xp(
  p_user_id UUID,
  p_period TEXT
) RETURNS INTEGER AS $$
DECLARE
  period_xp INTEGER := 0;
  period_start TIMESTAMPTZ;
BEGIN
  -- Calculate start date based on period
  CASE p_period
    WHEN 'daily' THEN
      period_start := DATE_TRUNC('day', NOW());
    WHEN 'weekly' THEN
      period_start := DATE_TRUNC('week', NOW());
    WHEN 'monthly' THEN
      period_start := DATE_TRUNC('month', NOW());
    WHEN 'yearly' THEN
      period_start := DATE_TRUNC('year', NOW());
    ELSE
      -- 'allTime' or any other value returns total_xp
      SELECT COALESCE(total_xp, 0) INTO period_xp
      FROM users 
      WHERE id = p_user_id;
      RETURN period_xp;
  END CASE;

  -- Calculate XP gained in the specified period
  SELECT COALESCE(SUM(xp_gained), 0) INTO period_xp
  FROM user_progress 
  WHERE user_id = p_user_id 
    AND created_at >= period_start;

  RETURN period_xp;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. Main Leaderboard Data Function  
-- =============================================================================

CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_period TEXT DEFAULT 'weekly',
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE(
  rank INTEGER,
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  level INTEGER,
  total_xp INTEGER,
  xp_total INTEGER,  -- For compatibility
  xp_gained INTEGER,
  is_creator BOOLEAN,
  creator_tier INTEGER
) AS $$
BEGIN
  -- Return leaderboard based on period
  CASE p_period
    WHEN 'daily' THEN
      RETURN QUERY
      WITH daily_rankings AS (
        SELECT 
          u.id as user_id,
          u.name,
          u.avatar_url,
          u.level,
          u.total_xp,
          COALESCE(dxs.daily_xp, 0) as period_xp,
          u.is_creator,
          u.creator_tier
        FROM users u
        LEFT JOIN daily_xp_summary dxs ON u.id = dxs.user_id 
          AND dxs.date = CURRENT_DATE
        WHERE u.total_xp > 0
        ORDER BY COALESCE(dxs.daily_xp, 0) DESC, u.total_xp DESC
        LIMIT p_limit
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER as rank,
        dr.user_id,
        dr.name,
        dr.avatar_url,
        dr.level,
        dr.total_xp,
        dr.total_xp as xp_total,
        dr.period_xp as xp_gained,
        dr.is_creator,
        dr.creator_tier
      FROM daily_rankings dr;

    WHEN 'weekly' THEN
      RETURN QUERY
      WITH weekly_rankings AS (
        SELECT 
          u.id as user_id,
          u.name,
          u.avatar_url,
          u.level,
          u.total_xp,
          COALESCE(wxs.weekly_xp, 0) as period_xp,
          u.is_creator,
          u.creator_tier
        FROM users u
        LEFT JOIN weekly_xp_summary wxs ON u.id = wxs.user_id 
          AND wxs.week_start = DATE_TRUNC('week', NOW())
        WHERE u.total_xp > 0
        ORDER BY COALESCE(wxs.weekly_xp, 0) DESC, u.total_xp DESC
        LIMIT p_limit
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER as rank,
        wr.user_id,
        wr.name,
        wr.avatar_url,
        wr.level,
        wr.total_xp,
        wr.total_xp as xp_total,
        wr.period_xp as xp_gained,
        wr.is_creator,
        wr.creator_tier
      FROM weekly_rankings wr;

    WHEN 'monthly' THEN
      RETURN QUERY
      WITH monthly_rankings AS (
        SELECT 
          u.id as user_id,
          u.name,
          u.avatar_url,
          u.level,
          u.total_xp,
          COALESCE(mxs.monthly_xp, 0) as period_xp,
          u.is_creator,
          u.creator_tier
        FROM users u
        LEFT JOIN monthly_xp_summary mxs ON u.id = mxs.user_id 
          AND mxs.month_start = DATE_TRUNC('month', NOW())
        WHERE u.total_xp > 0
        ORDER BY COALESCE(mxs.monthly_xp, 0) DESC, u.total_xp DESC
        LIMIT p_limit
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER as rank,
        mr.user_id,
        mr.name,
        mr.avatar_url,
        mr.level,
        mr.total_xp,
        mr.total_xp as xp_total,
        mr.period_xp as xp_gained,
        mr.is_creator,
        mr.creator_tier
      FROM monthly_rankings mr;

    ELSE -- 'allTime' or default
      RETURN QUERY
      WITH alltime_rankings AS (
        SELECT 
          u.id as user_id,
          u.name,
          u.avatar_url,
          u.level,
          u.total_xp,
          u.is_creator,
          u.creator_tier
        FROM users u
        WHERE u.total_xp > 0
        ORDER BY u.total_xp DESC
        LIMIT p_limit
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER as rank,
        ar.user_id,
        ar.name,
        ar.avatar_url,
        ar.level,
        ar.total_xp,
        ar.total_xp as xp_total,
        ar.total_xp as xp_gained,  -- For all-time, show total XP
        ar.is_creator,
        ar.creator_tier
      FROM alltime_rankings ar;

  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. User Rank Lookup Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_period TEXT DEFAULT 'weekly'
) RETURNS TABLE(
  user_rank INTEGER,
  total_users INTEGER,
  user_xp INTEGER,
  period_xp INTEGER
) AS $$
DECLARE
  user_total_xp INTEGER;
  user_period_xp INTEGER;
  rank_position INTEGER;
  total_count INTEGER;
BEGIN
  -- Get user's total XP
  SELECT total_xp INTO user_total_xp
  FROM users 
  WHERE id = p_user_id;

  -- Get user's period XP
  user_period_xp := calculate_period_xp(p_user_id, p_period);

  -- Calculate rank based on period
  CASE p_period
    WHEN 'daily' THEN
      WITH daily_ranks AS (
        SELECT 
          u.id,
          COALESCE(dxs.daily_xp, 0) as period_xp
        FROM users u
        LEFT JOIN daily_xp_summary dxs ON u.id = dxs.user_id 
          AND dxs.date = CURRENT_DATE
        WHERE u.total_xp > 0
        ORDER BY COALESCE(dxs.daily_xp, 0) DESC, u.total_xp DESC
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER,
        COUNT(*)::INTEGER OVER()
      INTO rank_position, total_count
      FROM daily_ranks
      WHERE id = p_user_id;

    WHEN 'weekly' THEN
      WITH weekly_ranks AS (
        SELECT 
          u.id,
          COALESCE(wxs.weekly_xp, 0) as period_xp
        FROM users u
        LEFT JOIN weekly_xp_summary wxs ON u.id = wxs.user_id 
          AND wxs.week_start = DATE_TRUNC('week', NOW())
        WHERE u.total_xp > 0
        ORDER BY COALESCE(wxs.weekly_xp, 0) DESC, u.total_xp DESC
      )
      SELECT 
        ROW_NUMBER() OVER()::INTEGER,
        COUNT(*)::INTEGER OVER()
      INTO rank_position, total_count
      FROM weekly_ranks
      WHERE id = p_user_id;

    ELSE -- 'allTime'
      SELECT 
        ((SELECT COUNT(*) FROM users WHERE total_xp > user_total_xp) + 1)::INTEGER,
        (SELECT COUNT(*) FROM users WHERE total_xp > 0)::INTEGER
      INTO rank_position, total_count;

  END CASE;

  RETURN QUERY SELECT 
    COALESCE(rank_position, total_count + 1) as user_rank,
    COALESCE(total_count, 0) as total_users,
    COALESCE(user_total_xp, 0) as user_xp,
    COALESCE(user_period_xp, 0) as period_xp;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. Leaderboard Table Population Function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS VOID AS $$
BEGIN
  -- Clear existing leaderboard data
  DELETE FROM leaderboards;

  -- Populate daily rankings
  INSERT INTO leaderboards (type, period, user_id, rank, xp_total, movement, updated_at)
  SELECT 
    'xp' as type,
    'daily' as period,
    user_id,
    rank,
    xp_gained as xp_total,
    0 as movement,
    NOW() as updated_at
  FROM get_leaderboard_data('daily', 100);

  -- Populate weekly rankings  
  INSERT INTO leaderboards (type, period, user_id, rank, xp_total, movement, updated_at)
  SELECT 
    'xp' as type,
    'weekly' as period,
    user_id,
    rank,
    xp_gained as xp_total,
    0 as movement,
    NOW() as updated_at
  FROM get_leaderboard_data('weekly', 100);

  -- Populate all-time rankings
  INSERT INTO leaderboards (type, period, user_id, rank, xp_total, movement, updated_at)
  SELECT 
    'xp' as type,
    'allTime' as period,
    user_id,
    rank,
    total_xp as xp_total,
    0 as movement,
    NOW() as updated_at
  FROM get_leaderboard_data('allTime', 100);

END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. Create Indexes for Performance
-- =============================================================================

-- Indexes for user_progress table
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id_created_at 
ON user_progress(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_progress_created_at_xp 
ON user_progress(created_at, xp_gained);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_total_xp 
ON users(total_xp DESC) WHERE total_xp > 0;

CREATE INDEX IF NOT EXISTS idx_users_level_xp 
ON users(level DESC, total_xp DESC);

-- Indexes for leaderboards table
CREATE INDEX IF NOT EXISTS idx_leaderboards_period_rank 
ON leaderboards(period, rank);

CREATE INDEX IF NOT EXISTS idx_leaderboards_user_period 
ON leaderboards(user_id, period);

-- =============================================================================
-- 7. Trigger for Auto-Update Leaderboards
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_leaderboards()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update leaderboards every 5 minutes to avoid excessive computation
  -- In production, this should be done via cron job
  
  -- For now, we'll skip auto-update and rely on manual/scheduled updates
  -- PERFORM update_leaderboard_rankings();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Don't create trigger for now - will be handled by scheduled job
-- CREATE TRIGGER update_leaderboard_on_xp_change
--   AFTER INSERT ON user_progress
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_update_leaderboards();

-- =============================================================================
-- 8. Initial Population
-- =============================================================================

-- Populate initial leaderboard data
SELECT update_leaderboard_rankings();

-- =============================================================================
-- 9. Test Functions
-- =============================================================================

-- Test daily leaderboard
SELECT * FROM get_leaderboard_data('daily', 10);

-- Test weekly leaderboard  
SELECT * FROM get_leaderboard_data('weekly', 10);

-- Test all-time leaderboard
SELECT * FROM get_leaderboard_data('allTime', 10);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ CookCam Leaderboard System Setup Complete!';
  RAISE NOTICE '📊 Functions created: get_leaderboard_data, get_user_rank, update_leaderboard_rankings';
  RAISE NOTICE '🏆 Views created: daily_xp_summary, weekly_xp_summary, monthly_xp_summary';
  RAISE NOTICE '⚡ Performance indexes added';
  RAISE NOTICE '🔄 Initial leaderboard data populated';
END $$; 
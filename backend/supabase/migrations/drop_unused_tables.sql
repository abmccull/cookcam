-- Drop Unused Tables Migration
-- WARNING: This migration permanently deletes tables and their data
-- Ensure you have a backup before running this migration

-- Log what we're about to drop
DO $$
BEGIN
    RAISE NOTICE 'Starting cleanup of unused tables...';
    RAISE NOTICE 'Tables to be dropped:';
    RAISE NOTICE '- user_challenges (no backend usage found)';
    RAISE NOTICE '- streaks (no backend implementation)';
    RAISE NOTICE '- daily_checkins (no backend implementation)';
    RAISE NOTICE '- favorites (replaced by saved_recipes)';
    RAISE NOTICE '- user_follows (no social features implemented)';
    RAISE NOTICE '- subscriptions (after code migration to user_subscriptions)';
END $$;

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS user_challenges DROP CONSTRAINT IF EXISTS user_challenges_user_id_fkey;
ALTER TABLE IF EXISTS user_challenges DROP CONSTRAINT IF EXISTS user_challenges_challenge_id_fkey;
ALTER TABLE IF EXISTS streaks DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;
ALTER TABLE IF EXISTS daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_fkey;
ALTER TABLE IF EXISTS favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE IF EXISTS favorites DROP CONSTRAINT IF EXISTS favorites_recipe_id_fkey;
ALTER TABLE IF EXISTS user_follows DROP CONSTRAINT IF EXISTS user_follows_follower_id_fkey;
ALTER TABLE IF EXISTS user_follows DROP CONSTRAINT IF EXISTS user_follows_following_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_challenges_user_id;
DROP INDEX IF EXISTS idx_user_challenges_status;
DROP INDEX IF EXISTS idx_streaks_user_id;
DROP INDEX IF EXISTS idx_streaks_is_active;
DROP INDEX IF EXISTS idx_daily_checkins_user_id;
DROP INDEX IF EXISTS idx_daily_checkins_date;
DROP INDEX IF EXISTS idx_favorites_user_id;
DROP INDEX IF EXISTS idx_favorites_recipe_id;
DROP INDEX IF EXISTS idx_user_follows_follower_id;
DROP INDEX IF EXISTS idx_user_follows_following_id;

-- Drop the unused tables
DROP TABLE IF EXISTS user_challenges CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS daily_checkins CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;

-- Drop the challenges table if it's not used elsewhere
DO $$
BEGIN
    -- Check if challenges table is referenced by any other table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'challenges'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        DROP TABLE IF EXISTS challenges CASCADE;
        RAISE NOTICE 'Dropped challenges table (no references found)';
    ELSE
        RAISE NOTICE 'Keeping challenges table (still referenced)';
    END IF;
END $$;

-- Drop the deprecated subscriptions table ONLY if the view exists
-- (This means consolidation migration was run successfully)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
    ) THEN
        -- First drop the compatibility view
        DROP VIEW IF EXISTS subscriptions;
        
        -- Then drop the actual table
        DROP TABLE IF EXISTS subscriptions CASCADE;
        
        RAISE NOTICE 'Dropped subscriptions table (replaced by user_subscriptions)';
    ELSE
        RAISE NOTICE 'Keeping subscriptions table (consolidation not complete)';
    END IF;
END $$;

-- Clean up any orphaned sequences
DROP SEQUENCE IF EXISTS user_challenges_id_seq;
DROP SEQUENCE IF EXISTS streaks_id_seq;
DROP SEQUENCE IF EXISTS daily_checkins_id_seq;
DROP SEQUENCE IF EXISTS favorites_id_seq;
DROP SEQUENCE IF EXISTS user_follows_id_seq;
DROP SEQUENCE IF EXISTS challenges_id_seq;

-- Success message
SELECT 'Unused tables dropped successfully!' as status;

-- Summary of remaining tasks
SELECT 'Next steps:' as action, 
       'Update backend code to remove references to dropped tables' as details
UNION ALL
SELECT 'Important:', 
       'Enable leaked password protection in Supabase Auth settings'
UNION ALL
SELECT 'Test:', 
       'Run full test suite to ensure nothing is broken';
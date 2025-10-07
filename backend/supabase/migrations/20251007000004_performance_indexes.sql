-- Migration: Performance Indexes
-- Purpose: Add missing indexes for common query patterns (Phase 4.3)
-- Date: 2025-10-07

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- User subscriptions indexes (critical for payment system)
DO $$
BEGIN
    -- Check for user_id and status columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status 
        ON public.user_subscriptions(user_id, status) 
        WHERE status IN ('active', 'trialing');
        RAISE NOTICE 'Created index: idx_user_subscriptions_user_status';
    ELSE
        RAISE NOTICE 'Skipped idx_user_subscriptions_user_status: missing user_id or status column';
    END IF;

    -- Check for provider and status columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'provider'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider_status 
        ON public.user_subscriptions(provider, status) 
        WHERE status IN ('active', 'trialing', 'past_due');
        RAISE NOTICE 'Created index: idx_user_subscriptions_provider_status';
    ELSE
        RAISE NOTICE 'Skipped idx_user_subscriptions_provider_status: missing provider or status column';
    END IF;
END $$;

-- Profiles indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_email 
        ON public.profiles(email) 
        WHERE email IS NOT NULL;
        RAISE NOTICE 'Created index: idx_profiles_email';
    ELSE
        RAISE NOTICE 'Skipped idx_profiles_email: missing email column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_user_type 
        ON public.profiles(user_type) 
        WHERE user_type IS NOT NULL;
        RAISE NOTICE 'Created index: idx_profiles_user_type';
    ELSE
        RAISE NOTICE 'Skipped idx_profiles_user_type: missing user_type column';
    END IF;
END $$;

-- Recipes indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_recipes_user_created 
        ON public.recipes(user_id, created_at DESC);
        RAISE NOTICE 'Created index: idx_recipes_user_created';
    ELSE
        RAISE NOTICE 'Skipped idx_recipes_user_created: missing user_id or created_at column';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'name'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm 
            ON public.recipes USING gin(name gin_trgm_ops);
            RAISE NOTICE 'Created index: idx_recipes_name_trgm';
        ELSE
            RAISE NOTICE 'Skipped idx_recipes_name_trgm: missing name column';
        END IF;
    END IF;
END $$;

-- Ingredients indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ingredients' AND column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ingredients' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ingredients_user_created 
        ON public.ingredients(user_id, created_at DESC);
        RAISE NOTICE 'Created index: idx_ingredients_user_created';
    ELSE
        RAISE NOTICE 'Skipped idx_ingredients_user_created: missing user_id or created_at column';
    END IF;
END $$;

-- User achievements indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'total_xp'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_achievements_xp 
        ON public.user_achievements(total_xp DESC, user_id);
        RAISE NOTICE 'Created index: idx_user_achievements_xp';
    ELSE
        RAISE NOTICE 'Skipped idx_user_achievements_xp: missing total_xp or user_id column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'updated_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_achievements_user_updated 
        ON public.user_achievements(user_id, updated_at DESC);
        RAISE NOTICE 'Created index: idx_user_achievements_user_updated';
    ELSE
        RAISE NOTICE 'Skipped idx_user_achievements_user_updated: missing user_id or updated_at column';
    END IF;
END $$;

-- Friend requests indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'friend_requests' AND column_name = 'recipient_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'friend_requests' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status 
        ON public.friend_requests(recipient_id, status) 
        WHERE status = 'pending';
        RAISE NOTICE 'Created index: idx_friend_requests_recipient_status';
    ELSE
        RAISE NOTICE 'Skipped idx_friend_requests_recipient_status: missing recipient_id or status column';
    END IF;
END $$;

-- Recipe shares indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'recipe_shares' AND column_name = 'recipient_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'recipe_shares' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_recipe_shares_recipient_created 
        ON public.recipe_shares(recipient_id, created_at DESC);
        RAISE NOTICE 'Created index: idx_recipe_shares_recipient_created';
    ELSE
        RAISE NOTICE 'Skipped idx_recipe_shares_recipient_created: missing recipient_id or created_at column';
    END IF;
END $$;

-- Scan history indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'scan_history' AND column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'scan_history' AND column_name = 'scanned_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_scan_history_user_scanned 
        ON public.scan_history(user_id, scanned_at DESC);
        RAISE NOTICE 'Created index: idx_scan_history_user_scanned';
    ELSE
        RAISE NOTICE 'Skipped idx_scan_history_user_scanned: missing user_id or scanned_at column';
    END IF;
END $$;

-- Add comments for documentation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_user_status') THEN
        COMMENT ON INDEX idx_user_subscriptions_user_status IS 
        'Performance: Fast lookup of active/trialing subscriptions by user';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_provider_status') THEN
        COMMENT ON INDEX idx_user_subscriptions_provider_status IS 
        'Performance: Reconciliation job queries by provider and status';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipes_name_trgm') THEN
        COMMENT ON INDEX idx_recipes_name_trgm IS 
        'Performance: Fuzzy text search on recipe names using trigrams';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_achievements_xp') THEN
        COMMENT ON INDEX idx_user_achievements_xp IS 
        'Performance: Leaderboard queries sorted by XP';
    END IF;
END $$;


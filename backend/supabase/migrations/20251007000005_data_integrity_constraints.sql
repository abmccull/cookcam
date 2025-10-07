-- Migration: Data Integrity and Cleanup (SAFE VERSION)
-- Purpose: Add foreign key constraints and cleanup orphaned records (Phase 5.1)
-- Date: 2025-10-07
-- SAFETY: All operations are idempotent and check for existence first

-- Step 1: Clean up orphaned records ONLY if tables exist and have data
-- NOTE: These deletes are commented out by default for safety
-- Uncomment and run manually if you want to cleanup orphaned data

-- SAFE: Only cleanup if you're sure you want to delete orphaned records
-- Recommended: Review data first with SELECT queries before running DELETE

/*
-- Clean up orphaned user_subscriptions (user doesn't exist)
DELETE FROM public.user_subscriptions
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (SELECT 1 FROM public.user_subscriptions LIMIT 1);

-- Clean up orphaned recipes (user doesn't exist)  
DELETE FROM public.recipes
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (SELECT 1 FROM public.recipes LIMIT 1);

-- Clean up orphaned ingredients (user doesn't exist)
DELETE FROM public.ingredients
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (SELECT 1 FROM public.ingredients LIMIT 1);

-- Clean up orphaned user_achievements (user doesn't exist)
DELETE FROM public.user_achievements
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (SELECT 1 FROM public.user_achievements LIMIT 1);

-- Clean up orphaned recipe_shares (sender or recipient doesn't exist)
DELETE FROM public.recipe_shares
WHERE (sender_id NOT IN (SELECT id FROM auth.users)
   OR recipient_id NOT IN (SELECT id FROM auth.users))
  AND EXISTS (SELECT 1 FROM public.recipe_shares LIMIT 1);

-- Clean up orphaned friend_requests (requester or recipient doesn't exist)
DELETE FROM public.friend_requests
WHERE (requester_id NOT IN (SELECT id FROM auth.users)
   OR recipient_id NOT IN (SELECT id FROM auth.users))
  AND EXISTS (SELECT 1 FROM public.friend_requests LIMIT 1);

-- Clean up orphaned scan_history (user doesn't exist)
DELETE FROM public.scan_history
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (SELECT 1 FROM public.scan_history LIMIT 1);
*/

-- Step 2: Add foreign key constraints (SAFE - with column existence checks)
-- NOTE: These will only add constraints if tables AND columns exist

-- User subscriptions
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_subscriptions' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_subscriptions
    DROP CONSTRAINT IF EXISTS fk_user_subscriptions_user;
    
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT fk_user_subscriptions_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for user_subscriptions.user_id';
  END IF;
END $$;

-- Recipes
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.recipes
    DROP CONSTRAINT IF EXISTS fk_recipes_user;
    
    ALTER TABLE public.recipes
    ADD CONSTRAINT fk_recipes_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for recipes.user_id';
  END IF;
END $$;

-- Ingredients
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.ingredients
    DROP CONSTRAINT IF EXISTS fk_ingredients_user;
    
    ALTER TABLE public.ingredients
    ADD CONSTRAINT fk_ingredients_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for ingredients.user_id';
  END IF;
END $$;

-- User achievements
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_achievements' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_achievements
    DROP CONSTRAINT IF EXISTS fk_user_achievements_user;
    
    ALTER TABLE public.user_achievements
    ADD CONSTRAINT fk_user_achievements_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for user_achievements.user_id';
  END IF;
END $$;

-- Recipe shares (sender_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_shares' 
    AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.recipe_shares
    DROP CONSTRAINT IF EXISTS fk_recipe_shares_sender;
    
    ALTER TABLE public.recipe_shares
    ADD CONSTRAINT fk_recipe_shares_sender
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for recipe_shares.sender_id';
  END IF;
END $$;

-- Recipe shares (recipient_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_shares' 
    AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE public.recipe_shares
    DROP CONSTRAINT IF EXISTS fk_recipe_shares_recipient;
    
    ALTER TABLE public.recipe_shares
    ADD CONSTRAINT fk_recipe_shares_recipient
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for recipe_shares.recipient_id';
  END IF;
END $$;

-- Recipe shares (recipe_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_shares' 
    AND column_name = 'recipe_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes'
  ) THEN
    ALTER TABLE public.recipe_shares
    DROP CONSTRAINT IF EXISTS fk_recipe_shares_recipe;
    
    ALTER TABLE public.recipe_shares
    ADD CONSTRAINT fk_recipe_shares_recipe
    FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for recipe_shares.recipe_id';
  END IF;
END $$;

-- Friend requests (requester_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_requests' 
    AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE public.friend_requests
    DROP CONSTRAINT IF EXISTS fk_friend_requests_requester;
    
    ALTER TABLE public.friend_requests
    ADD CONSTRAINT fk_friend_requests_requester
    FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for friend_requests.requester_id';
  END IF;
END $$;

-- Friend requests (recipient_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_requests' 
    AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE public.friend_requests
    DROP CONSTRAINT IF EXISTS fk_friend_requests_recipient;
    
    ALTER TABLE public.friend_requests
    ADD CONSTRAINT fk_friend_requests_recipient
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for friend_requests.recipient_id';
  END IF;
END $$;

-- Scan history
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scan_history' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.scan_history
    DROP CONSTRAINT IF EXISTS fk_scan_history_user;
    
    ALTER TABLE public.scan_history
    ADD CONSTRAINT fk_scan_history_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for scan_history.user_id';
  END IF;
END $$;

-- Step 3: Add CHECK constraints for data validation (SAFE VERSION - WITH DATA CLEANUP)

-- User subscriptions: Valid status values
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'status'
  ) THEN
    -- Check for invalid statuses
    SELECT COUNT(*) INTO invalid_count
    FROM public.user_subscriptions
    WHERE status NOT IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete')
       OR status IS NULL;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % rows with invalid status, normalizing to "cancelled"', invalid_count;
      UPDATE public.user_subscriptions
      SET status = 'cancelled'
      WHERE status NOT IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete')
         OR status IS NULL;
    END IF;
    
    -- Now add constraint
    ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS chk_user_subscriptions_status;
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT chk_user_subscriptions_status
    CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete'));
    
    RAISE NOTICE 'Added CHECK constraint: chk_user_subscriptions_status';
  END IF;
END $$;

-- User subscriptions: Valid provider values
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'provider'
  ) THEN
    -- Check for invalid providers
    SELECT COUNT(*) INTO invalid_count
    FROM public.user_subscriptions
    WHERE provider NOT IN ('stripe', 'ios', 'android')
       OR provider IS NULL;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % rows with invalid provider, normalizing', invalid_count;
      -- Normalize common variations
      UPDATE public.user_subscriptions
      SET provider = CASE
        WHEN LOWER(TRIM(provider)) = 'apple' THEN 'ios'
        WHEN LOWER(TRIM(provider)) LIKE 'google%' THEN 'android'
        WHEN LOWER(TRIM(provider)) = 'play' THEN 'android'
        WHEN provider IS NULL THEN 'stripe'
        ELSE 'stripe'  -- Default unknown to stripe
      END
      WHERE provider NOT IN ('stripe', 'ios', 'android')
         OR provider IS NULL;
    END IF;
    
    -- Now add constraint
    ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS chk_user_subscriptions_provider;
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT chk_user_subscriptions_provider
    CHECK (provider IN ('stripe', 'ios', 'android'));
    
    RAISE NOTICE 'Added CHECK constraint: chk_user_subscriptions_provider';
  END IF;
END $$;

-- User subscriptions: Period end must be after period start
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions' 
    AND column_name IN ('current_period_start', 'current_period_end')
  ) THEN
    -- Check for invalid periods
    SELECT COUNT(*) INTO invalid_count
    FROM public.user_subscriptions
    WHERE current_period_end IS NOT NULL 
      AND current_period_start IS NOT NULL
      AND current_period_end <= current_period_start;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % rows with invalid period dates, fixing', invalid_count;
      -- Fix by adding 30 days to start date
      UPDATE public.user_subscriptions
      SET current_period_end = current_period_start + INTERVAL '30 days'
      WHERE current_period_end IS NOT NULL 
        AND current_period_start IS NOT NULL
        AND current_period_end <= current_period_start;
    END IF;
    
    -- Now add constraint (allows NULL values)
    ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS chk_user_subscriptions_period;
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT chk_user_subscriptions_period
    CHECK (current_period_start IS NULL OR current_period_end IS NULL OR current_period_end > current_period_start);
    
    RAISE NOTICE 'Added CHECK constraint: chk_user_subscriptions_period';
  END IF;
END $$;

-- Profiles: Valid user type
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    -- Check for invalid user types
    SELECT COUNT(*) INTO invalid_count
    FROM public.profiles
    WHERE user_type NOT IN ('regular', 'creator', 'admin') AND user_type IS NOT NULL;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % rows with invalid user_type, normalizing to "regular"', invalid_count;
      UPDATE public.profiles
      SET user_type = 'regular'
      WHERE user_type NOT IN ('regular', 'creator', 'admin') AND user_type IS NOT NULL;
    END IF;
    
    -- Now add constraint
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_user_type;
    ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_user_type
    CHECK (user_type IN ('regular', 'creator', 'admin') OR user_type IS NULL);
    
    RAISE NOTICE 'Added CHECK constraint: chk_profiles_user_type';
  END IF;
END $$;

-- Friend requests: Can't friend yourself
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'friend_requests' 
    AND column_name IN ('requester_id', 'recipient_id')
  ) THEN
    -- Check for self-friend requests
    SELECT COUNT(*) INTO invalid_count
    FROM public.friend_requests
    WHERE requester_id = recipient_id;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % self-friend requests, deleting them', invalid_count;
      DELETE FROM public.friend_requests
      WHERE requester_id = recipient_id;
    END IF;
    
    -- Now add constraint
    ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS chk_friend_requests_not_self;
    ALTER TABLE public.friend_requests
    ADD CONSTRAINT chk_friend_requests_not_self
    CHECK (requester_id != recipient_id);
    
    RAISE NOTICE 'Added CHECK constraint: chk_friend_requests_not_self';
  END IF;
END $$;

-- Friend requests: Valid status
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'friend_requests' AND column_name = 'status'
  ) THEN
    -- Check for invalid statuses
    SELECT COUNT(*) INTO invalid_count
    FROM public.friend_requests
    WHERE status NOT IN ('pending', 'accepted', 'rejected') OR status IS NULL;
    
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Found % rows with invalid friend_request status, normalizing to "pending"', invalid_count;
      UPDATE public.friend_requests
      SET status = 'pending'
      WHERE status NOT IN ('pending', 'accepted', 'rejected') OR status IS NULL;
    END IF;
    
    -- Now add constraint
    ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS chk_friend_requests_status;
    ALTER TABLE public.friend_requests
    ADD CONSTRAINT chk_friend_requests_status
    CHECK (status IN ('pending', 'accepted', 'rejected'));
    
    RAISE NOTICE 'Added CHECK constraint: chk_friend_requests_status';
  END IF;
END $$;

-- Step 4: Add NOT NULL constraints (COMMENTED OUT FOR SAFETY)
-- Uncomment these if you're sure columns don't have NULL values

/*
-- User subscriptions
ALTER TABLE public.user_subscriptions
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN tier_id SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN provider SET NOT NULL;

-- Profiles (email should exist)
ALTER TABLE public.profiles
ALTER COLUMN email SET NOT NULL;

-- Recipes
ALTER TABLE public.recipes
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN name SET NOT NULL;
*/

-- Step 5: Create function to automatically cleanup old data

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete expired subscriptions older than 1 year
    DELETE FROM public.user_subscriptions
    WHERE status IN ('expired', 'cancelled')
    AND updated_at < NOW() - INTERVAL '1 year';
    
    -- Delete old webhook events (keep 90 days)
    DELETE FROM public.stripe_webhook_events
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete old IAP validation history (keep 90 days for active, 30 days for invalid)
    DELETE FROM public.iap_validation_history
    WHERE status = 'valid' AND validated_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM public.iap_validation_history
    WHERE status = 'invalid' AND validated_at < NOW() - INTERVAL '30 days';
    
    -- Delete rejected friend requests older than 30 days
    DELETE FROM public.friend_requests
    WHERE status = 'rejected' AND updated_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Data cleanup completed';
END;
$$;

COMMENT ON FUNCTION cleanup_old_data() IS 
'Cleanup old data to prevent database bloat. Run monthly via cron.';

-- Add comments
COMMENT ON CONSTRAINT fk_user_subscriptions_user ON public.user_subscriptions IS 
'Ensures subscriptions are deleted when user is deleted';

COMMENT ON CONSTRAINT chk_user_subscriptions_period ON public.user_subscriptions IS 
'Validates subscription period end is after start date';


-- Step 3b: Add Columns to Subscription Tiers Table
-- Run this after 3a

-- Add price column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;

-- Add currency column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add billing_period column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- Add features column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';

-- Add limits column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}';

-- Add revenue_share_percentage column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS revenue_share_percentage INTEGER DEFAULT 0;

-- Add active column (ignore error if already exists)
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Success message
SELECT 'Step 3b: All columns added to subscription_tiers!' as status; 
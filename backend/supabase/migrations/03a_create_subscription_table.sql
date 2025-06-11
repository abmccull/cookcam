-- Step 3a: Create Basic Subscription Tiers Table
-- Run this instead of the complex DO block

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success message
SELECT 'Step 3a: Basic subscription_tiers table created!' as status; 
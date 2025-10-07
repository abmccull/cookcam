-- Step 3: Setup Subscription Tiers Table
-- Run this third in Supabase SQL Editor

-- Create/update subscription tiers table with proper column checks
DO $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'price') THEN
    ALTER TABLE subscription_tiers ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'currency') THEN
    ALTER TABLE subscription_tiers ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'billing_period') THEN
    ALTER TABLE subscription_tiers ADD COLUMN billing_period TEXT DEFAULT 'monthly';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'features') THEN
    ALTER TABLE subscription_tiers ADD COLUMN features JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'limits') THEN
    ALTER TABLE subscription_tiers ADD COLUMN limits JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'revenue_share_percentage') THEN
    ALTER TABLE subscription_tiers ADD COLUMN revenue_share_percentage INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'active') THEN
    ALTER TABLE subscription_tiers ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END
$$;

-- Insert default subscription tiers
INSERT INTO subscription_tiers (slug, name, price, features, limits) VALUES
('free', 'Free', 0, 
 '["Basic recipe generation", "5 scans per day", "Community recipes"]',
 '{"daily_scans": 5, "monthly_recipes": 10, "saved_recipes": 50}'),
('premium', 'Premium', 399,
 '["Unlimited scans", "Premium recipes", "Meal planning", "Nutrition tracking"]', 
 '{"monthly_recipes": 500, "saved_recipes": 1000}'),
('creator', 'Creator', 999,
 '["All Premium features", "Recipe publishing", "Analytics", "Revenue sharing"]',
 '{"saved_recipes": 5000}')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'Step 3: Subscription tiers table setup completed!' as status; 
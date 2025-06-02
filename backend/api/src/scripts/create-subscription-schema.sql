-- CookCam Subscription System Schema
-- =====================================

-- Subscription Tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO subscription_tiers (name, slug, price_monthly, price_yearly, features) VALUES
('Free', 'free', 0.00, 0.00, '{
  "recipes_per_month": 5,
  "scan_limit": 10,
  "collections_limit": 1,
  "ads": true
}'),
('Regular', 'regular', 3.99, 39.99, '{
  "recipes_per_month": -1,
  "scan_limit": -1,
  "collections_limit": 10,
  "ads": false,
  "priority_support": true,
  "nutrition_tracking": true,
  "export_pdf": true
}'),
('Creator', 'creator', 9.99, 99.99, '{
  "recipes_per_month": -1,
  "scan_limit": -1,
  "collections_limit": -1,
  "ads": false,
  "priority_support": true,
  "nutrition_tracking": true,
  "export_pdf": true,
  "creator_badge": true,
  "revenue_sharing": true,
  "affiliate_links": true,
  "advanced_analytics": true,
  "direct_messaging": true,
  "early_access": true,
  "api_access": true,
  "bulk_operations": true
}')
ON CONFLICT (slug) DO NOTHING;

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id INTEGER NOT NULL REFERENCES subscription_tiers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment provider info
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'ios', 'android', 'manual')),
  provider_subscription_id VARCHAR(255),
  provider_customer_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, status) -- Only one active subscription per user
);

-- Subscription History (audit trail)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  action VARCHAR(50) NOT NULL, -- created, upgraded, downgraded, canceled, expired, reactivated
  from_tier_id INTEGER REFERENCES subscription_tiers(id),
  to_tier_id INTEGER REFERENCES subscription_tiers(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Creator Affiliate System
CREATE TABLE IF NOT EXISTS creator_affiliate_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_code VARCHAR(20) NOT NULL UNIQUE,
  custom_slug VARCHAR(50), -- Optional custom URL slug
  campaign_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for creator_affiliate_links
CREATE INDEX IF NOT EXISTS idx_link_code ON creator_affiliate_links(link_code);
CREATE INDEX IF NOT EXISTS idx_creator_links ON creator_affiliate_links(creator_id, is_active);

-- Affiliate Link Clicks (for analytics)
CREATE TABLE IF NOT EXISTS affiliate_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_code VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for affiliate_link_clicks
CREATE INDEX IF NOT EXISTS idx_link_clicks ON affiliate_link_clicks(link_code, clicked_at);

-- Affiliate Conversions
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_code VARCHAR(20) NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  tier_id INTEGER NOT NULL REFERENCES subscription_tiers(id),
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_creator_conversions (creator_id, is_active),
  INDEX idx_subscriber_conversion (subscriber_id)
);

-- Creator Revenue Tracking
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  
  -- Revenue breakdown
  affiliate_earnings DECIMAL(10, 2) DEFAULT 0.00,
  tips_earnings DECIMAL(10, 2) DEFAULT 0.00,
  collections_earnings DECIMAL(10, 2) DEFAULT 0.00,
  total_earnings DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Metrics
  active_referrals INTEGER DEFAULT 0,
  new_referrals INTEGER DEFAULT 0,
  lost_referrals INTEGER DEFAULT 0,
  
  -- Payout info
  payout_status VARCHAR(20) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_date TIMESTAMP WITH TIME ZONE,
  payout_method VARCHAR(20),
  payout_reference VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(creator_id, month, year)
);

-- Create index for creator_revenue
CREATE INDEX IF NOT EXISTS idx_creator_revenue ON creator_revenue(creator_id, year, month);

-- Recipe Tips
CREATE TABLE IF NOT EXISTS recipe_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  tipper_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0.50),
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recipe_tips
CREATE INDEX IF NOT EXISTS idx_creator_tips ON recipe_tips(creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_tips ON recipe_tips(recipe_id);

-- Premium Recipe Collections
CREATE TABLE IF NOT EXISTS premium_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0.99),
  recipe_count INTEGER DEFAULT 0,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for premium_collections
CREATE INDEX IF NOT EXISTS idx_creator_collections ON premium_collections(creator_id, is_active);

-- Collection Purchases
CREATE TABLE IF NOT EXISTS collection_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES premium_collections(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10, 2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(collection_id, buyer_id)
);

-- Create indexes for collection_purchases
CREATE INDEX IF NOT EXISTS idx_buyer_purchases ON collection_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_creator_sales ON collection_purchases(creator_id, purchased_at);

-- Creator Payouts
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  method VARCHAR(20) NOT NULL, -- stripe, paypal, bank_transfer
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reference_id VARCHAR(255),
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Stripe Connect specific fields
  stripe_account_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  stripe_payout_id VARCHAR(255)
);

-- Create index for creator_payouts
CREATE INDEX IF NOT EXISTS idx_creator_payouts ON creator_payouts(creator_id, status);

-- Creator Stripe Connect Accounts
CREATE TABLE IF NOT EXISTS creator_stripe_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
  account_status VARCHAR(20) DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'disabled')),
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  country VARCHAR(2) DEFAULT 'US',
  currency VARCHAR(3) DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for creator_stripe_accounts
CREATE INDEX IF NOT EXISTS idx_creator_stripe_accounts ON creator_stripe_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_stripe_account_status ON creator_stripe_accounts(account_status, payouts_enabled);

-- Feature Access Control
CREATE TABLE IF NOT EXISTS feature_access (
  id SERIAL PRIMARY KEY,
  feature_key VARCHAR(50) NOT NULL UNIQUE,
  feature_name VARCHAR(100) NOT NULL,
  description TEXT,
  tier_requirements JSONB DEFAULT '[]', -- Array of tier IDs that have access
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default features
INSERT INTO feature_access (feature_key, feature_name, tier_requirements) VALUES
('unlimited_recipes', 'Unlimited Recipe Generation', '[2, 3]'),
('nutrition_tracking', 'Advanced Nutrition Tracking', '[2, 3]'),
('export_pdf', 'Export Recipes as PDF', '[2, 3]'),
('creator_dashboard', 'Creator Dashboard', '[3]'),
('affiliate_links', 'Affiliate Link Generation', '[3]'),
('revenue_analytics', 'Revenue Analytics', '[3]'),
('direct_messaging', 'Direct Messaging', '[3]'),
('bulk_operations', 'Bulk Recipe Operations', '[3]'),
('api_access', 'API Access', '[3]')
ON CONFLICT (feature_key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_end_dates ON user_subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_creator_active_referrals ON affiliate_conversions(creator_id) WHERE is_active = true;

-- Row Level Security Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for creator_affiliate_links
CREATE POLICY "Creators can manage own affiliate links" ON creator_affiliate_links
  FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "Public can view active affiliate links" ON creator_affiliate_links
  FOR SELECT USING (is_active = true);

-- RLS Policies for creator_revenue
CREATE POLICY "Creators can view own revenue" ON creator_revenue
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Service role can manage revenue" ON creator_revenue
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for subscription management
CREATE OR REPLACE FUNCTION check_user_subscription_tier(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  tier_id INTEGER;
BEGIN
  SELECT us.tier_id INTO tier_id
  FROM user_subscriptions us
  WHERE us.user_id = $1
    AND us.status = 'active'
    AND us.current_period_end > NOW()
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Return free tier (1) if no active subscription
  RETURN COALESCE(tier_id, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to check feature access
CREATE OR REPLACE FUNCTION user_has_feature_access(user_id UUID, feature_key VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier_id INTEGER;
  tier_requirements JSONB;
BEGIN
  -- Get user's current tier
  user_tier_id := check_user_subscription_tier(user_id);
  
  -- Get feature requirements
  SELECT fa.tier_requirements INTO tier_requirements
  FROM feature_access fa
  WHERE fa.feature_key = $2 AND fa.is_active = true;
  
  -- Check if user's tier is in the requirements
  RETURN tier_requirements ? user_tier_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate creator revenue
CREATE OR REPLACE FUNCTION calculate_creator_monthly_revenue(creator_id UUID, target_month INTEGER, target_year INTEGER)
RETURNS TABLE(
  affiliate_earnings DECIMAL,
  tips_earnings DECIMAL,
  collections_earnings DECIMAL,
  total_earnings DECIMAL,
  active_referrals INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Affiliate earnings (30% of referred subscriptions)
    COALESCE(SUM(
      CASE 
        WHEN st.slug = 'regular' THEN 3.99 * 0.30
        WHEN st.slug = 'creator' THEN 9.99 * 0.30
        ELSE 0
      END
    ), 0)::DECIMAL as affiliate_earnings,
    
    -- Tips earnings
    COALESCE((
      SELECT SUM(amount) 
      FROM recipe_tips rt
      WHERE rt.creator_id = $1
        AND EXTRACT(MONTH FROM rt.created_at) = $2
        AND EXTRACT(YEAR FROM rt.created_at) = $3
    ), 0)::DECIMAL as tips_earnings,
    
    -- Collection sales (70% after platform fee)
    COALESCE((
      SELECT SUM(cp.amount * 0.70)
      FROM collection_purchases cp
      WHERE cp.creator_id = $1
        AND EXTRACT(MONTH FROM cp.purchased_at) = $2
        AND EXTRACT(YEAR FROM cp.purchased_at) = $3
    ), 0)::DECIMAL as collections_earnings,
    
    -- Total
    COALESCE(SUM(
      CASE 
        WHEN st.slug = 'regular' THEN 3.99 * 0.30
        WHEN st.slug = 'creator' THEN 9.99 * 0.30
        ELSE 0
      END
    ), 0) + 
    COALESCE((
      SELECT SUM(amount) 
      FROM recipe_tips rt
      WHERE rt.creator_id = $1
        AND EXTRACT(MONTH FROM rt.created_at) = $2
        AND EXTRACT(YEAR FROM rt.created_at) = $3
    ), 0) +
    COALESCE((
      SELECT SUM(cp.amount * 0.70)
      FROM collection_purchases cp
      WHERE cp.creator_id = $1
        AND EXTRACT(MONTH FROM cp.purchased_at) = $2
        AND EXTRACT(YEAR FROM cp.purchased_at) = $3
    ), 0) as total_earnings,
    
    -- Active referrals count
    COUNT(DISTINCT ac.subscriber_id)::INTEGER as active_referrals
    
  FROM affiliate_conversions ac
  JOIN user_subscriptions us ON us.id = ac.subscription_id
  JOIN subscription_tiers st ON st.id = us.tier_id
  WHERE ac.creator_id = $1
    AND ac.is_active = true
    AND us.status = 'active'
    AND us.current_period_end > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate creator's unpaid balance
CREATE OR REPLACE FUNCTION calculate_creator_unpaid_balance(creator_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_earnings DECIMAL := 0;
  total_paid DECIMAL := 0;
  unpaid_balance DECIMAL := 0;
BEGIN
  -- Calculate total earnings from creator_revenue table
  SELECT COALESCE(SUM(total_earnings), 0) INTO total_earnings
  FROM creator_revenue
  WHERE creator_id = $1;
  
  -- Calculate total paid out
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM creator_payouts
  WHERE creator_id = $1
    AND status = 'completed';
  
  -- Calculate unpaid balance
  unpaid_balance := total_earnings - total_paid;
  
  -- Ensure we don't return negative balance
  IF unpaid_balance < 0 THEN
    unpaid_balance := 0;
  END IF;
  
  RETURN unpaid_balance;
END;
$$ LANGUAGE plpgsql; 
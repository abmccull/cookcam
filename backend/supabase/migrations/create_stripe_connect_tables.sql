-- Create Stripe Connect Tables for Production
-- Run this migration to add all missing creator monetization tables

-- 1. Creator Stripe Accounts Table
CREATE TABLE IF NOT EXISTS creator_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'disabled')),
  details_submitted BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one account per creator
  UNIQUE(creator_id)
);

-- 2. Creator Payouts Table
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 10.00),
  currency TEXT NOT NULL DEFAULT 'usd',
  method TEXT NOT NULL DEFAULT 'stripe' CHECK (method IN ('stripe', 'paypal', 'bank_transfer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Creator Revenue Table
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  affiliate_earnings DECIMAL(10,2) DEFAULT 0.00,
  tips_earnings DECIMAL(10,2) DEFAULT 0.00,
  collections_earnings DECIMAL(10,2) DEFAULT 0.00,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  active_referrals INTEGER DEFAULT 0,
  new_referrals INTEGER DEFAULT 0,
  lost_referrals INTEGER DEFAULT 0,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid', 'partially_paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one revenue record per creator per month
  UNIQUE(creator_id, month, year)
);

-- 4. Creator Affiliate Links Table
CREATE TABLE IF NOT EXISTS creator_affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  link_code TEXT UNIQUE NOT NULL,
  description TEXT,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  earnings_total DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Creator Tips Table
CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID, -- Optional reference to specific recipe
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0.50),
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_stripe_accounts_creator_id ON creator_stripe_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_stripe_accounts_account_id ON creator_stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_creator_id ON creator_revenue(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_month_year ON creator_revenue(month, year);
CREATE INDEX IF NOT EXISTS idx_creator_affiliate_links_creator_id ON creator_affiliate_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_affiliate_links_code ON creator_affiliate_links(link_code);
CREATE INDEX IF NOT EXISTS idx_creator_tips_creator_id ON creator_tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_tips_tipper_id ON creator_tips(tipper_id);

-- Enable RLS (Row Level Security)
ALTER TABLE creator_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Creator Stripe Accounts policies
CREATE POLICY "Creators can view their own Stripe accounts" ON creator_stripe_accounts
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own Stripe accounts" ON creator_stripe_accounts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Service can update Stripe accounts" ON creator_stripe_accounts
  FOR UPDATE USING (true);

-- Creator Payouts policies  
CREATE POLICY "Creators can view their own payouts" ON creator_payouts
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own payouts" ON creator_payouts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Service can update payouts" ON creator_payouts
  FOR UPDATE USING (true);

-- Creator Revenue policies
CREATE POLICY "Creators can view their own revenue" ON creator_revenue
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Service can manage revenue" ON creator_revenue
  FOR ALL USING (true);

-- Creator Affiliate Links policies
CREATE POLICY "Creators can manage their own affiliate links" ON creator_affiliate_links
  FOR ALL USING (auth.uid() = creator_id);

-- Creator Tips policies
CREATE POLICY "Creators can view tips received" ON creator_tips
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can view their own tips sent" ON creator_tips
  FOR SELECT USING (auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips" ON creator_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_creator_stripe_accounts_updated_at BEFORE UPDATE ON creator_stripe_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creator_payouts_updated_at BEFORE UPDATE ON creator_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creator_revenue_updated_at BEFORE UPDATE ON creator_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creator_affiliate_links_updated_at BEFORE UPDATE ON creator_affiliate_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create revenue calculation function
CREATE OR REPLACE FUNCTION calculate_creator_unpaid_balance(creator_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    unpaid_balance DECIMAL := 0;
BEGIN
    -- Calculate total unpaid revenue from all sources
    SELECT COALESCE(
        SUM(total_earnings), 0
    ) INTO unpaid_balance
    FROM creator_revenue 
    WHERE creator_revenue.creator_id = calculate_creator_unpaid_balance.creator_id
    AND payout_status = 'pending';
    
    -- Add unpaid tips
    SELECT COALESCE(unpaid_balance + SUM(amount), unpaid_balance) INTO unpaid_balance
    FROM creator_tips
    WHERE creator_tips.creator_id = calculate_creator_unpaid_balance.creator_id
    AND status = 'completed'
    AND created_at > COALESCE(
        (SELECT MAX(processed_at) FROM creator_payouts 
         WHERE creator_payouts.creator_id = calculate_creator_unpaid_balance.creator_id 
         AND status = 'completed'), 
        '2024-01-01'::timestamptz
    );
    
    RETURN COALESCE(unpaid_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create monthly revenue calculation function
CREATE OR REPLACE FUNCTION calculate_creator_monthly_revenue(
    creator_id UUID,
    target_month INTEGER,
    target_year INTEGER
)
RETURNS TABLE(
    affiliate_earnings DECIMAL,
    tips_earnings DECIMAL,
    collections_earnings DECIMAL,
    total_earnings DECIMAL,
    active_referrals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        -- Calculate affiliate earnings from subscriptions
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN s.tier_id = 2 THEN 1.20  -- Regular tier: $3.99 * 30%
                    WHEN s.tier_id = 3 THEN 3.00  -- Creator tier: $9.99 * 30%
                    ELSE 0
                END
            ), 0) as affiliate_earnings,
            
            -- Count active referrals
            COUNT(DISTINCT s.user_id) as active_referrals
        FROM user_subscriptions s
        INNER JOIN referral_attributions ra ON s.user_id = ra.user_id
        WHERE ra.referrer_id = calculate_creator_monthly_revenue.creator_id
        AND EXTRACT(MONTH FROM s.created_at) = target_month
        AND EXTRACT(YEAR FROM s.created_at) = target_year
        AND s.status = 'active'
    ),
    
    tips_data AS (
        -- Calculate tips for the month
        SELECT COALESCE(SUM(amount), 0) as tips_earnings
        FROM creator_tips
        WHERE creator_tips.creator_id = calculate_creator_monthly_revenue.creator_id
        AND EXTRACT(MONTH FROM created_at) = target_month
        AND EXTRACT(YEAR FROM created_at) = target_year
        AND status = 'completed'
    )
    
    SELECT 
        md.affiliate_earnings,
        td.tips_earnings,
        0::DECIMAL as collections_earnings, -- Collections not implemented yet
        (md.affiliate_earnings + td.tips_earnings) as total_earnings,
        md.active_referrals::INTEGER
    FROM monthly_data md, tips_data td;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Stripe Connect tables created successfully!' as status; 
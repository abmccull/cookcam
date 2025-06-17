-- Create referral attribution table for tracking user attribution to creators
CREATE TABLE IF NOT EXISTS referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES creator_affiliate_links(id) ON DELETE CASCADE,
  link_code TEXT NOT NULL,
  attributed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate attributions for the same user
  UNIQUE(user_id, link_code)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_attributions_user_id ON referral_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer_id ON referral_attributions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_link_code ON referral_attributions(link_code);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_attributed_at ON referral_attributions(attributed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own attributions" ON referral_attributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Creators can view their referrals" ON referral_attributions
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Service can insert attributions" ON referral_attributions
  FOR INSERT WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE referral_attributions IS 'Tracks which users were referred by which creators for attribution and commission calculation';
COMMENT ON COLUMN referral_attributions.user_id IS 'The user who was referred';
COMMENT ON COLUMN referral_attributions.referrer_id IS 'The creator who referred the user';
COMMENT ON COLUMN referral_attributions.affiliate_link_id IS 'The affiliate link that was used';
COMMENT ON COLUMN referral_attributions.link_code IS 'The referral code that was clicked';
COMMENT ON COLUMN referral_attributions.attributed_at IS 'When the attribution was recorded';

-- Function to get attribution for conversion tracking
CREATE OR REPLACE FUNCTION get_user_attribution(p_user_id UUID)
RETURNS TABLE (
  referrer_id UUID,
  link_code TEXT,
  attributed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.referrer_id,
    ra.link_code,
    ra.attributed_at
  FROM referral_attributions ra
  WHERE ra.user_id = p_user_id
  ORDER BY ra.attributed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
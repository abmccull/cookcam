-- Step 3d: Simple Insert (Emergency Fallback)
-- Run this if the other inserts fail

-- Try minimal insert with just required fields
INSERT INTO subscription_tiers (slug, name) VALUES
('free', 'Free'),
('premium', 'Premium'), 
('creator', 'Creator')
ON CONFLICT (slug) DO NOTHING;

-- Update with additional data if possible
UPDATE subscription_tiers SET 
  features = '["Basic recipe generation", "5 scans per day", "Community recipes"]',
  limits = '{"daily_scans": 5, "monthly_recipes": 10, "saved_recipes": 50}'
WHERE slug = 'free';

UPDATE subscription_tiers SET
  features = '["Unlimited scans", "Premium recipes", "Meal planning", "Nutrition tracking"]',
  limits = '{"monthly_recipes": 500, "saved_recipes": 1000}'  
WHERE slug = 'premium';

UPDATE subscription_tiers SET
  features = '["All Premium features", "Recipe publishing", "Analytics", "Revenue sharing"]',
  limits = '{"saved_recipes": 5000}'
WHERE slug = 'creator';

-- Success message
SELECT 'Step 3d: Basic subscription data inserted!' as status; 
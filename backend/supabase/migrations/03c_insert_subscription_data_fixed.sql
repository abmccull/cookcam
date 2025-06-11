-- Step 3c: Insert Default Subscription Tiers Data (FIXED)
-- Run this instead of the previous 3c

-- Insert default subscription tiers with correct column names
INSERT INTO subscription_tiers (slug, name, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free', 0, 0,
 '["Basic recipe generation", "5 scans per day", "Community recipes"]',
 '{"daily_scans": 5, "monthly_recipes": 10, "saved_recipes": 50}'),
('premium', 'Premium', 399, 3990,
 '["Unlimited scans", "Premium recipes", "Meal planning", "Nutrition tracking"]', 
 '{"monthly_recipes": 500, "saved_recipes": 1000}'),
('creator', 'Creator', 999, 9990,
 '["All Premium features", "Recipe publishing", "Analytics", "Revenue sharing"]',
 '{"saved_recipes": 5000}')
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'Step 3c: Subscription tiers data inserted successfully!' as status; 
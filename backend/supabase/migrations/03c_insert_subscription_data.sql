-- Step 3c: Insert Default Subscription Tiers Data
-- Run this after 3b

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
SELECT 'Step 3c: Subscription tiers data inserted successfully!' as status; 
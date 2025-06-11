-- Check Subscription Tiers Table Structure
-- Run this to see what columns actually exist

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'subscription_tiers' 
ORDER BY ordinal_position;

-- Show existing data
SELECT * FROM subscription_tiers LIMIT 3; 
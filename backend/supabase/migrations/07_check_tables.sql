-- Check Table Structures Before Creating Indexes
-- Run this to see what columns actually exist

-- Check system_metrics table
SELECT 'system_metrics' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_metrics' 
ORDER BY ordinal_position;

-- Check slow_queries table  
SELECT 'slow_queries' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'slow_queries' 
ORDER BY ordinal_position;

-- Check user_progress table
SELECT 'user_progress' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
ORDER BY ordinal_position;

-- Check subscription_tiers table
SELECT 'subscription_tiers' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscription_tiers' 
ORDER BY ordinal_position; 
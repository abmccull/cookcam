-- Disable RLS for USDA seeding process
-- Run this in Supabase SQL Editor before starting bulk seeding

-- Disable Row Level Security for ingredients table
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;

-- Add performance indexes for seeding if they don't exist
CREATE INDEX IF NOT EXISTS idx_ingredients_fdc_id_lookup ON ingredients(fdc_id) WHERE fdc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingredients_name_search ON ingredients(name);

-- Optimize for bulk inserts
SET statement_timeout = '60min';
SET lock_timeout = '10min';

-- Display current status
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'ingredients';

-- Show current ingredient count
SELECT COUNT(*) as "Current Ingredient Count" FROM ingredients;

COMMIT;

-- ==========================================
-- After seeding is complete, run this:
-- ==========================================
-- 
-- Re-enable Row Level Security
-- ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
-- 
-- Create policy for public read access
-- CREATE POLICY "Public read access for ingredients" 
--   ON ingredients FOR SELECT 
--   USING (true);
-- 
-- Reset timeouts
-- SET statement_timeout = DEFAULT;
-- SET lock_timeout = DEFAULT; 
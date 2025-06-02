-- Re-enable Row Level Security on ingredients table after USDA seeding is complete
-- This restores the security policies for normal app operation

-- Re-enable RLS for ingredients table
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'ingredients'; 
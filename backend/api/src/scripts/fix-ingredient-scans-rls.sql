-- Fix missing RLS policy for ingredient_scans table
-- This resolves the "new row violates row-level security policy" error

-- Enable RLS on ingredient_scans table if not already enabled
ALTER TABLE ingredient_scans ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own scans
CREATE POLICY "Users can manage own ingredient scans" ON ingredient_scans
  FOR ALL USING (auth.uid() = user_id);

-- Allow service role to manage all scans (for admin/system operations)
CREATE POLICY "Service role can manage all ingredient scans" ON ingredient_scans
  FOR ALL USING (auth.role() = 'service_role');

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'ingredient_scans';

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'ingredient_scans';

COMMIT; 
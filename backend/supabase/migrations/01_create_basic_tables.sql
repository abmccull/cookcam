-- Step 1: Create Basic Tables
-- Run this first in Supabase SQL Editor

-- Create monitoring tables
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL,
  cpu_usage INTEGER,
  memory_usage INTEGER,
  database_latency INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slow_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  execution_time INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user progress table for gamification
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  old_level INTEGER DEFAULT 1,
  new_level INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success message
SELECT 'Step 1: Basic tables created successfully!' as status; 
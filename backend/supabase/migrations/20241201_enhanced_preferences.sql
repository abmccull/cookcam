-- Enhanced Preferences Migration
-- Add new fields to users table for cooking preferences
-- Create supporting tables for cooking sessions and kitchen appliances

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_serving_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS meal_prep_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_meal_prep_count integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS kitchen_appliances jsonb DEFAULT '["oven", "stove"]'::jsonb,
ADD COLUMN IF NOT EXISTS dietary_preferences jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cuisine_preferences jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cooking_skill_level text DEFAULT 'beginner';

-- Create user_cooking_sessions table
CREATE TABLE IF NOT EXISTS user_cooking_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    serving_size integer NOT NULL,
    meal_prep_portions integer,
    selected_appliances jsonb NOT NULL,
    dietary_restrictions jsonb DEFAULT '[]'::jsonb,
    time_available text DEFAULT 'medium',
    difficulty_preference text DEFAULT 'any',
    cuisine_preference jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Create kitchen_appliances master table
CREATE TABLE IF NOT EXISTS kitchen_appliances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    category text NOT NULL,
    icon text,
    description text,
    cooking_methods jsonb DEFAULT '[]'::jsonb,
    popular boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert default kitchen appliances
INSERT INTO kitchen_appliances (name, category, icon, description, cooking_methods, popular) VALUES
('Oven', 'cooking', 'oven', 'Standard kitchen oven for baking and roasting', '["baking", "roasting", "broiling"]', true),
('Stove', 'cooking', 'stove', 'Stovetop for frying, boiling, and sautéing', '["frying", "boiling", "sautéing", "simmering"]', true),
('Air Fryer', 'appliance', 'air-fryer', 'Countertop convection oven for crispy cooking', '["air-frying", "crisping", "reheating"]', true),
('Slow Cooker', 'appliance', 'slow-cooker', 'Electric pot for long, slow cooking', '["slow-cooking", "braising", "stewing"]', true),
('Grill', 'outdoor', 'grill', 'Outdoor or indoor grilling equipment', '["grilling", "barbecuing", "charring"]', true),
('Smoker', 'outdoor', 'smoker', 'Equipment for smoking meats and vegetables', '["smoking", "barbecuing"]', false),
('Microwave', 'appliance', 'microwave', 'Microwave oven for quick heating and cooking', '["reheating", "steaming", "quick-cooking"]', true),
('Instant Pot', 'appliance', 'pressure-cooker', 'Multi-use pressure cooker', '["pressure-cooking", "slow-cooking", "sautéing", "steaming"]', true),
('Food Processor', 'tool', 'food-processor', 'Electric appliance for chopping and mixing', '["chopping", "mixing", "pureeing"]', false),
('Stand Mixer', 'tool', 'mixer', 'Electric mixer for baking and mixing', '["mixing", "kneading", "whipping"]', false),
('Blender', 'tool', 'blender', 'High-speed blender for smoothies and sauces', '["blending", "pureeing", "crushing"]', true),
('Toaster Oven', 'appliance', 'toaster-oven', 'Small countertop oven', '["toasting", "baking", "broiling"]', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_cooking_sessions_user_id ON user_cooking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cooking_sessions_created_at ON user_cooking_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_kitchen_appliances_category ON kitchen_appliances(category);
CREATE INDEX IF NOT EXISTS idx_kitchen_appliances_popular ON kitchen_appliances(popular);

-- Add RLS policies
ALTER TABLE user_cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_appliances ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cooking sessions
CREATE POLICY "Users can view their own cooking sessions" 
ON user_cooking_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooking sessions" 
ON user_cooking_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooking sessions" 
ON user_cooking_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Kitchen appliances are readable by all authenticated users
CREATE POLICY "Authenticated users can view kitchen appliances" 
ON kitchen_appliances FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can modify kitchen appliances
CREATE POLICY "Only admins can modify kitchen appliances" 
ON kitchen_appliances FOR ALL 
TO authenticated 
USING (auth.uid() IN (
    SELECT id FROM users WHERE email IN ('admin@cookcam.app', 'alec@cookcam.app')
));

-- Update existing users with default appliances if they don't have any
UPDATE users 
SET kitchen_appliances = '["oven", "stove", "microwave"]'::jsonb 
WHERE kitchen_appliances IS NULL 
   OR kitchen_appliances = '[]'::jsonb; 
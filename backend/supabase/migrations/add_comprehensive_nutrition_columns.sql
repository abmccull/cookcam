-- Add comprehensive nutrition columns to ingredients table
-- This migration adds the missing nutrition columns needed for USDA comprehensive seeding

-- Add missing nutrition columns if they don't exist
DO $$
BEGIN
  -- Potassium (mg per 100g)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'potassium_mg_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN potassium_mg_per_100g DOUBLE PRECISION;
  END IF;
  
  -- Vitamin D (mcg per 100g) 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'vitamin_d_mcg_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN vitamin_d_mcg_per_100g DOUBLE PRECISION;
  END IF;
  
  -- Vitamin A (mcg per 100g)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'vitamin_a_mcg_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN vitamin_a_mcg_per_100g DOUBLE PRECISION;
  END IF;
  
  -- Saturated Fat (g per 100g)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'saturated_fat_g_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN saturated_fat_g_per_100g DOUBLE PRECISION;
  END IF;
  
  -- Trans Fat (g per 100g)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'trans_fat_g_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN trans_fat_g_per_100g DOUBLE PRECISION;
  END IF;
  
  -- Cholesterol (mg per 100g)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ingredients' AND column_name = 'cholesterol_mg_per_100g') THEN
    ALTER TABLE ingredients ADD COLUMN cholesterol_mg_per_100g DOUBLE PRECISION;
  END IF;
  
END $$;

-- Success message
SELECT 'Comprehensive nutrition columns added successfully!' as status; 
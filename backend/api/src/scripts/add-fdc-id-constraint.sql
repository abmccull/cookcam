-- Add unique constraint on fdc_id column for USDA data deduplication
-- This allows us to use ON CONFLICT (fdc_id) in upsert operations

-- First, check if constraint already exists
DO $$ 
BEGIN
    -- Add unique constraint on fdc_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ingredients_fdc_id_unique' 
        AND table_name = 'ingredients'
    ) THEN
        ALTER TABLE ingredients ADD CONSTRAINT ingredients_fdc_id_unique UNIQUE (fdc_id);
        RAISE NOTICE 'Added unique constraint on fdc_id';
    ELSE
        RAISE NOTICE 'Unique constraint on fdc_id already exists';
    END IF;
END $$; 
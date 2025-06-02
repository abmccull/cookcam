-- Remove foreign key constraint on fdc_id that references non-existent usda_foods table
-- This constraint is blocking the USDA seeding process

-- Check if constraint exists and remove it
DO $$ 
BEGIN
    -- Remove foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ingredients_fdc_id_fkey' 
        AND table_name = 'ingredients'
    ) THEN
        ALTER TABLE ingredients DROP CONSTRAINT ingredients_fdc_id_fkey;
        RAISE NOTICE 'Removed foreign key constraint ingredients_fdc_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint ingredients_fdc_id_fkey does not exist';
    END IF;
END $$; 
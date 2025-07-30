import { supabase } from '../db/database';

async function setupUSDAIntegration() {
  try {
    console.log('🚀 Setting up USDA Integration...');

    // Create usda_foods table
    console.log('📝 Creating usda_foods table...');
    const { error: foodsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS usda_foods (
          fdc_id INT PRIMARY KEY,
          description TEXT NOT NULL,
          data_type TEXT NOT NULL,
          publication_date DATE,
          brand_owner TEXT,
          gtin_upc TEXT,
          ingredients_text TEXT,
          serving_size FLOAT,
          serving_size_unit TEXT,
          category TEXT,
          food_category_id INT,
          scientific_name TEXT,
          common_names TEXT[],
          additional_descriptions TEXT,
          data_source TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `,
    });

    if (foodsError) {
      console.error('❌ Error creating usda_foods:', foodsError);
    } else {
      console.log('✅ usda_foods table created successfully');
    }

    // Create usda_nutrients table
    console.log('📝 Creating usda_nutrients table...');
    const { error: nutrientsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS usda_nutrients (
          id SERIAL PRIMARY KEY,
          nutrient_id INT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          unit_name TEXT NOT NULL,
          nutrient_nbr TEXT,
          rank INT
        );
      `,
    });

    if (nutrientsError) {
      console.error('❌ Error creating usda_nutrients:', nutrientsError);
    } else {
      console.log('✅ usda_nutrients table created successfully');
    }

    // Create usda_food_nutrients table
    console.log('📝 Creating usda_food_nutrients table...');
    const { error: foodNutrientsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS usda_food_nutrients (
          id SERIAL PRIMARY KEY,
          fdc_id INT REFERENCES usda_foods(fdc_id) ON DELETE CASCADE,
          nutrient_id INT REFERENCES usda_nutrients(nutrient_id),
          amount FLOAT,
          data_points INT,
          derivation_id INT,
          min_value FLOAT,
          max_value FLOAT,
          median_value FLOAT,
          footnote TEXT,
          min_year_acquired INT,
          UNIQUE(fdc_id, nutrient_id)
        );
      `,
    });

    if (foodNutrientsError) {
      console.error('❌ Error creating usda_food_nutrients:', foodNutrientsError);
    } else {
      console.log('✅ usda_food_nutrients table created successfully');
    }

    console.log('🎉 USDA Integration setup completed!');
  } catch (error) {
    console.error('❌ Failed to setup USDA integration:', error);
    process.exit(1);
  }
}

// Run the setup
setupUSDAIntegration();

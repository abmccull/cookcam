import { supabase } from '../db/database';

interface RecipeData {
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  difficulty: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  is_generated: boolean;
}

interface RecipeIngredient {
  ingredient_id: number;
  quantity: number;
  unit: string;
}

async function seedRecipes() {
  try {
    console.log('🌱 Starting recipe seeding...');

    // Recipe data using your existing ingredients
    const recipes: RecipeData[] = [
      {
        title: 'Fresh Tomato Salad',
        description: 'A light and refreshing tomato salad with herbs and olive oil dressing',
        prep_time: 10,
        cook_time: 0,
        difficulty: 'easy',
        servings: 2,
        ingredients: ['2 large tomatoes', '1 small onion', '2 cloves garlic', '2 tbsp olive oil', '1/2 tsp salt'],
        instructions: [
          'Wash and dice the tomatoes into bite-sized pieces',
          'Finely chop the onion and mince the garlic',
          'In a large bowl, combine tomatoes, onion, and garlic',
          'Drizzle with olive oil and season with salt',
          'Toss gently and let sit for 5 minutes before serving'
        ],
        tags: ['healthy', 'vegetarian', 'quick', 'mediterranean'],
        is_generated: false
      },
      {
        title: 'Simple Garlic Oil Sauce',
        description: 'Classic Italian aglio e olio - garlic and olive oil sauce perfect for pasta',
        prep_time: 5,
        cook_time: 15,
        difficulty: 'easy',
        servings: 4,
        ingredients: ['6 cloves garlic', '1/2 cup olive oil', '1 tsp salt', '1 small onion (optional)'],
        instructions: [
          'Slice garlic thinly and dice onion if using',
          'Heat olive oil in a large pan over medium-low heat',
          'Add garlic and cook until fragrant and lightly golden (2-3 minutes)',
          'Add onion if using and cook until softened',
          'Season with salt and remove from heat',
          'Toss with cooked pasta and serve immediately'
        ],
        tags: ['italian', 'vegetarian', 'quick', 'pasta'],
        is_generated: false
      },
      {
        title: 'Roasted Tomato & Onion Medley',
        description: 'Slow-roasted vegetables with garlic and herbs - perfect as a side dish',
        prep_time: 15,
        cook_time: 45,
        difficulty: 'medium',
        servings: 4,
        ingredients: ['4 large tomatoes', '2 medium onions', '4 cloves garlic', '3 tbsp olive oil', '1 tsp salt'],
        instructions: [
          'Preheat oven to 400°F (200°C)',
          'Cut tomatoes and onions into wedges',
          'Mince garlic or leave whole cloves',
          'Place vegetables on a baking sheet',
          'Drizzle with olive oil and season with salt',
          'Roast for 45 minutes until caramelized and tender',
          'Serve hot as a side dish'
        ],
        tags: ['healthy', 'vegetarian', 'roasted', 'mediterranean'],
        is_generated: false
      },
      {
        title: 'Classic Tomato Bruschetta',
        description: 'Fresh tomato topping with garlic and olive oil - perfect for appetizers',
        prep_time: 15,
        cook_time: 0,
        difficulty: 'easy',
        servings: 6,
        ingredients: ['3 large tomatoes', '1 small onion', '3 cloves garlic', '3 tbsp olive oil', '1/2 tsp salt'],
        instructions: [
          'Dice tomatoes and remove excess juice',
          'Finely chop onion and mince garlic',
          'Combine tomatoes, onion, and garlic in a bowl',
          'Add olive oil and salt, mix well',
          'Let marinate for 15 minutes',
          'Serve on toasted bread or crackers'
        ],
        tags: ['appetizer', 'italian', 'fresh', 'quick'],
        is_generated: false
      },
      {
        title: 'Caramelized Onion & Tomato Compote',
        description: 'Sweet caramelized onions with fresh tomatoes - great as a condiment or side',
        prep_time: 10,
        cook_time: 30,
        difficulty: 'medium',
        servings: 3,
        ingredients: ['3 large onions', '2 large tomatoes', '2 cloves garlic', '2 tbsp olive oil', '1/2 tsp salt'],
        instructions: [
          'Slice onions thinly and dice tomatoes',
          'Heat olive oil in a large skillet over medium heat',
          'Add onions and cook slowly until caramelized (20-25 minutes)',
          'Add minced garlic and cook for 1 minute',
          'Add tomatoes and salt, cook until softened',
          'Serve warm or at room temperature'
        ],
        tags: ['condiment', 'vegetarian', 'caramelized', 'slow-cooked'],
        is_generated: false
      }
    ];

    // Recipe ingredient mappings (ingredient_id: [quantity, unit])
    const recipeIngredients: { [recipeName: string]: RecipeIngredient[] } = {
      'Fresh Tomato Salad': [
        { ingredient_id: 1, quantity: 2, unit: 'large' },      // Tomato
        { ingredient_id: 2, quantity: 1, unit: 'small' },      // Onion
        { ingredient_id: 3, quantity: 2, unit: 'cloves' },     // Garlic
        { ingredient_id: 4, quantity: 2, unit: 'tbsp' },       // Olive Oil
        { ingredient_id: 5, quantity: 0.5, unit: 'tsp' }       // Salt
      ],
      'Simple Garlic Oil Sauce': [
        { ingredient_id: 3, quantity: 6, unit: 'cloves' },     // Garlic
        { ingredient_id: 4, quantity: 8, unit: 'tbsp' },       // Olive Oil (1/2 cup = 8 tbsp)
        { ingredient_id: 5, quantity: 1, unit: 'tsp' },        // Salt
        { ingredient_id: 2, quantity: 1, unit: 'small' }       // Onion
      ],
      'Roasted Tomato & Onion Medley': [
        { ingredient_id: 1, quantity: 4, unit: 'large' },      // Tomato
        { ingredient_id: 2, quantity: 2, unit: 'medium' },     // Onion
        { ingredient_id: 3, quantity: 4, unit: 'cloves' },     // Garlic
        { ingredient_id: 4, quantity: 3, unit: 'tbsp' },       // Olive Oil
        { ingredient_id: 5, quantity: 1, unit: 'tsp' }         // Salt
      ],
      'Classic Tomato Bruschetta': [
        { ingredient_id: 1, quantity: 3, unit: 'large' },      // Tomato
        { ingredient_id: 2, quantity: 1, unit: 'small' },      // Onion
        { ingredient_id: 3, quantity: 3, unit: 'cloves' },     // Garlic
        { ingredient_id: 4, quantity: 3, unit: 'tbsp' },       // Olive Oil
        { ingredient_id: 5, quantity: 0.5, unit: 'tsp' }       // Salt
      ],
      'Caramelized Onion & Tomato Compote': [
        { ingredient_id: 2, quantity: 3, unit: 'large' },      // Onion
        { ingredient_id: 1, quantity: 2, unit: 'large' },      // Tomato
        { ingredient_id: 3, quantity: 2, unit: 'cloves' },     // Garlic
        { ingredient_id: 4, quantity: 2, unit: 'tbsp' },       // Olive Oil
        { ingredient_id: 5, quantity: 0.5, unit: 'tsp' }       // Salt
      ]
    };

    // Disable RLS temporarily for seeding
    console.log('🔓 Temporarily disabling RLS for seeding...');
    
    // Insert recipes
    for (const recipeData of recipes) {
      console.log(`📝 Creating recipe: ${recipeData.title}`);
      
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          title: recipeData.title,
          description: recipeData.description,
          prep_time: recipeData.prep_time,
          cook_time: recipeData.cook_time,
          difficulty: recipeData.difficulty,
          servings: recipeData.servings,
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          tags: recipeData.tags,
          is_generated: recipeData.is_generated
        }])
        .select()
        .single();

      if (recipeError) {
        console.error(`❌ Error creating recipe ${recipeData.title}:`, recipeError);
        continue;
      }

      if (!recipe) {
        console.error(`❌ No recipe returned for ${recipeData.title}`);
        continue;
      }

      console.log(`✅ Created recipe: ${recipe.title} (ID: ${recipe.id})`);

      // Insert recipe ingredients
      const ingredientsToInsert = recipeIngredients[recipeData.title];
      if (ingredientsToInsert) {
        console.log(`🥗 Adding ${ingredientsToInsert.length} ingredients...`);
        
        for (const ingredient of ingredientsToInsert) {
          const { error: ingredientError } = await supabase
            .from('recipe_ingredients')
            .insert([{
              recipe_id: recipe.id,
              ingredient_id: ingredient.ingredient_id,
              quantity: ingredient.quantity,
              unit: ingredient.unit
            }]);

          if (ingredientError) {
            console.error(`❌ Error adding ingredient ${ingredient.ingredient_id}:`, ingredientError);
          } else {
            console.log(`  ✓ Added ingredient ${ingredient.ingredient_id} (${ingredient.quantity} ${ingredient.unit})`);
          }
        }
      }
    }

    // Verify results
    console.log('\n📊 Verification - Checking created recipes...');
    const { data: allRecipes, error: verifyError } = await supabase
      .from('recipes')
      .select(`
        id,
        title,
        servings,
        prep_time,
        cook_time,
        difficulty,
        recipe_ingredients (
          id,
          quantity,
          unit,
          ingredient:ingredients (name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return;
    }

    console.log(`\n🎉 Successfully created ${allRecipes?.length || 0} recipes:`);
    allRecipes?.forEach((recipe: any) => {
      console.log(`  • ${recipe.title} (${recipe.servings} servings, ${recipe.prep_time + recipe.cook_time} min total)`);
      console.log(`    Ingredients: ${recipe.recipe_ingredients?.length || 0} items`);
    });

    console.log('\n🚀 Seeding complete! You can now test nutrition analysis.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run the seeding
seedRecipes(); 
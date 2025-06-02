import { supabase } from '../db/database';

async function createTestRecipe() {
  try {
    console.log('🧪 Creating test recipe with ingredients...');
    
    // Create a simple tomato salad recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        title: 'Simple Tomato Salad',
        description: 'A fresh and healthy tomato salad with basic ingredients',
        prep_time: 10,
        cook_time: 0,
        difficulty: 'easy',
        servings: 2,
        ingredients: [
          '2 large tomatoes',
          '1 small onion',
          '2 cloves garlic',
          '2 tbsp olive oil',
          '1 tsp salt'
        ],
        instructions: [
          'Wash and dice the tomatoes',
          'Finely chop the onion and garlic',
          'Mix all ingredients in a bowl',
          'Drizzle with olive oil and season with salt',
          'Let sit for 5 minutes before serving'
        ],
        tags: ['healthy', 'vegetarian', 'quick']
      })
      .select()
      .single();

    if (recipeError) {
      console.error('❌ Recipe creation error:', recipeError);
      return;
    }

    console.log('✅ Recipe created:', recipe.title);
    console.log('📝 Recipe ID:', recipe.id);

    // Add recipe ingredients
    const recipeIngredients = [
      { ingredient_id: 1, quantity: 2, unit: 'whole' },    // Tomato
      { ingredient_id: 2, quantity: 1, unit: 'small' },    // Onion  
      { ingredient_id: 3, quantity: 2, unit: 'cloves' },   // Garlic
      { ingredient_id: 4, quantity: 2, unit: 'tbsp' },     // Olive Oil
      { ingredient_id: 5, quantity: 1, unit: 'tsp' }       // Salt
    ];

    for (const ingredient of recipeIngredients) {
      const { error: ingredientError } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipe.id,
          ingredient_id: ingredient.ingredient_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        });

      if (ingredientError) {
        console.error('❌ Recipe ingredient error:', ingredientError);
      } else {
        console.log(`✅ Added ingredient ${ingredient.ingredient_id}`);
      }
    }

    console.log('🎉 Test recipe created successfully!');
    console.log(`🔗 Test nutrition analysis: curl "http://localhost:3000/api/recipes/${recipe.id}/nutrition?servings=2"`);
    
  } catch (error) {
    console.error('❌ Test recipe creation failed:', error);
  }
}

// Run the script
createTestRecipe(); 
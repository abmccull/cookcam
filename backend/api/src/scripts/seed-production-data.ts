import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

interface Achievement {
  key: string;
  name: string;
  description: string;
  category: string;
  xp_reward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  requirements: any;
}

interface Challenge {
  title: string;
  description: string;
  type: string;
  requirements: any;
  xp_reward: number;
  start_date: string;
  end_date: string;
}

interface Recipe {
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  cuisine: string;
  is_featured: boolean;
  created_by?: string;
}

const achievements: Achievement[] = [
  // Scanning Achievements
  {
    key: 'first_scan',
    name: 'First Scan',
    description: 'Complete your first ingredient scan',
    category: 'scanning',
    xp_reward: 50,
    rarity: 'common',
    requirements: { scans_completed: 1 }
  },
  {
    key: 'scan_master_10',
    name: 'Scan Master',
    description: 'Complete 10 ingredient scans',
    category: 'scanning',
    xp_reward: 100,
    rarity: 'uncommon',
    requirements: { scans_completed: 10 }
  },
  {
    key: 'ingredient_hunter_50',
    name: 'Ingredient Hunter',
    description: 'Scan 50 different ingredients',
    category: 'scanning',
    xp_reward: 200,
    rarity: 'rare',
    requirements: { unique_ingredients_scanned: 50 }
  },
  {
    key: 'ai_whisperer',
    name: 'AI Whisperer',
    description: 'Get 95%+ confidence on 5 scans',
    category: 'scanning',
    xp_reward: 150,
    rarity: 'uncommon',
    requirements: { high_confidence_scans: 5 }
  },

  // Recipe Achievements
  {
    key: 'first_recipe',
    name: 'First Recipe',
    description: 'Generate your first AI recipe',
    category: 'recipes',
    xp_reward: 75,
    rarity: 'common',
    requirements: { recipes_generated: 1 }
  },
  {
    key: 'recipe_creator_25',
    name: 'Recipe Creator',
    description: 'Generate 25 AI recipes',
    category: 'recipes',
    xp_reward: 250,
    rarity: 'rare',
    requirements: { recipes_generated: 25 }
  },
  {
    key: 'cuisine_explorer',
    name: 'Cuisine Explorer',
    description: 'Try recipes from 10 different cuisines',
    category: 'recipes',
    xp_reward: 300,
    rarity: 'rare',
    requirements: { cuisines_tried: 10 }
  },
  {
    key: 'master_chef',
    name: 'Master Chef',
    description: 'Complete 100 recipes',
    category: 'recipes',
    xp_reward: 500,
    rarity: 'legendary',
    requirements: { recipes_completed: 100 }
  },

  // Streak Achievements
  {
    key: 'streak_7',
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day cooking streak',
    category: 'streaks',
    xp_reward: 100,
    rarity: 'uncommon',
    requirements: { streak_days: 7 }
  },
  {
    key: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day cooking streak',
    category: 'streaks',
    xp_reward: 400,
    rarity: 'rare',
    requirements: { streak_days: 30 }
  },
  {
    key: 'streak_100',
    name: 'Centurion Cook',
    description: 'Maintain a 100-day cooking streak',
    category: 'streaks',
    xp_reward: 1000,
    rarity: 'legendary',
    requirements: { streak_days: 100 }
  },

  // Social Achievements
  {
    key: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Follow 10 other cooks',
    category: 'social',
    xp_reward: 50,
    rarity: 'common',
    requirements: { following_count: 10 }
  },
  {
    key: 'community_leader',
    name: 'Community Leader',
    description: 'Get 100 followers',
    category: 'social',
    xp_reward: 200,
    rarity: 'rare',
    requirements: { followers_count: 100 }
  },

  // Special Achievements
  {
    key: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join CookCam in the first month',
    category: 'special',
    xp_reward: 100,
    rarity: 'uncommon',
    requirements: { joined_before: '2025-07-01' }
  },
  {
    key: 'mystery_box_legend',
    name: 'Mystery Box Legend',
    description: 'Open 50 mystery boxes',
    category: 'special',
    xp_reward: 300,
    rarity: 'rare',
    requirements: { mystery_boxes_opened: 50 }
  },
  {
    key: 'perfectionist',
    name: 'Perfectionist',
    description: 'Rate 20 recipes with 5 stars',
    category: 'special',
    xp_reward: 150,
    rarity: 'uncommon',
    requirements: { five_star_ratings_given: 20 }
  }
];

const challenges: Challenge[] = [
  {
    title: 'Weekly Scan Challenge',
    description: 'Scan 15 ingredients this week',
    type: 'scanning',
    requirements: { scans_needed: 15, time_limit: '7_days' },
    xp_reward: 200,
    start_date: '2025-06-01',
    end_date: '2025-06-07'
  },
  {
    title: 'International Cuisine Week',
    description: 'Try recipes from 5 different countries',
    type: 'recipes',
    requirements: { cuisines_needed: 5, time_limit: '7_days' },
    xp_reward: 300,
    start_date: '2025-06-08',
    end_date: '2025-06-14'
  },
  {
    title: 'Healthy Eating Challenge',
    description: 'Complete 10 healthy recipes this month',
    type: 'recipes',
    requirements: { healthy_recipes_needed: 10, time_limit: '30_days' },
    xp_reward: 500,
    start_date: '2025-06-01',
    end_date: '2025-06-30'
  },
  {
    title: 'Social Cooking Month',
    description: 'Share 5 completed recipes this month',
    type: 'social',
    requirements: { shared_recipes_needed: 5, time_limit: '30_days' },
    xp_reward: 250,
    start_date: '2025-06-01',
    end_date: '2025-06-30'
  },
  {
    title: 'Mystery Box Madness',
    description: 'Open 10 mystery boxes this week',
    type: 'special',
    requirements: { mystery_boxes_needed: 10, time_limit: '7_days' },
    xp_reward: 400,
    start_date: '2025-06-15',
    end_date: '2025-06-21'
  }
];

const recipes: Recipe[] = [
  // Easy Recipes
  {
    title: 'Classic Avocado Toast',
    description: 'Simple and nutritious breakfast with perfectly ripe avocado on artisan bread',
    prep_time: 5,
    cook_time: 3,
    difficulty: 'easy',
    servings: 2,
    ingredients: ['2 slices whole grain bread', '1 ripe avocado', '1 tbsp lemon juice', '1/2 tsp salt', '1/4 tsp black pepper', '1 tsp olive oil', 'Optional: cherry tomatoes'],
    instructions: [
      'Toast the bread slices until golden brown',
      'Mash the avocado in a bowl with lemon juice, salt, and pepper',
      'Spread the avocado mixture evenly on toast',
      'Drizzle with olive oil and add tomatoes if desired',
      'Serve immediately'
    ],
    tags: ['breakfast', 'healthy', 'vegetarian', 'quick'],
    cuisine: 'American',
    is_featured: true
  },
  {
    title: 'Quick Stir-Fried Vegetables',
    description: 'Colorful mix of fresh vegetables stir-fried to perfection',
    prep_time: 10,
    cook_time: 8,
    difficulty: 'easy',
    servings: 4,
    ingredients: ['2 cups mixed vegetables', '2 tbsp vegetable oil', '2 cloves garlic', '1 tbsp soy sauce', '1 tsp sesame oil', '1/2 tsp ginger'],
    instructions: [
      'Heat oil in a large wok or skillet',
      'Add garlic and ginger, stir for 30 seconds',
      'Add vegetables and stir-fry for 5-6 minutes',
      'Add soy sauce and sesame oil',
      'Toss everything together and serve hot'
    ],
    tags: ['dinner', 'healthy', 'vegetarian', 'asian'],
    cuisine: 'Chinese',
    is_featured: false
  },

  // Medium Recipes
  {
    title: 'Homemade Chicken Tikka Masala',
    description: 'Creamy and aromatic Indian curry with tender chicken pieces',
    prep_time: 30,
    cook_time: 45,
    difficulty: 'medium',
    servings: 6,
    ingredients: ['2 lbs chicken breast', '1 cup yogurt', '2 tbsp garam masala', '1 can tomato sauce', '1 cup heavy cream', '2 onions', '4 cloves garlic', '2 tsp ginger', '2 tsp cumin'],
    instructions: [
      'Marinate chicken in yogurt and spices for 30 minutes',
      'Cook chicken pieces until golden, set aside',
      'Sauté onions, garlic, and ginger until fragrant',
      'Add tomato sauce and spices, simmer 15 minutes',
      'Add cream and cooked chicken, simmer 15 more minutes',
      'Serve with rice or naan bread'
    ],
    tags: ['dinner', 'indian', 'spicy', 'protein'],
    cuisine: 'Indian',
    is_featured: true
  },
  {
    title: 'Mediterranean Quinoa Salad',
    description: 'Fresh and healthy salad packed with Mediterranean flavors',
    prep_time: 20,
    cook_time: 15,
    difficulty: 'medium',
    servings: 4,
    ingredients: ['1 cup quinoa', '1 cucumber', '1 cup cherry tomatoes', '1/2 red onion', '1/2 cup olives', '1/2 cup feta cheese', '1/4 cup olive oil', '2 tbsp lemon juice'],
    instructions: [
      'Cook quinoa according to package instructions, let cool',
      'Dice cucumber, tomatoes, and red onion',
      'Combine quinoa with vegetables, olives, and feta',
      'Whisk olive oil and lemon juice for dressing',
      'Toss salad with dressing and chill before serving'
    ],
    tags: ['lunch', 'healthy', 'vegetarian', 'mediterranean'],
    cuisine: 'Mediterranean',
    is_featured: false
  },

  // Hard Recipes
  {
    title: 'Beef Wellington',
    description: 'Classic British dish with tender beef wrapped in puff pastry',
    prep_time: 60,
    cook_time: 40,
    difficulty: 'hard',
    servings: 8,
    ingredients: ['3 lb beef tenderloin', '1 lb puff pastry', '8 oz mushrooms', '4 oz pâté', '2 tbsp Dijon mustard', '6 slices prosciutto', '2 egg yolks'],
    instructions: [
      'Sear beef tenderloin on all sides until browned',
      'Brush with Dijon mustard and let cool',
      'Sauté mushrooms until moisture evaporates',
      'Lay prosciutto and pâté on plastic wrap',
      'Add mushroom mixture and beef, wrap tightly',
      'Wrap in puff pastry, brush with egg wash',
      'Bake at 400°F for 25-30 minutes until golden'
    ],
    tags: ['dinner', 'british', 'fancy', 'protein'],
    cuisine: 'British',
    is_featured: true
  },
  {
    title: 'Homemade Ramen Bowl',
    description: 'Rich and complex Japanese ramen with tender pork and perfect soft-boiled eggs',
    prep_time: 45,
    cook_time: 180,
    difficulty: 'hard',
    servings: 4,
    ingredients: ['4 portions fresh ramen noodles', '2 lbs pork shoulder', '4 soft-boiled eggs', '4 cups chicken stock', '2 tbsp miso paste', '2 green onions', '1 sheet nori', '1 cup bamboo shoots'],
    instructions: [
      'Braise pork shoulder for 3 hours until tender',
      'Prepare soft-boiled eggs and marinate in soy sauce',
      'Heat chicken stock and whisk in miso paste',
      'Cook ramen noodles according to package instructions',
      'Slice pork and prepare toppings',
      'Assemble bowls with noodles, broth, pork, and toppings'
    ],
    tags: ['dinner', 'japanese', 'comfort', 'protein'],
    cuisine: 'Japanese',
    is_featured: true
  }
];

async function seedProductionData() {
  try {
    console.log('🌱 Starting production data seeding...\n');

    // Seed Achievements
    console.log('📈 Seeding achievements...');
    for (const achievement of achievements) {
      const { error } = await supabase
        .from('achievements')
        .upsert(achievement, { onConflict: 'key' });
      
      if (error) {
        console.error(`❌ Error seeding achievement ${achievement.key}:`, error);
      } else {
        console.log(`✅ Seeded achievement: ${achievement.name}`);
      }
    }

    // Seed Challenges
    console.log('\n🎯 Seeding challenges...');
    for (const challenge of challenges) {
      const { error } = await supabase
        .from('challenges')
        .upsert(challenge);
      
      if (error) {
        console.error(`❌ Error seeding challenge ${challenge.title}:`, error);
      } else {
        console.log(`✅ Seeded challenge: ${challenge.title}`);
      }
    }

    // Seed Recipes
    console.log('\n🍳 Seeding recipes...');
    for (const recipe of recipes) {
      const { error } = await supabase
        .from('recipes')
        .insert(recipe);
      
      if (error) {
        console.error(`❌ Error seeding recipe ${recipe.title}:`, error);
      } else {
        console.log(`✅ Seeded recipe: ${recipe.title}`);
      }
    }

    console.log('\n🎉 Production data seeding completed successfully!');
    console.log(`📊 Seeded: ${achievements.length} achievements, ${challenges.length} challenges, ${recipes.length} recipes`);

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedProductionData().then(() => process.exit(0));
}

export { seedProductionData }; 
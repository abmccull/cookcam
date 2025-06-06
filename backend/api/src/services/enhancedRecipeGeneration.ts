import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface UserPreferences {
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  availableTime?: number; // minutes
  kitchenEquipment?: string[];
  dislikedIngredients?: string[];
  preferredCookingMethods?: string[];
  spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
  servingSize?: number;
}

interface RecipeGenerationOptions {
  ingredients: string[];
  userPreferences?: UserPreferences;
  recipeType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'appetizer';
  nutritionGoals?: {
    calories?: number;
    protein?: number;
    lowCarb?: boolean;
    lowFat?: boolean;
    highFiber?: boolean;
  };
  context?: string; // e.g., "romantic dinner", "kid-friendly", "meal prep"
}

interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    notes?: string;
    source: 'scanned' | 'pantry' | 'optional'; // Track ingredient sources
  }[];
  instructions: {
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
    tips?: string;
    technique?: string;
    equipment?: string;
    safety?: string;
  }[];
  metadata: {
    prepTime: number;
    cookTime: number;
    totalTime: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisineType: string;
    dietaryTags: string[];
    skillLevel: string;
    cookingMethod: string; // e.g., "stir-fry", "roasted", "raw"
  };
  nutrition: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar: number;
  };
  tips: string[];
  variations?: string[];
  storage?: string;
  pairing?: string[];
  ingredientsUsed: string[]; // Which scanned ingredients were used
  ingredientsSkipped: string[]; // Which scanned ingredients were skipped
  skipReason?: string; // Why certain ingredients were skipped
}

// Common pantry staples that we assume users have
const PANTRY_STAPLES = [
  'salt', 'black pepper', 'olive oil', 'garlic', 'onion', 'water',
  'butter', 'flour', 'sugar', 'vinegar', 'lemon juice', 'soy sauce',
  'paprika', 'cumin', 'oregano', 'thyme', 'bay leaves', 'vegetable oil',
  'white rice', 'brown rice', 'pasta', 'bread', 'eggs', 'milk'
];

interface MultipleRecipesResponse {
  recipes: GeneratedRecipe[];
  ingredientAnalysis: {
    totalScanned: number;
    compatibilityGroups: string[][];
    pantryStaplesUsed: string[];
  };
}

export class EnhancedRecipeGenerationService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // NEW: Generate 3 diverse recipes
  async generateMultipleRecipes(options: RecipeGenerationOptions): Promise<MultipleRecipesResponse> {
    try {
      logger.info('🍳 Generating 3 diverse recipes', {
        ingredients: options.ingredients,
        preferences: options.userPreferences,
        type: options.recipeType
      });

      const prompt = this.buildDiverseRecipesPrompt(options);
      
      logger.info('📤 Sending multiple recipes request to OpenAI...', {
        model: 'gpt-4o-mini',
        promptLength: prompt.length
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getMultiRecipeSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Higher temperature for more diversity
        max_tokens: 4000, // Increased for 3 recipes
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No recipe content generated from OpenAI');
      }

      logger.info('🔄 Parsing multiple recipes response...', {
        contentLength: content.length
      });

      const result = JSON.parse(content) as MultipleRecipesResponse;
      
      // Validate we got 3 recipes
      if (!result.recipes || result.recipes.length !== 3) {
        logger.warn('⚠️ Expected 3 recipes, got:', { recipeCount: result.recipes?.length });
      }

      logger.info('✅ Successfully generated multiple recipes', {
        recipeCount: result.recipes?.length,
        titles: result.recipes?.map(r => r.title)
      });

      return result;
    } catch (error) {
      logger.error('❌ Error generating multiple recipes:', error);
      throw new Error('Failed to generate diverse recipes');
    }
  }

  // Keep original method for backward compatibility
  async generateRecipe(options: RecipeGenerationOptions): Promise<GeneratedRecipe> {
    const multipleResult = await this.generateMultipleRecipes(options);
    if (!multipleResult.recipes || multipleResult.recipes.length === 0) {
      throw new Error('No recipes generated');
    }
    return multipleResult.recipes[0]!; // Return first recipe for backward compatibility
  }

  private getMultiRecipeSystemPrompt(): string {
    return `You are a world-class chef and culinary instructor with expertise in creating diverse, personalized recipes AND teaching cooking techniques to beginners. Your goal is to generate 3 COMPLETELY DIFFERENT recipes that showcase:

1. **Natural Culinary Diversity**: Each recipe should feel like a totally different dish - different cooking methods, textures, meal formats, and eating experiences
2. **Smart Ingredient Usage**: Don't force all ingredients together - use 60-80% of scanned ingredients per recipe, selecting the best combinations
3. **Pantry Intelligence**: Assume common pantry staples are available and mark them clearly as "pantry" source
4. **Authentic Cuisine**: If cuisine preference is specified, STRICTLY follow that style with authentic spices, techniques, and flavor profiles
5. **DETAILED BEGINNER GUIDANCE**: Every instruction must be clear enough for someone who has never cooked before

**CRITICAL INSTRUCTION REQUIREMENTS:**
- Include specific visual, audio, and tactile cues for doneness (e.g., "golden brown edges", "sizzling sound stops", "tender when pierced with fork")
- Explain WHY each step matters for the final dish
- Include safety warnings where needed (hot oil, sharp knives, raw meat handling)
- Provide technique details (how to dice, proper stirring motion, heat level indicators)
- Give equipment alternatives and troubleshooting tips
- Include time ranges with visual cues rather than exact times
- Mention what can go wrong and how to fix it

Think like a chef: "What are 3 completely different things I could make with these ingredients?" AND "How would I teach my grandmother who's never cooked to make this perfectly?"

Always respond with valid JSON following the exact structure requested.`;
  }

  private buildDiverseRecipesPrompt(options: RecipeGenerationOptions): string {
    const { ingredients, userPreferences = {}, recipeType, nutritionGoals, context } = options;

    let prompt = `Create 3 COMPLETELY DIFFERENT ${recipeType || 'dishes'} using these scanned ingredients: ${ingredients.join(', ')}\n\n`;

    // Add user preferences
    if (userPreferences.skillLevel) {
      prompt += `👨‍🍳 Skill Level: ${userPreferences.skillLevel}\n`;
    }

    if (userPreferences.availableTime) {
      prompt += `⏱️ Time Available: ${userPreferences.availableTime} minutes\n`;
    }

    if (userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0) {
      prompt += `🥗 Dietary Restrictions: ${userPreferences.dietaryRestrictions.join(', ')}\n`;
    }

    if (userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0) {
      prompt += `🌍 REQUIRED CUISINE STYLE: ${userPreferences.cuisinePreferences.join(', ')} - ALL 3 recipes MUST be authentic to this cuisine style with appropriate spices, cooking techniques, and flavor profiles.\n`;
    }

    if (userPreferences.servingSize) {
      prompt += `👥 Serving Size: ${userPreferences.servingSize} people\n`;
    }

    prompt += `\n🥘 Recipe Diversity Requirements:
1. Each recipe should use DIFFERENT cooking methods (e.g., stir-fry vs. roasted vs. raw/salad)
2. Each recipe should have DIFFERENT textures and eating experiences
3. Each recipe should feel like a completely different dish - not 3 variations of the same thing
4. Use 60-80% of scanned ingredients per recipe - don't force incompatible ingredients together
5. Smart ingredient selection based on what works well together

📦 Pantry Staples Available (mark as "pantry" source):
${PANTRY_STAPLES.join(', ')}

🧠 Ingredient Intelligence Rules:
- If an ingredient doesn't complement the dish, skip it and note why
- Prioritize flavor harmony over using every ingredient
- Think about ingredient compatibility and cooking methods
- Consider seasonal/fresh ingredients vs. pantry staples

🎓 DETAILED INSTRUCTION REQUIREMENTS - Every step must include:
1. **Prep Details**: Exact cutting sizes, preparation techniques with safety tips
2. **Visual Cues**: What to look for (color changes, texture, steam, bubbling)
3. **Audio Cues**: Sounds that indicate progress (sizzling, popping, crackling)
4. **Tactile Cues**: How ingredients should feel at each stage
5. **Safety Warnings**: Hot surfaces, sharp tools, food safety
6. **Equipment Notes**: What tools to use and alternatives if not available
7. **Troubleshooting**: What can go wrong and how to fix it
8. **Timing Guidance**: Time ranges with visual/audio checkpoints
9. **Technique Explanation**: HOW to perform cooking techniques properly
10. **Why It Matters**: Brief explanation of why this step is important

**INSTRUCTION FORMAT EXAMPLES:**
❌ Bad: "Sauté the onions until soft"
✅ Good: "Heat the oil in your pan until it shimmers and moves easily when you tilt the pan (about 2-3 minutes). Add the diced onions in a single layer - they should sizzle immediately when they hit the oil. Stir gently every 2-3 minutes until they turn from white to translucent and then golden around the edges (5-7 minutes total). They're ready when they feel tender when pressed with your spoon and smell sweet and fragrant."

❌ Bad: "Cook the meat until done"
✅ Good: "Add the beef pieces to the hot pan, making sure not to overcrowd (cook in batches if needed). Let them sit undisturbed for 2-3 minutes to develop a golden-brown crust - you'll hear steady sizzling. The meat is ready to flip when it releases easily from the pan and has a deep brown color. Turn each piece and cook another 2-3 minutes. The beef is properly cooked when it feels firm but not hard when pressed gently with tongs."

Return exactly this JSON structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description focusing on what makes this dish unique",
      "ingredients": [
        {"name": "scanned ingredient", "amount": "1", "unit": "cup", "source": "scanned"},
        {"name": "pantry staple", "amount": "2", "unit": "tbsp", "source": "pantry"},
        {"name": "optional ingredient", "amount": "1", "unit": "cup", "source": "optional", "notes": "enhances flavor but not required"}
      ],
      "instructions": [
        {
          "step": 1, 
          "instruction": "DETAILED step with visual cues, safety tips, technique explanation, timing guidance, and troubleshooting", 
          "time": 5, 
          "temperature": "350°F", 
          "tips": "Why this step matters + what can go wrong + how to fix it",
          "technique": "Name of cooking technique being used",
          "equipment": "Required tools and alternatives",
          "safety": "Safety warnings for this step if applicable"
        }
      ],
      "metadata": {
        "prepTime": 15,
        "cookTime": 20,
        "totalTime": 35,
        "servings": 4,
        "difficulty": "medium",
        "cuisineType": "must match specified cuisine preference",
        "dietaryTags": ["vegetarian"],
        "skillLevel": "intermediate",
        "cookingMethod": "stir-fry/roasted/raw/etc"
      },
      "nutrition": {"calories": 350, "protein": 25, "carbohydrates": 30, "fat": 15, "fiber": 8, "sodium": 600, "sugar": 5},
      "tips": ["Advanced cooking tip 1", "Advanced cooking tip 2", "Storage tip", "Preparation tip"],
      "variations": ["variation 1", "variation 2"],
      "storage": "storage instructions",
      "pairing": ["wine pairing", "side dish"],
      "ingredientsUsed": ["list of scanned ingredients used in this recipe"],
      "ingredientsSkipped": ["list of scanned ingredients not used"],
      "skipReason": "Brief explanation of why certain ingredients were skipped"
    }
  ],
  "ingredientAnalysis": {
    "totalScanned": ${ingredients.length},
    "compatibilityGroups": [
      ["compatible ingredient group 1"],
      ["compatible ingredient group 2"]
    ],
    "pantryStaplesUsed": ["list of pantry items used across all recipes"]
  }
}

CRITICAL: Generate exactly 3 completely different recipes with ULTRA-DETAILED beginner-friendly instructions that include visual cues, safety tips, technique explanations, and troubleshooting guidance in every step!`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `You are a world-class chef, nutritionist, and culinary instructor with expertise in creating personalized, delicious, and nutritionally balanced recipes. Your goal is to create recipes that are:

1. **Personalized**: Tailored to the user's skill level, dietary needs, and preferences
2. **Practical**: Using realistic cooking times, readily available ingredients, and clear instructions  
3. **Nutritious**: Balanced and healthy while still being delicious
4. **Creative**: Innovative combinations that surprise and delight
5. **Educational**: Every instruction teaches proper technique with visual cues, safety tips, and troubleshooting

**CRITICAL INSTRUCTION REQUIREMENTS:**
- Include specific visual, audio, and tactile cues for doneness
- Explain WHY each step matters for the final dish
- Include safety warnings where needed (hot oil, sharp knives, raw meat handling)
- Provide technique details (how to dice, proper stirring motion, heat level indicators)
- Give equipment alternatives and troubleshooting tips
- Include time ranges with visual cues rather than exact times
- Mention what can go wrong and how to fix it

Always respond with a valid JSON object that follows the exact structure requested. Include precise measurements, cooking times, and ULTRA-DETAILED step-by-step instructions that could guide a complete beginner to success. Consider seasonal ingredients, cultural authenticity when relevant, and provide comprehensive guidance for cooking success.

Be creative with flavor combinations while respecting dietary restrictions and preferences. If ingredients are limited, focus on techniques and seasonings that maximize flavor.`;
  }

  private buildEnhancedPrompt(options: RecipeGenerationOptions): string {
    const { ingredients, userPreferences = {}, recipeType, nutritionGoals, context } = options;

    let prompt = `Create a personalized ${recipeType || 'main dish'} recipe using these ingredients: ${ingredients.join(', ')}\n\n`;

    // Add user preferences
    if (userPreferences.skillLevel) {
      prompt += `👨‍🍳 Skill Level: ${userPreferences.skillLevel}\n`;
    }

    if (userPreferences.availableTime) {
      prompt += `⏱️ Time Available: ${userPreferences.availableTime} minutes\n`;
    }

    if (userPreferences.dietaryRestrictions && userPreferences.dietaryRestrictions.length > 0) {
      prompt += `🥗 Dietary Restrictions: ${userPreferences.dietaryRestrictions.join(', ')}\n`;
    }

    if (userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0) {
      prompt += `🌍 REQUIRED CUISINE STYLE: ${userPreferences.cuisinePreferences.join(', ')} - The recipe MUST be authentic to this cuisine style with appropriate spices, cooking techniques, and flavor profiles.\n`;
    }

    if (userPreferences.kitchenEquipment && userPreferences.kitchenEquipment.length > 0) {
      prompt += `🔧 Available Equipment: ${userPreferences.kitchenEquipment.join(', ')}\n`;
    }

    if (userPreferences.dislikedIngredients && userPreferences.dislikedIngredients.length > 0) {
      prompt += `❌ Avoid These Ingredients: ${userPreferences.dislikedIngredients.join(', ')}\n`;
    }

    if (userPreferences.spiceLevel) {
      prompt += `🌶️ Spice Level: ${userPreferences.spiceLevel}\n`;
    }

    if (userPreferences.servingSize) {
      prompt += `👥 Serving Size: ${userPreferences.servingSize} people\n`;
    }

    // Add nutrition goals
    if (nutritionGoals) {
      prompt += `\n🎯 Nutrition Goals:\n`;
      if (nutritionGoals.calories) {prompt += `- Target calories: ${nutritionGoals.calories}\n`;}
      if (nutritionGoals.protein) {prompt += `- Minimum protein: ${nutritionGoals.protein}g\n`;}
      if (nutritionGoals.lowCarb) {prompt += `- Low carb (under 20g net carbs)\n`;}
      if (nutritionGoals.lowFat) {prompt += `- Low fat (under 10g fat)\n`;}
      if (nutritionGoals.highFiber) {prompt += `- High fiber (over 8g fiber)\n`;}
    }

    // Add context
    if (context) {
      prompt += `\n🎪 Context: ${context}\n`;
    }

    prompt += `\n📋 Requirements:
1. Create a complete recipe with the exact JSON structure
2. STRICTLY follow the specified cuisine style - use authentic ingredients, spices, and cooking methods
3. Use realistic cooking times and temperatures
4. Provide ULTRA-DETAILED, beginner-friendly instructions with visual cues, safety tips, and troubleshooting
5. Include accurate nutritional estimates
6. Add 3-5 helpful cooking tips
7. Suggest 2-3 recipe variations
8. Include storage instructions
9. Recommend food pairings
10. Ensure the recipe matches the specified skill level
11. Make it delicious and satisfying!

🎓 DETAILED INSTRUCTION REQUIREMENTS - Every step must include:
- **Visual Cues**: Color changes, texture, steam, bubbling patterns
- **Audio Cues**: Sizzling sounds, popping, crackling that indicate progress
- **Tactile Cues**: How ingredients should feel at each stage
- **Safety Warnings**: Hot surfaces, sharp tools, food safety
- **Equipment Notes**: Required tools and alternatives if not available
- **Technique Details**: HOW to perform cooking techniques properly
- **Troubleshooting**: What can go wrong and how to fix it
- **Timing Guidance**: Time ranges with visual checkpoints rather than exact times
- **Why It Matters**: Brief explanation of why this step is important

Return the recipe as a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [
    {
      "step": 1, 
      "instruction": "ULTRA-DETAILED step with visual cues, safety tips, technique explanation, timing guidance, and troubleshooting", 
      "time": 5, 
      "temperature": "350°F", 
      "tips": "Why this step matters + what can go wrong + how to fix it",
      "technique": "Name of cooking technique being used",
      "equipment": "Required tools and alternatives",
      "safety": "Safety warnings for this step if applicable"
    }
  ],
  "metadata": {
    "prepTime": 15,
    "cookTime": 30,
    "totalTime": 45,
    "servings": 4,
    "difficulty": "medium",
    "cuisineType": "MUST match the specified cuisine preference",
    "dietaryTags": ["vegetarian"],
    "skillLevel": "intermediate"
  },
  "nutrition": {
    "calories": 350,
    "protein": 25,
    "carbohydrates": 30,
    "fat": 15,
    "fiber": 8,
    "sodium": 600,
    "sugar": 5
  },
  "tips": ["tip 1", "tip 2"],
  "variations": ["variation 1", "variation 2"],
  "storage": "storage instructions",
  "pairing": ["wine pairing", "side dish"]
}`;

    return prompt;
  }

  private async validateAndEnhanceRecipe(recipe: GeneratedRecipe, options: RecipeGenerationOptions): Promise<GeneratedRecipe> {
    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Generated recipe is missing required fields');
    }

    // Enhance with user preferences
    const enhanced = { ...recipe };

    // Adjust serving size if specified
    if (options.userPreferences?.servingSize && options.userPreferences.servingSize !== recipe.metadata.servings) {
      enhanced.metadata.servings = options.userPreferences.servingSize;
      // Note: In a production system, you might want to adjust ingredient quantities proportionally
    }

    // Add dietary tags based on ingredients analysis
    enhanced.metadata.dietaryTags = this.analyzeDietaryTags(recipe.ingredients, options.userPreferences?.dietaryRestrictions);

    // Validate nutrition values are reasonable
    if (enhanced.nutrition.calories < 50 || enhanced.nutrition.calories > 2000) {
      logger.warn('⚠️ Generated recipe has unusual calorie count', { 
        calories: enhanced.nutrition.calories,
        title: enhanced.title 
      });
    }

    // Add skill level based on complexity
    if (!enhanced.metadata.skillLevel) {
      enhanced.metadata.skillLevel = this.determineSkillLevel(enhanced);
    }

    return enhanced;
  }

  private analyzeDietaryTags(ingredients: any[], dietaryRestrictions?: string[]): string[] {
    const tags: string[] = [];
    const ingredientNames = ingredients.map(ing => ing.name.toLowerCase());

    // Check for common dietary patterns
    const hasAnyMeat = ingredientNames.some(name => 
      ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'ham', 'bacon', 'sausage'].some(meat => name.includes(meat))
    );

    const hasAnyDairy = ingredientNames.some(name => 
      ['milk', 'cheese', 'butter', 'cream', 'yogurt'].some(dairy => name.includes(dairy))
    );

    const hasEggs = ingredientNames.some(name => name.includes('egg'));

    if (!hasAnyMeat && !hasAnyDairy && !hasEggs) {
      tags.push('vegan');
    } else if (!hasAnyMeat) {
      tags.push('vegetarian');
    }

    // Add restriction-based tags
    if (dietaryRestrictions) {
      dietaryRestrictions.forEach(restriction => {
        if (!tags.includes(restriction.toLowerCase())) {
          tags.push(restriction.toLowerCase());
        }
      });
    }

    return tags;
  }

  private determineSkillLevel(recipe: GeneratedRecipe): string {
    let complexity = 0;

    // Factor in number of ingredients
    complexity += recipe.ingredients.length > 10 ? 2 : recipe.ingredients.length > 6 ? 1 : 0;

    // Factor in cooking time
    complexity += recipe.metadata.totalTime > 60 ? 2 : recipe.metadata.totalTime > 30 ? 1 : 0;

    // Factor in number of steps
    complexity += recipe.instructions.length > 8 ? 2 : recipe.instructions.length > 5 ? 1 : 0;

    // Factor in techniques (look for advanced cooking terms)
    const advancedTerms = ['sauté', 'braise', 'deglaze', 'temper', 'fold', 'emulsify', 'julienne'];
    const instructionText = recipe.instructions.map(i => i.instruction).join(' ').toLowerCase();
    const hasAdvancedTechniques = advancedTerms.some(term => instructionText.includes(term));
    
    if (hasAdvancedTechniques) {complexity += 2;}

    // Determine skill level
    if (complexity >= 5) {return 'advanced';}
    if (complexity >= 3) {return 'intermediate';}
    return 'beginner';
  }

  // Method to generate multiple recipe variations
  async generateRecipeVariations(baseRecipe: GeneratedRecipe, count: number = 3): Promise<GeneratedRecipe[]> {
    const variations: GeneratedRecipe[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const variationPrompt = this.buildVariationPrompt(baseRecipe, i + 1);
        
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: variationPrompt
            }
          ],
          temperature: 0.8, // Higher temperature for more creativity
          max_tokens: 2500,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const variation = JSON.parse(content) as GeneratedRecipe;
          variations.push(variation);
        }
      } catch (error) {
        logger.error('❌ Failed to generate recipe variation', { error, variationIndex: i + 1 });
      }
    }

    return variations;
  }

  private buildVariationPrompt(baseRecipe: GeneratedRecipe, variationNumber: number): string {
    const variationTypes = [
      'Create a healthier version with lower calories and more vegetables',
      'Create a more indulgent version with richer flavors and ingredients',
      'Create a quicker version that can be made in under 30 minutes',
      'Create a version using different cuisine flavors (e.g., Asian, Mexican, Mediterranean)',
      'Create a version suitable for meal prep and batch cooking'
    ];

    const selectedVariation = variationTypes[variationNumber - 1] || variationTypes[0];

    return `Based on this original recipe:
Title: ${baseRecipe.title}
Ingredients: ${baseRecipe.ingredients.map(i => `${i.amount} ${i.unit} ${i.name}`).join(', ')}

${selectedVariation}

Keep the same JSON structure but modify the ingredients, instructions, and metadata as needed for this variation.`;
  }
}

export const enhancedRecipeService = new EnhancedRecipeGenerationService();
export default enhancedRecipeService; 
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
  }[];
  instructions: {
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
    tips?: string;
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

  async generateRecipe(options: RecipeGenerationOptions): Promise<GeneratedRecipe> {
    try {
      logger.info('🍳 Enhanced recipe generation started', {
        ingredients: options.ingredients,
        preferences: options.userPreferences,
        type: options.recipeType
      });

      // Validate OpenAI API key exists
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      logger.info('🔑 OpenAI API key check', { 
        hasKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 15) + '...'
      });

      const prompt = this.buildEnhancedPrompt(options);
      
      logger.info('📤 Sending request to OpenAI...', {
        model: 'gpt-4o-mini',
        promptLength: prompt.length
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      });

      logger.info('📥 OpenAI response received', {
        hasResponse: !!response,
        hasChoices: !!(response?.choices?.length),
        firstChoiceContent: !!response?.choices?.[0]?.message?.content
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No recipe content generated from OpenAI');
      }

      logger.info('🔄 Parsing OpenAI response...', {
        contentLength: content.length,
        contentPreview: content.substring(0, 100) + '...'
      });

      // Log the full response for debugging
      console.log('🤖 FULL OPENAI RESPONSE:', content);

      const recipe = JSON.parse(content) as GeneratedRecipe;
      
      // Validate and enhance the generated recipe
      const enhancedRecipe = await this.validateAndEnhanceRecipe(recipe, options);
      
      logger.info('✅ Enhanced recipe generated successfully', {
        title: enhancedRecipe.title,
        difficulty: enhancedRecipe.metadata.difficulty,
        totalTime: enhancedRecipe.metadata.totalTime
      });

      return enhancedRecipe;

    } catch (error) {
      // Improved error logging
      logger.error('❌ Enhanced recipe generation failed', { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      });
      
      throw new Error('Failed to generate enhanced recipe: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private getSystemPrompt(): string {
    return `You are a world-class chef and nutritionist with expertise in creating personalized, delicious, and nutritionally balanced recipes. Your goal is to create recipes that are:

1. **Personalized**: Tailored to the user's skill level, dietary needs, and preferences
2. **Practical**: Using realistic cooking times, readily available ingredients, and clear instructions  
3. **Nutritious**: Balanced and healthy while still being delicious
4. **Creative**: Innovative combinations that surprise and delight
5. **Detailed**: Complete with tips, variations, and storage advice

Always respond with a valid JSON object that follows the exact structure requested. Include precise measurements, cooking times, and detailed step-by-step instructions. Consider seasonal ingredients, cultural authenticity when relevant, and provide helpful tips for success.

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
4. Provide detailed, easy-to-follow instructions
5. Include accurate nutritional estimates
6. Add 3-5 helpful cooking tips
7. Suggest 2-3 recipe variations
8. Include storage instructions
9. Recommend food pairings
10. Ensure the recipe matches the specified skill level
11. Make it delicious and satisfying!

Return the recipe as a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup", "notes": "optional"}],
  "instructions": [{"step": 1, "instruction": "detailed step", "time": 5, "temperature": "350°F", "tips": "helpful tip"}],
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
import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface RecipeStep {
  step: number;
  instruction: string;
  time?: number;
  temperature?: string;
  tips?: string;
  technique?: string;
  equipment?: string;
  safety?: string;
}

interface DetailedRecipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  cuisineType: string;
  dietaryTags: string[];
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    source: 'detected' | 'pantry' | 'store';
  }>;
  instructions: RecipeStep[];
  tips: string[];
  nutritionEstimate?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

interface DetailedRequest {
  selectedPreview: {
    id: string;
    title: string;
    description: string;
    estimatedTime: number;
    difficulty: string;
    cuisineType: string;
    mainIngredients: string[];
  };
  originalIngredients: string[];
  userPreferences: {
    servingSize: number;
    cuisinePreferences: string[];
    dietaryTags: string[];
    selectedAppliances: string[];
    timeAvailable: string;
    skillLevel: string;
    mealPrepEnabled: boolean;
    mealPrepPortions?: number;
  };
  sessionId: string;
}

interface DetailedResponse {
  sessionId: string;
  recipe: DetailedRecipe;
}

export class DetailedRecipeService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateDetailedRecipe(request: DetailedRequest): Promise<DetailedResponse> {
    try {
      logger.info('🍳 Generating detailed recipe...', {
        recipeTitle: request.selectedPreview.title,
        sessionId: request.sessionId
      });

      const prompt = this.buildDetailedPrompt(request);
      
      logger.info('📤 Sending detailed recipe request to OpenAI...', {
        promptLength: prompt.length,
        maxTokens: 4000
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef instructor. Generate detailed, clear cooking instructions with tips and techniques. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000, // More tokens for detailed instructions
        temperature: 0.6,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      logger.info('🔄 Parsing detailed recipe response...', {
        contentLength: content.length
      });

      // Debug logging for detailed content
      logger.info('🔍 Detailed response preview:', {
        first300Chars: content.substring(0, 300),
        last300Chars: content.substring(Math.max(0, content.length - 300)),
        startsWithBrace: content.trim().startsWith('{'),
        endsWithBrace: content.trim().endsWith('}')
      });

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        logger.error('❌ JSON parsing failed for detailed recipe:', {
          error: parseError,
          contentSample: content.substring(0, 500)
        });
        throw new Error('Invalid JSON response from OpenAI for detailed recipe');
      }

      // Validate and format response
      const detailedRecipe = this.validateAndFormatDetailedRecipe(result, request);

      logger.info('✅ Successfully generated detailed recipe', {
        recipeTitle: detailedRecipe.title,
        stepCount: detailedRecipe.instructions.length,
        sessionId: request.sessionId
      });

      return {
        sessionId: request.sessionId,
        recipe: detailedRecipe
      };

    } catch (error) {
      logger.error('❌ Error generating detailed recipe:', {
        error: error instanceof Error ? error.message : error,
        sessionId: request.sessionId
      });
      throw error;
    }
  }

  private buildDetailedPrompt(request: DetailedRequest): string {
    const ingredients = request.originalIngredients.join(', ');
    const appliances = request.userPreferences.selectedAppliances.join(', ');
    const dietary = request.userPreferences.dietaryTags.length > 0 
      ? request.userPreferences.dietaryTags.join(', ') 
      : 'none';

    return `Generate a complete detailed recipe based on this preview:

SELECTED RECIPE PREVIEW:
- Title: ${request.selectedPreview.title}
- Description: ${request.selectedPreview.description}
- Estimated Time: ${request.selectedPreview.estimatedTime} minutes
- Difficulty: ${request.selectedPreview.difficulty}
- Cuisine: ${request.selectedPreview.cuisineType}
- Main Ingredients: ${request.selectedPreview.mainIngredients.join(', ')}

AVAILABLE INGREDIENTS:
${ingredients}

USER PREFERENCES:
- Serving size: ${request.userPreferences.servingSize}
- Available appliances: ${appliances}
- Dietary restrictions: ${dietary}
- Skill level: ${request.userPreferences.skillLevel}
- Time available: ${request.userPreferences.timeAvailable}

Return JSON with this EXACT structure:
{
  "id": "detailed-recipe-1",
  "title": "Recipe Title",
  "description": "Detailed description",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "difficulty": "easy",
  "servings": 2,
  "cuisineType": "Italian",
  "dietaryTags": ["vegetarian"],
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "1",
      "unit": "cup",
      "source": "detected"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "Detailed step instruction",
      "time": 5,
      "temperature": "medium heat",
      "tips": "Pro tip for this step",
      "technique": "Sautéing",
      "equipment": "Large skillet",
      "safety": "Safety note if needed"
    }
  ],
  "tips": ["Overall cooking tip 1", "Overall cooking tip 2"],
  "nutritionEstimate": {
    "calories": 450,
    "protein": "25g",
    "carbs": "30g",
    "fat": "20g"
  }
}

Requirements:
- Create detailed step-by-step instructions (6-12 steps)
- Include timing, temperature, and technique for each step
- Add helpful tips and safety notes
- Use primarily the available ingredients, suggest pantry staples as needed
- Mark ingredient sources: "detected", "pantry", or "store"
- Include prep and cook times separately
- Provide nutrition estimates
- Match the preview recipe concept but expand with full details`;
  }

  private validateAndFormatDetailedRecipe(result: any, request: DetailedRequest): DetailedRecipe {
    return {
      id: result.id || `detailed-${Date.now()}`,
      title: result.title || request.selectedPreview.title,
      description: result.description || request.selectedPreview.description,
      prepTime: typeof result.prepTime === 'number' ? result.prepTime : 15,
      cookTime: typeof result.cookTime === 'number' ? result.cookTime : request.selectedPreview.estimatedTime,
      totalTime: typeof result.totalTime === 'number' ? result.totalTime : request.selectedPreview.estimatedTime,
      difficulty: ['easy', 'medium', 'hard'].includes(result.difficulty) ? result.difficulty : request.selectedPreview.difficulty as any,
      servings: typeof result.servings === 'number' ? result.servings : request.userPreferences.servingSize,
      cuisineType: result.cuisineType || request.selectedPreview.cuisineType,
      dietaryTags: Array.isArray(result.dietaryTags) ? result.dietaryTags : request.userPreferences.dietaryTags,
      ingredients: this.validateIngredients(result.ingredients || []),
      instructions: this.validateInstructions(result.instructions || []),
      tips: Array.isArray(result.tips) ? result.tips : ['Cook with love and patience!'],
      nutritionEstimate: result.nutritionEstimate || {
        calories: 400,
        protein: '20g',
        carbs: '30g',
        fat: '15g'
      }
    };
  }

  private validateIngredients(ingredients: any[]): DetailedRecipe['ingredients'] {
    return ingredients.map((ing, index) => ({
      name: ing.name || `Ingredient ${index + 1}`,
      amount: ing.amount || '1',
      unit: ing.unit || 'piece',
      source: ['detected', 'pantry', 'store'].includes(ing.source) ? ing.source : 'detected'
    }));
  }

  private validateInstructions(instructions: any[]): RecipeStep[] {
    return instructions.map((inst, index) => ({
      step: typeof inst.step === 'number' ? inst.step : index + 1,
      instruction: inst.instruction || `Step ${index + 1} instruction`,
      time: typeof inst.time === 'number' ? inst.time : undefined,
      temperature: inst.temperature || undefined,
      tips: inst.tips || undefined,
      technique: inst.technique || undefined,
      equipment: inst.equipment || undefined,
      safety: inst.safety || undefined
    }));
  }
} 
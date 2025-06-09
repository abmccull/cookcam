import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface RecipePreview {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisineType: string;
  mainIngredients: string[];
  appealFactors: string[];
}

interface PreviewRequest {
  detectedIngredients: string[];
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

interface PreviewResponse {
  sessionId: string;
  previews: RecipePreview[];
}

export class RecipePreviewService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generatePreviews(request: PreviewRequest): Promise<PreviewResponse> {
    try {
      logger.info('🚀 Generating recipe previews...', {
        ingredientCount: request.detectedIngredients.length,
        sessionId: request.sessionId
      });

      const prompt = this.buildPreviewPrompt(request);
      
      logger.info('📤 Sending preview request to OpenAI...', {
        promptLength: prompt.length,
        maxTokens: 2000
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef assistant. Generate recipe previews that are appealing and accurate. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000, // Reduced for faster response
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      logger.info('🔄 Parsing preview response...', {
        contentLength: content.length
      });

      // Debug logging for preview content
      logger.info('🔍 Preview response preview:', {
        first200Chars: content.substring(0, 200),
        last200Chars: content.substring(Math.max(0, content.length - 200)),
        startsWithBrace: content.trim().startsWith('{'),
        endsWithBrace: content.trim().endsWith('}')
      });

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        logger.error('❌ JSON parsing failed for previews:', {
          error: parseError,
          contentSample: content.substring(0, 500)
        });
        throw new Error('Invalid JSON response from OpenAI for previews');
      }

      // Validate and format response
      const previews = this.validateAndFormatPreviews(result.recipes || []);

      logger.info('✅ Successfully generated recipe previews', {
        previewCount: previews.length,
        sessionId: request.sessionId
      });

      return {
        sessionId: request.sessionId,
        previews
      };

    } catch (error) {
      logger.error('❌ Error generating recipe previews:', {
        error: error instanceof Error ? error.message : error,
        sessionId: request.sessionId
      });
      throw error;
    }
  }

  private buildPreviewPrompt(request: PreviewRequest): string {
    const ingredients = request.detectedIngredients.join(', ');
    const cuisines = request.userPreferences.cuisinePreferences.join(', ');
    const appliances = request.userPreferences.selectedAppliances.join(', ');
    const dietary = request.userPreferences.dietaryTags.length > 0 
      ? request.userPreferences.dietaryTags.join(', ') 
      : 'none';

    return `Generate 3 diverse recipe previews using these ingredients: ${ingredients}

User Preferences:
- Serving size: ${request.userPreferences.servingSize}
- Cuisine preferences: ${cuisines}
- Available appliances: ${appliances}
- Dietary restrictions: ${dietary}
- Skill level: ${request.userPreferences.skillLevel}
- Time available: ${request.userPreferences.timeAvailable}

Return JSON with this EXACT structure:
{
  "recipes": [
    {
      "id": "recipe-1",
      "title": "Recipe Title",
      "description": "Brief 1-2 sentence description",
      "estimatedTime": 30,
      "difficulty": "easy",
      "cuisineType": "Italian",
      "mainIngredients": ["ingredient1", "ingredient2", "ingredient3"],
      "appealFactors": ["Quick to make", "Family favorite", "Healthy"]
    }
  ]
}

Requirements:
- Create exactly 3 different recipes
- Use primarily the detected ingredients
- Each recipe should be different cuisine/cooking style
- Keep descriptions brief but appetizing
- Estimated time in minutes
- Difficulty: easy, medium, or hard
- Appeal factors: 2-3 short phrases explaining why someone would want to cook this`;
  }

  private validateAndFormatPreviews(recipes: any[]): RecipePreview[] {
    return recipes.slice(0, 3).map((recipe, index) => ({
      id: recipe.id || `preview-${index + 1}`,
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || 'A delicious recipe using your ingredients.',
      estimatedTime: typeof recipe.estimatedTime === 'number' ? recipe.estimatedTime : 30,
      difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty) ? recipe.difficulty : 'easy',
      cuisineType: recipe.cuisineType || 'International',
      mainIngredients: Array.isArray(recipe.mainIngredients) ? recipe.mainIngredients : [],
      appealFactors: Array.isArray(recipe.appealFactors) ? recipe.appealFactors : ['Delicious', 'Easy to make']
    }));
  }
} 
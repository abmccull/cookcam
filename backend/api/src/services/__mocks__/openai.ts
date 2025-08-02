// Mock OpenAI service for testing
export const mockOpenAIResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        title: 'Test Recipe',
        cuisine: 'American',
        servings: 2,
        totalTimeMinutes: 30,
        difficulty: 'easy',
        caloriesPerServing: 400,
        macros: {
          protein_g: 30,
          carbs_g: 40,
          fat_g: 10
        },
        ingredients: [
          { item: 'chicken', quantity: '2 pieces', fromPantry: false },
          { item: 'rice', quantity: '1 cup', fromPantry: true }
        ],
        steps: [
          { order: 1, instruction: 'Cook rice' },
          { order: 2, instruction: 'Cook chicken' },
          { order: 3, instruction: 'Serve together' }
        ],
        socialCaption: 'Delicious meal!'
      })
    }
  }]
};

let openaiClient: any = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockOpenAIResponse)
        }
      }
    };
  }
  return openaiClient;
}

export function resetOpenAIClient() {
  openaiClient = null;
}

export interface RecipeInput {
  detectedIngredients: string[];
  assumedStaples?: string[];
  dietaryTags?: string[];
  cuisinePreferences?: string[];
  timeAvailable?: string;
  skillLevel?: string;
}

export interface FullRecipe {
  title: string;
  cuisine: string;
  servings: number;
  totalTimeMinutes: number;
  difficulty: string;
  caloriesPerServing: number;
  macros: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  ingredients: Array<{
    item: string;
    quantity: string;
    fromPantry: boolean;
  }>;
  steps: Array<{
    order: number;
    instruction: string;
    technique?: string;
    proTip?: string;
  }>;
  finishingTip?: string;
  socialCaption: string;
}

export async function generateFullRecipe(
  selectedTitle: string,
  originalInput: RecipeInput
): Promise<FullRecipe> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (originalInput.detectedIngredients.length === 0) {
    throw new Error('At least one ingredient is required');
  }

  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Generate recipe for ${selectedTitle}`
      }]
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to generate full recipe');
  }
}
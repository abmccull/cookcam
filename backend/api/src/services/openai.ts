import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface RecipeInput {
  detectedIngredients: string[];
  assumedStaples?: string[];
  dietaryTags?: string[];
  cuisinePreferences?: string[];
  timeAvailable?: string;
  skillLevel?: string;
}

export interface RecipeSuggestion {
  title: string;
  cuisine: string;
  totalTimeMinutes: number;
  difficulty: string;
  oneSentenceTeaser: string;
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

const CHEF_CAMILLO_SYSTEM_PROMPT = `You are "Chef Camillo," the friendly house-chef for CookCam.
Your job is to turn the user's on-hand ingredients into safe, tasty, and fun recipes that match the user's stated preferences.
• ALWAYS balance flavours and food-safety best practices.
• NEVER suggest raw or under-cooked meat, fish, or eggs.
• Use metric AND US units.
• Write in an upbeat, concise, first-person plural tone ("Let's start by--").
• Return ONLY valid JSON that matches the schema provided.`;

export async function generateRecipeSuggestions(input: RecipeInput): Promise<RecipeSuggestion[]> {
  const userInput = {
    detectedIngredients: input.detectedIngredients,
    assumedStaples: input.assumedStaples || ['salt', 'black pepper', 'olive oil'],
    dietaryTags: input.dietaryTags || ['NONE'],
    cuisinePreferences: input.cuisinePreferences || ['SURPRISE_ME'],
    timeAvailable: input.timeAvailable || 'FLEXIBLE',
    skillLevel: input.skillLevel || 'SURPRISE_ME'
  };

  const taskPrompt = `TASK

1. Think of five recipe ideas that respect every constraint.
2. Pick the THREE that best minimise extra groceries and food waste.
3. For each, return:
   • title (max 55 chars, no emojis)
   • cuisine (one word)
   • totalTimeMinutes (prep+cook, integer)
   • difficulty ("Beginner", "Intermediate", "Advanced")
   • oneSentenceTeaser (≤18 words, no line-breaks)

Return JSON in this exact format:
{
  "recipes": [
    { "title": "...", "cuisine": "...", "totalTimeMinutes": 32, "difficulty": "...", "oneSentenceTeaser": "..." },
    { "title": "...", "cuisine": "...", "totalTimeMinutes": 25, "difficulty": "...", "oneSentenceTeaser": "..." },
    { "title": "...", "cuisine": "...", "totalTimeMinutes": 40, "difficulty": "...", "oneSentenceTeaser": "..." }
  ]
}`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CHEF_CAMILLO_SYSTEM_PROMPT },
        { role: 'user', content: `USER INPUT\n${JSON.stringify(userInput, null, 2)}\n\n${taskPrompt}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    return parsed.recipes;
  } catch (error) {
    console.error('Error generating recipe suggestions:', error);
    throw new Error('Failed to generate recipe suggestions');
  }
}

export async function generateFullRecipe(selectedTitle: string, originalInput: RecipeInput): Promise<FullRecipe> {
  const secondCallPrompt = `TASK

The user selected: "${selectedTitle}"

Now return the full recipe object in this exact JSON format:
{
  "title": "...",
  "cuisine": "...",
  "servings": 2,
  "totalTimeMinutes": 32,
  "difficulty": "...",
  "caloriesPerServing": 420,
  "macros": { "protein_g": 24, "carbs_g": 38, "fat_g": 18 },
  "ingredients": [
    { "item": "ripe tomatoes", "quantity": "250 g (2 medium)", "fromPantry": false },
    { "item": "olive oil", "quantity": "2 tbsp", "fromPantry": true }
  ],
  "steps": [
    {
      "order": 1,
      "instruction": "Slice the tomatoes into ½-inch wedges.",
      "technique": "knife skills – safe claw grip",
      "proTip": "Chill your knife 5 min for cleaner cuts."
    }
  ],
  "finishingTip": "Drizzle any juices left on the board over the salad for extra flavour.",
  "socialCaption": "🧑‍🍳 Just whipped up ${selectedTitle}! #CookCam #ZeroWaste"
}

Important:
- Mark ingredients from assumedStaples as "fromPantry": true
- Include technique and proTip for educational value
- Keep steps to maximum 8
- Make socialCaption shareable for TikTok/Instagram`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CHEF_CAMILLO_SYSTEM_PROMPT },
        { role: 'user', content: `Original ingredients: ${JSON.stringify(originalInput, null, 2)}\n\n${secondCallPrompt}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    console.error('Error generating full recipe:', error);
    throw new Error('Failed to generate full recipe');
  }
} 
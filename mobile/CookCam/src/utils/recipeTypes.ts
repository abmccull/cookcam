export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  source?: "detected" | "pantry" | "store";
}

export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userAvatar?: string | undefined;
  overallRating: number; // 1-5
  subRatings?:
    | {
        taste?: number | undefined;
        ease?: number | undefined;
        presentation?: number | undefined;
        accuracy?: number | undefined;
        value?: number | undefined;
      }
    | undefined;
  review?: string | undefined;
  images?: string[] | undefined;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimedRecipe {
  id: string;
  title: string;
  description: string;
  images: string[];
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisine: string;
  tags: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string | undefined;
  creatorBadge?:
    | {
        tier: number;
        name: string;
      }
    | undefined;
  creatorTier?: number | undefined;
  claimedAt: string;
  viewCount: number;
  shareCount: number;
  averageRating: number;
  ratingCount: number;
  trending: boolean;
  featured: boolean;
}

export interface RecipeMetrics {
  recipeId: string;
  viewCount: number;
  uniqueViewers: number;
  shareCount: number;
  saveCount: number;
  cookCount: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  subRatingsAverage: {
    taste: number;
    ease: number;
    presentation: number;
    accuracy: number;
    value: number;
  };
}

export interface CreatorStats {
  userId: string;
  totalRecipesClaimed: number;
  monthlyRecipesClaimed: number;
  totalViews: number;
  totalShares: number;
  totalRatings: number;
  averageRating: number;
  topRecipes: ClaimedRecipe[];
  monthlyXPFromRecipes: number;
  lifetimeXPFromRecipes: number;
  badges: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: string;
  // Time properties (keeping both formats for compatibility)
  prepTime?: number;
  cookTime?: number;
  cookingTime?: string; // Alternative format
  totalTime?: number;

  servings: number;
  difficulty: string;

  // Cuisine and cooking details
  cuisineType?: string;
  cookingMethod?: string;
  cuisine?: string;

  // Nutritional information
  calories?: number;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };

  // Recipe content
  ingredients: (RecipeIngredient | string)[];
  instructions?: Array<{
    step: number;
    instruction: string;
    time?: number;
    temperature?: string;
    tips?: string;
  }>;

  // Tags and categorization
  tags?: string[];

  // Metadata
  metadata?: {
    totalTime: number;
    skillLevel: string;
  };

  // Creator information
  creatorName?: string;
  creatorTier?: 1 | 2 | 3 | 4 | 5;

  // Social metrics
  rating?: number;
  ratingCount?: number;
  viewCount?: number;
  isTrending?: boolean;
  isCreatorRecipe?: boolean;

  // Additional recipe analysis (from AI generation)
  ingredientsUsed?: string[];
  ingredientsSkipped?: string[];
  skipReason?: string;

  // Tips and additional info
  tips?: string[];

  // Preview recipe functionality
  isPreview?: boolean; // Flag to indicate this is a preview, not a saved recipe
  previewData?: any; // Original preview data from API
}

// Utility functions for Recipe format conversion
export const normalizeRecipe = (recipe: any): Recipe => {
  return {
    ...recipe,
    // Normalize time properties
    prepTime:
      recipe.prepTime ||
      (recipe.cookingTime
        ? parseInt(recipe.cookingTime.replace(/\D/g, ""), 10) / 2
        : 0),
    cookTime:
      recipe.cookTime ||
      (recipe.cookingTime
        ? parseInt(recipe.cookingTime.replace(/\D/g, ""), 10) / 2
        : 0),
    cookingTime:
      recipe.cookingTime ||
      (recipe.prepTime && recipe.cookTime
        ? `${recipe.prepTime + recipe.cookTime} min`
        : undefined),

    // Normalize cuisine properties
    cuisineType: recipe.cuisineType || recipe.cuisine,
    cuisine: recipe.cuisine || recipe.cuisineType,

    // Normalize nutrition
    calories: recipe.calories || recipe.macros?.calories,

    // Ensure required properties have defaults
    ingredients: recipe.ingredients || [],
    tags: recipe.tags || [],
  };
};

export const convertToCardStackRecipe = (recipe: Recipe): Recipe => {
  return {
    ...recipe,
    prepTime: recipe.prepTime || 0,
    cookTime: recipe.cookTime || 0,
    cuisineType: recipe.cuisineType || recipe.cuisine || "Unknown",
    cookingMethod: recipe.cookingMethod || "Standard",
    calories: recipe.calories || recipe.macros?.calories || 0,
  };
};

export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  overallRating: number; // 1-5
  subRatings?: {
    taste?: number;
    ease?: number;
    presentation?: number;
    accuracy?: number;
    value?: number;
  };
  review?: string;
  images?: string[];
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
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisine: string;
  tags: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorBadge?: {
    tier: number;
    name: string;
  };
  creatorTier?: number;
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
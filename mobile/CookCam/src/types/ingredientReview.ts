export interface Ingredient {
  id: string;
  name: string;
  confidence: number;
  emoji: string;
  quantity?: string;
  unit?: string;
  variety?: string;
  category?: string;
}

export interface IngredientReviewScreenProps {
  navigation: unknown;
  route: {
    params: {
      imageUri: string;
      isSimulator: boolean;
      isManualInput?: boolean;
    };
  };
}

export interface MysteryReward {
  type: "xp" | "subscription" | "badge" | "recipe_unlock" | "tip";
  value: number | string;
  title: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

export interface ReviewHeaderProps {
  loading: boolean;
  ingredientCount: number;
  isManualInput?: boolean;
}

export interface StatsRowProps {
  ingredients: Ingredient[];
  showMysteryBox: boolean;
  onMysteryBoxOpen: () => void;
}

export interface IngredientCardProps {
  ingredient: Ingredient;
  index: number;
  addAnimScale: unknown;
  onQuantityChange: (_id: string, _action: "increase" | "decrease") => void;
  onRemove: (_id: string) => void;
}

export interface QuantityControlsProps {
  ingredient: Ingredient;
  onQuantityChange: (_id: string, _action: "increase" | "decrease") => void;
}

export interface ConfidenceBarProps {
  confidence: number;
}

export interface AddIngredientButtonProps {
  addAnimScale: unknown;
  onAddIngredient: () => void;
}

export interface MysteryBoxModalProps {
  visible: boolean;
  reward: MysteryReward | null;
  onClose: () => void;
}

export interface IngredientListProps {
  ingredients: Ingredient[];
  addAnimScale: unknown;
  onQuantityChange: (_id: string, _action: "increase" | "decrease") => void;
  onRemoveIngredient: (_id: string) => void;
  onAddIngredient: () => void;
}

export interface ContinueButtonProps {
  ingredientCount: number;
  onContinue: () => void;
}

export interface SmartIncrement {
  increment: number;
  minValue: number;
}

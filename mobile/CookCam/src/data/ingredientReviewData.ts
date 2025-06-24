import { Ingredient, MysteryReward, SmartIncrement } from "../types/ingredientReview";

export const getEmojiForIngredient = (name: string): string => {
  const emojiMap: { [key: string]: string } = {
    tomato: "🍅",
    tomatoes: "🍅",
    onion: "🧅",
    onions: "🧅",
    garlic: "🧄",
    cheese: "🧀",
    mozzarella: "🧀",
    cheddar: "🧀",
    basil: "🌿",
    herbs: "🌿",
    olive: "🫒",
    "olive oil": "🫒",
    pepper: "🌶️",
    peppers: "🌶️",
    carrot: "🥕",
    carrots: "🥕",
    potato: "🥔",
    potatoes: "🥔",
    chicken: "🐔",
    beef: "🥩",
    fish: "🐟",
    rice: "🍚",
    pasta: "🍝",
    bread: "🍞",
    milk: "🥛",
    egg: "🥚",
    eggs: "🥚",
    apple: "🍎",
    banana: "🍌",
    orange: "🍊",
  };

  const lowerName = name.toLowerCase();
  return emojiMap[lowerName] || "🥘";
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.85) return "#4CAF50"; // Green for 85%+
  if (confidence >= 0.7) return "#FFB800"; // Yellow for 70-85%
  return "#FF3B30"; // Red for <70%
};

export const getSmartIncrement = (ingredient: Ingredient): SmartIncrement => {
  const name = ingredient.name.toLowerCase();
  const unit = (ingredient.unit || "").toLowerCase();

  // Whole items that can't be fractioned
  if (
    name.includes("egg") ||
    name.includes("avocado") ||
    name.includes("onion") ||
    name.includes("potato") ||
    name.includes("apple") ||
    name.includes("banana") ||
    unit.includes("piece") ||
    unit.includes("whole") ||
    unit.includes("head")
  ) {
    return { increment: 1, minValue: 1 };
  }

  // Meat and protein (smaller increments for precision)
  if (
    name.includes("beef") ||
    name.includes("chicken") ||
    name.includes("pork") ||
    name.includes("fish") ||
    name.includes("turkey") ||
    name.includes("lamb") ||
    unit.includes("lb") ||
    unit.includes("oz") ||
    unit.includes("pound")
  ) {
    return { increment: 0.25, minValue: 0.25 };
  }

  // Spices and small quantities (teaspoons, tablespoons)
  if (
    unit.includes("tsp") ||
    unit.includes("tbsp") ||
    unit.includes("teaspoon") ||
    unit.includes("tablespoon") ||
    name.includes("salt") ||
    name.includes("pepper") ||
    name.includes("garlic powder") ||
    name.includes("oregano") ||
    name.includes("basil")
  ) {
    return { increment: 0.25, minValue: 0.25 };
  }

  // Liquids (cups, ml, liters)
  if (
    unit.includes("cup") ||
    unit.includes("ml") ||
    unit.includes("liter") ||
    unit.includes("fluid") ||
    name.includes("milk") ||
    name.includes("water") ||
    name.includes("oil") ||
    name.includes("juice")
  ) {
    return { increment: 0.25, minValue: 0.25 };
  }

  // Cheese and dairy (smaller portions)
  if (
    name.includes("cheese") ||
    name.includes("butter") ||
    name.includes("cream") ||
    name.includes("yogurt") ||
    unit.includes("slice")
  ) {
    return { increment: 0.5, minValue: 0.5 };
  }

  // Default for unknown items
  return { increment: 0.5, minValue: 0.5 };
};

export const getRandomReward = (): MysteryReward => {
  const random = Math.random();

  // Ultra rare rewards (0.01% chance = 1 in 10,000)
  if (random < 0.0001) {
    const ultraRare = [
      {
        type: "subscription" as const,
        value: "30_days",
        title: "LEGENDARY!",
        description: "Free month of premium features!",
        icon: "👑",
        color: "#FFD700",
      },
      {
        type: "xp" as const,
        value: 1000,
        title: "MEGA JACKPOT!",
        description: "1000 XP bonus!",
        icon: "🌟",
        color: "#FFD700",
      },
    ];
    return {
      ...ultraRare[Math.floor(Math.random() * ultraRare.length)],
      rarity: "legendary" as const,
    };
  }

  // Rare rewards (0.9% chance)
  if (random < 0.01) {
    const rare = [
      {
        type: "subscription" as const,
        value: "7_days",
        title: "Amazing Find!",
        description: "Free week of premium features!",
        icon: "💎",
        color: "#9C27B0",
      },
      {
        type: "xp" as const,
        value: 200,
        title: "XP Bonanza!",
        description: "200 XP bonus!",
        icon: "✨",
        color: "#9C27B0",
      },
      {
        type: "badge" as const,
        value: "mystery_hunter",
        title: "Mystery Hunter!",
        description: "Rare badge unlocked!",
        icon: "🎖️",
        color: "#9C27B0",
      },
    ];
    return {
      ...rare[Math.floor(Math.random() * rare.length)],
      rarity: "rare" as const,
    };
  }

  // Uncommon rewards (9% chance)
  if (random < 0.1) {
    const uncommon = [
      {
        type: "xp" as const,
        value: 50,
        title: "Nice Find!",
        description: "50 XP bonus!",
        icon: "⚡",
        color: "#2196F3",
      },
      {
        type: "recipe_unlock" as const,
        value: "premium_recipe",
        title: "Recipe Unlocked!",
        description: "Exclusive recipe revealed!",
        icon: "📜",
        color: "#2196F3",
      },
    ];
    return {
      ...uncommon[Math.floor(Math.random() * uncommon.length)],
      rarity: "uncommon" as const,
    };
  }

  // Common rewards (90% chance)
  const common = [
    {
      type: "xp" as const,
      value: 10,
      title: "Bonus XP!",
      description: "10 XP added!",
      icon: "🎯",
      color: "#4CAF50",
    },
    {
      type: "xp" as const,
      value: 15,
      title: "Small Bonus!",
      description: "15 XP reward!",
      icon: "🍀",
      color: "#4CAF50",
    },
    {
      type: "tip" as const,
      value: "cooking_tip",
      title: "Pro Tip!",
      description: "Cooking tip unlocked!",
      icon: "💡",
      color: "#4CAF50",
    },
  ];
  return {
    ...common[Math.floor(Math.random() * common.length)],
    rarity: "common" as const,
  };
};

export const getMockIngredients = (): Ingredient[] => [
  { id: "1", name: "Tomatoes", confidence: 0.95, emoji: "🍅" },
  { id: "2", name: "Mozzarella", confidence: 0.88, emoji: "🧀" },
  { id: "3", name: "Basil", confidence: 0.82, emoji: "🌿" },
  { id: "4", name: "Olive Oil", confidence: 0.79, emoji: "🫒" },
  { id: "5", name: "Garlic", confidence: 0.73, emoji: "🧄" },
];

export const getFallbackIngredients = (): string[] => [
  "cheddar cheese", 
  "butter", 
  "cheez-it crackers", 
  "salt", 
  "pepper"
];

export const getSimulatedIngredients = (): string[] => [
  "tomato", 
  "onion", 
  "garlic", 
  "cheese"
]; 
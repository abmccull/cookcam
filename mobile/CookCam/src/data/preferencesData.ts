/**
 * Preferences Screen Static Data
 * All quiz steps, options, and default configurations
 */

import { QuizStep, ServingOption, Appliance } from "../types/preferences";

export const SERVING_OPTIONS: ServingOption[] = [
  { id: "myself", label: "Just me", value: 1, icon: "👤" },
  { id: "couple", label: "Two people", value: 2, icon: "👥" },
  { id: "small-family", label: "Family (4)", value: 4, icon: "👪" },
  {
    id: "large-family",
    label: "Large group (6)",
    value: 6,
    icon: "👨‍👩‍👧‍👧‍👦‍👧",
  },
  {
    id: "custom",
    label: "Custom amount",
    value: 0,
    icon: "✏️",
    isCustom: true,
  },
];

export const DEFAULT_APPLIANCES: Appliance[] = [
  {
    id: "oven",
    name: "Oven",
    category: "cooking",
    icon: "oven",
    description: "Standard kitchen oven",
    selected: true,
  },
  {
    id: "stove",
    name: "Stove",
    category: "cooking",
    icon: "stove",
    description: "Stovetop cooking",
    selected: true,
  },
  {
    id: "air-fryer",
    name: "Air Fryer",
    category: "appliance",
    icon: "air fryer",
    description: "Crispy cooking",
    selected: false,
  },
  {
    id: "slow-cooker",
    name: "Slow Cooker",
    category: "appliance",
    icon: "slow cooker",
    description: "Long, slow cooking",
    selected: false,
  },
  {
    id: "grill",
    name: "Grill",
    category: "outdoor",
    icon: "grill",
    description: "Outdoor grilling",
    selected: false,
  },
  {
    id: "smoker",
    name: "BBQ Smoker",
    category: "outdoor",
    icon: "bbq smoker",
    description: "BBQ smoking",
    selected: false,
  },
  {
    id: "microwave",
    name: "Microwave",
    category: "appliance",
    icon: "microwave",
    description: "Quick heating",
    selected: true,
  },
  {
    id: "instant-pot",
    name: "Pressure Cooker",
    category: "appliance",
    icon: "pressure cooker",
    description: "Pressure cooking",
    selected: false,
  },
  {
    id: "food-processor",
    name: "Food Processor",
    category: "tool",
    icon: "food processor",
    description: "Chopping and mixing",
    selected: false,
  },
  {
    id: "stand-mixer",
    name: "Stand Mixer",
    category: "tool",
    icon: "stand mixer",
    description: "Baking and mixing",
    selected: false,
  },
  {
    id: "blender",
    name: "Blender",
    category: "tool",
    icon: "blender",
    description: "Smoothies and sauces",
    selected: false,
  },
  {
    id: "toaster-oven",
    name: "Toaster Oven",
    category: "appliance",
    icon: "toaster oven",
    description: "Small countertop oven",
    selected: false,
  },
];

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: "mealtype",
    title: "What are we cooking?",
    subtitle: "Choose the type of meal you want to make",
    type: "single",
    options: [
      {
        label: "🍳 Breakfast",
        subtitle: "Start your day right",
        value: "breakfast",
      },
      {
        label: "🥙 Lunch",
        subtitle: "Midday fuel",
        value: "lunch",
      },
      {
        label: "🍽️ Dinner",
        subtitle: "Main evening meal",
        value: "dinner",
      },
      {
        label: "🍰 Dessert",
        subtitle: "Sweet treats",
        value: "dessert",
      },
      {
        label: "🍿 Snacks",
        subtitle: "Light bites",
        value: "snacks",
      },
      {
        label: "🥗 Appetizer",
        subtitle: "Start the meal",
        value: "appetizer",
      },
    ],
  },
  {
    id: "serving",
    title: "How many people are you cooking for?",
    subtitle: "Select your serving size and meal prep preference",
    type: "serving",
  },
  {
    id: "appliances",
    title: "What kitchen equipment do you have?",
    subtitle: "Select all the appliances you can use",
    type: "appliances",
  },
  {
    id: "dietary",
    title: "Any dietary restrictions?",
    subtitle: "Select all that apply",
    type: "multi",
    options: [
      { label: "None", value: "none" },
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Vegan", value: "vegan" },
      { label: "Gluten-Free", value: "gluten-free" },
      { label: "Dairy-Free", value: "dairy-free" },
      { label: "Keto", value: "keto" },
      { label: "Paleo", value: "paleo" },
      { label: "Low-Carb", value: "low-carb" },
      { label: "Low-Fat", value: "low-fat" },
      { label: "Nut-Free", value: "nut-free" },
    ],
  },
  {
    id: "cuisine",
    title: "What cuisine are you craving?",
    subtitle: "Pick your favorites or let us surprise you",
    type: "multi",
    options: [
      { label: "Italian", value: "italian" },
      { label: "Asian", value: "asian" },
      { label: "Mexican", value: "mexican" },
      { label: "Mediterranean", value: "mediterranean" },
      { label: "American", value: "american" },
      { label: "Indian", value: "indian" },
      { label: "French", value: "french" },
      { label: "Thai", value: "thai" },
      { label: "Japanese", value: "japanese" },
      { label: "Chinese", value: "chinese" },
      { label: "Korean", value: "korean" },
      { label: "Greek", value: "greek" },
      { label: "Spanish", value: "spanish" },
      { label: "Vietnamese", value: "vietnamese" },
      { label: "Middle Eastern", value: "middle-eastern" },
      { label: "Caribbean", value: "caribbean" },
      { label: "Southern", value: "southern" },
      { label: "Fusion", value: "fusion" },
      { label: "🎲 Surprise Me!", value: "surprise" },
    ],
  },
  {
    id: "time",
    title: "How much time do you have?",
    subtitle: "We'll generate recipes that fit your schedule",
    type: "single",
    options: [
      {
        label: "⚡ Quick & Easy",
        subtitle: "Under 20 minutes",
        value: "quick",
      },
      { label: "⏱️ Medium", subtitle: "20-45 minutes", value: "medium" },
      {
        label: "🍖 Worth the Wait",
        subtitle: "Over 45 minutes",
        value: "long",
      },
      { label: "🤷 Flexible", subtitle: "Any cooking time", value: "any" },
    ],
  },
  {
    id: "difficulty",
    title: "What's your skill level?",
    subtitle: "Be honest, we won't judge!",
    type: "single",
    options: [
      {
        label: "🥄 Beginner",
        subtitle: "Simple recipes only",
        value: "easy",
      },
      {
        label: "🍳 Home Cook",
        subtitle: "Some experience needed",
        value: "medium",
      },
      {
        label: "👨‍🍳 Chef Mode",
        subtitle: "Bring on the challenge!",
        value: "hard",
      },
      { label: "🎲 Surprise Me", subtitle: "Any difficulty", value: "any" },
    ],
  },
];

export const MEAL_PREP_PORTIONS = [3, 4, 5, 6, 8, 10, 12, 14];

export const DEFAULT_PREFERENCES = {
  mealType: "dinner",
  cookingTime: "medium",
  difficulty: "any",
  dietary: [] as string[],
  cuisine: [] as string[],
  mealPrepEnabled: false,
  mealPrepPortions: 4,
};

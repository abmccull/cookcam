import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

// Database ingredient type for better type safety
interface DatabaseIngredient {
  name: string | null;
  calories_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbs_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
}

// Core nutrition interface focused on 5 key macros
export interface NutritionMacros {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  sodium_mg: number;
}

export interface IngredientMatch {
  name: string;
  confidence: number; // 0-1 scale
  nutrition: NutritionMacros;
}

export interface SmartNutritionResult {
  totalNutrition: NutritionMacros;
  perServing: NutritionMacros;
  ingredientBreakdown: Array<{
    inputName: string;
    matchedName: string;
    confidence: number;
    quantity: number;
    unit: string;
    gramsUsed: number;
    nutrition: NutritionMacros;
  }>;
  unmatchedIngredients: string[];
}

// Enhanced unit conversion with ingredient-specific density
function convertToGrams(quantity: number, unit: string, ingredientName: string): number {
  const unitLower = unit.toLowerCase().trim();

  // Base conversions
  const baseConversions: { [key: string]: number } = {
    // Weight units
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    kilograms: 1000,
    oz: 28.35,
    ounce: 28.35,
    ounces: 28.35,
    lb: 453.59,
    pound: 453.59,
    pounds: 453.59,

    // Volume units (using smart density)
    tsp: 5,
    teaspoon: 5,
    teaspoons: 5,
    tbsp: 15,
    tablespoon: 15,
    tablespoons: 15,
    ml: 1,
    milliliter: 1,
    milliliters: 1,
    l: 1000,
    liter: 1000,
    liters: 1000,

    // Count units (estimated averages)
    piece: 100,
    pieces: 100,
    whole: 150,
    item: 100,
    items: 100,
  };

  // If it's a direct weight unit, use it
  if (
    baseConversions[unitLower] &&
    !unitLower.includes('cup') &&
    !unitLower.includes('ml') &&
    !unitLower.includes('l')
  ) {
    return quantity * baseConversions[unitLower];
  }

  // Smart ingredient-specific conversions for volume units
  const ingredientLower = ingredientName.toLowerCase();

  // Cup conversions with ingredient-specific density
  if (unitLower.includes('cup')) {
    // Liquids (close to water density)
    if (
      ingredientLower.includes('milk') ||
      ingredientLower.includes('water') ||
      ingredientLower.includes('broth') ||
      ingredientLower.includes('stock') ||
      ingredientLower.includes('juice') ||
      ingredientLower.includes('wine')
    ) {
      return quantity * 240; // 1 cup = 240g for liquids
    }

    // Oils (lighter than water)
    if (ingredientLower.includes('oil') || ingredientLower.includes('butter')) {
      return quantity * 220; // 1 cup oil ≈ 220g
    }

    // Flours and powders (lighter and variable)
    if (
      ingredientLower.includes('flour') ||
      ingredientLower.includes('powder') ||
      ingredientLower.includes('sugar') ||
      ingredientLower.includes('salt')
    ) {
      return quantity * 200; // 1 cup flour ≈ 200g
    }

    // Rice and grains
    if (
      ingredientLower.includes('rice') ||
      ingredientLower.includes('quinoa') ||
      ingredientLower.includes('grain') ||
      ingredientLower.includes('pasta')
    ) {
      return quantity * 185; // 1 cup rice ≈ 185g
    }

    // Vegetables (chopped/diced)
    if (
      ingredientLower.includes('onion') ||
      ingredientLower.includes('carrot') ||
      ingredientLower.includes('pepper') ||
      ingredientLower.includes('vegetable')
    ) {
      return quantity * 150; // 1 cup chopped vegetables ≈ 150g
    }

    // Default cup conversion
    return quantity * 240;
  }

  // ML/L conversions with density adjustments
  if (unitLower.includes('ml') || unitLower.includes('l')) {
    const mlAmount = unitLower.includes('l') ? quantity * 1000 : quantity;

    // Oils are lighter
    if (ingredientLower.includes('oil')) {
      return mlAmount * 0.92; // Oil density ≈ 0.92 g/ml
    }

    // Most liquids close to water
    return mlAmount * 1.0; // 1 ml ≈ 1g for most liquids
  }

  // Whole item estimates based on ingredient type
  if (unitLower.includes('whole') || unitLower.includes('piece') || unitLower === '') {
    // Fruits
    if (ingredientLower.includes('apple')) {
      return quantity * 180;
    }
    if (ingredientLower.includes('banana')) {
      return quantity * 120;
    }
    if (ingredientLower.includes('orange')) {
      return quantity * 150;
    }
    if (ingredientLower.includes('tomato')) {
      return quantity * 120;
    }
    if (ingredientLower.includes('onion')) {
      return quantity * 110;
    }
    if (ingredientLower.includes('potato')) {
      return quantity * 200;
    }
    if (ingredientLower.includes('egg')) {
      return quantity * 50;
    }
    if (ingredientLower.includes('avocado')) {
      return quantity * 200;
    }

    // Default whole item
    return quantity * 100;
  }

  // Use base conversion if available, otherwise default to 100g
  return quantity * (baseConversions[unitLower] || 100);
}

// Fuzzy string matching for ingredient names
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) {
    return 1.0;
  }

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Word overlap scoring
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 && word1.length > 2) {
        // Ignore short words like "of", "in"
        matches++;
        break;
      }
    }
  }

  const wordOverlapScore = matches / Math.max(words1.length, words2.length);

  // Levenshtein distance for character-level similarity
  const levenshteinSimilarity = 1 - levenshteinDistance(s1, s2) / Math.max(s1.length, s2.length);

  // Combined score (weighted toward word overlap)
  return wordOverlapScore * 0.7 + levenshteinSimilarity * 0.3;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) {
    const row = matrix[0];
    if (row) {
      row[i] = i;
    }
  }
  for (let j = 0; j <= str2.length; j++) {
    const row = matrix[j];
    if (row) {
      row[0] = j;
    }
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const currentRow = matrix[j];
      const prevRow = matrix[j - 1];

      if (currentRow && prevRow) {
        const deletion = (currentRow[i - 1] ?? 0) + 1;
        const insertion = (prevRow[i] ?? 0) + 1;
        const substitution = (prevRow[i - 1] ?? 0) + indicator;

        currentRow[i] = Math.min(deletion, insertion, substitution);
      }
    }
  }

  const lastRow = matrix[str2.length];
  return lastRow ? (lastRow[str1.length] ?? 0) : 0;
}

// Enhanced production synonyms database
const PRODUCTION_SYNONYMS: { [key: string]: string[] } = {
  'ripe tomatoes': ['Tomatoes, red, ripe', 'tomatoes raw', 'tomato raw'],
  'red onion': ['Onions, red', 'onion, red', 'onions raw'],
  'olive oil': ['OLIVE OIL', 'oil olive'],
  'fresh basil': ['Basil, fresh', 'basil, sweet, fresh'],
  mozzarella: ['Cheese, mozzarella', 'MOZZARELLA'],
  'balsamic vinegar': ['BALSAMIC VINAIGRETTE', 'balsamic'],
  salt: ['SALT'],
  'black pepper': ['Spices, pepper, black', 'pepper, black'],
  'chicken breast': ['Chicken, breast, meat only', 'chicken, broilers'],
  garlic: ['Garlic, raw', 'garlic cloves'],
  butter: ['Butter, NFS', 'Butter, stick'],
  'parmesan cheese': ['PARMESAN CHEESE', 'parmesan'],
  'white onion': ['Onions, raw', 'onion raw'],
  'yellow onion': ['Onions, raw', 'onion raw'],
  'vegetable oil': ['Oil,'],
  'coconut oil': ['Oil,'],
  'avocado oil': ['Oil,'],
};

// Enhanced similarity calculation with penalty system
function calculateEnhancedSimilarity(input: string, dbName: string): number {
  const normalizedInput = input
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedDb = dbName
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Exact match
  if (normalizedInput === normalizedDb) {
    return 1.0;
  }

  // Substring containment
  if (normalizedDb.includes(normalizedInput)) {
    return 0.95;
  }
  if (normalizedInput.includes(normalizedDb)) {
    return 0.9;
  }

  // Word-based similarity
  const inputWords = new Set(normalizedInput.split(' ').filter((w) => w.length > 2));
  const dbWords = new Set(normalizedDb.split(' ').filter((w) => w.length > 2));

  if (inputWords.size === 0 || dbWords.size === 0) {
    return 0;
  }

  const intersection = new Set(Array.from(inputWords).filter((x) => dbWords.has(x)));
  const union = new Set([...Array.from(inputWords), ...Array.from(dbWords)]);

  let jaccardScore = intersection.size / union.size;

  // Important word bonus
  const importantWords = ['chicken', 'beef', 'oil', 'cheese', 'tomato', 'onion', 'butter'];
  for (const word of importantWords) {
    if (normalizedInput.includes(word) && normalizedDb.includes(word)) {
      jaccardScore += 0.1;
    }
  }

  // Type-specific penalties
  const wrongTypeRules = [
    { input: ['oil'], wrong: ['fish', 'sardine', 'whale', 'mayonnaise'], penalty: 0.6 },
    { input: ['salt'], wrong: ['nuts', 'beans', 'meat', 'caramel', 'gelato'], penalty: 0.5 },
    { input: ['butter'], wrong: ['butterbur', 'plant', 'vegetable'], penalty: 0.7 },
    { input: ['vinegar'], wrong: ['wine', 'alcohol'], penalty: 0.4 },
  ];

  let totalPenalty = 0;
  for (const rule of wrongTypeRules) {
    if (rule.input.some((term) => normalizedInput.includes(term))) {
      if (rule.wrong.some((term) => normalizedDb.includes(term))) {
        totalPenalty += rule.penalty;
        break;
      }
    }
  }

  return Math.max(0, Math.min(1, jaccardScore - totalPenalty));
}

// Helper function to check if an ingredient has valid nutrition data
function hasValidNutritionData(ingredient: DatabaseIngredient): ingredient is DatabaseIngredient & {
  name: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  sodium_mg_per_100g: number;
} {
  return (
    ingredient.name !== null &&
    ingredient.calories_per_100g !== null &&
    ingredient.protein_g_per_100g !== null &&
    ingredient.carbs_g_per_100g !== null &&
    ingredient.fat_g_per_100g !== null &&
    ingredient.sodium_mg_per_100g !== null
  );
}

// Find best matching ingredient using optimized production matcher
async function findBestIngredientMatch(ingredientName: string): Promise<IngredientMatch | null> {
  try {
    console.log(`🔍 Smart nutrition search: "${ingredientName}"`);

    let candidates: Array<{
      name: string;
      calories_per_100g: number;
      protein_g_per_100g: number;
      carbs_g_per_100g: number;
      fat_g_per_100g: number;
      sodium_mg_per_100g: number;
      matchType: string;
      similarity: number;
    }> = [];

    // Strategy 1: Synonym search (highest priority)
    const synonyms = PRODUCTION_SYNONYMS[ingredientName.toLowerCase()] || [];

    for (const synonym of synonyms) {
      const { data: matches } = await supabase
        .from('ingredients')
        .select(
          'name, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sodium_mg_per_100g'
        )
        .ilike('name', `%${synonym}%`)
        .not('calories_per_100g', 'is', null)
        .limit(5);

      if (matches) {
        for (const match of matches) {
          if (hasValidNutritionData(match)) {
            candidates.push({
              name: match.name,
              calories_per_100g: match.calories_per_100g,
              protein_g_per_100g: match.protein_g_per_100g,
              carbs_g_per_100g: match.carbs_g_per_100g,
              fat_g_per_100g: match.fat_g_per_100g,
              sodium_mg_per_100g: match.sodium_mg_per_100g,
              matchType: 'synonym',
              similarity: calculateEnhancedSimilarity(synonym, match.name),
            });
          }
        }
      }
    }

    // Strategy 2: Direct fuzzy search if no good synonyms
    if (candidates.filter((c) => c.similarity >= 0.8).length === 0) {
      const { data: fuzzyMatches } = await supabase
        .from('ingredients')
        .select(
          'name, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sodium_mg_per_100g'
        )
        .ilike('name', `%${ingredientName}%`)
        .not('calories_per_100g', 'is', null)
        .limit(15);

      if (fuzzyMatches) {
        for (const match of fuzzyMatches) {
          if (hasValidNutritionData(match)) {
            candidates.push({
              name: match.name,
              calories_per_100g: match.calories_per_100g,
              protein_g_per_100g: match.protein_g_per_100g,
              carbs_g_per_100g: match.carbs_g_per_100g,
              fat_g_per_100g: match.fat_g_per_100g,
              sodium_mg_per_100g: match.sodium_mg_per_100g,
              matchType: 'fuzzy',
              similarity: calculateEnhancedSimilarity(ingredientName, match.name),
            });
          }
        }
      }
    }

    // Find best candidate
    candidates = candidates
      .filter((c) => c.similarity >= 0.6) // Minimum threshold
      .sort((a, b) => b.similarity - a.similarity);

    if (candidates.length === 0) {
      console.log(`❌ No match found for: "${ingredientName}"`);
      return null;
    }

    const bestCandidate = candidates[0];
    if (!bestCandidate) {
      console.log(`❌ No valid candidate found for: "${ingredientName}"`);
      return null;
    }

    console.log(
      `✅ Matched "${ingredientName}" → "${bestCandidate.name}" (${Math.round(bestCandidate.similarity * 100)}%)`
    );

    return {
      name: bestCandidate.name,
      confidence: bestCandidate.similarity,
      nutrition: {
        calories: bestCandidate.calories_per_100g,
        carbs_g: bestCandidate.carbs_g_per_100g,
        protein_g: bestCandidate.protein_g_per_100g,
        fat_g: bestCandidate.fat_g_per_100g,
        sodium_mg: bestCandidate.sodium_mg_per_100g,
      },
    };
  } catch (error) {
    console.error('Error finding ingredient match:', error);
    return null;
  }
}

// Main function to calculate smart nutrition for AI-generated recipes
export async function calculateSmartNutrition(
  ingredients: Array<{ item: string; quantity: string; unit?: string }>,
  servings: number = 2
): Promise<SmartNutritionResult> {
  const totalNutrition: NutritionMacros = {
    calories: 0,
    carbs_g: 0,
    protein_g: 0,
    fat_g: 0,
    sodium_mg: 0,
  };

  const ingredientBreakdown: SmartNutritionResult['ingredientBreakdown'] = [];
  const unmatchedIngredients: string[] = [];

  for (const ingredient of ingredients) {
    // Parse quantity and unit from the ingredient
    const quantityMatch = ingredient.quantity.match(/(\d+(?:\.\d+)?)\s*(\w+)?/);
    if (!quantityMatch || !quantityMatch[1]) {
      unmatchedIngredients.push(ingredient.item);
      continue;
    }

    const quantity = parseFloat(quantityMatch[1]);
    const unit = ingredient.unit || quantityMatch[2] || 'piece';

    // Find best database match
    const match = await findBestIngredientMatch(ingredient.item);

    if (!match || match.confidence < 0.5) {
      unmatchedIngredients.push(ingredient.item);
      continue;
    }

    // Convert to grams
    const gramsUsed = convertToGrams(quantity, unit, ingredient.item);
    const factor = gramsUsed / 100; // Convert to per-100g factor

    // Calculate nutrition for this ingredient
    const ingredientNutrition: NutritionMacros = {
      calories: Math.round(match.nutrition.calories * factor * 10) / 10,
      carbs_g: Math.round(match.nutrition.carbs_g * factor * 10) / 10,
      protein_g: Math.round(match.nutrition.protein_g * factor * 10) / 10,
      fat_g: Math.round(match.nutrition.fat_g * factor * 10) / 10,
      sodium_mg: Math.round(match.nutrition.sodium_mg * factor * 10) / 10,
    };

    // Add to totals
    totalNutrition.calories += ingredientNutrition.calories;
    totalNutrition.carbs_g += ingredientNutrition.carbs_g;
    totalNutrition.protein_g += ingredientNutrition.protein_g;
    totalNutrition.fat_g += ingredientNutrition.fat_g;
    totalNutrition.sodium_mg += ingredientNutrition.sodium_mg;

    // Add to breakdown
    ingredientBreakdown.push({
      inputName: ingredient.item,
      matchedName: match.name,
      confidence: match.confidence,
      quantity,
      unit,
      gramsUsed,
      nutrition: ingredientNutrition,
    });
  }

  // Calculate per-serving nutrition
  const perServing: NutritionMacros = {
    calories: Math.round((totalNutrition.calories / servings) * 10) / 10,
    carbs_g: Math.round((totalNutrition.carbs_g / servings) * 10) / 10,
    protein_g: Math.round((totalNutrition.protein_g / servings) * 10) / 10,
    fat_g: Math.round((totalNutrition.fat_g / servings) * 10) / 10,
    sodium_mg: Math.round((totalNutrition.sodium_mg / servings) * 10) / 10,
  };

  // Round totals
  totalNutrition.calories = Math.round(totalNutrition.calories * 10) / 10;
  totalNutrition.carbs_g = Math.round(totalNutrition.carbs_g * 10) / 10;
  totalNutrition.protein_g = Math.round(totalNutrition.protein_g * 10) / 10;
  totalNutrition.fat_g = Math.round(totalNutrition.fat_g * 10) / 10;
  totalNutrition.sodium_mg = Math.round(totalNutrition.sodium_mg * 10) / 10;

  return {
    totalNutrition,
    perServing,
    ingredientBreakdown,
    unmatchedIngredients,
  };
}

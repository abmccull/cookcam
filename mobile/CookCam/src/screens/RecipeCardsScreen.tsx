import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import {
  Heart,
  X,
  RotateCcw,
  ChefHat,
  Clock,
  Users,
  Plus,
  ArrowRight,
  Flame,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { recipeService } from "../services/api";
import LoadingAnimation from "../components/LoadingAnimation";
import CardStack from "../components/CardStack";
import SafeScreen from "../components/SafeScreen";
import { Recipe } from "../utils/recipeTypes";
import logger from "../utils/logger";


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecipeCardsScreenProps {
  navigation: any;
  route: any;
}

const RecipeCardsScreen: React.FC<RecipeCardsScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients = [], preferences = {} } = route.params || {};

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawPreviews, setRawPreviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const generateRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      logger.info("🚀 Generating new recipe previews...", { preferences });
      const detectedIngredients = ingredients.map((ing: any) => ing.name);
      
      // Map frontend preferences to the structure the backend API expects
      const apiPreferences = {
        cuisinePreferences: preferences.cuisine || [],
        dietaryTags: preferences.dietary || [],
        selectedAppliances: preferences.appliances || ["oven", "stove", "microwave"],
        servingSize: preferences.servings || 2,
        skillLevel: preferences.difficulty || "any",
        timeAvailable: preferences.cookingTime || "any",
        mealPrepEnabled: preferences.mealPrep || false,
      };

      const response = await recipeService.generatePreviews({
        detectedIngredients,
        userPreferences: apiPreferences,
      });

      if (response.success && response.data?.data?.previews?.length) {
        const { previews, sessionId } = response.data.data;
        setSessionId(sessionId);
        setRawPreviews(previews);
        
        const formattedRecipes: Recipe[] = previews.map((p: any) => ({
          id: p.id || `preview-${Math.random()}`,
          title: p.title,
          description: p.description,
          image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(p.title)}`, // Placeholder
          cookingTime: `${p.estimatedTime} min`,
          servings: preferences.servingSize || 2,
          difficulty: p.difficulty,
          tags: [p.cuisineType, "AI Generated"].filter(Boolean),
          // ... other fields from your Recipe type
        }));
        
        setRecipes(formattedRecipes);
        logger.info(`✅ Found ${formattedRecipes.length} recipes.`);
      } else {
        throw new Error("No recipe previews were generated.");
      }
    } catch (e: any) {
      logger.error("❌ Recipe generation failed", e);
      setError(e.message || "Could not fetch recipes.");
    } finally {
      setIsLoading(false);
    }
  }, [ingredients, preferences]);

  useEffect(() => {
    generateRecipes();
  }, [generateRecipes]);

  // Handle cooking a recipe
  const handleCookRecipe = async (recipe: Recipe) => {
    // Find the original preview data using the recipe's ID
    const recipePreviewData = rawPreviews.find(p => (p.id || `preview-${p.title}`) === recipe.id);

    if (!recipePreviewData || !sessionId) {
      Alert.alert("Error", "Unable to generate detailed recipe. Session data is missing.");
      return;
    }

    try {
      logger.debug("🍳 Generating detailed recipe for:", recipe.title);
      
      const detailedResponse = await recipeService.generateDetailedRecipe({
        selectedPreview: recipePreviewData,
        sessionId: sessionId,
      });

      if (detailedResponse.success && detailedResponse.data?.data?.recipe) {
        const detailedRecipe = detailedResponse.data.data.recipe;

        const cookModeRecipe: Recipe = {
          ...recipe,
          ingredients: detailedRecipe.ingredients || recipe.ingredients,
          instructions: detailedRecipe.instructions?.map((inst: any) =>
            typeof inst === "string" ? inst : inst.instruction,
          ) || [],
          tips: detailedRecipe.tips || [],
        };

        navigation.navigate("CookMode", {
          recipe: cookModeRecipe,
          sessionId: sessionId,
          detailedRecipeId: detailedResponse.data.data.stored_recipe?.id,
        });
      } else {
        throw new Error("Invalid detailed recipe response format");
      }
    } catch (error: any) {
      logger.error("❌ Detailed recipe generation failed:", error);
      Alert.alert("Recipe Generation Failed", error?.message || "Please try again.");
    }
  };

  // Handle favoriting a recipe
  const handleFavoriteRecipe = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Implement favorite logic here
    logger.debug("❤️ Favorited recipe:", recipe.title);
  };

  // Handle viewing recipe details
  const handleViewRecipeDetails = (recipe: Recipe) => {
    // Could open a modal or navigate to detail screen
    logger.debug("👁️ Viewing recipe details:", recipe.title);
  };

  // Handle refreshing recipes
  const handleRefreshRecipes = () => {
    generateRecipes();
  };

  logger.debug("🎯 RecipeCardsScreen render:", {
    recipesCount: recipes.length,
    isLoading,
    error: !!error,
    hasSessionId: !!sessionId,
  });

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Suggestions</Text>
        <Text style={styles.subtitle}>
          {isLoading ? "Finding ideas..." : `${recipes.length} recipes found • Swipe to explore`}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        {isLoading && (
          <LoadingAnimation visible={true} variant="previews" />
        )}

        {!isLoading && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={generateRecipes}>
              <RotateCcw size={18} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && (
          <CardStack
            recipes={recipes}
            onCookRecipe={handleCookRecipe}
            onFavoriteRecipe={handleFavoriteRecipe}
            onViewRecipeDetails={handleViewRecipeDetails}
            onRefreshRecipes={generateRecipes}
          />
        )}
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  errorContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    margin: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RecipeCardsScreen;

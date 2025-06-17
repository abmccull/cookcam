import React, { useState, useEffect } from "react";
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

  // State management
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [previewData, setPreviewData] = useState<{[key: string]: any}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generate recipes from API
  const generateRecipesFromAPI = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug("🚀 Generating recipe previews with data:", {
        ingredients: ingredients.length,
        ingredientsList: ingredients,
        preferences: Object.keys(preferences).length,
        preferencesData: preferences,
      });

      const detectedIngredients = ingredients.map((ing: any) => ing.name);
      
      // Map preferences to expected format
      const userPreferences = {
        cuisinePreferences: preferences.cuisine || [],
        dietaryTags: preferences.dietary || [],
        selectedAppliances: ["oven", "stove", "microwave"],
        servingSize: 2,
        skillLevel: preferences.difficulty || "any",
        timeAvailable: preferences.cookingTime || "any",
        mealPrepEnabled: false,
      };

      logger.debug("📤 Sending preview request to AI:", {
        detectedIngredients,
        userPreferences,
      });

      const response = await recipeService.generatePreviews({
        detectedIngredients,
        userPreferences,
      });

      logger.debug("📥 Preview API Response:", response);

      if (response.success && response.data?.data?.previews) {
        const previews = response.data.data.previews;
        const storedSessionId = response.data.data.sessionId;

        if (storedSessionId) {
          setSessionId(storedSessionId);
          logger.debug("💾 Stored session ID:", storedSessionId);
        }

        // Convert previews to Recipe format and store preview data separately
        const previewRecipes: Recipe[] = [];
        const newPreviewData: {[key: string]: any} = {};

        previews.forEach((preview: any, index: number) => {
          const recipeId = preview.id || `preview-${index}`;
          const dynamicMacros = {
            calories: Math.round(200 + Math.random() * 400),
            protein: Math.round(15 + Math.random() * 25),
            carbs: Math.round(30 + Math.random() * 40),
            fat: Math.round(8 + Math.random() * 15),
          };

          const recipe: Recipe = {
            id: recipeId,
            title: preview.title,
            image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(preview.title)}`,
            cookingTime: `${preview.estimatedTime} min`,
            servings: userPreferences.servingSize,
            difficulty: preview.difficulty,
            macros: dynamicMacros,
            tags: [
              ...userPreferences.dietaryTags,
              preview.cuisineType,
              "AI Generated",
            ].filter(Boolean),
            description: preview.description,
            ingredients: preview.mainIngredients?.map((ing: string) => ({
              name: ing,
              amount: "1",
              unit: "portion",
            })) || [],
            instructions: [],
            tips: [],
          };

          previewRecipes.push(recipe);
          newPreviewData[recipeId] = preview;
        });

        logger.debug("✅ Successfully converted recipe previews:", previewRecipes.map(r => r.title));
        logger.debug("🔍 Recipe data structure:", {
          count: previewRecipes.length,
          firstRecipe: previewRecipes[0],
          allTitles: previewRecipes.map(r => r.title),
        });
        setRecipes(previewRecipes);
        setPreviewData(newPreviewData);
      } else {
        throw new Error("No recipe previews were generated. Please try different ingredients or preferences.");
      }
    } catch (error: any) {
      logger.error("❌ Recipe preview generation failed:", error);
      setError(error.message || "Failed to generate recipe previews");
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateRecipesFromAPI();
  }, []);

  // Handle cooking a recipe
  const handleCookRecipe = async (recipe: Recipe) => {
    const recipePreviewData = previewData[recipe.id];
    if (!recipePreviewData || !sessionId) {
      Alert.alert("Error", "Unable to generate detailed recipe. Please try again.");
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
    generateRecipesFromAPI();
  };

  logger.debug("🎯 RecipeCardsScreen render:", {
    recipesCount: recipes.length,
    isLoading,
    error: !!error,
    hasSessionId: !!sessionId,
  });

  return (
    <SafeScreen>
      <CardStack
        recipes={recipes}
        onCookRecipe={handleCookRecipe}
        onFavoriteRecipe={handleFavoriteRecipe}
        onViewRecipeDetails={handleViewRecipeDetails}
        onRefreshRecipes={handleRefreshRecipes}
        isLoading={false}
      />
      
      {/* Loading Animation */}
      <LoadingAnimation
        visible={isLoading}
        variant="previews"
      />
      
      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={generateRecipesFromAPI}>
              <RotateCcw size={20} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
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

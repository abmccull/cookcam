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
import { cookCamApi } from "../services/cookCamApi";
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
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const generateRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      logger.info("🚀 Generating new recipe previews...", { preferences });
      logger.debug("📊 Preferences received:", {
        servingSize: preferences.servingSize,
        selectedAppliances: preferences.selectedAppliances,
        mealPrepEnabled: preferences.mealPrepEnabled,
        mealPrepPortions: preferences.mealPrepPortions,
        cookingTime: preferences.cookingTime,
        difficulty: preferences.difficulty,
        dietary: preferences.dietary,
        cuisine: preferences.cuisine
      });
      const detectedIngredients = ingredients.map((ing: any) => ing.name);
      
      // Map frontend preferences to the structure the backend API expects
      const apiPreferences = {
        cuisinePreferences: preferences.cuisine || [],
        dietaryTags: preferences.dietary || [],
        selectedAppliances: preferences.selectedAppliances || ["oven", "stove", "microwave"],
        servingSize: preferences.servingSize || 2,
        skillLevel: preferences.difficulty || "any",
        timeAvailable: preferences.cookingTime || "any",
        mealPrepEnabled: preferences.mealPrepEnabled || false,
        mealPrepPortions: preferences.mealPrepPortions || null,
        mealType: preferences.mealType || "dinner",
      };

      logger.debug("🚀 Sending to backend API:", {
        detectedIngredients,
        userPreferences: apiPreferences,
      });

      const response = await cookCamApi.generatePreviews({
        detectedIngredients,
        userPreferences: apiPreferences,
      });

      if (response.success && response.data?.data?.previews?.length) {
        const { previews, sessionId } = response.data.data;
        setSessionId(sessionId);
        setRawPreviews(previews);
        
        const formattedRecipes: Recipe[] = previews.map((p: any, index: number) => ({
          id: p.id || `preview-${sessionId}-${index}`, // Use sessionId for better tracking
          title: p.title,
          description: p.description,
          image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(p.title)}`, // Placeholder
          cookingTime: `${p.estimatedTime} min`,
          servings: preferences.servingSize || 2,
          difficulty: p.difficulty,
          tags: [p.cuisineType, "AI Generated"].filter(Boolean),
          // Add preview data for favorites functionality
          previewData: p,
          isPreview: true, // Flag to indicate this is a preview, not a saved recipe
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
      setIsGeneratingDetailed(true);
      logger.debug("🍳 Generating detailed recipe for:", recipe.title);
      
      const detailedResponse = await cookCamApi.generateDetailedRecipe({
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
    } finally {
      setIsGeneratingDetailed(false);
    }
  };

  // Handle favoriting a recipe
  const handleFavoriteRecipe = async (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      logger.debug("❤️ Toggling favorite for recipe:", recipe.title);
      
      // Check if this is a preview recipe (not yet saved)
      if ((recipe as any).isPreview) {
        // First, we need to generate and save the detailed recipe
        const recipePreviewData = rawPreviews.find(p => 
          (p.id || `preview-${sessionId}-${rawPreviews.indexOf(p)}`) === recipe.id
        );

        if (!recipePreviewData || !sessionId) {
          throw new Error("Unable to save recipe. Session data is missing.");
        }

        logger.debug("🔄 Generating detailed recipe to save as favorite...");
        
        const detailedResponse = await cookCamApi.generateDetailedRecipe({
          selectedPreview: recipePreviewData,
          sessionId: sessionId,
        });

        if (detailedResponse.success && detailedResponse.data?.data?.stored_recipe?.id) {
          const savedRecipeId = detailedResponse.data.data.stored_recipe.id;
          logger.debug("✅ Recipe saved with ID:", savedRecipeId);
          
          // Now favorite the saved recipe
          const favoriteResponse = await cookCamApi.toggleFavoriteRecipe(savedRecipeId);
          
          if (favoriteResponse.success) {
            Alert.alert(
              "Added to Favorites! ❤️",
              `Recipe "${recipe.title}" has been saved and added to your favorites!`,
              [{ text: "OK" }]
            );
          } else {
            throw new Error("Recipe was saved but failed to add to favorites");
          }
        } else {
          throw new Error("Failed to generate detailed recipe");
        }
      } else {
        // This is already a saved recipe, just toggle favorite status
        const response = await cookCamApi.toggleFavoriteRecipe(recipe.id);
        
        if (response.success) {
          logger.debug("✅ Successfully toggled favorite for:", recipe.title);
          Alert.alert(
            "Success!",
            `Recipe "${recipe.title}" has been ${response.data?.favorited ? 'added to' : 'removed from'} your favorites!`,
            [{ text: "OK" }]
          );
        } else {
          throw new Error(response.error || "Failed to update favorite status");
        }
      }
    } catch (error: any) {
      logger.error("❌ Failed to toggle favorite:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update favorite status. Please try again.",
        [{ text: "OK" }]
      );
    }
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
    <SafeScreen style={styles.container} includeBottom={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Suggestions</Text>
        <Text style={styles.subtitle}>
          {isLoading ? "Finding ideas..." : `${recipes.length} recipes found`}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        {isLoading && (
          <LoadingAnimation visible={true} variant="previews" />
        )}

        {isGeneratingDetailed && (
          <LoadingAnimation visible={true} variant="detailed" />
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
          <View style={styles.cardStackContainer}>
            <CardStack
              recipes={recipes}
              onCookRecipe={handleCookRecipe}
              onFavoriteRecipe={handleFavoriteRecipe}
              onViewRecipeDetails={handleViewRecipeDetails}
              onRefreshRecipes={generateRecipes}
              isLoading={false}
            />
          </View>
        )}

        {/* Swipe instructions positioned at the bottom of content area */}
        {!isLoading && !error && recipes.length > 0 && (
          <View style={styles.swipeInstructionsContainer}>
            <View style={styles.swipeInstructionCard}>
              <View style={styles.swipeIconContainer}>
                <X size={18} color="#FF5252" />
              </View>
              <Text style={styles.swipeText}>Swipe left to dismiss</Text>
            </View>
            <View style={styles.swipeInstructionCard}>
              <View style={styles.swipeIconContainer}>
                <ChefHat size={18} color="#4CAF50" />
              </View>
              <Text style={styles.swipeText}>Swipe right to cook</Text>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 5,
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
    justifyContent: 'flex-start',
  },
  cardStackContainer: {
    flex: 1,
    marginBottom: 10,
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
  swipeInstructionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 'auto', // Push to bottom of the content container
    marginBottom: 20,
    gap: 12,
  },
  swipeInstructionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  swipeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});

export default RecipeCardsScreen;

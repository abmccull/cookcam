import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import OptimizedImage from "../components/OptimizedImage";
import {
  Heart,
  Clock,
  ChefHat,
  Star,
  Trophy,
  TrendingUp,
  Award,
} from "lucide-react-native";
import { useGamification } from "../context/GamificationContext";
import { useAuth } from "../context/AuthContext";
import { cookCamApi } from "../services/cookCamApi";
import * as Haptics from "expo-haptics";
import logger from "../utils/logger";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SavedRecipe {
  created_at: string;
  recipe: {
    id: string;
    title: string;
    description?: string;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    total_time_minutes?: number;
    difficulty?: string;
    cuisine_type?: string;
    servings?: number;
    ingredients?: any[];
    instructions?: any[];
    image_url?: string;
    nutrition_info?: any;
    creator?: {
      id: string;
      name: string;
      avatar_url?: string;
      level?: number;
    };
  };
}

interface CollectionBadge {
  id: string;
  name: string;
  icon: string;
  requirement: number;
  cuisineType: string;
  earned: boolean;
}

interface FavoritesScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Favorites">;
}

const FavoritesScreen = ({ navigation }: FavoritesScreenProps) => {
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "recent" | "top-rated" | "collections" | "completed"
  >("all");
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [completedRecipes, setCompletedRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { addXP } = useGamification();
  const { user } = useAuth();

  // Track last user ID to prevent unnecessary loads
  const lastUserIdRef = useRef<string | null>(null);

  // Animation values
  const milestoneScale = useRef(new Animated.Value(0)).current;
  const recommendScale = useRef(new Animated.Value(0.95)).current;

  // Fetch saved recipes from API
  const fetchSavedRecipes = async () => {
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await cookCamApi.getSavedRecipes(50, 0);

      logger.debug("GetSavedRecipes response:", {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        error: response.error,
        fullResponse: response,
      });

      if (response.success && response.data) {
        // Check if it's direct saved_recipes array or wrapped in data
        const savedRecipesArray = response.data.saved_recipes || response.data;

        if (Array.isArray(savedRecipesArray)) {
          // Transform API response to match SavedRecipe interface
          const transformedRecipes: SavedRecipe[] = savedRecipesArray.map(
            (savedRecipe: any) => ({
              created_at: savedRecipe.created_at,
              recipe: savedRecipe.recipe,
            }),
          );
          setSavedRecipes(transformedRecipes);
        } else {
          logger.error("Saved recipes is not an array:", savedRecipesArray);
          setSavedRecipes([]);
        }
      } else {
        logger.error(
          "Failed to fetch saved recipes:",
          response.error || "Unknown error",
        );
        setSavedRecipes([]);
      }
    } catch (error) {
      logger.error("Error fetching saved recipes:", error);
      setSavedRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch completed recipes from local storage (temporary solution)
  const fetchCompletedRecipes = async () => {
    if (!user) {
      return;
    }

    try {
      const completedRecipeIds = await AsyncStorage.getItem(
        `completed_recipes_${user.id}`,
      );
      if (completedRecipeIds) {
        const ids = JSON.parse(completedRecipeIds);
        // Filter saved recipes to only show completed ones
        const completed = savedRecipes.filter((recipe) =>
          ids.includes(recipe.recipe.id),
        );
        setCompletedRecipes(completed);
      }
    } catch (error) {
      logger.error("Error fetching completed recipes:", error);
      setCompletedRecipes([]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSavedRecipes();
    await fetchCompletedRecipes();
    await fetchRecommendations();
    setIsRefreshing(false);
  };

  const fetchRecommendations = async () => {
    if (!user) return;

    setIsLoadingRecommendations(true);
    try {
      // Get user's recent recipes for recommendations
      const response = await cookCamApi.getUserRecipes(10, 0);
      if (
        response.success &&
        response.data &&
        (response.data as any).recipes &&
        (response.data as any).recipes.length > 0
      ) {
        // Transform recent recipes into recommendation format
        const recentRecipes = (response.data as any).recipes
          .slice(0, 3)
          .map((recipe: any, index: number) => ({
            id: recipe.id,
            title: recipe.title,
            cuisine: recipe.cuisine_type || "Various",
            match: `${95 - index * 3}%`, // Simple match calculation
            recipe: recipe,
          }));

        setRecommendations(recentRecipes);
      } else {
        // If no recipes, show empty recommendations
        setRecommendations([]);
      }
    } catch (error) {
      logger.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Collection badges
  const collectionBadges: CollectionBadge[] = [
    {
      id: "1",
      name: "Italian Master",
      icon: "🇮🇹",
      requirement: 10,
      cuisineType: "Italian",
      earned: false,
    },
    {
      id: "2",
      name: "Asian Explorer",
      icon: "🥢",
      requirement: 10,
      cuisineType: "Asian",
      earned: false,
    },
    {
      id: "3",
      name: "Indian Guru",
      icon: "🌶️",
      requirement: 10,
      cuisineType: "Indian",
      earned: false,
    },
    {
      id: "4",
      name: "French Connoisseur",
      icon: "🥖",
      requirement: 10,
      cuisineType: "French",
      earned: false,
    },
    {
      id: "5",
      name: "Mexican Aficionado",
      icon: "🌮",
      requirement: 10,
      cuisineType: "Mexican",
      earned: false,
    },
  ];

  // Savings milestones
  const savingsMilestones = [
    { count: 5, reward: "Recipe Rookie", xp: 50, icon: "🌟" },
    { count: 10, reward: "Collection Starter", xp: 100, icon: "⭐" },
    { count: 25, reward: "Recipe Hunter", xp: 250, icon: "🏆" },
    { count: 50, reward: "Master Collector", xp: 500, icon: "👑" },
    { count: 100, reward: "Recipe Legend", xp: 1000, icon: "💎" },
  ];

  const currentMilestone =
    savingsMilestones.find((m) => m.count > (savedRecipes?.length || 0)) ||
    savingsMilestones[savingsMilestones.length - 1];
  const progress = Math.min(
    ((savedRecipes?.length || 0) / currentMilestone.count) * 100,
    100,
  );

  // State for recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const filters = [
    { key: "all", label: "All" },
    { key: "recent", label: "Recent" },
    { key: "completed", label: "Cooked" },
    { key: "top-rated", label: "Top Rated" },
    { key: "collections", label: "Collections" },
  ];

  useEffect(() => {
    const currentUserId = user?.id || null;

    // Only run effect if user ID actually changed
    if (currentUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentUserId;

      if (currentUserId) {
        fetchSavedRecipes();
        fetchCompletedRecipes();
        fetchRecommendations();
      } else {
        // Clear recipes when user logs out
        setSavedRecipes([]);
        setCompletedRecipes([]);
        setIsLoading(false);
      }
    }
  }, [user?.id]); // Only depend on user ID, not the entire user object

  // Update completed recipes when saved recipes change
  useEffect(() => {
    if (savedRecipes.length > 0) {
      fetchCompletedRecipes();
    }
  }, [savedRecipes]);

  useEffect(() => {
    // Animate milestone progress
    if (progress > 0) {
      Animated.spring(milestoneScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }

    // Pulse recommendations
    Animated.loop(
      Animated.sequence([
        Animated.timing(recommendScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(recommendScale, {
          toValue: 0.95,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
      case "easy":
        return "#4CAF50";
      case "Medium":
      case "medium":
        return "#FF9800";
      case "Hard":
      case "hard":
        return "#F44336";
      default:
        return "#8E8E93";
    }
  };

  const handleRecipePress = (savedRecipe: SavedRecipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to recipe detail or cook mode
    navigation.navigate("CookMode", {
      recipeId: savedRecipe.recipe.id,
      recipe: {
        id: savedRecipe.recipe.id,
        title: savedRecipe.recipe.title,
        description: savedRecipe.recipe.description || "",
        ingredients: savedRecipe.recipe.ingredients || [],
        steps:
          savedRecipe.recipe.instructions?.map((inst: any, index: number) => ({
            step: index + 1,
            instruction:
              typeof inst === "string" ? inst : inst.instruction || "",
            time: inst.time,
            temperature: inst.temperature,
          })) || [],
        totalTime: savedRecipe.recipe.total_time_minutes || 0,
        difficulty: savedRecipe.recipe.difficulty || "Medium",
        servings: savedRecipe.recipe.servings || 4,
      },
    });
  };

  const handleUnsaveRecipe = async (recipeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const response = await cookCamApi.toggleFavoriteRecipe(recipeId);
      if (response.success) {
        // Remove from local state
        setSavedRecipes((prev) =>
          prev.filter((item) => item.recipe.id !== recipeId),
        );
      }
    } catch (error) {
      logger.error("Error unsaving recipe:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2D1B69" />
        <Text style={styles.loadingText}>Loading your saved recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Favorites</Text>
        <View style={styles.favoritesCounter}>
          <Text style={styles.heartEmoji}>❤️</Text>
          <Text style={styles.counterText}>{savedRecipes?.length || 0}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedFilter(filter.key as any);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Collections View */}
      {selectedFilter === "collections" ? (
        <ScrollView
          style={styles.recipeList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recipeListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {collectionBadges.map((badge) => {
            const cuisineCount = (savedRecipes || []).filter(
              (r) => r.recipe.cuisine_type === badge.cuisineType,
            ).length;
            const progress = (cuisineCount / badge.requirement) * 100;

            return (
              <View key={badge.id} style={styles.collectionCard}>
                <View style={styles.collectionIcon}>
                  <Text style={styles.collectionEmoji}>{badge.icon}</Text>
                  {progress >= 100 && (
                    <Trophy
                      size={16}
                      color="#FFB800"
                      style={styles.earnedBadge}
                    />
                  )}
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionName}>{badge.name}</Text>
                  <View style={styles.collectionProgress}>
                    <View
                      style={[
                        styles.collectionProgressFill,
                        { width: `${Math.min(progress, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.collectionProgressText}>
                    {cuisineCount} / {badge.requirement} {badge.cuisineType}{" "}
                    recipes
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <>
          {/* Recommendations */}
          {(savedRecipes?.length || 0) > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.recommendationsTitle}>
                Recommended for you
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {isLoadingRecommendations ? (
                  <View style={styles.recommendCard}>
                    <ActivityIndicator size="small" color="#2D1B69" />
                    <Text style={styles.recommendTitle}>Loading...</Text>
                  </View>
                ) : recommendations.length > 0 ? (
                  recommendations.map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      style={[
                        styles.recommendCard,
                        { transform: [{ scale: recommendScale }] },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.navigate("CookMode", {
                          recipeId: rec.recipe?.id || rec.id,
                          recipe: {
                            id: rec.recipe?.id || rec.id,
                            title: rec.recipe?.title || rec.title,
                            description: rec.recipe?.description || "",
                            ingredients: rec.recipe?.ingredients || [],
                            steps:
                              rec.recipe?.instructions?.map(
                                (inst: any, index: number) => ({
                                  step: index + 1,
                                  instruction:
                                    typeof inst === "string"
                                      ? inst
                                      : inst.instruction || "",
                                  time: inst.time,
                                  temperature: inst.temperature,
                                }),
                              ) || [],
                            totalTime: rec.recipe?.total_time_minutes || 0,
                            difficulty: rec.recipe?.difficulty || "Medium",
                            servings: rec.recipe?.servings || 4,
                          },
                        });
                      }}
                    >
                      <View style={styles.recommendMatch}>
                        <TrendingUp size={12} color="#4CAF50" />
                        <Text style={styles.recommendMatchText}>
                          {rec.match} match
                        </Text>
                      </View>
                      <Text style={styles.recommendTitle}>{rec.title}</Text>
                      <Text style={styles.recommendCuisine}>{rec.cuisine}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.recommendCard}>
                    <Text style={styles.recommendTitle}>
                      No recommendations yet
                    </Text>
                    <Text style={styles.recommendCuisine}>
                      Save more recipes to get personalized suggestions!
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Recipe Grid */}
          <ScrollView
            style={styles.recipeList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recipeListContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            {(() => {
              const recipesToShow =
                selectedFilter === "completed"
                  ? completedRecipes
                  : savedRecipes;
              const emptyTitle =
                selectedFilter === "completed"
                  ? "No completed recipes yet"
                  : "No saved recipes yet";
              const emptyText =
                selectedFilter === "completed"
                  ? "Complete recipes to see them here!"
                  : "Start saving recipes by tapping the heart icon when browsing recipes!";

              if ((recipesToShow?.length || 0) === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Heart size={48} color="#E5E5E7" />
                    <Text style={styles.emptyStateTitle}>{emptyTitle}</Text>
                    <Text style={styles.emptyStateText}>{emptyText}</Text>
                  </View>
                );
              }

              return (recipesToShow || []).map((savedRecipe, index) => (
                <TouchableOpacity
                  key={savedRecipe.recipe.id}
                  style={styles.recipeCard}
                  onPress={() => handleRecipePress(savedRecipe)}
                  activeOpacity={0.8}
                >
                  {/* Recipe Image */}
                  <View style={styles.imageContainer}>
                    {savedRecipe.recipe.image_url ? (
                      <OptimizedImage
                        source={{ uri: savedRecipe.recipe.image_url }}
                        style={styles.recipeImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <ChefHat size={40} color="#E5E5E7" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => handleUnsaveRecipe(savedRecipe.recipe.id)}
                    >
                      <Heart size={20} color="#FF6B35" fill="#FF6B35" />
                    </TouchableOpacity>
                  </View>

                  {/* Recipe Info */}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {savedRecipe.recipe.title}
                    </Text>
                    <Text style={styles.recipeCuisine}>
                      {savedRecipe.recipe.cuisine_type || "Unknown"}
                    </Text>

                    <View style={styles.recipeStats}>
                      <View style={styles.stat}>
                        <Clock size={14} color="#8E8E93" />
                        <Text style={styles.statText}>
                          {savedRecipe.recipe.total_time_minutes ||
                            savedRecipe.recipe.prep_time_minutes ||
                            30}
                          min
                        </Text>
                      </View>
                      {savedRecipe.recipe.servings && (
                        <View style={styles.stat}>
                          <Star size={14} color="#FFB800" fill="#FFB800" />
                          <Text style={styles.statText}>
                            {savedRecipe.recipe.servings}
                          </Text>
                        </View>
                      )}
                      {savedRecipe.recipe.difficulty && (
                        <View
                          style={[
                            styles.difficultyBadge,
                            {
                              backgroundColor:
                                getDifficultyColor(
                                  savedRecipe.recipe.difficulty,
                                ) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.difficultyText,
                              {
                                color: getDifficultyColor(
                                  savedRecipe.recipe.difficulty,
                                ),
                              },
                            ]}
                          >
                            {savedRecipe.recipe.difficulty}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ));
            })()}

            {/* Milestone Progress - moved to bottom */}
            <Animated.View
              style={[
                styles.milestoneCard,
                { transform: [{ scale: milestoneScale }] },
              ]}
            >
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneTitle}>
                  Next Milestone: {currentMilestone.reward}
                </Text>
                <View style={styles.milestoneReward}>
                  <Star size={14} color="#FFB800" />
                  <Text style={styles.milestoneXP}>
                    +{currentMilestone.xp} XP
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {savedRecipes?.length || 0} / {currentMilestone.count} recipes
                saved
              </Text>
            </Animated.View>
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: "#F8F8FF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  favoritesCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heartEmoji: {
    fontSize: 18,
  },
  counterText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  milestoneCard: {
    marginHorizontal: 20,
    marginBottom: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
  },
  milestoneReward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  milestoneXP: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFB800",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E5E7",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  filterContent: {
    alignItems: "center",
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  filterButtonActive: {
    backgroundColor: "#2D1B69",
    borderColor: "#2D1B69",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2D1B69",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  collectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  collectionEmoji: {
    fontSize: 24,
  },
  earnedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 4,
  },
  collectionProgress: {
    height: 4,
    backgroundColor: "#E5E5E7",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  collectionProgressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  collectionProgressText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  recommendationsSection: {
    paddingLeft: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
  },
  recommendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendMatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  recommendMatchText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 4,
  },
  recommendCuisine: {
    fontSize: 12,
    color: "#8E8E93",
  },
  recipeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipeListContent: {
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    height: 160,
    position: "relative",
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#F8F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 8,
  },
  recipeInfo: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 4,
  },
  recipeCuisine: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 12,
  },
  recipeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default FavoritesScreen;

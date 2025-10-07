import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Animated,
  Alert} from "react-native";
import {
  Search,
  TrendingUp,
  Clock,
  ChefHat,
  Flame,
  _Globe,
  Star,
  Gift,
  _Brain} from "lucide-react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { recipeService, ingredientService } from "../services/api";
import * as Haptics from "expo-haptics";
import logger from "../utils/logger";

interface TrendingRecipe {
  id: string;
  title: string;
  creator: string;
  views: number;
  prepTime: number;
  trending: boolean;
  cuisine?: string;
  difficulty?: string;
}

interface DiscoverScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Discover">;
}

const DiscoverScreen = ({ navigation }: DiscoverScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { addXP, _unlockBadge } = useGamification();
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [trendingRecipes, setTrendingRecipes] = useState<TrendingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dailyBonusScale = useRef(new Animated.Value(0.95)).current;
  const recommendationSlide = useRef(new Animated.Value(50)).current;

  // Fetch trending recipes on component mount
  useEffect(() => {
    loadTrendingRecipes();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true}),
      Animated.spring(recommendationSlide, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true}),
    ]).start();

    // Pulse animation for trending
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true}),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true}),
      ])).start();

    // Daily bonus pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dailyBonusScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true}),
        Animated.timing(dailyBonusScale, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true}),
      ])).start();

    // Check if daily bonus available
    checkDailyBonus();
  };

  const loadTrendingRecipes = async () => {
    try {
      logger.debug("🔥 Loading trending recipes...");
      setLoading(true);
      setError(null);

      // Fetch trending/popular recipes from API
      const response = await recipeService.getRecipes({
        limit: 10,
        search: "trending"});

      if (response.success && response.data) {
        logger.debug("✅ Trending recipes loaded:", response.data);

        // Transform API data to our format
        const transformedRecipes = response.data.map(
          (recipe: unknown, index: number) => ({
            id: recipe.id || `recipe-${index}`,
            title: recipe.title || `Recipe ${index + 1}`,
            creator: recipe.creator_name || `Chef ${index + 1}`,
            views: recipe.view_count || 0,
            prepTime: recipe.prep_time || 0,
            trending: recipe.is_trending || false,
            cuisine: recipe.cuisine || "International",
            difficulty: recipe.difficulty || "Easy"}));

        setTrendingRecipes(transformedRecipes);
      } else {
        logger.error("❌ Failed to load trending recipes:", response.error);
        setError(
          response.error ||
            "Failed to load trending recipes. Please try again.");
      }
    } catch (error) {
      logger.error("❌ Error loading trending recipes:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      logger.debug(`🔍 Searching for: ${searchQuery}`);
      setError(null);

      // Search both recipes and ingredients
      const [recipeResponse, ingredientResponse] = await Promise.all([
        recipeService.getRecipes({ search: searchQuery, limit: 5 }),
        ingredientService.searchIngredients(searchQuery, 5),
      ]);

      const results = [];

      if (recipeResponse.success && recipeResponse.data?.recipes) {
        results.push(
          ...recipeResponse.data.recipes.map((r: unknown) => ({
            ...r,
            type: "recipe"})));
      }

      if (ingredientResponse.success && ingredientResponse.data) {
        results.push(
          ...ingredientResponse.data.map((i: unknown) => ({
            ...i,
            type: "ingredient"})));
      }

      if (results.length === 0) {
        setError(
          `No results found for "${searchQuery}". Try different keywords.`);
      }

      setSearchResults(results);
      logger.debug(`✅ Search found ${results.length} results`);
    } catch (error) {
      logger.error("❌ Search error:", error);
      setError("Search failed. Please try again.");
    }
  };

  const checkDailyBonus = () => {
    // Check AsyncStorage for last claim date
    // For now, we'll just show it as available
    setDailyBonusClaimed(false);
  };

  const claimDailyBonus = async () => {
    if (!dailyBonusClaimed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addXP(
        XP_VALUES.DAILY_DISCOVERY_BONUS || 25,
        "DAILY_DISCOVERY_BONUS");
      setDailyBonusClaimed(true);

      // Save claim date to AsyncStorage
    }
  };

  const handleTrendingRecipePress = async (recipe: TrendingRecipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Award discovery XP if it's a new cuisine
    if (recipe.cuisine && recipe.cuisine !== selectedCuisine) {
      await addXP(10, "DISCOVER_NEW_CUISINE");
      setSelectedCuisine(recipe.cuisine);
    }

    // Navigate to recipe
    navigation.navigate("Home", {
      screen: "CookMode",
      params: { recipe }});
  };

  const showErrorAlert = () => {
    Alert.alert("Error", error || "Something went wrong", [
      { text: "Try Again", onPress: loadTrendingRecipes },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover 🌍</Text>
        <Text style={styles.headerSubtitle}>
          Explore new cuisines and recipes
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Daily Discovery Bonus */}
        {!dailyBonusClaimed && (
          <Animated.View
            style={[
              styles.dailyBonusCard,
              { transform: [{ scale: dailyBonusScale }] },
            ]}
          >
            <TouchableOpacity
              style={styles.dailyBonusContent}
              onPress={claimDailyBonus}
              activeOpacity={0.8}
            >
              <Gift size={24} color="#FFB800" />
              <View style={styles.dailyBonusText}>
                <Text style={styles.dailyBonusTitle}>
                  Daily Discovery Bonus!
                </Text>
                <Text style={styles.dailyBonusSubtitle}>
                  Try a new recipe today for +25 XP
                </Text>
              </View>
              <Star size={20} color="#FFB800" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadTrendingRecipes}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {searchResults.map((result, index) => (
                <TouchableOpacity key={index} style={styles.searchResultCard}>
                  <Text style={styles.searchResultTitle}>
                    {result.title || result.description}
                  </Text>
                  <Text style={styles.searchResultType}>{result.type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Now */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <TouchableOpacity onPress={loadTrendingRecipes}>
              <Text style={styles.seeAllText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                Loading trending recipes...
              </Text>
            </View>
          ) : error ? (
            <TouchableOpacity
              style={styles.errorRetryContainer}
              onPress={showErrorAlert}
            >
              <Text style={styles.errorRetryText}>
                Tap to retry loading recipes
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            >
              {trendingRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.trendingCard}
                  onPress={() => handleTrendingRecipePress(recipe)}
                  activeOpacity={0.8}
                >
                  <View style={styles.trendingImagePlaceholder}>
                    <ChefHat size={32} color="#E5E5E7" />
                    {recipe.trending && (
                      <Animated.View
                        style={[
                          styles.trendingBadge,
                          { transform: [{ scale: pulseAnim }] },
                        ]}
                      >
                        <Flame size={12} color="#FF6B35" fill="#FF6B35" />
                        <Text style={styles.trendingBadgeText}>HOT</Text>
                      </Animated.View>
                    )}
                    <View style={styles.cuisineBadge}>
                      <Text style={styles.cuisineBadgeText}>
                        {recipe.cuisine}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingTitle} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <Text style={styles.trendingCreator}>
                      by {recipe.creator}
                    </Text>
                    <View style={styles.trendingStats}>
                      <View style={styles.stat}>
                        <TrendingUp size={12} color="#666" />
                        <Text style={styles.statText}>
                          {recipe.views.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.stat}>
                        <Clock size={12} color="#666" />
                        <Text style={styles.statText}>{recipe.prepTime}m</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF"},
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16},
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 4},
  headerSubtitle: {
    fontSize: 16,
    color: "#8E8E93"},
  dailyBonusCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)"},
  dailyBonusContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12},
  dailyBonusText: {
    flex: 1},
  dailyBonusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFB800",
    marginBottom: 2},
  dailyBonusSubtitle: {
    fontSize: 13,
    color: "#FFB800",
    opacity: 0.8},
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E7"},
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: "#2D1B69"},
  errorContainer: {
    backgroundColor: "#FFE5E5",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFB3B3",
    alignItems: "center"},
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8},
  retryButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8},
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"},
  errorRetryContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    marginHorizontal: 20,
    borderRadius: 12},
  errorRetryText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center"},
  section: {
    marginBottom: 32},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16},
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D1B69"},
  seeAllText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "600"},
  searchResultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginLeft: 20,
    marginRight: 12,
    width: 150,
    borderWidth: 1,
    borderColor: "#E5E5E7"},
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 4},
  searchResultType: {
    fontSize: 12,
    color: "#8E8E93",
    textTransform: "capitalize"},
  trendingList: {
    paddingHorizontal: 20,
    gap: 12},
  trendingCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 12},
  trendingImagePlaceholder: {
    height: 140,
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative"},
  trendingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4},
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF6B35"},
  cuisineBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(45, 27, 105, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12},
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF"},
  trendingInfo: {
    padding: 12},
  trendingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 4},
  trendingCreator: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8},
  trendingStats: {
    flexDirection: "row",
    gap: 12},
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4},
  statText: {
    fontSize: 11,
    color: "#666"},
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center"},
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
    fontStyle: "italic"}});

export default DiscoverScreen;

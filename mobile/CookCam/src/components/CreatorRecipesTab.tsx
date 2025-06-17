import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { TrendingUp, Eye, Star, ChefHat, Calendar } from "lucide-react-native";
import RecipeCreatorCard from "./RecipeCreatorCard";
import { ClaimedRecipe } from "../utils/recipeTypes";

interface CreatorRecipesTabProps {
  userId: string;
  userTier?: number;
}

const CreatorRecipesTab: React.FC<CreatorRecipesTabProps> = ({
  userId,
  userTier,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "trending" | "popular"
  >("all");

  // Mock data - in real app would fetch from API
  const mockRecipes: ClaimedRecipe[] = [
    {
      id: "1",
      title: "Spicy Thai Noodles",
      description: "A fiery blend of authentic Thai flavors",
      images: [],
      ingredients: [],
      instructions: [],
      prepTime: 30,
      cookTime: 15,
      servings: 4,
      difficulty: "Medium",
      cuisine: "Thai",
      tags: ["spicy", "noodles", "thai"],
      creatorId: userId,
      creatorName: "You",
      creatorTier: userTier,
      claimedAt: new Date().toISOString(),
      viewCount: 12543,
      shareCount: 234,
      averageRating: 4.8,
      ratingCount: 156,
      trending: true,
      featured: false,
    },
    {
      id: "2",
      title: "Classic Margherita Pizza",
      description: "Traditional Italian pizza with fresh basil",
      images: [],
      ingredients: [],
      instructions: [],
      prepTime: 20,
      cookTime: 25,
      servings: 2,
      difficulty: "Easy",
      cuisine: "Italian",
      tags: ["pizza", "italian", "vegetarian"],
      creatorId: userId,
      creatorName: "You",
      creatorTier: userTier,
      claimedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 8234,
      shareCount: 123,
      averageRating: 4.6,
      ratingCount: 89,
      trending: false,
      featured: true,
    },
  ];

  // Compute aggregated stats
  const totalViews = mockRecipes.reduce(
    (sum, recipe) => sum + recipe.viewCount,
    0,
  );
  const avgRating =
    mockRecipes.length > 0
      ? mockRecipes.reduce((sum, recipe) => sum + recipe.averageRating, 0) /
        mockRecipes.length
      : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch updated recipes from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filters = [
    { key: "all", label: "All Recipes", icon: ChefHat },
    { key: "trending", label: "Trending", icon: TrendingUp },
    { key: "popular", label: "Most Popular", icon: Star },
  ];

  const filteredRecipes = mockRecipes.filter((recipe) => {
    if (selectedFilter === "trending") {
      return recipe.trending;
    }
    if (selectedFilter === "popular") {
      return recipe.viewCount > 10000;
    }
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6B35"
        />
      }
    >
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Eye size={24} color="#FF6B35" />
          <Text style={styles.statNumber}>{totalViews.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
        <View style={styles.statCard}>
          <Star size={24} color="#FFB800" />
          <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Calendar size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>{mockRecipes.length}</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
      </View>

      {/* Monthly Limit Progress */}
      <View style={styles.limitContainer}>
        <View style={styles.limitHeader}>
          <Text style={styles.limitTitle}>Monthly Recipe Claims</Text>
          <Text style={styles.limitCount}>{mockRecipes.length}/120</Text>
        </View>
        <View style={styles.limitBar}>
          <View
            style={[
              styles.limitProgress,
              { width: `${(mockRecipes.length / 120) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.limitHint}>
          Claim up to 120 recipes per month to prevent farming
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <filter.icon
              size={16}
              color={selectedFilter === filter.key ? "#FFFFFF" : "#8E8E93"}
            />
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

      {/* Recipes List */}
      <View style={styles.recipesList}>
        {filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => (
            <RecipeCreatorCard
              key={recipe.id}
              recipe={{
                id: recipe.id,
                title: recipe.title,
                imageUrl: recipe.images[0],
                creatorName: recipe.creatorName,
                creatorTier: recipe.creatorTier,
                viewCount: recipe.viewCount,
                averageRating: recipe.averageRating,
                ratingCount: recipe.ratingCount,
                prepTime: recipe.prepTime,
                difficulty: recipe.difficulty,
              }}
              onPress={() => {
                // Navigate to recipe detail
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <ChefHat size={48} color="#E5E5E7" />
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptyText}>
              Cook recipes and claim them to build your collection!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  limitContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  limitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  limitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
  },
  limitCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  limitBar: {
    height: 8,
    backgroundColor: "#E5E5E7",
    borderRadius: 4,
    overflow: "hidden",
  },
  limitProgress: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 4,
  },
  limitHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 8,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E7",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  filterText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  recipesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

export default CreatorRecipesTab;

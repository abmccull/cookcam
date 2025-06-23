import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Heart,
  Clock,
  Flame,
  MessageCircle,
  Share2,
} from "lucide-react-native";
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
} from "../utils/responsive";
import ChefBadge from "./ChefBadge";
import NutritionBadge from "./NutritionBadge";
import { cookCamApi } from "../services/cookCamApi";
import logger from "../utils/logger";


interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
}

interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    image?: string;
    cookTime: number;
    difficulty: string;
    likes: number;
    comments: number;
    servings?: number;
    creator: {
      name: string;
      tier?: 1 | 2 | 3 | 4 | 5;
      avatar?: string;
    };
  };
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  showNutrition?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = React.memo(({
  recipe,
  onPress,
  onLike,
  onComment,
  onShare,
  showNutrition = true,
}) => {
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  // Memoize expensive calculations
  const difficultyColor = useMemo(() => {
    const difficultyColors = {
      Easy: "#4CAF50",
      Medium: "#FF9800",
      Hard: "#F44336",
    };
    return difficultyColors[recipe.difficulty as keyof typeof difficultyColors];
  }, [recipe.difficulty]);

  const creatorInitial = useMemo(() => {
    return recipe.creator.name[0]?.toUpperCase() || '?';
  }, [recipe.creator.name]);

  // Memoized fetch function to prevent unnecessary re-creations
  const fetchNutritionData = useCallback(async () => {
    try {
      setNutritionLoading(true);
      const response = await cookCamApi.getRecipeNutrition(recipe.id);

      if (response.success && response.data) {
        // Convert NutritionInfo to NutritionData format
        const nutritionData: NutritionData = {
          calories: response.data.calories,
          protein_g: response.data.protein,
          carbs_g: response.data.carbs,
          fat_g: response.data.fat,
          fiber_g: response.data.fiber,
          sodium_mg: response.data.sodium,
        };
        setNutrition(nutritionData);
      }
    } catch (error) {
      logger.debug("Failed to fetch nutrition data:", error);
      // Silently handle error - nutrition is optional
    } finally {
      setNutritionLoading(false);
    }
  }, [recipe.id]); // Only depend on recipe.id

  // Fetch nutrition data when component mounts or recipe.id changes
  useEffect(() => {
    if (showNutrition && recipe.id) {
      fetchNutritionData();
    }
  }, [showNutrition, fetchNutritionData]);

  // Memoized event handlers to prevent child re-renders
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const handleLike = useCallback(() => {
    onLike?.();
  }, [onLike]);

  const handleComment = useCallback(() => {
    onComment?.();
  }, [onComment]);

  const handleShare = useCallback(() => {
    onShare?.();
  }, [onShare]);

  // Memoize style objects that depend on props
  const difficultyBadgeStyle = useMemo(() => [
    styles.difficultyBadge,
    { backgroundColor: difficultyColor }
  ], [difficultyColor]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Recipe Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Flame size={moderateScale(48)} color="#FF6B35" />
        </View>

        {/* Creator info overlay */}
        <View style={styles.creatorOverlay}>
          <View style={styles.creatorInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{creatorInitial}</Text>
            </View>
            <Text style={styles.creatorName}>{recipe.creator.name}</Text>
            {recipe.creator.tier && (
              <ChefBadge tier={recipe.creator.tier} size="small" />
            )}
          </View>
        </View>

        {/* Recipe info badges */}
        <View style={styles.recipeInfoBadges}>
          <View style={styles.timeBadge}>
            <Clock size={moderateScale(14)} color="#F8F8FF" />
            <Text style={styles.timeText}>{recipe.cookTime} min</Text>
          </View>
          <View style={difficultyBadgeStyle}>
            <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
          </View>
          {/* Nutrition badge */}
          {showNutrition && nutrition && !nutritionLoading && (
            <NutritionBadge
              nutrition={nutrition}
              servings={1}
              variant="compact"
            />
          )}
        </View>
      </View>

      {/* Recipe Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.recipeTitle} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Detailed nutrition info */}
        {showNutrition && nutrition && !nutritionLoading && (
          <NutritionBadge
            nutrition={nutrition}
            servings={1}
            variant="detailed"
          />
        )}

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart size={moderateScale(20)} color="#E91E63" />
            <Text style={styles.actionText}>{recipe.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <MessageCircle size={moderateScale(20)} color="#666" />
            <Text style={styles.actionText}>{recipe.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={moderateScale(20)} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Add display name for debugging
RecipeCard.displayName = 'RecipeCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    marginBottom: responsive.spacing.m,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    height: verticalScale(200),
    borderTopLeftRadius: responsive.borderRadius.large,
    borderTopRightRadius: responsive.borderRadius.large,
    overflow: "hidden",
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  creatorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingTop: scale(12),
    paddingHorizontal: scale(12),
    paddingBottom: scale(24),
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  avatarContainer: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F8F8FF",
  },
  avatarText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "bold",
    color: "#F8F8FF",
  },
  creatorName: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "600",
    color: "#F8F8FF",
    flex: 1,
  },
  recipeInfoBadges: {
    position: "absolute",
    bottom: scale(12),
    right: scale(12),
    flexDirection: "row",
    gap: scale(8),
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(4),
  },
  timeText: {
    fontSize: responsive.fontSize.small,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  difficultyBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: responsive.borderRadius.medium,
  },
  difficultyText: {
    fontSize: responsive.fontSize.small,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  detailsContainer: {
    padding: responsive.spacing.m,
  },
  recipeTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: "700",
    color: "#2D1B69",
    marginBottom: verticalScale(12),
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
    paddingTop: verticalScale(12),
    marginTop: verticalScale(8),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  actionText: {
    fontSize: responsive.fontSize.regular,
    color: "#666",
    fontWeight: "500",
  },
});

export default RecipeCard;

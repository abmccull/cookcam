import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Heart,
  Clock,
  Flame,
  MessageCircle,
  Share2,
} from "lucide-react-native";
import { scale, verticalScale, moderateScale } from "../utils/responsive";
import { tokens, mixins, styleUtils } from "../styles";
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

const RecipeCard: React.FC<RecipeCardProps> = React.memo(
  ({ recipe, onPress, onLike, onComment, onShare, showNutrition = true }) => {
    const [nutrition, setNutrition] = useState<NutritionData | null>(null);
    const [nutritionLoading, setNutritionLoading] = useState(false);

    // Memoize expensive calculations using design tokens
    const difficultyColor = useMemo(() => {
      return (
        tokens.colors.difficulty[
          recipe.difficulty.toLowerCase() as keyof typeof tokens.colors.difficulty
        ] || tokens.colors.difficulty.medium
      );
    }, [recipe.difficulty]);

    const creatorInitial = useMemo(() => {
      return recipe.creator.name[0]?.toUpperCase() || "?";
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

    // Memoize style objects using design tokens
    const difficultyBadgeStyle = useMemo(
      () =>
        styleUtils.combine(styles.difficultyBadge, {
          backgroundColor: difficultyColor,
        }),
      [difficultyColor],
    );

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Flame size={moderateScale(48)} color={tokens.colors.brand.chef} />
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
              <Clock
                size={moderateScale(14)}
                color={tokens.colors.text.inverse}
              />
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
            <NutritionBadge nutrition={nutrition} servings={1} variant="full" />
          )}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Heart
                size={moderateScale(20)}
                color={tokens.colors.interactive.favorite}
              />
              <Text style={styles.actionText}>{recipe.likes}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComment}
            >
              <MessageCircle
                size={moderateScale(20)}
                color={tokens.colors.text.secondary}
              />
              <Text style={styles.actionText}>{recipe.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2
                size={moderateScale(20)}
                color={tokens.colors.text.secondary}
              />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// Add display name for debugging
RecipeCard.displayName = "RecipeCard";

const styles = StyleSheet.create({
  container: {
    ...mixins.cards.base,
    marginBottom: tokens.spacing.md,
  },
  imageContainer: {
    position: "relative",
    height: verticalScale(200),
    borderTopLeftRadius: tokens.borderRadius.large,
    borderTopRightRadius: tokens.borderRadius.large,
    overflow: "hidden",
  },
  imagePlaceholder: {
    ...mixins.layout.flex1,
    backgroundColor: tokens.colors.background.accent,
    ...mixins.layout.centerContent,
  },
  creatorOverlay: {
    ...mixins.layout.absoluteTopLeft,
    right: 0,
    backgroundColor: tokens.colors.background.overlay,
    paddingTop: scale(12),
    paddingHorizontal: scale(12),
    paddingBottom: scale(24),
  },
  creatorInfo: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: scale(8),
  },
  avatarContainer: {
    ...mixins.avatars.small,
  },
  avatarText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.inverse,
  },
  creatorName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.inverse,
    flex: 1,
  },
  recipeInfoBadges: {
    ...mixins.layout.absoluteBottomRight,
    ...mixins.layout.flexRow,
    gap: scale(8),
    margin: scale(12),
  },
  timeBadge: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    backgroundColor: tokens.colors.background.overlayLight,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.medium,
    gap: tokens.spacing.xs,
  },
  timeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.inverse,
  },
  difficultyBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.medium,
  },
  difficultyText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.inverse,
  },
  detailsContainer: {
    padding: tokens.spacing.md,
  },
  recipeTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.primary,
    marginBottom: verticalScale(12),
  },
  actionsContainer: {
    ...mixins.layout.flexRow,
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.primary,
    paddingTop: verticalScale(12),
    marginTop: verticalScale(8),
  },
  actionButton: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
  },
  actionText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text.secondary,
    fontWeight: tokens.fontWeight.medium,
  },
});

export default RecipeCard;

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import OptimizedImage from "./OptimizedImage";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { Clock, Users, Heart, Info, ChefHat } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Recipe } from "../utils/recipeTypes";
import logger from "../utils/logger";


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.3;
const CARD_WIDTH = screenWidth - 60;
const CARD_HEIGHT = screenHeight * 0.65;

interface SwipeableCardProps {
  recipe: Recipe;
  index: number;
  onSwipeLeft: (recipe: Recipe) => void;
  onSwipeRight: (recipe: Recipe) => void;
  onFavorite: (recipe: Recipe) => void;
  onCardTap: (recipe: Recipe) => void;
  onCardSelect: (recipe: Recipe) => void;
  isTop: boolean;
  isFavorited?: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  recipe,
  index,
  onSwipeLeft,
  onSwipeRight,
  onFavorite,
  onCardTap,
  onCardSelect,
  isTop,
  isFavorited = false,
}) => {
  const [isCardFavorited, setIsCardFavorited] = useState(isFavorited);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  // Check if recipe has a real image (not placeholder)
  const hasRealImage =
    recipe.image &&
    !recipe.image.includes("placeholder") &&
    !recipe.image.includes("via.placeholder");

  // Debug cook time to identify the real issue
  const getCookTime = () => {
    logger.debug("🐛 Cook time debug:", {
      cookingTime: recipe.cookingTime,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      metadata: recipe.metadata,
    });

    // Use the exact data we're receiving - no fallbacks
    if (recipe.cookingTime) {
      return recipe.cookingTime;
    }

    if (recipe.prepTime && recipe.cookTime) {
      return `${recipe.prepTime + recipe.cookTime} min`;
    }

    if (recipe.metadata?.totalTime) {
      return `${recipe.metadata.totalTime} min`;
    }

    // Show the actual issue instead of hiding it
    return "No time data";
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number; }>({
    onStart: (_, ctx) => {
      if (isTop) {
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onActive: (event, ctx) => {
      if (!isTop) return;
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
      rotate.value = interpolate(
        event.translationX,
        [-screenWidth / 2, screenWidth / 2],
        [-10, 10],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      if (!isTop) return;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withSpring(-screenWidth * 1.5, { damping: 50 }, () => {
          runOnJS(onSwipeLeft)(recipe);
        });
      } else if (shouldSwipeRight) {
        translateX.value = withSpring(screenWidth * 1.5, { damping: 50 }, () => {
          runOnJS(onSwipeRight)(recipe);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    // This logic creates the fanned, bottom-left aligned stack.
    const scale = interpolate(index, [0, 1, 2], [0.8, 0.9, 1], Extrapolate.CLAMP);
    
    // As cards get smaller, they must be shifted down and right to keep their
    // bottom and left edges aligned with the largest (100% scale) card.
    const correctiveTranslateY = (CARD_HEIGHT - (CARD_HEIGHT * scale)) / 2;
    const correctiveTranslateX = (CARD_WIDTH - (CARD_WIDTH * scale)) / 2;

    // The top card also gets interactive translation from the gesture.
    const interactiveTranslateX = isTop ? translateX.value : 0;
    const interactiveTranslateY = isTop ? translateY.value : 0;
    const interactiveRotate = isTop ? rotate.value : 0;

    return {
      position: 'absolute',
      zIndex: 100 - index,
      transform: [
        { translateX: interactiveTranslateX + correctiveTranslateX },
        { translateY: interactiveTranslateY + correctiveTranslateY },
        { rotate: `${interactiveRotate}deg` },
        { scale },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    if (!isTop) {
      return { opacity: 0 };
    }

    const leftOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    const rightOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    );

    return {
      opacity: Math.max(leftOpacity, rightOpacity),
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const handleFavorite = () => {
    setIsCardFavorited(!isCardFavorited);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFavorite(recipe);
  };

  const handleCardTap = () => {
    if (isTop) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCardTap(recipe);
    } else {
      // If not top card, bring it to front
      Haptics.selectionAsync();
      onCardSelect(recipe);
    }
  };

  const handleInfoPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCardTap(recipe);
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isTop}>
      <Animated.View style={[styles.card, cardStyle]}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => isTop ? onCardTap(recipe) : onCardSelect(recipe)}
          activeOpacity={1}
        >
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeTitle} numberOfLines={3}>
              {recipe.title}
            </Text>

            <Text style={styles.recipeDescription} numberOfLines={3}>
              {recipe.description}
            </Text>

            <View style={styles.metaInfo}>
              <View style={[styles.metaItem, styles.timeItem]}>
                <Clock size={16} color="#FF6B35" />
                <Text style={[styles.metaText, styles.timeText]}>
                  {getCookTime()}
                </Text>
              </View>
              <View style={[styles.metaItem, styles.servingsItem]}>
                <Users size={16} color="#4CAF50" />
                <Text style={[styles.metaText, styles.servingsText]}>
                  {recipe.servings} servings
                </Text>
              </View>
              <View style={[styles.metaItem, styles.difficultyItem]}>
                <ChefHat size={16} color="#9C27B0" />
                <Text style={[styles.metaText, styles.difficultyText]}>
                  {recipe.difficulty}
                </Text>
              </View>
            </View>

            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>
                  {recipe.calories || recipe.macros?.calories || 350}
                </Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>
                  {recipe.macros?.protein || 15}g
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>
                  {recipe.macros?.carbs || 45}g
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>
                  {recipe.macros?.fat || 12}g
                </Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            <View style={styles.tagsContainer}>
              {recipe.tags?.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {isTop && (
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleFavorite}
              >
                <Heart
                  size={24}
                  color={isCardFavorited ? "#FF6B6B" : "#CCC"}
                  fill={isCardFavorited ? "#FF6B6B" : "none"}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {isTop && (
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <Animated.View style={[styles.leftOverlay, leftOverlayStyle]}>
              <Text style={styles.overlayText}>PASS</Text>
            </Animated.View>
            <Animated.View style={[styles.rightOverlay, rightOverlayStyle]}>
              <Text style={styles.overlayText}>COOK</Text>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardContent: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  recipeInfo: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    textAlign: 'center',
    marginBottom: 10,
  },
  recipeDescription: {
    fontSize: 15,
    color: "#666",
    marginBottom: 16,
    lineHeight: 22,
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
  },
  timeItem: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  servingsItem: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  difficultyItem: {
    backgroundColor: "rgba(156, 39, 176, 0.1)",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeText: {
    color: "#FF6B35",
    fontFamily: "System",
  },
  servingsText: {
    color: "#4CAF50",
    fontFamily: "System",
  },
  difficultyText: {
    color: "#9C27B0",
    fontFamily: "System",
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: "auto",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  leftOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 82, 82, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  rightOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(76, 175, 80, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  overlayText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default SwipeableCard;

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
  const scale = useSharedValue(1);
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

  const gestureHandler =
    useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
      onStart: () => {
        if (isTop) {
          runOnJS(() => {
            console.log("👆 Gesture started on top card:", recipe.title);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          })();
        }
      },
      onActive: (event) => {
        if (!isTop) {
          return;
        }

        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.1;
        rotate.value = interpolate(
          event.translationX,
          [-screenWidth, 0, screenWidth],
          [-15, 0, 15],
          Extrapolate.CLAMP,
        );
        scale.value = interpolate(
          Math.abs(event.translationX),
          [0, SWIPE_THRESHOLD],
          [1, 0.95],
          Extrapolate.CLAMP,
        );
      },
      onEnd: (event) => {
        if (!isTop) {
          return;
        }

        const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
        const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;

        if (shouldSwipeLeft) {
          translateX.value = withSpring(-screenWidth * 1.2, {
            velocity: event.velocityX,
          });
          runOnJS(onSwipeLeft)(recipe);
          runOnJS(() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
          )();
        } else if (shouldSwipeRight) {
          translateX.value = withSpring(screenWidth * 1.2, {
            velocity: event.velocityX,
          });
          runOnJS(onSwipeRight)(recipe);
          runOnJS(() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
          )();
        } else {
          // Snap back
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotate.value = withSpring(0);
          scale.value = withSpring(1);
        }
      },
    });

  const cardStyle = useAnimatedStyle(() => {
    // More visible stacking effect
    const stackOffset = (2 - index) * 12; // Increased offset
    const stackScale = 1 - index * 0.025; // Less scaling
    const stackOpacity = 1 - index * 0.12; // Less opacity fade
    const stackRotation = index % 2 === 0 ? index * 1.5 : -index * 1.5;

    const finalTranslateX = isTop ? translateX.value : 0;
    const finalTranslateY = isTop ? translateY.value : stackOffset;
    const finalScale = isTop ? scale.value : stackScale;
    const finalRotation = isTop ? rotate.value : stackRotation;

    return {
      transform: [
        { translateX: finalTranslateX },
        { translateY: finalTranslateY },
        { scale: finalScale },
        { rotateZ: `${finalRotation}deg` },
      ] as any,
      opacity: stackOpacity,
      zIndex: 10 - index,
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
          onPress={handleCardTap}
          activeOpacity={0.95}
        >
          {/* Conditional Image Section */}
          {hasRealImage && (
            <View style={styles.imageContainer}>
              <OptimizedImage
                source={{ uri: recipe.image }}
                style={styles.heroImage}
              />
            </View>
          )}

          {/* Recipe Info */}
          <View
            style={[
              styles.recipeInfo,
              !hasRealImage && styles.recipeInfoFullHeight,
            ]}
          >
            {/* Action Buttons - Only on top card */}
            {isTop && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={handleInfoPress}
                >
                  <Info size={18} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={handleFavorite}
                >
                  <Heart
                    size={20}
                    color={isCardFavorited ? "#FF6B6B" : "#CCC"}
                    fill={isCardFavorited ? "#FF6B6B" : "none"}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Temporary Debug Buttons */}
            {isTop && (
              <View style={styles.debugButtons}>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    console.log("🍳 Debug: Cook button pressed");
                    onSwipeRight(recipe);
                  }}
                >
                  <Text style={styles.debugButtonText}>🍳 COOK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    console.log("❌ Debug: Pass button pressed");
                    onSwipeLeft(recipe);
                  }}
                >
                  <Text style={styles.debugButtonText}>❌ PASS</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recipe Title */}
            <Text style={styles.recipeTitle} numberOfLines={3}>
              {recipe.title}
            </Text>

            {/* Recipe Description */}
            <Text style={styles.recipeDescription} numberOfLines={3}>
              {recipe.description}
            </Text>

            {/* Styled Meta Info Row */}
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

            {/* Complete Macros Display */}
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

            {/* Tags */}
            <View style={styles.tagsContainer}>
              {recipe.tags?.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        {/* Swipe Overlays */}
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
    width: screenWidth - 40,
    height: screenHeight * 0.62, // Reduced height to not overlap footer
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
  imageContainer: {
    height: "32%", // Smaller for more content space
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  recipeInfo: {
    flex: 1,
    padding: 20,
    position: "relative",
  },
  recipeInfoFullHeight: {
    paddingTop: 60, // Space for action buttons
  },
  actionButtons: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
  favoriteButton: {
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
  infoButton: {
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
  recipeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 10,
    lineHeight: 28,
    marginTop: 20,
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
    fontFamily: "System", // Different font weight
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
  debugButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    justifyContent: "center",
  },
  debugButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  debugButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default SwipeableCard;

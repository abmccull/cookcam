import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  Clock,
  Users,
  Heart,
  Info,
  ChefHat,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3;

interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisineType: string;
  cookingMethod: string;
  calories: number;
  ingredients: any[];
  metadata?: {
    totalTime: number;
    skillLevel: string;
  };
}

interface SwipeableCardProps {
  recipe: Recipe;
  index: number;
  onSwipeLeft: (recipe: Recipe) => void;
  onSwipeRight: (recipe: Recipe) => void;
  onFavorite: (recipe: Recipe) => void;
  onCardTap: (recipe: Recipe) => void;
  isTop: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  recipe,
  index,
  onSwipeLeft,
  onSwipeRight,
  onFavorite,
  onCardTap,
  isTop,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(ReactNativeHapticFeedback.trigger)('impactLight');
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.1; // Subtle vertical movement
      rotate.value = interpolate(
        event.translationX,
        [-screenWidth, 0, screenWidth],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
      scale.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD],
        [1, 0.95],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withSpring(-screenWidth * 1.2, { velocity: event.velocityX });
        runOnJS(onSwipeLeft)(recipe);
        runOnJS(ReactNativeHapticFeedback.trigger)('notificationWarning');
      } else if (shouldSwipeRight) {
        translateX.value = withSpring(screenWidth * 1.2, { velocity: event.velocityX });
        runOnJS(onSwipeRight)(recipe);
        runOnJS(ReactNativeHapticFeedback.trigger)('notificationSuccess');
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
    const stackOffset = (2 - index) * 10;
    const stackScale = 1 - index * 0.05;
    const stackRotation = index % 2 === 0 ? index * 2 : -index * 2;

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
      zIndex: 3 - index,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const leftOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    const rightOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity: isTop ? Math.max(leftOpacity, rightOpacity) : 0,
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const handleFavorite = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onFavorite(recipe);
  };

  const handleCardTap = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onCardTap(recipe);
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isTop}>
      <Animated.View style={[styles.card, cardStyle]}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handleCardTap}
          activeOpacity={0.95}
          disabled={!isTop}
        >
          {/* Hero Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: recipe.image || 'https://via.placeholder.com/400x200/4CAF50/FFFFFF?text=🍽️',
              }}
              style={styles.heroImage}
            />
            
            {/* Floating Action Buttons */}
            {isTop && (
              <View style={styles.floatingActions}>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={handleFavorite}
                >
                  <Heart size={20} color="#FF6B6B" fill="#FF6B6B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoButton}>
                  <Info size={18} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Recipe Info */}
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {recipe.title}
            </Text>
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>

            {/* Meta Info */}
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Clock size={14} color="#666" />
                <Text style={styles.metaText}>
                  {recipe.metadata?.totalTime || recipe.prepTime + recipe.cookTime} min
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Users size={14} color="#666" />
                <Text style={styles.metaText}>{recipe.servings}</Text>
              </View>
              <View style={styles.metaItem}>
                <ChefHat size={14} color="#666" />
                <Text style={styles.metaText}>{recipe.difficulty}</Text>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{recipe.cuisineType}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{recipe.cookingMethod}</Text>
              </View>
              <View style={[styles.tag, styles.calorieTag]}>
                <Text style={styles.calorieText}>{recipe.calories} cal</Text>
              </View>
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
    position: 'absolute',
    width: screenWidth - 40,
    height: screenHeight * 0.65,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
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
    overflow: 'hidden',
  },
  imageContainer: {
    height: '45%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  floatingActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeInfo: {
    flex: 1,
    padding: 20,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
    lineHeight: 30,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 'auto',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  calorieTag: {
    backgroundColor: '#E8F5E8',
  },
  calorieText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  leftOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 82, 82, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  rightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  overlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});

export default SwipeableCard; 
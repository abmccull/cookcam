import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { 
  Clock, 
  Users, 
  X, 
  Info, 
  Trophy,
  Heart,
  ChefHat,
  Star,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  withDelay,
  withSequence,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { recipeService } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width

interface Recipe {
  id: string;
  title: string;
  image: string;
  cookingTime: string;
  servings: number;
  difficulty: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  tags: string[];
  description: string;
  ingredients: any[];
  instructions?: string[];
  tips?: string[];
  previewData?: {
    id: string;
    title: string;
    description: string;
    estimatedTime: number;
    difficulty: string;
    cuisineType: string;
    mainIngredients: string[];
  };
}

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
  const [frontCardIndex, setFrontCardIndex] = useState(0);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [hasAnimatedEntrance, setHasAnimatedEntrance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Animation values for swipe gestures
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Corrected Scaling: Front card is smallest, back is largest
  const scale = useSharedValue(0.9); // Front card scale
  const card1Scale = useSharedValue(0.95); // Middle card scale
  const card2Scale = useSharedValue(1); // Back card scale

  // Shared values for back card animations
  const card1TranslateY = useSharedValue(0);
  const card2TranslateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const animationSignal = useSharedValue(0); // Signal to sync UI and JS threads

  // This hook safely listens for a signal from the UI thread to update JS state
  useAnimatedReaction(
    () => animationSignal.value,
    (signalValue, previousValue) => {
      if (signalValue !== 0 && signalValue !== previousValue) {
        // This block runs entirely on the UI thread, which is safe.

        // 1. Rotate the shared values to match the new card identities
        const oldFrontY = translateY.value;
        const oldFrontScale = scale.value;
        const oldMiddleY = card1TranslateY.value;
        const oldMiddleScale = card1Scale.value;
        const oldBackY = card2TranslateY.value;
        const oldBackScale = card2Scale.value;

        if (signalValue === 1) { // Middle card came to front
          // Old Middle -> New Front
          translateY.value = oldMiddleY;
          scale.value = oldMiddleScale;
          // Old Back -> New Middle
          card1TranslateY.value = oldBackY;
          card1Scale.value = oldBackScale;
          // Old Front -> New Back
          card2TranslateY.value = oldFrontY;
          card2Scale.value = oldFrontScale;
        } else if (signalValue === 2) { // Back card came to front
          // Old Back -> New Front
          translateY.value = oldBackY;
          scale.value = oldBackScale;
          // Old Front -> New Middle
          card1TranslateY.value = oldFrontY;
          card1Scale.value = oldFrontScale;
          // Old Middle -> New Back
          card2TranslateY.value = oldMiddleY;
          card2Scale.value = oldMiddleScale;
        }

        // 2. Now, safely update the JS state
        runOnJS(setFrontCardIndex)((prev) => (prev + signalValue) % recipes.length);
        
        // 3. Reset animation state
        isAnimating.value = false;
        animationSignal.value = 0; // Reset the signal
      }
    },
    [recipes.length]
  );

  // Generate recipe previews from backend API (Step 1 of two-step process)
  const generateRecipesFromAPI = async () => {
    // Map ingredients to the format expected by the backend
    const detectedIngredients = ingredients.map((ingredient: any) => 
      typeof ingredient === 'string' ? ingredient : ingredient.name || ingredient.title
    ).filter(Boolean);

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Generating recipe previews with data:', {
        ingredients: ingredients.length,
        preferences: Object.keys(preferences).length,
        ingredientsList: ingredients,
        preferencesData: preferences
      });

      if (detectedIngredients.length === 0) {
        throw new Error('No ingredients detected. Please go back and scan some ingredients first.');
      }

      // Build user preferences for the new two-step API
      const userPreferences = {
        servingSize: preferences?.servingSize || 2,
        mealPrepEnabled: preferences?.mealPrepEnabled || false,
        mealPrepPortions: preferences?.mealPrepPortions,
        selectedAppliances: preferences?.selectedAppliances || ['oven', 'stove', 'microwave'],
        dietaryTags: preferences?.dietary || [],
        cuisinePreferences: preferences?.cuisine || ['🎲 Surprise Me!'],
        timeAvailable: preferences?.cookingTime || 'any',
        skillLevel: preferences?.difficulty || 'any'
      };

      console.log('📤 Sending preview request to AI:', {
        detectedIngredients,
        userPreferences
      });

      // Call the new recipe previews API (Step 1)
      const response = await recipeService.generatePreviews({
        detectedIngredients,
        userPreferences
      });

      console.log('📥 Preview API Response:', response);
      console.log('🔍 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        previewsPath1: !!response.data?.previews,
        previewsPath2: !!response.data?.data?.previews,
        sessionIdPath1: !!response.data?.sessionId,
        sessionIdPath2: !!response.data?.data?.sessionId
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate recipe previews');
      }

      if (response.success && response.data) {
        // Store session ID for detailed recipe generation later - check both possible structures
        const sessionId = response.data.sessionId || response.data.data?.sessionId;
        if (sessionId) {
          setSessionId(sessionId);
          console.log('💾 Stored session ID:', sessionId);
        }

        // Handle preview response format - check both possible structures
        const previewsData = response.data.previews || response.data.data?.previews;
        
        if (previewsData && Array.isArray(previewsData) && previewsData.length > 0) {
          console.log('✅ Received recipe previews:', previewsData.length);
          
          // Convert each preview to our Recipe format
          const previewRecipes: Recipe[] = previewsData.map((preview: any, index: number) => {
            return {
              id: preview.id || `preview-${index}`,
              title: preview.title,
              image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(preview.title)}`,
              cookingTime: `${preview.estimatedTime} min`,
              servings: userPreferences.servingSize,
              difficulty: preview.difficulty,
              macros: {
                calories: 350, // Estimated for preview
                protein: 15,
                carbs: 45,
                fat: 12,
              },
              tags: [
                ...userPreferences.dietaryTags,
                preview.cuisineType,
                'AI Generated Preview',
                ...(preview.appealFactors || [])
              ].filter(Boolean),
              description: preview.description,
              ingredients: preview.mainIngredients?.map((ing: string) => ({
                name: ing,
                amount: '1',
                unit: 'portion',
                source: 'preview'
              })) || [],
              instructions: [], // Will be populated when user selects "Cook"
              tips: [],
              // Store preview data for detailed generation
              previewData: preview
            };
          });

          console.log('✅ Successfully converted recipe previews:', previewRecipes.map(r => r.title));
          setRecipes(previewRecipes);
        } else {
          console.log('⚠️ Invalid preview API response format');
          console.log('Response data structure:', JSON.stringify(response.data, null, 2));
          throw new Error('No recipe previews were generated. Please try different ingredients or preferences.');
        }
      } else {
        throw new Error(response.error || 'Preview API call failed');
      }

    } catch (error: any) {
      console.error('❌ Recipe preview generation failed:', error);
      setError(error.message || 'Failed to generate recipe previews');
      setRecipes([]); // No fallback - show error state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateRecipesFromAPI();
  }, []);

  useEffect(() => {
    if (recipes.length > 0 && !isLoading) {
      if (!hasAnimatedEntrance) {
        // Only animate entrance once when recipes first load
        animateCardsEntrance();
        setHasAnimatedEntrance(true);
      } else {
        // Reset to stable position when recipes change but entrance already happened
        resetCardsToStablePosition();
      }
    }
  }, [recipes, isLoading]);

  const animateCardsEntrance = () => {
    // Start all cards below screen
    translateY.value = SCREEN_HEIGHT;
    card1TranslateY.value = SCREEN_HEIGHT;
    card2TranslateY.value = SCREEN_HEIGHT;
    opacity.value = 0;
    
    // Reset scales for entrance
    scale.value = 0.8;
    card1Scale.value = 0.75;
    card2Scale.value = 0.7;
    
    // Staggered entrance animation
    setTimeout(() => {
      // Front card enters first
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 500 });
      
      // Middle card follows with delay (positioned via fixed top: 12px)
      setTimeout(() => {
        card1TranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
        card1Scale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
      }, 150);
      
      // Back card follows last (positioned via fixed top: 24px)
      setTimeout(() => {
        card2TranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
        card2Scale.value = withSpring(0.9, { damping: 15, stiffness: 100 });
      }, 300);
    }, 200);
  };

  const resetCardsToStablePosition = () => {
    'worklet';
    console.log('🔄 Resetting cards to stable position');
    // Set all cards to their final stable positions without animation
    translateX.value = 0;
    translateY.value = 0;
    card1TranslateY.value = 0;
    card2TranslateY.value = 0;
    opacity.value = 1;
    
    // Set final, correct scales
    scale.value = 0.9;
    card1Scale.value = 0.95;
    card2Scale.value = 1;
  };

  const calculateRecipeXP = (recipe: Recipe) => {
    let totalXP = 50; // Base XP
    if (recipe.difficulty === 'Medium') totalXP += 10;
    if (recipe.difficulty === 'Hard') totalXP += 20;
    return totalXP;
  };

  const handleSaveRecipe = (recipeId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setSavedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 1500);
      }
      return newSet;
    });
  };

  const handleCookRecipe = async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    const currentRecipe = recipes[frontCardIndex];
    
    if (!currentRecipe || !currentRecipe.previewData || !sessionId) {
      console.error('❌ Missing recipe preview data or session ID');
      Alert.alert('Error', 'Unable to generate detailed recipe. Please try again.');
      return;
    }

    try {
      console.log('🍳 Generating detailed recipe for:', currentRecipe.title);
      
      // Show loading state
      setIsLoading(true);
      
      // Call Step 2: Generate detailed recipe
      const detailedResponse = await recipeService.generateDetailedRecipe({
        selectedPreview: currentRecipe.previewData,
        sessionId: sessionId
      });

      console.log('📥 Detailed recipe response:', detailedResponse);

      if (!detailedResponse.success) {
        throw new Error(detailedResponse.error || 'Failed to generate detailed recipe');
      }

      if (detailedResponse.data && detailedResponse.data.recipe) {
        const detailedRecipe = detailedResponse.data.recipe;
        
        // Convert detailed recipe to our Recipe format for CookMode
        const cookModeRecipe: Recipe = {
          ...currentRecipe,
          ingredients: detailedRecipe.ingredients || currentRecipe.ingredients,
          instructions: detailedRecipe.instructions?.map((inst: any) => 
            typeof inst === 'string' ? inst : inst.instruction
          ) || [],
          tips: detailedRecipe.tips || [],
          macros: {
            calories: detailedRecipe.nutritionEstimate?.calories || currentRecipe.macros.calories,
            protein: parseInt(detailedRecipe.nutritionEstimate?.protein?.replace('g', '') || '15'),
            carbs: parseInt(detailedRecipe.nutritionEstimate?.carbs?.replace('g', '') || '45'),
            fat: parseInt(detailedRecipe.nutritionEstimate?.fat?.replace('g', '') || '12'),
          },
          cookingTime: `${detailedRecipe.totalTime || detailedRecipe.prepTime + detailedRecipe.cookTime} min`,
          servings: detailedRecipe.servings || currentRecipe.servings,
          difficulty: detailedRecipe.difficulty || currentRecipe.difficulty
        };

        console.log('✅ Successfully generated detailed recipe with', 
          cookModeRecipe.instructions.length, 'steps');

        // Navigate to CookMode with detailed recipe
        navigation.navigate('CookMode', { 
          recipe: cookModeRecipe,
          sessionId: sessionId,
          detailedRecipeId: detailedResponse.data.storedRecipe?.id
        });
      } else {
        throw new Error('Invalid detailed recipe response format');
      }

    } catch (error: any) {
      console.error('❌ Detailed recipe generation failed:', error);
      Alert.alert(
        'Recipe Generation Failed',
        'Unable to generate detailed cooking instructions. Would you like to try again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleCookRecipe() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassRecipe = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    animateCardOut('left');
  };

  const handleTapBackCard = (tappedIndex: number) => {
    if (isAnimating.value) return;

    const diff = tappedIndex - frontCardIndex;
    if (diff <= 0) return;

    isAnimating.value = true;
    animateCardCascade(diff);
  };

  const animateCardCascade = (tappedVisualIndex: number) => {
    'worklet';
    const SPRING_CONFIG = { damping: 18, stiffness: 120 };

    // Define target positions
    const POS_FRONT = { scale: 0.9, y: 0 };
    const POS_MIDDLE = { scale: 0.95, y: -40 }; // Use refined offset
    const POS_BACK = { scale: 1.0, y: -80 }; // Use refined offset

    if (tappedVisualIndex === 1) { // Middle card tapped
      // Front -> Back
      scale.value = withSpring(POS_BACK.scale, SPRING_CONFIG);
      translateY.value = withSpring(POS_BACK.y, SPRING_CONFIG);
      // Middle -> Front
      card1Scale.value = withSpring(POS_FRONT.scale, SPRING_CONFIG);
      card1TranslateY.value = withSpring(POS_FRONT.y, SPRING_CONFIG);
      // Back -> Middle
      card2Scale.value = withSpring(POS_MIDDLE.scale, SPRING_CONFIG);
      // The last animation signals completion
      card2TranslateY.value = withSpring(POS_MIDDLE.y, SPRING_CONFIG, (finished) => {
        if (finished) { animationSignal.value = 1; }
      });

    } else if (tappedVisualIndex === 2) { // Back card tapped
      // Front -> Middle
      scale.value = withSpring(POS_MIDDLE.scale, SPRING_CONFIG);
      translateY.value = withSpring(POS_MIDDLE.y, SPRING_CONFIG);
      // Middle -> Back
      card1Scale.value = withSpring(POS_BACK.scale, SPRING_CONFIG);
      card1TranslateY.value = withSpring(POS_BACK.y, SPRING_CONFIG);
      // Back -> Front
      card2Scale.value = withSpring(POS_FRONT.scale, SPRING_CONFIG);
      // The last animation signals completion
      card2TranslateY.value = withSpring(POS_FRONT.y, SPRING_CONFIG, (finished) => {
        if (finished) { animationSignal.value = 2; }
      });
    }
  };

  const handlePreviewRecipe = () => {
    ReactNativeHapticFeedback.trigger('selection');
    const currentRecipe = recipes[frontCardIndex];
    if (currentRecipe) {
      setPreviewRecipe(currentRecipe);
      setShowPreviewModal(true);
    }
  };

  const animateCardOut = (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    
    translateX.value = withTiming(targetX, { duration: 300 });
    translateY.value = withTiming(-50, { duration: 300 }); // Slight upward motion
    opacity.value = withTiming(0, { duration: 300 });
    
    // Move to next card after animation
    setTimeout(() => {
      if (frontCardIndex < recipes.length - 1) {
        setFrontCardIndex(prev => prev + 1);
        // Reset all cards to stable position
        resetCardsToStablePosition();
        // Small bounce effect for front card only
        setTimeout(() => {
          scale.value = withSequence(
            withTiming(1.05, { duration: 100 }),
            withSpring(1, { damping: 15, stiffness: 100 })
          );
        }, 50);
      }
    }, 300);
  };

  // Gesture handler for front card swipes
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(ReactNativeHapticFeedback.trigger)('selection');
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      // Add rotation effect based on swipe direction
      const rotation = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
      
      // Scale down slightly as user swipes
      scale.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD],
        [1, 0.95],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - Cook
        runOnJS(ReactNativeHapticFeedback.trigger)('impactMedium');
        runOnJS(handleCookRecipe)();
        runOnJS(animateCardOut)('right');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - Pass
        runOnJS(ReactNativeHapticFeedback.trigger)('impactLight');
        runOnJS(animateCardOut)('left');
      } else {
        // Snap back to center
        translateX.value = withSpring(0);
        scale.value = withSpring(1);
      }
    },
  });

  // Animated style for front card
  const frontCardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-15, 0, 15],
            Extrapolate.CLAMP
          )}deg` 
        },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    } as any; // Cast to any to bypass strict transform typing
  });

  // Rebuilt animated styles for robust staggering
  const middleCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card1TranslateY.value - 40 }, // Tighter, more polished offset
      { scale: card1Scale.value },
    ],
  } as any));

  const backCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card2TranslateY.value - 80 }, // Tighter, more polished offset
      { scale: card2Scale.value },
    ],
  } as any));

  const renderFrontCard = (recipe: Recipe) => {
    return (
      <View style={styles.frontCardContent}>
        {/* Card Header with Title and Heart */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.frontCardTitle} numberOfLines={2}>
              {recipe.title}
            </Text>
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => handleSaveRecipe(recipe.id)}>
              <Heart
                size={20}
                color={savedRecipes.has(recipe.id) ? '#FF6B35' : '#8E8E93'}
                fill={savedRecipes.has(recipe.id) ? '#FF6B35' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.cardContentContainer} showsVerticalScrollIndicator={false}>

          {/* Meta Row: time • servings • difficulty */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={16} color="#8E8E93" />
              <Text style={styles.metaText}>{recipe.cookingTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={16} color="#8E8E93" />
              <Text style={styles.metaText}>{recipe.servings} serv</Text>
            </View>
            <View style={[styles.difficultyBadge, 
              recipe.difficulty === 'Easy' ? styles.easyBadge :
              recipe.difficulty === 'Medium' ? styles.mediumBadge : styles.hardBadge
            ]}>
              <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
            </View>
          </View>

          {/* Macro Row (colour numbers) */}
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.macros.calories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.macros.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.macros.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.macros.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          {/* Chip Row */}
          <View style={styles.chipRow}>
            {recipe.tags.slice(0, 4).map((tag, tagIndex) => (
              <View key={tagIndex} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Action Row - Fixed at bottom */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.passButton} onPress={handlePassRecipe}>
            <X size={20} color="#FF3B30" />
            <Text style={styles.passButtonText}>Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.previewButton} onPress={handlePreviewRecipe}>
            <Info size={20} color="#2D1B69" />
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cookButton} onPress={handleCookRecipe}>
            <ChefHat size={18} color="#FFFFFF" />
            <Text style={styles.cookButtonText}>Cook Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBackCard = (recipe: Recipe, index: number) => {
    return (
      <TouchableOpacity 
        style={styles.backCardHeader}
        onPress={() => handleTapBackCard(index)}
      >
        <View style={styles.backCardTextContainer}>
          <Text style={styles.backCardTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={styles.backCardTeaser}>
            {recipe.cookingTime} • {recipe.servings} servings • {recipe.difficulty}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCard = (recipe: Recipe, index: number, cardType: 'front' | 'middle' | 'back') => {
    const isFront = cardType === 'front';
    
    let animatedStyle;
    let cardStyle;
    
    switch (cardType) {
      case 'front':
        animatedStyle = frontCardAnimatedStyle;
        cardStyle = styles.frontCardStyle;
        break;
      case 'middle':
        animatedStyle = middleCardAnimatedStyle;
        cardStyle = styles.middleCardStyle;
        break;
      case 'back':
        animatedStyle = backCardAnimatedStyle;
        cardStyle = styles.backCardStyle;
        break;
    }

    const cardContent = isFront 
      ? renderFrontCard(recipe) 
      : renderBackCard(recipe, index);

    const animatedCard = (
      <Animated.View
        key={`${recipe.id}-${cardType}`}
        style={[
          styles.card,
          cardStyle,
          { zIndex: 1000 - (index - frontCardIndex) * 100 },
          animatedStyle,
        ]}>
        {cardContent}
      </Animated.View>
    );

    if (isFront) {
      // The front card is the only one that needs the pan gesture handler for swiping
      return (
        <PanGestureHandler onGestureEvent={panGestureHandler}>
          {animatedCard}
        </PanGestureHandler>
      );
    }
    
    // Back cards are just the animated view, they handle their own taps internally
    return animatedCard;
  };

  const getVisibleRecipes = () => {
    // Always try to show 3 cards by wrapping around if needed
    const totalRecipes = recipes.length;
    if (totalRecipes === 0) return [];
    
    const visible = [];
    for (let i = 0; i < Math.min(3, totalRecipes); i++) {
      const recipeIndex = (frontCardIndex + i) % totalRecipes;
      visible.push(recipes[recipeIndex]);
    }
    return visible;
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Generating Recipes</Text>
          <Text style={styles.subtitle}>AI Chef is cooking up something special...</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Creating personalized recipes</Text>
          <Text style={styles.loadingSubtext}>AI Chef is analyzing your ingredients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Oops!</Text>
          <Text style={styles.subtitle}>Something went wrong</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={generateRecipesFromAPI}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.goBackButton} 
            onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>


      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pick-a-Plate</Text>
        <Text style={styles.subtitle}>
          {recipes.length} personalized recipes ready to cook
        </Text>
      </View>

      {/* Zone B: Stack Viewport */}
      <View style={styles.stackViewport}>
        {getVisibleRecipes().length > 0 && (
          <>
            {/* Render cards in reverse order for proper stacking. */}
            {getVisibleRecipes().slice(0).reverse().map((recipe, i) => {
              if (!recipe) return null; // Add guard against undefined recipe
              const visibleIndex = getVisibleRecipes().length - 1 - i;
              const cardType = visibleIndex === 0 ? 'front' : visibleIndex === 1 ? 'middle' : 'back';
              const overallIndex = (frontCardIndex + visibleIndex);

              // Use a React.Fragment with a key to solve the list warning
              return (
                <React.Fragment key={`${recipe.id}-${overallIndex}`}>
                  {renderCard(recipes[overallIndex], overallIndex, cardType)}
                </React.Fragment>
              );
            })}
          </>
        )}
        
        {/* Swipe hint - only show for first few recipes */}
        {frontCardIndex < 2 && (
          <Animated.View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>↔ Swipe to choose • Tap cards to reorder</Text>
          </Animated.View>
        )}
      </View>

      {/* Saved Toast */}
      {showSavedToast && (
        <Animated.View 
          style={styles.savedToast}
          entering={undefined} // Will use manual animation
        >
          <Text style={styles.savedToastText}>Added to Saved</Text>
        </Animated.View>
      )}

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Recipe Preview</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPreviewModal(false)}>
                <X size={24} color="#2D1B69" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {previewRecipe && (
                <>
                  {/* <Image source={{ uri: previewRecipe.image }} style={styles.previewImage} /> */}
                  
                  <View style={styles.previewContent}>
                    <Text style={styles.previewTitle}>{previewRecipe.title}</Text>
                    <Text style={styles.previewDescription}>{previewRecipe.description}</Text>
                    
                    {/* Instructions */}
                    {previewRecipe.instructions && (
                      <View style={styles.previewSection}>
                        <Text style={styles.previewSectionTitle}>Instructions</Text>
                        {previewRecipe.instructions.map((instruction, index) => (
                          <View key={index} style={styles.instructionItem}>
                            <View style={styles.instructionNumber}>
                              <Text style={styles.instructionNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.instructionText}>{instruction}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Tips */}
                    {previewRecipe.tips && previewRecipe.tips.length > 0 && (
                      <View style={styles.previewSection}>
                        <Text style={styles.previewSectionTitle}>💡 Chef's Tips</Text>
                        {previewRecipe.tips.map((tip, index) => (
                          <Text key={index} style={styles.tipText}>• {tip}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={styles.previewCookButton} 
                onPress={() => {
                  setShowPreviewModal(false);
                  handleCookRecipe();
                }}>
                <ChefHat size={20} color="#FFFFFF" />
                <Text style={styles.previewCookButtonText}>Start Cooking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF', // Light background
  },


  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B69', // Eggplant Midnight
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#2D1B69',
    marginTop: 6,
    fontWeight: '500',
    opacity: 0.8,
    textAlign: 'center',
  },

  // Zone B: Stack Viewport
  stackViewport: {
    flex: 1,
    alignItems: 'center', // Center card stack horizontally
    justifyContent: 'flex-end', // Anchor card stack to the bottom
    paddingBottom: 20, // Give some space from the tab bar
  },

  // Card Styles - rounded corners 16px, subtle shadow
  card: {
    position: 'absolute',
    width: '90%', // Use a percentage of the viewport
    maxWidth: 360, // Set a max-width for larger screens
    aspectRatio: 0.75, // Maintain a consistent card shape
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Softer corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  frontCardStyle: {
    borderWidth: 2,
    borderColor: '#2D1B69', // Eggplant Midnight
  },
  middleCardStyle: {
    borderWidth: 2,
    borderColor: '#FF6B35', // Spice Orange
  },
  backCardStyle: {
    borderWidth: 2,
    borderColor: '#4CAF50', // Fresh Basil
  },

  // Front Card Content
  frontCardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  heartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  frontCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    lineHeight: 22,
    flex: 1,
    marginRight: 12,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  easyBadge: {
    backgroundColor: '#4CAF50', // Fresh Basil
  },
  mediumBadge: {
    backgroundColor: '#FF9800',
  },
  hardBadge: {
    backgroundColor: '#F44336',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Macro Row (colour numbers)
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E7',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35', // Spice Orange
  },
  macroLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Chip Row
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  chip: {
    backgroundColor: '#2D1B69', // Eggplant Midnight
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Action Row - Fixed at bottom
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  passButton: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  passButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  previewButton: {
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1B69',
  },
  cookButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35', // Spice Orange
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cookButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Back Card Header (Peeking Cards) - shows only title + 1-line teaser
  backCardHeader: {
    height: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start', // Align content to the TOP
    paddingHorizontal: 20,
    paddingTop: 20, // Add padding to push content down from the border
  },
  backCardTextContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  backCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 6,
    lineHeight: 20,
  },
  backCardTeaser: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Swipe Hint
  swipeHint: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  swipeHintText: {
    fontSize: 11,
    color: 'rgba(45, 27, 105, 0.7)', // Ghosted Eggplant
    fontWeight: '600',
    textAlign: 'center',
  },

  // Saved Toast
  savedToast: {
    position: 'absolute',
    bottom: 80,
    left: 30,
    right: 30,
    backgroundColor: '#4CAF50', // Fresh Basil background
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  savedToastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Preview Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  previewModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  modalCloseButton: {
    padding: 4,
  },
  /*
  previewImage: {
    width: '100%',
    height: 200,
  },
  */
  previewContent: {
    padding: 20,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
  },
  previewDescription: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
    marginBottom: 24,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#2D1B69',
    lineHeight: 24,
  },
  tipText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 6,
  },
  previewActions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  previewCookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewCookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goBackButton: {
    backgroundColor: '#FFFFFF', // White background instead of transparent for better shadow performance
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D1B69',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
});

export default RecipeCardsScreen; 
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
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
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {recipeService} from '../services/api';
import LoadingAnimation from '../components/LoadingAnimation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  withSequence,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {PanGestureHandler} from 'react-native-gesture-handler';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
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
  const {ingredients = [], preferences = {}} = route.params || {};

  // State management
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [frontCardIndex, setFrontCardIndex] = useState<number>(0);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [hasAnimatedEntrance, setHasAnimatedEntrance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Animation values for swipe gestures
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Corrected Scaling: Front card is smallest, back is largest
  const scale = useSharedValue(0.9); // Front card scale (increased from 0.78 for better visibility)
  const card1Scale = useSharedValue(0.95); // Middle card scale (increased from 0.88)
  const card2Scale = useSharedValue(1.0); // Back card scale (largest, creates depth)

  // Shared values for back card animations - increased offsets for title visibility
  const card1TranslateY = useSharedValue(-50); // Middle card offset (increased from -15 for title visibility)
  const card2TranslateY = useSharedValue(-100); // Back card offset (increased from -30 for title visibility)
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const animationSignal = useSharedValue(0); // Signal to sync UI and JS threads

  // Helper functions for state updates from worklet
  const updateFrontCardIndexByOne = () => {
    setFrontCardIndex(prev => {
      // Ensure prev is a valid number
      const safePrev = typeof prev === 'number' ? prev : 0;
      const newIndex = (safePrev + 1) % recipes.length;
      console.log(
        '🔄 [REACTION] FrontCardIndex updated by 1:',
        prev,
        '->',
        newIndex,
        'type:',
        typeof prev,
      );

      // Ensure we always return a number
      return Number(newIndex);
    });
  };

  const updateFrontCardIndexByTwo = () => {
    setFrontCardIndex(prev => {
      // Ensure prev is a valid number
      const safePrev = typeof prev === 'number' ? prev : 0;
      const newIndex = (safePrev + 2) % recipes.length;
      console.log(
        '🔄 [REACTION] FrontCardIndex updated by 2:',
        prev,
        '->',
        newIndex,
        'type:',
        typeof prev,
      );

      // Ensure we always return a number
      return Number(newIndex);
    });
  };

  // This hook safely listens for a signal from the UI thread to update JS state
  useAnimatedReaction(
    () => animationSignal.value,
    (signalValue, previousValue) => {
      if (signalValue !== 0 && signalValue !== previousValue) {
        console.log('🔄 [REACTION] Animation signal received:', {
          signalValue,
          previousValue,
          currentFrontCardIndex: frontCardIndex,
          recipesLength: recipes.length,
        });

        // Update the JS state to move to the next card
        if (signalValue === 1) {
          // Middle card came to front
          console.log(
            '🔄 [REACTION] Middle card came to front, incrementing frontCardIndex',
          );
          runOnJS(updateFrontCardIndexByOne)();
        } else if (signalValue === 2) {
          // Back card came to front
          console.log(
            '🔄 [REACTION] Back card came to front, jumping frontCardIndex by 2',
          );
          runOnJS(updateFrontCardIndexByTwo)();
        }

        console.log(
          '🔄 [REACTION] Resetting animation values to stable positions',
        );
        // Reset animation values directly on the UI thread with completion callback
        translateY.value = withTiming(0, {duration: 100});
        card1TranslateY.value = withTiming(-50, {duration: 100});
        card2TranslateY.value = withTiming(-100, {duration: 100});

        scale.value = withTiming(0.9, {duration: 100}); // Front card smallest
        card1Scale.value = withTiming(0.95, {duration: 100}); // Middle card
        card2Scale.value = withTiming(1.0, {duration: 100}); // Back card largest

        translateX.value = withTiming(0, {duration: 100});
        opacity.value = withTiming(1, {duration: 100}, finished => {
          if (finished) {
            console.log(
              '🔄 [REACTION] Reset animations completed, clearing animation state',
            );
            isAnimating.value = false;
            animationSignal.value = 0;
          }
        });
      }
    },
    [recipes.length],
  );

  // Generate recipe previews from backend API (Step 1 of two-step process)
  const generateRecipesFromAPI = async () => {
    // Map ingredients to the format expected by the backend
    const detectedIngredients = ingredients
      .map((ingredient: any) =>
        typeof ingredient === 'string'
          ? ingredient
          : ingredient.name || ingredient.title,
      )
      .filter(Boolean);

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Generating recipe previews with data:', {
        ingredients: ingredients.length,
        preferences: Object.keys(preferences).length,
        ingredientsList: ingredients,
        preferencesData: preferences,
      });

      if (detectedIngredients.length === 0) {
        throw new Error(
          'No ingredients detected. Please go back and scan some ingredients first.',
        );
      }

      // Build user preferences for the new two-step API
      const userPreferences = {
        servingSize: preferences?.servingSize || 2,
        mealPrepEnabled: preferences?.mealPrepEnabled || false,
        mealPrepPortions: preferences?.mealPrepPortions,
        selectedAppliances: preferences?.selectedAppliances || [
          'oven',
          'stove',
          'microwave',
        ],
        dietaryTags: preferences?.dietary || [],
        cuisinePreferences: preferences?.cuisine || ['🎲 Surprise Me!'],
        timeAvailable: preferences?.cookingTime || 'any',
        skillLevel: preferences?.difficulty || 'any',
      };

      console.log('📤 Sending preview request to AI:', {
        detectedIngredients,
        userPreferences,
      });

      // Call the new recipe previews API (Step 1)
      const response = await recipeService.generatePreviews({
        detectedIngredients,
        userPreferences,
      });

      console.log('📥 Preview API Response:', response);
      console.log('🔍 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        previewsPath1: !!response.data?.previews,
        previewsPath2: !!response.data?.data?.previews,
        sessionIdPath1: !!response.data?.sessionId,
        sessionIdPath2: !!response.data?.data?.sessionId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate recipe previews');
      }

      if (response.success && response.data) {
        // Store session ID for detailed recipe generation later - check both possible structures
        const sessionId =
          response.data.sessionId || response.data.data?.sessionId;
        if (sessionId) {
          setSessionId(sessionId);
          console.log('💾 Stored session ID:', sessionId);
        }

        // Handle preview response format - check both possible structures
        const previewsData =
          response.data.previews || response.data.data?.previews;

        if (
          previewsData &&
          Array.isArray(previewsData) &&
          previewsData.length > 0
        ) {
          console.log('✅ Received recipe previews:', previewsData.length);

          // Convert each preview to our Recipe format
          const previewRecipes: Recipe[] = previewsData.map(
            (preview: any, index: number) => {
              // Generate dynamic macros based on recipe content and variety
              const baseCalories =
                280 + index * 45 + Math.floor(Math.random() * 100); // 280-425 range
              const proteinRatio = preview.cuisineType?.includes(
                'Mediterranean',
              )
                ? 0.25
                : preview.title?.toLowerCase().includes('beef')
                ? 0.3
                : 0.2;
              const carbRatio = preview.title?.toLowerCase().includes('salad')
                ? 0.15
                : 0.45;
              const fatRatio = 1 - proteinRatio - carbRatio;

              const dynamicMacros = {
                calories: baseCalories,
                protein: Math.round((baseCalories * proteinRatio) / 4), // 4 cal per gram of protein
                carbs: Math.round((baseCalories * carbRatio) / 4), // 4 cal per gram of carbs
                fat: Math.round((baseCalories * fatRatio) / 9), // 9 cal per gram of fat
              };

              return {
                id: preview.id || `preview-${index}`,
                title: preview.title,
                image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(
                  preview.title,
                )}`,
                cookingTime: `${preview.estimatedTime} min`,
                servings: userPreferences.servingSize,
                difficulty: preview.difficulty,
                macros: dynamicMacros,
                tags: [
                  ...userPreferences.dietaryTags,
                  preview.cuisineType,
                  'AI Generated Preview',
                  ...(preview.appealFactors || []),
                ].filter(Boolean),
                description: preview.description,
                ingredients:
                  preview.mainIngredients?.map((ing: string) => ({
                    name: ing,
                    amount: '1',
                    unit: 'portion',
                    source: 'preview',
                  })) || [],
                instructions: [], // Will be populated when user selects "Cook"
                tips: [],
                // Store preview data for detailed generation
                previewData: preview,
              };
            },
          );

          console.log(
            '✅ Successfully converted recipe previews:',
            previewRecipes.map(r => r.title),
          );
          setRecipes(previewRecipes);
        } else {
          console.log('⚠️ Invalid preview API response format');
          console.log(
            'Response data structure:',
            JSON.stringify(response.data, null, 2),
          );
          throw new Error(
            'No recipe previews were generated. Please try different ingredients or preferences.',
          );
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

  // Monitor frontCardIndex for corruption and fix it
  useEffect(() => {
    if (typeof frontCardIndex !== 'number' || isNaN(frontCardIndex)) {
      console.log(
        '🚨 [MONITOR] frontCardIndex corrupted, resetting:',
        frontCardIndex,
        'type:',
        typeof frontCardIndex,
      );
      setFrontCardIndex(0);
    }
  }, [frontCardIndex]);

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
    console.log('🎬 [ENTRANCE] Starting card entrance animation');
    // Start all cards below screen
    translateY.value = SCREEN_HEIGHT;
    card1TranslateY.value = SCREEN_HEIGHT;
    card2TranslateY.value = SCREEN_HEIGHT;
    opacity.value = 0;

    // Reset scales for entrance - start small
    scale.value = 0.5;
    card1Scale.value = 0.6;
    card2Scale.value = 0.7;

    // Staggered entrance animation
    setTimeout(() => {
      console.log('🎬 [ENTRANCE] Animating front card to final position');
      // Front card enters first (smallest scale: 0.78)
      translateY.value = withSpring(0, {damping: 15, stiffness: 100});
      scale.value = withSpring(0.9, {damping: 15, stiffness: 100});
      opacity.value = withTiming(1, {duration: 500});

      // Middle card follows with delay (middle scale: 0.88)
      setTimeout(() => {
        console.log('🎬 [ENTRANCE] Animating middle card to final position');
        card1TranslateY.value = withSpring(-50, {damping: 15, stiffness: 100});
        card1Scale.value = withSpring(0.95, {damping: 15, stiffness: 100});
      }, 150);

      // Back card follows last (largest scale: 1.0)
      setTimeout(() => {
        console.log('🎬 [ENTRANCE] Animating back card to final position');
        card2TranslateY.value = withSpring(-100, {damping: 15, stiffness: 100});
        card2Scale.value = withSpring(1.0, {damping: 15, stiffness: 100});
        console.log('🎬 [ENTRANCE] All cards positioned in 3-card stack');
      }, 300);
    }, 200);
  };

  const resetCardsToStablePosition = () => {
    'worklet';
    console.log('🔄 [RESET] Resetting cards to stable position');
    console.log('🔄 [RESET] Setting positions:');
    console.log('  • Front card: scale 0.9, translateY 0 (smallest, top)');
    console.log(
      '  • Middle card: scale 0.95, translateY -50 (medium, titles visible)',
    );
    console.log(
      '  • Back card: scale 1.0, translateY -100 (largest, titles visible)',
    );

    // Reset all translation and position values
    translateX.value = 0;
    translateY.value = 0; // Front card at base position
    card1TranslateY.value = -50; // Middle card offset up slightly
    card2TranslateY.value = -100; // Back card offset up most
    opacity.value = 1;

    // Set final, correct scales with proper hierarchy
    scale.value = 0.9; // Front card smallest (most important, on top visually)
    card1Scale.value = 0.95; // Middle card medium
    card2Scale.value = 1.0; // Back card largest (creates depth)

    console.log('🔄 [RESET] Cards reset to stable 3-card stack position');
  };

  const calculateRecipeXP = (recipe: Recipe) => {
    let totalXP = 50; // Base XP
    if (recipe.difficulty === 'Medium') {
      totalXP += 10;
    }
    if (recipe.difficulty === 'Hard') {
      totalXP += 20;
    }
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
    const safeFrontCardIndex =
      typeof frontCardIndex === 'number' ? frontCardIndex : 0;
    const currentRecipe = recipes[safeFrontCardIndex];

    if (!currentRecipe || !currentRecipe.previewData || !sessionId) {
      console.error('❌ Missing recipe preview data or session ID');
      console.error('Debug info:', {
        hasCurrentRecipe: !!currentRecipe,
        hasPreviewData: !!currentRecipe?.previewData,
        hasSessionId: !!sessionId,
        sessionId: sessionId,
      });

      // Reset card position since cook failed
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);

      Alert.alert(
        'Error',
        'Unable to generate detailed recipe. Please try again.',
      );
      return;
    }

    try {
      console.log('🍳 Generating detailed recipe for:', currentRecipe.title);
      console.log('📤 Using sessionId:', sessionId);

      // Show detailed recipe loading state
      setIsGeneratingDetailed(true);

      // Call Step 2: Generate detailed recipe
      const detailedResponse = await recipeService.generateDetailedRecipe({
        selectedPreview: currentRecipe.previewData,
        sessionId: sessionId,
      });

      console.log('📥 Detailed recipe response:', detailedResponse);

      if (!detailedResponse.success) {
        throw new Error(
          detailedResponse.error || 'Failed to generate detailed recipe',
        );
      }

      // Debug: Log the exact response structure
      console.log('🔍 Response structure debug:', {
        hasData: !!detailedResponse.data,
        dataKeys: detailedResponse.data
          ? Object.keys(detailedResponse.data)
          : [],
        dataType: typeof detailedResponse.data,
        dataStructure: detailedResponse.data,
        hasDataData: detailedResponse.data?.data ? true : false,
        dataDataKeys: detailedResponse.data?.data
          ? Object.keys(detailedResponse.data.data)
          : [],
        hasRecipe: detailedResponse.data?.recipe ? true : false,
        hasDataDataRecipe: detailedResponse.data?.data?.recipe ? true : false,
      });

      if (
        detailedResponse.data &&
        detailedResponse.data.data &&
        detailedResponse.data.data.recipe
      ) {
        const detailedRecipe = detailedResponse.data.data.recipe;

        // Convert detailed recipe to our Recipe format for CookMode
        const cookModeRecipe: Recipe = {
          ...currentRecipe,
          ingredients: detailedRecipe.ingredients || currentRecipe.ingredients,
          instructions:
            detailedRecipe.instructions?.map((inst: any) =>
              typeof inst === 'string' ? inst : inst.instruction,
            ) || [],
          tips: detailedRecipe.tips || [],
          macros: {
            calories:
              detailedRecipe.nutritionEstimate?.calories ||
              currentRecipe.macros.calories,
            protein: parseInt(
              detailedRecipe.nutritionEstimate?.protein?.replace('g', '') ||
                '15',
            ),
            carbs: parseInt(
              detailedRecipe.nutritionEstimate?.carbs?.replace('g', '') || '45',
            ),
            fat: parseInt(
              detailedRecipe.nutritionEstimate?.fat?.replace('g', '') || '12',
            ),
          },
          cookingTime: `${
            detailedRecipe.totalTime ||
            detailedRecipe.prepTime + detailedRecipe.cookTime
          } min`,
          servings: detailedRecipe.servings || currentRecipe.servings,
          difficulty: detailedRecipe.difficulty || currentRecipe.difficulty,
        };

        console.log(
          '✅ Successfully generated detailed recipe with',
          cookModeRecipe.instructions.length,
          'steps',
        );

        // Remove the card now that recipe generation was successful
        console.log('👨‍🍳 [SUCCESS] Recipe generated, removing card from stack');
        removeCurrentCard();

        // Reset card animations for the new front card
        translateX.value = 0;
        translateY.value = 0;
        opacity.value = 1;
        resetCardsToStablePosition();

        // Small bounce effect for the new front card
        setTimeout(() => {
          scale.value = withSequence(
            withTiming(1.05, {duration: 100}),
            withSpring(0.9, {damping: 15, stiffness: 100}), // Reset to proper front card scale
          );
        }, 50);

        // Navigate to CookMode with detailed recipe
        navigation.navigate('CookMode', {
          recipe: cookModeRecipe,
          sessionId: sessionId,
          detailedRecipeId: detailedResponse.data.data.stored_recipe?.id,
        });
      } else if (detailedResponse.data && detailedResponse.data.recipe) {
        // Fallback: Try direct recipe access (in case API response format changed)
        console.log('🔄 Using fallback direct recipe access');
        const detailedRecipe = detailedResponse.data.recipe;

        // Convert detailed recipe to our Recipe format for CookMode
        const cookModeRecipe: Recipe = {
          ...currentRecipe,
          ingredients: detailedRecipe.ingredients || currentRecipe.ingredients,
          instructions:
            detailedRecipe.instructions?.map((inst: any) =>
              typeof inst === 'string' ? inst : inst.instruction,
            ) || [],
          tips: detailedRecipe.tips || [],
          macros: {
            calories:
              detailedRecipe.nutritionEstimate?.calories ||
              currentRecipe.macros.calories,
            protein: parseInt(
              detailedRecipe.nutritionEstimate?.protein?.replace('g', '') ||
                '15',
            ),
            carbs: parseInt(
              detailedRecipe.nutritionEstimate?.carbs?.replace('g', '') || '45',
            ),
            fat: parseInt(
              detailedRecipe.nutritionEstimate?.fat?.replace('g', '') || '12',
            ),
          },
          cookingTime: `${
            detailedRecipe.totalTime ||
            detailedRecipe.prepTime + detailedRecipe.cookTime
          } min`,
          servings: detailedRecipe.servings || currentRecipe.servings,
          difficulty: detailedRecipe.difficulty || currentRecipe.difficulty,
        };

        console.log(
          '✅ Successfully generated detailed recipe with',
          cookModeRecipe.instructions.length,
          'steps',
        );

        // Remove the card now that recipe generation was successful
        console.log('👨‍🍳 [SUCCESS] Recipe generated, removing card from stack');
        removeCurrentCard();

        // Reset card animations for the new front card
        translateX.value = 0;
        translateY.value = 0;
        opacity.value = 1;
        resetCardsToStablePosition();

        // Small bounce effect for the new front card
        setTimeout(() => {
          scale.value = withSequence(
            withTiming(1.05, {duration: 100}),
            withSpring(0.9, {damping: 15, stiffness: 100}),
          );
        }, 50);

        // Navigate to CookMode with detailed recipe
        navigation.navigate('CookMode', {
          recipe: cookModeRecipe,
          sessionId: sessionId,
          detailedRecipeId: detailedResponse.data.stored_recipe?.id,
        });
      } else {
        console.error('❌ Invalid response structure. Available keys:', {
          responseKeys: Object.keys(detailedResponse),
          dataKeys: detailedResponse.data
            ? Object.keys(detailedResponse.data)
            : null,
          hasData: !!detailedResponse.data,
          hasDataData: !!detailedResponse.data?.data,
          hasDataRecipe: !!detailedResponse.data?.recipe,
        });
        throw new Error('Invalid detailed recipe response format');
      }
    } catch (error: any) {
      console.error('❌ Detailed recipe generation failed:', error);
      console.error('🔍 Debug info:', {
        sessionId: sessionId,
        sessionIdType: typeof sessionId,
        hasSessionId: !!sessionId,
        currentRecipe: currentRecipe?.title,
        hasPreviewData: !!currentRecipe?.previewData,
        previewDataId: currentRecipe?.previewData?.id,
        errorMessage: error?.message,
      });

      // Reset card position since cook failed
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);

      Alert.alert(
        'Recipe Generation Failed',
        `Unable to generate detailed cooking instructions. ${
          error?.message || 'Please try again.'
        }`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Try Again', onPress: () => handleCookRecipe()},
        ],
      );
    } finally {
      setIsGeneratingDetailed(false);
    }
  };

  const handlePassRecipe = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    animateCardOut('pass');
  };

  const handleTapBackCard = (visualIndex: number) => {
    console.log('🟡 [TAP] Back card tapped:', {
      visualIndex,
      isAnimating: isAnimating.value,
      currentFrontCardIndex: frontCardIndex,
      totalRecipes: recipes.length,
      recipeTitles: recipes.map(r => r.title),
    });

    if (isAnimating.value) {
      console.log('⚠️ [TAP] Animation already in progress, ignoring tap');
      return;
    }

    // Only allow tapping on back cards (visual index 1 or 2)
    if (visualIndex <= 0) {
      console.log('⚠️ [TAP] Invalid visual index, ignoring tap:', visualIndex);
      return;
    }

    console.log(
      '✅ [TAP] Starting cascade animation for visual index:',
      visualIndex,
    );
    isAnimating.value = true;
    animateCardCascade(visualIndex);
  };

  const animateCardCascade = (tappedVisualIndex: number) => {
    'worklet';
    console.log(
      '🎬 [ANIMATE] Starting cascade for tapped visual index:',
      tappedVisualIndex,
    );

    const safeFrontCardIndex = typeof frontCardIndex === 'number' ? frontCardIndex : 0;
    const currentRecipe = recipes[safeFrontCardIndex];
    
    if (!currentRecipe) {
      console.log('⚠️ [ANIMATE] No current recipe found, skipping cascade');
      return;
    }

    const time = parseInt(currentRecipe.cookingTime.split(' ')[0], 10) || 30;
    const servings = parseInt(currentRecipe.servings.toString(), 10) || 2;
    const xp = parseInt(String(currentRecipe.macros.calories), 10) / 10;

    // Implement cascade animation logic here
  };

  const removeCurrentCard = () => {
    // Implement card removal logic here
  };

  const animateCardOut = (direction: string) => {
    // Implement card out animation logic here
  };

  return (
    <View>
      {/* Render your component content here */}
    </View>
  );
};

export default RecipeCardsScreen;

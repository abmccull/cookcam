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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Animation values for swipe gestures
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animation values for card cascade effect
  const card1TranslateY = useSharedValue(12);
  const card2TranslateY = useSharedValue(24);
  const card1Scale = useSharedValue(0.95);
  const card2Scale = useSharedValue(0.9);

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
      
      // Fallback to test previews using actual detected ingredients - CREATE 3 RECIPES FOR STACKING
      const fallbackPreviews: Recipe[] = [
        {
          id: 'fallback-preview-1',
          title: `Quick ${detectedIngredients.slice(0, 2).join(' & ')} Stir-Fry`,
          image: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Quick+Stir-Fry',
          cookingTime: '20 min',
          servings: 2,
          difficulty: 'Easy',
          macros: {
            calories: 280,
            protein: 12,
            carbs: 30,
            fat: 8,
          },
          tags: ['Quick', 'Healthy', 'Asian Fusion'],
          description: `A fast and healthy stir-fry using your ingredients: ${detectedIngredients.slice(0, 3).join(', ')}.`,
          ingredients: detectedIngredients.slice(0, 4).map(ing => ({ name: ing, amount: '1', unit: 'portion', source: 'preview' })),
          instructions: [], // Will be filled when cooking
          tips: [],
          previewData: {
            id: 'fallback-preview-1',
            title: `Quick ${detectedIngredients.slice(0, 2).join(' & ')} Stir-Fry`,
            description: `A fast and healthy stir-fry using your ingredients.`,
            estimatedTime: 20,
            difficulty: 'easy',
            cuisineType: 'Asian',
            mainIngredients: detectedIngredients.slice(0, 4)
          }
        },
        {
          id: 'fallback-preview-2',
          title: `${detectedIngredients[0] || 'Fresh'} Salad Bowl`,
          image: 'https://via.placeholder.com/400x300/2D1B69/FFFFFF?text=Fresh+Salad',
          cookingTime: '15 min',
          servings: 2,
          difficulty: 'Easy',
          macros: {
            calories: 220,
            protein: 8,
            carbs: 25,
            fat: 6,
          },
          tags: ['Fresh', 'Mediterranean', 'No Cook'],
          description: `A refreshing salad featuring your fresh ingredients in Mediterranean style.`,
          ingredients: detectedIngredients.slice(0, 5).map(ing => ({ name: ing, amount: '1', unit: 'cup', source: 'preview' })),
          instructions: [],
          tips: [],
          previewData: {
            id: 'fallback-preview-2',
            title: `${detectedIngredients[0] || 'Fresh'} Salad Bowl`,
            description: `A refreshing salad featuring your fresh ingredients.`,
            estimatedTime: 15,
            difficulty: 'easy',
            cuisineType: 'Mediterranean',
            mainIngredients: detectedIngredients.slice(0, 5)
          }
        },
        {
          id: 'fallback-preview-3',
          title: `Hearty ${detectedIngredients.slice(-2).join(' & ')} Soup`,
          image: 'https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Hearty+Soup',
          cookingTime: '35 min',
          servings: 4,
          difficulty: 'Medium',
          macros: {
            calories: 320,
            protein: 18,
            carbs: 35,
            fat: 10,
          },
          tags: ['Comfort Food', 'American', 'One Pot'],
          description: `A warming, nutritious soup that makes great use of your ingredients.`,
          ingredients: detectedIngredients.slice(0, 6).map(ing => ({ name: ing, amount: '1', unit: 'serving', source: 'preview' })),
          instructions: [],
          tips: [],
          previewData: {
            id: 'fallback-preview-3',
            title: `Hearty ${detectedIngredients.slice(-2).join(' & ')} Soup`,
            description: `A warming, nutritious soup.`,
            estimatedTime: 35,
            difficulty: 'medium',
            cuisineType: 'American',
            mainIngredients: detectedIngredients.slice(0, 6)
          }
        }
      ];
      
      setRecipes(fallbackPreviews);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateRecipesFromAPI();
  }, []);

  useEffect(() => {
    if (recipes.length > 0 && !isLoading) {
      // Enhanced entrance animation with staggered timing
      animateCardsEntrance();
    }
  }, [recipes, isLoading]);

  const animateCardsEntrance = () => {
    // Start all cards below screen
    translateY.value = SCREEN_HEIGHT;
    card1TranslateY.value = SCREEN_HEIGHT + 50;
    card2TranslateY.value = SCREEN_HEIGHT + 100;
    opacity.value = 0;
    
    // Staggered entrance animation
    setTimeout(() => {
      // Front card enters first
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 500 });
      
      // Middle card follows with delay
      setTimeout(() => {
        card1TranslateY.value = withSpring(12, { damping: 15, stiffness: 100 });
        card1Scale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
      }, 150);
      
      // Back card follows last
      setTimeout(() => {
        card2TranslateY.value = withSpring(24, { damping: 15, stiffness: 100 });
        card2Scale.value = withSpring(0.9, { damping: 15, stiffness: 100 });
      }, 300);
    }, 200);
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

  const handleTapBackCard = (targetIndex: number) => {
    ReactNativeHapticFeedback.trigger('selection');
    
    // Enhanced cascade animation when bringing card to front
    const direction = targetIndex > frontCardIndex ? 'forward' : 'backward';
    animateCardCascade(direction);
    
    setTimeout(() => {
      setFrontCardIndex(targetIndex);
    }, 150);
  };

  const animateCardCascade = (direction: 'forward' | 'backward') => {
    if (direction === 'forward') {
      // Animate current front card sliding down/back
      translateY.value = withSpring(12, { damping: 15, stiffness: 100 });
      scale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
      
      // Animate middle card to front
      card1TranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      card1Scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      // Similar animation for backward direction
      card1TranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      card1Scale.value = withSpring(1, { damping: 15, stiffness: 100 });
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
        // Reset animations for next card with bounce effect
        translateX.value = 0;
        translateY.value = withSequence(
          withTiming(20, { duration: 100 }),
          withSpring(0, { damping: 15, stiffness: 100 })
        );
        opacity.value = withTiming(1, { duration: 200 });
        scale.value = withSequence(
          withTiming(1.05, { duration: 100 }),
          withSpring(1, { damping: 15, stiffness: 100 })
        );
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
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value } as any,
        { translateY: translateY.value } as any,
        { scale: scale.value } as any,
        { rotate: `${rotation}deg` } as any,
      ],
      opacity: opacity.value,
    };
  });

  // Animated styles for back cards
  const middleCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card1TranslateY.value } as any,
      { scale: card1Scale.value } as any,
    ],
  }));

  const backCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card2TranslateY.value } as any,
      { scale: card2Scale.value } as any,
    ],
  }));

  const renderFrontCard = (recipe: Recipe) => {
    return (
      <View style={styles.frontCardContent}>
        {/* Hero Image - 40% height */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: recipe.image }} style={styles.heroImage} />
          
          {/* Heart/Save button - top right */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleSaveRecipe(recipe.id)}>
            <Heart
              size={24}
              color={savedRecipes.has(recipe.id) ? '#FF6B35' : '#8E8E93'}
              fill={savedRecipes.has(recipe.id) ? '#FF6B35' : 'transparent'}
            />
          </TouchableOpacity>

          {/* XP Chip - top left */}
          <View style={styles.xpChip}>
            <Trophy size={12} color="#2D1B69" />
            <Text style={styles.xpChipText}>+{calculateRecipeXP(recipe)} XP</Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.cardContentContainer} showsVerticalScrollIndicator={false}>
          {/* Title (2-line max) */}
          <Text style={styles.frontCardTitle} numberOfLines={2}>
            {recipe.title}
          </Text>

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
        onPress={() => handleTapBackCard(index)}>
        <Image source={{ uri: recipe.image }} style={styles.backCardImage} />
        <View style={styles.backCardTextContainer}>
          <Text style={styles.backCardTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={styles.backCardTeaser}>
            {recipe.cookingTime} • {recipe.servings} servings
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCard = (recipe: Recipe, index: number, cardType: 'front' | 'middle' | 'back') => {
    const isFront = cardType === 'front';
    
    // Calculate heights and positions according to blueprint (76%, 88%, 100%)
    let cardHeight, zIndex, animatedStyle;
    
    switch (cardType) {
      case 'front':
        cardHeight = '100%';
        zIndex = 1000;
        animatedStyle = frontCardAnimatedStyle;
        break;
      case 'middle':
        cardHeight = '88%';
        zIndex = 900;
        animatedStyle = middleCardAnimatedStyle;
        break;
      case 'back':
        cardHeight = '76%';
        zIndex = 800;
        animatedStyle = backCardAnimatedStyle;
        break;
    }

    return (
      <Animated.View
        key={`${recipe.id}-${cardType}`}
        style={[
          styles.card,
          { height: cardHeight, zIndex },
          animatedStyle,
        ]}>
        {isFront ? renderFrontCard(recipe) : renderBackCard(recipe, index)}
      </Animated.View>
    );
  };

  const getVisibleRecipes = () => {
    return recipes.slice(frontCardIndex, frontCardIndex + 3);
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar}>
          <View style={styles.xpCapsule}>
            <Trophy size={16} color="#2D1B69" />
            <Text style={styles.xpText}>+75 XP</Text>
          </View>
        </View>
        
        <View style={styles.header}>
          <Text style={styles.title}>Generating Recipes</Text>
          <Text style={styles.subtitle}>AI Chef is cooking up something special...</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Creating personalized recipes</Text>
          <Text style={styles.loadingSubtext}>Using your {ingredients.length} ingredients</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar}>
          <View style={styles.xpCapsule}>
            <Trophy size={16} color="#2D1B69" />
            <Text style={styles.xpText}>+0 XP</Text>
          </View>
        </View>
        
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
      {/* Zone A: Status Bar (48px high) */}
      <View style={styles.statusBar}>
        <View style={styles.xpCapsule}>
          <Trophy size={16} color="#2D1B69" />
          <Text style={styles.xpText}>+75 XP</Text>
        </View>
      </View>

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
            {/* Render cards in reverse order for proper stacking (back to front) */}
            {getVisibleRecipes().length > 2 && (
              renderCard(getVisibleRecipes()[2], frontCardIndex + 2, 'back')
            )}
            
            {getVisibleRecipes().length > 1 && (
              renderCard(getVisibleRecipes()[1], frontCardIndex + 1, 'middle')
            )}
            
            {/* Front Card with Gesture Handler */}
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              {renderCard(getVisibleRecipes()[0], frontCardIndex, 'front')}
            </PanGestureHandler>
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
                  <Image source={{ uri: previewRecipe.image }} style={styles.previewImage} />
                  
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
  
  // Zone A: Status Bar
  statusBar: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  xpCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800', // Spice Orange variant
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  xpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1B69', // Eggplant Midnight
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69', // Eggplant Midnight
  },
  subtitle: {
    fontSize: 16,
    color: '#2D1B69',
    marginTop: 4,
    fontWeight: '500',
  },

  // Zone B: Stack Viewport
  stackViewport: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
  },

  // Card Styles - rounded corners 16px, subtle shadow
  card: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },

  // Front Card Content
  frontCardContent: {
    flex: 1,
  },
  heroImageContainer: {
    height: '40%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque for better shadow performance
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  xpChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2D1B69',
  },

  cardContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  frontCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
    lineHeight: 24,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
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
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#2D1B69', // Eggplant Midnight
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Action Row - Fixed at bottom
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  passButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  passButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  cookButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35', // Spice Orange
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Back Card Header (Peeking Cards) - shows only title + 1-line teaser
  backCardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backCardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  backCardTextContainer: {
    flex: 1,
  },
  backCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 4,
  },
  backCardTeaser: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Swipe Hint
  swipeHint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(45, 27, 105, 0.5)', // Ghosted Eggplant
    fontWeight: '500',
  },

  // Saved Toast
  savedToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50', // Fresh Basil background
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
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
  previewImage: {
    width: '100%',
    height: 200,
  },
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
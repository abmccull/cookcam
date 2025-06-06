import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
// import Swiper from 'react-native-deck-swiper'; // Temporarily disabled due to PropTypes issue
import {Clock, Users, X, Heart, Info, TrendingUp, Star, Sparkles, Trophy, Home, Check, AlertCircle} from 'lucide-react-native';
import {useGamification, XP_VALUES} from '../context/GamificationContext';
import ChefBadge from '../components/ChefBadge';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {recipeService, authService} from '../services/api';
import {useAuth} from '../context/AuthContext';
import CardStack from '../components/CardStack';
import { Recipe } from '../utils/recipeTypes';

// Temporary simple swiper replacement
const SimpleSwiper = ({ children, onSwipedRight, onSwipedLeft }: any) => {
  return (
    <View style={styles.swiperContainer}>
      {children}
    </View>
  );
};

interface RecipeCardsScreenProps {
  navigation: any;
  route: any;
}

// Component for displaying ingredient with source highlighting
const IngredientTag: React.FC<{
  ingredient: any;
  style?: any;
}> = ({ingredient, style}) => {
  const getIngredientStyle = (source: string) => {
    switch (source) {
      case 'scanned':
        return {
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50',
          iconColor: '#4CAF50',
          icon: Check,
        };
      case 'pantry':
        return {
          backgroundColor: '#FFF3E0',
          borderColor: '#FF9800',
          iconColor: '#FF9800',
          icon: Home,
        };
      case 'optional':
        return {
          backgroundColor: '#F3E5F5',
          borderColor: '#9C27B0',
          iconColor: '#9C27B0',
          icon: AlertCircle,
        };
      default:
        return {
          backgroundColor: '#F5F5F5',
          borderColor: '#E0E0E0',
          iconColor: '#757575',
          icon: Check,
        };
    }
  };

  const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name;
  const ingredientSource = typeof ingredient === 'string' ? 'scanned' : (ingredient.source || 'scanned');
  const ingredientAmount = typeof ingredient === 'string' ? '' : `${ingredient.amount} ${ingredient.unit}`;
  
  const styleConfig = getIngredientStyle(ingredientSource);
  const IconComponent = styleConfig.icon;

  return (
    <View style={[styles.ingredientTag, {
      backgroundColor: styleConfig.backgroundColor,
      borderColor: styleConfig.borderColor,
    }, style]}>
      <IconComponent size={14} color={styleConfig.iconColor} />
      <Text style={[styles.ingredientTagText, {color: styleConfig.iconColor}]}>
        {ingredientAmount} {ingredientName}
      </Text>
    </View>
  );
};

// Component for showing recipe analysis
const RecipeAnalysis: React.FC<{
  recipe: any;
  ingredientAnalysis?: any;
}> = ({recipe, ingredientAnalysis}) => {
  if (!recipe.ingredientsUsed && !recipe.ingredientsSkipped) return null;

  return (
    <View style={styles.analysisContainer}>
      <Text style={styles.analysisTitle}>Recipe Analysis</Text>
      
      {recipe.ingredientsUsed && recipe.ingredientsUsed.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>✅ Ingredients Used</Text>
          <View style={styles.analysisTagsContainer}>
            {recipe.ingredientsUsed.map((ingredient: string, index: number) => (
              <View key={index} style={[styles.analysisTag, styles.usedTag]}>
                <Text style={styles.usedTagText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {recipe.ingredientsSkipped && recipe.ingredientsSkipped.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>⏭️ Ingredients Skipped</Text>
          <View style={styles.analysisTagsContainer}>
            {recipe.ingredientsSkipped.map((ingredient: string, index: number) => (
              <View key={index} style={[styles.analysisTag, styles.skippedTag]}>
                <Text style={styles.skippedTagText}>{ingredient}</Text>
              </View>
            ))}
          </View>
          {recipe.skipReason && (
            <Text style={styles.skipReason}>💡 {recipe.skipReason}</Text>
          )}
        </View>
      )}

      {recipe.cookingMethod && (
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>🍳 Cooking Method</Text>
          <View style={[styles.analysisTag, styles.methodTag]}>
            <Text style={styles.methodTagText}>{recipe.cookingMethod}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const RecipeCardsScreen: React.FC<RecipeCardsScreenProps> = ({
  navigation,
  route,
}) => {
  const {ingredients, imageUri, preferences} = route.params || {};
  const {xp} = useGamification();
  const {user} = useAuth();
  const swiperRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Animation values
  const xpAnimScale = useRef(new Animated.Value(1)).current;
  const trendingPulse = useRef(new Animated.Value(1)).current;
  const aiPulseAnim = useRef(new Animated.Value(1)).current;
  const aiOpacityAnim = useRef(new Animated.Value(0.7)).current;

  // Enhanced dummy data with creator info and ratings (fallback)
  const fallbackRecipes: Recipe[] = [
    {
      id: '1',
      title: 'Mediterranean Vegetable Pasta',
      image: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Pasta',
      cookingTime: '25 min',
      servings: 4,
      difficulty: 'Easy',
      macros: {
        calories: 485,
        protein: 18,
        carbs: 72,
        fat: 15,
      },
      tags: ['Vegetarian', 'Mediterranean'],
      description: 'A vibrant pasta dish with fresh Mediterranean vegetables and herbs.',
      ingredients: ['Pasta', 'Tomatoes', 'Onions', 'Garlic', 'Bell Peppers', 'Olive Oil'],
      creatorName: 'Chef Emma',
      creatorTier: 3,
      rating: 4.8,
      ratingCount: 234,
      viewCount: 15420,
      isTrending: true,
      isCreatorRecipe: true,
    },
    {
      id: '2',
      title: 'Garlic Herb Roasted Vegetables',
      image: 'https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Veggies',
      cookingTime: '35 min',
      servings: 6,
      difficulty: 'Easy',
      macros: {
        calories: 165,
        protein: 5,
        carbs: 28,
        fat: 8,
      },
      tags: ['Vegan', 'Gluten-Free'],
      description: 'Perfectly roasted vegetables with aromatic herbs and golden garlic.',
      ingredients: ['Bell Peppers', 'Onions', 'Garlic', 'Olive Oil', 'Mixed Herbs'],
      creatorName: 'Home Cook Lisa',
      creatorTier: 1,
      rating: 4.5,
      ratingCount: 89,
      viewCount: 8900,
      isTrending: false,
      isCreatorRecipe: true,
    },
    {
      id: '3',
      title: 'Italian Tomato Basil Soup',
      image: 'https://via.placeholder.com/400x300/2D1B69/FFFFFF?text=Soup',
      cookingTime: '20 min',
      servings: 4,
      difficulty: 'Easy',
      macros: {
        calories: 125,
        protein: 4,
        carbs: 22,
        fat: 3,
      },
      tags: ['Vegetarian', 'Italian'],
      description: 'A comforting classic Italian soup with fresh tomatoes and basil.',
      ingredients: ['Tomatoes', 'Onions', 'Garlic', 'Basil', 'Olive Oil'],
      rating: 4.2,
      ratingCount: 45,
      viewCount: 5200,
      isTrending: false,
      isCreatorRecipe: false,
    },
  ];

  // Generate recipes from AI based on ingredients and preferences
  useEffect(() => {
    generateRecipes();
  }, [ingredients, preferences]);

  const generateRecipes = async () => {
    try {
      setIsLoading(true);
      console.log('🤖 Generating AI recipes with ingredients:', ingredients);
      console.log('🎯 User preferences:', preferences);

      if (!ingredients || ingredients.length === 0) {
        console.log('⚠️ No ingredients provided, using fallback recipes');
        setRecipes(fallbackRecipes);
        setIsLoading(false);
        return;
      }

      // Send full ingredient data including quantities, units, and varieties
      const detectedIngredients = ingredients.map((ing: any) => {
        if (typeof ing === 'string') {
          return { name: ing, quantity: '1', unit: 'unit' };
        }
        return {
          name: ing.name,
          quantity: ing.quantity || '1',
          unit: ing.unit || 'unit',
          variety: ing.variety,
          category: ing.category,
          confidence: ing.confidence
        };
      });

      // Debug: Check if user is authenticated and what token we have
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('@cookcam_token');
      console.log('🔐 Debug - Token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...',
        isAuthenticated: user ? true : false,
        userId: user?.id
      });

      // Get enhanced preferences from route params
      const enhancedPreferences = route.params?.preferences || {};
      
      console.log('📤 Sending enhanced data to AI:', {
        detectedIngredients,
        servingSize: enhancedPreferences.servingSize || 2,
        mealPrepEnabled: enhancedPreferences.mealPrepEnabled || false,
        mealPrepPortions: enhancedPreferences.mealPrepPortions,
        selectedAppliances: enhancedPreferences.selectedAppliances || ['oven', 'stove'],
        dietaryTags: enhancedPreferences.dietary || preferences?.dietary || [],
        cuisinePreferences: enhancedPreferences.cuisine || preferences?.cuisine || [],
        timeAvailable: enhancedPreferences.cookingTime || preferences?.cookingTime || 'any',
        skillLevel: enhancedPreferences.difficulty || preferences?.difficulty || 'any'
      });

      // Call the recipe generation API with enhanced data
      const response = await recipeService.generateSuggestions({
        detectedIngredients,
        servingSize: enhancedPreferences.servingSize || 2,
        mealPrepEnabled: enhancedPreferences.mealPrepEnabled || false,
        mealPrepPortions: enhancedPreferences.mealPrepPortions,
        selectedAppliances: enhancedPreferences.selectedAppliances || ['oven', 'stove'],
        dietaryTags: enhancedPreferences.dietary || preferences?.dietary || [],
        cuisinePreferences: enhancedPreferences.cuisine || preferences?.cuisine || [],
        timeAvailable: enhancedPreferences.cookingTime || preferences?.cookingTime || 'any',
        skillLevel: enhancedPreferences.difficulty || preferences?.difficulty || 'any'
      });

      console.log('📥 API Response:', response);

      if (response.success && response.data) {
        // Store session ID for full recipe generation later
        if (response.data.sessionId) {
          setSessionId(response.data.sessionId);
        }

        // Handle multiple recipes response (3 diverse recipes)
        const recipesData = response.data.recipes || response.data.data?.recipes;
        const ingredientAnalysis = response.data.ingredientAnalysis || response.data.data?.ingredientAnalysis;
        
        if (recipesData && Array.isArray(recipesData) && recipesData.length > 0) {
          console.log('✅ Received multiple recipes:', recipesData.length);
          console.log('📊 Ingredient Analysis:', ingredientAnalysis);
          
          // Convert each recipe to our Recipe format
          const aiRecipes: Recipe[] = recipesData.map((recipeData: any, index: number) => {
            // Debug: Log the nutrition data we're receiving
            console.log(`📊 Recipe ${index + 1} nutrition data:`, JSON.stringify(recipeData.nutrition, null, 2));
            
            // Map ingredient sources for highlighting
            const processedIngredients = recipeData.ingredients?.map((ing: any) => {
              if (typeof ing === 'string') {
                return {
                  name: ing,
                  amount: '1',
                  unit: 'serving',
                  source: 'scanned'
                };
              }
              return {
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                notes: ing.notes,
                source: ing.source || 'scanned' // 'scanned', 'pantry', or 'optional'
              };
            }) || [];

            return {
              id: `ai-diverse-${index}`,
              title: recipeData.title || `AI Generated Recipe ${index + 1}`,
              image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(recipeData.title || 'Recipe')}`,
              cookingTime: `${recipeData.metadata?.totalTime || 30} min`,
              servings: recipeData.metadata?.servings || 4,
              difficulty: recipeData.metadata?.difficulty || 'Medium',
              macros: {
                calories: Math.round(recipeData.nutrition?.calories || 350),
                protein: Math.round(recipeData.nutrition?.protein || 15),
                carbs: Math.round(recipeData.nutrition?.carbohydrates || 45),
                fat: Math.round(recipeData.nutrition?.fat || 12),
              },
              tags: [
                ...(preferences?.dietary || []),
                ...(preferences?.cuisine || []),
                'AI Generated',
                recipeData.metadata?.cuisineType || 'International',
                recipeData.metadata?.cookingMethod || 'Mixed'
              ].filter(Boolean),
              description: recipeData.description || `A delicious ${recipeData.metadata?.cuisineType || ''} dish using your detected ingredients.`,
              ingredients: processedIngredients,
              instructions: recipeData.instructions || [],
              tips: recipeData.tips || [],
              creatorName: 'AI Chef',
              creatorTier: 5,
              // Add diversity metadata for UI hints
              // @ts-ignore - Adding custom properties for recipe diversity info
              ingredientsUsed: recipeData.ingredientsUsed || [],
              ingredientsSkipped: recipeData.ingredientsSkipped || [],
              skipReason: recipeData.skipReason,
              cookingMethod: recipeData.metadata?.cookingMethod,
              // No rating/reviews for fresh AI recipes
              rating: undefined,
              ratingCount: undefined,
              viewCount: undefined,
              isTrending: false,
              isCreatorRecipe: false,
            };
          });

          console.log('✅ Successfully converted multiple AI recipes:', aiRecipes.map(r => r.title));
          setRecipes(aiRecipes);
        } else {
          console.log('⚠️ Invalid multiple recipes API response format, using fallback');
          console.log('Response data structure:', JSON.stringify(response.data, null, 2));
          setRecipes(fallbackRecipes);
        }
      } else {
        console.log('❌ API call failed:', response.error);
        
        // Handle authentication errors specifically
        if (response.error?.includes('Token expired') || response.error?.includes('invalid')) {
          console.log('🔐 Authentication issue detected - checking session...');
          // Try to refresh the user profile to see if session is still valid
          try {
                         const profileResponse = await authService.getProfile();
            if (profileResponse?.success) {
              console.log('✅ Session is valid, retrying recipe generation...');
              // Retry the API call once with enhanced data
              const retryResponse = await recipeService.generateSuggestions({
                detectedIngredients,
                servingSize: enhancedPreferences.servingSize || 2,
                mealPrepEnabled: enhancedPreferences.mealPrepEnabled || false,
                mealPrepPortions: enhancedPreferences.mealPrepPortions,
                selectedAppliances: enhancedPreferences.selectedAppliances || ['oven', 'stove'],
                dietaryTags: enhancedPreferences.dietary || preferences?.dietary || [],
                cuisinePreferences: enhancedPreferences.cuisine || preferences?.cuisine || [],
                timeAvailable: enhancedPreferences.cookingTime || preferences?.cookingTime || 'any',
                skillLevel: enhancedPreferences.difficulty || preferences?.difficulty || 'any'
              });
              
              const retryRecipeData = retryResponse.data?.data || retryResponse.data;
              if (retryResponse.success && retryRecipeData?.title) {
                console.log('✅ Retry successful!');
                                 const aiRecipe: Recipe = {
                   id: 'ai-enhanced-retry',
                   title: retryRecipeData.title || 'AI Generated Recipe',
                   image: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(retryRecipeData.title || 'Recipe')}`,
                   cookingTime: `${retryRecipeData.metadata?.totalTime || 30} min`,
                   servings: retryRecipeData.metadata?.servings || 4,
                   difficulty: retryRecipeData.metadata?.difficulty || 'Medium',
                   macros: {
                     calories: Math.round(retryRecipeData.nutrition?.calories || 350),
                     protein: Math.round(retryRecipeData.nutrition?.protein || 15),
                     carbs: Math.round(retryRecipeData.nutrition?.carbohydrates || 45),
                     fat: Math.round(retryRecipeData.nutrition?.fat || 12),
                   },
                   tags: [
                     ...(preferences?.dietary || []),
                     ...(preferences?.cuisine || []),
                     'AI Generated',
                     retryRecipeData.metadata?.cuisineType || 'International'
                   ],
                   description: retryRecipeData.description || 'A delicious AI-generated recipe using your detected ingredients.',
                   ingredients: retryRecipeData.ingredients || detectedIngredients,
                   instructions: retryRecipeData.instructions || [],
                   tips: retryRecipeData.tips || [],
                   creatorName: 'AI Chef',
                   creatorTier: 5,
                   // No rating/reviews for fresh AI recipes
                   rating: undefined,
                   ratingCount: undefined,
                   viewCount: undefined,
                   isTrending: false, // Fresh recipes aren't trending yet
                   isCreatorRecipe: false,
                 };
                setRecipes([aiRecipe]);
                return; // Success, exit early
              }
            }
          } catch (sessionError) {
            console.log('❌ Session validation failed:', sessionError);
          }
        }
        
        console.log('🔄 Using fallback recipes due to API error');
        setRecipes(fallbackRecipes);
      }

    } catch (error) {
      console.error('❌ Recipe generation error:', error);
      console.log('🔄 Using fallback recipes due to error');
      setRecipes(fallbackRecipes);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start animations
  useEffect(() => {
    // Pulse animation for XP badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(xpAnimScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(xpAnimScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    
    // Trending pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(trendingPulse, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(trendingPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // AI Analysis animation effect
  useEffect(() => {
    if (isLoading) {
      // Start pulsing animation when loading
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(aiPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(aiPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const opacity = Animated.loop(
        Animated.sequence([
          Animated.timing(aiOpacityAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(aiOpacityAnim, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      opacity.start();

      return () => {
        pulse.stop();
        opacity.stop();
      };
    }
  }, [isLoading]);
  
  // Calculate potential XP for a recipe
  const calculateRecipeXP = (recipe: Recipe) => {
    let totalXP = XP_VALUES.COMPLETE_RECIPE;
    
    // Bonus for difficulty
    if (recipe.difficulty === 'Medium') totalXP += 10;
    if (recipe.difficulty === 'Hard') totalXP += 20;
    
    // Bonus for trying creator recipes
    if (recipe.isCreatorRecipe) totalXP += 15;
    
    return totalXP;
  };

  const handleSwipeLeft = (cardIndex: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    console.log('Rejected:', recipes[cardIndex].title);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeRight = (cardIndex: number) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    const recipe = recipes[cardIndex];
    console.log('Accepted:', recipe.title);
    // Navigate directly to CookMode
    navigation.navigate('CookMode', {recipe});
  };

  const handleCardPress = (recipe: Recipe) => {
    ReactNativeHapticFeedback.trigger('selection');
    setSelectedRecipe(recipe);
    setShowDetails(true);
  };

  const handleCookRecipe = async (recipe: Recipe) => {
    try {
      console.log('🧑‍🍳 Starting to cook recipe:', recipe.title);
      navigation.navigate('CookMode', {
        recipe: recipe,
        sessionId: sessionId,
      });
    } catch (error) {
      console.error('Error starting cook mode:', error);
    }
  };

  const handleFavoriteRecipe = async (recipe: Recipe) => {
    try {
      console.log('❤️ Favoriting recipe:', recipe.title);
      // TODO: Implement favorite functionality  
    } catch (error) {
      console.error('Error favoriting recipe:', error);
    }
  };

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowDetails(true);
  };

  const handleRefreshRecipes = () => {
    generateRecipes();
  };

  const handleSelectRecipe = () => {
    if (selectedRecipe) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      setShowDetails(false);
      navigation.navigate('CookMode', {recipe: selectedRecipe});
    }
  };

  const renderCard = (recipe: Recipe) => {
    if (!recipe) return null;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardTouchable}
          onPress={() => handleCardPress(recipe)}>
          <View style={styles.imageContainer}>
            <Image source={{uri: recipe.image}} style={styles.cardImage} />
            
            {/* Trending Badge */}
            {recipe.isTrending && (
              <Animated.View style={[styles.trendingBadge, {transform: [{scale: trendingPulse}]}]}>
                <TrendingUp size={14} color="#FFFFFF" />
                <Text style={styles.trendingText}>TRENDING</Text>
              </Animated.View>
            )}
            
            {/* XP Badge */}
            <Animated.View style={[styles.xpBadge, {transform: [{scale: xpAnimScale}]}]}>
              <Sparkles size={16} color="#2D1B69" />
              <Text style={styles.xpBadgeText}>+{calculateRecipeXP(recipe)} XP</Text>
            </Animated.View>
          </View>
          
          <ScrollView 
            style={styles.cardContentScroll}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}>
            {/* Creator Info */}
            {recipe.isCreatorRecipe && recipe.creatorName && (
              <View style={styles.creatorRow}>
                {recipe.creatorTier && <ChefBadge tier={recipe.creatorTier} size="small" />}
                <Text style={styles.creatorName}>{recipe.creatorName}</Text>
                {recipe.viewCount && recipe.viewCount > 10000 && (
                  <View style={styles.popularBadge}>
                    <Trophy size={12} color="#FFB800" />
                    <Text style={styles.popularText}>Popular</Text>
                  </View>
                )}
              </View>
            )}
            
            <Text style={styles.cardTitle}>{recipe.title}</Text>
            
            {/* Rating - Only show for established recipes with ratings */}
            {recipe.rating && recipe.ratingCount && (
              <View style={styles.ratingRow}>
                <Star size={16} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingText}>{recipe.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({recipe.ratingCount} reviews)</Text>
                {recipe.viewCount && (
                  <Text style={styles.viewCount}>{(recipe.viewCount / 1000).toFixed(1)}k views</Text>
                )}
              </View>
            )}
            
            <View style={styles.cardInfo}>
              <View style={styles.infoItem}>
                <Clock size={16} color="#8E8E93" />
                <Text style={styles.infoText}>{recipe.cookingTime}</Text>
              </View>
              <View style={styles.infoItem}>
                <Users size={16} color="#8E8E93" />
                <Text style={styles.infoText}>{recipe.servings} servings</Text>
              </View>
              <View style={[styles.difficultyBadge, 
                recipe.difficulty === 'Easy' && styles.easyBadge,
                recipe.difficulty === 'Medium' && styles.mediumBadge,
                recipe.difficulty === 'Hard' && styles.hardBadge
              ]}>
                <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{recipe.macros.calories}</Text>
                <Text style={styles.macroLabel}>cal</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{recipe.macros.protein}g</Text>
                <Text style={styles.macroLabel}>protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{recipe.macros.carbs}g</Text>
                <Text style={styles.macroLabel}>carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{recipe.macros.fat}g</Text>
                <Text style={styles.macroLabel}>fat</Text>
              </View>
            </View>

            <View style={styles.tagsRow}>
              {recipe.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.infoButton}>
            <Info size={20} color="#2D1B69" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3 Diverse Recipes</Text>
        <Text style={styles.subtitle}>
          Same ingredients, different dishes
        </Text>
      </View>

      <View style={styles.swiperContainer}>
        {isLoading ? (
          <View style={styles.aiLoadingContainer}>
            <Text style={styles.noRecipes}>Loading AI recipes...</Text>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : recipes.length > 0 ? (
          <CardStack
            recipes={recipes}
            onCookRecipe={handleCookRecipe}
            onFavoriteRecipe={handleFavoriteRecipe}
            onViewRecipeDetails={handleViewRecipeDetails}
            onRefreshRecipes={handleRefreshRecipes}
            isLoading={isLoading}
          />
        ) : (
          <Text style={styles.noRecipes}>No recipes available</Text>
        )}
      </View>

      {/* AI Recipe Generation Loading Modal */}
      <Modal
        visible={isLoading}
        animationType="fade"
        transparent={true}>
        <View style={styles.aiModalOverlay}>
          <Animated.View style={[
            styles.aiModal,
            {
              transform: [{scale: aiPulseAnim}],
              opacity: aiOpacityAnim,
            }
          ]}>
            <View style={styles.aiModalContent}>
              <Animated.View style={[
                styles.sparklesIcon,
                { transform: [{ scale: aiPulseAnim }] }
              ]}>
                <Sparkles size={40} color="#FFB800" />
              </Animated.View>
              <Text style={styles.aiModalTitle}>🤖 AI Chef Analyzing...</Text>
              <Text style={styles.aiModalSubtitle}>Generating 3 diverse recipes</Text>
              <View style={styles.processingSteps}>
                <Text style={styles.stepText}>• Analyzing ingredient compatibility</Text>
                <Text style={styles.stepText}>• Applying your preferences</Text>
                <Text style={styles.stepText}>• Creating 3 unique dishes</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Recipe Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}>
              <X size={24} color="#2D1B69" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRecipe && (
                <>
                  <Image source={{uri: selectedRecipe.image}} style={styles.modalImage} />
                  <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
                  <Text style={styles.modalDescription}>{selectedRecipe.description}</Text>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    <View style={styles.ingredientsGrid}>
                      {selectedRecipe.ingredients?.map((ing, index) => (
                        <IngredientTag key={index} ingredient={ing} />
                      ))}
                    </View>
                    
                    {/* Legend for ingredient sources */}
                    <View style={styles.ingredientLegend}>
                      <View style={styles.legendItem}>
                        <Check size={12} color="#4CAF50" />
                        <Text style={styles.legendText}>Scanned</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <Home size={12} color="#FF9800" />
                        <Text style={styles.legendText}>Pantry</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <AlertCircle size={12} color="#9C27B0" />
                        <Text style={styles.legendText}>Optional</Text>
                      </View>
                    </View>
                  </View>

                  {/* Recipe Analysis */}
                  <RecipeAnalysis recipe={selectedRecipe} />

                  <View style={styles.modalInfo}>
                    <View style={styles.infoItem}>
                      <Clock size={20} color="#8E8E93" />
                      <Text style={styles.infoText}>{selectedRecipe.cookingTime}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Users size={20} color="#8E8E93" />
                      <Text style={styles.infoText}>{selectedRecipe.servings} servings</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cookButton}
                    onPress={handleSelectRecipe}>
                    <Text style={styles.cookButtonText}>Start Cooking</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  swiperContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  subtitle: {
    fontSize: 16,
    color: '#2D1B69',
    marginTop: 4,
    fontWeight: '500',
  },

  card: {
    height: '95%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTouchable: {
    flex: 1,
  },
  cardImage: {
    width: '100%',
    height: '40%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardContentScroll: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  easyBadge: {
    backgroundColor: '#4CAF50',
  },
  mediumBadge: {
    backgroundColor: '#FF9800',
  },
  hardBadge: {
    backgroundColor: '#F44336',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  macroLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2D1B69',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#F8F8FF',
    fontWeight: '500',
  },
  infoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipLabel: {
    backgroundColor: '#E5E5E7',
    color: '#8E8E93',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 10,
    borderRadius: 10,
  },
  skipWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: 30,
    marginLeft: -30,
  },
  cookLabel: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 10,
    borderRadius: 10,
  },
  cookWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginTop: 30,
    marginLeft: 30,
  },
  noRecipes: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 100,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 12,
  },
  ingredientItem: {
    fontSize: 16,
    color: '#2D1B69',
    marginBottom: 4,
  },
  modalInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  cookButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  cookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '40%',
  },
  trendingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 3,
  },
  xpBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFB800',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginLeft: 3,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1B69',
    marginLeft: 6,
  },
  popularBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFB800',
    marginLeft: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFB800',
    marginLeft: 3,
  },
  ratingCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 3,
  },
  viewCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 'auto',
  },
  // AI Loading styles
  aiLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(139, 69, 19, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    margin: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  aiModalContent: {
    alignItems: 'center',
  },
  sparklesIcon: {
    backgroundColor: '#FFB800',
    borderRadius: 30,
    padding: 15,
    marginBottom: 20,
  },
  aiModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiModalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  processingSteps: {
    alignItems: 'flex-start',
  },
  stepText: {
    fontSize: 14,
    color: '#2D1B69',
    marginBottom: 5,
    fontWeight: '500',
  },
  analysisContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
  },
  analysisSection: {
    marginBottom: 20,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
  },
  analysisTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  analysisTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  usedTag: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  usedTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  skippedTag: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  skippedTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  skipReason: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  methodTag: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  methodTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
    gap: 4,
  },
  ingredientTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientLegend: {
    flexDirection: 'row',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
});

export default RecipeCardsScreen;

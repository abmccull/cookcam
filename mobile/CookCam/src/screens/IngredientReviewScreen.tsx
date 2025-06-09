import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import {Check, X, Plus, Star, Camera, ChefHat, TrendingUp, Trophy} from 'lucide-react-native';
import {scale, verticalScale, moderateScale, responsive} from '../utils/responsive';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGamification, XP_VALUES} from '../context/GamificationContext';
import {useAuth} from '../context/AuthContext';
import {ingredientService, scanService} from '../services/api';
import MysteryBox from '../components/MysteryBox';
import AIChefIcon from '../components/AIChefIcon';

interface Ingredient {
  id: string;
  name: string;
  confidence: number;
  emoji: string;
  quantity?: string;
  unit?: string;
  variety?: string;
  category?: string;
}

interface IngredientReviewScreenProps {
  navigation: any;
  route: {
    params: {
      imageUri: string;
      isSimulator: boolean;
    };
  };
}

const IngredientReviewScreen: React.FC<IngredientReviewScreenProps> = ({
  navigation,
  route,
}) => {
  const {imageUri, isSimulator} = route.params;
  const {addXP, unlockBadge} = useGamification();
  const {user} = useAuth();
  const [showMysteryBox, setShowMysteryBox] = useState(() => {
    // 25% chance (1/4) of mystery box appearing
    return Math.random() < 0.25;
  });
  const [mysteryReward, setMysteryReward] = useState<any>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Enhanced ingredients with real data potential
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (isSimulator) {
      // For simulator, return mock data that could represent real API detection
      return [
        {id: '1', name: 'Tomatoes', confidence: 0.95, emoji: '🍅'},
        {id: '2', name: 'Mozzarella', confidence: 0.88, emoji: '🧀'},
        {id: '3', name: 'Basil', confidence: 0.82, emoji: '🌿'},
        {id: '4', name: 'Olive Oil', confidence: 0.79, emoji: '🫒'},
        {id: '5', name: 'Garlic', confidence: 0.73, emoji: '🧄'},
      ];
    } else {
      // For real device, start with empty and let API populate
      return [];
    }
  });
  
  // Animation values
  const addAnimScale = useRef(new Animated.Value(1)).current;
  const aiPulseAnim = useRef(new Animated.Value(1)).current;
  const aiOpacityAnim = useRef(new Animated.Value(0.7)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  // AI Analysis animation effect
  useEffect(() => {
    if (loading) {
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
  }, [loading]);

  // Track if image analysis has been completed for this imageUri
  const [hasAnalyzedImage, setHasAnalyzedImage] = useState(false);
  const [lastAnalyzedImageUri, setLastAnalyzedImageUri] = useState<string | null>(null);

  // Reset analysis flag when imageUri changes
  useEffect(() => {
    if (imageUri !== lastAnalyzedImageUri) {
      setHasAnalyzedImage(false);
      setLastAnalyzedImageUri(imageUri);
    }
  }, [imageUri, lastAnalyzedImageUri]);

  // Load real ingredients from image analysis (for both simulator and real device)
  useEffect(() => {
    if (imageUri && !hasAnalyzedImage) {
      // Ensure authentication before analysis
      if (!user) {
        console.log('🔐 Not authenticated, redirecting to login...');
        // Redirect to login screen instead of using demo
        navigation.navigate('Auth', { screen: 'SignIn' });
        return;
      } else {
        setHasAnalyzedImage(true); // Prevent re-analysis of same image
        analyzeImageIngredients();
      }
    }
  }, [imageUri, user, hasAnalyzedImage]); // Removed navigation from dependencies

  const analyzeImageIngredients = async () => {
    try {
      setLoading(true);
      console.log('🔍 Analyzing image for ingredients...');
      console.log('📍 Current imageUri:', imageUri);
      console.log('📍 Is simulator:', isSimulator);
      
      if (!imageUri) {
        console.log('⚠️ No valid image URI, using fallback ingredients');
        
        // Fallback to searching some common ingredients in USDA database
        const simulatedDetectedNames = ['tomato', 'onion', 'garlic', 'cheese'];
        const foundIngredients: Ingredient[] = [];
        
        for (let i = 0; i < simulatedDetectedNames.length; i++) {
          const name = simulatedDetectedNames[i];
          try {
            const response = await ingredientService.searchIngredients(name, 1);
            
            if (response.success && response.data && response.data.length > 0) {
              const ingredient = response.data[0];
              foundIngredients.push({
                id: ingredient.id || `detected-${i}`,
                name: ingredient.name || name,
                confidence: 0.9 - (i * 0.1),
                emoji: getEmojiForIngredient(ingredient.name || name),
              });
            }
          } catch (error) {
            console.log(`Failed to find ingredient ${name}:`, error);
          }
        }
        
        setIngredients(foundIngredients);
        return;
      }

      // Convert image to base64 for API
      let base64Image: string;
      try {
        console.log('📸 Converting image to base64...');
        console.log('📸 Image URI type:', typeof imageUri);
        console.log('📸 Image URI starts with:', imageUri.substring(0, 50));
        
        // For file:// URIs, we need to read the file
        if (imageUri.startsWith('file://')) {
          console.log('📸 Processing file:// URI...');
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          // Convert blob to base64
          const reader = new FileReader();
          base64Image = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              console.log('📸 Base64 conversion successful, length:', result.length);
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else if (imageUri.startsWith('http')) {
          console.log('📸 Processing http URI...');
          // For URL images, fetch and convert
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          const reader = new FileReader();
          base64Image = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              console.log('📸 Base64 conversion successful, length:', result.length);
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          throw new Error('Unsupported image URI format');
        }

        console.log('✅ Image converted to base64, sending to backend...');
        console.log('📤 Calling scanService.analyzeScan...');

        // Send image to backend for analysis
        const response = await scanService.analyzeScan(base64Image, []);
        
        console.log('📥 Backend response received:', response);
        
        if (response.success && response.data && response.data.ingredients) {
          console.log('🎯 Backend analysis successful:', response.data.ingredients);
          
          // Convert backend response to our ingredient format and search USDA
          const foundIngredients: Ingredient[] = [];
          
          for (let i = 0; i < response.data.ingredients.length; i++) {
            const detectedIng = response.data.ingredients[i];
            console.log(`🔍 Processing detected ingredient ${i + 1}:`, detectedIng);
            
            try {
              // Search for this ingredient in our USDA database
              const searchResponse = await ingredientService.searchIngredients(detectedIng.name, 1);
              
              if (searchResponse.success && searchResponse.data && searchResponse.data.length > 0) {
                const ingredient = searchResponse.data[0];
                foundIngredients.push({
                  id: ingredient.id || `detected-${i}`,
                  name: ingredient.name || detectedIng.name,
                  confidence: detectedIng.confidence || 0.8,
                  emoji: getEmojiForIngredient(ingredient.name || detectedIng.name),
                  quantity: detectedIng.quantity || '',
                  unit: detectedIng.unit || '',
                  variety: detectedIng.variety || '',
                  category: detectedIng.category || '',
                });
                console.log(`✅ Found in USDA: ${ingredient.name}`);
              } else {
                // Add as custom ingredient if not found in USDA
                foundIngredients.push({
                  id: `detected-${i}`,
                  name: detectedIng.name,
                  confidence: detectedIng.confidence || 0.8,
                  emoji: getEmojiForIngredient(detectedIng.name),
                  quantity: detectedIng.quantity || '',
                  unit: detectedIng.unit || '',
                  variety: detectedIng.variety || '',
                  category: detectedIng.category || '',
                });
                console.log(`➕ Added as custom: ${detectedIng.name}`);
              }
            } catch (error) {
              console.log(`Failed to search for ingredient ${detectedIng.name}:`, error);
              
              // Add anyway as fallback
              foundIngredients.push({
                id: `detected-${i}`,
                name: detectedIng.name,
                confidence: detectedIng.confidence || 0.8,
                emoji: getEmojiForIngredient(detectedIng.name),
                quantity: detectedIng.quantity || '',
                unit: detectedIng.unit || '',
                variety: detectedIng.variety || '',
                category: detectedIng.category || '',
              });
            }
          }
          
          if (foundIngredients.length > 0) {
            setIngredients(foundIngredients);
            console.log(`✅ Successfully analyzed image: ${foundIngredients.length} ingredients found`);
            
            // Award bonus XP for successful real analysis
            await addXP(10, 'SUCCESSFUL_IMAGE_ANALYSIS');
          } else {
            throw new Error('No ingredients detected in image');
          }
          
        } else {
          console.log('❌ Backend analysis failed:', response.error);
          throw new Error(response.error || 'Backend analysis failed');
        }
        
      } catch (imageError) {
        console.error('❌ Image processing/analysis error:', imageError);
        
        // Fallback to common ingredients if image analysis fails
        console.log('🔄 Falling back to common ingredients...');
        const simulatedDetectedNames = ['tomato', 'onion', 'garlic', 'cheese'];
        const foundIngredients: Ingredient[] = [];
        
        for (let i = 0; i < simulatedDetectedNames.length; i++) {
          const name = simulatedDetectedNames[i];
          try {
            const response = await ingredientService.searchIngredients(name, 1);
            
            if (response.success && response.data && response.data.length > 0) {
              const ingredient = response.data[0];
              foundIngredients.push({
                id: ingredient.id || `detected-${i}`,
                name: ingredient.name || name,
                confidence: 0.9 - (i * 0.1),
                emoji: getEmojiForIngredient(ingredient.name || name),
              });
            }
          } catch (error) {
            console.log(`Failed to find fallback ingredient ${name}:`, error);
          }
        }
        
        if (foundIngredients.length > 0) {
          setIngredients(foundIngredients);
          console.log(`✅ Fallback successful: ${foundIngredients.length} ingredients found`);
        } else {
          // Ultimate fallback
          setIngredients([
            {id: '1', name: 'Detected Ingredient 1', confidence: 0.85, emoji: '🥘'},
            {id: '2', name: 'Detected Ingredient 2', confidence: 0.75, emoji: '🍽️'},
          ]);
        }
      }
      
    } catch (error) {
      console.error('❌ Image analysis error:', error);
      // Fallback to manual mode
      setIngredients([
        {id: 'manual', name: 'Add ingredients manually', confidence: 1.0, emoji: '✋'},
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getEmojiForIngredient = (name: string): string => {
    const emojiMap: {[key: string]: string} = {
      tomato: '🍅', tomatoes: '🍅',
      onion: '🧅', onions: '🧅', 
      garlic: '🧄',
      cheese: '🧀', mozzarella: '🧀', cheddar: '🧀',
      basil: '🌿', herbs: '🌿',
      olive: '🫒', 'olive oil': '🫒',
      pepper: '🌶️', peppers: '🌶️',
      carrot: '🥕', carrots: '🥕',
      potato: '🥔', potatoes: '🥔',
      chicken: '🐔', beef: '🥩', fish: '🐟',
      rice: '🍚', pasta: '🍝', bread: '🍞',
      milk: '🥛', egg: '🥚', eggs: '🥚',
      apple: '🍎', banana: '🍌', orange: '🍊',
    };
    
    const lowerName = name.toLowerCase();
    return emojiMap[lowerName] || '🥘';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return '#4CAF50'; // Green for 85%+
    if (confidence >= 0.70) return '#FFB800'; // Yellow for 70-85%
    return '#FF3B30'; // Red for <70%
  };

  const getSmartIncrement = (ingredient: Ingredient): { increment: number; minValue: number } => {
    const name = ingredient.name.toLowerCase();
    const unit = (ingredient.unit || '').toLowerCase();
    
    // Whole items that can't be fractioned
    if (name.includes('egg') || name.includes('avocado') || name.includes('onion') || 
        name.includes('potato') || name.includes('apple') || name.includes('banana') ||
        unit.includes('piece') || unit.includes('whole') || unit.includes('head')) {
      return { increment: 1, minValue: 1 };
    }
    
    // Meat and protein (smaller increments for precision)
    if (name.includes('beef') || name.includes('chicken') || name.includes('pork') || 
        name.includes('fish') || name.includes('turkey') || name.includes('lamb') ||
        unit.includes('lb') || unit.includes('oz') || unit.includes('pound')) {
      return { increment: 0.25, minValue: 0.25 };
    }
    
    // Spices and small quantities (teaspoons, tablespoons)
    if (unit.includes('tsp') || unit.includes('tbsp') || unit.includes('teaspoon') || 
        unit.includes('tablespoon') || name.includes('salt') || name.includes('pepper') ||
        name.includes('garlic powder') || name.includes('oregano') || name.includes('basil')) {
      return { increment: 0.25, minValue: 0.25 };
    }
    
    // Liquids (cups, ml, liters)
    if (unit.includes('cup') || unit.includes('ml') || unit.includes('liter') || 
        unit.includes('fluid') || name.includes('milk') || name.includes('water') ||
        name.includes('oil') || name.includes('juice')) {
      return { increment: 0.25, minValue: 0.25 };
    }
    
    // Cheese and dairy (smaller portions)
    if (name.includes('cheese') || name.includes('butter') || name.includes('cream') ||
        name.includes('yogurt') || unit.includes('slice')) {
      return { increment: 0.5, minValue: 0.5 };
    }
    
    // Default for unknown items
    return { increment: 0.5, minValue: 0.5 };
  };

  const handleQuantityChange = (ingredientId: string, action: 'increase' | 'decrease') => {
    setIngredients(ingredients.map(ing => {
      if (ing.id === ingredientId) {
        const currentQty = parseFloat(ing.quantity || '1');
        const { increment, minValue } = getSmartIncrement(ing);
        let newQty;
        
        if (action === 'increase') {
          newQty = currentQty + increment;
        } else {
          newQty = Math.max(minValue, currentQty - increment);
        }
        
        // Round to avoid floating point precision issues
        newQty = Math.round(newQty * 100) / 100;
        
        return {
          ...ing,
          quantity: newQty.toString()
        };
      }
      return ing;
    }));
    
    // Haptic feedback
    ReactNativeHapticFeedback.trigger('impactLight');
  };

  const handleRemoveIngredient = (id: string) => {
    // Haptic feedback
    ReactNativeHapticFeedback.trigger('impactLight');
    
    setIngredients(ingredients.filter(item => item.id !== id));
  };

  const handleAddIngredient = () => {
    Alert.prompt(
      'Add Ingredient',
      'What ingredient would you like to add?',
      async (text) => {
        if (text) {
          try {
            // Animate add button
            Animated.sequence([
              Animated.timing(addAnimScale, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(addAnimScale, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
            
            // Haptic feedback
            ReactNativeHapticFeedback.trigger('impactMedium');
            
            console.log(`🔍 Searching for ingredient: ${text}`);
            
            // Search for the ingredient in USDA database
            const response = await ingredientService.searchIngredients(text, 1);
            
            let newIngredient: Ingredient;
            
            if (response.success && response.data && response.data.length > 0) {
              const foundIngredient = response.data[0];
              console.log('✅ Found ingredient in database:', foundIngredient);
              
              newIngredient = {
                id: foundIngredient.id || Date.now().toString(),
                name: foundIngredient.name || text,
                confidence: 1.0, // User-added = 100% confidence
                emoji: getEmojiForIngredient(foundIngredient.name || text),
              };
              
              // Award XP for finding real ingredient
              await addXP(5, 'ADD_REAL_INGREDIENT');
            } else {
              console.log('⚠️ Ingredient not found in database, adding as custom');
              
              newIngredient = {
                id: Date.now().toString(),
                name: text,
                confidence: 1.0,
                emoji: getEmojiForIngredient(text),
              };
            }
            
            setIngredients([...ingredients, newIngredient]);
            
            // Show confetti for 5+ ingredients
            if (ingredients.length >= 4) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2000);
            }
            
          } catch (error) {
            console.error('❌ Error adding ingredient:', error);
            
            // Fallback to basic add
            const newIngredient: Ingredient = {
              id: Date.now().toString(),
              name: text,
              confidence: 1.0,
              emoji: getEmojiForIngredient(text),
            };
            setIngredients([...ingredients, newIngredient]);
          }
        }
      },
    );
  };

  const handleContinue = () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add at least one ingredient to continue.');
      return;
    }
    
    ReactNativeHapticFeedback.trigger('impactMedium');
    
    navigation.navigate('Preferences', {
      ingredients,
      imageUri,
    });
  };

  // Mystery reward system with proper probabilities
  const getRandomReward = () => {
    const random = Math.random();
    
    // Ultra rare rewards (0.01% chance = 1 in 10,000)
    if (random < 0.0001) {
      const ultraRare = [
        { type: 'subscription', value: '30_days', title: 'LEGENDARY!', description: 'Free month of premium features!', icon: '👑', color: '#FFD700' },
        { type: 'xp', value: 1000, title: 'MEGA JACKPOT!', description: '1000 XP bonus!', icon: '🌟', color: '#FFD700' },
      ];
      return { ...ultraRare[Math.floor(Math.random() * ultraRare.length)], rarity: 'legendary' };
    }
    
    // Rare rewards (0.9% chance)
    if (random < 0.01) {
      const rare = [
        { type: 'subscription', value: '7_days', title: 'Amazing Find!', description: 'Free week of premium features!', icon: '💎', color: '#9C27B0' },
        { type: 'xp', value: 200, title: 'XP Bonanza!', description: '200 XP bonus!', icon: '✨', color: '#9C27B0' },
        { type: 'badge', value: 'mystery_hunter', title: 'Mystery Hunter!', description: 'Rare badge unlocked!', icon: '🎖️', color: '#9C27B0' },
      ];
      return { ...rare[Math.floor(Math.random() * rare.length)], rarity: 'rare' };
    }
    
    // Uncommon rewards (9% chance)
    if (random < 0.1) {
      const uncommon = [
        { type: 'xp', value: 50, title: 'Nice Find!', description: '50 XP bonus!', icon: '⚡', color: '#2196F3' },
        { type: 'recipe_unlock', value: 'premium_recipe', title: 'Recipe Unlocked!', description: 'Exclusive recipe revealed!', icon: '📜', color: '#2196F3' },
      ];
      return { ...uncommon[Math.floor(Math.random() * uncommon.length)], rarity: 'uncommon' };
    }
    
    // Common rewards (90% chance)
    const common = [
      { type: 'xp', value: 10, title: 'Bonus XP!', description: '10 XP added!', icon: '🎯', color: '#4CAF50' },
      { type: 'xp', value: 15, title: 'Small Bonus!', description: '15 XP reward!', icon: '🍀', color: '#4CAF50' },
      { type: 'tip', value: 'cooking_tip', title: 'Pro Tip!', description: 'Cooking tip unlocked!', icon: '💡', color: '#4CAF50' },
    ];
    return { ...common[Math.floor(Math.random() * common.length)], rarity: 'common' };
  };

  const handleMysteryBoxOpen = async () => {
    const reward = getRandomReward();
    setMysteryReward(reward);
    setShowMysteryBox(false);
    setShowRewardModal(true);
    
    // Apply reward
    if (reward.type === 'xp' && typeof reward.value === 'number') {
      await addXP(reward.value, 'MYSTERY_BOX');
    } else if (reward.type === 'badge' && typeof reward.value === 'string') {
      await unlockBadge(reward.value);
    }
    
    // Enhanced haptic feedback based on rarity
    if (reward.rarity === 'legendary') {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } else if (reward.rarity === 'rare') {
      ReactNativeHapticFeedback.trigger('impactHeavy');
    } else if (reward.rarity === 'uncommon') {
      ReactNativeHapticFeedback.trigger('impactMedium');
    } else {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header with AI detection info */}
        <View style={styles.headerContainer}>
          <AIChefIcon size={moderateScale(24)} />
          <Text style={styles.headerTitle}>
            {loading ? 'Analyzing Ingredients...' : 'AI Detected Ingredients'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Please wait' : `${ingredients.length} items found`}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Star size={moderateScale(20)} color="#4CAF50" />
            <Text style={styles.statValue}>{ingredients.filter(ing => ing.confidence >= 0.85).length}</Text>
            <Text style={styles.statLabel}>High Confidence</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Camera size={moderateScale(20)} color="#FFB800" />
            <Text style={styles.statValue}>{ingredients.length}</Text>
            <Text style={styles.statLabel}>Detected</Text>
          </View>
          
          {/* Mystery box - only shows 25% of the time */}
          {showMysteryBox && (
            <View style={styles.statItem}>
              <TouchableOpacity
                style={styles.miniMysteryBox}
                onPress={handleMysteryBoxOpen}>
                <Text style={styles.miniBoxEmoji}>🎁</Text>
                <Text style={styles.miniBoxLabel}>Lucky!</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ingredients List - Now the main focus */}
        <ScrollView 
          style={styles.ingredientsScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ingredientsContent}>
          
          {ingredients.map((ingredient, index) => (
            <Animated.View 
              key={ingredient.id} 
              style={[
                styles.ingredientCard,
                {
                  opacity: new Animated.Value(1),
                  transform: [{
                    translateX: new Animated.Value(0),
                  }],
                },
              ]}
            >
              <View style={styles.ingredientLeft}>
                <Animated.Text style={[styles.ingredientEmoji, {
                  transform: [{scale: index === ingredients.length - 1 ? addAnimScale : 1}]
                }]}>
                  {ingredient.emoji}
                </Animated.Text>
                <View style={styles.ingredientInfo}>
                  <View style={styles.ingredientNameRow}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    {ingredient.variety && (
                      <Text style={styles.ingredientVariety}>({ingredient.variety})</Text>
                    )}
                  </View>
                  
                  {/* Quantity Row with editing */}
                  <View style={styles.quantityRow}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(ingredient.id, 'decrease')}>
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>
                      {ingredient.quantity || '1'} {ingredient.unit || 'unit'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(ingredient.id, 'increase')}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Individual Confidence Bar with Color */}
                  <View style={styles.confidenceContainer}>
                    <View style={styles.confidenceBar}>
                      <View style={[
                        styles.confidenceFill, 
                        {
                          width: `${ingredient.confidence * 100}%`,
                          backgroundColor: getConfidenceColor(ingredient.confidence)
                        }
                      ]} />
                    </View>
                    <Text style={[styles.confidenceText, {color: getConfidenceColor(ingredient.confidence)}]}>
                      {Math.round(ingredient.confidence * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveIngredient(ingredient.id)}>
                <X size={moderateScale(16)} color="#FF3B30" />
              </TouchableOpacity>
            </Animated.View>
          ))}

          {/* Add Ingredient Button */}
          <Animated.View style={{transform: [{scale: addAnimScale}]}}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
              <Plus size={moderateScale(20)} color="#4CAF50" />
              <Text style={styles.addButtonText}>Add Ingredient</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Fun tip */}
          {ingredients.length < 3 && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>💡 Add at least 3 ingredients for best results!</Text>
            </View>
          )}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Generate Recipes</Text>
            <Star size={moderateScale(18)} color="#F8F8FF" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Confetti effect placeholder */}
      {showConfetti && (
        <View style={styles.confettiOverlay}>
          <Text style={styles.confettiText}>🎉 Great variety! 🎉</Text>
        </View>
      )}
      
      {/* AI Analysis Modal */}
      <Modal
        visible={loading}
        transparent
        animationType="fade">
        <View style={styles.aiAnalysisOverlay}>
          <Animated.View style={[
            styles.aiAnalysisModal,
            {
              transform: [{ scale: aiPulseAnim }],
              opacity: aiOpacityAnim,
            }
          ]}>
            <View style={styles.aiAnalysisIcon}>
              <AIChefIcon size={moderateScale(48)} variant="analyzing" />
            </View>
            <Text style={styles.aiAnalysisTitle}>
              AI Chef Analyzing...
            </Text>
            <Text style={styles.aiAnalysisSubtitle}>
              Identifying ingredients with computer vision
            </Text>
            <View style={styles.aiAnalysisSteps}>
              <Text style={styles.aiAnalysisStep}>🔍 Scanning image patterns</Text>
              <Text style={styles.aiAnalysisStep}>🧠 Processing with neural networks</Text>
              <Text style={styles.aiAnalysisStep}>✨ Matching to ingredient database</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Mystery Box Reward Modal */}
      <Modal
        visible={showRewardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRewardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.rewardModal, { borderColor: mysteryReward?.color || '#4CAF50' }]}>
            <View style={[styles.rewardHeader, { backgroundColor: mysteryReward?.color || '#4CAF50' }]}>
              <Text style={styles.rewardRarity}>{mysteryReward?.rarity?.toUpperCase()}</Text>
              <Text style={styles.rewardIcon}>{mysteryReward?.icon}</Text>
            </View>
            <View style={styles.rewardContent}>
              <Text style={[styles.rewardTitle, { color: mysteryReward?.color || '#4CAF50' }]}>
                {mysteryReward?.title}
              </Text>
              <Text style={styles.rewardDescription}>
                {mysteryReward?.description}
              </Text>
              <TouchableOpacity
                style={[styles.collectButton, { backgroundColor: mysteryReward?.color || '#4CAF50' }]}
                onPress={() => setShowRewardModal(false)}>
                <Text style={styles.collectButtonText}>Collect!</Text>
                <Star size={16} color="#FFFFFF" />
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
    backgroundColor: '#F8F8FF',
  },
  mainContainer: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    padding: responsive.spacing.m,
    paddingTop: responsive.spacing.s,
    paddingBottom: responsive.spacing.s,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: verticalScale(4),
    marginBottom: verticalScale(2),
  },
  headerSubtitle: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.s,
    backgroundColor: '#FFFFFF',
    gap: scale(16),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: verticalScale(40),
    backgroundColor: '#E5E5E7',
  },
  statValue: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: verticalScale(2),
  },
  statLabel: {
    fontSize: responsive.fontSize.tiny,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: verticalScale(2),
  },
  miniMysteryBox: {
    padding: responsive.spacing.s,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: responsive.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },
  miniBoxEmoji: {
    fontSize: responsive.fontSize.large,
  },
  miniBoxLabel: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: '600',
    color: '#FFB800',
    marginTop: verticalScale(2),
  },
  ingredientsScrollView: {
    flex: 1,
  },
  ingredientsContent: {
    padding: responsive.spacing.m,
    paddingBottom: verticalScale(20),
  },
  ingredientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  ingredientEmoji: {
    fontSize: responsive.fontSize.xxxlarge,
  },
  ingredientInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ingredientName: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
  },
  ingredientVariety: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginLeft: scale(4),
    fontStyle: 'italic',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(4),
  },
  quantityButton: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: scale(4),
  },
  quantityButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  quantityText: {
    fontSize: responsive.fontSize.small,
    color: '#2D1B69',
    fontWeight: '500',
    minWidth: scale(60),
    textAlign: 'center',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  confidenceBar: {
    height: verticalScale(4),
    backgroundColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.small,
    overflow: 'hidden',
    flex: 1,
    marginRight: scale(8),
  },
  confidenceFill: {
    height: '100%',
  },
  confidenceText: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: '600',
    minWidth: scale(30),
  },
  removeButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    marginTop: verticalScale(8),
  },
  addButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#4CAF50',
  },
  bottomContainer: {
    backgroundColor: '#F8F8FF',
    paddingHorizontal: responsive.spacing.m,
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: responsive.button.height.medium / 3,
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  confettiOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -scale(100)}, {translateY: -verticalScale(20)}],
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: responsive.borderRadius.large,
    zIndex: 999,
  },
  confettiText: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tipContainer: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: verticalScale(20),
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  tipText: {
    fontSize: responsive.fontSize.regular,
    color: '#FFB800',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  rewardModal: {
    backgroundColor: '#FFFFFF',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsive.spacing.m,
  },
  rewardRarity: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rewardIcon: {
    fontSize: responsive.fontSize.large,
  },
  rewardContent: {
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: responsive.spacing.m,
  },
  rewardDescription: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  collectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
  },
  collectButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // AI Analysis Modal Styles
  aiAnalysisOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.85)',
  },
  aiAnalysisModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.xl,
    margin: responsive.spacing.m,
    alignItems: 'center',
    shadowColor: '#2D1B69',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  aiAnalysisIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  aiAnalysisTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  aiAnalysisSubtitle: {
    fontSize: responsive.fontSize.medium,
    color: '#8E8E93',
    marginBottom: verticalScale(20),
    textAlign: 'center',
  },
  aiAnalysisSteps: {
    alignItems: 'flex-start',
    gap: verticalScale(8),
  },
  aiAnalysisStep: {
    fontSize: responsive.fontSize.regular,
    color: '#6B46C1',
    fontWeight: '500',
  },
});

export default IngredientReviewScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Users,
  ChefHat,
  Clock,
  Utensils,
  Flame,
  Zap,
  X,
  Check,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Sparkles,
  Trophy,
  Globe,
} from 'lucide-react-native';
import { scale, verticalScale, moderateScale, responsive } from '../utils/responsive';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useAuth } from '../context/AuthContext';
import { useGamification, XP_VALUES } from '../context/GamificationContext';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface EnhancedPreferencesScreenProps {
  navigation: any;
  route: {
    params: {
      ingredients: any[];
      imageUri?: string;
    };
  };
}

interface ServingOption {
  id: string;
  label: string;
  value: number;
  icon: string;
  isCustom?: boolean;
}

interface Appliance {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  selected: boolean;
}

const EnhancedPreferencesScreen: React.FC<EnhancedPreferencesScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, imageUri } = route.params;
  const { user } = useAuth();
  const { addXP, unlockBadge } = useGamification();
  
  // Quiz flow state
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedPreferences, setHasCompletedPreferences] = useState(false);
  const [showXPReward, setShowXPReward] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  
  // Animation references
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpRewardScale = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  
  // Serving size options
  const [servingOptions] = useState<ServingOption[]>([
    { id: 'myself', label: 'Just me', value: 1, icon: '👤' },
    { id: 'couple', label: 'Two people', value: 2, icon: '👥' },
    { id: 'small-family', label: 'Family (4)', value: 4, icon: '👨‍👩‍👧‍👦' },
    { id: 'large-family', label: 'Large group (6)', value: 6, icon: '👨‍👩‍👧‍👧' },
    { id: 'custom', label: 'Custom amount', value: 0, icon: '✏️', isCustom: true },
  ]);
  
  // State management
  const [selectedServing, setSelectedServing] = useState<ServingOption>(servingOptions[1]);
  const [customServingAmount, setCustomServingAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Meal prep options
  const [mealPrepEnabled, setMealPrepEnabled] = useState(false);
  const [mealPrepPortions, setMealPrepPortions] = useState(4);
  const [showMealPrepInput, setShowMealPrepInput] = useState(false);
  
  // Kitchen appliances - All 12 from database
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: 'oven', name: 'Oven', category: 'cooking', icon: '🔥', description: 'Standard kitchen oven', selected: true },
    { id: 'stove', name: 'Stove', category: 'cooking', icon: '🔥', description: 'Stovetop cooking', selected: true },
    { id: 'air-fryer', name: 'Air Fryer', category: 'appliance', icon: '💨', description: 'Crispy cooking', selected: false },
    { id: 'slow-cooker', name: 'Slow Cooker', category: 'appliance', icon: '🍲', description: 'Long, slow cooking', selected: false },
    { id: 'grill', name: 'Grill', category: 'outdoor', icon: '🍖', description: 'Outdoor grilling', selected: false },
    { id: 'smoker', name: 'Smoker', category: 'outdoor', icon: '🚬', description: 'Smoking meats', selected: false },
    { id: 'microwave', name: 'Microwave', category: 'appliance', icon: '📱', description: 'Quick heating', selected: true },
    { id: 'instant-pot', name: 'Instant Pot', category: 'appliance', icon: '⚡', description: 'Pressure cooking', selected: false },
    { id: 'food-processor', name: 'Food Processor', category: 'tool', icon: '🔪', description: 'Chopping and mixing', selected: false },
    { id: 'stand-mixer', name: 'Stand Mixer', category: 'tool', icon: '🥧', description: 'Baking and mixing', selected: false },
    { id: 'blender', name: 'Blender', category: 'tool', icon: '🥤', description: 'Smoothies and sauces', selected: false },
    { id: 'toaster-oven', name: 'Toaster Oven', category: 'appliance', icon: '🍞', description: 'Small countertop oven', selected: false },
  ]);
  
  // Standard preferences
  const [cookingTime, setCookingTime] = useState('medium');
  const [difficulty, setDifficulty] = useState('any');
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<string[]>([]);

  // Quiz steps definition
  const steps = [
    {
      id: 'serving',
      title: 'How many people are you cooking for?',
      subtitle: 'Select your serving size and meal prep preference',
      type: 'serving',
    },
    {
      id: 'appliances',
      title: 'What kitchen equipment do you have?',
      subtitle: 'Select all the appliances you can use',
      type: 'appliances',
    },
    {
      id: 'dietary',
      title: 'Any dietary restrictions?',
      subtitle: 'Select all that apply',
      type: 'multi',
      options: [
        'Vegetarian',
        'Vegan', 
        'Gluten-Free',
        'Dairy-Free',
        'Keto',
        'Paleo',
        'Low-Carb',
        'Low-Fat',
        'Nut-Free',
      ],
    },
    {
      id: 'cuisine',
      title: 'What cuisine are you craving?',
      subtitle: 'Pick your favorites or let us surprise you',
      type: 'multi',
      options: [
        'Italian',
        'Asian',
        'Mexican',
        'Mediterranean',
        'American',
        'Indian',
        'French',
        'Thai',
        'Japanese',
        'Chinese',
        'Korean',
        'Greek',
        'Spanish',
        'Vietnamese',
        'Middle Eastern',
        'Caribbean',
        'Southern',
        'Fusion',
        '🎲 Surprise Me!',
      ],
    },
    {
      id: 'time',
      title: 'How much time do you have?',
      subtitle: 'We\'ll generate recipes that fit your schedule',
      type: 'single',
      options: [
        {label: '⚡ Quick & Easy', subtitle: 'Under 20 minutes', value: 'quick'},
        {label: '⏱️ Medium', subtitle: '20-45 minutes', value: 'medium'},
        {label: '🍖 Worth the Wait', subtitle: 'Over 45 minutes', value: 'long'},
        {label: '🤷 Flexible', subtitle: 'Any cooking time', value: 'any'},
      ],
    },
    {
      id: 'difficulty',
      title: 'What\'s your skill level?',
      subtitle: 'Be honest, we won\'t judge!',
      type: 'single',
      options: [
        {label: '👶 Beginner', subtitle: 'Simple recipes only', value: 'easy'},
        {label: '👨‍🍳 Home Cook', subtitle: 'Some experience needed', value: 'medium'},
        {label: '👨‍🍳 Chef Mode', subtitle: 'Bring on the challenge!', value: 'hard'},
        {label: '🎲 Surprise Me', subtitle: 'Any difficulty', value: 'any'},
      ],
    },
  ];

  // Load user defaults
  useEffect(() => {
    loadUserDefaults();
  }, [user]);

  // Animation and progress tracking
  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: (currentStep + 1) / steps.length,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const loadUserDefaults = () => {
    if (user) {
      // Load saved preferences from user profile using optional chaining
      const defaultServing = (user as any).default_serving_size || 2;
      const defaultOption = servingOptions.find(opt => opt.value === defaultServing) || servingOptions[1];
      setSelectedServing(defaultOption);
      
      setMealPrepEnabled((user as any).meal_prep_enabled || false);
      setMealPrepPortions((user as any).default_meal_prep_count || 4);
      
      // Load kitchen appliances
      const userAppliances = (user as any).kitchen_appliances;
      if (userAppliances && Array.isArray(userAppliances)) {
        setAppliances(prev => prev.map(appliance => ({
          ...appliance,
          selected: userAppliances.includes(appliance.id),
        })));
      }
    }
  };

  const handleServingSelection = (option: ServingOption) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    
    if (option.isCustom) {
      setShowCustomInput(true);
    } else {
      setSelectedServing(option);
      setShowCustomInput(false);
    }
  };

  const handleCustomServingSubmit = () => {
    const amount = parseInt(customServingAmount);
    if (amount && amount > 0 && amount <= 50) {
      setSelectedServing({
        id: 'custom',
        label: `${amount} people`,
        value: amount,
        icon: '✏️',
        isCustom: true,
      });
      setShowCustomInput(false);
      setCustomServingAmount('');
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } else {
      Alert.alert('Invalid Amount', 'Please enter a number between 1 and 50');
    }
  };

  const toggleMealPrep = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setMealPrepEnabled(!mealPrepEnabled);
  };

  const handleMealPrepPortions = (portions: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setMealPrepPortions(portions);
  };

  const toggleAppliance = (applianceId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setAppliances(prev => prev.map(appliance =>
      appliance.id === applianceId
        ? { ...appliance, selected: !appliance.selected }
        : appliance
    ));
  };

  // Quiz navigation functions
  const animateTransition = (direction: 'next' | 'prev') => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'next' ? -50 : 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(direction === 'next' ? 50 : -50);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition('next');
      setTimeout(() => setCurrentStep(currentStep + 1), 150);
    } else {
      handleContinue();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      animateTransition('prev');
      setTimeout(() => setCurrentStep(currentStep - 1), 150);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  // Option selection handlers
  const toggleOption = (option: string) => {
    const step = steps[currentStep];
    
    ReactNativeHapticFeedback.trigger('impactLight');
    
    if (step.id === 'dietary') {
      setDietary(prev =>
        prev.includes(option)
          ? prev.filter(item => item !== option)
          : [...prev, option],
      );
    } else if (step.id === 'cuisine') {
      if (option === '🎲 Surprise Me!') {
        setCuisine(prev => 
          prev.includes(option) ? [] : [option]
        );
      } else {
        setCuisine(prev => {
          const filtered = prev.filter(item => item !== '🎲 Surprise Me!');
          return prev.includes(option)
            ? filtered.filter(item => item !== option)
            : [...filtered, option];
        });
      }
    }
  };

  const selectSingleOption = (value: string) => {
    const step = steps[currentStep];
    
    ReactNativeHapticFeedback.trigger('impactMedium');
    
    if (step.id === 'time') {
      setCookingTime(value);
    } else if (step.id === 'difficulty') {
      setDifficulty(value);
    }
    
    // Auto-advance after selecting single option
    setTimeout(() => handleNext(), 300);
  };

  const isOptionSelected = (option: any): boolean => {
    const step = steps[currentStep];
    
    if (step.id === 'dietary') {
      return dietary.includes(option);
    } else if (step.id === 'cuisine') {
      return cuisine.includes(option);
    } else if (step.id === 'time') {
      return cookingTime === option.value;
    } else if (step.id === 'difficulty') {
      return difficulty === option.value;
    }
    
    return false;
  };

  const canProceed = (): boolean => {
    const step = steps[currentStep];
    
    if (step.id === 'serving') {
      return true; // Always can proceed from serving selection
    } else if (step.id === 'appliances') {
      return appliances.filter(a => a.selected).length > 0;
    } else if (step.type === 'multi') {
      if (step.id === 'dietary') return true; // Optional
      if (step.id === 'cuisine') return cuisine.length > 0;
    }
    
    return true; // Single choice steps can always proceed
  };

  const showCompletionReward = async () => {
    setShowXPReward(true);
    
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    
    Animated.sequence([
      Animated.spring(xpRewardScale, {
        toValue: 1.2,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(xpRewardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    await addXP(XP_VALUES.COMPLETE_PREFERENCES, 'COMPLETE_PREFERENCES');
  };
  
  const checkForBadges = async () => {
    // Check if user is trying exotic cuisines
    const exoticCuisines = ['Vietnamese', 'Middle Eastern', 'Korean', 'Thai'];
    const hasExotic = cuisine.some(c => exoticCuisines.includes(c));
    
    if (hasExotic) {
      await unlockBadge('cuisine_explorer');
      setShowBadgeUnlock(true);
      
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }).start();
    }
    
    if (cuisine.length >= 5) {
      await unlockBadge('world_traveler');
    }
  };

  const handleContinue = async () => {
    const selectedAppliances = appliances.filter(a => a.selected).map(a => a.id);
    
    // Complete preferences - show reward
    if (!hasCompletedPreferences) {
      setHasCompletedPreferences(true);
      await showCompletionReward();
    }
    
    // Check for badge unlocks
    await checkForBadges();

    const preferences = {
      servingSize: selectedServing.value,
      mealPrepEnabled,
      mealPrepPortions: mealPrepEnabled ? mealPrepPortions : null,
      selectedAppliances,
      cookingTime,
      difficulty,
      dietary,
      cuisine,
    };

    ReactNativeHapticFeedback.trigger('notificationSuccess');
    
    // Navigate after animation
    setTimeout(() => {
      navigation.navigate('RecipeCards', {
        ingredients,
        imageUri,
        preferences,
      });
    }, 1500);
  };

  const selectedApplianceCount = appliances.filter(a => a.selected).length;
  const currentStepData = steps[currentStep];
  const completionPercentage = Math.round(((currentStep + 1) / steps.length) * 100);

  // Render functions for different step types
  const renderServingStep = () => (
    <View style={styles.stepContent}>
      {/* Serving Size Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.servingGrid}>
          {servingOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.servingOption,
                selectedServing.id === option.id && styles.servingOptionSelected,
              ]}
              onPress={() => handleServingSelection(option)}
            >
              <Text style={styles.servingIcon}>{option.icon}</Text>
              <Text style={[
                styles.servingLabel,
                selectedServing.id === option.id && styles.servingLabelSelected,
              ]}>
                {option.label}
              </Text>
              {selectedServing.id === option.id && option.isCustom && (
                <Text style={styles.customValue}>{selectedServing.value} people</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meal Prep Section */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={[styles.mealPrepToggle, mealPrepEnabled && styles.mealPrepToggleActive]}
          onPress={toggleMealPrep}
        >
          <View style={styles.mealPrepContent}>
            <Text style={[styles.mealPrepText, mealPrepEnabled && styles.mealPrepTextActive]}>
              I want to meal prep
            </Text>
            <Text style={[styles.mealPrepSubtext, mealPrepEnabled && styles.mealPrepSubtextActive]}>
              Prepare multiple portions for the week
            </Text>
          </View>
          <View style={[styles.checkbox, mealPrepEnabled && styles.checkboxActive]}>
            {mealPrepEnabled && <Check size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        {mealPrepEnabled && (
          <View style={styles.mealPrepPortions}>
            <Text style={styles.portionsLabel}>How many meal prep portions?</Text>
            <View style={styles.portionsRow}>
              {[3, 4, 5, 6, 8, 10, 12, 14].map((portions) => (
                <TouchableOpacity
                  key={portions}
                  style={[
                    styles.portionOption,
                    mealPrepPortions === portions && styles.portionOptionSelected,
                  ]}
                  onPress={() => handleMealPrepPortions(portions)}
                >
                  <Text style={[
                    styles.portionText,
                    mealPrepPortions === portions && styles.portionTextSelected,
                  ]}>
                    {portions}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderAppliancesStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.applianceGrid}>
        {appliances.map((appliance) => (
          <TouchableOpacity
            key={appliance.id}
            style={[
              styles.applianceCard,
              appliance.selected && styles.applianceCardSelected,
            ]}
            onPress={() => toggleAppliance(appliance.id)}
          >
            <Text style={styles.applianceIcon}>{appliance.icon}</Text>
            <Text style={[
              styles.applianceName,
              appliance.selected && styles.applianceNameSelected,
            ]}>
              {appliance.name}
            </Text>
            <Text style={[
              styles.applianceDescription,
              appliance.selected && styles.applianceDescriptionSelected,
            ]}>
              {appliance.description}
            </Text>
            {appliance.selected && (
              <View style={styles.applianceCheckbox}>
                <Check size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.applianceHint}>
        {selectedApplianceCount} selected • Select all that you have
      </Text>
    </View>
  );

  const renderMultiChoice = () => {
    const step = steps[currentStep];
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.optionsGrid}>
          {step.options?.map((option, index) => (
            <TouchableOpacity
              key={`${step.id}-${index}-${option}`}
              style={[
                styles.optionChip,
                isOptionSelected(option) && styles.selectedChip,
              ]}
              onPress={() => toggleOption(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  isOptionSelected(option) && styles.selectedChipText,
                ]}
              >
                {option}
              </Text>
              {isOptionSelected(option) && (
                <Check size={14} color="#F8F8FF" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Show badge hint for cuisine selection */}
        {currentStep === 3 && cuisine.length >= 3 && (
          <Animated.View style={[styles.badgeHint, {opacity: fadeAnim}]}>
            <Globe size={16} color="#FFB800" />
            <Text style={styles.badgeHintText}>Explorer badge unlocked for trying exotic cuisines!</Text>
          </Animated.View>
        )}
      </View>
    );
  };

  const renderSingleChoice = () => {
    const step = steps[currentStep];
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.singleChoiceContainer}>
          {step.options?.map((option: any, index: number) => (
            <TouchableOpacity
              key={`${step.id}-${index}-${option.value}`}
              style={[
                styles.singleOption,
                isOptionSelected(option) && styles.selectedSingleOption,
              ]}
              onPress={() => selectSingleOption(option.value)}
            >
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  isOptionSelected(option) && styles.selectedOptionLabel,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionSubtitle,
                  isOptionSelected(option) && styles.selectedOptionSubtitle,
                ]}>
                  {option.subtitle}
                </Text>
              </View>
              <View style={[
                styles.radioCircle,
                isOptionSelected(option) && styles.selectedRadioCircle,
              ]}>
                {isOptionSelected(option) && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Cooking Preferences</Text>
          <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
        </View>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [{translateX: slideAnim}],
            }
          ]}
        >
          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          
          {currentStepData.type === 'serving' && renderServingStep()}
          {currentStepData.type === 'appliances' && renderAppliancesStep()}
          {currentStepData.type === 'multi' && renderMultiChoice()}
          {currentStepData.type === 'single' && renderSingleChoice()}
        </Animated.View>
        
        {/* XP Reward Animation */}
        {showXPReward && (
          <Animated.View 
            style={[
              styles.xpReward,
              {transform: [{scale: xpRewardScale}]}
            ]}
          >
            <Sparkles size={24} color="#FFB800" />
            <Text style={styles.xpRewardText}>+{XP_VALUES.COMPLETE_PREFERENCES} XP</Text>
          </Animated.View>
        )}
        
        {/* Badge Unlock Animation */}
        {showBadgeUnlock && (
          <Animated.View 
            style={[
              styles.badgeUnlock,
              {transform: [{scale: badgeScale}]}
            ]}
          >
            <Trophy size={32} color="#FFB800" />
            <Text style={styles.badgeUnlockText}>Cuisine Explorer!</Text>
          </Animated.View>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.invisibleButton]}
          onPress={handlePrev}
          disabled={currentStep === 0}
        >
          <ChevronLeft size={24} color="#2D1B69" />
          <Text style={styles.navButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
          <SkipForward size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !canProceed() && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Generate Recipes' : 'Next'}
          </Text>
          <ChevronRight size={24} color="#F8F8FF" />
        </TouchableOpacity>
      </View>

      {/* Custom Serving Input Modal */}
      <Modal
        visible={showCustomInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCustomInput(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Custom Serving Size</Text>
            <Text style={styles.modalSubtitle}>How many people are you cooking for?</Text>
            
            <TextInput
              style={styles.customInput}
              value={customServingAmount}
              onChangeText={setCustomServingAmount}
              placeholder="Enter number of people"
              keyboardType="numeric"
              autoFocus
              maxLength={2}
            />
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCustomServingSubmit}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
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
  // Quiz flow specific styles
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing.s,
  },
  progressLabel: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
  },
  progressPercentage: {
    fontSize: responsive.fontSize.small,
    fontWeight: '600',
    color: '#4CAF50',
  },
  progressBar: {
    height: verticalScale(6),
    backgroundColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.small,
    overflow: 'hidden',
    marginBottom: verticalScale(4),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: responsive.borderRadius.small,
  },
  progressText: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.l,
  },
  stepContent: {
    flex: 1,
    marginTop: responsive.spacing.l,
  },
  sectionContainer: {
    marginBottom: responsive.spacing.l,
  },
  // Multi-choice styles
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  optionChip: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  selectedChip: {
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    borderColor: '#2D1B69',
  },
  chipText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '500',
    color: '#666',
  },
  selectedChipText: {
    color: '#2D1B69',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: scale(4),
  },
  badgeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: responsive.borderRadius.small,
    padding: responsive.spacing.s,
    marginTop: responsive.spacing.m,
    gap: scale(8),
  },
  badgeHintText: {
    fontSize: responsive.fontSize.small,
    color: '#FFB800',
    fontWeight: '500',
    flex: 1,
  },
  // Single choice styles
  singleChoiceContainer: {
    gap: scale(12),
  },
  singleOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSingleOption: {
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    borderColor: '#2D1B69',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: verticalScale(2),
  },
  selectedOptionLabel: {
    color: '#2D1B69',
  },
  optionSubtitle: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
  },
  selectedOptionSubtitle: {
    color: '#2D1B69',
  },
  radioCircle: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioCircle: {
    borderColor: '#2D1B69',
  },
  radioInner: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: '#2D1B69',
  },
  // Appliance hint
  applianceHint: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: responsive.spacing.s,
  },
  // Navigation styles
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.m,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(4),
  },
  invisibleButton: {
    opacity: 0,
  },
  nextButton: {
    backgroundColor: '#2D1B69',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  navButtonText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '500',
    color: '#2D1B69',
  },
  nextButtonText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#F8F8FF',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  skipButtonText: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
  },
  // Reward animations
  xpReward: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -75}, {translateY: -25}],
    backgroundColor: 'rgba(255, 184, 0, 0.9)',
    borderRadius: responsive.borderRadius.large,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    zIndex: 1000,
  },
  xpRewardText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeUnlock: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    transform: [{translateX: -100}, {translateY: -50}],
    backgroundColor: 'rgba(255, 184, 0, 0.95)',
    borderRadius: responsive.borderRadius.large,
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    gap: scale(8),
    zIndex: 1000,
  },
  badgeUnlockText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    paddingHorizontal: responsive.spacing.m,
    paddingTop: responsive.spacing.s,
    paddingBottom: responsive.spacing.m,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    alignItems: 'center',
  },
  title: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: responsive.spacing.m,
    marginTop: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing.m,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginLeft: scale(8),
    flex: 1,
  },
  applianceCount: {
    fontSize: responsive.fontSize.small,
    color: '#4CAF50',
    fontWeight: '600',
  },
  servingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  servingOption: {
    width: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  servingOptionSelected: {
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    borderColor: '#2D1B69',
  },
  servingIcon: {
    fontSize: moderateScale(24),
    marginBottom: verticalScale(8),
  },
  servingLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  servingLabelSelected: {
    color: '#2D1B69',
    fontWeight: '600',
  },
  customValue: {
    fontSize: responsive.fontSize.small,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  mealPrepToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealPrepToggleActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  mealPrepContent: {
    flex: 1,
  },
  mealPrepText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#666',
  },
  mealPrepTextActive: {
    color: '#4CAF50',
  },
  mealPrepSubtext: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginTop: verticalScale(2),
  },
  mealPrepSubtextActive: {
    color: '#4CAF50',
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
  },
  mealPrepPortions: {
    marginTop: responsive.spacing.m,
  },
  portionsLabel: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: responsive.spacing.s,
  },
  portionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  portionOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.small,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  portionOptionSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  portionText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#666',
  },
  portionTextSelected: {
    color: '#4CAF50',
  },
  applianceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  applianceCard: {
    width: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  applianceCardSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  applianceIcon: {
    fontSize: moderateScale(32),
    marginBottom: verticalScale(8),
  },
  applianceName: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  applianceNameSelected: {
    color: '#4CAF50',
  },
  applianceDescription: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
  },
  applianceDescriptionSelected: {
    color: '#4CAF50',
  },
  applianceCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.m,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  continueButton: {
    backgroundColor: '#2D1B69',
    borderRadius: responsive.borderRadius.medium,
    paddingVertical: responsive.spacing.m,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  continueButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.l,
    marginHorizontal: responsive.spacing.l,
    position: 'relative',
    minWidth: scale(280),
  },
  modalClose: {
    position: 'absolute',
    top: responsive.spacing.m,
    right: responsive.spacing.m,
  },
  modalTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  modalSubtitle: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  customInput: {
    borderWidth: 2,
    borderColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.medium,
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.s,
    fontSize: responsive.fontSize.medium,
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  modalButton: {
    backgroundColor: '#2D1B69',
    borderRadius: responsive.borderRadius.medium,
    paddingVertical: responsive.spacing.m,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EnhancedPreferencesScreen; 
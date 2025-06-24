/**
 * Preferences Quiz Hook
 * Manages all state and logic for the preferences quiz flow
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useGamification, XP_VALUES } from '../context/GamificationContext';
import { 
  PreferencesState, 
  ServingOption, 
  Appliance 
} from '../types/preferences';
import { 
  SERVING_OPTIONS, 
  DEFAULT_APPLIANCES, 
  QUIZ_STEPS, 
  DEFAULT_PREFERENCES 
} from '../data/preferencesData';

export function usePreferencesQuiz() {
  const { user } = useAuth();
  const { addXP, unlockBadge } = useGamification();

  // Animation references
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpRewardScale = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  // Main state
  const [state, setState] = useState<PreferencesState>({
    currentStep: 0,
    mealType: DEFAULT_PREFERENCES.mealType,
    selectedServing: SERVING_OPTIONS[1], // Default to "Two people"
    customServingAmount: "",
    mealPrepEnabled: DEFAULT_PREFERENCES.mealPrepEnabled,
    mealPrepPortions: DEFAULT_PREFERENCES.mealPrepPortions,
    appliances: [...DEFAULT_APPLIANCES],
    cookingTime: DEFAULT_PREFERENCES.cookingTime,
    difficulty: DEFAULT_PREFERENCES.difficulty,
    dietary: [...DEFAULT_PREFERENCES.dietary],
    cuisine: [...DEFAULT_PREFERENCES.cuisine],
    hasCompletedPreferences: false,
  });

  // Modal states
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showXPReward, setShowXPReward] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);

  // Load user defaults on mount
  useEffect(() => {
    loadUserDefaults();
  }, [user]);

  // Animation and progress tracking
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (state.currentStep + 1) / QUIZ_STEPS.length,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [state.currentStep, progressAnim]);

  const loadUserDefaults = useCallback(() => {
    if (user) {
      const defaultServing = (user as any).default_serving_size || 2;
      const defaultOption = SERVING_OPTIONS.find((opt) => opt.value === defaultServing) || SERVING_OPTIONS[1];
      
      const userAppliances = (user as any).kitchen_appliances;
      const updatedAppliances = userAppliances && Array.isArray(userAppliances)
        ? DEFAULT_APPLIANCES.map((appliance) => ({
            ...appliance,
            selected: userAppliances.includes(appliance.id),
          }))
        : DEFAULT_APPLIANCES;

      setState(prev => ({
        ...prev,
        selectedServing: defaultOption,
        mealPrepEnabled: (user as any).meal_prep_enabled || false,
        mealPrepPortions: (user as any).default_meal_prep_count || 4,
        appliances: updatedAppliances,
      }));
    }
  }, [user]);

  // Navigation functions
  const animateTransition = useCallback((direction: "next" | "prev") => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === "next" ? -50 : 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(direction === "next" ? 50 : -50);

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
  }, [fadeAnim, slideAnim]);

  const handleNext = useCallback(() => {
    if (state.currentStep < QUIZ_STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition("next");
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else {
      handleContinue();
    }
  }, [state.currentStep, animateTransition]);

  const handlePrev = useCallback(() => {
    if (state.currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition("prev");
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  }, [state.currentStep, animateTransition]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleNext();
  }, [handleNext]);

  // Step-specific handlers
  const handleServingSelection = useCallback((option: ServingOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (option.isCustom) {
      setShowCustomInput(true);
    } else {
      setState(prev => ({ ...prev, selectedServing: option }));
      setShowCustomInput(false);
    }
  }, []);

  const handleCustomServingSubmit = useCallback(() => {
    const amount = parseInt(state.customServingAmount, 10);
    if (amount && amount > 0 && amount <= 50) {
      setState(prev => ({
        ...prev,
        selectedServing: {
          id: "custom",
          label: `${amount} people`,
          value: amount,
          icon: "✏️",
          isCustom: true,
        },
        customServingAmount: "",
      }));
      setShowCustomInput(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Invalid Amount", "Please enter a number between 1 and 50");
    }
  }, [state.customServingAmount]);

  const toggleMealPrep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState(prev => ({ ...prev, mealPrepEnabled: !prev.mealPrepEnabled }));
  }, []);

  const handleMealPrepPortions = useCallback((portions: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState(prev => ({ ...prev, mealPrepPortions: portions }));
  }, []);

  const toggleAppliance = useCallback((applianceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState(prev => ({
      ...prev,
      appliances: prev.appliances.map((appliance) =>
        appliance.id === applianceId
          ? { ...appliance, selected: !appliance.selected }
          : appliance
      ),
    }));
  }, []);

  const toggleOption = useCallback((option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentStep = QUIZ_STEPS[state.currentStep];
    if (currentStep.id === "dietary") {
      setState(prev => {
        const newDietary = prev.dietary.includes(option)
          ? prev.dietary.filter((item) => item !== option)
          : [...prev.dietary, option];
        return { ...prev, dietary: newDietary };
      });
    } else if (currentStep.id === "cuisine") {
      setState(prev => {
        const newCuisine = prev.cuisine.includes(option)
          ? prev.cuisine.filter((item) => item !== option)
          : [...prev.cuisine, option];
        return { ...prev, cuisine: newCuisine };
      });
    }
  }, [state.currentStep]);

  const selectSingleOption = useCallback((value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentStep = QUIZ_STEPS[state.currentStep];
    if (currentStep.id === "mealtype") {
      setState(prev => ({ ...prev, mealType: value }));
    } else if (currentStep.id === "time") {
      setState(prev => ({ ...prev, cookingTime: value }));
    } else if (currentStep.id === "difficulty") {
      setState(prev => ({ ...prev, difficulty: value }));
    }
  }, [state.currentStep]);

  // Validation
  const canProceed = useCallback((): boolean => {
    const currentStep = QUIZ_STEPS[state.currentStep];
    
    switch (currentStep.id) {
      case "mealtype":
        return state.mealType !== "";
      case "serving":
        return state.selectedServing.value > 0;
      case "appliances":
        return state.appliances.some((appliance) => appliance.selected);
      case "dietary":
        return true; // Optional
      case "cuisine":
        return true; // Optional
      case "time":
        return state.cookingTime !== "";
      case "difficulty":
        return state.difficulty !== "";
      default:
        return true;
    }
  }, [state]);

  // Completion handlers
  const showCompletionReward = useCallback(async () => {
    setShowXPReward(true);
    
    Animated.spring(xpRewardScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Hide after 2 seconds
    setTimeout(() => {
      Animated.spring(xpRewardScale, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start(() => setShowXPReward(false));
    }, 2000);

    await addXP(XP_VALUES.COMPLETE_PREFERENCES, "COMPLETE_PREFERENCES");
  }, [addXP, xpRewardScale]);

  const checkForBadges = useCallback(async () => {
    if (state.cuisine.length >= 3) {
      setShowBadgeUnlock(true);
      
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.spring(badgeScale, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start(() => setShowBadgeUnlock(false));
      }, 3000);

      await unlockBadge("cuisine_explorer");
    }
  }, [state.cuisine.length, unlockBadge, badgeScale]);

  const handleContinue = useCallback(async () => {
    setState(prev => ({ ...prev, hasCompletedPreferences: true }));
    
    await showCompletionReward();
    await checkForBadges();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [showCompletionReward, checkForBadges]);

  return {
    // State
    state,
    showCustomInput,
    showXPReward,
    showBadgeUnlock,
    
    // Animation refs
    slideAnim,
    fadeAnim,
    progressAnim,
    xpRewardScale,
    badgeScale,
    
    // Handlers
    handleNext,
    handlePrev,
    handleSkip,
    handleServingSelection,
    handleCustomServingSubmit,
    toggleMealPrep,
    handleMealPrepPortions,
    toggleAppliance,
    toggleOption,
    selectSingleOption,
    canProceed,
    handleContinue,
    
    // Modal handlers
    setShowCustomInput,
    setCustomServingAmount: (amount: string) => 
      setState(prev => ({ ...prev, customServingAmount: amount })),
    
    // Data
    steps: QUIZ_STEPS,
    servingOptions: SERVING_OPTIONS,
  };
} 
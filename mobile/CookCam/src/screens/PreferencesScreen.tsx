import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Star,
  Trophy,
  Globe,
} from "lucide-react-native";
import SafeScreen from "../components/SafeScreen";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import * as Haptics from "expo-haptics";

interface PreferencesScreenProps {
  navigation: any;
  route: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, imageUri } = route.params || {};
  const { addXP, unlockBadge } = useGamification();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string[]>([]);
  const [selectedCookingTime, setSelectedCookingTime] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [hasCompletedPreferences, setHasCompletedPreferences] = useState(false);
  const [showXPReward, setShowXPReward] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpRewardScale = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      id: "dietary",
      title: "Any dietary restrictions?",
      subtitle: "Select all that apply",
      type: "multi",
      options: [
        "Vegetarian",
        "Vegan",
        "Gluten-Free",
        "Dairy-Free",
        "Keto",
        "Paleo",
        "Low-Carb",
        "Low-Fat",
        "Nut-Free",
      ],
    },
    {
      id: "cuisine",
      title: "What cuisine are you craving?",
      subtitle: "Pick your favorites or let us surprise you",
      type: "multi",
      options: [
        "Italian",
        "Asian",
        "Mexican",
        "Mediterranean",
        "American",
        "Indian",
        "French",
        "Thai",
        "Japanese",
        "Chinese",
        "Korean",
        "Greek",
        "Spanish",
        "Vietnamese",
        "Middle Eastern",
        "Caribbean",
        "Southern",
        "Fusion",
        "🎲 Surprise Me!",
      ],
    },
    {
      id: "time",
      title: "How much time do you have?",
      subtitle: "We'll find recipes that fit",
      type: "single",
      options: [
        {
          label: "⚡ Quick & Easy",
          subtitle: "Under 20 minutes",
          value: "quick",
        },
        { label: "⏱️ Medium", subtitle: "20-45 minutes", value: "medium" },
        {
          label: "🍖 Worth the Wait",
          subtitle: "Over 45 minutes",
          value: "long",
        },
        { label: "🤷 Flexible", subtitle: "Any cooking time", value: "any" },
      ],
    },
    {
      id: "difficulty",
      title: "What's your skill level?",
      subtitle: "Be honest, we won't judge!",
      type: "single",
      options: [
        {
          label: "👶 Beginner",
          subtitle: "Simple recipes only",
          value: "easy",
        },
        {
          label: "👨‍🍳 Home Cook",
          subtitle: "Some experience needed",
          value: "medium",
        },
        {
          label: "👨‍🍳 Chef Mode",
          subtitle: "Bring on the challenge!",
          value: "hard",
        },
        { label: "🎲 Surprise Me", subtitle: "Any difficulty", value: "any" },
      ],
    },
  ];

  const animateTransition = (direction: "next" | "prev") => {
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
  };

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: (currentStep + 1) / steps.length,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition("next");
      setTimeout(() => setCurrentStep(currentStep + 1), 150);
    } else {
      // Complete preferences - show reward
      if (!hasCompletedPreferences) {
        setHasCompletedPreferences(true);
        showCompletionReward();
      }

      // Submit preferences
      const preferences = {
        dietary: selectedDietary,
        cuisine: selectedCuisine,
        cookingTime: selectedCookingTime || "any",
        difficulty: selectedDifficulty || "any",
      };

      // Check for badge unlocks
      checkForBadges();

      // Navigate after animation
      setTimeout(() => {
        navigation.navigate("RecipeCards", {
          ingredients,
          imageUri,
          preferences,
        });
      }, 1500);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      animateTransition("prev");
      setTimeout(() => setCurrentStep(currentStep - 1), 150);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const toggleOption = (option: string) => {
    const step = steps[currentStep];

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step.id === "dietary") {
      setSelectedDietary((prev) =>
        prev.includes(option)
          ? prev.filter((item) => item !== option)
          : [...prev, option],
      );
    } else if (step.id === "cuisine") {
      // Handle "Surprise Me!" option
      if (option === "🎲 Surprise Me!") {
        setSelectedCuisine((prev) => (prev.includes(option) ? [] : [option]));
      } else {
        // If selecting a specific cuisine, remove "Surprise Me!" if it was selected
        setSelectedCuisine((prev) => {
          const filtered = prev.filter((item) => item !== "🎲 Surprise Me!");
          return prev.includes(option)
            ? filtered.filter((item) => item !== option)
            : [...filtered, option];
        });
      }
    }
  };

  const selectSingleOption = (value: string) => {
    const step = steps[currentStep];

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step.id === "time") {
      setSelectedCookingTime(value);
    } else if (step.id === "difficulty") {
      setSelectedDifficulty(value);
    }

    // Auto-advance after selecting single option
    setTimeout(() => handleNext(), 300);
  };

  const isOptionSelected = (option: any): boolean => {
    const step = steps[currentStep];

    if (step.id === "dietary") {
      return selectedDietary.includes(option);
    } else if (step.id === "cuisine") {
      return selectedCuisine.includes(option);
    } else if (step.id === "time") {
      return selectedCookingTime === option.value;
    } else if (step.id === "difficulty") {
      return selectedDifficulty === option.value;
    }

    return false;
  };

  const canProceed = (): boolean => {
    const step = steps[currentStep];

    if (step.type === "multi") {
      if (step.id === "dietary") {
        return true;
      } // Optional
      if (step.id === "cuisine") {
        return selectedCuisine.length > 0;
      }
    }

    return true; // Single choice steps can always proceed (has default)
  };

  const renderMultiChoice = () => {
    const step = steps[currentStep];

    return (
      <View style={styles.optionsGrid}>
        {step.options.map((option, index) => (
          <TouchableOpacity
            key={`${step.id}-${index}-${option as string}`}
            style={[
              styles.optionChip,
              isOptionSelected(option) && styles.selectedChip,
            ]}
            onPress={() => toggleOption(option as string)}
          >
            <Text
              style={[
                styles.chipText,
                isOptionSelected(option) && styles.selectedChipText,
              ]}
            >
              {option as string}
            </Text>
            {isOptionSelected(option) && (
              <Check size={14} color="#F8F8FF" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSingleChoice = () => {
    const step = steps[currentStep];

    return (
      <View style={styles.singleChoiceContainer}>
        {step.options.map((option: any, index: number) => (
          <TouchableOpacity
            key={`${step.id}-${index}-${option.value}`}
            style={[
              styles.singleOption,
              isOptionSelected(option) && styles.selectedSingleOption,
            ]}
            onPress={() => selectSingleOption(option.value)}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  isOptionSelected(option) && styles.selectedOptionLabel,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionSubtitle,
                  isOptionSelected(option) && styles.selectedOptionSubtitle,
                ]}
              >
                {option.subtitle}
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                isOptionSelected(option) && styles.selectedRadioCircle,
              ]}
            >
              {isOptionSelected(option) && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const showCompletionReward = async () => {
    setShowXPReward(true);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate XP reward
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

    // Award XP
    await addXP(XP_VALUES.COMPLETE_PREFERENCES, "COMPLETE_PREFERENCES");
  };

  const checkForBadges = async () => {
    // Check if user is trying exotic cuisines
    const exoticCuisines = ["Vietnamese", "Middle Eastern", "Korean", "Thai"];
    const hasExotic = selectedCuisine.some((c) => exoticCuisines.includes(c));

    if (hasExotic) {
      await unlockBadge("cuisine_explorer");
      setShowBadgeUnlock(true);

      // Animate badge
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }).start();
    }

    // Check for adventurous eater (selected 5+ cuisines)
    if (selectedCuisine.length >= 5) {
      await unlockBadge("world_traveler");
    }
  };

  const currentStepData = steps[currentStep];
  const completionPercentage = Math.round(
    ((currentStep + 1) / steps.length) * 100,
  );

  return (
    <SafeScreen>
      {/* Enhanced Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Your Preferences</Text>
          <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
        </View>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
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
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{currentStepData.title}</Text>

          {currentStepData.type === "multi"
            ? renderMultiChoice()
            : renderSingleChoice()}

          {/* Show badge hint for cuisine selection */}
          {currentStep === 1 && selectedCuisine.length >= 3 && (
            <Animated.View style={[styles.badgeHint, { opacity: fadeAnim }]}>
              <Globe size={16} color="#FFB800" />
              <Text style={styles.badgeHintText}>
                Explorer badge unlocked for trying exotic cuisines!
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* XP Reward Animation */}
        {showXPReward && (
          <Animated.View
            style={[styles.xpReward, { transform: [{ scale: xpRewardScale }] }]}
          >
            <Star size={24} color="#FFB800" />
            <Text style={styles.xpRewardText}>
              +{XP_VALUES.COMPLETE_PREFERENCES} XP
            </Text>
          </Animated.View>
        )}

        {/* Badge Unlock Animation */}
        {showBadgeUnlock && (
          <Animated.View
            style={[styles.badgeUnlock, { transform: [{ scale: badgeScale }] }]}
          >
            <Trophy size={32} color="#FFB800" />
            <Text style={styles.badgeUnlockText}>Cuisine Explorer!</Text>
          </Animated.View>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStep === 0 && styles.invisibleButton,
          ]}
          onPress={handlePrev}
          disabled={currentStep === 0}
        >
          <ChevronLeft size={24} color="#2D1B69" />
          <Text style={styles.navButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
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
            {currentStep === steps.length - 1 ? "Find Recipes" : "Next"}
          </Text>
          <ChevronRight size={24} color="#F8F8FF" />
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1B69",
    letterSpacing: -0.5,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E5E7",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionContainer: {
    flex: 1,
    paddingTop: 5,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  selectedChip: {
    backgroundColor: "#2D1B69",
    borderColor: "#2D1B69",
    elevation: 4,
    shadowOpacity: 0.15,
  },
  chipText: {
    fontSize: 13,
    color: "#2D1B69",
    marginRight: 2,
    fontWeight: "500",
  },
  selectedChipText: {
    color: "#F8F8FF",
    fontWeight: "600",
  },
  checkIcon: {
    marginLeft: 4,
  },
  singleChoiceContainer: {
    width: "100%",
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  singleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    minHeight: 70,
  },
  selectedSingleOption: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF9F7",
    elevation: 3,
    shadowOpacity: 0.1,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  selectedOptionLabel: {
    color: "#FF6B35",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 14,
  },
  selectedOptionSubtitle: {
    color: "#FF6B35",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E5E7",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRadioCircle: {
    borderColor: "#FF6B35",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  invisibleButton: {
    opacity: 0,
  },
  navButtonText: {
    fontSize: 15,
    color: "#2D1B69",
    fontWeight: "500",
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipButtonText: {
    fontSize: 15,
    color: "#8E8E93",
  },
  nextButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  disabledButton: {
    backgroundColor: "#E5E5E7",
    shadowOpacity: 0,
    elevation: 0,
  },
  badgeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: 18,
    alignSelf: "center",
  },
  badgeHintText: {
    fontSize: 12,
    color: "#FFB800",
    fontWeight: "500",
  },
  xpReward: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFB800",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#FFB800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  xpRewardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  badgeUnlock: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeUnlockText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFB800",
    marginTop: 8,
  },
});

export default PreferencesScreen;

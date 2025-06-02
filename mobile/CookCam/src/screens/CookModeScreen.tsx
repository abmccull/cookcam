import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGamification, XP_VALUES} from '../context/GamificationContext';
import RecipeRatingModal from '../components/RecipeRatingModal';

interface CookingStep {
  id: number;
  instruction: string;
  duration?: number; // in seconds
  completed: boolean;
}

interface CookModeScreenProps {
  navigation: any;
  route: any;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const CookModeScreen: React.FC<CookModeScreenProps> = ({navigation, route}) => {
  const {recipe} = route.params || {};
  const {addXP, checkStreak} = useGamification();

  const [completedSteps, setCompletedSteps] = useState(0);
  const [stepXPAnimations, setStepXPAnimations] = useState<number[]>([]);
  const [showXPCelebration, setShowXPCelebration] = useState(false);
  
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpCelebrationScale = useRef(new Animated.Value(0)).current;
  const claimPreviewScale = useRef(new Animated.Value(0.95)).current;
  const stepTranslateX = useRef(new Animated.Value(0)).current;

  // Dummy cooking steps for validation
  const [steps, setSteps] = useState<CookingStep[]>([
    {
      id: 1,
      instruction:
        'Preheat oven to 400°F (200°C). Wash and chop all vegetables into even pieces.',
      duration: 300, // 5 minutes
      completed: false,
    },
    {
      id: 2,
      instruction:
        'Heat olive oil in a large skillet over medium heat. Add onions and garlic, cook until fragrant.',
      duration: 180, // 3 minutes
      completed: false,
    },
    {
      id: 3,
      instruction:
        'Add tomatoes and bell peppers. Season with salt and pepper. Cook until vegetables are tender.',
      duration: 420, // 7 minutes
      completed: false,
    },
    {
      id: 4,
      instruction:
        'Add fresh basil and cook for another minute. Taste and adjust seasoning as needed.',
      duration: 60, // 1 minute
      completed: false,
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(steps[0]?.duration || 0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isRecipeClaimed, setIsRecipeClaimed] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStepComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: completedSteps / steps.length,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [completedSteps]);

  useEffect(() => {
    // Pulse animation for claim preview
    Animated.loop(
      Animated.sequence([
        Animated.timing(claimPreviewScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(claimPreviewScale, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  const triggerHaptic = (type: 'impact' | 'success' | 'warning' = 'impact') => {
    switch (type) {
      case 'success':
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        break;
      case 'warning':
        ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
        break;
      default:
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
    }
  };

  const handlePlayPause = () => {
    triggerHaptic();
    setIsPlaying(!isPlaying);
  };

  const handleStepComplete = () => {
    triggerHaptic('success');

    setSteps(prev =>
      prev.map((step, index) =>
        index === currentStep ? {...step, completed: true} : step,
      ),
    );
    
    // Increment completed steps
    setCompletedSteps(prev => prev + 1);
    
    // Show mini XP celebration
    showStepXPCelebration();

    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        animateStepTransition('next');
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setTimeRemaining(steps[nextStep]?.duration || 0);
        setIsPlaying(false);
      }, 1000);
    } else {
      // All steps completed - Award XP and check streak
      handleRecipeComplete();
    }
  };

  const handleRecipeComplete = async () => {
    // Award XP for completing recipe
    await addXP(XP_VALUES.COMPLETE_RECIPE, 'COMPLETE_RECIPE');
    
    // Check and update streak
    await checkStreak();
    
    // Show rating modal first
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (ratingData: any) => {
    setShowRatingModal(false);
    
    // Award XP for rating
    if (ratingData.review && ratingData.review.length > 50) {
      await addXP(XP_VALUES.HELPFUL_REVIEW, 'HELPFUL_REVIEW');
    }
    
    // If this is a generated recipe, offer to claim it
    if (recipe?.isGenerated && !isRecipeClaimed) {
      Alert.alert(
        'Claim This Recipe! 🏆',
        `Would you like to claim "${recipe.title || 'this recipe'}" as your own? You'll earn ${XP_VALUES.CLAIM_RECIPE} XP and get credit for all future views!`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => showCompletionAlert(),
          },
          {
            text: 'Claim Recipe',
            onPress: async () => {
              await claimRecipe();
              showCompletionAlert();
            },
          },
        ],
      );
    } else {
      showCompletionAlert();
    }
  };

  const claimRecipe = async () => {
    // Award XP for claiming
    await addXP(XP_VALUES.CLAIM_RECIPE, 'CLAIM_RECIPE');
    setIsRecipeClaimed(true);
    
    // TODO: API call to claim recipe
    // This would save the recipe to the database with the user as creator
    
    Alert.alert(
      'Recipe Claimed! 🎉',
      `You've successfully claimed this recipe and earned ${XP_VALUES.CLAIM_RECIPE} XP!`,
    );
  };

  const showCompletionAlert = () => {
    Alert.alert(
      'Congratulations! 🎉', 
      `You've earned ${XP_VALUES.COMPLETE_RECIPE} XP!`, 
      [
        {
          text: 'Share Recipe', 
          onPress: () => handleShareRecipe()
        },
        {
          text: 'Finish', 
          onPress: () => navigation.navigate('Camera'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleShareRecipe = async () => {
    // Award XP for sharing
    await addXP(XP_VALUES.SHARE_RECIPE, 'SHARE_RECIPE');
    
    // Navigate to share screen (to be implemented)
    Alert.alert('Share', 'Sharing feature coming soon!');
    navigation.navigate('Camera');
  };

  const animateStepTransition = (direction: 'next' | 'prev') => {
    Animated.sequence([
      Animated.timing(stepTranslateX, {
        toValue: direction === 'next' ? -30 : 30,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(stepTranslateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      triggerHaptic();
      animateStepTransition('next');
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setTimeRemaining(steps[nextStep]?.duration || 0);
      setIsPlaying(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      triggerHaptic();
      animateStepTransition('prev');
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setTimeRemaining(steps[prevStep]?.duration || 0);
      setIsPlaying(false);
    }
  };

  const toggleVoice = () => {
    triggerHaptic();
    setVoiceEnabled(!voiceEnabled);
    // In a real app, this would enable/disable text-to-speech
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (completedSteps / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const potentialXP = recipe?.isGenerated ? XP_VALUES.COMPLETE_RECIPE + XP_VALUES.CLAIM_RECIPE : XP_VALUES.COMPLETE_RECIPE;

  const showStepXPCelebration = () => {
    setShowXPCelebration(true);
    
    // Animate XP celebration
    Animated.sequence([
      Animated.spring(xpCelebrationScale, {
        toValue: 1.2,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(xpCelebrationScale, {
        toValue: 0,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowXPCelebration(false);
    });
    
    // Add small XP for step completion
    addXP(5, 'STEP_COMPLETE');
    
    // Track which steps showed animation
    setStepXPAnimations(prev => [...prev, currentStep]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#2D1B69" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        {/* Timer in header */}
        {currentStepData?.duration ? (
          <View style={styles.headerTimer}>
            <Clock size={20} color="#FF6B35" />
            <Text style={styles.headerTimerText}>{formatTime(timeRemaining)}</Text>
            <TouchableOpacity 
              style={[styles.headerPlayButton, isPlaying && styles.headerPauseButton]} 
              onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause size={16} color="#FFFFFF" />
              ) : (
                <Play size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.headerTitle}>Cook Mode</Text>
        )}
        
        <TouchableOpacity onPress={toggleVoice} style={styles.voiceButton}>
          {voiceEnabled ? (
            <Volume2 size={24} color="#FF6B35" />
          ) : (
            <VolumeX size={24} color="#8E8E93" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{recipe?.title || 'Garlic Herb Roasted Vegetables'}</Text>
      </View>

      {/* Enhanced Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Recipe Progress</Text>
          <View style={styles.xpPreview}>
            <Sparkles size={14} color="#FFB800" />
            <Text style={styles.xpPreviewText}>+{potentialXP} XP</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length} • {Math.round(progress)}% Complete
        </Text>
      </View>
      
      {/* Claim Recipe Preview (for generated recipes) */}
      {recipe?.isGenerated && !isRecipeClaimed && completedSteps >= Math.floor(steps.length / 2) && (
        <Animated.View style={[styles.claimPreview, {transform: [{scale: claimPreviewScale}]}]}>
          <Trophy size={20} color="#FFB800" />
          <View style={styles.claimPreviewContent}>
            <Text style={styles.claimPreviewTitle}>Claim this recipe after cooking!</Text>
            <Text style={styles.claimPreviewSubtitle}>+{XP_VALUES.CLAIM_RECIPE} XP • Become the creator</Text>
          </View>
        </Animated.View>
      )}

      {/* Main Step Card */}
      <View style={styles.mainContent}>
        <Animated.View 
          style={[
            styles.stepCard,
            {transform: [{translateX: stepTranslateX}]}
          ]}>
          {/* Step Number Badge */}
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step {currentStep + 1}</Text>
            </View>
          </View>

          {/* Instruction */}
          <ScrollView 
            style={styles.instructionScroll}
            contentContainerStyle={styles.instructionContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.stepInstruction}>
              {currentStepData?.instruction}
            </Text>
          </ScrollView>

          {/* Step Controls */}
          <View style={styles.stepControls}>
            <TouchableOpacity
              style={[
                styles.stepNavButton,
                currentStep === 0 && styles.disabledButton,
              ]}
              onPress={handlePreviousStep}
              disabled={currentStep === 0}>
              <ChevronLeft size={20} color={currentStep === 0 ? '#C7C7CC' : '#2D1B69'} />
              <Text style={[
                styles.stepNavText,
                currentStep === 0 && styles.disabledText
              ]}>Previous</Text>
            </TouchableOpacity>

            {!currentStepData?.duration && (
              <TouchableOpacity
                style={styles.completeStepButton}
                onPress={handleStepComplete}>
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.completeStepText}>Complete Step</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.stepNavButton,
                currentStep === steps.length - 1 && styles.disabledButton,
              ]}
              onPress={handleNextStep}
              disabled={currentStep === steps.length - 1}>
              <Text style={[
                styles.stepNavText,
                currentStep === steps.length - 1 && styles.disabledText
              ]}>Next</Text>
              <ChevronRight size={20} color={currentStep === steps.length - 1 ? '#C7C7CC' : '#2D1B69'} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
      {/* Mini XP Celebration */}
      {showXPCelebration && (
        <Animated.View 
          style={[
            styles.xpCelebration,
            {transform: [{scale: xpCelebrationScale}]}
          ]}
        >
          <Sparkles size={20} color="#FFB800" />
          <Text style={styles.xpCelebrationText}>+5 XP</Text>
        </Animated.View>
      )}

      {/* Step Overview */}
      <View style={styles.stepOverview}>
        <Text style={styles.overviewTitle}>All Steps</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepsList}>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepItem,
                index === currentStep && styles.activeStepItem,
                step.completed && styles.completedStepItem,
              ]}
              onPress={() => {
                if (index !== currentStep) {
                  setCurrentStep(index);
                  setTimeRemaining(steps[index]?.duration || 0);
                  setIsPlaying(false);
                }
              }}>
              <View style={[
                styles.stepDot,
                index === currentStep && styles.activeStepDot,
                step.completed && styles.completedStepDot,
              ]}>
                {step.completed ? (
                  <CheckCircle size={12} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepDotText}>{index + 1}</Text>
                )}
              </View>
              <Text style={[
                styles.stepItemText,
                index === currentStep && styles.activeStepItemText,
                step.completed && styles.completedStepItemText,
              ]} numberOfLines={2}>
                {step.instruction}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Rating Modal */}
      <RecipeRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        recipeName={recipe?.title || 'this recipe'}
        recipeId={recipe?.id || 'temp-id'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#2D1B69',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1B69',
    letterSpacing: -0.5,
  },
  voiceButton: {
    padding: 8,
  },
  recipeHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1B69',
    letterSpacing: -0.5,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  xpPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpPreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5E7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
  },
  claimPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 12,
    gap: 12,
  },
  claimPreviewContent: {
    flex: 1,
  },
  claimPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
  },
  claimPreviewSubtitle: {
    fontSize: 12,
    color: '#FFB800',
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  stepBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  instructionContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  stepInstruction: {
    fontSize: 22,
    lineHeight: 32,
    color: '#2D1B69',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  stepNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepNavText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D1B69',
  },
  disabledButton: {
    opacity: 0.3,
  },
  disabledText: {
    color: '#C7C7CC',
  },
  completeStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  xpCelebration: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFB800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#FFB800',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  xpCelebrationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1B69',
  },
  stepOverview: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  stepsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  stepItem: {
    width: 140,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  activeStepItem: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF9F7',
  },
  completedStepItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF4',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E5E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeStepDot: {
    backgroundColor: '#FF6B35',
  },
  completedStepDot: {
    backgroundColor: '#4CAF50',
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  stepItemText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  activeStepItemText: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  completedStepItemText: {
    color: '#4CAF50',
  },
  headerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTimerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    minWidth: 50,
    textAlign: 'center',
  },
  headerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPauseButton: {
    backgroundColor: '#2D1B69',
  },
});

export default CookModeScreen;

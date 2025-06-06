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
  Modal,
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
  X,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGamification, XP_VALUES} from '../context/GamificationContext';
import RecipeRatingModal from '../components/RecipeRatingModal';

interface CookingStep {
  id: number;
  instruction: string;
  duration?: number; // in seconds
  completed: boolean;
  tips?: string;
  temperature?: string;
  time?: number; // in minutes
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

  // Convert recipe instructions to cooking steps
  const initializeSteps = (recipeInstructions: any[]): CookingStep[] => {
    if (!recipeInstructions || recipeInstructions.length === 0) {
      console.warn('⚠️ No recipe instructions found, using fallback steps');
      // Fallback steps if no instructions available
      return [
        {
          id: 1,
          instruction: 'Follow the recipe instructions as provided.',
          duration: 300,
          completed: false,
        },
      ];
    }

    return recipeInstructions.map((instruction, index) => ({
      id: instruction.step || index + 1,
      instruction: instruction.instruction || instruction,
      duration: instruction.time ? instruction.time * 60 : 300, // Convert minutes to seconds, default 5 min
      completed: false,
      tips: instruction.tips,
      temperature: instruction.temperature,
      time: instruction.time,
    }));
  };

  const [steps, setSteps] = useState<CookingStep[]>(() => {
    console.log('🧑‍🍳 Initializing recipe with instructions:', recipe?.instructions);
    return initializeSteps(recipe?.instructions || []);
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(steps[0]?.duration || 0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isRecipeClaimed, setIsRecipeClaimed] = useState(false);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [showAllStepsModal, setShowAllStepsModal] = useState(false);

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

  const progress = ((completedSteps + (steps[currentStep]?.completed ? 1 : 0)) / steps.length) * 100;
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
      {/* CONSOLIDATED HEADER WITH BLUE BACKGROUND */}
      <View style={styles.consolidatedHeader}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Cook Mode</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {recipe?.title || 'Recipe'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Timer - Only show if step has duration */}
          {currentStepData?.duration && (
            <View style={styles.compactTimer}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={handlePlayPause}>
                {isPlaying ? (
                  <Pause size={12} color="#FFFFFF" />
                ) : (
                  <Play size={12} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Voice toggle - Compact */}
          <TouchableOpacity onPress={toggleVoice} style={styles.compactVoiceButton}>
            {voiceEnabled ? (
              <Volume2 size={18} color="#FF6B35" />
            ) : (
              <VolumeX size={18} color="rgba(255, 255, 255, 0.6)" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONFIDENCE-BUILDING PROGRESS */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Cooking Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
        
        <View style={styles.enhancedProgressBar}>
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
          
          {/* Progress Milestones */}
          <View style={styles.progressMilestones}>
            {Array.from({length: steps.length}, (_, i) => (
              <View 
                key={i}
                style={[
                  styles.milestone,
                  i < completedSteps && styles.milestoneCompleted,
                  i === currentStep && styles.milestoneCurrent,
                ]}
              />
            ))}
          </View>
        </View>
        
        {progress > 25 && (
          <Text style={styles.encouragementText}>
            {progress < 50 ? "Great start! 🔥" : 
             progress < 75 ? "You're doing amazing! 👨‍🍳" : 
             "Almost finished! 🌟"}
          </Text>
        )}
      </View>

      {/* HERO STEP CONTENT */}
      <View style={styles.heroStepArea}>
        <Animated.View 
          style={[
            styles.heroStepCard,
            {transform: [{translateX: stepTranslateX}]}
          ]}>
          
          {/* Step Number Badge */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {currentStep + 1}</Text>
          </View>
          
          <ScrollView 
            style={styles.heroInstructionContainer}
            contentContainerStyle={styles.heroInstructionContent}
            showsVerticalScrollIndicator={false}>
            
            {/* HERO INSTRUCTION - Large, prominent text with delight */}
            <Animated.Text 
              style={[
                styles.heroInstruction,
                {transform: [{scale: stepTranslateX.interpolate({
                  inputRange: [-30, 0, 30],
                  outputRange: [0.98, 1, 0.98],
                  extrapolate: 'clamp'
                })}]}
              ]}>
              {currentStepData?.instruction}
            </Animated.Text>
            
            {/* Cooking Confidence Indicator */}
            <View style={styles.confidenceIndicator}>
              <View style={styles.confidenceIcon}>
                <Text style={styles.confidenceEmoji}>
                  {currentStep === 0 ? '👨‍🍳' : 
                   currentStep === steps.length - 1 ? '🌟' : 
                   progress > 50 ? '🔥' : '💪'}
                </Text>
              </View>
              <Text style={styles.confidenceText}>
                {currentStep === 0 ? "Let's start cooking!" : 
                 currentStep === steps.length - 1 ? "Final step - you've got this!" : 
                 progress > 50 ? "You're on fire!" : "Keep it up!"}
              </Text>
            </View>
            
            {/* Contextual Info Row - Temperature & Time */}
            {(currentStepData?.temperature || currentStepData?.time) && (
              <View style={styles.contextualInfo}>
                {currentStepData.temperature && (
                  <View style={styles.infoChip}>
                    <Text style={styles.infoIcon}>🌡️</Text>
                    <Text style={styles.infoText}>{currentStepData.temperature}</Text>
                  </View>
                )}
                {currentStepData.time && (
                  <View style={styles.infoChip}>
                    <Text style={styles.infoIcon}>⏱️</Text>
                    <Text style={styles.infoText}>{currentStepData.time} min</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Chef's Tip - More subtle but accessible */}
            {currentStepData?.tips && (
              <View style={styles.chefsTip}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipLabel}>Chef's Tip</Text>
                </View>
                <Text style={styles.tipText}>{currentStepData.tips}</Text>
              </View>
            )}
            
            {/* Confidence Building - Show what's coming next */}
            {currentStep < steps.length - 1 && (
              <View style={styles.nextStepPreview}>
                <Text style={styles.nextStepLabel}>Coming up next:</Text>
                <Text style={styles.nextStepText} numberOfLines={2}>
                  {steps[currentStep + 1]?.instruction}
                </Text>
              </View>
            )}
            
            {/* Step Completion Celebration */}
            {currentStepData?.completed && (
              <View style={styles.stepCompletedBanner}>
                <CheckCircle size={20} color="#4CAF50" />
                <Text style={styles.stepCompletedText}>Step Complete! Well done! 🎉</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* COMPACT NAVIGATION - Reduced size */}
      <View style={styles.compactNavigationContainer}>
        {/* Quick Access Strip */}
        <View style={styles.quickAccessStrip}>
          <TouchableOpacity
            style={styles.quickAccessChip}
            onPress={() => setShowIngredientsModal(true)}>
            <Text style={styles.quickAccessIcon}>🥘</Text>
            <Text style={styles.quickAccessText}>Ingredients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAccessChip}
            onPress={() => setShowAllStepsModal(true)}>
            <Text style={styles.quickAccessIcon}>📋</Text>
            <Text style={styles.quickAccessText}>All Steps</Text>
          </TouchableOpacity>
        </View>

        {/* Main Navigation Row */}
        <View style={styles.mainNavigation}>
          {/* Previous Button - Compact when available */}
          <TouchableOpacity
            style={[
              styles.compactNavButton,
              currentStep === 0 && styles.navButtonDisabled,
            ]}
            onPress={handlePreviousStep}
            disabled={currentStep === 0}>
            <ChevronLeft size={20} color={currentStep === 0 ? '#C7C7CC' : '#2D1B69'} />
            <Text style={[
              styles.compactNavText,
              currentStep === 0 && styles.navTextDisabled
            ]}>Previous</Text>
          </TouchableOpacity>

          {/* HERO ACTION BUTTON - Compact with proper text fitting */}
          {currentStep === steps.length - 1 ? (
            <TouchableOpacity
              style={styles.compactCompleteButton}
              onPress={handleStepComplete}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.compactButtonText}>Complete</Text>
              <Text style={styles.compactXpText}>+{potentialXP}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.compactNextButton}
              onPress={!currentStepData?.duration ? handleStepComplete : handleNextStep}>
              <Text style={styles.compactButtonText}>
                {!currentStepData?.duration ? '✓ Done' : 'Next Step'}
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Full-Screen Ingredients Modal */}
      <Modal visible={showIngredientsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ingredients</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowIngredientsModal(false)}>
              <X size={24} color="#2D1B69" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fullModalBody} contentContainerStyle={styles.modalContent}>
            {recipe?.ingredients?.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>
                  {typeof ingredient === 'string' 
                    ? ingredient 
                    : `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name || ingredient}`.trim()
                  }
                </Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Full-Screen All Steps Modal */}
      <Modal visible={showAllStepsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Steps</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAllStepsModal(false)}>
              <X size={24} color="#2D1B69" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fullModalBody} contentContainerStyle={styles.modalContent}>
            {steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepOverviewItem,
                  index === currentStep && styles.activeStepOverview,
                  step.completed && styles.completedStepOverview,
                ]}
                onPress={() => {
                  setCurrentStep(index);
                  setTimeRemaining(steps[index]?.duration || 0);
                  setIsPlaying(false);
                  setShowAllStepsModal(false);
                }}>
                <View style={styles.stepOverviewNumber}>
                  {step.completed ? (
                    <CheckCircle size={20} color="#4CAF50" />
                  ) : (
                    <View style={[
                      styles.stepNumberCircle,
                      index === currentStep && styles.activeStepNumberCircle
                    ]}>
                      <Text style={[
                        styles.stepNumberText,
                        index === currentStep && styles.activeStepNumber
                      ]}>{index + 1}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.stepOverviewContent}>
                  <Text style={[
                    styles.stepOverviewText,
                    index === currentStep && styles.activeStepText,
                    step.completed && styles.completedStepText,
                  ]}>
                    {step.instruction}
                  </Text>
                  {(step.temperature || step.time) && (
                    <View style={styles.stepOverviewMeta}>
                      {step.temperature && (
                        <Text style={styles.stepMetaText}>🌡️ {step.temperature}</Text>
                      )}
                      {step.time && (
                        <Text style={styles.stepMetaText}>⏱️ {step.time} min</Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* XP Celebration */}
      {showXPCelebration && (
        <Animated.View 
          style={[
            styles.xpCelebration,
            {transform: [{scale: xpCelebrationScale}]}
          ]}>
          <Sparkles size={30} color="#FFB800" />
          <Text style={styles.xpCelebrationText}>+5 XP</Text>
        </Animated.View>
      )}

      {/* Claim Recipe Preview */}
      {recipe?.isGenerated && !isRecipeClaimed && completedSteps >= Math.floor(steps.length / 2) && (
        <Animated.View style={[styles.claimPreview, {transform: [{scale: claimPreviewScale}]}]}>
          <Trophy size={16} color="#FFB800" />
          <Text style={styles.claimPreviewText}>Claim recipe after cooking! +{XP_VALUES.CLAIM_RECIPE} XP</Text>
        </Animated.View>
      )}

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
  // CONSOLIDATED HEADER STYLES
  consolidatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2D1B69',
  },
  headerBackButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'center',
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactVoiceButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  // CONFIDENCE-BUILDING PROGRESS STYLES
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  enhancedProgressBar: {
    height: 8,
    backgroundColor: '#E5E5E7',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressMilestones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
  },
  milestone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  milestoneCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  milestoneCurrent: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
    transform: [{scale: 1.2}],
  },
  encouragementText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'center',
  },
  // CONFIDENCE BUILDING ELEMENTS
  nextStepPreview: {
    backgroundColor: 'rgba(45, 27, 105, 0.04)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2D1B69',
  },
  nextStepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextStepText: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 20,
  },
  stepCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  stepCompletedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // HERO STEP AREA - The star of the show
  heroStepArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroStepCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#2D1B69',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(45, 27, 105, 0.08)',
  },
  stepBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#2D1B69',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroInstructionContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 20,
  },
  heroInstructionContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  // HERO INSTRUCTION - Large, readable, central
  heroInstruction: {
    fontSize: 28,
    lineHeight: 40,
    color: '#2D1B69',
    fontWeight: '500',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 20,
  },
  // COOKING CONFIDENCE INDICATOR
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  confidenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceEmoji: {
    fontSize: 18,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 0.3,
  },
  // CONTEXTUAL INFO - Temperature & Time chips
  contextualInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  // CHEF'S TIP - Subtle but accessible
  chefsTip: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5A5A5A',
  },
  // COMPACT NAVIGATION STYLES
  compactNavigationContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  quickAccessStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  quickAccessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  quickAccessIcon: {
    fontSize: 14,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B69',
  },
  mainNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // COMPACT NAVIGATION BUTTONS
  compactNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F8FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    flex: 0.35,
  },
  compactNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  navButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  navTextDisabled: {
    color: '#C7C7CC',
  },
  // COMPACT ACTION BUTTONS
  compactCompleteButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  compactNextButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  compactXpText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  // FULL-SCREEN MODAL STYLES
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1B69',
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#F8F8FF',
    borderRadius: 20,
  },
  fullModalBody: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginTop: 8,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#2D1B69',
  },
  stepOverviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  activeStepOverview: {
    backgroundColor: '#FFF9F7',
    borderColor: '#FF6B35',
  },
  completedStepOverview: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderColor: '#4CAF50',
  },
  stepOverviewNumber: {
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8F8FF',
    borderWidth: 2,
    borderColor: '#E5E5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepNumberCircle: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B69',
  },
  activeStepNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepOverviewContent: {
    flex: 1,
  },
  stepOverviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D1B69',
    marginBottom: 4,
  },
  activeStepText: {
    fontWeight: '600',
  },
  completedStepText: {
    color: '#8E8E93',
  },
  stepOverviewMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  stepMetaText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
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
  claimPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
  },
});

export default CookModeScreen;

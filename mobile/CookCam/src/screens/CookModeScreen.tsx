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
      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#2D1B69" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.recipeTitle} numberOfLines={1}>
            {recipe?.title || 'Recipe'}
          </Text>
          <Text style={styles.stepCounter}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {currentStepData?.duration && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={handlePlayPause}>
                {isPlaying ? (
                  <Pause size={14} color="#FFFFFF" />
                ) : (
                  <Play size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={toggleVoice} style={styles.voiceButton}>
            {voiceEnabled ? (
              <Volume2 size={20} color="#FF6B35" />
            ) : (
              <VolumeX size={20} color="#8E8E93" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Minimal Progress Bar */}
      <View style={styles.progressSection}>
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
        <View style={styles.progressDetails}>
          <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
          <View style={styles.xpBadge}>
            <Sparkles size={12} color="#FFB800" />
            <Text style={styles.xpText}>+75 XP</Text>
          </View>
        </View>
      </View>

      {/* MAIN STEP AREA - This gets most of the screen space */}
      <View style={styles.mainStepArea}>
        <Animated.View 
          style={[
            styles.stepCard,
            {transform: [{translateX: stepTranslateX}]}
          ]}>
          
          {/* Current Step Instruction - This is now the focus */}
          <ScrollView 
            style={styles.instructionContainer}
            contentContainerStyle={styles.instructionContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.stepInstruction}>
              {currentStepData?.instruction}
            </Text>
            
            {/* Step tips if available */}
            {currentStepData?.tips && (
              <View style={styles.tipContainer}>
                <Text style={styles.tipLabel}>💡 Tip:</Text>
                <Text style={styles.tipText}>{currentStepData.tips}</Text>
              </View>
            )}
            
            {/* Temperature and time info if available */}
            {(currentStepData?.temperature || currentStepData?.time) && (
              <View style={styles.stepMetadata}>
                {currentStepData.temperature && (
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>🌡️ {currentStepData.temperature}</Text>
                  </View>
                )}
                {currentStepData.time && (
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>⏱️ {currentStepData.time} min</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Bottom Navigation Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStep === 0 && styles.disabledButton,
          ]}
          onPress={handlePreviousStep}
          disabled={currentStep === 0}>
          <ChevronLeft size={20} color={currentStep === 0 ? '#C7C7CC' : '#2D1B69'} />
          <Text style={[
            styles.navButtonText,
            currentStep === 0 && styles.disabledText
          ]}>Previous</Text>
        </TouchableOpacity>

        {/* Complete/Next Button */}
        {currentStep === steps.length - 1 ? (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleStepComplete}>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>Complete Recipe</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={!currentStepData?.duration ? handleStepComplete : handleNextStep}>
            <Text style={styles.nextButtonText}>
              {!currentStepData?.duration ? 'Mark Done' : 'Next Step'}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Collapsible Sections Access */}
      <View style={styles.quickAccess}>
        <TouchableOpacity
          style={styles.accessButton}
          onPress={() => setShowIngredientsModal(true)}>
          <Text style={styles.accessButtonText}>Ingredients</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.accessButton}
          onPress={() => setShowAllStepsModal(true)}>
          <Text style={styles.accessButtonText}>All Steps</Text>
        </TouchableOpacity>
      </View>

      {/* XP Celebration Animation */}
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

      {/* Claim Recipe Preview (for generated recipes) */}
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1B69',
    letterSpacing: -0.5,
  },
  stepCounter: {
    fontSize: 14,
    color: '#8E8E93',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    minWidth: 50,
    textAlign: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    padding: 8,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
  },
  mainStepArea: {
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
  instructionContainer: {
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
  tipContainer: {
    padding: 12,
    backgroundColor: '#FFF9F7',
    borderRadius: 12,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
  },
  tipText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  stepMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFF9F7',
    borderRadius: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonText: {
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
  completeButton: {
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
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  quickAccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  accessButton: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  accessButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
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

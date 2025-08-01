/**
 * CookMode Types and Interfaces
 * Shared types for cooking mode functionality
 */

export interface CookingStep {
  id: number;
  instruction: string;
  duration?: number; // in seconds
  completed: boolean;
  tips?: string;
  temperature?: string;
  time?: number; // in minutes
}

export interface CookModeScreenProps {
  navigation: any;
  route: any;
}

export interface Recipe {
  id?: string;
  title?: string;
  instructions?: any[];
  ingredients?: any[];
  isGenerated?: boolean;
}

export interface CookingTip {
  emoji: string;
  tip: string;
}

export interface CookModeHeaderProps {
  onBack: () => void;
  recipeTitle?: string;
  currentStepData?: CookingStep;
  timeRemaining: number;
  isPlaying: boolean;
  voiceEnabled: boolean;
  onPlayPause: () => void;
  onToggleVoice: () => void;
  formatTime: (seconds: number) => string;
}

export interface ProgressSectionProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  progressAnim: any; // Animated.Value
}

export interface StepCardProps {
  currentStepData?: CookingStep;
  currentStep: number;
  totalSteps: number;
  stepTranslateX: any; // Animated.Value
  onShowIngredients: () => void;
  onShowAllSteps: () => void;
  nextStepPreview?: string;
}

export interface NavigationControlsProps {
  currentStep: number;
  totalSteps: number;
  currentStepData?: CookingStep;
  cookingTip?: CookingTip;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  potentialXP: number;
}

export interface IngredientsModalProps {
  visible: boolean;
  ingredients?: any[];
  onClose: () => void;
}

export interface AllStepsModalProps {
  visible: boolean;
  steps: CookingStep[];
  currentStep: number;
  onClose: () => void;
  onStepSelect: (stepIndex: number) => void;
}

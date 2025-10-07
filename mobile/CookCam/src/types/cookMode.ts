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
  navigation: unknown;
  route: unknown;
}

export interface Recipe {
  id?: string;
  title?: string;
  instructions?: unknown[];
  ingredients?: unknown[];
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
  formatTime: (_seconds: number) => string;
}

export interface ProgressSectionProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  progressAnim: unknown; // Animated.Value
}

export interface StepCardProps {
  currentStepData?: CookingStep;
  currentStep: number;
  totalSteps: number;
  stepTranslateX: unknown; // Animated.Value
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
  ingredients?: unknown[];
  onClose: () => void;
}

export interface AllStepsModalProps {
  visible: boolean;
  steps: CookingStep[];
  currentStep: number;
  onClose: () => void;
  onStepSelect: (_stepIndex: number) => void;
}

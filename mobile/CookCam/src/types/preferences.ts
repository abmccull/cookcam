/**
 * Preferences Screen Types
 * TypeScript interfaces for preference quiz components
 */

export interface ServingOption {
  id: string;
  label: string;
  value: number;
  icon: string;
  isCustom?: boolean;
}

export interface Appliance {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  selected: boolean;
}

export interface QuizStep {
  id: string;
  title: string;
  subtitle: string;
  type: "single" | "multi" | "serving" | "appliances";
  options?: QuizOption[];
}

export interface QuizOption {
  label: string;
  subtitle?: string;
  value: string;
}

export interface PreferencesState {
  currentStep: number;
  mealType: string;
  selectedServing: ServingOption;
  customServingAmount: string;
  mealPrepEnabled: boolean;
  mealPrepPortions: number;
  appliances: Appliance[];
  cookingTime: string;
  difficulty: string;
  dietary: string[];
  cuisine: string[];
  hasCompletedPreferences: boolean;
}

export interface PreferencesScreenProps {
  navigation: unknown;
  route: {
    params: {
      ingredients: unknown[];
      imageUri?: string;
    };
  };
}

// Component Props
export interface QuizProgressProps {
  currentStep: number;
  totalSteps: number;
  progressAnim: unknown;
}

export interface QuizNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export interface ServingStepProps {
  servingOptions: ServingOption[];
  selectedServing: ServingOption;
  mealPrepEnabled: boolean;
  mealPrepPortions: number;
  onServingSelection: (_option: ServingOption) => void;
  onToggleMealPrep: () => void;
  onMealPrepPortions: (_portions: number) => void;
}

export interface AppliancesStepProps {
  appliances: Appliance[];
  onToggleAppliance: (_applianceId: string) => void;
}

export interface MultiChoiceStepProps {
  options: string[];
  selectedOptions: string[];
  onToggleOption: (_option: string) => void;
  showBadgeHint?: boolean;
}

export interface SingleChoiceStepProps {
  options: QuizOption[];
  selectedValue: string;
  onSelectOption: (_value: string) => void;
}

export interface CustomServingModalProps {
  visible: boolean;
  customAmount: string;
  onAmountChange: (_amount: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

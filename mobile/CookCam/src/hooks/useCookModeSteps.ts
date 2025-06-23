/**
 * Cook Mode Steps Hook
 * Handles step navigation, completion tracking, and step data management
 */

import { useState, useCallback, useMemo } from 'react';
import { CookingStep } from '../types/cookMode';
import logger from '../utils/logger';

interface UseCookModeStepsProps {
  initialSteps: CookingStep[];
}

export const useCookModeSteps = ({ initialSteps }: UseCookModeStepsProps) => {
  const [steps, setSteps] = useState<CookingStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);

  // Current step data
  const currentStepData = useMemo(() => {
    return steps[currentStep] || null;
  }, [steps, currentStep]);

  // Next step preview
  const nextStepPreview = useMemo(() => {
    if (currentStep < steps.length - 1) {
      return steps[currentStep + 1]?.instruction;
    }
    return null;
  }, [steps, currentStep]);

  // Progress calculation
  const progress = useMemo(() => {
    return steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
  }, [currentStep, steps.length]);

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      logger.debug('🔄 Advanced to next step:', currentStep + 1);
    }
  }, [currentStep, steps.length]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      logger.debug('🔄 Went back to step:', currentStep - 1);
    }
  }, [currentStep]);

  // Jump to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      logger.debug('🔄 Jumped to step:', stepIndex);
    }
  }, [steps.length]);

  // Mark current step as completed
  const completeCurrentStep = useCallback(() => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[currentStep]) {
        newSteps[currentStep] = {
          ...newSteps[currentStep],
          completed: true,
        };
      }
      return newSteps;
    });

    setCompletedSteps(prev => Math.max(prev, currentStep + 1));
    logger.debug('✅ Completed step:', currentStep);
  }, [currentStep]);

  // Reset all steps
  const resetSteps = useCallback(() => {
    setSteps(prevSteps => 
      prevSteps.map(step => ({ ...step, completed: false }))
    );
    setCurrentStep(0);
    setCompletedSteps(0);
    logger.debug('🔄 Reset all steps');
  }, []);

  // Check if all steps are completed
  const isAllStepsCompleted = useMemo(() => {
    return steps.every(step => step.completed);
  }, [steps]);

  // Check if current step is the last step
  const isLastStep = useMemo(() => {
    return currentStep === steps.length - 1;
  }, [currentStep, steps.length]);

  // Check if can go to next step
  const canGoNext = useMemo(() => {
    return currentStep < steps.length - 1;
  }, [currentStep, steps.length]);

  // Check if can go to previous step
  const canGoPrevious = useMemo(() => {
    return currentStep > 0;
  }, [currentStep]);

  return {
    // State
    steps,
    currentStep,
    completedSteps,
    currentStepData,
    nextStepPreview,
    progress,
    
    // Navigation
    goToNextStep,
    goToPreviousStep,
    goToStep,
    
    // Step management
    completeCurrentStep,
    resetSteps,
    
    // Status checks
    isAllStepsCompleted,
    isLastStep,
    canGoNext,
    canGoPrevious,
    
    // Metadata
    totalSteps: steps.length,
  };
}; 
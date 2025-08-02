// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import { renderHook, act } from '@testing-library/react-hooks';
import { useCookModeSteps } from '../../hooks/useCookModeSteps';
import { CookingStep } from '../../types/cookMode';

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('useCookModeSteps', () => {
  const mockSteps: CookingStep[] = [
    {
      instruction: 'Preheat oven to 350°F',
      duration: 300,
      type: 'prep' as const,
      completed: false,
    },
    {
      instruction: 'Mix dry ingredients',
      duration: 120,
      type: 'active' as const,
      completed: false,
    },
    {
      instruction: 'Add wet ingredients',
      duration: 180,
      type: 'active' as const,
      completed: false,
    },
    {
      instruction: 'Bake for 25 minutes',
      duration: 1500,
      type: 'passive' as const,
      completed: false,
    },
  ];

  describe('Initial State', () => {
    it('should initialize with provided steps', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.steps).toEqual(mockSteps);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.completedSteps).toBe(0);
    });

    it('should set current step data correctly', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.currentStepData).toEqual(mockSteps[0]);
    });

    it('should handle empty steps array', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: [] })
      );

      expect(result.current.steps).toEqual([]);
      expect(result.current.currentStepData).toBeNull();
      expect(result.current.progress).toBe(0);
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.currentStepData).toEqual(mockSteps[1]);
    });

    it('should not navigate beyond last step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      // Go to last step
      act(() => {
        result.current.goToStep(3);
      });

      // Try to go beyond
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(3);
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      // Go to step 2
      act(() => {
        result.current.goToStep(2);
      });

      // Go back
      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.currentStepData).toEqual(mockSteps[1]);
    });

    it('should not navigate before first step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStep).toBe(0);
    });

    it('should jump to specific step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStep).toBe(2);
      expect(result.current.currentStepData).toEqual(mockSteps[2]);
    });

    it('should not jump to invalid step index', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToStep(-1);
      });
      expect(result.current.currentStep).toBe(0);

      act(() => {
        result.current.goToStep(10);
      });
      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('Step Completion', () => {
    it('should mark current step as completed', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.completeCurrentStep();
      });

      expect(result.current.steps[0].completed).toBe(true);
      expect(result.current.completedSteps).toBe(1);
    });

    it('should track completed steps count', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.completeCurrentStep();
        result.current.goToNextStep();
        result.current.completeCurrentStep();
      });

      expect(result.current.completedSteps).toBe(2);
    });

    it('should maintain max completed steps', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToStep(2);
        result.current.completeCurrentStep();
      });

      expect(result.current.completedSteps).toBe(3);

      act(() => {
        result.current.goToStep(1);
        result.current.completeCurrentStep();
      });

      // Should still be 3, not decrease
      expect(result.current.completedSteps).toBe(3);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.progress).toBe(25); // 1/4 * 100

      act(() => {
        result.current.goToNextStep();
      });
      expect(result.current.progress).toBe(50); // 2/4 * 100

      act(() => {
        result.current.goToNextStep();
      });
      expect(result.current.progress).toBe(75); // 3/4 * 100

      act(() => {
        result.current.goToNextStep();
      });
      expect(result.current.progress).toBe(100); // 4/4 * 100
    });

    it('should handle empty steps progress', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: [] })
      );

      expect(result.current.progress).toBe(0);
    });
  });

  describe('Next Step Preview', () => {
    it('should show next step preview', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.nextStepPreview).toBe('Mix dry ingredients');
    });

    it('should return null for last step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.nextStepPreview).toBeNull();
    });

    it('should update preview when navigating', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.nextStepPreview).toBe('Add wet ingredients');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all steps', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      // Complete some steps and navigate
      act(() => {
        result.current.completeCurrentStep();
        result.current.goToNextStep();
        result.current.completeCurrentStep();
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(2);
      expect(result.current.completedSteps).toBe(2);

      // Reset
      act(() => {
        result.current.resetSteps();
      });

      expect(result.current.currentStep).toBe(0);
      expect(result.current.completedSteps).toBe(0);
      expect(result.current.steps.every(step => !step.completed)).toBe(true);
    });
  });

  describe('Completion Status', () => {
    it('should detect when all steps are completed', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.isAllStepsCompleted).toBe(false);

      // Complete all steps
      act(() => {
        for (let i = 0; i < mockSteps.length; i++) {
          result.current.goToStep(i);
          result.current.completeCurrentStep();
        }
      });

      expect(result.current.isAllStepsCompleted).toBe(true);
    });

    it('should detect last step', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.isLastStep).toBe(false);

      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.isLastStep).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single step', () => {
      const singleStep: CookingStep[] = [{
        instruction: 'Single step',
        duration: 60,
        type: 'active',
        completed: false,
      }];

      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: singleStep })
      );

      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(true);
      expect(result.current.progress).toBe(100);
      expect(result.current.nextStepPreview).toBeNull();
    });

    it('should handle steps with all completed status', () => {
      const completedSteps: CookingStep[] = mockSteps.map(step => ({
        ...step,
        completed: true,
      }));

      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: completedSteps })
      );

      expect(result.current.isAllStepsCompleted).toBe(true);
    });

    it('should handle navigation in empty steps', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: [] })
      );

      act(() => {
        result.current.goToNextStep();
        result.current.goToPreviousStep();
        result.current.goToStep(0);
        result.current.completeCurrentStep();
      });

      // Should not crash
      expect(result.current.currentStep).toBe(0);
    });

    it('should maintain step independence', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      act(() => {
        result.current.goToStep(1);
        result.current.completeCurrentStep();
      });

      // Only step 1 should be completed
      expect(result.current.steps[0].completed).toBe(false);
      expect(result.current.steps[1].completed).toBe(true);
      expect(result.current.steps[2].completed).toBe(false);
    });
  });

  describe('Step Types', () => {
    it('should handle different step types', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      expect(result.current.steps[0].type).toBe('prep');
      expect(result.current.steps[1].type).toBe('active');
      expect(result.current.steps[3].type).toBe('passive');
    });

    it('should maintain step type through completion', () => {
      const { result } = renderHook(() => 
        useCookModeSteps({ initialSteps: mockSteps })
      );

      const originalType = result.current.steps[0].type;

      act(() => {
        result.current.completeCurrentStep();
      });

      expect(result.current.steps[0].type).toBe(originalType);
    });
  });
});
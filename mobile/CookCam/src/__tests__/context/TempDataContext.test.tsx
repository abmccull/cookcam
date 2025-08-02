// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { TempDataProvider, useTempData } from '../../context/TempDataContext';
import type { TempScanData, TempRecipeData, TempUserPreferences } from '../../context/TempDataContext';

describe('TempDataContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TempDataProvider>{children}</TempDataProvider>
  );

  const mockScanData: TempScanData = {
    imageUrl: 'https://example.com/image.jpg',
    ingredients: [
      { name: 'Tomato', confidence: 0.95 },
      { name: 'Onion', confidence: 0.85 },
    ],
    scanDate: new Date('2024-01-01'),
  };

  const mockRecipeData: TempRecipeData = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A delicious test recipe',
    cuisineType: 'Italian',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    generateDate: new Date('2024-01-01'),
  };

  const mockUserPreferences: TempUserPreferences = {
    cuisinePreferences: ['Italian', 'Mexican'],
    dietaryRestrictions: ['Vegetarian'],
    cookingExperience: 'intermediate',
    preferredCookTime: 30,
    servingSize: 4,
  };

  describe('Initial State', () => {
    it('should have initial empty state', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      expect(result.current.tempData.tempScanData).toBeNull();
      expect(result.current.tempData.tempRecipeHistory).toEqual([]);
      expect(result.current.tempData.tempUserPreferences).toBeNull();
      expect(result.current.tempData.selectedPlan).toBeNull();
    });
  });

  describe('setTempScanData', () => {
    it('should set scan data', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempScanData(mockScanData);
      });

      expect(result.current.tempData.tempScanData).toEqual(mockScanData);
    });

    it('should replace existing scan data', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempScanData(mockScanData);
      });

      const newScanData: TempScanData = {
        ...mockScanData,
        imageUrl: 'https://example.com/new-image.jpg',
      };

      act(() => {
        result.current.setTempScanData(newScanData);
      });

      expect(result.current.tempData.tempScanData).toEqual(newScanData);
    });
  });

  describe('addTempRecipe', () => {
    it('should add a recipe to history', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.addTempRecipe(mockRecipeData);
      });

      expect(result.current.tempData.tempRecipeHistory).toHaveLength(1);
      expect(result.current.tempData.tempRecipeHistory[0]).toEqual(mockRecipeData);
    });

    it('should add new recipes to the beginning', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      const recipe1 = { ...mockRecipeData, id: 'recipe-1' };
      const recipe2 = { ...mockRecipeData, id: 'recipe-2' };

      act(() => {
        result.current.addTempRecipe(recipe1);
        result.current.addTempRecipe(recipe2);
      });

      expect(result.current.tempData.tempRecipeHistory[0].id).toBe('recipe-2');
      expect(result.current.tempData.tempRecipeHistory[1].id).toBe('recipe-1');
    });

    it('should keep only last 10 recipes', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      // Add 12 recipes
      for (let i = 0; i < 12; i++) {
        act(() => {
          result.current.addTempRecipe({
            ...mockRecipeData,
            id: `recipe-${i}`,
          });
        });
      }

      expect(result.current.tempData.tempRecipeHistory).toHaveLength(10);
      expect(result.current.tempData.tempRecipeHistory[0].id).toBe('recipe-11');
      expect(result.current.tempData.tempRecipeHistory[9].id).toBe('recipe-2');
    });
  });

  describe('setTempUserPreferences', () => {
    it('should set user preferences', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempUserPreferences(mockUserPreferences);
      });

      expect(result.current.tempData.tempUserPreferences).toEqual(mockUserPreferences);
    });

    it('should replace existing preferences', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempUserPreferences(mockUserPreferences);
      });

      const newPreferences: TempUserPreferences = {
        ...mockUserPreferences,
        cookingExperience: 'advanced',
      };

      act(() => {
        result.current.setTempUserPreferences(newPreferences);
      });

      expect(result.current.tempData.tempUserPreferences?.cookingExperience).toBe('advanced');
    });
  });

  describe('setSelectedPlan', () => {
    it('should set consumer plan', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setSelectedPlan('consumer');
      });

      expect(result.current.tempData.selectedPlan).toBe('consumer');
    });

    it('should set creator plan', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setSelectedPlan('creator');
      });

      expect(result.current.tempData.selectedPlan).toBe('creator');
    });

    it('should replace existing plan', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setSelectedPlan('consumer');
      });

      act(() => {
        result.current.setSelectedPlan('creator');
      });

      expect(result.current.tempData.selectedPlan).toBe('creator');
    });
  });

  describe('clearTempData', () => {
    it('should clear all temp data', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      // Set some data
      act(() => {
        result.current.setTempScanData(mockScanData);
        result.current.addTempRecipe(mockRecipeData);
        result.current.setTempUserPreferences(mockUserPreferences);
        result.current.setSelectedPlan('consumer');
      });

      // Verify data is set
      expect(result.current.tempData.tempScanData).not.toBeNull();
      expect(result.current.tempData.tempRecipeHistory).not.toEqual([]);
      expect(result.current.tempData.tempUserPreferences).not.toBeNull();
      expect(result.current.tempData.selectedPlan).not.toBeNull();

      // Clear data
      act(() => {
        result.current.clearTempData();
      });

      // Verify data is cleared
      expect(result.current.tempData.tempScanData).toBeNull();
      expect(result.current.tempData.tempRecipeHistory).toEqual([]);
      expect(result.current.tempData.tempUserPreferences).toBeNull();
      expect(result.current.tempData.selectedPlan).toBeNull();
    });
  });

  describe('exportTempData', () => {
    it('should export current state', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempScanData(mockScanData);
        result.current.addTempRecipe(mockRecipeData);
        result.current.setTempUserPreferences(mockUserPreferences);
        result.current.setSelectedPlan('creator');
      });

      const exportedData = act(() => result.current.exportTempData());

      expect(exportedData).toEqual({
        tempScanData: mockScanData,
        tempRecipeHistory: [mockRecipeData],
        tempUserPreferences: mockUserPreferences,
        selectedPlan: 'creator',
      });
    });

    it('should export empty state', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      const exportedData = act(() => result.current.exportTempData());

      expect(exportedData).toEqual({
        tempScanData: null,
        tempRecipeHistory: [],
        tempUserPreferences: null,
        selectedPlan: null,
      });
    });
  });

  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return useTempData();
        } catch (error) {
          return error;
        }
      });

      expect(result.current).toBeInstanceOf(Error);
      expect((result.current as Error).message).toContain('TempDataProvider');
    });

    it('should provide context to nested components', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.tempData).toBeDefined();
      expect(result.current.setTempScanData).toBeInstanceOf(Function);
      expect(result.current.addTempRecipe).toBeInstanceOf(Function);
      expect(result.current.setTempUserPreferences).toBeInstanceOf(Function);
      expect(result.current.setSelectedPlan).toBeInstanceOf(Function);
      expect(result.current.clearTempData).toBeInstanceOf(Function);
      expect(result.current.exportTempData).toBeInstanceOf(Function);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempScanData(mockScanData);
      });

      rerender();

      expect(result.current.tempData.tempScanData).toEqual(mockScanData);
    });

    it('should maintain multiple state updates', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        result.current.setTempScanData(mockScanData);
        result.current.addTempRecipe(mockRecipeData);
        result.current.setTempUserPreferences(mockUserPreferences);
        result.current.setSelectedPlan('consumer');
      });

      expect(result.current.tempData.tempScanData).toEqual(mockScanData);
      expect(result.current.tempData.tempRecipeHistory).toHaveLength(1);
      expect(result.current.tempData.tempUserPreferences).toEqual(mockUserPreferences);
      expect(result.current.tempData.selectedPlan).toBe('consumer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ingredients array', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      const scanDataWithNoIngredients: TempScanData = {
        ...mockScanData,
        ingredients: [],
      };

      act(() => {
        result.current.setTempScanData(scanDataWithNoIngredients);
      });

      expect(result.current.tempData.tempScanData?.ingredients).toEqual([]);
    });

    it('should handle empty cuisine preferences', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      const preferencesWithNoCuisines: TempUserPreferences = {
        ...mockUserPreferences,
        cuisinePreferences: [],
      };

      act(() => {
        result.current.setTempUserPreferences(preferencesWithNoCuisines);
      });

      expect(result.current.tempData.tempUserPreferences?.cuisinePreferences).toEqual([]);
    });

    it('should handle recipe with minimal data', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      const minimalRecipe: TempRecipeData = {
        id: 'minimal',
        title: 'Minimal Recipe',
        description: 'Description',
        generateDate: new Date(),
      };

      act(() => {
        result.current.addTempRecipe(minimalRecipe);
      });

      expect(result.current.tempData.tempRecipeHistory[0]).toEqual(minimalRecipe);
      expect(result.current.tempData.tempRecipeHistory[0].cuisineType).toBeUndefined();
    });

    it('should handle rapid state updates', () => {
      const { result } = renderHook(() => useTempData(), { wrapper });

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addTempRecipe({
            ...mockRecipeData,
            id: `rapid-${i}`,
          });
        }
      });

      expect(result.current.tempData.tempRecipeHistory).toHaveLength(5);
    });
  });
});
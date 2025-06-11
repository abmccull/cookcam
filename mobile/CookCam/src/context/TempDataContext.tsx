import React, {createContext, useContext, useState, ReactNode} from 'react';

export interface TempScanData {
  imageUrl: string;
  ingredients: Array<{
    name: string;
    confidence: number;
  }>;
  scanDate: Date;
}

export interface TempRecipeData {
  id: string;
  title: string;
  description: string;
  cuisineType?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  generateDate: Date;
}

export interface TempUserPreferences {
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
  cookingExperience: 'beginner' | 'intermediate' | 'advanced';
  preferredCookTime: number;
  servingSize: number;
}

export interface TempDataState {
  tempScanData: TempScanData | null;
  tempRecipeHistory: TempRecipeData[];
  tempUserPreferences: TempUserPreferences | null;
  selectedPlan: 'consumer' | 'creator' | null;
}

interface TempDataContextType {
  tempData: TempDataState;
  setTempScanData: (data: TempScanData) => void;
  addTempRecipe: (recipe: TempRecipeData) => void;
  setTempUserPreferences: (preferences: TempUserPreferences) => void;
  setSelectedPlan: (plan: 'consumer' | 'creator') => void;
  clearTempData: () => void;
  exportTempData: () => TempDataState;
}

const TempDataContext = createContext<TempDataContextType | undefined>(
  undefined,
);

const initialState: TempDataState = {
  tempScanData: null,
  tempRecipeHistory: [],
  tempUserPreferences: null,
  selectedPlan: null,
};

interface TempDataProviderProps {
  children: ReactNode;
}

export const TempDataProvider: React.FC<TempDataProviderProps> = ({
  children,
}) => {
  const [tempData, setTempData] = useState<TempDataState>(initialState);

  const setTempScanData = (data: TempScanData) => {
    setTempData(prev => ({
      ...prev,
      tempScanData: data,
    }));
  };

  const addTempRecipe = (recipe: TempRecipeData) => {
    setTempData(prev => ({
      ...prev,
      tempRecipeHistory: [recipe, ...prev.tempRecipeHistory.slice(0, 9)], // Keep last 10
    }));
  };

  const setTempUserPreferences = (preferences: TempUserPreferences) => {
    setTempData(prev => ({
      ...prev,
      tempUserPreferences: preferences,
    }));
  };

  const setSelectedPlan = (plan: 'consumer' | 'creator') => {
    setTempData(prev => ({
      ...prev,
      selectedPlan: plan,
    }));
  };

  const clearTempData = () => {
    setTempData(initialState);
  };

  const exportTempData = () => {
    return {...tempData};
  };

  const value = {
    tempData,
    setTempScanData,
    addTempRecipe,
    setTempUserPreferences,
    setSelectedPlan,
    clearTempData,
    exportTempData,
  };

  return (
    <TempDataContext.Provider value={value}>
      {children}
    </TempDataContext.Provider>
  );
};

export const useTempData = (): TempDataContextType => {
  const context = useContext(TempDataContext);
  if (context === undefined) {
    throw new Error('useTempData must be used within a TempDataProvider');
  }
  return context;
};

export default TempDataContext;

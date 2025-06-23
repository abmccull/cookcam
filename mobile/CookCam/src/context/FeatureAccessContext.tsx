/**
 * Feature Access Context
 * Handles feature gates, usage limits, and access control
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from "react";
import { cookCamApi } from "../services/cookCamApi";
import { useSubscriptionState } from "./SubscriptionState";
import logger from "../utils/logger";

// Feature access state
export interface FeatureAccessState {
  featureAccess: Record<string, boolean>;
  usageLimits: Record<string, { used: number; limit: number }>;
  showPaywall: boolean;
  loading: Record<string, boolean>;
}

export type FeatureAccessAction =
  | {
      type: "SET_FEATURE_ACCESS";
      feature: string;
      hasAccess: boolean;
      usage?: { used: number; limit: number };
    }
  | { type: "SET_FEATURE_LOADING"; feature: string; loading: boolean }
  | { type: "SHOW_PAYWALL"; show: boolean }
  | { type: "RESET_FEATURE_ACCESS" };

export interface FeatureAccessContextType {
  state: FeatureAccessState;
  
  // Feature access methods
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  canUseFeature: (feature: string) => boolean;
  getRemainingUsage: (feature: string) => number | null;
  showUpgradePrompt: (feature: string) => void;
  
  // Bulk operations
  refreshAllFeatures: () => Promise<void>;
}

// Initial state
const initialState: FeatureAccessState = {
  featureAccess: {},
  usageLimits: {},
  showPaywall: false,
  loading: {},
};

// Optimized reducer
function featureAccessReducer(
  state: FeatureAccessState,
  action: FeatureAccessAction,
): FeatureAccessState {
  switch (action.type) {
    case "SET_FEATURE_ACCESS": {
      const newFeatureAccess = { ...state.featureAccess };
      const newUsageLimits = { ...state.usageLimits };
      const newLoading = { ...state.loading };

      newFeatureAccess[action.feature] = action.hasAccess;
      if (action.usage) {
        newUsageLimits[action.feature] = action.usage;
      }
      delete newLoading[action.feature];

      return {
        ...state,
        featureAccess: newFeatureAccess,
        usageLimits: newUsageLimits,
        loading: newLoading,
      };
    }

    case "SET_FEATURE_LOADING": {
      const newLoading = { ...state.loading };
      if (action.loading) {
        newLoading[action.feature] = true;
      } else {
        delete newLoading[action.feature];
      }
      return { ...state, loading: newLoading };
    }

    case "SHOW_PAYWALL":
      if (state.showPaywall === action.show) return state;
      return { ...state, showPaywall: action.show };

    case "RESET_FEATURE_ACCESS":
      return initialState;

    default:
      return state;
  }
}

// Context
const FeatureAccessContext = createContext<FeatureAccessContextType | null>(null);

// Provider component
export function FeatureAccessProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(featureAccessReducer, initialState);
  const { state: subscriptionState } = useSubscriptionState();

  // Check if user can access a specific feature
  const checkFeatureAccess = useCallback(async (feature: string): Promise<boolean> => {
    try {
      dispatch({ type: "SET_FEATURE_LOADING", feature, loading: true });
      
      const response = await cookCamApi.checkFeatureAccess(feature);
      if (response.success && response.data) {
        dispatch({
          type: "SET_FEATURE_ACCESS",
          feature,
          hasAccess: response.data.hasAccess,
          usage: response.data.usage,
        });
        return response.data.hasAccess;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to check feature access for ${feature}:`, error);
      dispatch({ type: "SET_FEATURE_LOADING", feature, loading: false });
      return false;
    }
  }, []);

  // Check if feature can be used (cached)
  const canUseFeature = useCallback((feature: string): boolean => {
    return state.featureAccess[feature] ?? false;
  }, [state.featureAccess]);

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback((feature: string): number | null => {
    const usage = state.usageLimits[feature];
    if (!usage) {
      return null;
    }
    return Math.max(0, usage.limit - usage.used);
  }, [state.usageLimits]);

  // Show upgrade prompt
  const showUpgradePrompt = useCallback((feature: string) => {
    dispatch({ type: "SHOW_PAYWALL", show: true });
    // Track analytics
    cookCamApi.trackEvent("paywall_shown", {
      feature,
      trigger: "feature_gate",
    });
  }, []);

  // Refresh all feature access data
  const refreshAllFeatures = useCallback(async () => {
    const features = Object.keys(state.featureAccess);
    await Promise.all(features.map(feature => checkFeatureAccess(feature)));
  }, [state.featureAccess, checkFeatureAccess]);

  // Reset feature access when subscription changes
  useEffect(() => {
    if (subscriptionState.currentSubscription) {
      // Subscription changed, refresh feature access
      refreshAllFeatures();
    } else {
      // No subscription, reset feature access
      dispatch({ type: "RESET_FEATURE_ACCESS" });
    }
  }, [subscriptionState.currentSubscription, refreshAllFeatures]);

  const contextValue = React.useMemo((): FeatureAccessContextType => ({
    state,
    checkFeatureAccess,
    canUseFeature,
    getRemainingUsage,
    showUpgradePrompt,
    refreshAllFeatures,
  }), [state, checkFeatureAccess, canUseFeature, getRemainingUsage, showUpgradePrompt, refreshAllFeatures]);

  return (
    <FeatureAccessContext.Provider value={contextValue}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

// Hook to use feature access context
export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error(
      "useFeatureAccess must be used within a FeatureAccessProvider",
    );
  }
  return context;
}

// Feature gate hook (optimized)
export function useFeatureGate(feature: string) {
  const { state, checkFeatureAccess, showUpgradePrompt } = useFeatureAccess();

  const hasAccess = state.featureAccess[feature] ?? false;
  const usage = state.usageLimits[feature];
  const isLoading = state.loading[feature] ?? false;

  // Check feature access if not already checked
  useEffect(() => {
    if (!(feature in state.featureAccess) && !isLoading) {
      checkFeatureAccess(feature);
    }
  }, [feature, state.featureAccess, isLoading, checkFeatureAccess]);

  const checkAndPrompt = useCallback(() => {
    if (!hasAccess) {
      showUpgradePrompt(feature);
      return false;
    }
    return true;
  }, [hasAccess, showUpgradePrompt, feature]);

  return React.useMemo(() => ({
    hasAccess,
    usage,
    remaining: usage ? Math.max(0, usage.limit - usage.used) : null,
    isLoading,
    checkAndPrompt,
  }), [hasAccess, usage, isLoading, checkAndPrompt]);
} 
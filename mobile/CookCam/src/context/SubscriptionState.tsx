/**
 * Subscription State Context
 * Handles core subscription data and state management only
 */

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { SubscriptionTier, UserSubscription } from "../services/cookCamApi";

// Types for subscription products and status
export interface SubscriptionProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  currency: string;
  title: string;
  description: string;
  tier: "regular" | "creator";
  freeTrialPeriod?: string;
}

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";

// Core subscription state (focused)
export interface SubscriptionState {
  // Basic subscription data
  tiers: SubscriptionTier[];
  products: SubscriptionProduct[];
  currentSubscription: UserSubscription | null;

  // Loading states
  subscriptionLoading: boolean;
  subscriptionError: string | null;

  // Cache timestamp
  lastChecked: number | null;
}

export type SubscriptionAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_TIERS"; tiers: SubscriptionTier[] }
  | { type: "SET_PRODUCTS"; products: SubscriptionProduct[] }
  | { type: "SET_SUBSCRIPTION"; subscription: UserSubscription | null }
  | { type: "UPDATE_LAST_CHECKED" }
  | { type: "RESET_STATE" };

export interface SubscriptionStateContextType {
  state: SubscriptionState;
  dispatch: React.Dispatch<SubscriptionAction>;

  // State utilities
  isSubscribed: () => boolean;
  hasActiveTrial: () => boolean;
  isCreator: () => boolean;
  getCurrentTier: () => SubscriptionTier | null;
}

// Initial state
const initialState: SubscriptionState = {
  tiers: [],
  products: [],
  currentSubscription: null,
  subscriptionLoading: false,
  subscriptionError: null,
  lastChecked: null,
};

// Optimized reducer with proper memoization
// eslint-disable-next-line react-refresh/only-export-components
export function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction,
): SubscriptionState {
  switch (action.type) {
    case "SET_LOADING":
      if (state.subscriptionLoading === action.loading) return state;
      return { ...state, subscriptionLoading: action.loading };

    case "SET_ERROR":
      if (state.subscriptionError === action.error) return state;
      return {
        ...state,
        subscriptionError: action.error,
        subscriptionLoading: false,
      };

    case "SET_TIERS":
      if (state.tiers === action.tiers) return state;
      return { ...state, tiers: action.tiers };

    case "SET_PRODUCTS":
      if (state.products === action.products) return state;
      return { ...state, products: action.products };

    case "SET_SUBSCRIPTION":
      if (state.currentSubscription === action.subscription) return state;
      return {
        ...state,
        currentSubscription: action.subscription,
        lastChecked: Date.now(),
      };

    case "UPDATE_LAST_CHECKED":
      return { ...state, lastChecked: Date.now() };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
}

// Context
const SubscriptionStateContext =
  createContext<SubscriptionStateContextType | null>(null);

// Provider component (lightweight, focused on state only)
export function SubscriptionStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);

  // Memoized utility functions
  const isSubscribed = React.useCallback((): boolean => {
    return (
      state.currentSubscription?.status === "active" ||
      state.currentSubscription?.status === "trial"
    );
  }, [state.currentSubscription?.status]);

  const hasActiveTrial = React.useCallback((): boolean => {
    return (
      (state.currentSubscription?.status === "trial" &&
        state.currentSubscription?.trial_ends_at &&
        new Date(state.currentSubscription.trial_ends_at) > new Date()) ||
      false
    );
  }, [
    state.currentSubscription?.status,
    state.currentSubscription?.trial_ends_at,
  ]);

  const isCreator = React.useCallback((): boolean => {
    return state.currentSubscription?.tier_slug === "creator";
  }, [state.currentSubscription?.tier_slug]);

  const getCurrentTier = React.useCallback((): SubscriptionTier | null => {
    if (!state.currentSubscription) return null;
    return (
      state.tiers.find(
        (tier) => tier.slug === state.currentSubscription?.tier_slug,
      ) || null
    );
  }, [state.tiers, state.currentSubscription?.tier_slug]);

  const contextValue = React.useMemo(
    (): SubscriptionStateContextType => ({
      state,
      dispatch,
      isSubscribed,
      hasActiveTrial,
      isCreator,
      getCurrentTier,
    }),
    [state, dispatch, isSubscribed, hasActiveTrial, isCreator, getCurrentTier],
  );

  return (
    <SubscriptionStateContext.Provider value={contextValue}>
      {children}
    </SubscriptionStateContext.Provider>
  );
}

// Hook to use subscription state context
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscriptionState() {
  const context = useContext(SubscriptionStateContext);
  if (!context) {
    throw new Error(
      "useSubscriptionState must be used within a SubscriptionStateProvider",
    );
  }
  return context;
}

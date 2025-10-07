/**
 * Subscription Actions Context
 * Handles subscription API calls and business logic
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  ReactNode} from "react";
import * as SecureStore from "expo-secure-store";
import {
  cookCamApi,
  SubscriptionTier,
  CreatorRevenue} from "../services/cookCamApi";
import SubscriptionService from "../services/subscriptionService";
import { useAuth } from "./AuthContext";
import { useSubscriptionState, SubscriptionProduct } from "./SubscriptionState";
import logger from "../utils/logger";

// Creator state (separate from core subscription)
export interface CreatorState {
  isCreator: boolean;
  creatorRevenue: CreatorRevenue | null;
  creatorLoading: boolean;
}

export interface SubscriptionActionsContextType {
  creatorState: CreatorState;

  // Data loading
  loadSubscriptionData: () => Promise<void>;
  loadCreatorData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Subscription management (App Store/Google Play)
  purchaseSubscription: (_productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  openSubscriptionManagement: () => Promise<void>;

  // Creator functions
  autoSubscribeCreator: (_userId: string) => Promise<boolean>;
  generateAffiliateLink: (_campaignName?: string) => Promise<string>;
  requestPayout: (_amount: number) => Promise<void>;
}

// Context
const SubscriptionActionsContext =
  createContext<SubscriptionActionsContextType | null>(null);

// Provider component
export function SubscriptionActionsProvider({
  children}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { state, dispatch, isCreator } = useSubscriptionState();

  // Creator state (local to this context)
  const [creatorState, setCreatorState] = React.useState<CreatorState>({
    isCreator: false,
    creatorRevenue: null,
    creatorLoading: false});

  // Load subscription data from API
  const loadSubscriptionData = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_ERROR", error: null });

      // Load subscription tiers (public endpoint, no auth required)
      try {
        const tiersResponse = await cookCamApi.getSubscriptionTiers();
        if (tiersResponse.success && tiersResponse.data) {
          dispatch({ type: "SET_TIERS", tiers: tiersResponse.data });
        }
      } catch (tiersError) {
        logger.warn(
          "Could not load subscription tiers from API, using fallback data:",
          tiersError);

        // Fallback tiers for development/offline mode
        const fallbackTiers: SubscriptionTier[] = [
          {
            id: "tier_free",
            slug: "free",
            name: "Free",
            price: 0,
            currency: "USD",
            billing_period: "monthly",
            features: [
              "Basic recipe generation",
              "5 scans per day",
              "Community recipes",
            ],
            limits: {
              daily_scans: 5,
              monthly_recipes: 10,
              saved_recipes: 50}},
          {
            id: "tier_regular",
            slug: "regular",
            name: "Premium",
            price: 399,
            currency: "USD",
            billing_period: "monthly",
            features: [
              "Unlimited scans",
              "Premium recipes",
              "Meal planning",
              "Nutrition tracking",
            ],
            limits: {
              monthly_recipes: 500,
              saved_recipes: 1000}},
          {
            id: "tier_creator",
            slug: "creator",
            name: "Creator",
            price: 999,
            currency: "USD",
            billing_period: "monthly",
            features: [
              "All Premium features",
              "Recipe publishing",
              "Analytics",
              "Revenue sharing",
            ],
            limits: {
              saved_recipes: 5000},
            revenue_share_percentage: 70},
        ];

        dispatch({ type: "SET_TIERS", tiers: fallbackTiers });
      }

      // Load App Store/Google Play products
      try {
        const subscriptionService = SubscriptionService.getInstance();
        const productsResponse =
          await subscriptionService.getAvailableProducts();
        const formattedProducts: SubscriptionProduct[] = productsResponse.map(
          (product: unknown) => ({
            productId: product.productId,
            price: product.price,
            localizedPrice: product.localizedPrice,
            currency: product.currency,
            title: product.title,
            description: product.description,
            tier: product.productId.includes("creator") ? "creator" : "regular",
            freeTrialPeriod: "3 days"}));
        dispatch({ type: "SET_PRODUCTS", products: formattedProducts });
      } catch (error) {
        logger.warn("Could not load IAP products:", error);
        dispatch({ type: "SET_PRODUCTS", products: [] });
      }

      // Only load user-specific subscription data if authenticated
      if (user) {
        logger.debug("Loading subscription for user:", {
          userId: user.id,
          userEmail: user.email});

        const subscriptionResponse = await cookCamApi.getSubscriptionStatus();
        logger.debug("Subscription response:", {
          success: subscriptionResponse.success,
          data: subscriptionResponse.data,
          error: subscriptionResponse.error});

        if (subscriptionResponse.success) {
          dispatch({
            type: "SET_SUBSCRIPTION",
            subscription: subscriptionResponse.data || null});

          // Cache subscription data locally
          if (subscriptionResponse.data) {
            await SecureStore.setItemAsync(
              "subscription_data",
              JSON.stringify(subscriptionResponse.data));
          }
        }
      } else {
        logger.debug(
          "User not authenticated, skipping subscription status check");
        // Try to load from cache if available
        try {
          const cachedData =
            await SecureStore.getItemAsync("subscription_data");
          if (cachedData) {
            const subscription = JSON.parse(cachedData);
            dispatch({ type: "SET_SUBSCRIPTION", subscription });
          }
        } catch (cacheError) {
          logger.error("Failed to load cached subscription data:", cacheError);
        }
      }

      dispatch({ type: "SET_LOADING", loading: false });
    } catch (error) {
      logger.error("Failed to load subscription data:", error);
      dispatch({
        type: "SET_ERROR",
        error: "Failed to load subscription data"});
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [user, dispatch]);

  // Load creator-specific data
  const loadCreatorData = useCallback(async () => {
    try {
      if (!isCreator()) {
        return;
      }

      setCreatorState((prev) => ({ ...prev, creatorLoading: true }));

      const revenueResponse = await cookCamApi.getCreatorRevenue();
      if (revenueResponse.success && revenueResponse.data) {
        setCreatorState((prev) => ({
          ...prev,
          creatorRevenue: revenueResponse.data || null,
          isCreator: true,
          creatorLoading: false}));
      } else {
        setCreatorState((prev) => ({ ...prev, creatorLoading: false }));
      }
    } catch (error) {
      logger.error("Failed to load creator data:", error);
      setCreatorState((prev) => ({ ...prev, creatorLoading: false }));
    }
  }, [isCreator]);

  // Auto-subscribe creator to their tier
  const autoSubscribeCreator = useCallback(
    async (_userId: string): Promise<boolean> => {
      try {
        logger.debug("Auto-subscribing creator to Creator tier...");
        // TODO: Implement actual auto-subscribe logic via API
        logger.warn("Auto-subscribe not yet implemented");
        return false;
      } catch (error) {
        logger.error("Failed to auto-subscribe creator:", error);
        return false;
      }
    },
    []);

  // Purchase subscription
  const purchaseSubscription = useCallback(
    async (productId: string) => {
      try {
        dispatch({ type: "SET_LOADING", loading: true });
        logger.debug("Starting subscription purchase for:", productId);

        const subscriptionService = SubscriptionService.getInstance();
        await subscriptionService.purchaseProduct(productId);

        logger.debug("Purchase initiated successfully");
        await loadSubscriptionData();
      } catch (error) {
        logger.error("Failed to purchase subscription:", error);
        dispatch({
          type: "SET_ERROR",
          error: "Failed to purchase subscription"});
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
    },
    [dispatch, loadSubscriptionData]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      logger.debug("Attempting to restore purchases");

      const { getAvailablePurchases } = await import("react-native-iap");
      const availablePurchases = await getAvailablePurchases();
      logger.debug("Found available purchases:", availablePurchases.length);

      if (availablePurchases.length > 0) {
        for (const purchase of availablePurchases) {
          logger.debug("Processing purchase:", purchase.productId);
          // TODO: Validate receipt with backend and update subscription status
        }

        await loadSubscriptionData();
        logger.debug("Purchases restored successfully");
      } else {
        logger.debug("No previous purchases found to restore");
      }
    } catch (error) {
      logger.error("Failed to restore purchases:", error);
      dispatch({ type: "SET_ERROR", error: "Failed to restore purchases" });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [dispatch, loadSubscriptionData]);

  // Open subscription management
  const openSubscriptionManagement = useCallback(async () => {
    try {
      // TODO: Implement actual subscription management
      logger.warn("Subscription management not yet implemented");
      throw new Error("Not implemented");
    } catch (error) {
      logger.error("Failed to open subscription management:", error);
      throw error;
    }
  }, []);

  // Generate affiliate link
  const generateAffiliateLink = useCallback(
    async (campaignName?: string): Promise<string> => {
      try {
        const response = await cookCamApi.generateAffiliateLink(campaignName);
        if (response.success && response.data) {
          return response.data.full_url;
        }
        throw new Error("Failed to generate affiliate link");
      } catch (error) {
        logger.error("Failed to generate affiliate link:", error);
        throw error;
      }
    },
    []);

  // Request payout
  const requestPayout = useCallback(
    async (amount: number) => {
      try {
        const response = await cookCamApi.requestPayout(amount);
        if (response.success) {
          await loadCreatorData(); // Refresh creator data
        }
      } catch (error) {
        logger.error("Failed to request payout:", error);
        throw error;
      }
    },
    [loadCreatorData]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([loadSubscriptionData(), loadCreatorData()]);
  }, [loadSubscriptionData, loadCreatorData]);

  // Load data on mount and when authentication changes
  useEffect(() => {
    if (!user?.id) {
      dispatch({ type: "RESET_STATE" });
      setCreatorState({
        isCreator: false,
        creatorRevenue: null,
        creatorLoading: false});
      return;
    }

    // Only load if we haven't checked recently (within 5 minutes)
    const shouldLoad =
      !state.lastChecked || Date.now() - state.lastChecked > 5 * 60 * 1000;

    if (shouldLoad) {
      loadSubscriptionData();
    }

    // Refresh every 10 minutes
    const interval = setInterval(
      () => {
        if (
          user?.id &&
          state.lastChecked &&
          Date.now() - state.lastChecked > 10 * 60 * 1000
        ) {
          logger.debug("Refreshing subscription data (scheduled)");
          refreshData();
        }
      },
      5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    user?.id,
    state.lastChecked,
    loadSubscriptionData,
    refreshData,
    dispatch,
  ]);

  // Load creator data when subscription changes
  useEffect(() => {
    if (state.currentSubscription?.tier_slug === "creator") {
      loadCreatorData();
    }
  }, [state.currentSubscription, loadCreatorData]);

  const contextValue = React.useMemo(
    (): SubscriptionActionsContextType => ({
      creatorState,
      loadSubscriptionData,
      loadCreatorData,
      refreshData,
      purchaseSubscription,
      restorePurchases,
      openSubscriptionManagement,
      autoSubscribeCreator,
      generateAffiliateLink,
      requestPayout}),
    [
      creatorState,
      loadSubscriptionData,
      loadCreatorData,
      refreshData,
      purchaseSubscription,
      restorePurchases,
      openSubscriptionManagement,
      autoSubscribeCreator,
      generateAffiliateLink,
      requestPayout,
    ]);

  return (
    <SubscriptionActionsContext.Provider value={contextValue}>
      {children}
    </SubscriptionActionsContext.Provider>
  );
}

// Hook to use subscription actions context
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscriptionActions() {
  const context = useContext(SubscriptionActionsContext);
  if (!context) {
    throw new Error(
      "useSubscriptionActions must be used within a SubscriptionActionsProvider");
  }
  return context;
}

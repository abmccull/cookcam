import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode} from "react";
import * as SecureStore from "expo-secure-store";
import {
  cookCamApi,
  SubscriptionTier,
  UserSubscription,
  CreatorRevenue} from "../services/cookCamApi";
import SubscriptionService from "../services/subscriptionService";
import { useAuth } from "./AuthContext";
import logger from "../utils/logger";

// Types for subscription products and status
interface SubscriptionProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  currency: string;
  title: string;
  description: string;
  tier: "regular" | "creator";
  freeTrialPeriod?: string;
}

type _SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";

// Types
interface SubscriptionState {
  // Subscription data
  tiers: SubscriptionTier[];
  products: SubscriptionProduct[]; // App Store/Google Play products
  currentSubscription: UserSubscription | null;
  subscriptionLoading: boolean;
  subscriptionError: string | null;

  // Feature access
  featureAccess: Record<string, boolean>;
  usageLimits: Record<string, { used: number; limit: number }>;

  // Creator data (if user is creator)
  isCreator: boolean;
  creatorRevenue: CreatorRevenue | null;

  // UI state
  showPaywall: boolean;
  lastChecked: number | null;
}

type SubscriptionAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_TIERS"; tiers: SubscriptionTier[] }
  | { type: "SET_PRODUCTS"; products: SubscriptionProduct[] }
  | { type: "SET_SUBSCRIPTION"; subscription: UserSubscription | null }
  | {
      type: "SET_FEATURE_ACCESS";
      feature: string;
      hasAccess: boolean;
      usage?: { used: number; limit: number };
    }
  | { type: "SET_CREATOR_DATA"; revenue: CreatorRevenue | null }
  | { type: "SHOW_PAYWALL"; show: boolean }
  | { type: "RESET_STATE" };

interface SubscriptionContextType {
  state: SubscriptionState;

  // Subscription management (App Store/Google Play)
  loadSubscriptionData: () => Promise<void>;
  checkFeatureAccess: (_feature: string) => Promise<boolean>;
  purchaseSubscription: (_productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  openSubscriptionManagement: () => Promise<void>;

  // Creator auto-subscribe
  autoSubscribeCreator: (_userId: string) => Promise<boolean>;

  // Feature gates
  canUseFeature: (_feature: string) => boolean;
  getRemainingUsage: (_feature: string) => number | null;
  showUpgradePrompt: (_feature: string) => void;

  // Creator functions (still use backend API)
  loadCreatorData: () => Promise<void>;
  generateAffiliateLink: (_campaignName?: string) => Promise<string>;
  requestPayout: (_amount: number) => Promise<void>;

  // Utility
  refreshData: () => Promise<void>;
  isSubscribed: () => boolean;
  hasActiveTrial: () => boolean;
  isCreator: () => boolean;
}

// Initial state
const initialState: SubscriptionState = {
  tiers: [],
  products: [],
  currentSubscription: null,
  subscriptionLoading: false,
  subscriptionError: null,
  featureAccess: {},
  usageLimits: {},
  isCreator: false,
  creatorRevenue: null,
  showPaywall: false,
  lastChecked: null};

// Reducer
function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction): SubscriptionState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, subscriptionLoading: action.loading };

    case "SET_ERROR":
      return {
        ...state,
        subscriptionError: action.error,
        subscriptionLoading: false};

    case "SET_TIERS":
      return { ...state, tiers: action.tiers };

    case "SET_PRODUCTS":
      return { ...state, products: action.products };

    case "SET_SUBSCRIPTION":
      return {
        ...state,
        currentSubscription: action.subscription,
        lastChecked: Date.now()};

    case "SET_FEATURE_ACCESS": {
      const newFeatureAccess = { ...state.featureAccess };
      const newUsageLimits = { ...state.usageLimits };

      newFeatureAccess[action.feature] = action.hasAccess;
      if (action.usage) {
        newUsageLimits[action.feature] = action.usage;
      }

      return {
        ...state,
        featureAccess: newFeatureAccess,
        usageLimits: newUsageLimits};
    }

    case "SET_CREATOR_DATA":
      return {
        ...state,
        creatorRevenue: action.revenue,
        isCreator: action.revenue !== null};

    case "SHOW_PAYWALL":
      return { ...state, showPaywall: action.show };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
}

// Context
const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// Provider component
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const { user } = useAuth();

  // Load subscription data from API
  const loadSubscriptionData = async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_ERROR", error: null });

      // Load subscription tiers (public endpoint, no auth required)
      let _tiersLoaded = false;
      try {
        const tiersResponse = await cookCamApi.getSubscriptionTiers();
        if (tiersResponse.success && tiersResponse.data) {
          dispatch({ type: "SET_TIERS", tiers: tiersResponse.data });
          _tiersLoaded = true;
        }
      } catch (tiersError) {
        logger.warn(
          "🔄 Could not load subscription tiers from API, using fallback data:",
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
        _tiersLoaded = true;
      }

      // Load App Store/Google Play products (local IAP, no auth required)
      try {
        const subscriptionService = SubscriptionService.getInstance();
        const productsResponse =
          await subscriptionService.getAvailableProducts();
        const formattedProducts: SubscriptionProduct[] = productsResponse.map(
          (product: unknown) => {
            // Type assertion for IAP product data
            const p = product as {
              productId: string;
              price: string;
              localizedPrice: string;
              currency: string;
              title: string;
              description: string;
            };
            return {
              productId: p.productId,
              price: p.price,
              localizedPrice: p.localizedPrice,
              currency: p.currency,
              title: p.title,
              description: p.description,
              tier: p.productId.includes("creator") ? "creator" : "regular",
              freeTrialPeriod: "3 days"
            };
          });
        dispatch({ type: "SET_PRODUCTS", products: formattedProducts });
      } catch (error) {
        logger.warn("Could not load IAP products:", error);
        dispatch({ type: "SET_PRODUCTS", products: [] });
      }

      // Only load user-specific subscription data if authenticated
      if (user) {
        logger.debug("🔍 Loading subscription for user:", {
          userId: user.id,
          userEmail: user.email});

        // Load current subscription (auth required)
        const subscriptionResponse = await cookCamApi.getSubscriptionStatus();
        logger.debug("📊 Subscription response:", {
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
          "⚠️ User not authenticated, skipping subscription status check");
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
  };

  // Auto-subscribe creator to their tier
  const autoSubscribeCreator = async (_userId: string): Promise<boolean> => {
    try {
      logger.debug("🎨 Auto-subscribing creator to Creator tier...");

      // TODO: Implement actual auto-subscribe logic via API
      logger.warn("Auto-subscribe not yet implemented");
      return false;
    } catch (error) {
      logger.error("❌ Failed to auto-subscribe creator:", error);
      return false;
    }
  };

  // Check if user is creator
  const isCreator = (): boolean => {
    return (
      state.currentSubscription?.tier_slug === "creator" || state.isCreator
    );
  };

  // Load creator-specific data
  const loadCreatorData = async () => {
    try {
      // Check if user is creator
      if (!isCreator()) {
        return;
      }

      // Load creator revenue
      const revenueResponse = await cookCamApi.getCreatorRevenue();
      if (revenueResponse.success && revenueResponse.data) {
        dispatch({
          type: "SET_CREATOR_DATA",
          revenue: revenueResponse.data});
      }
    } catch (error) {
      logger.error("Failed to load creator data:", error);
    }
  };

  // Check if user can access a specific feature
  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    try {
      const response = await cookCamApi.checkFeatureAccess(feature);
      if (response.success && response.data) {
        dispatch({
          type: "SET_FEATURE_ACCESS",
          feature,
          hasAccess: response.data.hasAccess,
          usage: response.data.usage
            ? { used: response.data.usage.count, limit: response.data.usage.limit }
            : undefined
        });
        return response.data.hasAccess;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to check feature access for ${feature}:`, error);
      return false;
    }
  };

  // Purchase subscription
  const purchaseSubscription = async (productId: string) => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      logger.debug("🛒 Starting subscription purchase for:", productId);

      // Use the subscription service to handle the purchase
      const subscriptionService = SubscriptionService.getInstance();
      await subscriptionService.purchaseProduct(productId);

      // Note: The actual purchase completion will be handled by the
      // purchaseUpdatedListener in SubscriptionService, which should:
      // 1. Validate receipt with backend
      // 2. Update user subscription status
      // 3. Refresh subscription data here

      logger.debug("✅ Purchase initiated successfully");

      // Refresh subscription data to reflect the new subscription
      await loadSubscriptionData();
    } catch (error) {
      logger.error("❌ Failed to purchase subscription:", error);
      dispatch({ type: "SET_ERROR", error: "Failed to purchase subscription" });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      logger.debug("🔄 Attempting to restore purchases");

      // Import restore function from react-native-iap
      const { getAvailablePurchases } = await import("react-native-iap");

      // Get available purchases from the platform
      const availablePurchases = await getAvailablePurchases();
      logger.debug("📱 Found available purchases:", availablePurchases.length);

      if (availablePurchases.length > 0) {
        // Process each purchase (validate with backend)
        for (const purchase of availablePurchases) {
          logger.debug("🧾 Processing purchase:", purchase.productId);

          // TODO: Validate receipt with backend and update subscription status
          // This should call your backend API to verify the receipt and update user subscription
        }

        // Refresh subscription data
        await loadSubscriptionData();
        logger.debug("✅ Purchases restored successfully");
      } else {
        logger.debug("ℹ️ No previous purchases found to restore");
      }
    } catch (error) {
      logger.error("❌ Failed to restore purchases:", error);
      dispatch({ type: "SET_ERROR", error: "Failed to restore purchases" });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  // Open subscription management
  const openSubscriptionManagement = async () => {
    try {
      // TODO: Implement actual subscription management
      logger.warn("Subscription management not yet implemented");
      throw new Error("Not implemented");
    } catch (error) {
      logger.error("Failed to open subscription management:", error);
      throw error;
    }
  };

  // Generate affiliate link
  const generateAffiliateLink = async (
    campaignName?: string): Promise<string> => {
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
  };

  // Request payout
  const requestPayout = async (amount: number) => {
    try {
      const response = await cookCamApi.requestPayout(amount);
      if (response.success) {
        await loadCreatorData(); // Refresh creator data
      }
    } catch (error) {
      logger.error("Failed to request payout:", error);
      throw error;
    }
  };

  // Utility functions
  const canUseFeature = (feature: string): boolean => {
    return state.featureAccess[feature] ?? false;
  };

  const getRemainingUsage = (feature: string): number | null => {
    const usage = state.usageLimits[feature];
    if (!usage) {
      return null;
    }
    return Math.max(0, usage.limit - usage.used);
  };

  const showUpgradePrompt = (feature: string) => {
    dispatch({ type: "SHOW_PAYWALL", show: true });
    // Track analytics
    cookCamApi.trackEvent("paywall_shown", {
      feature,
      trigger: "feature_gate"});
  };

  const refreshData = async () => {
    await Promise.all([loadSubscriptionData(), loadCreatorData()]);
  };

  const isSubscribed = (): boolean => {
    logger.debug("🔍 Checking subscription status:", {
      currentSubscription: state.currentSubscription,
      status: state.currentSubscription?.status,
      isActive: state.currentSubscription?.status === "active",
      isTrial: state.currentSubscription?.status === "trial"});

    return (
      state.currentSubscription?.status === "active" ||
      state.currentSubscription?.status === "trial"
    );
  };

  const hasActiveTrial = (): boolean => {
    return (
      (state.currentSubscription?.status === "trial" &&
        state.currentSubscription?.trial_ends_at &&
        new Date(state.currentSubscription.trial_ends_at) > new Date()) ||
      false
    );
  };

  // Load data on mount and when authentication changes
  useEffect(() => {
    if (!user?.id) {
      // User not authenticated, reset state
      dispatch({ type: "RESET_STATE" });
      return;
    }

    // Only load if we haven't checked recently (within 5 minutes)
    const shouldLoad =
      !state.lastChecked || Date.now() - state.lastChecked > 5 * 60 * 1000;

    if (shouldLoad) {
      loadSubscriptionData();
    }

    // Refresh every 10 minutes, but only check every 5 minutes to avoid spam
    const interval = setInterval(
      () => {
        if (
          user?.id &&
          state.lastChecked &&
          Date.now() - state.lastChecked > 10 * 60 * 1000
        ) {
          logger.debug("🔄 Refreshing subscription data (scheduled)");
          refreshData();
        }
      },
      5 * 60 * 1000); // Check every 5 minutes instead of every minute

    return () => clearInterval(interval);
  }, [user?.id]); // Only depend on user ID, not the entire user object

  // Load creator data when subscription changes
  useEffect(() => {
    if (state.currentSubscription?.tier_slug === "creator") {
      loadCreatorData();
    }
  }, [state.currentSubscription]);

  const contextValue: SubscriptionContextType = {
    state,
    loadSubscriptionData,
    checkFeatureAccess,
    purchaseSubscription,
    restorePurchases,
    openSubscriptionManagement,
    autoSubscribeCreator,
    canUseFeature,
    getRemainingUsage,
    showUpgradePrompt,
    loadCreatorData,
    generateAffiliateLink,
    requestPayout,
    refreshData,
    isSubscribed,
    hasActiveTrial,
    isCreator};

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

// Feature gate hook
// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureGate(feature: string) {
  const { state, checkFeatureAccess, showUpgradePrompt } = useSubscription();

  const hasAccess = state.featureAccess[feature] ?? false;
  const usage = state.usageLimits[feature];

  // Check feature access if not already checked
  useEffect(() => {
    if (!(feature in state.featureAccess)) {
      checkFeatureAccess(feature);
    }
  }, [feature]);

  const checkAndPrompt = () => {
    if (!hasAccess) {
      showUpgradePrompt(feature);
      return false;
    }
    return true;
  };

  return {
    hasAccess,
    usage,
    remaining: usage ? Math.max(0, usage.limit - usage.used) : null,
    checkAndPrompt};
}

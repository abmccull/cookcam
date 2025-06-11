import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cookCamApi,
  SubscriptionTier,
  UserSubscription,
  CreatorRevenue,
} from '../services/cookCamApi';
import {
  SubscriptionProduct,
  SubscriptionStatus,
} from '../services/subscriptionService';
import SubscriptionService from '../services/subscriptionService';
import {useAuth} from './AuthContext';

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
  usageLimits: Record<string, {used: number; limit: number}>;

  // Creator data (if user is creator)
  isCreator: boolean;
  creatorRevenue: CreatorRevenue | null;

  // UI state
  showPaywall: boolean;
  lastChecked: number | null;
}

type SubscriptionAction =
  | {type: 'SET_LOADING'; loading: boolean}
  | {type: 'SET_ERROR'; error: string | null}
  | {type: 'SET_TIERS'; tiers: SubscriptionTier[]}
  | {type: 'SET_PRODUCTS'; products: SubscriptionProduct[]}
  | {type: 'SET_SUBSCRIPTION'; subscription: UserSubscription | null}
  | {
      type: 'SET_FEATURE_ACCESS';
      feature: string;
      hasAccess: boolean;
      usage?: any;
    }
  | {type: 'SET_CREATOR_DATA'; revenue: CreatorRevenue | null}
  | {type: 'SHOW_PAYWALL'; show: boolean}
  | {type: 'RESET_STATE'};

interface SubscriptionContextType {
  state: SubscriptionState;

  // Subscription management (App Store/Google Play)
  loadSubscriptionData: () => Promise<void>;
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  purchaseSubscription: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  openSubscriptionManagement: () => Promise<void>;

  // Creator auto-subscribe
  autoSubscribeCreator: (userId: string) => Promise<boolean>;

  // Feature gates
  canUseFeature: (feature: string) => boolean;
  getRemainingUsage: (feature: string) => number | null;
  showUpgradePrompt: (feature: string) => void;

  // Creator functions (still use backend API)
  loadCreatorData: () => Promise<void>;
  generateAffiliateLink: (campaignName?: string) => Promise<string>;
  requestPayout: (amount: number) => Promise<void>;

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
  lastChecked: null,
};

// Reducer
function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction,
): SubscriptionState {
  switch (action.type) {
    case 'SET_LOADING':
      return {...state, subscriptionLoading: action.loading};

    case 'SET_ERROR':
      return {
        ...state,
        subscriptionError: action.error,
        subscriptionLoading: false,
      };

    case 'SET_TIERS':
      return {...state, tiers: action.tiers};

    case 'SET_PRODUCTS':
      return {...state, products: action.products};

    case 'SET_SUBSCRIPTION':
      return {
        ...state,
        currentSubscription: action.subscription,
        lastChecked: Date.now(),
      };

    case 'SET_FEATURE_ACCESS':
      const newFeatureAccess = {...state.featureAccess};
      const newUsageLimits = {...state.usageLimits};

      newFeatureAccess[action.feature] = action.hasAccess;
      if (action.usage) {
        newUsageLimits[action.feature] = action.usage;
      }

      return {
        ...state,
        featureAccess: newFeatureAccess,
        usageLimits: newUsageLimits,
      };

    case 'SET_CREATOR_DATA':
      return {
        ...state,
        creatorRevenue: action.revenue,
        isCreator: action.revenue !== null,
      };

    case 'SHOW_PAYWALL':
      return {...state, showPaywall: action.show};

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// Provider component
export function SubscriptionProvider({children}: {children: ReactNode}) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const {user} = useAuth();

  // Load subscription data from API
  const loadSubscriptionData = async () => {
    try {
      dispatch({type: 'SET_LOADING', loading: true});
      dispatch({type: 'SET_ERROR', error: null});

      const subscriptionService = SubscriptionService.getInstance();

      // Load subscription tiers (public endpoint, no auth required)
      let tiersLoaded = false;
      try {
        const tiersResponse = await cookCamApi.getSubscriptionTiers();
        if (tiersResponse.success && tiersResponse.data) {
          dispatch({type: 'SET_TIERS', tiers: tiersResponse.data});
          tiersLoaded = true;
        }
      } catch (tiersError) {
        console.warn('🔄 Could not load subscription tiers from API, using fallback data:', tiersError);
        
        // Fallback tiers for development/offline mode
        const fallbackTiers: SubscriptionTier[] = [
          {
            id: 'tier_free',
            slug: 'free',
            name: 'Free',
            price: 0,
            currency: 'USD',
            billing_period: 'monthly',
            features: ['Basic recipe generation', '5 scans per day', 'Community recipes'],
            limits: {
              daily_scans: 5,
              monthly_recipes: 10,
              saved_recipes: 50,
            },
          },
          {
            id: 'tier_regular',
            slug: 'regular',
            name: 'Premium',
            price: 399,
            currency: 'USD',
            billing_period: 'monthly',
            features: ['Unlimited scans', 'Premium recipes', 'Meal planning', 'Nutrition tracking'],
            limits: {
              monthly_recipes: 500,
              saved_recipes: 1000,
            },
          },
          {
            id: 'tier_creator',
            slug: 'creator',
            name: 'Creator',
            price: 999,
            currency: 'USD',
            billing_period: 'monthly',
            features: ['All Premium features', 'Recipe publishing', 'Analytics', 'Revenue sharing'],
            limits: {
              saved_recipes: 5000,
            },
            revenue_share_percentage: 70,
          },
        ];
        
        dispatch({type: 'SET_TIERS', tiers: fallbackTiers});
        tiersLoaded = true;
      }

      // Load App Store/Google Play products (local IAP, no auth required)
      const productsResponse = await subscriptionService.getAvailableProducts();
      dispatch({type: 'SET_PRODUCTS', products: productsResponse});

      // Only load user-specific subscription data if authenticated
      if (user) {
        // Load current subscription (auth required)
        const subscriptionResponse = await cookCamApi.getSubscriptionStatus();
        if (subscriptionResponse.success) {
          dispatch({
            type: 'SET_SUBSCRIPTION',
            subscription: subscriptionResponse.data || null,
          });

          // Cache subscription data locally
          if (subscriptionResponse.data) {
            await AsyncStorage.setItem(
              'subscription_data',
              JSON.stringify(subscriptionResponse.data),
            );
          }
        }
      } else {
        console.log(
          '⚠️ User not authenticated, skipping subscription status check',
        );
        // Try to load from cache if available
        try {
          const cachedData = await AsyncStorage.getItem('subscription_data');
          if (cachedData) {
            const subscription = JSON.parse(cachedData);
            dispatch({type: 'SET_SUBSCRIPTION', subscription});
          }
        } catch (cacheError) {
          console.error('Failed to load cached subscription data:', cacheError);
        }
      }

      dispatch({type: 'SET_LOADING', loading: false});
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      dispatch({type: 'SET_ERROR', error: 'Failed to load subscription data'});
      dispatch({type: 'SET_LOADING', loading: false});
    }
  };

  // Auto-subscribe creator to their tier
  const autoSubscribeCreator = async (userId: string): Promise<boolean> => {
    try {
      console.log('🎨 Auto-subscribing creator to Creator tier...');

      const success = await SubscriptionService.autoSubscribeCreator(userId);

      if (success) {
        // Refresh subscription data
        await loadSubscriptionData();

        // Track the auto-subscription
        await cookCamApi.trackEvent('creator_auto_subscribed', {
          userId,
          tier: 'creator',
          method: 'auto',
        });

        console.log('✅ Creator auto-subscribed successfully');
      }

      return success;
    } catch (error) {
      console.error('❌ Failed to auto-subscribe creator:', error);
      return false;
    }
  };

  // Check if user is creator
  const isCreator = (): boolean => {
    return (
      state.currentSubscription?.tier_slug === 'creator' || state.isCreator
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
          type: 'SET_CREATOR_DATA',
          revenue: revenueResponse.data,
        });
      }
    } catch (error) {
      console.error('Failed to load creator data:', error);
    }
  };

  // Check if user can access a specific feature
  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    try {
      const response = await cookCamApi.checkFeatureAccess(feature);
      if (response.success && response.data) {
        dispatch({
          type: 'SET_FEATURE_ACCESS',
          feature,
          hasAccess: response.data.hasAccess,
          usage: response.data.usage,
        });
        return response.data.hasAccess;
      }
      return false;
    } catch (error) {
      console.error(`Failed to check feature access for ${feature}:`, error);
      return false;
    }
  };

  // Purchase subscription
  const purchaseSubscription = async (productId: string) => {
    try {
      const success = await SubscriptionService.purchaseSubscription(productId);
      if (success) {
        // Purchase successful, refresh subscription data
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      throw error;
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      const success = await SubscriptionService.restorePurchases();
      if (success) {
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  };

  // Open subscription management
  const openSubscriptionManagement = async () => {
    try {
      await SubscriptionService.openSubscriptionManagement();
      // No need to check response as this just opens the system settings
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      throw error;
    }
  };

  // Generate affiliate link
  const generateAffiliateLink = async (
    campaignName?: string,
  ): Promise<string> => {
    try {
      const response = await cookCamApi.generateAffiliateLink(campaignName);
      if (response.success && response.data) {
        return response.data.full_url;
      }
      throw new Error('Failed to generate affiliate link');
    } catch (error) {
      console.error('Failed to generate affiliate link:', error);
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
      console.error('Failed to request payout:', error);
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
    dispatch({type: 'SHOW_PAYWALL', show: true});
    // Track analytics
    cookCamApi.trackEvent('paywall_shown', {feature, trigger: 'feature_gate'});
  };

  const refreshData = async () => {
    await Promise.all([loadSubscriptionData(), loadCreatorData()]);
  };

  const isSubscribed = (): boolean => {
    return (
      state.currentSubscription?.status === 'active' ||
      state.currentSubscription?.status === 'trial'
    );
  };

  const hasActiveTrial = (): boolean => {
    return (
      (state.currentSubscription?.status === 'trial' &&
        state.currentSubscription?.trial_ends_at &&
        new Date(state.currentSubscription.trial_ends_at) > new Date()) ||
      false
    );
  };

  // Load data on mount and when authentication changes
  useEffect(() => {
    loadSubscriptionData();

    // Refresh every 10 minutes
    const interval = setInterval(() => {
      if (
        state.lastChecked &&
        Date.now() - state.lastChecked > 10 * 60 * 1000
      ) {
        refreshData();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]); // Depend on authentication status

  // Load creator data when subscription changes
  useEffect(() => {
    if (state.currentSubscription?.tier_slug === 'creator') {
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
    isCreator,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    );
  }
  return context;
}

// Feature gate hook
export function useFeatureGate(feature: string) {
  const {state, checkFeatureAccess, showUpgradePrompt} = useSubscription();

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
    checkAndPrompt,
  };
}

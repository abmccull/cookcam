/**
 * Optimized Subscription Context
 * Unified context that combines state, actions, and feature access
 */

import React, { ReactNode } from "react";
import {
  SubscriptionStateProvider,
  useSubscriptionState,
} from "./SubscriptionState";
import {
  FeatureAccessProvider,
  useFeatureAccess,
  useFeatureGate,
} from "./FeatureAccessContext";
import {
  SubscriptionActionsProvider,
  useSubscriptionActions,
} from "./SubscriptionActions";

// Combined provider that wraps all subscription-related contexts
export function OptimizedSubscriptionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SubscriptionStateProvider
      children={
        <FeatureAccessProvider
          children={<SubscriptionActionsProvider children={children} />}
        />
      }
    />
  );
}

// Combined hook that provides access to all subscription functionality
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const subscriptionState = useSubscriptionState();
  const featureAccess = useFeatureAccess();
  const subscriptionActions = useSubscriptionActions();

  return {
    // State
    state: subscriptionState.state,
    isSubscribed: subscriptionState.isSubscribed,
    hasActiveTrial: subscriptionState.hasActiveTrial,
    isCreator: subscriptionState.isCreator,
    getCurrentTier: subscriptionState.getCurrentTier,

    // Feature Access
    featureState: featureAccess.state,
    checkFeatureAccess: featureAccess.checkFeatureAccess,
    canUseFeature: featureAccess.canUseFeature,
    getRemainingUsage: featureAccess.getRemainingUsage,
    showUpgradePrompt: featureAccess.showUpgradePrompt,
    refreshAllFeatures: featureAccess.refreshAllFeatures,

    // Actions
    creatorState: subscriptionActions.creatorState,
    loadSubscriptionData: subscriptionActions.loadSubscriptionData,
    loadCreatorData: subscriptionActions.loadCreatorData,
    refreshData: subscriptionActions.refreshData,
    purchaseSubscription: subscriptionActions.purchaseSubscription,
    restorePurchases: subscriptionActions.restorePurchases,
    openSubscriptionManagement: subscriptionActions.openSubscriptionManagement,
    autoSubscribeCreator: subscriptionActions.autoSubscribeCreator,
    generateAffiliateLink: subscriptionActions.generateAffiliateLink,
    requestPayout: subscriptionActions.requestPayout,
  };
}

// Re-export optimized feature gate hook
// eslint-disable-next-line react-refresh/only-export-components
export { useFeatureGate };

// Re-export types for convenience
export type {
  SubscriptionState,
  SubscriptionProduct,
  SubscriptionStatus,
} from "./SubscriptionState";
export type { FeatureAccessState } from "./FeatureAccessContext";
export type { CreatorState } from "./SubscriptionActions";

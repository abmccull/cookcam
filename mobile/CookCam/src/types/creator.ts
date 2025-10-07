import React from "react";

export interface CreatorTier {
  id: number;
  title: string;
  emoji: string;
  minSubscribers: number;
  maxSubscribers: number | null;
  revenueShare: number;
  color: string;
  unlocked: boolean;
}

export interface CreatorTip {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  category: "content" | "growth" | "monetization";
}

export interface CreatorAnalytics {
  revenue: {
    total_earnings: number;
    affiliate_earnings: number;
    tips_earnings: number;
    collections_earnings: number;
    active_referrals: number;
  };
  referrals: {
    total: number;
    active: number;
    data: unknown[];
  };
  recipes: unknown[];
  recentTips: unknown[];
  stripeAccount?: {
    isConnected: boolean;
    canReceivePayouts: boolean;
    accountId: string | null;
  };
}

export interface CreatorEarnings {
  total_earnings: number;
  available_balance: number;
  pending_balance: number;
  last_payout_date: string | null;
  next_payout_date: string | null;
}

export interface CreatorScreenProps {
  navigation: unknown;
}

export interface CreatorTierCardProps {
  currentTier: CreatorTier;
  nextTier: CreatorTier | undefined;
  analytics: CreatorAnalytics | null;
  progressToNext: number;
  progressAnim: unknown;
  fadeAnim: unknown;
}

export interface CreatorLinkSectionProps {
  userId?: string | undefined;
  onCopyCode: () => void;
  onShare: () => void;
}

export interface PayoutSectionProps {
  analytics: CreatorAnalytics | null;
  earnings: CreatorEarnings | null;
  onOpenStripeConnect: () => void;
}

export interface AnalyticsSectionProps {
  analytics: CreatorAnalytics | null;
  earnings: CreatorEarnings | null;
}

export interface TiersSectionProps {
  tiers: CreatorTier[];
  currentTier: CreatorTier;
}

export interface CreatorTipsSectionProps {
  tips: CreatorTip[];
}

export interface SubscriptionGateProps {
  navigation: unknown;
  fadeAnim: unknown;
  slideAnim: unknown;
}

export interface CreatorOnboardingProps {
  navigation: unknown;
  fadeAnim: unknown;
  slideAnim: unknown;
  pulseAnim: unknown;
  onBecomeCreator: () => void;
}

export interface CreatorSuccessStory {
  id: string;
  quote: string;
  author: string;
  stats: string;
  icon?: unknown;
}

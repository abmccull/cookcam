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
  icon: any;
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
    data: any[];
  };
  recipes: any[];
  recentTips: any[];
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
  navigation: any;
}

export interface CreatorTierCardProps {
  currentTier: CreatorTier;
  nextTier: CreatorTier | undefined;
  analytics: CreatorAnalytics | null;
  progressToNext: number;
  progressAnim: any;
  fadeAnim: any;
}

export interface CreatorLinkSectionProps {
  userId?: string;
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
  navigation: any;
  fadeAnim: any;
  slideAnim: any;
}

export interface CreatorOnboardingProps {
  navigation: any;
  fadeAnim: any;
  slideAnim: any;
  pulseAnim: any;
  onBecomeCreator: () => void;
}

export interface CreatorSuccessStory {
  id: string;
  quote: string;
  author: string;
  stats: string;
  icon?: any;
} 
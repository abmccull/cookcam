import {
  Clock,
  Star,
  Users,
  BookOpen,
  TrendingUp,
} from "lucide-react-native";
import { CreatorTip, CreatorTier, CreatorSuccessStory } from "../types/creator";

export const creatorTips: CreatorTip[] = [
  {
    id: "1",
    title: "Post at Peak Times",
    description:
      "Share recipes between 6-8 PM when most users are planning dinner",
    icon: Clock,
    category: "growth",
  },
  {
    id: "2",
    title: "Use Trending Ingredients",
    description: "Recipes with trending ingredients get 3x more views",
    icon: Star,
    category: "content",
  },
  {
    id: "3",
    title: "Engage with Comments",
    description: "Responding to comments increases follower retention by 45%",
    icon: Users,
    category: "growth",
  },
  {
    id: "4",
    title: "Create Recipe Series",
    description: "Series keep viewers coming back for more",
    icon: BookOpen,
    category: "content",
  },
];

export const successStories: CreatorSuccessStory[] = [
  {
    id: "1",
    quote: "I went from 0 to 5K subscribers in 3 months!",
    author: "Chef Sarah",
    stats: "💰 $1,250/month",
    icon: TrendingUp,
  },
  {
    id: "2",
    quote: "My pasta recipes went viral and changed my life!",
    author: "Chef Marco",
    stats: "👥 15K subscribers",
    icon: Star,
  },
];

export const getCreatorTiers = (activeSubscribers: number = 0): CreatorTier[] => [
  {
    id: 1,
    title: "Sous Chef",
    emoji: "👨‍🍳",
    minSubscribers: 0,
    maxSubscribers: 100,
    revenueShare: 30, // Flat 30% for all tiers
    color: "#4CAF50",
    unlocked: true,
  },
  {
    id: 2,
    title: "Pastry Chef",
    emoji: "🧁",
    minSubscribers: 100,
    maxSubscribers: 1000,
    revenueShare: 30, // Flat 30% for all tiers
    color: "#2196F3",
    unlocked: activeSubscribers >= 100,
  },
  {
    id: 3,
    title: "Head Chef",
    emoji: "👨‍🍳",
    minSubscribers: 1000,
    maxSubscribers: 10000,
    revenueShare: 30, // Flat 30% for all tiers
    color: "#9C27B0",
    unlocked: activeSubscribers >= 1000,
  },
  {
    id: 4,
    title: "Executive Chef",
    emoji: "⭐",
    minSubscribers: 10000,
    maxSubscribers: 100000,
    revenueShare: 30, // Flat 30% for all tiers
    color: "#FF6B35",
    unlocked: activeSubscribers >= 10000,
  },
  {
    id: 5,
    title: "Master Chef",
    emoji: "🏆",
    minSubscribers: 100000,
    maxSubscribers: null,
    revenueShare: 30, // Flat 30% for all tiers
    color: "#FFB800",
    unlocked: activeSubscribers >= 100000,
  },
];

export const getCurrentTier = (activeSubscribers: number = 0): CreatorTier => {
  const tiers = getCreatorTiers(activeSubscribers);
  return tiers.find(tier => 
    activeSubscribers >= tier.minSubscribers && 
    (tier.maxSubscribers === null || activeSubscribers < tier.maxSubscribers)
  ) || tiers[0];
};

export const getNextTier = (currentTierId: number, activeSubscribers: number = 0): CreatorTier | undefined => {
  const tiers = getCreatorTiers(activeSubscribers);
  return tiers.find(tier => tier.id === currentTierId + 1);
};

export const calculateProgressToNext = (
  currentTier: CreatorTier, 
  nextTier: CreatorTier | undefined, 
  activeSubscribers: number = 0
): number => {
  if (!nextTier) return 100;
  
  return Math.min(
    ((activeSubscribers - currentTier.minSubscribers) /
      (nextTier.minSubscribers - currentTier.minSubscribers)) * 100,
    100
  );
};

export const getCreatorShareableLink = (userId?: string): string => {
  const creatorCode = `CHEF_${userId?.slice(-8)?.toUpperCase() || 'UNKNOWN'}`;
  return `https://cookcam.ai/ref/${creatorCode}`;
};

export const calculateConversionRate = (total: number, active: number): string => {
  if (!total || total === 0) return "0";
  return ((active / total) * 100).toFixed(1);
};

export const calculateActiveRate = (total: number, active: number): string => {
  if (!total || total === 0) return "0";
  return ((active / total) * 100).toFixed(1);
}; 
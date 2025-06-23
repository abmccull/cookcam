import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { gamificationService } from "../services/gamificationService";
import * as SecureStore from "expo-secure-store";
import logger from "../utils/logger";


interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

interface GamificationContextType {
  xp: number;
  level: number;
  levelProgress: number;
  nextLevelXP: number;
  streak: number;
  freezeTokens: number;
  badges: Badge[];
  addXP: (amount: number, reason: string) => Promise<void>;
  checkStreak: () => Promise<void>;
  useFreeze: () => Promise<boolean>;
  unlockBadge: (badgeId: string) => Promise<void>;
  loadGamificationProgress: () => Promise<void>;
  xpNotification: {
    visible: boolean;
    xpGained: number;
    reason: string;
    showConfetti: boolean;
  };
  hideXPNotification: () => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(
  undefined,
);

interface GamificationProviderProps {
  children: ReactNode;
}

// XP values for different actions
export const XP_VALUES = {
  SCAN_INGREDIENTS: 15,
  APPLY_FILTERS: 5,
  COMPLETE_RECIPE: 75,
  SHARE_RECIPE: 50,
  FIRST_RECIPE_OF_DAY: 50,
  STREAK_BONUS: 25,
  SAVE_RECIPE: 15,
  JOIN_COMPETITION: 20,
  SUBMIT_RATING: 15,
  UNLOCK_ACHIEVEMENT: 150,
  LEVEL_UP: 300,
  COMPLETE_PREFERENCES: 20,
  CREATE_RECIPE: 100,

  // Enhanced recipe claiming and photo rewards
  CLAIM_RECIPE: 200, // Significantly increased for recipe ownership
  RECIPE_COMPLETION_PHOTO: 75, // Major increase for visual completion
  RECIPE_PROCESS_PHOTO: 40, // Mid-cooking photos
  RECIPE_INGREDIENT_PHOTO: 25, // Pre-cooking setup photos

  // Social sharing rewards
  SOCIAL_SHARE_INSTAGRAM: 60,
  SOCIAL_SHARE_FACEBOOK: 50,
  SOCIAL_SHARE_TWITTER: 45,
  SOCIAL_SHARE_TIKTOK: 80, // Higher for TikTok engagement
  SOCIAL_SHARE_PINTEREST: 55,
  SOCIAL_SHARE_WHATSAPP: 35,
  SOCIAL_SHARE_COPY_LINK: 25,

  // Engagement rewards
  PHOTO_LIKE_RECEIVED: 3,
  PHOTO_COMMENT_RECEIVED: 8,
  RECIPE_FEATURED: 500, // Huge bonus for featured recipes
  VIRAL_PHOTO: 1000, // 1000+ likes/shares

  // Other enhanced rewards
  HELPFUL_REVIEW: 30,
  DAILY_DISCOVERY_BONUS: 40,
  RECIPE_VIEW: 0.2, // 1 XP per 5 views
  RECEIVE_RATING: 10,
  RECEIVE_5_STAR: 25, // Bigger bonus for 5-star ratings
  SOCIAL_SHARE_VERIFIED: 100, // Major bonus for verified shares

  // Weekly/monthly bonuses
  WEEKLY_PHOTO_STREAK: 150, // 7 days of photos
  MONTHLY_CREATOR_BONUS: 500, // Active recipe creator
  COMMUNITY_CHOICE_AWARD: 750, // Community voted favorite

  // Creator rewards
  BECOME_CREATOR: 500, // Massive reward for joining creator program
  FIRST_CREATOR_RECIPE: 100,
  CREATOR_MILESTONE_100_FOLLOWERS: 250,
  CREATOR_MILESTONE_1K_FOLLOWERS: 1000,
  CREATOR_MILESTONE_10K_FOLLOWERS: 5000,
};

// Exponential level system: 100 XP for level 1, then each level is 2x more
// Level 1: 100 XP, Level 2: 200 XP, Level 3: 400 XP, Level 4: 800 XP, etc.
const generateLevelThresholds = (): number[] => {
  const thresholds = [0]; // Level 0 baseline
  let totalXP = 0;
  
  for (let level = 1; level <= 100; level++) {
    const xpForThisLevel = 100 * Math.pow(2, level - 1);
    totalXP += xpForThisLevel;
    thresholds.push(totalXP);
  }
  
  return thresholds;
};

// Generate level thresholds dynamically
const LEVEL_THRESHOLDS = generateLevelThresholds();

// Debug: Log first few levels to verify exponential growth
if (__DEV__) {
  logger.debug("📊 XP Level Thresholds (first 15 levels):");
  for (let i = 1; i <= Math.min(15, LEVEL_THRESHOLDS.length - 1); i++) {
    const xpForLevel = LEVEL_THRESHOLDS[i] - LEVEL_THRESHOLDS[i - 1];
    logger.debug(`Level ${i}: ${xpForLevel} XP (Total: ${LEVEL_THRESHOLDS[i]})`);
  }
  logger.debug(`...Level 100: Total XP needed: ${LEVEL_THRESHOLDS[100]?.toLocaleString()}`);
}

// Available badges
const ALL_BADGES: Badge[] = [
  {
    id: "first_scan",
    name: "First Scan",
    description: "Scanned your first ingredients",
    icon: "📸",
  },
  {
    id: "first_recipe",
    name: "First Recipe",
    description: "Completed your first recipe",
    icon: "👨‍🍳",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day streak",
    icon: "🔥",
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day streak",
    icon: "💎",
  },
  {
    id: "level_5",
    name: "Rising Chef",
    description: "Reached level 5",
    icon: "⭐",
  },
  {
    id: "level_10",
    name: "Master Chef",
    description: "Reached level 10",
    icon: "👑",
  },
  {
    id: "level_25",
    name: "Culinary Expert",
    description: "Reached level 25",
    icon: "🏆",
  },
  {
    id: "level_50",
    name: "Kitchen Legend",
    description: "Reached level 50",
    icon: "🌟",
  },
  {
    id: "level_75",
    name: "Cooking Virtuoso",
    description: "Reached level 75",
    icon: "💫",
  },
  {
    id: "level_100",
    name: "Ultimate Chef",
    description: "Reached the maximum level 100!",
    icon: "🚀",
  },
  {
    id: "recipes_10",
    name: "Recipe Explorer",
    description: "Completed 10 recipes",
    icon: "🍳",
  },
  {
    id: "recipes_50",
    name: "Culinary Expert",
    description: "Completed 50 recipes",
    icon: "🎖️",
  },
  {
    id: "share_master",
    name: "Social Chef",
    description: "Shared 10 recipes",
    icon: "📢",
  },
];

// Define badge types
export const BADGES = {
  // Existing badges
  FIRST_RECIPE: "first_recipe",
  STREAK_WEEK: "streak_week",
  STREAK_MONTH: "streak_month",
  LEVEL_10: "level_10",
  LEVEL_25: "level_25",
  LEVEL_50: "level_50",
  LEVEL_75: "level_75",
  LEVEL_100: "level_100",
  COMPETITION_WINNER: "competition_winner",

  // New recipe creator badges
  RECIPE_PIONEER: "recipe_pioneer", // First claimed recipe
  RECIPE_MASTER: "recipe_master", // 50 claimed recipes
  VIRAL_CHEF: "viral_chef", // 10k+ views on a recipe
  COMMUNITY_FAVORITE: "community_favorite", // 100+ 5-star ratings
  TRENDSETTER: "trendsetter", // 3 recipes in trending
  HELPFUL_CRITIC: "helpful_critic", // 50 helpful reviews
  SOCIAL_BUTTERFLY: "social_butterfly", // 100 verified shares
};

export const GamificationProvider: React.FC<GamificationProviderProps> = ({
  children,
}) => {
  const { user, updateUser } = useAuth();

  const [xp, setXP] = useState(user?.xp || 0);
  const [level, setLevel] = useState(user?.level || 1);
  const [streak, setStreak] = useState(user?.streak || 0);
  const [freezeTokens, setFreezeTokens] = useState(3); // Everyone starts with 3
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recipesCompleted, setRecipesCompleted] = useState(0);
  const [recipesShared, setRecipesShared] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  
  // Track the last user ID to prevent unnecessary loads
  const lastUserIdRef = useRef<string | null>(null);

  // XP Notification state
  const [xpNotification, setXPNotification] = useState({
    visible: false,
    xpGained: 0,
    reason: "",
    showConfetti: false,
  });

  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // Only run effect if user ID actually changed
    if (currentUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentUserId;
      
      if (currentUserId && !isLoading) {
        // Only load once per user change
        if (!lastChecked || lastChecked === 0) {
          logger.debug("🎮 Initial gamification load for user:", currentUserId);
          loadGamificationProgress();
        }
      } else if (!currentUserId) {
        // Reset state when user logs out
        setXP(0);
        setLevel(1);
        setStreak(0);
        setBadges([]);
        setLastChecked(null);
      }
    }
  }, [user?.id]); // Keep the dependency but use ref to prevent unnecessary runs

  const loadGamificationProgress = async () => {
    if (!user || isLoading) {
      return;
    }

    // Only load if we haven't checked recently (within 5 minutes)
    const now = Date.now();
    if (lastChecked && (now - lastChecked < 5 * 60 * 1000)) {
      logger.debug("🎮 Skipping gamification load - checked recently");
      return;
    }

    try {
      setIsLoading(true);
      setLastChecked(now);
      logger.debug("🎮 Loading gamification progress for user:", user.id);

      const response = await gamificationService.getProgress();

      if (response.success && response.data) {
        const user_stats = response.data;

        if (user_stats) {
          logger.debug("✅ Loaded gamification data:", user_stats);

          // Only update state if values have actually changed
          const newXP = user_stats.total_xp || user_stats.current_xp || 0;
          const newLevel = user_stats.level || 1;
          
          if (newXP !== xp) {
            setXP(newXP);
          }
          if (newLevel !== level) {
            setLevel(newLevel);
          }
          
          // Note: Don't call updateUser here to prevent infinite loop
          // The Auth context will be updated when needed

          // Load badges only once per session
          if (badges.length === 0) {
            loadBadges();
          }
        } else {
          logger.debug("⚠️ No user stats in response, using defaults");
        }
      } else {
        logger.error(
          "❌ Failed to load gamification progress:",
          response.error,
        );
      }
    } catch (error) {
      logger.error("❌ Error loading gamification progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBadges = async () => {
    // In real app, load from database
    // For now, just load the unlocked badges based on achievements
    const unlockedBadges: Badge[] = [];

    if (user?.badges) {
      user.badges.forEach((badgeId) => {
        const badge = ALL_BADGES.find((b) => b.id === badgeId);
        if (badge) {
          unlockedBadges.push({ ...badge, unlockedAt: new Date() });
        }
      });
    }

    setBadges(unlockedBadges);
  };

  const calculateLevel = (totalXP: number): number => {
    // Handle edge cases
    if (totalXP < 0) return 1;
    if (totalXP >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) return 100;
    
    // Find the current level based on total XP
    for (let level = 1; level < LEVEL_THRESHOLDS.length; level++) {
      if (totalXP < LEVEL_THRESHOLDS[level]) {
        return level; // Return the level they're currently working towards
      }
    }
    
    return 100; // Max level
  };

  const getLevelProgress = (totalXP: number, currentLevel: number): number => {
    // Handle edge cases
    if (currentLevel >= 100) return 100; // Max level reached
    if (currentLevel < 1) return 0;
    
    const currentLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
    const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel];
    
    if (!nextLevelThreshold) return 100; // If no next level, show complete
    
    const xpInCurrentLevel = totalXP - currentLevelThreshold;
    const xpNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
    
    const progress = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
    return Math.max(progress, 0);
  };

  const getNextLevelXP = (currentLevel: number): number => {
    // If at max level, return current threshold
    if (currentLevel >= 100) {
      return LEVEL_THRESHOLDS[100] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    }
    
    // Return XP needed for next level
    return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  };

  const addXP = async (amount: number, reason: string) => {
    const newXP = xp + amount;
    const newLevel = calculateLevel(newXP);
    const previousLevel = level;

    setXP(newXP);

    // Check if leveled up
    const leveledUp = newLevel > previousLevel;

    if (leveledUp) {
      setLevel(newLevel);
      // Check for level-based badges at key milestones
      if (newLevel === 5) {
        await unlockBadge("level_5");
      } else if (newLevel === 10) {
        await unlockBadge("level_10");
      } else if (newLevel === 25) {
        await unlockBadge("level_25");
      } else if (newLevel === 50) {
        await unlockBadge("level_50");
      } else if (newLevel === 75) {
        await unlockBadge("level_75");
      } else if (newLevel === 100) {
        await unlockBadge("level_100");
      }
    }

    // Show XP notification with confetti for big gains or level ups
    const showConfetti = amount >= 50 || leveledUp || reason === "CLAIM_RECIPE";
    setXPNotification({
      visible: true,
      xpGained: amount,
      reason,
      showConfetti,
    });

    // NOTE: Don't call updateUser here to prevent circular dependency
    // The AuthContext will sync with backend data when needed

    // Add XP to backend
    try {
      logger.debug(`🎯 Attempting to add ${amount} XP for ${reason}...`);
      const response = await gamificationService.addXP(
        user?.id || "default",
        amount,
        reason,
      );
      if (response.success) {
        logger.debug(
          `✅ Added ${amount} XP for ${reason} - Response:`,
          response,
        );
      } else {
        logger.error(
          `❌ Failed to add XP to backend - Error: ${response.error}`,
        );

        // If authentication error, log additional details
        if (
          response.error?.includes("Authentication") ||
          response.error?.includes("401")
        ) {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          const token = await SecureStore.getItemAsync("@cookcam_token");
          logger.error("🔍 Debug info:", {
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token?.substring(0, 20),
            userAuthState: user,
          });
        }
      }
    } catch (error) {
      logger.error("❌ Exception when adding XP to backend:", error);
    }

    // Check for other badge conditions
    if (
      reason === "SCAN_INGREDIENTS" &&
      !badges.find((b) => b.id === "first_scan")
    ) {
      await unlockBadge("first_scan");
    }

    if (reason === "COMPLETE_RECIPE") {
      const newCount = recipesCompleted + 1;
      setRecipesCompleted(newCount);

      if (newCount === 1) {
        await unlockBadge("first_recipe");
      } else if (newCount === 10) {
        await unlockBadge("recipes_10");
      } else if (newCount === 50) {
        await unlockBadge("recipes_50");
      }
    }

    if (reason === "SHARE_RECIPE") {
      const newCount = recipesShared + 1;
      setRecipesShared(newCount);

      if (newCount === 10) {
        await unlockBadge("share_master");
      }
    }
  };

  const checkStreak = async () => {
    // In real app, check last cook date from database
    // For demo, just increment streak
    const newStreak = streak + 1;
    setStreak(newStreak);
    updateUser({ streak: newStreak });

    // Check for streak badges
    if (newStreak === 7) {
      await unlockBadge("streak_7");
    } else if (newStreak === 30) {
      await unlockBadge("streak_30");
    }

    // Add streak bonus XP
    await addXP(XP_VALUES.STREAK_BONUS * newStreak, "STREAK_BONUS");
  };

  const useFreeze = async (): Promise<boolean> => {
    if (freezeTokens > 0) {
      setFreezeTokens(freezeTokens - 1);
      // In real app, save freeze token usage to database
      return true;
    }
    return false;
  };

  const unlockBadge = async (badgeId: string) => {
    if (!badges.find((b) => b.id === badgeId)) {
      const badge = ALL_BADGES.find((b) => b.id === badgeId);
      if (badge) {
        const unlockedBadge = { ...badge, unlockedAt: new Date() };
        setBadges([...badges, unlockedBadge]);

        // Update user badges
        const updatedBadgeIds = [...(user?.badges || []), badgeId];
        updateUser({ badges: updatedBadgeIds });
      }
    }
  };

  const hideXPNotification = () => {
    setXPNotification((prev) => ({ ...prev, visible: false }));
  };

  const value: GamificationContextType = {
    xp,
    level,
    levelProgress: getLevelProgress(xp, level),
    nextLevelXP: getNextLevelXP(level),
    streak,
    freezeTokens,
    badges,
    addXP,
    checkStreak,
    useFreeze,
    unlockBadge,
    loadGamificationProgress,
    xpNotification,
    hideXPNotification,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = (): GamificationContextType => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error(
      "useGamification must be used within a GamificationProvider",
    );
  }
  return context;
};

export default GamificationContext;

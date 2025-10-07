import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Lock, Star, Crown, Zap } from "lucide-react-native";
import SubscriptionLifecycleService, {
  FeatureAccess,
} from "../services/SubscriptionLifecycleService";
import logger from "../utils/logger";

type FeatureType =
  | "scan"
  | "generate_recipes"
  | "cook_mode"
  | "favorites"
  | "leaderboard"
  | "create_recipes"
  | "earn_revenue"
  | "analytics_dashboard";

interface FeatureGateProps {
  children: React.ReactNode;
  feature: FeatureType;
  userId: string;
  fallbackComponent?: React.ReactNode;
  onUpgrade?: () => void;
  showUpgradePrompt?: boolean;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  children,
  feature,
  userId,
  fallbackComponent,
  onUpgrade,
  showUpgradePrompt = true,
}) => {
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const lifecycleService = SubscriptionLifecycleService.getInstance();

  const loadFeatureAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      const subscriptionState =
        await lifecycleService.getSubscriptionState(userId);
      // TODO: Implement proper getFeatureAccess method on lifecycleService
      // For now, derive access from subscription state
      const isFree = subscriptionState.tier === 'free';
      const access: FeatureAccess = {
        canScan: true,
        scanLimit: isFree ? 3 : null,
        canGenerateRecipes: true,
        recipeLimit: isFree ? 2 : null,
        canAccessCookMode: !isFree,
        canFavoriteRecipes: !isFree,
        canAccessLeaderboard: true,
        canCreateRecipes: subscriptionState.tier === 'creator',
        canEarnRevenue: subscriptionState.tier === 'creator',
        hasAds: isFree,
      };
      setFeatureAccess(access);
    } catch (error) {
      logger.error("Error loading feature access:", error);
      // Default to restricted access on error
      setFeatureAccess(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, lifecycleService]);

  useEffect(() => {
    loadFeatureAccess();
  }, [loadFeatureAccess]);

  const checkFeatureAccess = (): { hasAccess: boolean; reason?: string } => {
    if (!featureAccess) {
      return { hasAccess: false, reason: "Loading..." };
    }

    switch (feature) {
      case "scan":
        if (!featureAccess.canScan) {
          return { hasAccess: false, reason: "Scanning not available" };
        }
        if (
          featureAccess.scanLimit !== null &&
          usageCount >= featureAccess.scanLimit
        ) {
          return {
            hasAccess: false,
            reason: `Daily limit reached (${featureAccess.scanLimit} scans)`,
          };
        }
        return { hasAccess: true };

      case "generate_recipes":
        if (!featureAccess.canGenerateRecipes) {
          return {
            hasAccess: false,
            reason: "Recipe generation not available",
          };
        }
        if (
          featureAccess.recipeLimit !== null &&
          usageCount >= featureAccess.recipeLimit
        ) {
          return {
            hasAccess: false,
            reason: `Daily limit reached (${featureAccess.recipeLimit} recipes)`,
          };
        }
        return { hasAccess: true };

      case "cook_mode":
        return featureAccess.canAccessCookMode
          ? { hasAccess: true }
          : { hasAccess: false, reason: "Cook Mode requires a subscription" };

      case "favorites":
        return featureAccess.canFavoriteRecipes
          ? { hasAccess: true }
          : { hasAccess: false, reason: "Favorites require a subscription" };

      case "leaderboard":
        return featureAccess.canAccessLeaderboard
          ? { hasAccess: true }
          : { hasAccess: false, reason: "Leaderboard not available" };

      case "create_recipes":
        return featureAccess.canCreateRecipes
          ? { hasAccess: true }
          : {
              hasAccess: false,
              reason: "Recipe creation requires Creator subscription",
            };

      case "earn_revenue":
        return featureAccess.canEarnRevenue
          ? { hasAccess: true }
          : {
              hasAccess: false,
              reason: "Revenue earning requires Creator subscription",
            };

      case "analytics_dashboard":
        return featureAccess.canCreateRecipes
          ? { hasAccess: true }
          : {
              hasAccess: false,
              reason: "Analytics dashboard requires Creator subscription",
            };

      default:
        return { hasAccess: false, reason: "Unknown feature" };
    }
  };

  const handleFeatureAttempt = () => {
    const access = checkFeatureAccess();

    if (access.hasAccess) {
      // Track usage for limited features
      if (
        (feature === "scan" && featureAccess?.scanLimit !== null) ||
        (feature === "generate_recipes" && featureAccess?.recipeLimit !== null)
      ) {
        setUsageCount((prev) => prev + 1);
      }
      return true;
    } else {
      if (showUpgradePrompt) {
        setShowUpgradeModal(true);
      }
      return false;
    }
  };

  const getUpgradePromptContent = () => {
    switch (feature) {
      case "scan":
      case "generate_recipes":
        return {
          title: "Unlock Unlimited Access",
          description:
            "Get unlimited scans and recipe generation with a CookCam subscription.",
          icon: Zap,
          benefits: [
            "Unlimited ingredient scanning",
            "Unlimited AI recipe generation",
            "Access to Cook Mode",
            "Recipe favorites and history",
            "Ad-free experience",
          ],
        };

      case "cook_mode":
        return {
          title: "Unlock Cook Mode",
          description:
            "Get step-by-step cooking guidance with timers and voice prompts.",
          icon: Star,
          benefits: [
            "Step-by-step cooking instructions",
            "Built-in timers and alerts",
            "Voice guidance (optional)",
            "Ingredient highlighting",
            "Cooking streak tracking",
          ],
        };

      case "favorites":
        return {
          title: "Save Your Favorites",
          description:
            "Keep track of your favorite recipes and build your personal cookbook.",
          icon: Star,
          benefits: [
            "Save unlimited favorite recipes",
            "Create custom recipe collections",
            "Sync across all devices",
            "Quick access to saved recipes",
            "Recipe rating and notes",
          ],
        };

      case "create_recipes":
      case "earn_revenue":
        return {
          title: "Become a Creator",
          description:
            "Share your culinary skills and earn revenue from your followers.",
          icon: Crown,
          benefits: [
            "Publish premium recipes",
            "Earn 30% revenue share",
            "Creator analytics dashboard",
            "Build your follower base",
            "Professional creator tools",
          ],
        };

      default:
        return {
          title: "Upgrade Required",
          description: "This feature requires a CookCam subscription.",
          icon: Lock,
          benefits: [
            "Access to premium features",
            "Enhanced cooking experience",
            "Priority customer support",
          ],
        };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  }

  const access = checkFeatureAccess();
  const promptContent = getUpgradePromptContent();
  const IconComponent = promptContent.icon;

  // If access is granted, render children with click handler for usage tracking
  if (access.hasAccess) {
    return (
      <TouchableOpacity
        onPress={handleFeatureAttempt}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // If access is denied, show fallback or upgrade prompt
  return (
    <>
      {fallbackComponent || (
        <TouchableOpacity
          style={styles.lockedFeature}
          onPress={() => setShowUpgradeModal(true)}
        >
          <Lock size={20} color="#8E8E93" />
          <Text style={styles.lockedText}>Upgrade to unlock</Text>
        </TouchableOpacity>
      )}

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <IconComponent size={32} color="#FF6B35" />
              </View>
              <Text style={styles.modalTitle}>{promptContent.title}</Text>
              <Text style={styles.modalDescription}>
                {promptContent.description}
              </Text>
            </View>

            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>What you'll get:</Text>
              {promptContent.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View style={styles.benefitBullet} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {featureAccess?.hasAds && (
              <View style={styles.adFreeNote}>
                <Text style={styles.adFreeText}>
                  Plus: Remove all ads and enjoy an uninterrupted cooking
                  experience!
                </Text>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                onUpgrade?.();
              }}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedFeature: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  lockedText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF6B35",
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: "#2D1B69",
    flex: 1,
    lineHeight: 22,
  },
  adFreeNote: {
    backgroundColor: "#E8F5E8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  adFreeText: {
    fontSize: 14,
    color: "#66BB6A",
    fontWeight: "500",
    textAlign: "center",
  },
  modalActions: {
    padding: 24,
    paddingTop: 0,
  },
  upgradeButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  usageWarning: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  usageWarningText: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
});

// Specialized gate components for convenience
export const UnlimitedScansGate: React.FC<Omit<FeatureGateProps, "feature">> = (
  props,
) => <FeatureGate {...props} feature="scan" />;

export const PremiumRecipesGate: React.FC<Omit<FeatureGateProps, "feature">> = (
  props,
) => <FeatureGate {...props} feature="generate_recipes" />;

export const CreatorToolsGate: React.FC<Omit<FeatureGateProps, "feature">> = (
  props,
) => <FeatureGate {...props} feature="create_recipes" />;

// Usage limit component for showing usage warnings
interface UsageLimitProps {
  feature: string;
  warningThreshold?: number;
  children: React.ReactNode;
}

export const UsageLimit: React.FC<UsageLimitProps> = ({
  feature,
  warningThreshold = 0.8,
  children,
}) => {
  const [usageInfo, setUsageInfo] = useState<{
    used: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    // Mock usage info - in real app, this would come from context or service
    setUsageInfo({ used: 8, limit: 10 });
  }, [feature]);

  const isNearLimit =
    usageInfo && usageInfo.used / usageInfo.limit >= warningThreshold;

  return (
    <View>
      {isNearLimit && (
        <View style={styles.usageWarning}>
          <Text style={styles.usageWarningText}>
            You've used {usageInfo?.used} of {usageInfo?.limit} daily {feature}
          </Text>
        </View>
      )}
      {children}
    </View>
  );
};

export default FeatureGate;

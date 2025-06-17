import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import logger from "../utils/logger";


export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "expired"
  | "past_due"
  | "paused"
  | "unpaid";

export type UserTier = "free" | "consumer" | "creator";

export interface SubscriptionState {
  status: SubscriptionStatus;
  tier: UserTier;
  expiresAt: Date | null;
  canceledAt: Date | null;
  gracePeriodEnd: Date | null;
  isInGracePeriod: boolean;
  paymentFailed: boolean;
  canReactivate: boolean;
}

export interface FeatureAccess {
  canScan: boolean;
  scanLimit: number | null; // null = unlimited
  canGenerateRecipes: boolean;
  recipeLimit: number | null;
  canAccessCookMode: boolean;
  canFavoriteRecipes: boolean;
  canAccessLeaderboard: boolean;
  canCreateRecipes: boolean; // Creator only
  canEarnRevenue: boolean; // Creator only
  hasAds: boolean;
}

class SubscriptionLifecycleService {
  private static instance: SubscriptionLifecycleService;
  private gracePeriodDays = 7; // 7 days grace period after cancellation
  private freeTierLimits = {
    scansPerDay: 3,
    recipesPerDay: 2,
  };

  private constructor() {}

  public static getInstance(): SubscriptionLifecycleService {
    if (!SubscriptionLifecycleService.instance) {
      SubscriptionLifecycleService.instance =
        new SubscriptionLifecycleService();
    }
    return SubscriptionLifecycleService.instance;
  }

  /**
   * Get current subscription state for a user
   */
  async getSubscriptionState(userId: string): Promise<SubscriptionState> {
    try {
      // TODO: Replace with actual API call to your backend
      const response = await this.mockGetSubscriptionStatus(userId);

      const now = new Date();
      const expiresAt = response.current_period_end
        ? new Date(response.current_period_end)
        : null;
      const canceledAt = response.canceled_at
        ? new Date(response.canceled_at)
        : null;

      // Calculate grace period end (7 days after cancellation or expiration)
      let gracePeriodEnd: Date | null = null;
      if (canceledAt) {
        gracePeriodEnd = new Date(
          canceledAt.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000,
        );
      } else if (expiresAt && response.status === "expired") {
        gracePeriodEnd = new Date(
          expiresAt.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000,
        );
      }

      const isInGracePeriod = gracePeriodEnd ? now <= gracePeriodEnd : false;

      return {
        status: response.status,
        tier: this.determineTier(response.status, response.plan_id),
        expiresAt,
        canceledAt,
        gracePeriodEnd,
        isInGracePeriod,
        paymentFailed:
          response.status === "past_due" || response.status === "unpaid",
        canReactivate:
          response.status === "canceled" || response.status === "expired",
      };
    } catch (error) {
      logger.error("Error getting subscription state:", error);
      // Default to free tier on error
      return this.getFreeTierState();
    }
  }

  /**
   * Determine feature access based on subscription state
   */
  getFeatureAccess(subscriptionState: SubscriptionState): FeatureAccess {
    const { status, tier, isInGracePeriod, paymentFailed } = subscriptionState;

    // Active subscriptions get full access
    if (status === "active" || status === "trialing") {
      return this.getFullAccess(tier);
    }

    // Grace period: limited access with warnings
    if (isInGracePeriod && !paymentFailed) {
      return this.getGracePeriodAccess(tier);
    }

    // Payment failed: very limited access
    if (paymentFailed) {
      return this.getPaymentFailedAccess();
    }

    // Fully expired: free tier access
    return this.getFreeTierAccess();
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCanceled(
    userId: string,
    cancelReason?: string,
  ): Promise<void> {
    try {
      logger.debug(
        `🚫 Subscription canceled for user ${userId}. Reason: ${
          cancelReason || "Not specified"
        }`,
      );

      // Store cancellation info locally
      await AsyncStorage.setItem(
        "subscription_canceled_at",
        new Date().toISOString(),
      );
      await AsyncStorage.setItem("cancel_reason", cancelReason || "");

      // Update user state in backend
      // TODO: Call your backend API to update user status

      // Schedule grace period reminder
      await this.scheduleGracePeriodReminder(userId);

      // Track cancellation for analytics
      this.trackCancellation(userId, cancelReason);
    } catch (error) {
      logger.error("Error handling subscription cancellation:", error);
    }
  }

  /**
   * Handle subscription expiration
   */
  async handleSubscriptionExpired(userId: string): Promise<void> {
    try {
      logger.debug(`⏰ Subscription expired for user ${userId}`);

      // Store expiration info
      await AsyncStorage.setItem(
        "subscription_expired_at",
        new Date().toISOString(),
      );

      // Start grace period
      await this.startGracePeriod(userId);

      // Track expiration
      this.trackExpiration(userId);
    } catch (error) {
      logger.error("Error handling subscription expiration:", error);
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailed(
    userId: string,
    failureReason?: string,
  ): Promise<void> {
    try {
      logger.debug(
        `💳 Payment failed for user ${userId}. Reason: ${
          failureReason || "Not specified"
        }`,
      );

      // Store payment failure info
      await AsyncStorage.setItem("payment_failed_at", new Date().toISOString());
      await AsyncStorage.setItem("payment_failure_reason", failureReason || "");

      // Immediate notification to user
      Alert.alert(
        "Payment Failed",
        "We had trouble processing your payment. Please update your payment method to continue enjoying CookCam.",
        [
          { text: "Update Payment", onPress: () => this.openPaymentUpdate() },
          { text: "Later", style: "cancel" },
        ],
      );

      // Track payment failure
      this.trackPaymentFailure(userId, failureReason);
    } catch (error) {
      logger.error("Error handling payment failure:", error);
    }
  }

  /**
   * Check if user should see re-engagement prompts
   */
  shouldShowReengagementPrompt(subscriptionState: SubscriptionState): {
    show: boolean;
    type: "grace_period" | "win_back" | "payment_failed" | null;
    message: string;
    cta: string;
  } {
    const { status, isInGracePeriod, gracePeriodEnd, paymentFailed } =
      subscriptionState;

    // Payment failed - urgent
    if (paymentFailed) {
      return {
        show: true,
        type: "payment_failed",
        message: "Payment failed. Update your payment method to continue.",
        cta: "Update Payment",
      };
    }

    // Grace period - gentle reminder
    if (isInGracePeriod && gracePeriodEnd) {
      const daysLeft = Math.ceil(
        (gracePeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      return {
        show: true,
        type: "grace_period",
        message: `You have ${daysLeft} day${
          daysLeft !== 1 ? "s" : ""
        } left to reactivate your subscription.`,
        cta: "Reactivate",
      };
    }

    // Fully expired - win back
    if (status === "expired" || status === "canceled") {
      return {
        show: true,
        type: "win_back",
        message:
          "Miss unlimited recipes? Get back to cooking with a special offer!",
        cta: "See Offers",
      };
    }

    return {
      show: false,
      type: null,
      message: "",
      cta: "",
    };
  }

  /**
   * Generate win-back offers for churned users
   */
  async getWinBackOffer(
    userId: string,
    subscriptionState: SubscriptionState,
  ): Promise<{
    hasOffer: boolean;
    discountPercent?: number;
    trialDays?: number;
    offerText?: string;
    expiresAt?: Date;
  }> {
    try {
      const { tier, canceledAt } = subscriptionState;

      if (!canceledAt) {
        return { hasOffer: false };
      }

      const daysSinceCancellation = Math.floor(
        (Date.now() - canceledAt.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Different offers based on how long they've been gone
      if (daysSinceCancellation <= 7) {
        // Recent cancellation - gentle discount
        return {
          hasOffer: true,
          discountPercent: 20,
          offerText: "20% off your first month back",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };
      } else if (daysSinceCancellation <= 30) {
        // Medium-term - bigger discount
        return {
          hasOffer: true,
          discountPercent: 50,
          trialDays: 7,
          offerText: "50% off + 7 days free trial",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        };
      } else if (daysSinceCancellation <= 90) {
        // Long-term - major incentive
        return {
          hasOffer: true,
          discountPercent: 70,
          trialDays: 14,
          offerText: "70% off + 2 weeks free",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
      }

      // Very long-term - special welcome back
      return {
        hasOffer: true,
        trialDays: 30,
        offerText: "30 days free - welcome back!",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      };
    } catch (error) {
      logger.error("Error generating win-back offer:", error);
      return { hasOffer: false };
    }
  }

  /**
   * Reactivate subscription with offer
   */
  async reactivateSubscription(
    userId: string,
    offerCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.debug(
        `🔄 Reactivating subscription for user ${userId} with offer: ${
          offerCode || "none"
        }`,
      );

      // TODO: Call your backend to reactivate subscription
      // This would involve calling Stripe to resume/create new subscription

      // Clear cancellation flags
      await AsyncStorage.removeItem("subscription_canceled_at");
      await AsyncStorage.removeItem("subscription_expired_at");
      await AsyncStorage.removeItem("payment_failed_at");

      // Track reactivation
      this.trackReactivation(userId, offerCode);

      return {
        success: true,
        message: "Welcome back! Your subscription has been reactivated.",
      };
    } catch (error) {
      logger.error("Error reactivating subscription:", error);
      return {
        success: false,
        message: "Failed to reactivate subscription. Please try again.",
      };
    }
  }

  // Private helper methods
  private determineTier(status: SubscriptionStatus, planId?: string): UserTier {
    if (status === "active" || status === "trialing") {
      if (planId?.includes("creator")) {
        return "creator";
      }
      if (planId?.includes("consumer")) {
        return "consumer";
      }
    }
    return "free";
  }

  private getFullAccess(tier: UserTier): FeatureAccess {
    const baseAccess = {
      canScan: true,
      scanLimit: null,
      canGenerateRecipes: true,
      recipeLimit: null,
      canAccessCookMode: true,
      canFavoriteRecipes: true,
      canAccessLeaderboard: true,
      hasAds: false,
    };

    if (tier === "creator") {
      return {
        ...baseAccess,
        canCreateRecipes: true,
        canEarnRevenue: true,
      };
    }

    return {
      ...baseAccess,
      canCreateRecipes: false,
      canEarnRevenue: false,
    };
  }

  private getGracePeriodAccess(tier: UserTier): FeatureAccess {
    // Reduced but still reasonable access during grace period
    return {
      canScan: true,
      scanLimit: 10, // Limited but generous
      canGenerateRecipes: true,
      recipeLimit: 5,
      canAccessCookMode: true,
      canFavoriteRecipes: true,
      canAccessLeaderboard: true,
      canCreateRecipes: tier === "creator",
      canEarnRevenue: tier === "creator", // Keep earning during grace period
      hasAds: true, // Show ads during grace period
    };
  }

  private getPaymentFailedAccess(): FeatureAccess {
    return {
      canScan: true,
      scanLimit: 3,
      canGenerateRecipes: true,
      recipeLimit: 1,
      canAccessCookMode: false,
      canFavoriteRecipes: false,
      canAccessLeaderboard: true,
      canCreateRecipes: false,
      canEarnRevenue: false,
      hasAds: true,
    };
  }

  private getFreeTierAccess(): FeatureAccess {
    return {
      canScan: true,
      scanLimit: this.freeTierLimits.scansPerDay,
      canGenerateRecipes: true,
      recipeLimit: this.freeTierLimits.recipesPerDay,
      canAccessCookMode: false,
      canFavoriteRecipes: false,
      canAccessLeaderboard: true,
      canCreateRecipes: false,
      canEarnRevenue: false,
      hasAds: true,
    };
  }

  private getFreeTierState(): SubscriptionState {
    return {
      status: "expired",
      tier: "free",
      expiresAt: null,
      canceledAt: null,
      gracePeriodEnd: null,
      isInGracePeriod: false,
      paymentFailed: false,
      canReactivate: true,
    };
  }

  private async scheduleGracePeriodReminder(userId: string): Promise<void> {
    // TODO: Schedule push notifications for grace period reminders
    logger.debug(`📅 Scheduled grace period reminders for user ${userId}`);
  }

  private async startGracePeriod(userId: string): Promise<void> {
    const gracePeriodEnd = new Date(
      Date.now() + this.gracePeriodDays * 24 * 60 * 60 * 1000,
    );
    await AsyncStorage.setItem(
      "grace_period_end",
      gracePeriodEnd.toISOString(),
    );
    logger.debug(
      `⏳ Started grace period for user ${userId} until ${gracePeriodEnd.toLocaleDateString()}`,
    );
  }

  private openPaymentUpdate(): void {
    // TODO: Navigate to payment update screen or open subscription management
    logger.debug("🔄 Opening payment update flow");
  }

  private trackCancellation(userId: string, reason?: string): void {
    // TODO: Track with your analytics service
    logger.debug(`📊 Tracked cancellation for user ${userId}: ${reason}`);
  }

  private trackExpiration(userId: string): void {
    logger.debug(`📊 Tracked expiration for user ${userId}`);
  }

  private trackPaymentFailure(userId: string, reason?: string): void {
    logger.debug(`📊 Tracked payment failure for user ${userId}: ${reason}`);
  }

  private trackReactivation(userId: string, offerCode?: string): void {
    logger.debug(
      `📊 Tracked reactivation for user ${userId} with offer: ${offerCode}`,
    );
  }

  // Mock method for development
  private async mockGetSubscriptionStatus(userId: string): Promise<any> {
    // Simulate different subscription states for testing
    const mockStates = [
      {
        status: "active",
        plan_id: "consumer_monthly",
        current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
      {
        status: "canceled",
        plan_id: "creator_monthly",
        canceled_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
      },
      {
        status: "past_due",
        plan_id: "consumer_monthly",
        current_period_end: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        status: "expired",
        plan_id: "creator_monthly",
        current_period_end: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
    ];

    // Return a random state for demo purposes
    return mockStates[Math.floor(Math.random() * mockStates.length)];
  }

  private async processUserDowngrade(
    _userId: string,
    _fromTier: string,
    _toTier: string,
  ) {
    // Implementation of processUserDowngrade method
  }
}

export default SubscriptionLifecycleService;

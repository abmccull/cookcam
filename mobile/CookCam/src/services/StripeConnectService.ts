import { Platform } from "react-native";
import logger from "../utils/logger";
import { secureStorage } from "./secureStorage";

// Declare __DEV__ global
declare const __DEV__: boolean;

export interface CreatorAccountStatus {
  isConnected: boolean;
  accountId: string | null;
  hasCompletedKYC: boolean;
  canReceivePayouts: boolean;
  requiresVerification: boolean;
  verificationFields: string[];
  currentlyDue: string[];
  pendingVerification: string[];
}

export interface CreatorEarnings {
  totalEarnings: number;
  currentBalance: number;
  pendingBalance: number;
  lastPayoutDate: Date | null;
  nextPayoutDate: Date | null;
  revenueShare: number; // 30% = 0.30
}

export interface ConnectAccountLink {
  url: string;
  expiresAt: number;
}

class StripeConnectService {
  private static instance: StripeConnectService;
  private baseURL: string;

  private constructor() {
    // Use the correct API base URL with v1 versioning
    this.baseURL = __DEV__
      ? "http://localhost:3000/api/v1"
      : "https://api.cookcam.ai/api/v1";
  }

  public static getInstance(): StripeConnectService {
    if (!StripeConnectService.instance) {
      StripeConnectService.instance = new StripeConnectService();
    }
    return StripeConnectService.instance;
  }

  /**
   * Get authorization headers with JWT token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await secureStorage.getSecureItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Create a Stripe Connect account for a creator
   */
  async createConnectAccount(creatorData: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    businessType?: "individual" | "company";
    country?: string;
  }): Promise<{ accountId: string; success: boolean; onboardingUrl?: string }> {
    try {
      logger.debug(
        "🏦 Creating Stripe Connect account for creator:",
        creatorData.userId,
      );

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/stripe/onboard`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            country: creatorData.country || "US",
            business_type: creatorData.businessType || "individual",
            platform: Platform.OS,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create Connect account");
      }

      logger.debug("✅ Connect account created:", result.accountId);
      return {
        accountId: result.accountId,
        onboardingUrl: result.onboardingUrl,
        success: true,
      };
    } catch (error) {
      logger.error("❌ Failed to create Connect account:", error);
      throw new Error("Failed to create creator account");
    }
  }

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<ConnectAccountLink> {
    try {
      logger.debug("🔗 Creating account link for:", accountId);

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/stripe/account-link`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            account_id: accountId,
            return_url: returnUrl,
            refresh_url: refreshUrl,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create account link");
      }

      return {
        url: result.url,
        expiresAt: result.expires_at,
      };
    } catch (error) {
      logger.error("❌ Failed to create account link:", error);
      throw new Error("Failed to create onboarding link");
    }
  }

  /**
   * Get the current status of a creator's Connect account
   */
  async getAccountStatus(): Promise<CreatorAccountStatus> {
    try {
      logger.debug("📊 Getting account status");

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/stripe/status`,
        {
          method: "GET",
          headers,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get account status");
      }

      // Handle case where no account exists yet
      if (!result.hasAccount) {
        return {
          isConnected: false,
          accountId: null,
          hasCompletedKYC: false,
          canReceivePayouts: false,
          requiresVerification: true,
          verificationFields: [],
          currentlyDue: [],
          pendingVerification: [],
        };
      }

      return {
        isConnected:
          result.account.chargesEnabled && result.account.payoutsEnabled,
        accountId: result.account.stripe_account_id,
        hasCompletedKYC: result.account.detailsSubmitted,
        canReceivePayouts: result.account.payoutsEnabled,
        requiresVerification: result.account.status === "pending",
        verificationFields: [],
        currentlyDue: [],
        pendingVerification: [],
      };
    } catch (error) {
      logger.error("❌ Failed to get account status:", error);
      throw new Error("Failed to get account status");
    }
  }

  /**
   * Get creator earnings and payout information
   */
  async getCreatorEarnings(): Promise<CreatorEarnings> {
    try {
      logger.debug("💰 Getting creator earnings");

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/balance`,
        {
          method: "GET",
          headers,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get earnings");
      }

      return {
        totalEarnings: result.total_earnings || 0,
        currentBalance: result.available_balance || 0,
        pendingBalance: result.pending_balance || 0,
        lastPayoutDate: result.last_payout_date
          ? new Date(result.last_payout_date)
          : null,
        nextPayoutDate: result.next_payout_date
          ? new Date(result.next_payout_date)
          : null,
        revenueShare: 0.3, // 30% revenue share
      };
    } catch (error) {
      logger.error("❌ Failed to get earnings:", error);
      throw new Error("Failed to get earnings information");
    }
  }

  /**
   * Create an instant payout (if eligible)
   */
  async createInstantPayout(
    amount: number,
  ): Promise<{ success: boolean; payoutId?: string }> {
    try {
      logger.debug("⚡ Creating instant payout. Amount:", amount);

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/payout`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: amount,
            method: "stripe",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payout");
      }

      return {
        success: true,
        payoutId: result.payout?.id,
      };
    } catch (error) {
      logger.error("❌ Failed to create payout:", error);
      throw new Error("Failed to process payout");
    }
  }

  /**
   * Get Stripe dashboard URL for creators
   */
  async getDashboardUrl(): Promise<{
    success: boolean;
    dashboardUrl?: string;
  }> {
    try {
      logger.debug("📊 Getting Stripe dashboard URL");

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/subscription/creator/stripe/dashboard`,
        {
          method: "GET",
          headers,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get dashboard URL");
      }

      return {
        success: true,
        dashboardUrl: result.dashboardUrl,
      };
    } catch (error) {
      logger.error("❌ Failed to get dashboard URL:", error);
      throw new Error("Failed to get dashboard URL");
    }
  }

  /**
   * Refresh account status from Stripe
   */
  async refreshAccountStatus(accountId: string): Promise<void> {
    try {
      logger.debug("🔄 Refreshing account status:", accountId);

      const headers = await this.getAuthHeaders();
      await fetch(
        `${this.baseURL}/subscription/creator/stripe/refresh-status`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ account_id: accountId }),
        },
      );

      // Just trigger the refresh, don't wait for response
    } catch (error) {
      logger.error("❌ Failed to refresh status:", error);
      // Don't throw here, this is a background operation
    }
  }

  /**
   * Check if creator has minimum balance for payout
   */
  async canRequestPayout(): Promise<{
    canPayout: boolean;
    balance: number;
    minimum: number;
  }> {
    try {
      const earnings = await this.getCreatorEarnings();
      const minimumPayout = 10.0; // $10 minimum

      return {
        canPayout: earnings.currentBalance >= minimumPayout,
        balance: earnings.currentBalance,
        minimum: minimumPayout,
      };
    } catch (error) {
      logger.error("❌ Failed to check payout eligibility:", error);
      return {
        canPayout: false,
        balance: 0,
        minimum: 10.0,
      };
    }
  }

  /**
   * Clear stored credentials (for logout)
   */
  async clearStoredCredentials(): Promise<void> {
    try {
      // Clear any cached Stripe account data if stored locally
      await secureStorage.removeItem("stripe_account_id");
      await secureStorage.removeItem("stripe_onboarding_complete");

      logger.debug("🧹 Stripe Connect credentials cleared");
    } catch (error) {
      logger.error("❌ Failed to clear Stripe credentials:", error);
    }
  }

  // --- Removed deprecated mock methods ---
  // All functionality now uses real Stripe Connect API calls

  async setupInstantPayouts(_creatorData: any) {
    // Implementation needed - this would configure instant payouts
    // if the creator's account supports it
    logger.debug("⚡ Setup instant payouts (not yet implemented)");
  }

  async calculateEarnings(_accountId: string) {
    // Use getCreatorEarnings instead
    return { success: false, error: "Use getCreatorEarnings method instead" };
  }
}

export default StripeConnectService;

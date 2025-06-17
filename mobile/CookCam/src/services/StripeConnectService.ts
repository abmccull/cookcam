import { Platform } from "react-native";
import logger from "../utils/logger";


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
    // TODO: Replace with your actual backend URL
    this.baseURL = __DEV__
      ? "http://localhost:3000/api"
      : "https://your-backend.com/api";
  }

  public static getInstance(): StripeConnectService {
    if (!StripeConnectService.instance) {
      StripeConnectService.instance = new StripeConnectService();
    }
    return StripeConnectService.instance;
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
  }): Promise<{ accountId: string; success: boolean }> {
    try {
      logger.debug(
        "🏦 Creating Stripe Connect account for creator:",
        creatorData.userId,
      );

      const response = await fetch(
        `${this.baseURL}/stripe/create-connect-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // TODO: Add Authorization header with JWT token
          },
          body: JSON.stringify({
            user_id: creatorData.userId,
            email: creatorData.email,
            first_name: creatorData.firstName,
            last_name: creatorData.lastName,
            business_type: creatorData.businessType || "individual",
            country: creatorData.country || "US",
            platform: Platform.OS,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create Connect account");
      }

      logger.debug("✅ Connect account created:", result.account_id);
      return {
        accountId: result.account_id,
        success: true,
      };
    } catch (error) {
      logger.error("❌ Failed to create Connect account:", error);
      throw new Error("Failed to create creator account");
    }
  }

  /**
   * Generate an account link for creator onboarding
   */
  async createAccountLink(
    accountId: string,
    returnUrl?: string,
  ): Promise<ConnectAccountLink> {
    try {
      logger.debug("🔗 Creating account link for:", accountId);

      const response = await fetch(
        `${this.baseURL}/stripe/create-account-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // TODO: Add Authorization header
          },
          body: JSON.stringify({
            account_id: accountId,
            return_url: returnUrl || "cookcam://creator-onboarding-complete",
            refresh_url: "cookcam://creator-onboarding-refresh",
            type: "account_onboarding",
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
  async getAccountStatus(accountId: string): Promise<CreatorAccountStatus> {
    try {
      logger.debug("📊 Getting account status for:", accountId);

      const response = await fetch(
        `${this.baseURL}/stripe/account-status/${accountId}`,
        {
          method: "GET",
          headers: {
            // TODO: Add Authorization header
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get account status");
      }

      return {
        isConnected: result.charges_enabled && result.payouts_enabled,
        accountId: result.id,
        hasCompletedKYC: result.details_submitted,
        canReceivePayouts: result.payouts_enabled,
        requiresVerification: result.requirements.currently_due.length > 0,
        verificationFields: result.requirements.currently_due,
        currentlyDue: result.requirements.currently_due,
        pendingVerification: result.requirements.pending_verification,
      };
    } catch (error) {
      logger.error("❌ Failed to get account status:", error);
      throw new Error("Failed to get account status");
    }
  }

  /**
   * Get creator earnings and payout information
   */
  async getCreatorEarnings(accountId: string): Promise<CreatorEarnings> {
    try {
      logger.debug("💰 Getting earnings for:", accountId);

      const response = await fetch(
        `${this.baseURL}/stripe/creator-earnings/${accountId}`,
        {
          method: "GET",
          headers: {
            // TODO: Add Authorization header
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get earnings");
      }

      return {
        totalEarnings: result.total_earnings / 100, // Convert cents to dollars
        currentBalance: result.available_balance / 100,
        pendingBalance: result.pending_balance / 100,
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
    accountId: string,
    amount: number,
  ): Promise<{ success: boolean; payoutId?: string }> {
    try {
      logger.debug(
        "⚡ Creating instant payout for:",
        accountId,
        "Amount:",
        amount,
      );

      const response = await fetch(`${this.baseURL}/stripe/create-payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add Authorization header
        },
        body: JSON.stringify({
          account_id: accountId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: "usd",
          method: "instant",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payout");
      }

      return {
        success: true,
        payoutId: result.payout_id,
      };
    } catch (error) {
      logger.error("❌ Failed to create payout:", error);
      throw new Error("Failed to process payout");
    }
  }

  /**
   * Handle webhook events from Stripe Connect
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      logger.debug("🔔 Handling Stripe Connect webhook:", event.type);

      switch (event.type) {
        case "account.updated":
          await this.handleAccountUpdate(event.data.object);
          break;
        case "account.application.deauthorized":
          await this.handleAccountDeauthorized(event.data.object);
          break;
        case "payout.paid":
          await this.handlePayoutPaid(event.data.object);
          break;
        case "payout.failed":
          await this.handlePayoutFailed(event.data.object);
          break;
        default:
          logger.debug("⚠️ Unhandled webhook event:", event.type);
      }
    } catch (error) {
      logger.error("❌ Failed to handle webhook:", error);
    }
  }

  private async handleAccountUpdate(account: any): Promise<void> {
    logger.debug("📋 Account updated:", account.id);
    // TODO: Update local database with account status
    // You might want to emit events here for the UI to react to
  }

  private async handleAccountDeauthorized(account: any): Promise<void> {
    logger.debug("🚫 Account deauthorized:", account.id);
    // TODO: Handle account disconnection
  }

  private async handlePayoutPaid(payout: any): Promise<void> {
    logger.debug("💸 Payout completed:", payout.id);
    // TODO: Update creator earnings and notify them
  }

  private async handlePayoutFailed(payout: any): Promise<void> {
    logger.debug("❌ Payout failed:", payout.id);
    // TODO: Notify creator of failed payout
  }

  /**
   * Mock implementation for development/testing
   */
  async mockCreateAccount(
    creatorData: any,
  ): Promise<{ accountId: string; success: boolean }> {
    logger.debug("🧪 Mock: Creating Connect account");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      accountId: `acct_mock_${Date.now()}`,
      success: true,
    };
  }

  async mockCreateAccountLink(accountId: string): Promise<ConnectAccountLink> {
    logger.debug("🧪 Mock: Creating account link");

    return {
      url: "https://connect.stripe.com/setup/e/acct_mock_123",
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    };
  }

  async mockGetAccountStatus(accountId: string): Promise<CreatorAccountStatus> {
    logger.debug("🧪 Mock: Getting account status");

    return {
      isConnected: true,
      accountId: accountId,
      hasCompletedKYC: true,
      canReceivePayouts: true,
      requiresVerification: false,
      verificationFields: [],
      currentlyDue: [],
      pendingVerification: [],
    };
  }

  async setupInstantPayouts(_creatorData: any) {
    // Implementation needed
  }

  async calculateEarnings(_accountId: string) {
    // Implementation needed
    return { success: false, error: "Not implemented" };
  }
}

export default StripeConnectService;

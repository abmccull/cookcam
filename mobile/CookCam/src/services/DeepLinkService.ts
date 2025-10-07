import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import logger from "../utils/logger";

interface DeepLinkData {
  type: "referral" | "creator" | "recipe" | "signup";
  code?: string;
  slug?: string;
  recipeId?: string;
}

class DeepLinkService {
  private static instance: DeepLinkService;
  private pendingLink: DeepLinkData | null = null;
  private navigationRef: unknown = null;

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  setNavigationRef(ref: unknown) {
    this.navigationRef = ref;
  }

  async initialize() {
    // Handle app launch from deep link
    const initialURL = await Linking.getInitialURL();
    if (initialURL) {
      logger.debug("🔗 App launched with deep link:", initialURL);
      this.handleDeepLink(initialURL);
    }

    // Handle deep links while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      logger.debug("🔗 Deep link received while app running:", event.url);
      this.handleDeepLink(event.url);
    });

    return subscription;
  }

  private async handleDeepLink(url: string) {
    const linkData = this.parseURL(url);

    if (linkData) {
      logger.debug("🔗 Parsed deep link data:", linkData);

      // Store referral code for later attribution
      if (linkData.code) {
        await AsyncStorage.setItem("pending_referral_code", linkData.code);
        logger.debug("💾 Stored referral code:", linkData.code);
      }

      // Track the deep link click
      await this.trackDeepLinkClick(linkData);

      // Store for processing after authentication
      this.pendingLink = linkData;

      // Navigate based on user state
      this.processDeepLink(linkData);
    }
  }

  private parseURL(url: string): DeepLinkData | null {
    try {
      const urlObj = new URL(url);
      const path = (urlObj as unknown).pathname || '/';

      logger.debug("🔍 Parsing URL path:", path);

      if (path.startsWith("/ref/")) {
        const code = path.split("/")[2];
        return {
          type: "referral",
          code: code,
        };
      }

      if (path.startsWith("/c/")) {
        const slug = path.split("/")[2];
        return {
          type: "creator",
          slug: slug,
        };
      }

      if (path.startsWith("/recipe/")) {
        const recipeId = path.split("/")[2];
        return {
          type: "recipe",
          recipeId: recipeId,
        };
      }

      if (path === "/signup") {
        return {
          type: "signup",
        };
      }

      return null;
    } catch (error) {
      logger.error("❌ Failed to parse URL:", error);
      return null;
    }
  }

  private async trackDeepLinkClick(linkData: DeepLinkData) {
    if (linkData.type === "referral" && linkData.code) {
      // Track affiliate click
      try {
        const response = await fetch(
          `https://api.cookcam.ai/api/v1/subscription/affiliate/track/${linkData.code}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "mobile_deep_link",
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
            }),
          },
        );

        if (response.ok) {
          logger.debug("📊 Successfully tracked deep link click");
        } else {
          logger.debug("⚠️ Failed to track deep link click:", response.status);
        }
      } catch (error) {
        logger.debug("❌ Failed to track deep link click:", error);
      }
    }
  }

  private processDeepLink(linkData: DeepLinkData) {
    // Store for later processing after auth/navigation setup
    logger.debug("🎯 Deep link ready for processing:", linkData);

    // If navigation is available, handle immediately
    if (this.navigationRef?.current) {
      this.navigateBasedOnLink(linkData);
    }
  }

  private navigateBasedOnLink(linkData: DeepLinkData) {
    if (!this.navigationRef?.current) {
      logger.debug("⚠️ Navigation ref not available");
      return;
    }

    switch (linkData.type) {
      case "referral":
        // Navigate to signup with referral context
        this.navigationRef.current.navigate("Welcome");
        break;
      case "creator":
        // Navigate to creator profile
        this.navigationRef.current.navigate("Creator");
        break;
      case "recipe":
        // Navigate to recipe detail
        if (linkData.recipeId) {
          // TODO: Navigate to recipe detail screen
          logger.debug("🍽️ Navigate to recipe:", linkData.recipeId);
        }
        break;
      case "signup":
        // Navigate to signup
        this.navigationRef.current.navigate("Signup");
        break;
    }
  }

  getPendingLink(): DeepLinkData | null {
    const link = this.pendingLink;
    this.pendingLink = null; // Clear after reading
    return link;
  }

  async getPendingReferralCode(): Promise<string | null> {
    const code = await AsyncStorage.getItem("pending_referral_code");
    logger.debug("📱 Retrieved pending referral code:", code);
    return code;
  }

  async clearPendingReferralCode() {
    await AsyncStorage.removeItem("pending_referral_code");
    logger.debug("🗑️ Cleared pending referral code");
  }

  // Process any pending deep links after navigation is ready
  processPendingLinks() {
    if (this.pendingLink && this.navigationRef?.current) {
      this.navigateBasedOnLink(this.pendingLink);
      this.pendingLink = null;
    }
  }
}

export default DeepLinkService;

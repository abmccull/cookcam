import { Platform } from "react-native";
import {
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ProductPurchase,
  SubscriptionPurchase,
  getProducts,
  requestPurchase,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
} from "react-native-iap";
import logger from "../utils/logger";

const itemSkus = Platform.select({
  ios: ["com.cookcam.pro.monthly", "com.cookcam.creator.monthly"],
  android: ["cookcam_pro_monthly", "cookcam_creator_monthly"],
});

class SubscriptionService {
  private static instance: SubscriptionService;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  private async initialize() {
    try {
      // Check if we're in Expo Go (IAP not supported)
      const Constants = require('expo-constants');
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        logger.debug("🎮 Running in Expo Go - IAP features disabled");
        return;
      }

      await initConnection();
      await flushFailedPurchasesCachedAsPendingAndroid();

      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: SubscriptionPurchase | ProductPurchase) => {
          const receipt = purchase.transactionReceipt;
          if (receipt) {
            try {
              // By calling finishTransaction, you are acknowledging that you have fulfilled the purchased item.
              // Failure to do this will result in refunds.
              await finishTransaction({ purchase, isConsumable: false });
              logger.debug("Purchase successful", purchase);
              // Here, you would typically validate the receipt with your backend
              // and update the user's subscription status in your database.
            } catch (ackErr) {
              logger.warn("Error acknowledging purchase", ackErr);
            }
          }
        },
      );

      this.purchaseErrorSubscription = purchaseErrorListener((error) => {
        logger.error("Purchase error", error);
      });
      
      logger.debug("✅ IAP connection initialized successfully");
    } catch (e) {
      // Don't treat this as a critical error - just log it
      logger.debug("ℹ️ IAP connection not available (expected in Expo Go):", e);
    }
  }

  async getAvailableProducts() {
    // Check if we're in Expo Go
    const Constants = require('expo-constants');
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo || !itemSkus) {
      logger.debug("🎮 IAP not available - returning empty products list");
      return [];
    }
    
    try {
      const products = await getProducts({ skus: itemSkus });
      return products;
    } catch (err) {
      logger.debug("IAP products not available:", err);
      return [];
    }
  }

  async purchaseProduct(sku: string) {
    try {
      await requestPurchase({ skus: [sku] });
    } catch (err) {
      logger.warn("Failed to purchase product", err);
    }
  }

  destroy() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }
}

export default SubscriptionService.getInstance();

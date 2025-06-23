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
import { cookCamApi } from "./cookCamApi";

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
          try {
            logger.debug("🛒 Purchase completed, validating receipt...", {
              productId: purchase.productId,
              platform: Platform.OS
            });

            // Validate receipt with backend
            const validationResult = await this.validateReceiptWithBackend(purchase);
            
            if (validationResult.success) {
              // Receipt validated successfully, finish transaction
              await finishTransaction({ purchase, isConsumable: false });
              logger.debug("✅ Purchase validated and completed successfully");
              
              // Notify app about successful purchase
              // You could emit an event here or call a callback
            } else {
              logger.error("❌ Receipt validation failed:", validationResult.error);
              // Don't finish transaction if validation failed
            }
          } catch (error) {
            logger.error("❌ Error processing purchase:", error);
          }
        },
      );

      this.purchaseErrorSubscription = purchaseErrorListener((error) => {
        logger.error("❌ Purchase error:", error);
      });
      
      logger.debug("✅ IAP connection initialized successfully");
    } catch (e) {
      // Don't treat this as a critical error - just log it
      logger.debug("ℹ️ IAP connection not available (expected in Expo Go):", e);
    }
  }

  private async validateReceiptWithBackend(purchase: SubscriptionPurchase | ProductPurchase) {
    try {
      let validationData;

      if (Platform.OS === 'ios') {
        // For iOS, send the receipt data
        validationData = {
          platform: 'ios' as const,
          productId: purchase.productId,
          receipt: purchase.transactionReceipt
        };
      } else {
        // For Android, send the purchase token
        validationData = {
          platform: 'android' as const,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken
        };
      }

      // Call backend validation API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1/iap/validate-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header here
        },
        body: JSON.stringify(validationData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error("❌ Backend validation failed:", error);
      return {
        success: false,
        error: 'Failed to validate receipt with backend'
      };
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
      logger.debug("🛒 Initiating purchase for:", sku);
      await requestPurchase({ skus: [sku] });
    } catch (err) {
      logger.error("❌ Failed to initiate purchase:", err);
      throw err;
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

export default SubscriptionService;

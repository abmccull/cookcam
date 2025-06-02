import { Platform } from 'react-native';
import { cookCamApi } from './cookCamApi';

// Install these packages:
// npm install react-native-iap
// cd ios && pod install

// Import after installing react-native-iap
// import * as RNIap from 'react-native-iap';

// Product IDs
const PRODUCT_IDS = Platform.select({
  ios: ['com.cookcam.monthly'],
  android: ['com.cookcam.monthly'],
}) || [];

interface SubscriptionProduct {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  introductoryPrice?: string;
  introductoryPricePaymentMode?: string;
  introductoryPriceSubscriptionPeriod?: string;
}

class SubscriptionService {
  private products: SubscriptionProduct[] = [];
  
  // Initialize IAP
  async initialize(): Promise<void> {
    try {
      // Uncomment after installing react-native-iap
      /*
      const result = await RNIap.initConnection();
      if (!result) {
        throw new Error('Failed to initialize IAP');
      }
      
      // Get products
      const products = await RNIap.getSubscriptions(PRODUCT_IDS);
      this.products = products;
      
      // Check for pending purchases
      await this.checkPendingPurchases();
      */
    } catch (error) {
      console.error('IAP initialization error:', error);
      throw error;
    }
  }
  
  // Get available products
  async getProducts(): Promise<SubscriptionProduct[]> {
    if (this.products.length === 0) {
      // Uncomment after installing react-native-iap
      // this.products = await RNIap.getSubscriptions(PRODUCT_IDS);
    }
    return this.products;
  }
  
  // Purchase subscription
  async purchaseSubscription(productId: string): Promise<void> {
    try {
      // Uncomment after installing react-native-iap
      /*
      const purchase = await RNIap.requestSubscription(productId, false);
      
      if (Platform.OS === 'ios') {
        // Verify iOS receipt
        const receipt = await RNIap.getReceiptIOS();
        const result = await cookCamApi.validateSubscriptionPurchase({
          platform: 'ios',
          receipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId
        });
        
        if (!result.success) {
          throw new Error('Receipt verification failed');
        }
        
        // Finish transaction
        await RNIap.finishTransactionIOS(purchase.transactionId);
      } else {
        // Verify Android purchase
        const result = await cookCamApi.validateSubscriptionPurchase({
          platform: 'android',
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId
        });
        
        if (!result.success) {
          throw new Error('Purchase verification failed');
        }
        
        // Acknowledge purchase
        await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
      }
      */
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }
  
  // Restore purchases
  async restorePurchases(): Promise<void> {
    try {
      // Uncomment after installing react-native-iap
      /*
      const purchases = await RNIap.getAvailablePurchases();
      
      for (const purchase of purchases) {
        if (Platform.OS === 'ios') {
          const receipt = await RNIap.getReceiptIOS();
          await cookCamApi.validateSubscriptionPurchase({
            platform: 'ios',
            receipt,
            productId: purchase.productId,
            transactionId: purchase.transactionId
          });
        } else {
          await cookCamApi.validateSubscriptionPurchase({
            platform: 'android',
            purchaseToken: purchase.purchaseToken,
            productId: purchase.productId
          });
        }
      }
      */
    } catch (error) {
      console.error('Restore purchases error:', error);
      throw error;
    }
  }
  
  // Check subscription status
  async checkSubscriptionStatus(): Promise<any> {
    try {
      const response = await cookCamApi.getSubscriptionStatus();
      return response.data;
    } catch (error) {
      console.error('Check subscription error:', error);
      throw error;
    }
  }
  
  // Cancel subscription
  async cancelSubscription(): Promise<void> {
    try {
      await cookCamApi.cancelSubscription();
      
      // Note: This only marks it as cancelled in our backend
      // Users need to cancel through App Store/Google Play
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }
  
  // Check for pending purchases
  private async checkPendingPurchases(): Promise<void> {
    try {
      // Uncomment after installing react-native-iap
      /*
      const purchases = await RNIap.getAvailablePurchases();
      
      for (const purchase of purchases) {
        // Process any unfinished purchases
        if (Platform.OS === 'ios' && !purchase.isAcknowledgedIOS) {
          await RNIap.finishTransactionIOS(purchase.transactionId);
        } else if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
          await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
        }
      }
      */
    } catch (error) {
      console.error('Check pending purchases error:', error);
    }
  }
  
  // Clean up
  async cleanup(): Promise<void> {
    try {
      // Uncomment after installing react-native-iap
      // await RNIap.endConnection();
    } catch (error) {
      console.error('IAP cleanup error:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService(); 
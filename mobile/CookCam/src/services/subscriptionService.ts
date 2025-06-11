import {Platform} from 'react-native';
import {
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type ProductPurchase,
  type SubscriptionPurchase,
  type Product,
  type Subscription,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  clearTransactionIOS,
  validateReceiptIos,
  validateReceiptAndroid,
  acknowledgePurchaseAndroid,
  PurchaseError,
} from 'react-native-iap';

import {TempDataState} from '../context/TempDataContext';

// Types for App Store/Google Play subscriptions
export interface SubscriptionProduct {
  productId: string;
  name: string;
  price: string;
  currency: string;
  localizedPrice: string;
  introductoryPrice?: string;
  introductoryPriceNumberOfPeriods?: number;
  introductoryPriceSubscriptionPeriod?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string | null;
  expirationDate: Date | null;
  isTrialPeriod: boolean;
  originalTransactionId: string | null;
}

// Product IDs for different subscription tiers
const PRODUCT_IDS = {
  consumer:
    Platform.OS === 'ios' ? 'com.cookcam.consumer.monthly' : 'consumer_monthly',
  creator:
    Platform.OS === 'ios' ? 'com.cookcam.creator.monthly' : 'creator_monthly',
};

class SubscriptionService {
  private static instance: SubscriptionService;
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await initConnection();
      this.isInitialized = true;
      console.log('✅ IAP Connection initialized');

      // Set up purchase listeners
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: SubscriptionPurchase | ProductPurchase) => {
          console.log('🔄 Purchase update:', purchase.productId);
          await this.handlePurchaseUpdate(purchase);
        },
      );

      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          console.error('❌ Purchase error:', error);
          this.handlePurchaseError(error);
        },
      );
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      throw new Error('Failed to initialize subscription service');
    }
  }

  async getAvailableProducts(): Promise<SubscriptionProduct[]> {
    try {
      const products = await getSubscriptions({
        skus: Object.values(PRODUCT_IDS),
      });

      return products.map(product => ({
        productId: product.productId,
        name: product.title || product.productId,
        price: this.getProductPrice(product),
        currency: this.getProductCurrency(product),
        localizedPrice: this.getProductLocalizedPrice(product),
        introductoryPrice: this.getProductIntroductoryPrice(product),
        introductoryPriceNumberOfPeriods:
          this.getProductIntroductoryPriceNumberOfPeriods(product),
        introductoryPriceSubscriptionPeriod:
          this.getProductIntroductoryPriceSubscriptionPeriod(product),
      }));
    } catch (error) {
      console.error('❌ Failed to get products:', error);
      throw new Error('Failed to load subscription options');
    }
  }

  // Helper methods to safely access product properties
  private getProductPrice(product: Subscription): string {
    if (Platform.OS === 'ios') {
      return (product as any).price || '0';
    } else {
      // Android
      return (product as any).price_amount_micros
        ? ((product as any).price_amount_micros / 1000000).toString()
        : '0';
    }
  }

  private getProductCurrency(product: Subscription): string {
    if (Platform.OS === 'ios') {
      return (product as any).currency || 'USD';
    } else {
      // Android
      return (product as any).price_currency_code || 'USD';
    }
  }

  private getProductLocalizedPrice(product: Subscription): string {
    if (Platform.OS === 'ios') {
      return (product as any).localizedPrice || '$0.00';
    } else {
      // Android
      return (product as any).price || '$0.00';
    }
  }

  private getProductIntroductoryPrice(
    product: Subscription,
  ): string | undefined {
    if (Platform.OS === 'ios') {
      return (product as any).introductoryPrice;
    } else {
      // Android - check for free trial or intro pricing
      const skuDetails = (product as any).subscriptionOfferDetails?.[0];
      return skuDetails?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice;
    }
  }

  private getProductIntroductoryPriceNumberOfPeriods(
    product: Subscription,
  ): number | undefined {
    if (Platform.OS === 'ios') {
      return (product as any).introductoryPriceNumberOfPeriodsIOS;
    } else {
      // Android
      const skuDetails = (product as any).subscriptionOfferDetails?.[0];
      return skuDetails?.pricingPhases?.pricingPhaseList?.[0]
        ?.billingCycleCount;
    }
  }

  private getProductIntroductoryPriceSubscriptionPeriod(
    product: Subscription,
  ): string | undefined {
    if (Platform.OS === 'ios') {
      return (product as any).introductoryPriceSubscriptionPeriodIOS;
    } else {
      // Android
      const skuDetails = (product as any).subscriptionOfferDetails?.[0];
      return skuDetails?.pricingPhases?.pricingPhaseList?.[0]?.billingPeriod;
    }
  }

  async startSubscriptionTrial(
    plan: 'consumer' | 'creator',
    tempData: TempDataState,
  ): Promise<{success: boolean; transactionId?: string}> {
    try {
      const productId = PRODUCT_IDS[plan];
      console.log(
        `🚀 Starting ${plan} subscription trial for product:`,
        productId,
      );

      // Store temp data reference for later merging
      const serializedTempData = JSON.stringify(tempData);
      console.log('📊 Temp data to be merged:', serializedTempData);

      // Request subscription purchase
      await requestSubscription({
        sku: productId,
        ...(Platform.OS === 'android' && {
          purchaseTokenAndroid: undefined,
          prorationModeAndroid: undefined,
        }),
      });

      // The actual purchase will be handled by the purchaseUpdatedListener
      return {success: true};
    } catch (error) {
      console.error(`❌ Failed to start ${plan} subscription:`, error);
      throw new Error(`Failed to start ${plan} subscription trial`);
    }
  }

  private async handlePurchaseUpdate(
    purchase: SubscriptionPurchase | ProductPurchase,
  ) {
    try {
      console.log('🔄 Processing purchase:', purchase.productId);

      // Verify purchase on your backend
      const isValid = await this.verifyPurchaseOnBackend(purchase);

      if (isValid) {
        // Acknowledge the purchase (Android requirement)
        if (Platform.OS === 'android') {
          await acknowledgePurchaseAndroid({
            token: purchase.purchaseToken!,
            developerPayload: purchase.developerPayloadAndroid,
          });
        }

        // Finish the transaction
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        console.log('✅ Purchase completed successfully');

        // You can emit an event here for the UI to handle
        // EventEmitter.emit('subscriptionActivated', purchase);
      } else {
        console.error('❌ Purchase verification failed');
        throw new Error('Purchase verification failed');
      }
    } catch (error) {
      console.error('❌ Failed to handle purchase update:', error);
    }
  }

  private async verifyPurchaseOnBackend(
    purchase: SubscriptionPurchase | ProductPurchase,
  ): Promise<boolean> {
    try {
      // TODO: Implement backend verification
      // This should send the purchase receipt to your backend for verification
      // with Apple/Google servers

      const response = await fetch('YOUR_BACKEND_URL/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: Platform.OS,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          purchaseToken: purchase.purchaseToken,
          receipt: purchase.transactionReceipt,
        }),
      });

      const result = await response.json();
      return result.isValid === true;
    } catch (error) {
      console.error('❌ Backend verification failed:', error);
      // For development, return true. In production, this should return false
      return __DEV__ ? true : false;
    }
  }

  private handlePurchaseError(error: PurchaseError) {
    console.error('❌ Purchase error details:', {
      code: error.code,
      message: error.message,
      debugMessage: error.debugMessage,
    });

    // You can emit an event here for the UI to handle
    // EventEmitter.emit('subscriptionError', error);
  }

  async getCurrentSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      // TODO: Implement actual subscription status check
      // This should check with your backend or the platform stores

      return {
        isActive: false,
        productId: null,
        expirationDate: null,
        isTrialPeriod: false,
        originalTransactionId: null,
      };
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      // Note: Actual cancellation happens in device settings for iOS
      // and Google Play Store for Android. This is just for tracking.
      console.log('ℹ️ Subscription cancellation initiated');

      // You might want to call your backend to mark the subscription
      // as cancelled in your system
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      return false;
    }
  }

  destroy() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    this.isInitialized = false;
  }
}

export default SubscriptionService;

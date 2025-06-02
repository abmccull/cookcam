import { Platform } from 'react-native';
import { cookCamApi } from './cookCamApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import react-native-iap
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  acknowledgePurchaseAndroid,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  PurchaseError,
  Subscription,
  SubscriptionPurchase,
} from 'react-native-iap';

// Types for App Store/Google Play subscriptions
interface SubscriptionProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  currency: string;
  title: string;
  description: string;
  introductoryPrice?: string;
  freeTrialPeriod?: string;
  tier: 'regular' | 'creator';
}

interface PurchaseResult {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string; // Android only
}

interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  tier?: 'regular' | 'creator';
  expiryDate?: Date;
  isTrialPeriod?: boolean;
  autoRenewing?: boolean;
}

// Product IDs for both platforms - Updated with two tiers
const SUBSCRIPTION_PRODUCTS = {
  regular: Platform.select({
    ios: 'com.cookcam.regular',
    android: 'com.cookcam.regular',
  }),
  creator: Platform.select({
    ios: 'com.cookcam.creator',
    android: 'com.cookcam.creator',
  }),
};

class AppStoreSubscriptionService {
  private isInitialized = false;
  private products: SubscriptionProduct[] = [];
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;
  
  // Initialize In-App Purchase connection
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;
      
      const result = await initConnection();
      if (!result) {
        throw new Error('Failed to initialize IAP connection');
      }
      
      console.log('✅ IAP initialized successfully');
      this.isInitialized = true;
      
      // Load subscription products
      await this.loadProducts();
      
      // Check for any pending purchases
      await this.processPendingPurchases();
      
      // Set up purchase update listener
      this.setupPurchaseListener();
      
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      throw error;
    }
  }
  
  // Load available subscription products
  private async loadProducts(): Promise<void> {
    try {
      const productIds = Object.values(SUBSCRIPTION_PRODUCTS).filter(Boolean) as string[];
      const products = await getSubscriptions({ skus: productIds });
      
      this.products = products.map((product: Subscription) => ({
        productId: product.productId,
        price: (product as any).price || '0',
        localizedPrice: (product as any).localizedPrice || '$0',
        currency: (product as any).currency || 'USD',
        title: (product as any).title || product.productId,
        description: (product as any).description || '',
        introductoryPrice: (product as any).introductoryPrice,
        freeTrialPeriod: (product as any).freeTrialPeriod,
        tier: this.getProductTier(product.productId),
      }));
      
      console.log(`📦 Loaded ${this.products.length} subscription products`);
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      
      // Fallback to mock products for development
      this.products = [
        {
          productId: 'com.cookcam.regular',
          price: '3.99',
          localizedPrice: '$3.99',
          currency: 'USD',
          title: 'CookCam Premium',
          description: 'Unlimited scans, premium recipes, and ad-free experience',
          freeTrialPeriod: '3 days',
          tier: 'regular',
        },
        {
          productId: 'com.cookcam.creator',
          price: '9.99',
          localizedPrice: '$9.99',
          currency: 'USD',
          title: 'CookCam Creator',
          description: 'Everything in Premium plus creator tools with 30% referrals, 100% tips, 70% collections',
          freeTrialPeriod: '3 days',
          tier: 'creator',
        }
      ];
    }
  }
  
  private getProductTier(productId: string): 'regular' | 'creator' {
    if (productId.includes('creator')) return 'creator';
    return 'regular';
  }
  
  // Get available subscription products
  async getAvailableProducts(): Promise<SubscriptionProduct[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }
  
  // Purchase a subscription
  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      console.log(`🛒 Attempting to purchase: ${productId}`);
      
      const purchase = await requestSubscription({ sku: productId });
      
      if (purchase) {
        console.log('✅ Purchase successful:', purchase);
        
        // Process the purchase - handle both single purchase and array
        const purchases = Array.isArray(purchase) ? purchase : [purchase];
        let success = false;
        
        for (const p of purchases) {
          success = await this.processPurchase(p) || success;
        }
        
        return success;
      }
      
      return false;
      
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Handle specific error cases
      if (error.code === 'E_USER_CANCELLED') {
        console.log('🚫 User cancelled purchase');
        return false;
      }
      
      throw error;
    }
  }
  
  // Process completed purchase with server validation
  private async processPurchase(purchase: SubscriptionPurchase): Promise<boolean> {
    try {
      console.log('🔄 Processing purchase with server validation...');
      
      // Prepare validation data based on platform
      const validationData = Platform.select({
        ios: {
          platform: 'ios' as const,
          receipt: purchase.transactionReceipt,
          transactionId: purchase.transactionId,
          productId: purchase.productId,
        },
        android: {
          platform: 'android' as const,
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
        },
      });
      
      // Send to server for validation
      const response = await cookCamApi.validateSubscriptionPurchase(validationData!);
      
      if (response.success) {
        console.log('✅ Server validation successful');
        
        // Finish the transaction
        await this.finishTransaction(purchase);
        
        // Update local subscription status
        await this.refreshSubscriptionStatus();
        
        // If this is a creator subscription, trigger creator onboarding
        if (purchase.productId.includes('creator')) {
          await this.handleCreatorSubscription(purchase);
        }
        
        return true;
      } else {
        console.error('❌ Server validation failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to process purchase:', error);
      return false;
    }
  }
  
  // Handle creator subscription activation
  private async handleCreatorSubscription(purchase: SubscriptionPurchase): Promise<void> {
    try {
      console.log('🎨 Setting up creator subscription...');
      
      // Notify server to upgrade user to creator status
      await cookCamApi.updateProfile({
        is_creator: true,
        creator_tier: 1, // Set initial creator tier
      });
      
      // Track creator conversion
      await cookCamApi.trackEvent('creator_subscription_started', {
        productId: purchase.productId,
        tier: 'creator',
        revenueShareEnabled: true
      });
      
      console.log('✅ Creator subscription activated');
    } catch (error) {
      console.error('❌ Failed to handle creator subscription:', error);
    }
  }
  
  // Auto-subscribe creators to their tier
  async autoSubscribeCreator(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Auto-subscribing creator...');
      
      const creatorProductId = SUBSCRIPTION_PRODUCTS.creator;
      if (!creatorProductId) {
        throw new Error('Creator product ID not found');
      }
      
      const success = await this.purchaseSubscription(creatorProductId);
      
      if (success) {
        console.log('✅ Creator auto-subscribed successfully');
        
        // Track auto-subscription
        await cookCamApi.trackEvent('creator_auto_subscribed', {
          userId,
          productId: creatorProductId,
          tier: 'creator'
        });
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to auto-subscribe creator:', error);
      return false;
    }
  }
  
  // Finish transaction (iOS) or acknowledge purchase (Android)
  private async finishTransaction(purchase: SubscriptionPurchase): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await finishTransaction({ purchase: purchase as any, isConsumable: false });
        console.log('✅ iOS transaction finished');
      } else {
        await acknowledgePurchaseAndroid({ token: purchase.purchaseToken!, developerPayload: undefined });
        console.log('✅ Android purchase acknowledged');
      }
    } catch (error) {
      console.error('❌ Failed to finish transaction:', error);
    }
  }
  
  // Restore previous purchases
  async restorePurchases(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      console.log('🔄 Restoring purchases...');
      
      const purchases = await getAvailablePurchases();
      
      for (const purchase of purchases) {
        await this.processPurchase(purchase as SubscriptionPurchase);
      }
      
      console.log(`✅ Restored ${purchases.length} purchases`);
      return purchases.length > 0;
      
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      return false;
    }
  }
  
  // Check current subscription status
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      // Get status from server (which checks JWT claims and database)
      const response = await cookCamApi.getSubscriptionStatus();
      
      if (response.success && response.data) {
        const subscription = response.data;
        
        return {
          isActive: subscription.status === 'active' || subscription.status === 'trial',
          productId: subscription.tier_slug,
          tier: subscription.tier_slug as 'regular' | 'creator',
          expiryDate: subscription.current_period_end ? new Date(subscription.current_period_end) : undefined,
          isTrialPeriod: subscription.status === 'trial',
          autoRenewing: !subscription.cancel_at_period_end,
        };
      }
      
      return { isActive: false };
      
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      return { isActive: false };
    }
  }
  
  // Refresh subscription status from server
  async refreshSubscriptionStatus(): Promise<void> {
    try {
      // This will trigger a re-check of the user's subscription status
      await this.getSubscriptionStatus();
      console.log('✅ Subscription status refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh subscription status:', error);
    }
  }
  
  // Process any pending purchases on app start
  private async processPendingPurchases(): Promise<void> {
    try {
      const purchases = await getAvailablePurchases();
      
      for (const purchase of purchases) {
        // Only process unacknowledged purchases (platform-specific check)
        const needsProcessing = Platform.OS === 'ios' 
          ? !(purchase as any).isAcknowledgedIOS
          : !(purchase as any).isAcknowledgedAndroid;
          
        if (needsProcessing) {
          await this.processPurchase(purchase as SubscriptionPurchase);
        }
      }
      
      console.log('✅ Pending purchases processed');
    } catch (error) {
      console.error('❌ Failed to process pending purchases:', error);
    }
  }
  
  // Set up purchase update listener
  private setupPurchaseListener(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: SubscriptionPurchase) => {
        console.log('🔄 Purchase update received:', purchase);
        
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          await this.processPurchase(purchase);
        }
      }
    );
    
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.warn('❌ Purchase error:', error);
      }
    );
  }
  
  // Navigate to subscription management
  async openSubscriptionManagement(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Open iOS subscription management
        const url = 'itms-apps://apps.apple.com/account/subscriptions';
        const { Linking } = require('react-native');
        await Linking.openURL(url);
        console.log('📱 Opening iOS subscription management');
      } else {
        // Open Google Play subscription management
        const url = 'https://play.google.com/store/account/subscriptions';
        const { Linking } = require('react-native');
        await Linking.openURL(url);
        console.log('📱 Opening Google Play subscription management');
      }
    } catch (error) {
      console.error('❌ Failed to open subscription management:', error);
    }
  }
  
  // Clean up connections
  async cleanup(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
      }
      
      await endConnection();
      
      this.isInitialized = false;
      console.log('✅ IAP service cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup IAP service:', error);
    }
  }
}

// Export singleton instance
export const subscriptionService = new AppStoreSubscriptionService();

// Export types
export type { SubscriptionProduct, PurchaseResult, SubscriptionStatus }; 
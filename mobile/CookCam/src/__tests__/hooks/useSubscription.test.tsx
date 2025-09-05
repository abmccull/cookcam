// Mock dependencies before imports
jest.mock('expo-secure-store');
jest.mock('../../services/cookCamApi');
jest.mock('../../services/subscriptionService');
jest.mock('../../context/AuthContext');
jest.mock('../../utils/logger');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SubscriptionProvider, useSubscription } from '../../context/SubscriptionContext';
import * as SecureStore from 'expo-secure-store';
import { cookCamApi } from '../../services/cookCamApi';
import SubscriptionService from '../../services/subscriptionService';
import { useAuth } from '../../context/AuthContext';
import logger from '../../utils/logger';

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedCookCamApi = cookCamApi as jest.Mocked<typeof cookCamApi>;
const mockedSubscriptionService = SubscriptionService as jest.Mocked<typeof SubscriptionService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock data
const mockTiers = [
  {
    id: 'free',
    slug: 'free' as const,
    name: 'Free',
    price: 0,
    currency: 'USD',
    billing_period: 'monthly' as const,
    features: ['Basic recipes', '5 scans per day'],
    limits: { daily_scans: 5, saved_recipes: 10 }
  },
  {
    id: 'premium',
    slug: 'regular' as const,
    name: 'Premium',
    price: 9.99,
    currency: 'USD',
    billing_period: 'monthly' as const,
    features: ['Unlimited scans', 'Premium recipes'],
    limits: { daily_scans: -1, saved_recipes: -1 }
  }
];

const mockProducts = [
  {
    productId: 'com.cookcam.premium.monthly',
    price: '$9.99',
    localizedPrice: '$9.99',
    currency: 'USD',
    title: 'CookCam Premium Monthly',
    description: 'Unlimited access to all features',
    tier: 'regular' as const
  }
];

const mockSubscription = {
  id: 'sub-123',
  tier_slug: 'regular' as const,
  status: 'active' as const,
  trial_ends_at: null,
  current_period_start: '2024-01-01',
  current_period_end: '2024-02-01',
  cancel_at_period_end: false
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  isCreator: false,
  level: 5,
  xp: 1250,
  streak: 7,
  badges: []
};

describe('useSubscription Hook', () => {
  // Helper to render hook with provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SubscriptionProvider>{children}</SubscriptionProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    mockedUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isCreatingProfile: false,
      login: jest.fn(),
      loginWithBiometrics: jest.fn(),
      enableBiometricLogin: jest.fn(),
      disableBiometricLogin: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn()
    });

    // Default API mocks
    mockedCookCamApi.getSubscriptionTiers.mockResolvedValue({
      success: true,
      data: mockTiers
    });

    mockedCookCamApi.getSubscriptionProducts.mockResolvedValue({
      success: true,
      data: { products: mockProducts }
    });

    mockedCookCamApi.getSubscriptionStatus.mockResolvedValue({
      success: true,
      data: mockSubscription
    });

    mockedCookCamApi.checkFeatureAccess.mockResolvedValue({
      success: true,
      data: { hasAccess: true, usage: { used: 2, limit: 5 } }
    });

    // Mock SecureStore
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      expect(result.current.state.tiers).toEqual([]);
      expect(result.current.state.products).toEqual([]);
      expect(result.current.state.currentSubscription).toBeNull();
      expect(result.current.state.subscriptionLoading).toBe(false);
      expect(result.current.state.isCreator).toBe(false);
      expect(result.current.state.showPaywall).toBe(false);
    });

    it('should load subscription data on mount', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(mockedCookCamApi.getSubscriptionTiers).toHaveBeenCalled();
        expect(mockedCookCamApi.getSubscriptionProducts).toHaveBeenCalled();
        expect(mockedCookCamApi.getSubscriptionStatus).toHaveBeenCalled();
      });

      expect(result.current.state.tiers).toEqual(mockTiers);
      expect(result.current.state.products).toEqual(mockProducts);
      expect(result.current.state.currentSubscription).toEqual(mockSubscription);
    });
  });

  describe('Feature Access', () => {
    it('should check feature access', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      let hasAccess: boolean = false;
      await act(async () => {
        hasAccess = await result.current.checkFeatureAccess('unlimited_scans');
      });

      expect(hasAccess).toBe(true);
      expect(mockedCookCamApi.checkFeatureAccess).toHaveBeenCalledWith('unlimited_scans');
      expect(result.current.state.featureAccess['unlimited_scans']).toBe(true);
      expect(result.current.state.usageLimits['unlimited_scans']).toEqual({
        used: 2,
        limit: 5
      });
    });

    it('should handle feature access denial', async () => {
      mockedCookCamApi.checkFeatureAccess.mockResolvedValue({
        success: true,
        data: { hasAccess: false }
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      let hasAccess: boolean = true;
      await act(async () => {
        hasAccess = await result.current.checkFeatureAccess('premium_feature');
      });

      expect(hasAccess).toBe(false);
      expect(result.current.state.featureAccess['premium_feature']).toBe(false);
    });

    it('should use cached feature access', () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      // Manually set cached access
      act(() => {
        result.current.state.featureAccess['cached_feature'] = true;
      });

      const canUse = result.current.canUseFeature('cached_feature');
      expect(canUse).toBe(true);
    });

    it('should get remaining usage', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.checkFeatureAccess('daily_scans');
      });

      const remaining = result.current.getRemainingUsage('daily_scans');
      expect(remaining).toBe(3); // 5 - 2 = 3
    });

    it('should handle unlimited usage', async () => {
      mockedCookCamApi.checkFeatureAccess.mockResolvedValue({
        success: true,
        data: { hasAccess: true, usage: { used: 10, limit: -1 } }
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.checkFeatureAccess('unlimited_feature');
      });

      const remaining = result.current.getRemainingUsage('unlimited_feature');
      expect(remaining).toBeNull(); // Unlimited
    });
  });

  describe('Subscription Management', () => {
    it('should purchase subscription', async () => {
      const mockPurchaseResult = { success: true };
      (SubscriptionService.purchaseProduct as jest.Mock) = jest.fn().mockResolvedValue(mockPurchaseResult);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.purchaseSubscription('com.cookcam.premium.monthly');
      });

      expect(SubscriptionService.purchaseProduct).toHaveBeenCalledWith('com.cookcam.premium.monthly');
    });

    it('should handle purchase failure', async () => {
      const mockError = new Error('Purchase failed');
      (SubscriptionService.purchaseProduct as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await expect(
        act(async () => {
          await result.current.purchaseSubscription('invalid-product');
        })
      ).rejects.toThrow('Purchase failed');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Purchase failed:',
        mockError
      );
    });

    it('should restore purchases', async () => {
      const mockRestoreResult = { restored: ['product1'] };
      (SubscriptionService.restorePurchases as jest.Mock) = jest.fn().mockResolvedValue(mockRestoreResult);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.restorePurchases();
      });

      expect(SubscriptionService.restorePurchases).toHaveBeenCalled();
    });

    it('should open subscription management', async () => {
      (SubscriptionService.openSubscriptionManagement as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.openSubscriptionManagement();
      });

      expect(SubscriptionService.openSubscriptionManagement).toHaveBeenCalled();
    });
  });

  describe('Creator Features', () => {
    beforeEach(() => {
      const creatorUser = { ...mockUser, isCreator: true };
      mockedUseAuth.mockReturnValue({
        user: creatorUser,
        isLoading: false,
        isCreatingProfile: false,
        login: jest.fn(),
        loginWithBiometrics: jest.fn(),
        enableBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn()
      });
    });

    it('should load creator data', async () => {
      const mockRevenue = {
        total_earnings: 1500,
        monthly_earnings: 250,
        affiliate_earnings: 100,
        tips_earnings: 50,
        collections_earnings: 100,
        unpaid_balance: 200,
        active_referrals: 5,
        revenue_breakdown: {
          referrals_rate: 30,
          tips_rate: 100,
          collections_rate: 70
        }
      };

      mockedCookCamApi.getCreatorRevenue.mockResolvedValue({
        success: true,
        data: mockRevenue
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.loadCreatorData();
      });

      expect(mockedCookCamApi.getCreatorRevenue).toHaveBeenCalled();
      expect(result.current.state.creatorRevenue).toEqual(mockRevenue);
      expect(result.current.state.isCreator).toBe(true);
    });

    it('should generate affiliate link', async () => {
      const mockAffiliateLink = {
        id: '1',
        link_code: 'ABC123',
        full_url: 'https://cookcam.com/ref/ABC123',
        click_count: 0,
        conversion_count: 0,
        is_active: true
      };

      mockedCookCamApi.generateAffiliateLink.mockResolvedValue({
        success: true,
        data: mockAffiliateLink
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      let affiliateUrl: string = '';
      await act(async () => {
        affiliateUrl = await result.current.generateAffiliateLink('summer_promo');
      });

      expect(affiliateUrl).toBe('https://cookcam.com/ref/ABC123');
      expect(mockedCookCamApi.generateAffiliateLink).toHaveBeenCalledWith('summer_promo', undefined);
    });

    it('should request payout', async () => {
      mockedCookCamApi.requestPayout.mockResolvedValue({
        success: true,
        data: { id: 'payout-123', status: 'pending' }
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.requestPayout(500);
      });

      expect(mockedCookCamApi.requestPayout).toHaveBeenCalledWith(500, 'stripe');
    });

    it('should auto-subscribe creator', async () => {
      const mockAutoSubscribe = jest.fn().mockResolvedValue(true);
      (SubscriptionService.autoSubscribeCreator as jest.Mock) = mockAutoSubscribe;

      const { result } = renderHook(() => useSubscription(), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.autoSubscribeCreator('creator-123');
      });

      expect(success).toBe(true);
      expect(mockAutoSubscribe).toHaveBeenCalledWith('creator-123');
    });
  });

  describe('Status Checks', () => {
    it('should check if user is subscribed', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.currentSubscription).toEqual(mockSubscription);
      });

      const isSubscribed = result.current.isSubscribed();
      expect(isSubscribed).toBe(true);
    });

    it('should check if user has active trial', async () => {
      const trialSubscription = {
        ...mockSubscription,
        status: 'trial' as const,
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockedCookCamApi.getSubscriptionStatus.mockResolvedValue({
        success: true,
        data: trialSubscription
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.currentSubscription?.status).toBe('trial');
      });

      const hasTrial = result.current.hasActiveTrial();
      expect(hasTrial).toBe(true);
    });

    it('should check if user is creator', () => {
      const creatorUser = { ...mockUser, isCreator: true };
      mockedUseAuth.mockReturnValue({
        user: creatorUser,
        isLoading: false,
        isCreatingProfile: false,
        login: jest.fn(),
        loginWithBiometrics: jest.fn(),
        enableBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn()
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      const isCreator = result.current.isCreator();
      expect(isCreator).toBe(true);
    });
  });

  describe('Paywall', () => {
    it('should show upgrade prompt', () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      act(() => {
        result.current.showUpgradePrompt('premium_feature');
      });

      expect(result.current.state.showPaywall).toBe(true);
    });

    it('should not show paywall for subscribed users', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.currentSubscription).toEqual(mockSubscription);
      });

      act(() => {
        result.current.showUpgradePrompt('premium_feature');
      });

      expect(result.current.state.showPaywall).toBe(false);
    });
  });

  describe('Data Refresh', () => {
    it('should refresh all subscription data', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockedCookCamApi.getSubscriptionTiers).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
      expect(mockedCookCamApi.getSubscriptionStatus).toHaveBeenCalledTimes(2);
    });

    it('should update last checked timestamp', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      const beforeRefresh = result.current.state.lastChecked;

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.state.lastChecked).toBeGreaterThan(beforeRefresh || 0);
    });
  });

  describe('Caching', () => {
    it('should cache subscription data', async () => {
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
          'subscription_cache',
          expect.any(String)
        );
      });
    });

    it('should load from cache', async () => {
      const cachedData = {
        tiers: mockTiers,
        currentSubscription: mockSubscription,
        lastChecked: Date.now() - 5 * 60 * 1000 // 5 minutes ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.tiers).toEqual(mockTiers);
        expect(result.current.state.currentSubscription).toEqual(mockSubscription);
      });
    });

    it('should invalidate stale cache', async () => {
      const staleData = {
        tiers: mockTiers,
        lastChecked: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(staleData));

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(mockedCookCamApi.getSubscriptionTiers).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockedCookCamApi.getSubscriptionTiers.mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.subscriptionError).toBe('API Error');
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to load subscription tiers:',
        'API Error'
      );
    });

    it('should handle network errors', async () => {
      mockedCookCamApi.getSubscriptionStatus.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(mockedLogger.error).toHaveBeenCalledWith(
          'Failed to load subscription status:',
          expect.any(Error)
        );
      });
    });

    it('should handle anonymous users', async () => {
      mockedUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isCreatingProfile: false,
        login: jest.fn(),
        loginWithBiometrics: jest.fn(),
        enableBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn()
      });

      const { result } = renderHook(() => useSubscription(), { wrapper });

      // Should not crash and should return false for subscription checks
      expect(result.current.isSubscribed()).toBe(false);
      expect(result.current.isCreator()).toBe(false);
    });
  });
});
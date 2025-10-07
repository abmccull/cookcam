# CookCam: Onboarding & Paywall Implementation Plan

**Document Version**: 1.0  
**Created**: October 6, 2025  
**Status**: Ready for Implementation  
**Estimated Timeline**: 3-4 weeks  
**Expected Impact**: 2× trial conversion rate (from <20% to 40-60%)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target State](#target-state)
4. [Critical Blockers](#critical-blockers)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Detailed Implementation Guide](#detailed-implementation-guide)
7. [Analytics & Instrumentation](#analytics--instrumentation)
8. [Testing & Validation](#testing--validation)
9. [Experiment Framework](#experiment-framework)
10. [Success Metrics](#success-metrics)
11. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### The Problem
- **PlanPaywallScreen.tsx is empty** - no active paywall exists
- Users see authentication gate **before** experiencing core value
- Demo onboarding flow exists but is **orphaned** (not in main navigation)
- No funnel analytics tracking conversion
- Time-to-value: 2-5 minutes (target: 60-120s)

### The Solution
Implement a value-first onboarding flow:
```
OLD: Welcome → Slides → Auth Gate ❌ (no value)
NEW: Welcome → Camera Demo → Recipe Preview → Paywall → Auth ✅ (value first)
```

### Key Deliverables
1. ✅ **Functional paywall** with trial messaging, compliance text, and payment integration
2. ✅ **Reordered flow** putting demo before authentication
3. ✅ **Analytics instrumentation** tracking 10+ funnel events
4. ✅ **Compliance improvements** meeting App Store/Play Store requirements
5. ✅ **A/B testing framework** for continuous optimization

### Business Impact
- **Trial opt-in rate**: <20% → 40-60% (2-3× improvement)
- **Time-to-value**: 2-5 min → 60-120s (50-75% reduction)
- **User retention**: Higher engagement from experiencing value early
- **Revenue**: Faster trial starts = more conversions

---

## Current State Analysis

### Flow Diagram
```
┌──────────────────────────────────────────────────────┐
│                CURRENT FLOW (BROKEN)                  │
└──────────────────────────────────────────────────────┘

ColdOpen (1.5s)
    ↓
WelcomeScreen
    ↓ [I'm New]
OnboardingScreen (3 static slides)
    ↓ [Get Started]
Push notification prompt ❌ Too early
    ↓
AccountGateScreen ❌ Blocks value!
    ↓ [Auth incomplete]
PlanSelectionSheet
    ↓ [Continue]
PlanPaywallScreen ❌ EMPTY FILE!

┌──────────────────────────────────────────────────────┐
│            ORPHANED DEMO (Not in flow)                │
└──────────────────────────────────────────────────────┘

❓ DemoOnboardingScreen ← Exists but not routed
    ↓
RecipeCarouselScreen ← Shows 3 AI recipes
    ↓
PlanSelection
```

### Critical Files
| File | Status | Issue |
|------|--------|-------|
| `PlanPaywallScreen.tsx` | ❌ Empty | No implementation |
| `DemoOnboardingScreen.tsx` | ⚠️ Orphaned | Not in navigation |
| `RecipeCarouselScreen.tsx` | ⚠️ Orphaned | Not in navigation |
| `WelcomeScreen.tsx` | ⚠️ Wrong routing | Goes to slides, not demo |
| `OnboardingScreen.tsx` | ⚠️ Premature auth | Blocks value |
| `AccountGateScreen.tsx` | ⚠️ Timing | Too early in flow |

---

## Target State

### New Flow
```
┌──────────────────────────────────────────────────────┐
│                   TARGET FLOW                         │
└──────────────────────────────────────────────────────┘

ColdOpen (1.5s)
    ↓
WelcomeScreen
    ↓ [I'm New]
DemoOnboardingScreen ← Camera scan (15s) ✅
    ↓ [Tap to scan]
Mock ingredient detection (instant)
    ↓
RecipeCarouselScreen ← 3 AI recipes (20s) ✅
    ↓ [Cook Now]
PlanSelectionSheet ← Choose plan ✅
    ↓ [Continue]
PlanPaywallScreen ← NEW: Full paywall UI ✅
    ↓ [Start Free Trial]
AccountGateScreen ← Auth after commitment ✅
    ↓ [Apple/Google/Email]
Purchase flow → Trial starts
    ↓
MainTabs (authenticated app)

                    OR
    
PlanPaywallScreen
    ↓ [Maybe later]
MainTabs (free tier: 5 scans/day)
```

### Time-to-Value Breakdown
| Stage | Time | Cumulative |
|-------|------|------------|
| Welcome screen | 5s | 5s |
| Camera demo | 15s | 20s |
| Recipe generation | 10s | 30s |
| Recipe browsing | 30s | 60s ✅ **First "wow"** |
| Plan selection | 15s | 75s |
| Paywall review | 20s | 95s |
| Auth + purchase | 30s | 125s |
| **Total to trial start** | **~2 min** | **✅ Within target** |

---

## Critical Blockers

### Priority 0: Must Fix Before Launch
1. **PlanPaywallScreen.tsx is empty**
   - **Impact**: No way to convert users to trial
   - **Effort**: 1-2 days
   - **Risk**: High - app cannot monetize

2. **Demo flow not in navigation**
   - **Impact**: Users see slides instead of value
   - **Effort**: 2 hours
   - **Risk**: Low - already built, just needs routing

3. **No analytics tracking**
   - **Impact**: Cannot measure conversion or optimize
   - **Effort**: 1 day
   - **Risk**: Low - non-breaking additions

4. **Missing compliance text**
   - **Impact**: App Store rejection risk
   - **Effort**: 2 hours
   - **Risk**: High - regulatory requirement

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) - Critical Path
**Goal**: Remove blockers, enable basic monetization

| Task | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **1.1** Implement PlanPaywallScreen UI | P0 | 1-2 days | Eng | 🔴 Not started |
| **1.2** Connect demo flow routing | P0 | 2 hours | Eng | 🔴 Not started |
| **1.3** Add funnel analytics events | P0 | 1 day | Eng | 🔴 Not started |
| **1.4** Add compliance text to paywall | P0 | 2 hours | Eng + Legal | 🔴 Not started |
| **1.5** Persist onboarding flag | P0 | 1 hour | Eng | 🔴 Not started |
| **1.6** Update App.tsx flow logic | P0 | 2 hours | Eng | 🔴 Not started |

**Deliverable**: Functional end-to-end onboarding with monetization

---

### Phase 2: Optimization (Week 2) - High Impact
**Goal**: Improve conversion through UX enhancements

| Task | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **2.1** Implement "Maybe later" free tier | P1 | 1 day | Eng | 🟡 Planned |
| **2.2** Add trial messaging to plan cards | P1 | 3 hours | Design + Eng | 🟡 Planned |
| **2.3** Camera permission primer | P1 | 4 hours | Design + Eng | 🟡 Planned |
| **2.4** Delay push prompt to post-value | P1 | 2 hours | Eng | 🟡 Planned |
| **2.5** Add "Restore purchases" link | P1 | 1 hour | Eng | 🟡 Planned |
| **2.6** Loading states for async ops | P1 | 1 day | Design + Eng | 🟡 Planned |

**Deliverable**: Polished onboarding with reduced friction

---

### Phase 3: Growth & Trust (Week 3) - Medium Impact
**Goal**: Build trust and increase perceived value

| Task | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **3.1** Add social proof elements | P2 | 1 day | Design + Eng | 🟡 Planned |
| **3.2** Annual pricing toggle | P2 | 1 day | Eng | 🟡 Planned |
| **3.3** Accessibility audit + fixes | P2 | 2 days | Eng + QA | 🟡 Planned |
| **3.4** A/B test framework setup | P2 | 1 day | Eng | 🟡 Planned |
| **3.5** Localization for pricing | P3 | 2 days | Eng | ⚪ Backlog |

**Deliverable**: Trustworthy, accessible onboarding at scale

---

### Phase 4: Launch & Iterate (Week 4)
**Goal**: Ship, monitor, optimize

| Task | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **4.1** Production smoke testing | P0 | 1 day | QA | 🟡 Planned |
| **4.2** Launch Experiment 1 (value-first) | P1 | 2 hours | Growth | 🟡 Planned |
| **4.3** Monitor conversion funnel | P0 | Ongoing | Growth + Eng | 🟡 Planned |
| **4.4** Bug fixes from user feedback | P0 | Variable | Eng | 🟡 Planned |
| **4.5** Iterate on messaging | P1 | Ongoing | Growth + Design | 🟡 Planned |

**Deliverable**: Live, optimized onboarding with data-driven improvements

---

## Detailed Implementation Guide

### Task 1.1: Implement PlanPaywallScreen
**File**: `/mobile/CookCam/src/screens/PlanPaywallScreen.tsx`  
**Effort**: 1-2 days  
**Dependencies**: None  

#### Step-by-step:

1. **Create the screen component** (4 hours)

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, X } from 'lucide-react-native';

interface PlanPaywallScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PlanPaywall'>;
  route: RouteProp<RootStackParamList, 'PlanPaywall'>;
}

const PlanPaywallScreen: React.FC<PlanPaywallScreenProps> = ({ navigation, route }) => {
  const { selectedPlan = 'consumer', source, tempData } = route.params || {};
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { purchaseSubscription } = useSubscription();
  const { user } = useAuth();

  useEffect(() => {
    analyticsService.track('paywall_viewed', {
      source: source || 'unknown',
      plan: selectedPlan,
      has_demo_data: !!tempData,
      billing_period: billingPeriod
    });
  }, []);

  const handleStartTrial = async () => {
    setIsLoading(true);
    analyticsService.track('trial_start_initiated', { 
      plan: selectedPlan, 
      billing_period: billingPeriod 
    });
    
    try {
      // Map to actual product IDs
      const productId = Platform.select({
        ios: billingPeriod === 'monthly' 
          ? (selectedPlan === 'creator' ? 'com.cookcam.creator.monthly' : 'com.cookcam.pro.monthly')
          : (selectedPlan === 'creator' ? 'com.cookcam.creator.yearly' : 'com.cookcam.pro.yearly'),
        android: billingPeriod === 'monthly'
          ? (selectedPlan === 'creator' ? 'cookcam_creator_monthly' : 'cookcam_pro_monthly')
          : (selectedPlan === 'creator' ? 'cookcam_creator_yearly' : 'cookcam_pro_yearly')
      }) || '';
      
      await purchaseSubscription(productId);
      
      analyticsService.track('trial_started', { 
        plan: selectedPlan, 
        billing_period: billingPeriod,
        trial_days: 7,
        product_id: productId
      });
      
      // Set onboarding complete
      await AsyncStorage.setItem('onboardingDone', 'true');
      
      // Navigate to main app
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      
    } catch (error: any) {
      analyticsService.track('trial_start_failed', { 
        error: error?.message || 'unknown',
        plan: selectedPlan 
      });
      Alert.alert(
        'Subscription Error', 
        'Could not start your trial. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaybeLater = async () => {
    analyticsService.track('paywall_dismissed', { method: 'maybe_later', plan: selectedPlan });
    analyticsService.track('free_tier_selected');
    
    // Set onboarding done flag
    await AsyncStorage.setItem('onboardingDone', 'true');
    
    // Navigate to main app with free tier
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleRestore = async () => {
    analyticsService.track('restore_purchases_initiated');
    // TODO: Implement restore purchases flow
    Alert.alert('Restore Purchases', 'This feature will be available soon.');
  };

  // Pricing logic
  const price = selectedPlan === 'creator' 
    ? (billingPeriod === 'monthly' ? '$9.99' : '$99.99')
    : (billingPeriod === 'monthly' ? '$3.99' : '$39.99');

  const savings = billingPeriod === 'yearly' 
    ? (selectedPlan === 'creator' ? '$19.89' : '$7.89')
    : null;

  // Features by plan
  const features = selectedPlan === 'creator' ? [
    'Everything in Get Cooking',
    'Creator dashboard & analytics',
    'Publish premium recipes',
    'Earn 30% revenue share',
    'Referral tracking & bonuses',
    'Priority support'
  ] : [
    'Unlimited ingredient scanning',
    'AI recipe generation',
    'Step-by-step cook mode',
    'Save favorite recipes',
    'Nutrition information',
    'Ad-free experience'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleMaybeLater}
          accessibilityLabel="Close paywall"
        >
          <X size={24} color="#2D1B69" />
        </TouchableOpacity>

        {/* Hero section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {selectedPlan === 'creator' ? '🎨 Unlock Creator Tools' : '👨‍🍳 Start Cooking Smarter'}
          </Text>
          <Text style={styles.heroSubtitle}>
            Try free for 7 days, cancel anytime
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              billingPeriod === 'monthly' && styles.toggleButtonActive
            ]}
            onPress={() => setBillingPeriod('monthly')}
            accessibilityLabel="Select monthly billing"
            accessibilityState={{ selected: billingPeriod === 'monthly' }}
          >
            <Text style={[
              styles.toggleText, 
              billingPeriod === 'monthly' && styles.toggleTextActive
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              billingPeriod === 'yearly' && styles.toggleButtonActive
            ]}
            onPress={() => setBillingPeriod('yearly')}
            accessibilityLabel="Select annual billing and save"
            accessibilityState={{ selected: billingPeriod === 'yearly' }}
          >
            <Text style={[
              styles.toggleText, 
              billingPeriod === 'yearly' && styles.toggleTextActive
            ]}>
              Annual
            </Text>
            {savings && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save {savings}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Price display */}
        <View style={styles.priceSection}>
          <Text style={styles.priceAmount}>{price}</Text>
          <Text style={styles.pricePeriod}>
            /{billingPeriod === 'monthly' ? 'month' : 'year'}
          </Text>
        </View>
        <Text style={styles.trialInfo}>
          after 7-day free trial
        </Text>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's included:</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={20} color="#66BB6A" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>
            ⭐ 4.8 rating • Trusted by 10,000+ cooks
          </Text>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleStartTrial}
          disabled={isLoading}
          accessibilityLabel={`Start free 7-day trial for ${price} per ${billingPeriod === 'monthly' ? 'month' : 'year'}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Start Free Trial</Text>
              <Text style={styles.primaryButtonSubtext}>
                Then {price}/{billingPeriod === 'monthly' ? 'month' : 'year'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary option */}
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleMaybeLater}
          accessibilityLabel="Maybe later, continue with 3 free scans per day"
        >
          <Text style={styles.secondaryButtonText}>
            Maybe later (3 free scans/day)
          </Text>
        </TouchableOpacity>

        {/* Compliance footer */}
        <Text style={styles.disclaimer}>
          Your subscription starts after the 7-day free trial and renews automatically. 
          Cancel anytime in Settings. By continuing, you agree to our Terms of Service 
          and Privacy Policy. Subscription is billed to your App Store or Google Play account.
        </Text>

        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreLink}>
            Already subscribed? Restore purchase
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#66BB6A',
    fontWeight: '600',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#2D1B69',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#66BB6A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#8E8E93',
    marginLeft: 4,
  },
  trialInfo: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#2D1B69',
    marginLeft: 12,
    flex: 1,
  },
  socialProof: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  socialProofText: {
    fontSize: 14,
    color: '#66BB6A',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  primaryButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  disclaimer: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  restoreLink: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default PlanPaywallScreen;
```

2. **Test the screen** (2 hours)
   - [ ] Renders correctly for both plans
   - [ ] Billing toggle works
   - [ ] Primary CTA triggers purchase flow
   - [ ] "Maybe later" navigates to MainTabs
   - [ ] Loading states display properly
   - [ ] Accessibility labels present

3. **Integration test** (2 hours)
   - [ ] Purchase flow completes in sandbox
   - [ ] Analytics events fire correctly
   - [ ] Navigation resets to MainTabs
   - [ ] Onboarding flag persists

---

### Task 1.2: Connect Demo Flow Routing
**Files**: 
- `/mobile/CookCam/src/screens/WelcomeScreen.tsx`
- `/mobile/CookCam/src/App.tsx`

**Effort**: 2 hours  

#### Changes needed:

**File: `WelcomeScreen.tsx`** (Line 54)
```tsx
// BEFORE:
const handleImNew = () => {
  navigation.navigate("Onboarding");
};

// AFTER:
const handleImNew = () => {
  analyticsService.track('onboarding_started', { 
    source: 'welcome_screen',
    timestamp: new Date().toISOString()
  });
  navigation.navigate('DemoOnboarding'); // ← Changed!
};
```

**File: `App.tsx`** - Add AsyncStorage check (Lines 310-335)
```tsx
// Import at top:
import AsyncStorage from '@react-native-async-storage/async-storage';

// Inside RootNavigator function:
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const navigationRef = useRef<any>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const done = await AsyncStorage.getItem('onboardingDone');
        setHasCompletedOnboarding(done === 'true');
      } catch (error) {
        logger.error('Error checking onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  // Deep link setup...
  useEffect(() => {
    // ... existing deep link code
  }, []);

  if (isLoading || checkingOnboarding) {
    return <LoadingScreen />;
  }

  // Show onboarding if: not logged in AND onboarding not complete
  const showOnboarding = !user && !hasCompletedOnboarding;

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <XPNotificationProvider>
        {showOnboarding ? <AuthNavigator /> : <AppNavigator />}
      </XPNotificationProvider>
    </NavigationContainer>
  );
}
```

**Testing checklist**:
- [ ] New users see DemoOnboarding (not OnboardingScreen)
- [ ] Returning users skip to MainTabs
- [ ] Flag persists after app restart
- [ ] Logout clears onboarding flag (optional behavior)

---

### Task 1.3: Add Funnel Analytics Events
**Files**: All onboarding screens  
**Effort**: 1 day  

#### Events to implement:

| Event Name | File | Trigger | Properties |
|------------|------|---------|------------|
| `onboarding_started` | `WelcomeScreen.tsx` | Mount | `source: string` |
| `demo_scan_initiated` | `DemoOnboardingScreen.tsx` | Scan button tap | `has_permission: boolean` |
| `demo_scan_completed` | `DemoOnboardingScreen.tsx` | After detection | `ingredients_count: int, scan_duration_ms: int` |
| `recipe_viewed` | `RecipeCarouselScreen.tsx` | Carousel swipe | `recipe_id: string, recipe_index: int` |
| `recipe_selected` | `RecipeCarouselScreen.tsx` | "Cook Now" tap | `recipe_id: string, from_position: int` |
| `plan_selection_viewed` | `PlanSelectionSheet.tsx` | Mount | `entry_point: string` |
| `plan_selected` | `PlanSelectionSheet.tsx` | Plan card tap | `plan: string, price: number` |
| `paywall_viewed` | `PlanPaywallScreen.tsx` | Mount | `source: string, plan: string` |
| `trial_start_initiated` | `PlanPaywallScreen.tsx` | CTA tap | `plan: string, billing_period: string` |
| `trial_started` | `PlanPaywallScreen.tsx` | Purchase success | `plan: string, trial_days: int, product_id: string` |
| `paywall_dismissed` | `PlanPaywallScreen.tsx` | "Maybe later" | `method: string` |
| `free_tier_selected` | `PlanPaywallScreen.tsx` | Free tier chosen | N/A |

#### Implementation pattern:

```tsx
// In each screen's component:
import analyticsService from '../services/analyticsService';

// Track screen view on mount:
useEffect(() => {
  analyticsService.track('screen_name_viewed', {
    property1: value1,
    property2: value2,
    timestamp: new Date().toISOString()
  });
}, []);

// Track user actions:
const handleAction = async () => {
  analyticsService.track('action_name', {
    property: value
  });
  
  // ... rest of action logic
};
```

#### Specific implementations:

**DemoOnboardingScreen.tsx** - Add scan timing:
```tsx
const [scanStartTime, setScanStartTime] = useState<number | null>(null);

const handleScan = async () => {
  const startTime = Date.now();
  setScanStartTime(startTime);
  
  analyticsService.track('demo_scan_initiated', { 
    has_permission: hasPermission 
  });

  try {
    setIsScanning(true);
    // ... existing scan logic ...
    
    analyticsService.track('demo_scan_completed', {
      ingredients_count: mockIngredients.length,
      scan_duration_ms: Date.now() - startTime,
      has_camera_access: hasPermission
    });
    
  } catch (error) {
    analyticsService.track('demo_scan_failed', {
      error: error.message,
      duration_ms: Date.now() - startTime
    });
  }
};
```

**RecipeCarouselScreen.tsx** - Track swipes:
```tsx
const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
  const offsetX = event.nativeEvent.contentOffset.x;
  const index = Math.round(offsetX / SCREEN_WIDTH);
  
  if (index !== currentIndex && recipes[index]) {
    setCurrentIndex(index);
    setSelectedRecipe(recipes[index]);
    
    analyticsService.track('recipe_viewed', {
      recipe_id: recipes[index].id,
      recipe_title: recipes[index].title,
      recipe_index: index,
      total_recipes: recipes.length
    });
  }
};
```

**Testing**:
- [ ] All events fire in development
- [ ] Events visible in backend analytics table
- [ ] Properties captured correctly
- [ ] No performance impact (<50ms overhead)

---

### Task 1.4: Add Compliance Text
**File**: `PlanPaywallScreen.tsx`  
**Effort**: 2 hours  
**Requires**: Legal review  

#### Required disclosures:

1. **Auto-renewal** ✅ Already in disclaimer
2. **Price after trial** ✅ Already in CTA subtext
3. **Cancellation policy** ✅ Already in disclaimer
4. **Platform billing** ✅ Already in disclaimer
5. **Terms & Privacy links** ⚠️ Need to add

#### Add links:

```tsx
// After disclaimer text, add:
<View style={styles.legalLinks}>
  <TouchableOpacity onPress={() => Linking.openURL('https://cookcam.ai/terms-of-service.html')}>
    <Text style={styles.legalLink}>Terms of Service</Text>
  </TouchableOpacity>
  <Text style={styles.legalSeparator}> • </Text>
  <TouchableOpacity onPress={() => Linking.openURL('https://cookcam.ai/privacy.html')}>
    <Text style={styles.legalLink}>Privacy Policy</Text>
  </TouchableOpacity>
</View>
```

```tsx
// Add to styles:
legalLinks: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 16,
  marginBottom: 8,
},
legalLink: {
  fontSize: 12,
  color: '#007AFF',
  textDecorationLine: 'underline',
},
legalSeparator: {
  fontSize: 12,
  color: '#8E8E93',
},
```

#### Import needed:
```tsx
import { Linking } from 'react-native';
```

**Checklist**:
- [ ] Legal review of all disclosure text
- [ ] Links open correctly
- [ ] Text readable on all screen sizes
- [ ] Compliant with App Store Review Guidelines 3.1.2
- [ ] Compliant with Google Play Billing policies

---

### Task 2.1: Implement "Maybe Later" Free Tier
**Files**: 
- `PlanPaywallScreen.tsx` (already has button)
- `FeatureGate.tsx` (already implements limits)
- Backend: Update user tier

**Effort**: 1 day  

#### What happens on "Maybe later":

1. User taps "Maybe later" button
2. Analytics event fires: `free_tier_selected`
3. User navigates to MainTabs
4. User is on free tier with limits:
   - 5 scans/day
   - 10 recipes/month
   - Ads (if implemented)

#### Implementation:

**Already implemented in `FeatureGate.tsx`**:
```tsx
// Lines 79-93 - Scan limit check
case "scan":
  if (!featureAccess.canScan) {
    return { hasAccess: false, reason: "Scanning not available" };
  }
  if (
    featureAccess.scanLimit !== null &&
    usageCount >= featureAccess.scanLimit
  ) {
    return {
      hasAccess: false,
      reason: `Daily limit reached (${featureAccess.scanLimit} scans)`,
    };
  }
  return { hasAccess: true };
```

#### What needs to be added:

**Track daily scan count** in user's session:

```tsx
// In SubscriptionContext.tsx - add:
const [dailyScanCount, setDailyScanCount] = useState(0);
const [lastScanDate, setLastScanDate] = useState<string | null>(null);

// Reset daily count at midnight
useEffect(() => {
  const checkResetScanCount = async () => {
    const today = new Date().toDateString();
    const lastDate = await AsyncStorage.getItem('lastScanDate');
    
    if (lastDate !== today) {
      setDailyScanCount(0);
      await AsyncStorage.setItem('lastScanDate', today);
      await AsyncStorage.setItem('dailyScanCount', '0');
    } else {
      const count = await AsyncStorage.getItem('dailyScanCount');
      setDailyScanCount(parseInt(count || '0', 10));
    }
  };
  
  checkResetScanCount();
}, []);

// Increment on scan
const incrementScanCount = async () => {
  const newCount = dailyScanCount + 1;
  setDailyScanCount(newCount);
  await AsyncStorage.setItem('dailyScanCount', newCount.toString());
};
```

**Show upgrade prompt at limit**:

```tsx
// In CameraScreen.tsx, wrap scan button:
<FeatureGate
  feature="scan"
  userId={user?.id || ''}
  onUpgrade={() => navigation.navigate('PlanSelection')}
>
  <TouchableOpacity onPress={handleTakePhoto}>
    {/* Scan button UI */}
  </TouchableOpacity>
</FeatureGate>
```

**Testing**:
- [ ] Free tier users can scan 5 times
- [ ] 6th scan shows upgrade modal
- [ ] Count resets at midnight
- [ ] Count persists across app restarts
- [ ] Analytics tracks `scan_limit_reached`

---

### Task 2.3: Camera Permission Primer
**File**: `DemoOnboardingScreen.tsx`  
**Effort**: 4 hours  

#### Current behavior:
- Requests camera permission immediately on mount (line 31-76)
- Shows generic system prompt

#### Target behavior:
1. Show custom primer screen explaining why camera is needed
2. User taps "Enable Camera" button
3. System permission prompt appears
4. On grant: proceed to camera view
5. On deny: offer mock demo fallback

#### Implementation:

```tsx
// Add new state:
const [showPrimer, setShowPrimer] = useState(true);

// Modify permission check:
const checkCameraPermission = async () => {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    if (status === "granted") {
      setHasPermission(true);
      setShowPrimer(false); // Skip primer if already granted
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Camera permission error:", error);
    return false;
  }
};

// New function for primer:
const requestCameraWithPrimer = async () => {
  analyticsService.track('camera_permission_requested');
  
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status === "granted") {
    analyticsService.track('camera_permission_granted');
    setHasPermission(true);
    setShowPrimer(false);
  } else {
    analyticsService.track('camera_permission_denied');
    Alert.alert(
      "Camera Access",
      "CookCam needs camera access to scan ingredients. You can enable it in Settings or try the mock demo.",
      [
        { text: "Mock Demo", onPress: handleMockScan },
        { text: "Skip", onPress: handleSkip },
      ]
    );
  }
};

// Render primer screen:
if (showPrimer && !hasPermission) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.primerContainer}>
        <View style={styles.primerIcon}>
          <Camera size={80} color="#FF6B35" />
        </View>
        
        <Text style={styles.primerTitle}>Let's Scan Your Ingredients</Text>
        
        <Text style={styles.primerDescription}>
          CookCam uses your camera to identify ingredients and suggest personalized recipes.
          {'\n\n'}
          Point your camera at your ingredients and watch the AI magic happen! ✨
        </Text>
        
        <View style={styles.primerFeatures}>
          <View style={styles.primerFeature}>
            <Check size={20} color="#66BB6A" />
            <Text style={styles.primerFeatureText}>Instant ingredient recognition</Text>
          </View>
          <View style={styles.primerFeature}>
            <Check size={20} color="#66BB6A" />
            <Text style={styles.primerFeatureText}>AI-powered recipe suggestions</Text>
          </View>
          <View style={styles.primerFeature}>
            <Check size={20} color="#66BB6A" />
            <Text style={styles.primerFeatureText}>No manual typing needed</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.primerButton}
          onPress={requestCameraWithPrimer}
        >
          <Text style={styles.primerButtonText}>Enable Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primerSecondaryButton}
          onPress={handleMockScan}
        >
          <Text style={styles.primerSecondaryText}>Try Mock Demo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

**Styles to add**:
```tsx
primerContainer: {
  flex: 1,
  padding: 32,
  justifyContent: 'center',
  alignItems: 'center',
},
primerIcon: {
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: '#FFF3F0',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 24,
},
primerTitle: {
  fontSize: 28,
  fontWeight: 'bold',
  color: '#2D1B69',
  textAlign: 'center',
  marginBottom: 16,
},
primerDescription: {
  fontSize: 16,
  color: '#8E8E93',
  textAlign: 'center',
  lineHeight: 24,
  marginBottom: 32,
},
primerFeatures: {
  alignSelf: 'stretch',
  marginBottom: 32,
},
primerFeature: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},
primerFeatureText: {
  fontSize: 16,
  color: '#2D1B69',
  marginLeft: 12,
},
primerButton: {
  backgroundColor: '#FF6B35',
  paddingHorizontal: 48,
  paddingVertical: 16,
  borderRadius: 12,
  marginBottom: 12,
  width: '100%',
  alignItems: 'center',
},
primerButtonText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#FFFFFF',
},
primerSecondaryButton: {
  paddingVertical: 12,
  width: '100%',
  alignItems: 'center',
  marginBottom: 16,
},
primerSecondaryText: {
  fontSize: 16,
  color: '#66BB6A',
  fontWeight: '600',
},
```

**Testing**:
- [ ] Primer shows for new users
- [ ] Permission request fires on button tap
- [ ] Grant flows to camera view
- [ ] Deny offers fallback options
- [ ] Analytics tracks permission decisions

---

## Analytics & Instrumentation

### Complete Event Schema

```typescript
// Core funnel events (P0 - must implement)
export const OnboardingEvents = {
  // Entry
  ONBOARDING_STARTED: 'onboarding_started',
  
  // Demo flow
  DEMO_SCAN_INITIATED: 'demo_scan_initiated',
  DEMO_SCAN_COMPLETED: 'demo_scan_completed',
  DEMO_SCAN_FAILED: 'demo_scan_failed',
  
  // Recipe discovery
  RECIPE_VIEWED: 'recipe_viewed',
  RECIPE_SELECTED: 'recipe_selected',
  
  // Plan selection
  PLAN_SELECTION_VIEWED: 'plan_selection_viewed',
  PLAN_SELECTED: 'plan_selected',
  
  // Paywall
  PAYWALL_VIEWED: 'paywall_viewed',
  TRIAL_START_INITIATED: 'trial_start_initiated',
  TRIAL_STARTED: 'trial_started',
  TRIAL_START_FAILED: 'trial_start_failed',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  FREE_TIER_SELECTED: 'free_tier_selected',
  
  // Authentication
  AUTH_GATE_VIEWED: 'auth_gate_viewed',
  AUTH_STARTED: 'auth_started',
  AUTH_COMPLETED: 'auth_completed',
  AUTH_FAILED: 'auth_failed',
  
  // Completion
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
} as const;

// Permissions (P1)
export const PermissionEvents = {
  CAMERA_PERMISSION_REQUESTED: 'camera_permission_requested',
  CAMERA_PERMISSION_GRANTED: 'camera_permission_granted',
  CAMERA_PERMISSION_DENIED: 'camera_permission_denied',
  PUSH_PERMISSION_REQUESTED: 'push_permission_requested',
  PUSH_PERMISSION_GRANTED: 'push_permission_granted',
  PUSH_PERMISSION_DENIED: 'push_permission_denied',
} as const;

// Feature usage (P2)
export const FeatureEvents = {
  SCAN_LIMIT_REACHED: 'scan_limit_reached',
  RECIPE_LIMIT_REACHED: 'recipe_limit_reached',
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  UPGRADE_PROMPT_CLICKED: 'upgrade_prompt_clicked',
} as const;
```

### Event Properties Standard

All events should include:
```typescript
{
  // Standard properties (added automatically by analyticsService)
  timestamp: string; // ISO 8601
  platform: 'ios' | 'android';
  app_version: string;
  user_id?: string; // If authenticated
  session_id: string;
  
  // Event-specific properties
  // ... custom properties per event
}
```

### Conversion Funnel Tracking

Create a simple funnel tracking utility:

```typescript
// File: /mobile/CookCam/src/utils/funnelTracking.ts

import analyticsService from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FunnelTracker {
  private funnelId: string | null = null;
  private startTime: number | null = null;
  
  async startFunnel(source: string) {
    this.funnelId = `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    
    await AsyncStorage.setItem('activeFunnelId', this.funnelId);
    await AsyncStorage.setItem('funnelStartTime', this.startTime.toString());
    
    analyticsService.track('funnel_started', {
      funnel_id: this.funnelId,
      source,
    });
    
    return this.funnelId;
  }
  
  async trackStep(stepName: string, properties: Record<string, any> = {}) {
    const funnelId = this.funnelId || await AsyncStorage.getItem('activeFunnelId');
    const startTime = this.startTime || parseInt(await AsyncStorage.getItem('funnelStartTime') || '0', 10);
    
    if (!funnelId) return;
    
    analyticsService.track('funnel_step', {
      funnel_id: funnelId,
      step_name: stepName,
      time_since_start_ms: Date.now() - startTime,
      ...properties,
    });
  }
  
  async completeFunnel(outcome: 'trial_started' | 'free_tier' | 'abandoned') {
    const funnelId = this.funnelId || await AsyncStorage.getItem('activeFunnelId');
    const startTime = this.startTime || parseInt(await AsyncStorage.getItem('funnelStartTime') || '0', 10);
    
    if (!funnelId) return;
    
    analyticsService.track('funnel_completed', {
      funnel_id: funnelId,
      outcome,
      total_duration_ms: Date.now() - startTime,
    });
    
    // Clean up
    await AsyncStorage.removeItem('activeFunnelId');
    await AsyncStorage.removeItem('funnelStartTime');
    this.funnelId = null;
    this.startTime = null;
  }
}

export const funnelTracker = new FunnelTracker();
```

**Usage**:
```typescript
// In WelcomeScreen.tsx:
useEffect(() => {
  funnelTracker.startFunnel('cold_open');
}, []);

// In each subsequent screen:
useEffect(() => {
  funnelTracker.trackStep('demo_scan');
}, []);

// At conversion:
await funnelTracker.completeFunnel('trial_started');
```

---

## Testing & Validation

### Pre-Launch Testing Checklist

#### Functional Tests

**Onboarding Flow**
- [ ] New user sees Welcome → Demo → Recipes → PlanSelection → Paywall → Auth
- [ ] Each screen renders correctly on iOS and Android
- [ ] Navigation works forward and backward
- [ ] Onboarding flag persists correctly
- [ ] Returning users skip straight to MainTabs

**Demo Experience**
- [ ] Camera permission primer displays
- [ ] Permission grant proceeds to camera
- [ ] Permission deny offers mock demo
- [ ] Mock demo shows 4-5 ingredients
- [ ] Scan completes <500ms (mock data)

**Recipe Carousel**
- [ ] 3 recipes display from scan
- [ ] Swipe navigation works smoothly
- [ ] "Cook Now" navigates to PlanSelection
- [ ] Toast message shows correctly

**Plan Selection**
- [ ] Both plans (Consumer + Creator) display
- [ ] Feature bullets readable
- [ ] Plan selection state persists
- [ ] "Continue" navigates to paywall

**Paywall**
- [ ] Correct plan shown based on selection
- [ ] Monthly/yearly toggle works
- [ ] Price updates correctly
- [ ] Savings badge shows for yearly
- [ ] Trial messaging clear ("7 days free")
- [ ] Compliance text present and readable
- [ ] "Start Free Trial" triggers purchase
- [ ] "Maybe later" navigates to MainTabs
- [ ] "Restore purchase" link present
- [ ] Loading state displays during purchase

**Payment Integration**
- [ ] iOS sandbox purchase completes
- [ ] Android sandbox purchase completes
- [ ] Receipt validation succeeds
- [ ] Trial period set correctly (7 days)
- [ ] Subscription status updates in backend
- [ ] Purchase errors handled gracefully

**Free Tier**
- [ ] "Maybe later" grants free tier access
- [ ] Scan limit enforced (5/day)
- [ ] Limit resets at midnight
- [ ] Upgrade prompt shows at limit
- [ ] Limit count persists across restarts

#### Analytics Tests

**Event Tracking**
- [ ] All 15+ funnel events fire correctly
- [ ] Properties captured accurately
- [ ] Events visible in analytics dashboard
- [ ] Session ID persists across screens
- [ ] User ID attached after auth
- [ ] Timestamps in correct timezone

**Funnel Analysis**
- [ ] Can reconstruct user journey from events
- [ ] Drop-off points identifiable
- [ ] Conversion rate calculable
- [ ] Time-to-trial measurable

#### UX Tests

**Accessibility**
- [ ] VoiceOver navigates full flow (iOS)
- [ ] TalkBack navigates full flow (Android)
- [ ] All CTAs have accessibility labels
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets ≥44x44 pts
- [ ] Dynamic type supported

**Performance**
- [ ] App startup <2s
- [ ] Screen transitions <200ms
- [ ] Camera preview initializes <300ms
- [ ] Recipe generation <5s
- [ ] No memory leaks (Instruments/Profiler)
- [ ] Battery drain <5% per 10min session

**Edge Cases**
- [ ] Airplane mode during demo → graceful error
- [ ] App backgrounded during purchase → resume/retry
- [ ] Already subscribed → restore prompt
- [ ] Invalid payment method → helpful error
- [ ] Session expired during flow → re-auth

#### Compliance Tests

**App Store (iOS)**
- [ ] Auto-renewal disclosure visible
- [ ] Trial terms clear before purchase
- [ ] Price displayed with currency
- [ ] "Cancel anytime" text present
- [ ] Terms/Privacy links work
- [ ] Account deletion accessible

**Google Play (Android)**
- [ ] Billing terms visible
- [ ] Trial period disclosed
- [ ] Subscription management link
- [ ] Data safety matches form
- [ ] Permissions justified

---

## Experiment Framework

### Experiment 1: Value-First Onboarding

**Hypothesis**: Moving the demo scan before authentication will increase trial opt-in by 2× (from <20% to 40%+).

**Setup**:
```typescript
// Install feature flag library or use simple config:
const EXPERIMENT_CONFIG = {
  value_first_onboarding: {
    enabled: true,
    variants: ['control', 'demo_first'],
    allocation: [50, 50], // 50/50 split
  }
};

// In WelcomeScreen.tsx:
const variant = useExperiment('value_first_onboarding');

const handleImNew = () => {
  if (variant === 'demo_first') {
    navigation.navigate('DemoOnboarding'); // NEW FLOW
  } else {
    navigation.navigate('Onboarding'); // OLD FLOW (slides)
  }
  
  analyticsService.track('experiment_started', {
    experiment: 'value_first_onboarding',
    variant,
  });
};
```

**Metrics**:
- **Primary**: Trial start rate = `trial_started` / `onboarding_started`
- **Secondary**: 
  - Time to trial (median duration)
  - Onboarding completion rate
  - Day 7 retention

**Guardrails**:
- Refund rate <5%
- Crash rate <0.5%
- Onboarding abandon rate <70%

**Sample Size**: 2,000 users (1,000 per variant)  
**Duration**: 2 weeks  
**Significance**: 95% confidence, 10% MDE

**Decision Criteria**:
- **Ship variant B** if: Trial rate ↑ >15% AND guardrails pass
- **Iterate** if: Trial rate ↑ 5-15%
- **Rollback** if: Trial rate ↓ OR guardrails fail

---

### Experiment 2: Trial Duration (3 vs 7 days)

**Hypothesis**: A 7-day trial increases paid conversion by 15% because users have more time to form habits.

**Setup**:
```typescript
const variant = useExperiment('trial_duration');

const trialDays = variant === 'seven_day' ? 7 : 3;

// Use in purchase flow and UI:
<Text>Try free for {trialDays} days</Text>
```

**Metrics**:
- **Primary**: Trial-to-paid conversion = `subscription_renewed` / `trial_started`
- **Secondary**:
  - Average sessions during trial
  - Recipes completed during trial
  - Cancellation reason (survey)

**Guardrails**:
- Trial start rate doesn't drop >5%
- Day 30 revenue per user maintained

**Duration**: 6 weeks (to capture trial + 2 weeks post)

---

### Experiment 3: "Maybe Later" Free Tier Option

**Hypothesis**: Offering a free tier reduces abandonment and increases 30-day paid conversion by 20%.

**Setup**:
```typescript
// Control: Hard paywall (must subscribe)
// Variant: "Maybe later" button → free tier

const variant = useExperiment('free_tier_option');

{variant === 'free_tier' && (
  <TouchableOpacity onPress={handleMaybeLater}>
    <Text>Maybe later (3 free scans/day)</Text>
  </TouchableOpacity>
)}
```

**Metrics**:
- **Primary**: 30-day paid conversion = `paid_subscribers_day_30` / `onboarding_completed`
- **Secondary**:
  - Immediate trial start rate (will decrease, expected)
  - Free tier engagement rate
  - Free → paid upgrade rate

**Guardrails**:
- Free tier users engage ≥3 times (validate quality)
- Revenue per onboarded user ≥control after 60 days

---

## Success Metrics

### North Star Metric
**Trial opt-in rate**: % of users who start a trial within 5 minutes of app open

**Baseline**: <20% (estimated)  
**Target**: 40-60%  
**Measurement**: `trial_started` / `app_opened` (new users only)

---

### Key Performance Indicators

#### Conversion Funnel
| Stage | Metric | Baseline | Target | Measurement |
|-------|--------|----------|--------|-------------|
| **Entry** | App opens (new users) | 100% | 100% | `app_opened` |
| **Demo** | Complete demo scan | - | 80% | `demo_scan_completed` / `app_opened` |
| **Recipe** | Select recipe | - | 70% | `recipe_selected` / `demo_scan_completed` |
| **Plan** | Choose plan | - | 90% | `plan_selected` / `recipe_selected` |
| **Paywall** | View paywall | - | 95% | `paywall_viewed` / `plan_selected` |
| **Trial** | Start trial | <20% | 40-60% | `trial_started` / `paywall_viewed` |
| **Paid** | Convert to paid | 40% | 50% | `subscription_renewed` / `trial_started` |

#### Time-to-Value
- **Demo to recipe**: <30s (target: 95th percentile)
- **App open to trial start**: <3 min (target: median)
- **Onboarding total time**: <5 min (target: 90th percentile)

#### Quality Metrics
- **Refund rate**: <5% of trials
- **1-star reviews mentioning "trial"**: <1%
- **Support tickets re: billing**: <2% of trials
- **Crash rate during onboarding**: <0.1%

#### Business Impact
- **Trial starts per day**: Baseline × 2-3
- **Day 30 paid subscribers**: Baseline × 1.5-2
- **Customer acquisition cost (CAC)**: -15-20%
- **Lifetime value (LTV)**: +10-15% (from faster conversion)

---

### Dashboard Requirements

Create analytics dashboard with:
1. **Funnel visualization**: Sankey diagram of user flow
2. **Conversion metrics**: KPIs above with daily trend
3. **Experiment tracking**: Active experiments + results
4. **Cohort analysis**: Trial starts by week, conversion by cohort
5. **Alerts**: Drop in trial rate >10%, crash rate >0.5%, etc.

**Tools**: 
- Analytics backend (already exists: `backend/api/src/routes/analytics.ts`)
- Dashboard: Superset, Metabase, or custom React dashboard

---

## Rollback Plan

### Triggers for Rollback

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Trial start rate drops | >30% vs baseline | Immediate rollback |
| Crash rate during onboarding | >1% | Immediate rollback |
| Refund rate | >10% | Investigate, rollback if rising |
| App Store/Play rejection | Any compliance issue | Emergency hotfix |
| Support tickets spike | >5× baseline | Investigate, rollback if confirmed issue |

### Rollback Procedures

#### Level 1: Feature Flag Disable (5 minutes)
```typescript
// In remote config (Firebase/custom):
{
  "new_onboarding_enabled": false
}

// App checks flag on launch:
const useNewOnboarding = remoteConfig.getBoolean('new_onboarding_enabled');
```

**Use when**: Minor issues, need time to debug

---

#### Level 2: Navigation Rollback (1 hour)
Revert WelcomeScreen routing:
```typescript
// Change back to:
const handleImNew = () => {
  navigation.navigate('Onboarding'); // Old slides flow
};
```

**Use when**: Demo flow has critical bugs

---

#### Level 3: Full Rollback via App Update (4-24 hours)
1. Revert commits in git
2. Build emergency release
3. Submit to App Store/Play (expedited review)
4. Monitor submission status
5. Communicate with affected users

**Use when**: Unfixable issue, compliance violation

---

### Post-Rollback Actions

1. **Communicate**: Notify team, stakeholders, users (if needed)
2. **Analyze**: Root cause analysis of failure
3. **Fix**: Address issues in development
4. **Re-test**: Comprehensive QA before re-launch
5. **Gradual rollout**: 10% → 25% → 50% → 100% when re-launching

---

## Communication Plan

### Internal Updates

**Daily Standups** (during implementation):
- Progress on tasks
- Blockers
- ETA updates

**Weekly Summary**:
- Completed tasks
- Metrics preview (if in beta)
- Next week priorities

**Launch Day**:
- Go/no-go checklist review
- Monitoring assignments
- On-call rotation

### Stakeholder Communication

**Pre-Launch**:
- Overview deck (this document)
- Timeline & resource needs
- Expected impact & risks

**Launch**:
- Launch announcement
- Monitoring dashboard access
- Early results (48 hours post-launch)

**Post-Launch**:
- Weekly metrics report
- Experiment results
- Iteration plan

---

## Appendix

### Glossary

- **Funnel**: Sequential steps users take from entry to conversion
- **Trial opt-in rate**: % users who start a free trial
- **Conversion**: Trial user becoming a paying subscriber
- **Paywall**: Screen that prompts user to subscribe
- **Feature gate**: Logic that restricts features based on subscription status
- **Free tier**: Limited access without subscription
- **Grace period**: Time after subscription ends where features remain accessible

### Resources

**Documentation**:
- [Onboarding v2 Checklist](./planning/onboarding-v2-implementation-checklist.md)
- [Subscription Setup Guide](./setup/subscription-setup-guide.md)
- [Subscription Architecture](../backend/SUBSCRIPTION_ARCHITECTURE.md)

**Code References**:
- Demo onboarding: `/mobile/CookCam/src/screens/DemoOnboardingScreen.tsx`
- Recipe carousel: `/mobile/CookCam/src/screens/RecipeCarouselScreen.tsx`
- Paywall: `/mobile/CookCam/src/screens/PlanPaywallScreen.tsx` (to be implemented)
- Feature gate: `/mobile/CookCam/src/components/FeatureGate.tsx`

**External**:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Billing Policies](https://support.google.com/googleplay/android-developer/answer/140504)
- [React Native IAP Docs](https://github.com/dooboolab/react-native-iap)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-06 | 1.0 | Initial implementation plan | Growth Team |

---

**Questions or Issues?**  
Contact: [Your Team Lead] | Slack: #cookcam-growth

---

**End of Implementation Plan**


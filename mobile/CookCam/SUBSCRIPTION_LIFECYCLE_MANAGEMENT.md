# CookCam Subscription Lifecycle Management

## Overview

This document outlines the comprehensive subscription lifecycle management system for CookCam, which handles subscription cancellations, expirations, payment failures, and re-engagement strategies to maximize user retention and minimize churn.

## Architecture Components

### 1. SubscriptionLifecycleService

**Location:** `src/services/SubscriptionLifecycleService.ts`

Core service that manages all subscription states and transitions:

- **Subscription States:** `active`, `trialing`, `canceled`, `expired`, `past_due`, `paused`, `unpaid`
- **User Tiers:** `free`, `consumer`, `creator`
- **Grace Periods:** 7-day grace period after cancellation/expiration
- **Feature Access Control:** Dynamic feature gating based on subscription state
- **Win-back Offers:** Time-based discount offers for churned users

### 2. SubscriptionBanner

**Location:** `src/components/SubscriptionBanner.tsx`

Smart banner component that displays subscription status alerts and re-engagement prompts:

- **Payment Failed:** Urgent red banner with payment update CTA
- **Grace Period:** Warning banner with days remaining
- **Win-back:** Friendly green banner with special offers
- **Dismissible:** Users can dismiss non-critical banners
- **Animated:** Smooth fade-in/out transitions

### 3. FeatureGate

**Location:** `src/components/FeatureGate.tsx`

HOC (Higher Order Component) that controls access to premium features:

- **Usage Tracking:** Monitors daily/monthly limits for free tier users
- **Progressive Disclosure:** Shows relevant upgrade prompts per feature
- **Fallback Components:** Custom components for locked features
- **Modal Presentations:** Rich upgrade prompts with benefit explanations

## Subscription States & Behaviors

### Active/Trialing
```
✅ Full feature access
✅ No ads
✅ All limits removed
✅ Revenue earning (creators)
```

### Grace Period (7 days after cancellation/expiration)
```
⚠️ Limited but generous access
⚠️ Shows ads
⚠️ Reduced limits (10 scans, 5 recipes/day)
⚠️ Creators can still earn revenue
⚠️ Gentle re-engagement prompts
```

### Payment Failed
```
🚫 Very limited access (3 scans, 1 recipe/day)
🚫 No Cook Mode
🚫 No favorites
🚫 Shows ads
🚫 Urgent payment update prompts
```

### Fully Expired/Canceled
```
🔒 Free tier access only
🔒 3 scans, 2 recipes per day
🔒 No premium features
🔒 Shows ads
🔒 Win-back offers and prompts
```

## Win-back Offer Strategy

### Recent Cancellation (≤7 days)
- **Offer:** 20% off first month back
- **Duration:** 7 days to accept
- **Strategy:** Gentle re-engagement

### Medium-term Churn (8-30 days)
- **Offer:** 50% off + 7 days free trial
- **Duration:** 14 days to accept
- **Strategy:** Significant incentive

### Long-term Churn (31-90 days)
- **Offer:** 70% off + 2 weeks free
- **Duration:** 30 days to accept
- **Strategy:** Major win-back attempt

### Very Long-term (90+ days)
- **Offer:** 30 days free - welcome back!
- **Duration:** 60 days to accept
- **Strategy:** Fresh start approach

## Integration Guide

### Step 1: Initialize Service

```typescript
import SubscriptionLifecycleService from '../services/SubscriptionLifecycleService';

// Get service instance
const lifecycleService = SubscriptionLifecycleService.getInstance();

// Check subscription state
const subscriptionState = await lifecycleService.getSubscriptionState(userId);
const featureAccess = lifecycleService.getFeatureAccess(subscriptionState);
```

### Step 2: Add Subscription Banner

```tsx
import SubscriptionBanner from '../components/SubscriptionBanner';

function MainScreen() {
  return (
    <View>
      <SubscriptionBanner 
        userId={currentUser.id}
        onReactivate={() => navigation.navigate('Subscription')}
        onUpdatePayment={() => navigation.navigate('PaymentUpdate')}
        onViewOffers={() => navigation.navigate('Offers')}
      />
      {/* Your main content */}
    </View>
  );
}
```

### Step 3: Gate Premium Features

```tsx
import FeatureGate from '../components/FeatureGate';

function ScanScreen() {
  return (
    <FeatureGate 
      feature="scan" 
      userId={currentUser.id}
      onUpgrade={() => navigation.navigate('Subscription')}
    >
      <CameraComponent />
    </FeatureGate>
  );
}

function CookModeButton() {
  return (
    <FeatureGate 
      feature="cook_mode" 
      userId={currentUser.id}
      fallbackComponent={
        <Text style={styles.lockedText}>🔒 Cook Mode - Upgrade to unlock</Text>
      }
    >
      <TouchableOpacity onPress={startCookMode}>
        <Text>Start Cook Mode</Text>
      </TouchableOpacity>
    </FeatureGate>
  );
}
```

### Step 4: Handle Webhook Events

```typescript
// Handle Stripe webhook events
async function handleWebhookEvent(event: any) {
  const lifecycleService = SubscriptionLifecycleService.getInstance();
  
  switch (event.type) {
    case 'customer.subscription.deleted':
      await lifecycleService.handleSubscriptionCanceled(
        event.data.object.metadata.user_id,
        'user_canceled'
      );
      break;
      
    case 'invoice.payment_failed':
      await lifecycleService.handlePaymentFailed(
        event.data.object.metadata.user_id,
        'card_declined'
      );
      break;
      
    case 'customer.subscription.trial_will_end':
      // Send reminder notification
      break;
  }
}
```

## User Experience Flows

### Cancellation Flow
1. User cancels subscription in app or app store
2. Webhook triggers `handleSubscriptionCanceled()`
3. Grace period begins (7 days)
4. User sees gentle "grace period" banner
5. Feature access reduced but still usable
6. After grace period: full free tier restrictions

### Payment Failure Flow
1. Payment fails (card expired, insufficient funds, etc.)
2. Webhook triggers `handlePaymentFailed()`
3. Immediate alert shown to user
4. Feature access severely limited
5. Persistent "update payment" banner
6. If not resolved: transition to canceled state

### Win-back Flow
1. User tries to use locked feature
2. `FeatureGate` shows upgrade prompt
3. Special offers displayed based on churn duration
4. User can accept offer or dismiss
5. Successful reactivation restores full access

## Best Practices

### 1. Graceful Degradation
- Never immediately lock users out
- Provide generous grace periods
- Show clear explanations for limitations

### 2. Contextual Messaging
- Match prompts to the specific feature being accessed
- Use appropriate urgency levels (payment failed vs. win-back)
- Provide clear value propositions

### 3. Data Preservation
- Keep user data during grace periods
- Preserve favorites, preferences, and history
- Don't delete data until extended periods of inactivity

### 4. Analytics Tracking
- Track cancellation reasons
- Monitor re-engagement success rates
- A/B test different offer strategies
- Measure feature usage patterns

### 5. Performance Optimization
- Cache subscription states locally
- Minimize API calls for state checks
- Use efficient local storage for flags

## Customization Options

### Adjust Grace Period
```typescript
// In SubscriptionLifecycleService constructor
private gracePeriodDays = 14; // Extend to 14 days
```

### Modify Free Tier Limits
```typescript
private freeTierLimits = {
  scansPerDay: 5,    // Increase from 3
  recipesPerDay: 3,  // Increase from 2
};
```

### Custom Win-back Offers
```typescript
// Override getWinBackOffer method for custom logic
async getWinBackOffer(userId: string, subscriptionState: SubscriptionState) {
  // Your custom offer logic
  return {
    hasOffer: true,
    discountPercent: 30,
    offerText: 'Special comeback offer!',
    expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
  };
}
```

## Testing Scenarios

### 1. Mock Different States
```typescript
// In SubscriptionLifecycleService.mockGetSubscriptionStatus()
const testStates = [
  { status: 'canceled', canceled_at: Date.now() - (3 * 24 * 60 * 60 * 1000) },
  { status: 'past_due', current_period_end: Date.now() - (1 * 24 * 60 * 60 * 1000) },
  { status: 'expired', current_period_end: Date.now() - (10 * 24 * 60 * 60 * 1000) },
];
```

### 2. Test Feature Gates
```typescript
// Test different features with mock user IDs
<FeatureGate feature="scan" userId="test_free_user">
<FeatureGate feature="cook_mode" userId="test_grace_period_user">
<FeatureGate feature="create_recipes" userId="test_creator_user">
```

### 3. Test Banner Variations
```typescript
// Mock different subscription states to see banner variations
const mockStates = ['canceled', 'past_due', 'expired'];
// Banner will automatically show appropriate prompt for each state
```

## Monitoring & Alerts

### Key Metrics to Track
- **Churn Rate:** Percentage of users canceling per month
- **Reactivation Rate:** Percentage accepting win-back offers
- **Grace Period Conversion:** Users reactivating during grace period
- **Feature Engagement:** Which locked features drive most upgrades
- **Payment Recovery:** Success rate of payment failure recovery

### Alert Thresholds
- **High Churn:** >5% monthly cancellation rate
- **Low Reactivation:** <10% win-back offer acceptance
- **Payment Issues:** >2% payment failure rate
- **Feature Access:** >50% feature gate interactions without conversion

This comprehensive system ensures maximum user retention while providing a smooth, respectful experience for users transitioning between subscription states. 
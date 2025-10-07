# CookCam Subscription Setup Guide

## Overview
CookCam uses a $3.99/month subscription model with a 3-day free trial that auto-converts to paid subscription.

## Backend Setup

### 1. Database Schema
Create the subscriptions table in Supabase:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id TEXT NOT NULL,
  purchase_token TEXT,
  transaction_id TEXT,
  original_transaction_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'grace_period')),
  expires_at TIMESTAMP NOT NULL,
  auto_renewing BOOLEAN DEFAULT true,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. Environment Variables
Add to `backend/api/.env`:

```env
# App Store (iOS)
APP_STORE_SHARED_SECRET=your_shared_secret_from_app_store_connect
APP_STORE_SANDBOX_VERIFY_URL=https://sandbox.itunes.apple.com/verifyReceipt
APP_STORE_PRODUCTION_VERIFY_URL=https://buy.itunes.apple.com/verifyReceipt

# Google Play (Android)
GOOGLE_PLAY_PACKAGE_NAME=com.cookcam
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Webhook URLs (for App Store/Google Play to notify you)
WEBHOOK_URL=https://api.cookcam.app/api/v1/subscription/webhook
```

### 3. Install Dependencies
```bash
cd backend/api
npm install axios jsonwebtoken
```

## iOS Setup

### 1. App Store Connect Configuration

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "My Apps" → Select your app
3. Navigate to "Features" → "In-App Purchases"
4. Click "+" to create a new subscription

**Subscription Details:**
- Reference Name: `CookCam Monthly`
- Product ID: `com.cookcam.monthly`
- Subscription Duration: 1 Month
- Price: $3.99 USD (Tier 4)

**Free Trial:**
- Introductory Offer Type: Free Trial
- Duration: 3 Days
- Customer Eligibility: New Subscribers

### 2. Configure App Store Server Notifications

1. In App Store Connect, go to "App Information"
2. Find "App Store Server Notifications"
3. Enter URL: `https://api.cookcam.app/api/v1/subscription/webhook/apple`
4. Select Version 2 notifications

### 3. Generate Shared Secret

1. Go to "Features" → "In-App Purchases"
2. Click "App-Specific Shared Secret"
3. Generate and save the secret
4. Add to your backend `.env` file

### 4. iOS App Configuration

1. Enable In-App Purchase capability in Xcode:
   - Select your project
   - Go to "Signing & Capabilities"
   - Add "In-App Purchase" capability

2. Update `Info.plist`:
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```

## Android Setup

### 1. Google Play Console Configuration

1. Log in to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to "Monetize" → "Subscriptions"
4. Create a new subscription

**Subscription Details:**
- Product ID: `com.cookcam.monthly`
- Name: CookCam Pro Monthly
- Description: Unlimited recipes and premium features
- Default Price: $3.99 USD
- Billing Period: Monthly
- Grace Period: 7 days

**Free Trial:**
- Free Trial Period: 3 days
- Eligible for introductory price: Yes

### 2. Configure Real-time Developer Notifications

1. In Google Play Console, go to "Monetization setup"
2. Find "Real-time developer notifications"
3. Add topic name: `cookcam-subscriptions`
4. Cloud Pub/Sub topic: `projects/YOUR_PROJECT_ID/topics/cookcam-subscriptions`

### 3. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to "IAM & Admin" → "Service Accounts"
4. Create a new service account:
   - Name: `cookcam-play-billing`
   - Role: `Pub/Sub Editor` and `Android Publisher`
5. Create and download JSON key
6. Add the JSON to your backend `.env` file

### 4. Android App Configuration

1. Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.android.billingclient:billing:5.0.0'
}
```

2. Add permission to `AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

## React Native Implementation

### 1. Install Dependencies
```bash
cd mobile/CookCam
npm install react-native-iap
cd ios && pod install
```

### 2. Update App Initialization
In your main App component:

```typescript
import { subscriptionService } from './src/services/subscription';

// Initialize IAP when app starts
useEffect(() => {
  subscriptionService.initialize()
    .catch(error => console.error('IAP init error:', error));
  
  return () => {
    // Cleanup when app closes
    subscriptionService.cleanup();
  };
}, []);
```

### 3. Add Subscription UI
Add navigation to the subscription screen:

```typescript
// In your navigation stack
<Stack.Screen 
  name="Subscription" 
  component={SubscriptionScreen}
  options={{ title: 'CookCam Pro' }}
/>
```

Add a button in settings or profile:
```typescript
<TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
  <Text>Manage Subscription</Text>
</TouchableOpacity>
```

## Testing

### iOS Testing
1. Use sandbox test accounts (create in App Store Connect)
2. Sign out of regular App Store account on device
3. Sign in with sandbox account when prompted during purchase
4. Sandbox subscriptions renew every 5 minutes (instead of monthly)

### Android Testing
1. Add test accounts in Google Play Console
2. Upload app to internal testing track
3. Test accounts won't be charged
4. Test subscriptions renew daily (instead of monthly)

## Production Checklist

- [ ] Verify product IDs match in all places
- [ ] Test purchase flow on both platforms
- [ ] Test receipt verification
- [ ] Test subscription restoration
- [ ] Verify webhooks are working
- [ ] Test subscription expiration handling
- [ ] Test free trial flow
- [ ] Verify subscription status syncs properly
- [ ] Test cancellation flow
- [ ] Review subscription copy and pricing
- [ ] Add subscription terms to Terms of Service
- [ ] Update Privacy Policy with subscription data handling
- [ ] Test with production accounts before launch
- [ ] Monitor initial purchases closely

## Subscription Business Logic

### Free Tier Limits (without subscription):
- 3 scans per day
- 1 recipe generation per day
- 5 saved recipes maximum

### Premium Features (with subscription):
- Unlimited scans
- Unlimited recipe generations
- Unlimited saved recipes
- Priority support
- No ads
- Exclusive challenges
- Early access to features

## Revenue Tracking

Monitor key metrics:
- Trial conversion rate (target: 40-60%)
- Monthly churn rate (target: < 5%)
- Customer lifetime value (LTV)
- Monthly recurring revenue (MRR)

## Support

Common subscription issues:
1. **Purchase not reflecting**: Check receipt verification logs
2. **Can't restore purchase**: Verify original purchase exists
3. **Subscription expired incorrectly**: Check timezone handling
4. **Duplicate charges**: Apple/Google handles this, but monitor

## Legal Requirements

1. **Clear pricing display**: Show price, billing period, and trial info
2. **Cancellation instructions**: Link to platform-specific instructions
3. **Auto-renewal disclosure**: Clearly state subscription auto-renews
4. **Terms of Service**: Include subscription terms
5. **Privacy Policy**: Explain subscription data usage

Remember: Apple and Google take 15-30% commission on subscriptions. 
# CookCam Subscription Architecture

## Overview
CookCam uses a dual-table system to handle both In-App Purchases and subscription tiers.

## Tables

### 1. `subscriptions` - IAP Transaction Table
- **Purpose**: Store and validate In-App Purchase transactions
- **Used by**: `subscription.ts` service
- **Data source**: Apple App Store & Google Play receipts
- **Key columns**:
  - `platform`: 'ios' or 'android'
  - `product_id`: The IAP product identifier
  - `transaction_id`: Store transaction ID
  - `expires_at`: When the subscription expires
  - `status`: active, expired, cancelled, etc.

### 2. `user_subscriptions` - Tier Management Table
- **Purpose**: Manage user subscription tiers (Free/Regular/Creator)
- **Used by**: `subscriptionService.ts`
- **Data source**: Internal tier assignments, synced from IAP
- **Key columns**:
  - `tier_id`: 1=Free, 2=Regular, 3=Creator
  - `provider`: Source of subscription (ios, android, stripe, manual)
  - `status`: active, canceled, expired

## How They Work Together

1. **User purchases via App Store/Google Play**
   - Receipt validated by `subscription.ts`
   - Transaction stored in `subscriptions` table
   - Trigger automatically syncs to `user_subscriptions` with tier_id=2 (Regular)

2. **User upgrades to Creator tier**
   - Handled by `subscriptionService.ts`
   - Updates `user_subscriptions` directly
   - Can be done via Stripe or manual admin action

3. **Checking user's access**
   - Use `subscriptionService.getUserSubscription()` to get current tier
   - This checks `user_subscriptions` table which is the source of truth

## Data Flow

```
App Store/Google Play
        ↓
  subscription.ts
        ↓
  subscriptions table
        ↓ (trigger)
  user_subscriptions table ← subscriptionService.ts
        ↓
  App features based on tier
```

## Key Points

- **subscriptions** = IAP transaction history
- **user_subscriptions** = Current subscription state
- Always check `user_subscriptions` for access control
- IAP purchases automatically grant Regular tier
- Creator tier requires separate upgrade flow
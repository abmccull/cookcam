# Stripe Connect Integration Guide

## Overview

CookCam uses a hybrid payment model:
- **Subscriptions**: Handled by Apple App Store and Google Play Store
- **Creator Payouts**: Handled by Stripe Connect
- **Tips & Collections**: Processed through Stripe Connect

## Architecture

### Payment Flow
1. Users purchase subscriptions through iOS/Android in-app purchases
2. Creators earn revenue from:
   - Affiliate commissions (30% of referred subscriptions)
   - Recipe tips from users
   - Premium collection sales (70% after platform fee)
3. Payouts are processed through Stripe Connect to creators' bank accounts

### Database Schema

```sql
-- Tracks creator Stripe accounts
creator_stripe_accounts
├── creator_id (unique)
├── stripe_account_id
├── account_status (pending/active/restricted/disabled)
├── payouts_enabled
└── country/currency

-- Tracks payout requests
creator_payouts
├── creator_id
├── amount
├── status (pending/processing/completed/failed)
├── stripe_transfer_id
└── stripe_payout_id
```

## API Endpoints

### Creator Onboarding

**POST** `/api/v1/subscription/creator/stripe/onboard`
- Creates Stripe Connected Account
- Returns onboarding URL for KYC/bank setup
- Required: Creator tier subscription

**GET** `/api/v1/subscription/creator/stripe/status`
- Check Stripe account status
- Returns if onboarding is complete

**GET** `/api/v1/subscription/creator/stripe/dashboard`
- Get Stripe Express dashboard URL
- Creators can view payouts, update bank info

### Balance & Payouts

**GET** `/api/v1/subscription/creator/balance`
- Get unpaid earnings balance

**POST** `/api/v1/subscription/creator/payout`
```json
{
  "amount": 50.00,
  "method": "stripe"
}
```
- Request payout (minimum $10)
- Processes transfer to connected account

## Implementation Steps

### 1. Environment Setup

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

### 2. Webhook Configuration

Configure Stripe webhooks for:
- `account.updated` - Track onboarding status
- `transfer.created` - Track transfers
- `payout.paid` - Confirm bank payouts
- `payout.failed` - Handle failures

### 3. Creator Onboarding Flow

```javascript
// Mobile app flow
1. User upgrades to Creator tier
2. Check Stripe status: GET /creator/stripe/status
3. If no account, initiate: POST /creator/stripe/onboard
4. Open onboarding URL in webview
5. On return, check status again
6. Enable payout features when active
```

### 4. Payout Processing

```javascript
// Automatic monthly or on-demand
1. Calculate unpaid balance
2. Creator requests payout
3. Create Stripe transfer
4. Stripe handles bank payout
5. Update status via webhook
```

## Security Considerations

1. **Account Verification**: Only creators with active Stripe accounts can receive payouts
2. **Minimum Amounts**: $10 minimum payout to reduce fees
3. **Balance Validation**: Cannot request more than available balance
4. **Webhook Security**: Verify signatures on all webhooks
5. **PCI Compliance**: No credit card data stored, all handled by Stripe

## Testing

### Test Mode
1. Use Stripe test keys
2. Test account: `acct_1234567890`
3. Simulate payouts instantly

### Test Scenarios
- Creator onboarding completion
- Successful payout
- Failed payout (insufficient funds)
- Account restrictions

## Mobile Integration

```typescript
// Check if creator can receive payouts
const canReceivePayouts = async () => {
  const { data } = await api.get('/subscription/creator/stripe/status');
  return data.account?.payoutsEnabled === true;
};

// Request payout
const requestPayout = async (amount: number) => {
  if (amount < 10) {
    throw new Error('Minimum payout is $10');
  }
  
  return api.post('/subscription/creator/payout', {
    amount,
    method: 'stripe'
  });
};
```

## Revenue Calculation

### Affiliate Earnings
- Regular tier: $3.99/month × 30% = $1.20/referral/month
- Creator tier: $9.99/month × 30% = $3.00/referral/month

### Tips
- 100% goes to creator
- Minimum tip: $0.50

### Collections
- Creator receives 70%
- Platform fee: 30%
- Minimum price: $0.99

## Monitoring

Track in logs:
- Failed onboarding attempts
- Payout failures
- Transfer amounts
- Active creator accounts

## Future Enhancements

1. **Instant Payouts**: For verified creators
2. **Multiple Currencies**: Support international creators
3. **Tax Reporting**: 1099 generation for US creators
4. **Payout Scheduling**: Weekly/monthly options
5. **PayPal Integration**: Alternative payout method 
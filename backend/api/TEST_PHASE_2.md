# Phase 2 Testing Guide: Payments and Subscriptions

## Overview
This document provides comprehensive testing instructions for Phase 2 implementation, covering Stripe webhook verification and IAP validation hardening.

---

## 2.1 Stripe Webhook Signature Verification

### Test 1: Valid Webhook with Correct Signature ✅
**Purpose**: Ensure webhooks with valid signatures are processed

```bash
# Use Stripe CLI to send test webhook
stripe listen --forward-to localhost:3000/api/v1/subscription/webhook

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

**Expected Result**:
- ✅ Webhook processed successfully (200 response)
- ✅ Event recorded in `stripe_webhook_events` table with status `processed`
- ✅ Subscription state updated in `user_subscriptions`
- ✅ Logs show webhook event ID and processing duration

---

### Test 2: Invalid Signature Rejection 🔒
**Purpose**: Ensure webhooks with invalid signatures are rejected

```bash
# Send a webhook with wrong signature
curl -X POST http://localhost:3000/api/v1/subscription/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid_signature" \
  -d '{"type":"payment_intent.succeeded","data":{}}'
```

**Expected Result**:
- ✅ Returns 400 Bad Request
- ✅ Error message: "Webhook signature verification failed"
- ✅ No record created in database
- ✅ Security alert logged

---

### Test 3: Idempotency (Duplicate Event) 🔁
**Purpose**: Ensure duplicate webhook events are not processed twice

```bash
# 1. Send initial webhook (will be processed)
stripe trigger payment_intent.succeeded

# 2. Replay the same webhook (should be rejected)
# Get the event ID from database and replay it
curl -X POST http://localhost:3000/api/v1/subscription/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: $(stripe webhooks generate-signature <event_id>)" \
  -d @previous_webhook_payload.json
```

**Expected Result**:
- ✅ First request: 200 OK, event processed
- ✅ Second request: 200 OK, but skipped (idempotency)
- ✅ Database has single record with status `processed`
- ✅ Logs show "Webhook already processed"

---

### Test 4: Subscription Events Flow 🔄
**Purpose**: Test complete subscription lifecycle

```bash
# Test customer.subscription.created
stripe trigger customer.subscription.created

# Test customer.subscription.updated
stripe trigger customer.subscription.updated

# Test customer.subscription.deleted
stripe trigger customer.subscription.deleted
```

**Expected Result**:
- ✅ Subscription status changes: `active` → `active` → `canceled`
- ✅ User subscription record reflects current state
- ✅ All events logged in `stripe_webhook_events`
- ✅ User profile updated with correct tier

---

## 2.2 IAP Validation Hardening

### Test 5: iOS Receipt Validation ✅
**Purpose**: Validate Apple App Store receipt

```bash
# Test with a valid receipt from Apple
curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.cookcam.creator.monthly",
    "receipt": "<base64_receipt_data>"
  }'
```

**Expected Result**:
- ✅ Returns 200 with subscription activated
- ✅ Receipt stored in `iap_validation_history`
- ✅ User subscription updated with transaction ID
- ✅ Logs show validation duration and environment (sandbox/production)

---

### Test 6: Receipt Deduplication 🔁
**Purpose**: Ensure duplicate receipts are rejected

```bash
# 1. Submit receipt (first time - should succeed)
curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.cookcam.creator.monthly",
    "receipt": "<same_receipt_as_before>"
  }'

# 2. Submit same receipt again (should be rejected with cached result)
# Run same command again
```

**Expected Result**:
- ✅ First request: 200 OK, subscription activated
- ✅ Second request: Uses cached result (no Apple API call)
- ✅ Logs show "Receipt already validated (deduplication)"
- ✅ Only one record in `iap_validation_history`

---

### Test 7: Retry Logic (Simulated Network Failure) 🔄
**Purpose**: Ensure transient failures are retried

**Manual Test**:
1. Temporarily block outbound connections to Apple/Google APIs
2. Submit receipt validation request
3. Restore network connection
4. Check logs for retry attempts

**Expected Result**:
- ✅ Initial failure logged
- ✅ Retry attempts with exponential backoff (1s, 2s, 4s)
- ✅ Eventually succeeds or returns 503 (should retry)
- ✅ Logs show: "⚠️ Apple validation attempt X failed, will retry"

---

### Test 8: Android Purchase Validation ✅
**Purpose**: Validate Google Play purchase

```bash
curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "android",
    "productId": "com.cookcam.creator.monthly",
    "purchaseToken": "<google_purchase_token>"
  }'
```

**Expected Result**:
- ✅ Returns 200 with subscription activated
- ✅ Purchase validated via Google Play API
- ✅ Order ID stored in `iap_validation_history`
- ✅ User subscription updated

---

### Test 9: Invalid Receipt Rejection ❌
**Purpose**: Ensure invalid receipts are rejected without retry

```bash
curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.cookcam.creator.monthly",
    "receipt": "invalid_base64_data"
  }'
```

**Expected Result**:
- ✅ Returns 400 Bad Request
- ✅ Error: "Receipt could not be authenticated"
- ✅ No retry attempts (permanent error)
- ✅ Validation stored with status `invalid`

---

### Test 10: Sandbox/Production Environment Detection 🧪
**Purpose**: Ensure sandbox receipts are auto-retried with sandbox URL

**Manual Test**:
1. Submit a sandbox receipt to production endpoint
2. Check logs for auto-retry behavior

**Expected Result**:
- ✅ Initial validation fails with status 21007 (sandbox receipt)
- ✅ Logs show: "🧪 Receipt from sandbox, retrying with sandbox URL"
- ✅ Second validation succeeds with sandbox environment
- ✅ Subscription activated with `environment: 'sandbox'`

---

### Test 11: Fraud Detection View 🔍
**Purpose**: Verify fraud detection identifies suspicious patterns

```sql
-- Run this query after multiple validation attempts
SELECT * FROM public.iap_fraud_detection_view;
```

**Expected Result**:
- ✅ Shows users with >5 validation attempts
- ✅ Highlights users with >3 invalid attempts
- ✅ Identifies multiple sandbox attempts in production
- ✅ Includes timing data (first_attempt, last_attempt, avg_duration_ms)

---

## Database Migration Testing

### Apply Migrations
```bash
cd backend/supabase
supabase migration up
```

**Verify Tables Created**:
```sql
-- Check stripe_webhook_events table
SELECT * FROM public.stripe_webhook_events LIMIT 1;

-- Check iap_validation_history table
SELECT * FROM public.iap_validation_history LIMIT 1;

-- Check fraud detection view
SELECT * FROM public.iap_fraud_detection_view;
```

**Expected Result**:
- ✅ All tables exist with correct schema
- ✅ Indexes created for performance
- ✅ RLS policies active
- ✅ Views accessible

---

## Performance Testing

### Test 12: Validation Performance ⚡
**Purpose**: Ensure IAP validation completes within acceptable time

```bash
# Run 10 concurrent validations
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
    -H "Authorization: Bearer <user_jwt>" \
    -H "Content-Type: application/json" \
    -d '{
      "platform": "ios",
      "productId": "com.cookcam.creator.monthly",
      "receipt": "<receipt_$i>"
    }' &
done
wait
```

**Expected Result**:
- ✅ All requests complete within 10 seconds
- ✅ No timeout errors
- ✅ Database handles concurrent writes
- ✅ Logs show validation_duration_ms < 5000ms

---

## Security Testing

### Test 13: Unauthorized Access 🔒
**Purpose**: Ensure endpoints require authentication

```bash
# Try without authentication
curl -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","productId":"test","receipt":"test"}'
```

**Expected Result**:
- ✅ Returns 401 Unauthorized
- ✅ Error: "Authentication token required"

---

### Test 14: Receipt Data Protection 🔐
**Purpose**: Ensure sensitive receipt data is handled securely

1. Check logs for receipt data exposure
2. Verify Sentry events don't contain raw receipts
3. Check database encryption at rest

**Expected Result**:
- ✅ Raw receipts not exposed in logs
- ✅ Sentry events show `[REDACTED]` for receipt field
- ✅ Receipt hashes used for lookups (not raw data)

---

## Monitoring and Alerts

### Test 15: Sentry Integration 🚨
**Purpose**: Ensure errors are captured in Sentry

```bash
# Trigger an error (invalid signature)
curl -X POST http://localhost:3000/api/v1/subscription/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"type":"test","data":{}}'
```

**Expected Result**:
- ✅ Error captured in Sentry
- ✅ Event includes context: requestId, userId, platform
- ✅ PII scrubbed (no raw receipts/tokens)
- ✅ Alert sent to #alerts channel (if configured)

---

## Rollback Testing

### Test 16: Safe Rollback ↩️
**Purpose**: Ensure system can safely rollback to previous version

```bash
# 1. Note current state
SELECT COUNT(*) FROM stripe_webhook_events;
SELECT COUNT(*) FROM iap_validation_history;

# 2. Rollback migrations
supabase migration down

# 3. Restart backend with old code
pm2 restart cookcam-api

# 4. Verify system still functional
curl http://localhost:3000/health
```

**Expected Result**:
- ✅ Migrations rollback cleanly
- ✅ Old code still functional
- ✅ No data loss
- ✅ Health check passes

---

## Acceptance Checklist

### Phase 2.1: Stripe Webhooks ✅
- [x] Valid signatures accepted
- [x] Invalid signatures rejected
- [x] Idempotency prevents duplicates
- [x] Subscription lifecycle works
- [ ] Tests written for all event types

### Phase 2.2: IAP Validation ✅
- [x] iOS receipts validated successfully
- [x] Android purchases validated successfully
- [x] Duplicate receipts rejected (cached)
- [x] Retry logic works for transient failures
- [x] Invalid receipts rejected without retry
- [x] Sandbox/production auto-detection works
- [x] Fraud detection view functional
- [ ] Tests written for retry scenarios

---

## Next Steps

After completing all tests:
1. ✅ Mark Phase 2 as complete in tracking doc
2. ⏳ Move to Phase 3: Observability and Operations
3. 📝 Document any issues found during testing
4. 🚀 Prepare for production deployment

---

## Support

**Issues Found?**
- Check logs: `pm2 logs cookcam-api`
- Check Sentry: https://sentry.io/organizations/cookcam
- Review database: `psql <connection_string>`

**Need Help?**
- Slack: #cookcam-backend
- Email: dev@cookcam.app


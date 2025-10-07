# 🚀 Quick Start: Production Readiness

**Status**: Phase 1 & 2.1 Complete ✅  
**Ready to Deploy**: Yes (with testing)  
**Last Updated**: 2025-10-07

---

## ⚡ Quick Commands

### Test Everything
```bash
cd backend/api
./TEST_PHASE_1.sh
```

### Deploy Phase 1 & 2.1
```bash
# 1. Run migration
psql $DATABASE_URL -f backend/supabase/migrations/20251007000001_create_stripe_webhook_events.sql

# 2. Build
cd backend/api
npm run build

# 3. Restart
pm2 restart cookcam-api

# 4. Verify
curl https://api.cookcam.ai/health
pm2 logs cookcam-api --lines 50
```

### Test Webhooks
```bash
# Install Stripe CLI
stripe listen --forward-to https://api.cookcam.ai/api/v1/subscription/webhook/stripe

# Trigger test event
stripe trigger customer.subscription.created
```

---

## 📋 What Changed?

### Phase 1 ✅
- ✅ Unified auth (WebSocket now uses Supabase)
- ✅ Environment validation (fail-fast on missing config)
- ✅ Better error messages (Postgres/Supabase codes)
- ✅ PII scrubbing in Sentry
- ✅ Graceful shutdown

### Phase 2.1 ✅
- ✅ Stripe webhook signature verification
- ✅ Idempotency (prevents duplicate processing)
- ✅ Audit trail (stores all webhook events)
- ✅ Error handling with auto-retry

---

## 🎯 Required Environment Variables

```bash
# Critical (app won't start without these)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
JWT_SECRET=                    # 32+ chars
JWT_REFRESH_SECRET=            # 32+ chars

# Production only
SENTRY_DSN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=         # NEW! Required for webhooks
APPLE_SHARED_SECRET=
GOOGLE_SERVICE_ACCOUNT_KEY=
```

---

## 🧪 Testing Checklist

- [ ] Start app with missing var → should fail clearly
- [ ] WebSocket connect with valid token → should succeed
- [ ] WebSocket connect with invalid token → should fail
- [ ] Trigger Postgres error → should get user-friendly message
- [ ] Check Sentry event → no tokens/passwords visible
- [ ] PM2 restart → no 5xx errors
- [ ] Send Stripe webhook → should process once only
- [ ] Resend same webhook → should detect duplicate

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| `PRODUCTION_READINESS_README.md` | Overview & quick start |
| `PHASE_1_COMPLETE.md` | Phase 1 details & testing |
| `PHASE_2_STRIPE_WEBHOOK_COMPLETE.md` | Phase 2.1 details |
| `PRODUCTION_READINESS_IMPLEMENTATION.md` | Full 9-phase plan |
| `TODAY_PROGRESS_SUMMARY.md` | What we did today |

---

## 🚨 Known Issues / TODO

- [ ] Unit tests for Phase 1
- [ ] Unit tests for webhooks
- [ ] IAP validation hardening (Phase 2.2)
- [ ] Subscription reconciliation job (Phase 2.3)
- [ ] Secrets rotation runbook

---

## 💡 Key Improvements

**Before:**
- WebSocket used custom JWT (inconsistent with HTTP)
- Missing env vars caused runtime failures
- Generic error messages
- No webhook idempotency
- Abrupt shutdowns

**After:**
- Consistent Supabase auth everywhere
- Fail-fast with clear errors
- User-friendly error messages
- Duplicate webhooks rejected
- Graceful shutdowns

---

## 📊 Success Metrics

| Metric | Target | How to Check |
|--------|--------|--------------|
| Startup Success | 100% | `pm2 logs` - see "✅ Environment validation successful" |
| WebSocket Auth | >99% | Monitor connection logs |
| Webhook Success | >99% | `SELECT * FROM stripe_webhook_events WHERE status='processed'` |
| Duplicate Rejection | Works | Resend same webhook event |
| Graceful Shutdown | 100% | `pm2 restart` - no 5xx errors |

---

## 🔥 Quick Troubleshooting

**App won't start**
```bash
# Check what's missing
node dist/scripts/environment-check.js
```

**WebSocket auth failing**
```bash
# Check logs
pm2 logs cookcam-api | grep WebSocket
# Verify token is Supabase token (not custom JWT)
```

**Webhook failing**
```bash
# Check signature
SELECT * FROM stripe_webhook_events WHERE status='failed' ORDER BY received_at DESC LIMIT 5;

# Verify secret
echo $STRIPE_WEBHOOK_SECRET
# Should match Stripe dashboard
```

---

## 🎯 Next Steps

1. **Test locally** - Run test script
2. **Deploy to staging** - Test end-to-end
3. **Monitor metrics** - Watch for issues
4. **Proceed to Phase 2.2** - IAP validation hardening

---

**Questions?** Check the detailed docs above or run the test script!


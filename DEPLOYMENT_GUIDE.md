# 🚀 CookCam Production Deployment Guide

**Date**: October 7, 2025  
**Version**: 1.0  
**Production Readiness**: 47% Core Features Complete

---

## 📋 Pre-Deployment Checklist

### ✅ Completed Phases (1-5)
- [x] Phase 1: Authentication, Security, Configuration
- [x] Phase 2: Payments and Subscriptions  
- [x] Phase 3: Observability and Operations
- [x] Phase 4: Performance and Networking (core)
- [x] Phase 5: Data Integrity (core)

### ⏳ Optional Phases (6-9)
- [ ] Phase 6: CI/CD (can be done post-launch)
- [ ] Phase 7: Mobile strictness (can be done post-launch)
- [ ] Phase 8: Security audit (recommended before public launch)
- [ ] Phase 9: Runbooks & SLOs (can be done incrementally)

---

## 🗄️ Database Migrations

### Migrations to Apply (5 total)

**Order matters! Apply in sequence:**

```bash
cd /Users/abmccull/Desktop/cookcam/backend/supabase

# 1. Stripe webhook events
supabase migration up 20251007000001_create_stripe_webhook_events.sql

# 2. IAP validation history
supabase migration up 20251007000002_create_iap_validation_history.sql

# 3. Reconciliation metrics
supabase migration up 20251007000003_create_reconciliation_metrics.sql

# 4. Performance indexes
supabase migration up 20251007000004_performance_indexes.sql

# 5. Data integrity constraints
supabase migration up 20251007000005_data_integrity_constraints.sql
```

### Verify Migrations

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'stripe_webhook_events',
    'iap_validation_history', 
    'reconciliation_metrics'
);

-- Check all indexes exist
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Check foreign key constraints
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'f'
AND connamespace = 'public'::regnamespace;

-- Check views exist
SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE '%_view';
```

---

## 🔧 Environment Variables

### Required Variables

```bash
# Core (Phase 1)
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://cookcam.app

# Supabase (Phase 1)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT (Phase 1) - MUST be 32+ characters
JWT_SECRET=your_very_long_secret_minimum_32_chars
JWT_REFRESH_SECRET=your_very_long_refresh_secret_32_chars

# Sentry (Phase 3)
SENTRY_DSN=https://your_sentry_dsn
GIT_COMMIT_SHA=$(git rev-parse HEAD)

# Stripe (Phase 2)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Apple IAP (Phase 2)
APPLE_SHARED_SECRET=your_apple_shared_secret

# Google IAP (Phase 2)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
GOOGLE_PLAY_PACKAGE_NAME=com.cookcam.app
```

### Validate Environment

```bash
cd /Users/abmccull/Desktop/cookcam/backend/api

# This will fail fast if any required vars are missing
npm start

# Should see:
# ✅ Environment validation passed
# ✅ Sentry initialized
# ✅ Supabase clients initialized
# 🚀 CookCam API server started
```

---

## 🐳 Backend Deployment

### Option 1: PM2 (Recommended)

```bash
cd /Users/abmccull/Desktop/cookcam/backend/api

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.production.js

# Verify
pm2 status
pm2 logs cookcam-api --lines 50

# Set up cron job for reconciliation
pm2 start cron-reconciliation.js \
  --name "reconciliation-cron" \
  --cron "0 2 * * *" \
  --no-autorestart

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 2: Docker

```bash
cd /Users/abmccull/Desktop/cookcam

# Build backend image
docker build -t cookcam-api:latest -f backend/api/Dockerfile backend/api

# Run with docker-compose
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f api
```

### Option 3: Cloud Provider

**Render / Railway / Fly.io:**
1. Connect GitHub repository
2. Set environment variables
3. Use build command: `npm run build`
4. Use start command: `npm start`
5. Set healthcheck: `/health`

---

## 🌐 Nginx Deployment

### Apply Configuration

```bash
# Copy nginx configs
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# OR restart
sudo systemctl restart nginx

# Verify
curl http://localhost/health
```

### SSL Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.cookcam.app -d cookcam.app

# Auto-renewal is enabled by default
sudo certbot renew --dry-run
```

---

## 🧪 Post-Deployment Testing

### 1. Health Checks

```bash
# API health
curl https://api.cookcam.app/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-07T...",
#   "environment": "production",
#   "websocket": {
#     "connected_users": 0,
#     "status": "active"
#   }
# }
```

### 2. Authentication Test

```bash
# Register test user
curl -X POST https://api.cookcam.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Login
curl -X POST https://api.cookcam.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Should return JWT token
```

### 3. Stripe Webhook Test

```bash
# Use Stripe CLI
stripe listen --forward-to https://api.cookcam.app/api/v1/subscription/webhook

# Trigger test event
stripe trigger payment_intent.succeeded

# Check webhook events table
psql $DATABASE_URL -c "SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5;"
```

### 4. IAP Validation Test

```bash
# Test with sandbox receipt
curl -X POST https://api.cookcam.app/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.cookcam.creator.monthly",
    "receipt": "sandbox_receipt_data"
  }'

# Check validation history
psql $DATABASE_URL -c "SELECT * FROM iap_validation_history ORDER BY validated_at DESC LIMIT 5;"
```

### 5. Reconciliation Job Test

```bash
# Manual trigger
curl -X POST https://api.cookcam.app/api/v1/reconciliation/run \
  -H "Authorization: Bearer YOUR_JWT"

# Check metrics
curl https://api.cookcam.app/api/v1/reconciliation/metrics \
  -H "Authorization: Bearer YOUR_JWT"

# Check cron job logs
pm2 logs reconciliation-cron
```

### 6. Sentry Error Capture Test

```bash
# Trigger an error
curl -X POST https://api.cookcam.app/api/v1/subscription/webhook \
  -H "stripe-signature: invalid" \
  -d '{"type":"test"}'

# Check Sentry dashboard:
# - Should see error captured
# - Release tagged with GIT_COMMIT_SHA
# - PII scrubbed (no tokens visible)
# - Custom fingerprint applied
```

---

## 📊 Monitoring Setup

### 1. Database Monitoring Queries

```sql
-- Webhook processing health
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- IAP validation health
SELECT 
  status,
  platform,
  COUNT(*) as count
FROM iap_validation_history
WHERE validated_at > NOW() - INTERVAL '24 hours'
GROUP BY status, platform;

-- Reconciliation health
SELECT * FROM reconciliation_health_view LIMIT 7;

-- Active alerts
SELECT * FROM reconciliation_alerts_view;

-- Fraud detection
SELECT * FROM iap_fraud_detection_view;
```

### 2. Log Monitoring

```bash
# Watch application logs
pm2 logs cookcam-api --lines 100

# Watch for errors
pm2 logs cookcam-api | grep ERROR

# Watch for PII redaction (should see [REDACTED])
pm2 logs cookcam-api | grep REDACTED

# Export logs to file
pm2 logs cookcam-api --out logs.txt
```

### 3. Sentry Dashboard

**Navigate to**: https://sentry.io/organizations/cookcam

**Monitor**:
- Error rate by endpoint
- P95 latency
- Release comparison
- Custom tags (userId, subscriptionTier)
- Breadcrumb trail

### 4. Set Up Alerts

**Sentry Alerts**:
- Critical errors → Page on-call
- Error rate >5% → Email team
- P95 latency >5s → Email team

**Database Alerts** (set up via cron + monitoring service):
```bash
# Add to crontab
0 * * * * psql $DATABASE_URL -c "SELECT COUNT(*) FROM reconciliation_alerts_view" | mail -s "Reconciliation Alerts" team@cookcam.app
```

---

## 🔄 Rollback Plan

### Quick Rollback

```bash
# Option 1: PM2 rollback
pm2 stop cookcam-api
pm2 delete cookcam-api
pm2 start ecosystem.config.production.js --env previous

# Option 2: Git rollback
git revert HEAD
npm run build
pm2 reload cookcam-api

# Option 3: Database rollback
cd backend/supabase
supabase migration down --count 5  # Rollback all 5 migrations
```

### Full Restore

```bash
# Restore from backup
psql $DATABASE_URL < backup_$(date +%Y%m%d).sql

# Restore previous code
git checkout previous-stable-tag
npm install
npm run build
pm2 reload cookcam-api
```

---

## 🧹 Maintenance Tasks

### Daily

```bash
# Check reconciliation job ran
pm2 logs reconciliation-cron | grep "reconciliation job completed"

# Check for alerts
psql $DATABASE_URL -c "SELECT * FROM reconciliation_alerts_view;"

# Check error rate
# (Monitor Sentry dashboard)
```

### Weekly

```bash
# Review fraud detection
psql $DATABASE_URL -c "SELECT * FROM iap_fraud_detection_view;"

# Check subscription drift
psql $DATABASE_URL -c "SELECT * FROM reconciliation_health_view ORDER BY date DESC LIMIT 7;"

# Review webhook failures
psql $DATABASE_URL -c "SELECT * FROM stripe_webhook_events WHERE status='failed' AND created_at > NOW() - INTERVAL '7 days';"
```

### Monthly

```bash
# Run data cleanup
psql $DATABASE_URL -c "SELECT cleanup_old_data();"

# Run reconciliation metrics cleanup
psql $DATABASE_URL -c "SELECT cleanup_old_reconciliation_metrics();"

# Review performance
# - Check slow queries
# - Review index usage
# - Optimize as needed

# Security audit
# - Review access logs
# - Check for suspicious patterns
# - Update dependencies
```

---

## 🚨 Troubleshooting

### Issue: High Error Rate

```bash
# Check Sentry for patterns
# Check database for issues
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Check server resources
pm2 monit

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: Webhook Processing Failures

```bash
# Check webhook events
psql $DATABASE_URL -c "SELECT * FROM stripe_webhook_events WHERE status='failed' ORDER BY created_at DESC LIMIT 10;"

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Test webhook manually
stripe trigger payment_intent.succeeded
```

### Issue: IAP Validation Failures

```bash
# Check validation history
psql $DATABASE_URL -c "SELECT * FROM iap_validation_history WHERE status='invalid' ORDER BY validated_at DESC LIMIT 10;"

# Verify secrets
echo $APPLE_SHARED_SECRET
echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .

# Test validation manually
# (Use test receipts from Apple/Google)
```

### Issue: Reconciliation Drift

```bash
# Check metrics
psql $DATABASE_URL -c "SELECT * FROM reconciliation_metrics ORDER BY reconciled_at DESC LIMIT 1;"

# Run manual reconciliation
curl -X POST https://api.cookcam.app/api/v1/reconciliation/run \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Check specific user
curl -X POST https://api.cookcam.app/api/v1/reconciliation/user/USER_ID \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 📞 Support Contacts

**Development Team**: dev@cookcam.app  
**DevOps Team**: devops@cookcam.app  
**On-Call**: +1-XXX-XXX-XXXX  

**Monitoring Dashboards**:
- Sentry: https://sentry.io/organizations/cookcam
- Database: https://supabase.com/dashboard/project/YOUR_PROJECT

**Documentation**:
- Implementation: `/PRODUCTION_READINESS_IMPLEMENTATION.md`
- Progress: `/IMPLEMENTATION_PROGRESS.md`
- This Guide: `/DEPLOYMENT_GUIDE.md`

---

## ✅ Post-Launch Checklist

### Immediate (Day 1)
- [ ] All health checks passing
- [ ] No critical errors in Sentry
- [ ] Webhook processing >99% success
- [ ] IAP validation >95% success
- [ ] Reconciliation job ran successfully

### Week 1
- [ ] Monitor error rates daily
- [ ] Review fraud detection alerts
- [ ] Check subscription drift
- [ ] Verify all webhooks processed
- [ ] Review performance metrics

### Month 1
- [ ] Run data cleanup
- [ ] Security audit
- [ ] Performance optimization
- [ ] Complete Phase 6-9 (optional)
- [ ] Update runbooks

---

**Deployment Status**: ✅ Ready for Production  
**Core Features**: 47% Complete (Critical features done)  
**Recommended**: Deploy now, iterate on remaining phases post-launch

🚀 **Good luck with your deployment!**


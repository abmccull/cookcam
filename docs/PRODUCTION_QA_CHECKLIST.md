# Production QA Checklist

## Overview
Comprehensive quality assurance checklist before production release. All items must be verified before going live.

**Release Version**: _________________  
**QA Date**: _________________  
**QA Engineer**: _________________

---

## 🔐 Security & Authentication

### Authentication Flow
- [ ] User registration works (email + password)
- [ ] User login works
- [ ] Password reset flow works
- [ ] Email verification works
- [ ] Biometric login works (mobile)
- [ ] Session expiration handled correctly
- [ ] Token refresh works automatically
- [ ] Logout clears all tokens
- [ ] Concurrent sessions handled properly
- [ ] Rate limiting prevents brute force

### Authorization
- [ ] Free users can't access premium features
- [ ] Premium users can access all features
- [ ] Expired subscriptions revert to free tier
- [ ] Admin endpoints require admin role
- [ ] JWT claims correctly reflect subscription status
- [ ] Referral codes work correctly

### Security Headers
```bash
curl -I https://api.cookcam.app | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security"
```
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security present
- [ ] Content-Security-Policy configured

---

## 💳 Payments & Subscriptions

### Stripe Integration
- [ ] Stripe checkout session creates correctly
- [ ] Payment success redirects to app
- [ ] Payment failure shows error message
- [ ] Webhook signature verification works
- [ ] `customer.subscription.created` processed
- [ ] `customer.subscription.updated` processed
- [ ] `customer.subscription.deleted` processed
- [ ] `invoice.payment_failed` processed
- [ ] Subscription status updated in database
- [ ] User JWT claims updated after payment
- [ ] Refunds handled correctly

### Apple IAP (iOS)
- [ ] Receipt validation works (production)
- [ ] Receipt validation works (sandbox)
- [ ] Duplicate receipts rejected
- [ ] Expired subscriptions detected
- [ ] Auto-renewal handled
- [ ] Subscription upgrades work
- [ ] Subscription downgrades work
- [ ] Free trial eligibility checked
- [ ] Receipt validation retries on failure

### Google IAP (Android)
- [ ] Purchase token validation works
- [ ] Duplicate purchases rejected
- [ ] Subscription status synced
- [ ] Acknowledgment sent to Google
- [ ] Refunds detected and handled
- [ ] Proration handled correctly

### Reconciliation
- [ ] Daily reconciliation job runs
- [ ] Drift detected and corrected
- [ ] Overdue subscriptions expired
- [ ] Metrics logged correctly
- [ ] Alerts triggered on high drift

---

## 📱 Mobile App (iOS & Android)

### Core Features
- [ ] App launches without crashes
- [ ] Camera permission requested
- [ ] Camera opens and captures photo
- [ ] Image upload works
- [ ] Ingredient recognition returns results
- [ ] Recipe generation works
- [ ] Recipes saved to user profile
- [ ] Recipe sharing works
- [ ] Push notifications received (if implemented)

### Onboarding
- [ ] Welcome screens display
- [ ] Paywall appears at correct time
- [ ] Skip option available (if applicable)
- [ ] Onboarding can be completed
- [ ] User preferences saved

### Navigation
- [ ] Bottom tab navigation works
- [ ] Stack navigation works
- [ ] Back button works (Android)
- [ ] Deep links work
- [ ] Universal links work (iOS)

### UI/UX
- [ ] No UI overlaps or cutoffs
- [ ] Safe areas respected (notch, status bar)
- [ ] Loading states display
- [ ] Error messages are user-friendly
- [ ] Empty states display correctly
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works (if applicable)

### Performance
- [ ] App launch time < 3 seconds
- [ ] No memory leaks
- [ ] No excessive battery drain
- [ ] Images load quickly
- [ ] Smooth scrolling (60 FPS)

### Offline Functionality
- [ ] Cached data displays offline
- [ ] Offline indicator shows
- [ ] Sync on reconnection works
- [ ] No crashes when offline

---

## 🔧 Backend API

### Health & Status
```bash
curl https://api.cookcam.app/health
```
- [ ] `/health` returns 200 OK
- [ ] Health check shows uptime
- [ ] Health check shows WebSocket status
- [ ] Metrics endpoint accessible (if public)

### Core Endpoints
- [ ] `POST /api/v1/auth/register` - User registration
- [ ] `POST /api/v1/auth/login` - User login
- [ ] `POST /api/v1/auth/refresh` - Token refresh
- [ ] `POST /api/v1/auth/logout` - Logout
- [ ] `GET /api/v1/recipes` - List user recipes
- [ ] `POST /api/v1/recipes/generate` - Generate recipe
- [ ] `GET /api/v1/recipes/:id` - Get recipe details
- [ ] `DELETE /api/v1/recipes/:id` - Delete recipe
- [ ] `POST /api/v1/ingredients/scan` - Scan ingredient
- [ ] `GET /api/v1/user/profile` - Get user profile
- [ ] `PUT /api/v1/user/profile` - Update profile
- [ ] `POST /api/v1/subscription/checkout` - Create checkout
- [ ] `POST /api/v1/subscription/webhook` - Stripe webhook
- [ ] `POST /api/v1/iap/validate` - IAP validation

### Error Handling
- [ ] Invalid auth returns 401
- [ ] Missing required fields return 400
- [ ] Not found returns 404
- [ ] Server errors return 500
- [ ] Rate limit returns 429
- [ ] Error messages are descriptive
- [ ] Errors logged to Sentry

### Performance
- [ ] Recipe generation < 30 seconds
- [ ] Image upload < 10 seconds
- [ ] API p95 latency < 500ms
- [ ] Database queries < 100ms (p95)
- [ ] No N+1 query issues

---

## 🗄️ Database

### Schema Validation
```sql
-- Check critical tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 'user_subscriptions', 'recipes', 
    'ingredients', 'stripe_webhook_events', 
    'iap_validation_history', 'reconciliation_metrics'
  );
```
- [ ] All critical tables exist
- [ ] Indexes created correctly
- [ ] Foreign key constraints active
- [ ] Check constraints enforced

### Data Integrity
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM user_subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);
```
- [ ] No orphaned subscription records
- [ ] No orphaned recipe records
- [ ] No NULL values in NOT NULL columns
- [ ] Date ranges valid (start < end)
- [ ] Enum values valid

### Migrations
- [ ] All migrations applied successfully
- [ ] Migration rollback tested (staging)
- [ ] No data loss from migrations
- [ ] Indexes created without blocking

---

## 🌐 Networking & Infrastructure

### Nginx Configuration
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] SSL certificate valid
- [ ] Rate limiting active
- [ ] WebSocket proxy works
- [ ] Client max body size sufficient (10MB)
- [ ] Timeout settings appropriate
- [ ] Compression enabled (gzip)
- [ ] CORS headers correct

### DNS & Domain
- [ ] `api.cookcam.app` resolves correctly
- [ ] `www.cookcam.app` resolves correctly
- [ ] SSL certificate matches domain
- [ ] No mixed content warnings

### Load & Capacity
- [ ] Server can handle 1000 req/min
- [ ] Database connection pool sufficient
- [ ] Disk space > 30% free
- [ ] Memory usage < 80%
- [ ] CPU usage < 70% under load

---

## 📊 Monitoring & Observability

### Sentry Integration
- [ ] Sentry SDK initialized
- [ ] Errors captured in Sentry
- [ ] Source maps uploaded (mobile)
- [ ] Release tracking active
- [ ] PII scrubbed from errors
- [ ] Performance monitoring active
- [ ] Alert rules configured

### Logging
- [ ] Structured JSON logs in production
- [ ] Request IDs tracked
- [ ] Sensitive data scrubbed
- [ ] Log levels appropriate
- [ ] Logs searchable (if using service)

### Metrics
- [ ] Reconciliation metrics logged
- [ ] IAP validation metrics logged
- [ ] Webhook processing metrics logged
- [ ] Health check metrics available

---

## 🔄 CI/CD Pipeline

### Backend Pipeline
- [ ] Linting passes
- [ ] TypeScript compilation succeeds
- [ ] Tests pass (if applicable)
- [ ] Build artifacts created
- [ ] Deployment to staging works
- [ ] Deployment to production works
- [ ] Health check after deployment passes
- [ ] Rollback procedure tested

### Mobile Pipeline
- [ ] Linting passes
- [ ] TypeScript compilation succeeds
- [ ] EAS build succeeds (iOS & Android)
- [ ] OTA update publishes
- [ ] App store submission works

### Database Pipeline
- [ ] Migration validation passes
- [ ] Migrations apply to staging
- [ ] Migrations apply to production
- [ ] Backup created before migration

---

## 🎮 User Experience

### Happy Path (New User)
1. [ ] Download app from store
2. [ ] Complete onboarding
3. [ ] See paywall
4. [ ] Start free trial (or skip)
5. [ ] Take first photo
6. [ ] Ingredient recognized
7. [ ] Generate recipe
8. [ ] Recipe displays correctly
9. [ ] Save recipe
10. [ ] View saved recipes

### Premium User Path
1. [ ] Log in
2. [ ] Subscribe via Stripe/IAP
3. [ ] Subscription activates immediately
4. [ ] Premium features unlocked
5. [ ] Unlimited recipe generation
6. [ ] Social features work
7. [ ] XP and achievements track

### Error Scenarios
- [ ] Network error displays user-friendly message
- [ ] Invalid image shows helpful error
- [ ] API timeout shows retry option
- [ ] Payment failure shows clear next steps
- [ ] Expired subscription shows renewal option

---

## 🔍 Edge Cases

### Authentication
- [ ] Expired token auto-refreshes
- [ ] Invalid token shows login screen
- [ ] User banned shows appropriate message
- [ ] Password reset with invalid email handled
- [ ] Email already registered shows clear error

### Payments
- [ ] Card declined handled gracefully
- [ ] Subscription already active handled
- [ ] Duplicate purchase prevented
- [ ] Proration calculated correctly
- [ ] Refund updates subscription status

### Data Handling
- [ ] Large image (10MB) uploads
- [ ] Image with no ingredients detected
- [ ] Recipe generation timeout handled
- [ ] Empty search results displayed
- [ ] Pagination works with < page size items

---

## 🚨 Disaster Recovery

### Backup & Restore
- [ ] Database backups run daily
- [ ] Backups can be restored successfully
- [ ] Backup retention policy active (30 days)
- [ ] Backup size monitored

### Rollback
- [ ] Application rollback tested
- [ ] Database migration rollback tested
- [ ] Rollback procedure documented
- [ ] Rollback time < 5 minutes

### Incident Response
- [ ] Incident response runbook exists
- [ ] On-call rotation configured
- [ ] Alert escalation works
- [ ] Status page ready (if applicable)

---

## 📝 Compliance & Legal

### Privacy Policy
- [ ] Privacy policy accessible in app
- [ ] Privacy policy up-to-date
- [ ] Privacy policy covers all data collection
- [ ] GDPR compliance addressed

### Data Deletion
- [ ] User can request account deletion
- [ ] Account deletion endpoint works
- [ ] All user data deleted within 30 days
- [ ] Deletion logged for audit

### Terms of Service
- [ ] Terms accessible in app
- [ ] Terms cover subscription details
- [ ] Terms cover refund policy

### App Store Compliance
- [ ] Data safety form completed (Google)
- [ ] Privacy nutrition label accurate (Apple)
- [ ] Age rating correct
- [ ] Screenshots updated
- [ ] App description accurate

---

## 🎯 Final Checks

### Pre-Launch
- [ ] All critical bugs fixed
- [ ] No known P0/P1 issues
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Legal review complete
- [ ] Marketing assets ready
- [ ] Customer support trained
- [ ] Documentation updated

### Launch Day
- [ ] Monitoring dashboards open
- [ ] On-call engineer available
- [ ] Rollback plan ready
- [ ] Customer communication prepared
- [ ] Error rate < 1%
- [ ] Response time < 500ms (p95)
- [ ] No critical alerts

### Post-Launch (24 hours)
- [ ] Monitor error rates
- [ ] Monitor user adoption
- [ ] Check user reviews
- [ ] Verify payment processing
- [ ] Check subscription reconciliation
- [ ] Review Sentry for new errors
- [ ] Verify SLO compliance

---

## Sign-Off

### QA Team
**Name**: _________________  
**Signature**: _________________  
**Date**: _________________

### Engineering Lead
**Name**: _________________  
**Signature**: _________________  
**Date**: _________________

### Product Manager
**Name**: _________________  
**Signature**: _________________  
**Date**: _________________

---

**Last Updated**: 2025-10-07  
**Version**: 1.0  
**Next Review**: Before each major release


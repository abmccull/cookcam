# Deployment Runbook

## Overview
Step-by-step procedures for deploying CookCam backend and mobile applications.

---

## Pre-Deployment Checklist

### Required Before Any Deployment
- [ ] All tests passing in CI/CD
- [ ] Code review approved
- [ ] Linter passes with no errors
- [ ] Database migrations tested on staging
- [ ] Environment variables verified
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Monitoring dashboards ready

### Production Deployment Additional Requirements
- [ ] Staging deployment successful (>24 hours stable)
- [ ] Load testing completed (if significant changes)
- [ ] Security scan passed
- [ ] Database backup verified (< 24 hours old)
- [ ] On-call engineer available
- [ ] Customer communication prepared (if downtime expected)

---

## Backend Deployment

### 1. Pre-Deployment Steps

```bash
# Step 1: Verify current production state
curl https://api.cookcam.app/health
# Expected: {"status":"healthy","uptime":XXX,"websocket":"connected"}

# Step 2: Create database backup
ssh production-server
pg_dump $DATABASE_URL > /backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql

# Step 3: Verify backup
ls -lh /backups/ | tail -1

# Step 4: Check current version
cd /var/www/cookcam/backend/api
git log -1 --oneline
pm2 show cookcam-api
```

### 2. Database Migrations (If Applicable)

```bash
# Connect to production database
cd /var/www/cookcam/backend/supabase

# Review migrations to be applied
ls -la migrations/ | grep -v "$(git ls-files migrations/ | tail -1)"

# Apply migrations
supabase db push

# Verify migrations
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "SELECT * FROM reconciliation_metrics LIMIT 1;"

# If migrations fail, rollback:
supabase db reset --db-url $DATABASE_URL --backup-file /backups/pre-deploy-*.sql
```

### 3. Application Deployment

```bash
# Method A: Git Pull (Zero-downtime)
cd /var/www/cookcam
git fetch origin
git log --oneline HEAD..origin/main  # Review changes

# Pull latest code
git pull origin main

# Install dependencies
cd backend/api
npm ci --production

# Build TypeScript
npm run build

# Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.production.js --update-env

# Method B: Blue-Green Deployment (Safer)
# 1. Start new instance on different port
PORT=3001 pm2 start ecosystem.config.production.js --name cookcam-api-new

# 2. Verify new instance
curl http://localhost:3001/health

# 3. Update Nginx to point to new instance
sudo nano /etc/nginx/conf.d/default.conf
# Change: server api:3000 → server api:3001
sudo nginx -t
sudo systemctl reload nginx

# 4. Stop old instance
pm2 delete cookcam-api

# 5. Rename new instance
pm2 restart cookcam-api-new --name cookcam-api
```

### 4. Post-Deployment Verification

```bash
# Health check
curl https://api.cookcam.app/health
# Expected: 200 OK

# Verify version deployed
curl https://api.cookcam.app/health | jq '.version'

# Check critical endpoints
curl -H "Authorization: Bearer $TEST_TOKEN" https://api.cookcam.app/api/v1/recipes
curl https://api.cookcam.app/api/v1/subscription/webhook -X POST -d '{"type":"test"}'

# Monitor error rates
pm2 logs cookcam-api --lines 50
# Watch for errors in first 5 minutes

# Check Sentry
# Visit: https://sentry.io/organizations/cookcam
# Verify no new errors after deployment timestamp
```

### 5. Rollback Procedure (If Needed)

```bash
# Quick rollback
cd /var/www/cookcam
git log --oneline -5
git checkout <previous-stable-commit>

cd backend/api
npm ci --production
npm run build
pm2 reload ecosystem.config.production.js

# Verify rollback
curl https://api.cookcam.app/health

# Rollback database migrations (if necessary)
cd /var/www/cookcam/backend/supabase
supabase db reset --db-url $DATABASE_URL --backup-file /backups/pre-deploy-*.sql
```

---

## Mobile Deployment

### 1. Pre-Deployment

```bash
# Verify staging build
eas build:list --platform all --profile staging

# Test OTA update on staging
eas update --branch staging --message "Testing OTA"

# Verify version numbers
cd mobile/CookCam
cat app.json | jq '.expo.version'
cat package.json | jq '.version'
```

### 2. OTA Update Deployment (Recommended)

```bash
# Over-the-air update (no app store submission)
cd mobile/CookCam

# Production OTA update
eas update --branch production --message "Production update $(date +%Y-%m-%d)"

# Verify update published
eas update:list --branch production

# Monitor adoption
# Check EAS dashboard: https://expo.dev/accounts/cookcam/projects/CookCam
```

### 3. Full Build Deployment (App Store Release)

```bash
# Bump version
cd mobile/CookCam
npm version patch  # or minor/major

# Update native code version
# Edit app.json:
# - "version": "1.2.3"
# - "ios.buildNumber": "increment"
# - "android.versionCode": "increment"

# Build for production
eas build --platform all --profile production

# Wait for builds to complete
eas build:list --limit 5

# Download and test builds locally
eas build:download --platform ios --latest
eas build:download --platform android --latest

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest

# Track submission status
eas submit:list --platform all
```

### 4. Post-Deployment

```bash
# Monitor crash rates
# Visit: https://sentry.io/organizations/cookcam/projects/cookcam-mobile/

# Check adoption metrics
# EAS Dashboard: https://expo.dev

# Monitor user reviews
# App Store Connect & Google Play Console

# Verify OTA update adoption
eas update:view --branch production
```

---

## Nginx Configuration Deployment

### 1. Update Configuration

```bash
# Backup current config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup

# Update config
sudo nano /etc/nginx/conf.d/default.conf

# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx

# If test fails, restore backup
sudo cp /etc/nginx/conf.d/default.conf.backup /etc/nginx/conf.d/default.conf
```

### 2. Verify

```bash
# Check Nginx status
sudo systemctl status nginx

# Test endpoints
curl -I https://api.cookcam.app
curl -I https://api.cookcam.app/api/v1/recipes

# Check logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Environment Variables Update

### 1. Update .env File

```bash
# Backup current .env
cp /var/www/cookcam/backend/api/.env /var/www/cookcam/backend/api/.env.backup

# Update .env
nano /var/www/cookcam/backend/api/.env

# Verify env validation
cd /var/www/cookcam/backend/api
node -e "require('./dist/config/env').validateEnv()"

# Reload with new environment
pm2 reload ecosystem.config.production.js --update-env
```

### 2. Verify New Variables

```bash
# Check if new variables are loaded
pm2 env cookcam-api | grep NEW_VARIABLE

# Test functionality that uses new variables
curl -H "Authorization: Bearer $TEST_TOKEN" https://api.cookcam.app/test-endpoint
```

---

## Cron Job Deployment

### 1. Deploy Reconciliation Job

```bash
# Copy cron script
cp /var/www/cookcam/backend/api/cron-reconciliation.js /var/www/cookcam/backend/api/dist/

# Test cron job manually
cd /var/www/cookcam/backend/api
node cron-reconciliation.js

# Setup PM2 cron
pm2 start cron-reconciliation.js --name reconciliation-cron --cron "0 2 * * *" --no-autorestart

# Verify cron is scheduled
pm2 list
crontab -l | grep reconciliation
```

### 2. Monitor Cron Execution

```bash
# Check reconciliation metrics
psql $DATABASE_URL -c "SELECT * FROM reconciliation_metrics ORDER BY reconciled_at DESC LIMIT 5;"

# Check PM2 logs
pm2 logs reconciliation-cron

# Verify next execution time
pm2 describe reconciliation-cron | grep cron
```

---

## Monitoring Post-Deployment

### Checklist (Monitor for 30 minutes)

```bash
# 1. Error rates in Sentry
# Target: < 1% error rate
# Visit: https://sentry.io

# 2. API response times
# Target: p95 < 500ms
curl https://api.cookcam.app/api/v1/reconciliation/health

# 3. Database performance
psql $DATABASE_URL -c "
SELECT 
  query, 
  calls, 
  mean_exec_time, 
  max_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"

# 4. Memory/CPU usage
pm2 monit

# 5. Active connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 6. Webhook processing
psql $DATABASE_URL -c "
SELECT 
  status, 
  COUNT(*) 
FROM stripe_webhook_events 
WHERE created_at > NOW() - INTERVAL '30 minutes' 
GROUP BY status;
"
```

---

## Emergency Procedures

### Complete Service Outage

```bash
# 1. Enable maintenance mode
sudo cp /var/www/cookcam/maintenance.html /usr/share/nginx/html/index.html
sudo systemctl reload nginx

# 2. Investigate and fix issue

# 3. Disable maintenance mode
sudo rm /usr/share/nginx/html/index.html
sudo systemctl reload nginx
```

### Database Emergency

```bash
# Enable read-only mode
psql $DATABASE_URL -c "ALTER DATABASE cookcam SET default_transaction_read_only = on;"

# Fix database issue

# Re-enable writes
psql $DATABASE_URL -c "ALTER DATABASE cookcam SET default_transaction_read_only = off;"
```

---

## Deployment Schedule

**Recommended Deployment Windows**:
- **Backend**: Tuesday/Wednesday, 10 AM - 2 PM PST (low traffic)
- **Mobile OTA**: Any weekday, 8 AM PST (time for adoption monitoring)
- **Database Migrations**: Tuesday, 10 AM PST (with fallback day)
- **Emergency Hotfixes**: Anytime (with on-call approval)

**Blackout Periods** (No deployments):
- Fridays after 2 PM PST
- Weekends (unless emergency)
- Major holidays
- During marketing campaigns

---

## Useful Scripts

```bash
# Quick deploy (after testing)
./scripts/deploy-production.sh

# Quick rollback
./scripts/rollback-production.sh

# Health check all services
./scripts/health-check.sh

# Database backup
./scripts/backup-database.sh
```

---

**Last Updated**: 2025-10-07  
**Owner**: DevOps Team  
**Next Review**: 2025-11-07


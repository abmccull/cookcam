# Incident Response Runbook

## Overview
This runbook provides step-by-step procedures for responding to production incidents in the CookCam system.

---

## Severity Levels

### P0 - Critical (Response: Immediate)
- Complete service outage
- Data breach or security compromise
- Payment system failure
- Database corruption

### P1 - High (Response: < 15 minutes)
- Partial service outage
- Significant performance degradation
- Authentication system issues
- Payment processing errors

### P2 - Medium (Response: < 1 hour)
- Non-critical feature failure
- Moderate performance issues
- Isolated user issues

### P3 - Low (Response: < 4 hours)
- Minor bugs
- Cosmetic issues
- Enhancement requests

---

## Incident Response Process

### 1. Detection & Alert
```
✅ Incident detected via:
   - Monitoring alerts (Sentry, health checks)
   - User reports
   - Automated tests
   - Manual discovery

→ Immediately assess severity level
```

### 2. Initial Response (< 5 minutes)
```bash
# Step 1: Acknowledge the incident
# - Update status page
# - Create incident channel (#incident-YYYYMMDD-HHmm)

# Step 2: Quick health check
curl https://api.cookcam.app/health

# Step 3: Check Sentry for errors
# Navigate to: https://sentry.io/organizations/cookcam

# Step 4: Check recent deployments
git log --oneline -5

# Step 5: Check system resources
ssh production-server
htop
df -h
pm2 status
```

### 3. Investigation (P0/P1: < 15 minutes)
```bash
# Check application logs
pm2 logs cookcam-api --lines 100

# Check error patterns in Sentry
# Look for: Error spikes, new error types, affected users

# Check database
psql $DATABASE_URL
SELECT COUNT(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 4. Mitigation

#### Option A: Rollback (Fastest)
```bash
# Rollback to previous version
cd /path/to/cookcam
git log --oneline -10
git checkout <previous-stable-commit>
npm ci
npm run build
pm2 reload ecosystem.config.production.js

# Verify health
curl https://api.cookcam.app/health
```

#### Option B: Hot Fix
```bash
# Apply emergency patch
git checkout -b hotfix/incident-YYYYMMDD
# Make minimal changes
git commit -m "Hotfix: <description>"
git push origin hotfix/incident-YYYYMMDD

# Deploy
npm run build
pm2 reload ecosystem.config.production.js
```

#### Option C: Scale Up (Performance)
```bash
# Increase PM2 instances
pm2 scale cookcam-api +2

# Or restart with more instances
pm2 delete cookcam-api
pm2 start ecosystem.config.production.js -i max
```

#### Option D: Database Recovery
```bash
# If database is corrupted/slow
# 1. Enable read-only mode
psql $DATABASE_URL -c "ALTER DATABASE cookcam SET default_transaction_read_only = on;"

# 2. Restore from backup
pg_restore --clean --if-exists -d $DATABASE_URL backup_YYYYMMDD.dump

# 3. Re-enable writes
psql $DATABASE_URL -c "ALTER DATABASE cookcam SET default_transaction_read_only = off;"
```

---

## Common Incidents

### 1. API Not Responding

**Symptoms**: Health check failing, 502/503 errors

**Investigation**:
```bash
# Check if process is running
pm2 status cookcam-api

# Check port binding
sudo netstat -tlnp | grep 3000

# Check memory/CPU
top -bn1 | head -20
```

**Resolution**:
```bash
# Restart service
pm2 restart cookcam-api

# If that fails, force restart
pm2 delete cookcam-api
pm2 start ecosystem.config.production.js

# Check logs for root cause
pm2 logs cookcam-api --lines 50
```

---

### 2. Database Connection Issues

**Symptoms**: "Too many connections", timeout errors

**Investigation**:
```bash
# Check connection count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check for long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;
"
```

**Resolution**:
```bash
# Kill long-running queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes';"

# Restart connection pool
pm2 restart cookcam-api

# If necessary, increase max connections (requires DB restart)
# ALTER SYSTEM SET max_connections = 200;
```

---

### 3. Stripe Webhook Failures

**Symptoms**: Payment processing delays, webhook errors in Sentry

**Investigation**:
```bash
# Check webhook events table
psql $DATABASE_URL -c "
SELECT status, COUNT(*) 
FROM stripe_webhook_events 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY status;
"

# Check recent failures
psql $DATABASE_URL -c "
SELECT event_type, error_message, created_at 
FROM stripe_webhook_events 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
"
```

**Resolution**:
```bash
# Retry failed webhooks
psql $DATABASE_URL -c "
UPDATE stripe_webhook_events 
SET status = 'received' 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 hour';
"

# Restart API to reprocess
pm2 restart cookcam-api

# If Stripe webhook secret is invalid
# Update in .env and restart
```

---

### 4. Memory Leak

**Symptoms**: Increasing memory usage, eventual OOM crashes

**Investigation**:
```bash
# Monitor memory over time
watch -n 5 'pm2 list'

# Check for memory patterns in Sentry
# Look for: Slow performance, timeouts before crashes

# Generate heap snapshot
pm2 trigger cookcam-api heapdump
```

**Resolution**:
```bash
# Short-term: Restart
pm2 restart cookcam-api

# Medium-term: Increase memory limit
pm2 delete cookcam-api
pm2 start ecosystem.config.production.js --max-memory-restart 1G

# Long-term: Fix memory leak
# Review recent code changes
# Use heap profiler to identify leak
```

---

### 5. Rate Limit Triggered

**Symptoms**: 429 errors, legitimate users blocked

**Investigation**:
```bash
# Check Nginx rate limit logs
sudo grep "limiting requests" /var/log/nginx/error.log | tail -20

# Identify IP patterns
sudo awk '/limiting requests/ {print $NF}' /var/log/nginx/error.log | sort | uniq -c | sort -rn | head -10
```

**Resolution**:
```bash
# If legitimate traffic spike:
# 1. Temporarily increase rate limits
sudo nano /etc/nginx/nginx.conf
# Change: limit_req zone=api_limit:10m rate=20r/s;
sudo nginx -t
sudo systemctl reload nginx

# 2. Whitelist specific IPs if needed
# Add to Nginx config:
# geo $limit {
#   default         1;
#   10.0.0.0/8      0;  # Whitelist internal network
# }

# If DDoS attack:
# Enable Cloudflare "I'm Under Attack" mode
# Or use fail2ban to block IPs
```

---

## Post-Incident

### 1. Resolution Confirmation
```bash
# Verify all systems operational
curl https://api.cookcam.app/health
curl https://api.cookcam.app/api/v1/reconciliation/health

# Check error rates in Sentry
# Should return to baseline within 15 minutes

# Monitor for 1 hour to ensure stability
```

### 2. Communication
```
✅ Update status page: "Issue resolved"
✅ Post-mortem to team channel
✅ Customer notification (if user-facing)
✅ Document in incident log
```

### 3. Post-Mortem (Within 48 hours)
```
Create document with:
1. Timeline of events
2. Root cause analysis
3. Impact assessment (users, revenue, downtime)
4. What went well
5. What went poorly
6. Action items (with owners and deadlines)
```

---

## Escalation

### Level 1: On-Call Engineer
- Initial response
- Standard runbook procedures
- Escalate if not resolved in 30 minutes (P0/P1)

### Level 2: Senior Engineer
- Complex technical issues
- Architecture decisions
- Database operations

### Level 3: CTO/Engineering Manager
- Major incidents (P0)
- External communication decisions
- Business impact assessment

---

## Contact Information

**On-Call Rotation**: See PagerDuty schedule

**Emergency Contacts**:
- On-Call Engineer: [PagerDuty]
- Engineering Manager: [Phone]
- CTO: [Phone]
- DevOps Lead: [Phone]

**External Vendors**:
- Supabase Support: support@supabase.com
- Stripe Support: 1-888-926-2289
- Digital Ocean Support: [Portal]

---

## Useful Commands

```bash
# Quick health check
curl -I https://api.cookcam.app/health

# Check all services
pm2 status

# View logs
pm2 logs cookcam-api --lines 100

# Database query
psql $DATABASE_URL -c "SELECT version();"

# Disk space
df -h

# Memory usage
free -h

# Active connections
netstat -an | grep ESTABLISHED | wc -l

# Restart everything
pm2 restart all

# Reload Nginx
sudo systemctl reload nginx
```

---

**Last Updated**: 2025-10-07  
**Next Review**: 2025-11-07


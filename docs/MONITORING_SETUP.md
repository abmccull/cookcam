# Monitoring & Alerting Setup Guide

## Overview
Complete guide for setting up production monitoring, alerting, and observability for CookCam.

---

## 1. Sentry Setup

### Backend Configuration

Already implemented in `backend/api/src/index.ts`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  beforeSend: (event) => {
    // Custom error fingerprinting
    // PII scrubbing
    return event;
  },
});
```

### Mobile Configuration

Update `mobile/CookCam/App.tsx`:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  environment: __DEV__ ? 'development' : 'production',
  enableInExpoDevelopment: false,
  debug: __DEV__,
  tracesSampleRate: 0.1,
  beforeSend: (event) => {
    // Scrub PII
    return event;
  },
});
```

### Alert Rules in Sentry

Create these alert rules:

1. **High Error Rate**
   - Condition: Error count > 50 in 1 hour
   - Action: Email + Slack
   - Severity: High

2. **New Error Type**
   - Condition: New unique error appears
   - Action: Slack
   - Severity: Medium

3. **Payment Error Spike**
   - Condition: Errors containing "stripe" or "payment" > 10 in 15 min
   - Action: PagerDuty + Slack
   - Severity: Critical

4. **Database Error**
   - Condition: Errors containing "database" or "postgres" > 5 in 5 min
   - Action: PagerDuty
   - Severity: Critical

---

## 2. Health Check Monitoring

### UptimeRobot Setup

1. Sign up at https://uptimerobot.com
2. Add monitors:

**API Health Check**
- URL: `https://api.cookcam.app/health`
- Type: HTTP(s)
- Interval: 5 minutes
- Alert: Email + SMS
- Expected: 200 status, "healthy" in response

**Website**
- URL: `https://cookcam.app`
- Type: HTTP(s)
- Interval: 5 minutes

**WebSocket**
- URL: `wss://api.cookcam.app/socket.io/`
- Type: Port monitoring
- Port: 443
- Interval: 5 minutes

### Alternative: Pingdom or DataDog

For more advanced monitoring, consider:
- Pingdom: https://www.pingdom.com
- DataDog: https://www.datadoghq.com

---

## 3. Database Monitoring

### Supabase Dashboard

Access at: https://app.supabase.com

Monitor:
- Active connections
- Query performance
- Disk usage
- Memory usage
- Replication lag

### Custom Monitoring Queries

Add these to a cron job (every 5 minutes):

```sql
-- Active connections
SELECT 
  COUNT(*) as active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
  ROUND((COUNT(*)::float / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')) * 100, 2) as usage_percentage
FROM pg_stat_activity;

-- Slow queries
SELECT 
  query,
  calls,
  mean_exec_time as avg_ms,
  max_exec_time as max_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
  schemaname || '.' || tablename as table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Deadlocks
SELECT 
  COUNT(*) as deadlock_count
FROM pg_stat_database
WHERE datname = 'postgres' AND deadlocks > 0;
```

Alert if:
- Active connections > 80%
- Slow queries > 10
- Deadlocks > 0

---

## 4. Application Performance Monitoring

### PM2 Monitoring

```bash
# Install PM2+
pm2 plus

# Link to web dashboard
pm2 link <secret_key> <public_key>
```

Access dashboard at: https://app.pm2.io

Alerts to configure:
- CPU > 80% for 5 minutes
- Memory > 80% for 5 minutes
- Process restarts > 3 in 1 hour
- Event loop lag > 100ms

### Custom Metrics Endpoint

Create `/api/v1/metrics` endpoint:

```typescript
router.get('/metrics', async (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    activeConnections: await getActiveConnections(),
    requestRate: await getRequestRate(),
    errorRate: await getErrorRate(),
  };
  res.json(metrics);
});
```

---

## 5. Log Aggregation

### Option A: Papertrail (Recommended for simplicity)

1. Sign up at https://papertrailapp.com
2. Add destination for syslog
3. Configure PM2:

```json
// ecosystem.config.production.js
{
  "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
  "error_file": "/var/log/cookcam/error.log",
  "out_file": "/var/log/cookcam/out.log",
}
```

4. Forward logs to Papertrail:

```bash
# Add to /etc/rsyslog.d/99-papertrail.conf
*.* @logs.papertrailapp.com:XXXXX
```

### Option B: ELK Stack (More complex but powerful)

If you need advanced log analysis:
1. Set up Elasticsearch
2. Set up Logstash for log ingestion
3. Set up Kibana for visualization

---

## 6. Custom Dashboards

### Grafana Setup (Optional but Recommended)

1. Install Grafana:
```bash
sudo apt-get install -y grafana
sudo systemctl start grafana-server
```

2. Add Prometheus data source
3. Import dashboard templates
4. Create custom panels:
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Database connections
   - Subscription metrics

### Simple Status Page

Create `backend/api/src/routes/status.ts`:

```typescript
router.get('/status', async (req, res) => {
  const status = {
    api: 'operational',
    database: await checkDatabase(),
    websocket: await checkWebSocket(),
    stripe: await checkStripe(),
    lastUpdated: new Date(),
  };
  
  res.json(status);
});
```

Public status page at: `https://cookcam.app/status`

---

## 7. Synthetic Monitoring

### Create Test Scripts

```bash
#!/bin/bash
# synthetic-test.sh

# Test authentication
token=$(curl -s -X POST https://api.cookcam.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' \
  | jq -r '.token')

if [ "$token" = "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi

# Test recipe fetch
recipes=$(curl -s https://api.cookcam.app/api/v1/recipes \
  -H "Authorization: Bearer $token")

if [ "$(echo $recipes | jq '. | length')" -lt 1 ]; then
  echo "❌ Recipe fetch failed"
  exit 1
fi

echo "✅ All synthetic tests passed"
```

Run via cron every 15 minutes.

---

## 8. Mobile App Monitoring

### Crash Reporting

Already configured via Sentry.

Additional metrics to track:
- App launch time
- Screen render time
- Network request success rate
- Memory usage

### Analytics

Consider adding:
- Firebase Analytics
- Mixpanel
- Amplitude

Track:
- User retention
- Feature usage
- Conversion rates
- User journeys

---

## 9. Alert Escalation

### PagerDuty Setup

1. Create services:
   - Backend API
   - Database
   - Mobile App
   - Payments

2. Configure escalation policies:
   - Level 1: On-call engineer (immediate)
   - Level 2: Senior engineer (after 15 min)
   - Level 3: Engineering manager (after 30 min)

3. Integration with Sentry:
   - Connect Sentry to PagerDuty
   - Map severity levels

### Slack Integration

Create channels:
- `#alerts-critical` - P0/P1 alerts only
- `#alerts-warnings` - All warnings
- `#deployments` - Deployment notifications
- `#monitoring` - All monitoring data

Configure webhooks:
```bash
# Sentry → Slack
# UptimeRobot → Slack
# PagerDuty → Slack
```

---

## 10. Monitoring Checklist

### Daily Checks (Automated)
- [ ] API health check (every 5 min)
- [ ] Database connection count
- [ ] Error rate < 1%
- [ ] Response time < 500ms (p95)
- [ ] Disk space > 20% free
- [ ] Backup completed successfully

### Weekly Reviews
- [ ] Review Sentry error trends
- [ ] Check slow query log
- [ ] Review user growth metrics
- [ ] Check payment success rate
- [ ] Review mobile crash rate
- [ ] Update monitoring thresholds if needed

### Monthly Reviews
- [ ] Review and tune alert rules
- [ ] Capacity planning
- [ ] Cost analysis
- [ ] SLO compliance check
- [ ] Update runbooks
- [ ] Test incident response

---

## 11. Cost Optimization

### Sentry
- Free tier: 5,000 events/month
- Growth: $26/month for 50,000 events
- **Recommendation**: Start with free tier, upgrade when needed

### UptimeRobot
- Free tier: 50 monitors, 5-min intervals
- **Recommendation**: Free tier sufficient

### PM2 Plus
- Free tier: 1 server
- **Recommendation**: Free tier for now

### Papertrail
- Free tier: 50 MB/month
- Paid: $7/month for 1 GB
- **Recommendation**: Start with free tier

**Estimated Monthly Cost**: $0-50 depending on usage

---

## 12. Quick Reference

### Important URLs
- Sentry: https://sentry.io/organizations/cookcam
- Supabase: https://app.supabase.com
- UptimeRobot: https://uptimerobot.com
- PM2 Plus: https://app.pm2.io
- Papertrail: https://papertrailapp.com

### Quick Health Check
```bash
curl https://api.cookcam.app/health
```

### View Logs
```bash
pm2 logs cookcam-api --lines 100
```

### Database Status
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

---

**Last Updated**: 2025-10-07  
**Owner**: DevOps/Platform Team  
**Next Review**: 2025-11-07


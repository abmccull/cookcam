# Service Level Objectives (SLOs)

## Overview
This document defines the Service Level Objectives (SLOs) for CookCam's production systems. SLOs represent our commitment to reliability and performance.

---

## Core SLOs

### 1. API Availability
**Objective**: 99.9% uptime  
**Measurement Period**: Rolling 30 days  
**Error Budget**: 43.2 minutes/month

**Definition**: Percentage of successful health check requests
```
Availability = (Successful Requests / Total Requests) × 100
```

**Monitoring**:
- Health endpoint: `/health`
- Check frequency: Every 60 seconds
- Success criteria: HTTP 200, response < 5s

**Alert Thresholds**:
- Warning: < 99.95% (21.6 min remaining)
- Critical: < 99.9% (error budget exhausted)

**Current Status**:
```bash
# Check current uptime
curl https://api.cookcam.app/health | jq '.uptime'

# Calculate availability
psql $DATABASE_URL -c "
SELECT 
  (COUNT(*) FILTER (WHERE status_code = 200)::float / COUNT(*) * 100) as availability_percentage
FROM health_check_logs
WHERE checked_at > NOW() - INTERVAL '30 days';
"
```

---

### 2. API Latency
**Objectives**:
- **p50**: < 200ms
- **p95**: < 500ms  
- **p99**: < 1000ms

**Measurement**: Response time from request received to response sent

**Monitoring**:
- Track via Sentry performance monitoring
- Custom middleware logging
- Nginx access logs

**Alert Thresholds**:
- Warning: p95 > 500ms for 5 minutes
- Critical: p95 > 1000ms for 5 minutes

**Query Example**:
```bash
# From Nginx logs
awk '{print $NF}' /var/log/nginx/access.log | \
  sort -n | \
  awk '{a[NR]=$1} END {
    print "p50:", a[int(NR*0.50)]
    print "p95:", a[int(NR*0.95)]
    print "p99:", a[int(NR*0.99)]
  }'
```

---

### 3. Error Rate
**Objective**: < 1% of requests result in 5xx errors  
**Measurement Period**: Rolling 24 hours

**Definition**:
```
Error Rate = (5xx Responses / Total Requests) × 100
```

**Monitoring**:
- Sentry error tracking
- Nginx error logs
- Application logs

**Alert Thresholds**:
- Warning: > 0.5% error rate
- Critical: > 1% error rate

**Query**:
```bash
# Check current error rate
psql $DATABASE_URL -c "
SELECT 
  (COUNT(*) FILTER (WHERE status_code >= 500)::float / COUNT(*) * 100) as error_rate_percentage
FROM request_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
"
```

---

### 4. Database Performance
**Objectives**:
- Query p95 latency: < 100ms
- Connection pool saturation: < 80%
- No long-running queries (> 5 minutes)

**Monitoring**:
```sql
-- Average query time
SELECT 
  query,
  calls,
  mean_exec_time as avg_ms,
  max_exec_time as max_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Connection count
SELECT COUNT(*) as active_connections,
       (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
FROM pg_stat_activity;
```

**Alert Thresholds**:
- Warning: p95 > 100ms
- Critical: p95 > 500ms or connections > 80%

---

### 5. Payment Processing Success Rate
**Objective**: > 99.5% successful payment validations  
**Measurement Period**: Rolling 7 days

**Definition**:
```
Success Rate = (Successful Validations / Total Validations) × 100
```

**Monitoring**:
```sql
-- Webhook success rate
SELECT 
  (COUNT(*) FILTER (WHERE status = 'processed')::float / COUNT(*) * 100) as success_rate
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days';

-- IAP validation success rate
SELECT 
  (COUNT(*) FILTER (WHERE status = 'valid')::float / COUNT(*) * 100) as success_rate
FROM iap_validation_history
WHERE validated_at > NOW() - INTERVAL '7 days';
```

**Alert Thresholds**:
- Warning: < 99.8%
- Critical: < 99.5%

---

### 6. Data Consistency
**Objective**: < 5% drift in subscription reconciliation  
**Measurement**: Daily reconciliation job

**Monitoring**:
```sql
-- Check drift rate from last reconciliation
SELECT 
  total_checked,
  drift_detected,
  (drift_detected::float / NULLIF(total_checked, 0) * 100) as drift_percentage,
  reconciled_at
FROM reconciliation_metrics
ORDER BY reconciled_at DESC
LIMIT 1;
```

**Alert Thresholds**:
- Warning: > 5% drift
- Critical: > 10% drift or reconciliation job failed

---

## Supporting SLIs (Service Level Indicators)

### WebSocket Connectivity
**Target**: 99% successful connections  
**Measurement**: Connection success rate

```bash
# Monitor active WebSocket connections
pm2 logs cookcam-api | grep "WebSocket" | tail -20
```

### Cache Hit Rate
**Target**: > 80% cache hits (if caching implemented)  
**Measurement**: Redis/memory cache statistics

### Deployment Frequency
**Target**: At least weekly releases  
**Measurement**: Git commits to main branch

### Deployment Success Rate
**Target**: > 95% successful deployments  
**Measurement**: CI/CD pipeline statistics

### Time to Recovery
**Target**: < 1 hour for P1 incidents  
**Measurement**: Incident response time tracking

---

## Error Budget Policy

### When Error Budget is Exhausted
1. **Freeze deployments** (except critical security fixes)
2. Focus on reliability improvements
3. Post-mortem on budget burn
4. Identify and fix root causes

### When Error Budget is Healthy (> 50% remaining)
1. Continue normal deployment cadence
2. Invest in feature development
3. Perform controlled experiments

### Error Budget Calculation
```
Error Budget = (1 - SLO) × Total Requests
Example: (1 - 0.999) × 1,000,000 = 1,000 failed requests allowed
```

---

## SLO Review Process

### Weekly Reviews
- Check SLO compliance
- Review error budget consumption
- Identify trends
- Update dashboards

### Monthly Reviews
- Comprehensive SLO assessment
- Adjust thresholds if needed
- Document lessons learned
- Plan reliability improvements

### Quarterly Reviews
- Major SLO revision (if needed)
- Business impact assessment
- Cost vs. reliability trade-offs
- Long-term capacity planning

---

## Monitoring Dashboards

### Primary Dashboard URL
https://grafana.cookcam.app/dashboard/slo-overview
(Or Sentry/Datadog equivalent)

### Key Metrics to Display
1. **Real-time Status**
   - Current availability
   - Error rate (last hour)
   - p95 latency
   - Active incidents

2. **30-Day Trends**
   - Availability trend
   - Error budget consumption
   - Latency percentiles
   - Deployment frequency

3. **SLO Compliance**
   - Green: Within SLO
   - Yellow: Warning threshold
   - Red: SLO violated

---

## Alerting Strategy

### Alert Fatigue Prevention
- Use progressive severity (warning → critical)
- Implement alert grouping
- Set intelligent thresholds
- Regular alert review and tuning

### Alert Channels
- **Critical**: PagerDuty + SMS + Slack
- **Warning**: Slack only
- **Info**: Dashboard only

### Alert Examples
```yaml
# Example Prometheus/Alertmanager rules
groups:
  - name: slo_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above SLO threshold"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency above target"
```

---

## Capacity Planning

### Growth Projections
- Expected request growth: 20% per quarter
- Database size growth: 10GB per month
- Connection pool scaling: Plan for 2x peak

### Scaling Thresholds
- **CPU**: Scale at 70% utilization
- **Memory**: Scale at 80% utilization
- **Database**: Scale at 80% connection pool
- **Storage**: Alert at 70% capacity

---

## Appendix: Useful Queries

### SLO Health Check Script
```bash
#!/bin/bash
# slo-check.sh - Quick SLO health check

echo "=== CookCam SLO Health Check ==="
echo ""

# 1. Availability
echo "1. API Availability (target: 99.9%)"
curl -s https://api.cookcam.app/health && echo "✅ API is up" || echo "❌ API is down"

# 2. Error Rate
echo ""
echo "2. Error Rate (target: < 1%)"
# Query from monitoring system

# 3. Latency
echo ""
echo "3. Response Time (target: p95 < 500ms)"
time curl -s https://api.cookcam.app/health > /dev/null

# 4. Database
echo ""
echo "4. Database Health"
psql $DATABASE_URL -c "SELECT COUNT(*) as active_queries FROM pg_stat_activity WHERE state = 'active';"

echo ""
echo "=== Check complete ==="
```

---

**Last Updated**: 2025-10-07  
**Owner**: Platform Team  
**Review Frequency**: Monthly  
**Next Review**: 2025-11-07


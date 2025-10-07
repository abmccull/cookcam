-- Migration: Create Reconciliation Metrics Table
-- Purpose: Track subscription reconciliation job performance and drift detection
-- Date: 2025-10-07

-- Create reconciliation_metrics table
CREATE TABLE IF NOT EXISTS public.reconciliation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_checked INTEGER NOT NULL DEFAULT 0,
    expired_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    drift_detected INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for time-based queries
CREATE INDEX idx_reconciliation_metrics_reconciled_at 
ON public.reconciliation_metrics(reconciled_at DESC);

-- Enable Row Level Security (view-only for authenticated users, full access for service role)
ALTER TABLE public.reconciliation_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert metrics
CREATE POLICY "Service role can insert reconciliation metrics"
ON public.reconciliation_metrics
FOR INSERT
WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can view all metrics
CREATE POLICY "Service role can view all reconciliation metrics"
ON public.reconciliation_metrics
FOR SELECT
USING (
    auth.jwt()->>'role' = 'service_role'
);

-- Policy: Admins can view metrics (if admin role system exists)
-- Uncomment when admin role system is implemented
-- CREATE POLICY "Admins can view reconciliation metrics"
-- ON public.reconciliation_metrics
-- FOR SELECT
-- USING (
--     EXISTS (
--         SELECT 1 FROM profiles 
--         WHERE profiles.id = auth.uid() 
--         AND profiles.role = 'admin'
--     )
-- );

-- Create view for reconciliation health monitoring
CREATE OR REPLACE VIEW public.reconciliation_health_view AS
SELECT 
    DATE_TRUNC('day', reconciled_at) as date,
    COUNT(*) as runs_per_day,
    AVG(total_checked) as avg_subscriptions_checked,
    AVG(drift_detected) as avg_drift_detected,
    AVG(errors_count) as avg_errors,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    SUM(CASE WHEN errors_count > 0 THEN 1 ELSE 0 END) as runs_with_errors,
    ROUND(AVG(CASE 
        WHEN total_checked > 0 
        THEN (drift_detected::float / total_checked) * 100 
        ELSE 0 
    END)::numeric, 2) as drift_rate_percentage
FROM public.reconciliation_metrics
WHERE reconciled_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', reconciled_at)
ORDER BY date DESC;

-- Create view for alert thresholds
CREATE OR REPLACE VIEW public.reconciliation_alerts_view AS
SELECT 
    id,
    reconciled_at,
    total_checked,
    drift_detected,
    errors_count,
    duration_ms,
    CASE 
        WHEN total_checked > 0 AND (errors_count::float / total_checked) > 0.1 
        THEN 'HIGH_ERROR_RATE'
        WHEN total_checked > 0 AND (drift_detected::float / total_checked) > 0.05 
        THEN 'HIGH_DRIFT_RATE'
        WHEN duration_ms > 300000 
        THEN 'SLOW_EXECUTION'
        ELSE 'NORMAL'
    END as alert_level,
    ROUND(((errors_count::float / NULLIF(total_checked, 0)) * 100)::numeric, 2) as error_rate_percentage,
    ROUND(((drift_detected::float / NULLIF(total_checked, 0)) * 100)::numeric, 2) as drift_rate_percentage
FROM public.reconciliation_metrics
WHERE reconciled_at > NOW() - INTERVAL '7 days'
    AND (
        (total_checked > 0 AND (errors_count::float / total_checked) > 0.1) -- >10% error rate
        OR (total_checked > 0 AND (drift_detected::float / total_checked) > 0.05) -- >5% drift
        OR duration_ms > 300000 -- >5 minutes
    )
ORDER BY reconciled_at DESC;

-- Add comments
COMMENT ON TABLE public.reconciliation_metrics IS 
'Tracks performance and results of subscription reconciliation jobs for monitoring and alerting.';

COMMENT ON VIEW public.reconciliation_health_view IS 
'Daily summary of reconciliation job health metrics for dashboard visualization.';

COMMENT ON VIEW public.reconciliation_alerts_view IS 
'Identifies reconciliation runs that exceeded alert thresholds (error rate, drift rate, duration).';

-- Create function to clean up old metrics (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_reconciliation_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.reconciliation_metrics
    WHERE reconciled_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up reconciliation metrics older than 90 days';
END;
$$;

-- Schedule cleanup (if pg_cron is available, otherwise run manually)
-- SELECT cron.schedule('cleanup-reconciliation-metrics', '0 2 * * 0', 'SELECT cleanup_old_reconciliation_metrics()');

COMMENT ON FUNCTION cleanup_old_reconciliation_metrics() IS 
'Removes reconciliation metrics older than 90 days to prevent table bloat. Run weekly via cron.';


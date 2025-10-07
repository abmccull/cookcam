-- Migration: Create IAP Validation History Table
-- Purpose: Store all IAP receipt validations for audit, fraud detection, and deduplication
-- Date: 2025-10-07

-- Create iap_validation_history table
CREATE TABLE IF NOT EXISTS public.iap_validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    product_id TEXT NOT NULL,
    receipt_hash TEXT NOT NULL, -- SHA256 hash for deduplication
    transaction_id TEXT, -- Apple: original_transaction_id, Google: orderId
    status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'pending', 'error')),
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    raw_receipt TEXT, -- Encrypted receipt data for forensics
    validation_response JSONB, -- Full response from Apple/Google
    validation_duration_ms INTEGER, -- Performance monitoring
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_iap_validation_user_id ON public.iap_validation_history(user_id);
CREATE INDEX idx_iap_validation_transaction_id ON public.iap_validation_history(transaction_id);
CREATE INDEX idx_iap_validation_receipt_hash ON public.iap_validation_history(receipt_hash);
CREATE INDEX idx_iap_validation_platform_status ON public.iap_validation_history(platform, status);
CREATE INDEX idx_iap_validation_validated_at ON public.iap_validation_history(validated_at DESC);

-- Unique constraint to prevent duplicate validations
CREATE UNIQUE INDEX idx_iap_validation_unique_receipt 
ON public.iap_validation_history(receipt_hash, platform);

-- Enable Row Level Security
ALTER TABLE public.iap_validation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own validation history
CREATE POLICY "Users can view own validation history"
ON public.iap_validation_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert validation records (backend only)
CREATE POLICY "Service role can insert validation records"
ON public.iap_validation_history
FOR INSERT
WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can view all validation records (admin/support)
CREATE POLICY "Service role can view all validation records"
ON public.iap_validation_history
FOR SELECT
USING (
    auth.jwt()->>'role' = 'service_role'
);

-- Create updated_at trigger
CREATE TRIGGER set_iap_validation_history_updated_at
BEFORE UPDATE ON public.iap_validation_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create view for fraud detection (service role only)
CREATE OR REPLACE VIEW public.iap_fraud_detection_view AS
SELECT 
    user_id,
    platform,
    product_id,
    COUNT(*) AS validation_attempts,
    COUNT(DISTINCT transaction_id) AS unique_transactions,
    COUNT(CASE WHEN status = 'invalid' THEN 1 END) AS invalid_attempts,
    COUNT(CASE WHEN environment = 'sandbox' THEN 1 END) AS sandbox_attempts,
    MIN(validated_at) AS first_attempt,
    MAX(validated_at) AS last_attempt,
    AVG(validation_duration_ms) AS avg_duration_ms
FROM public.iap_validation_history
WHERE validated_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, platform, product_id
HAVING 
    COUNT(*) > 5 -- More than 5 attempts
    OR COUNT(CASE WHEN status = 'invalid' THEN 1 END) > 3 -- More than 3 invalid attempts
    OR COUNT(CASE WHEN environment = 'sandbox' THEN 1 END) > 1; -- Multiple sandbox attempts in prod

-- Add comment
COMMENT ON TABLE public.iap_validation_history IS 
'Audit log for all IAP receipt validations. Used for deduplication, fraud detection, and compliance.';

COMMENT ON VIEW public.iap_fraud_detection_view IS 
'Identifies suspicious IAP validation patterns that may indicate fraud or abuse.';


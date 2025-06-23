-- Migration: Create IAP-specific tables for receipt validation and purchase tracking
-- Created: 2025-01-23
-- Purpose: Add missing tables for robust IAP receipt validation system

BEGIN;

-- Table for storing receipt validation logs
CREATE TABLE IF NOT EXISTS receipt_validation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    product_id text NOT NULL,
    validation_attempt_id uuid DEFAULT gen_random_uuid(),
    
    -- Request data
    receipt_data text, -- iOS receipt or Android purchase token
    request_payload jsonb NOT NULL,
    
    -- Response data
    validation_success boolean NOT NULL,
    validation_response jsonb,
    error_code text,
    error_message text,
    
    -- Apple/Google API response
    apple_status_code integer, -- Apple App Store status codes
    google_response_code integer, -- Google Play API response codes
    
    -- Timing
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Table for tracking purchase attempts (both successful and failed)
CREATE TABLE IF NOT EXISTS purchase_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Purchase details
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    product_id text NOT NULL,
    
    -- Platform-specific identifiers
    transaction_id text, -- iOS transaction ID
    purchase_token text, -- Android purchase token
    order_id text, -- Google Play order ID
    
    -- Purchase state
    status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    failure_reason text,
    
    -- Validation tracking
    receipt_validated boolean DEFAULT false,
    validation_log_id uuid REFERENCES receipt_validation_logs(id),
    
    -- Financial data
    price_amount_micros bigint, -- Price in micros (Android format)
    currency_code text,
    
    -- Timing
    purchase_initiated_at timestamp with time zone DEFAULT now(),
    purchase_completed_at timestamp with time zone,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    
    -- Event details
    event_type text NOT NULL CHECK (event_type IN (
        'purchased', 'renewed', 'cancelled', 'expired', 'refunded', 
        'billing_retry', 'billing_recovered', 'deferred', 'paused', 'resumed'
    )),
    event_source text NOT NULL CHECK (event_source IN ('app_store', 'google_play', 'manual', 'webhook')),
    
    -- Platform-specific data
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    notification_type text, -- Webhook notification type
    notification_data jsonb, -- Full webhook payload
    
    -- Financial impact
    amount_change_micros bigint DEFAULT 0, -- Change in subscription value
    currency_code text,
    
    -- Timing
    effective_date timestamp with time zone, -- When the event takes effect
    expiry_date timestamp with time zone, -- New expiry date (if applicable)
    created_at timestamp with time zone DEFAULT now()
);

-- Table for storing raw platform receipts (encrypted for audit purposes)
CREATE TABLE IF NOT EXISTS receipt_storage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purchase_attempt_id uuid REFERENCES purchase_attempts(id) ON DELETE CASCADE,
    
    -- Receipt identification
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    receipt_hash text NOT NULL, -- Hash of receipt for deduplication
    
    -- Receipt data (consider encryption in production)
    receipt_data_encrypted text, -- Base64 encoded receipt (iOS) or purchase token (Android)
    validation_response_encrypted text, -- Apple/Google validation response
    
    -- Metadata
    receipt_size_bytes integer,
    storage_format text DEFAULT 'base64',
    
    -- Retention policy
    expires_at timestamp with time zone DEFAULT (now() + interval '7 years'), -- Legal retention period
    archived boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT now()
);

-- Table for IAP webhook logs (Apple/Google server notifications)
CREATE TABLE IF NOT EXISTS iap_webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Webhook identification
    platform text NOT NULL CHECK (platform IN ('ios', 'google_play')),
    webhook_type text NOT NULL,
    notification_id text, -- Platform-specific notification ID
    
    -- Request details
    headers jsonb, -- HTTP headers from webhook
    payload jsonb NOT NULL, -- Full webhook payload
    signature text, -- Webhook signature for verification
    
    -- Processing status
    processed boolean DEFAULT false,
    processing_error text,
    retry_count integer DEFAULT 0,
    
    -- Related entities
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Timing
    received_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipt_validation_logs_user_id ON receipt_validation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_validation_logs_platform_product ON receipt_validation_logs(platform, product_id);
CREATE INDEX IF NOT EXISTS idx_receipt_validation_logs_created_at ON receipt_validation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_purchase_attempts_user_id ON purchase_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_status ON purchase_attempts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_platform_product ON purchase_attempts(platform, product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_purchase_token ON purchase_attempts(purchase_token);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_effective_date ON subscription_events(effective_date);

CREATE INDEX IF NOT EXISTS idx_receipt_storage_user_id ON receipt_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_storage_hash ON receipt_storage(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_receipt_storage_expires_at ON receipt_storage(expires_at);

CREATE INDEX IF NOT EXISTS idx_iap_webhook_logs_platform ON iap_webhook_logs(platform);
CREATE INDEX IF NOT EXISTS idx_iap_webhook_logs_processed ON iap_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_iap_webhook_logs_received_at ON iap_webhook_logs(received_at);

-- Row Level Security (RLS) policies
ALTER TABLE receipt_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE iap_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own data
CREATE POLICY "Users can view their own receipt validation logs" ON receipt_validation_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own purchase attempts" ON purchase_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscription events" ON subscription_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own receipt storage" ON receipt_storage
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook logs are admin-only (no user RLS policy)
-- IAP webhook logs should only be accessible to service role

-- Functions for cleanup and maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_receipts()
RETURNS void AS $$
BEGIN
    -- Archive expired receipt storage
    UPDATE receipt_storage 
    SET archived = true 
    WHERE expires_at < now() AND archived = false;
    
    -- Clean up old validation logs (keep 90 days)
    DELETE FROM receipt_validation_logs 
    WHERE created_at < now() - interval '90 days';
    
    -- Clean up old webhook logs (keep 30 days if processed)
    DELETE FROM iap_webhook_logs 
    WHERE processed = true AND received_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_attempts_updated_at
    BEFORE UPDATE ON purchase_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT; 
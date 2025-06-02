-- Critical missing database tables for CookCam production deployment
-- Run this script in your Supabase SQL editor

-- Email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB
);

-- System metrics table for monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  cpu_usage INTEGER,
  memory_usage INTEGER,
  database_latency INTEGER,
  api_response_time INTEGER,
  error_rate DECIMAL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- API metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  avg_response_time INTEGER,
  p95_response_time INTEGER,
  error_rate DECIMAL,
  request_count INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Device tokens for push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Notification logs for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_token_id UUID REFERENCES device_tokens(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

-- Analytics events for user behavior tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  device_info JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Slow queries tracking for performance optimization
CREATE TABLE IF NOT EXISTS slow_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  execution_time INTEGER NOT NULL,
  table_name TEXT,
  endpoint TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback and support tickets
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'complaint', 'praise', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs for application error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  endpoint TEXT,
  user_agent TEXT,
  ip_address INET,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'critical')),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags for A/B testing and gradual rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_criteria JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feature flag assignments
CREATE TABLE IF NOT EXISTS user_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_flag_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(active);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_slow_queries_execution_time ON slow_queries(execution_time);
CREATE INDEX IF NOT EXISTS idx_slow_queries_timestamp ON slow_queries(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_user_id ON user_feature_flags(user_id);

-- Enable Row Level Security on new tables
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Email logs - Only system can access
CREATE POLICY "System only access" ON email_logs FOR ALL USING (false);

-- System metrics - Only system can access
CREATE POLICY "System only access" ON system_metrics FOR ALL USING (false);

-- API metrics - Only system can access
CREATE POLICY "System only access" ON api_metrics FOR ALL USING (false);

-- Device tokens - Users can only access their own
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
FOR ALL USING (auth.uid() = user_id);

-- Notification logs - Users can only read their own
CREATE POLICY "Users can view their own notifications" ON notification_logs
FOR SELECT USING (auth.uid() = user_id);

-- Analytics events - Users can only access their own
CREATE POLICY "Users can access their own analytics" ON analytics_events
FOR ALL USING (auth.uid() = user_id);

-- Slow queries - Only system can access
CREATE POLICY "System only access" ON slow_queries FOR ALL USING (false);

-- User feedback - Users can manage their own feedback
CREATE POLICY "Users can manage their own feedback" ON user_feedback
FOR ALL USING (auth.uid() = user_id);

-- Error logs - Only system can insert, users can't access
CREATE POLICY "System only access" ON error_logs FOR ALL USING (false);

-- Feature flags - Anyone can read enabled flags
CREATE POLICY "Anyone can read enabled feature flags" ON feature_flags
FOR SELECT USING (enabled = true);

-- User feature flags - Users can only access their own
CREATE POLICY "Users can access their own feature flags" ON user_feature_flags
FOR SELECT USING (auth.uid() = user_id);

-- Insert some default feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage) VALUES
('push_notifications', 'Enable push notifications', true, 100),
('premium_features', 'Enable premium subscription features', true, 100),
('ai_recipe_generation', 'Enable AI-powered recipe generation', true, 100),
('social_features', 'Enable social features like sharing', true, 50),
('offline_mode', 'Enable offline functionality', false, 0),
('beta_features', 'Enable beta features for testing', false, 10)
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'All missing database tables created successfully!' as status; 
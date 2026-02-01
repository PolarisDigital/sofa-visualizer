-- Usage Tracking - Database Migration
-- Run this in Supabase SQL Editor

-- 1. Table to track every API call
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cost_estimate DECIMAL(10,6) DEFAULT 0.003
);

-- 2. Settings table for configurable limits
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Default settings (null = no limit)
INSERT INTO app_settings (key, value) VALUES 
  ('usage_limits', '{"daily_limit": null, "weekly_limit": null, "cost_per_image": 0.003}')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 5. Policies - Full access for service role (backend)
CREATE POLICY "Service role full access on api_usage"
ON api_usage FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on app_settings"
ON app_settings FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_email ON api_usage(user_email);

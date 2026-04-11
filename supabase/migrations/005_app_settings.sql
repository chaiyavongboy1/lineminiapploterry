-- ==========================================
-- App Settings table (key-value store)
-- ==========================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow public read (settings like payment info are needed by customer pages)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_all" ON app_settings FOR ALL USING (true);

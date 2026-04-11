-- ==========================================
-- User Profiles — Banking & payment information
-- ==========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  promptpay_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_all" ON user_profiles FOR ALL USING (true);

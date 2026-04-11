-- ==========================================
-- LINE Mini App — Lottery Purchase
-- Database Schema Migration
-- ==========================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  status_message TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Lottery types
CREATE TABLE IF NOT EXISTS lottery_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_line DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) DEFAULT 0,
  max_number INT NOT NULL,
  max_special_number INT,
  numbers_to_pick INT NOT NULL,
  special_numbers_to_pick INT DEFAULT 1,
  draw_days TEXT[],
  next_draw_date DATE,
  estimated_jackpot TEXT,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lottery_type_id UUID REFERENCES lottery_types(id),
  draw_date DATE NOT NULL,
  total_lines INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'pending_slip',
      'pending_review',
      'approved',
      'rejected',
      'cancelled'
    )),
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Order lines (selected numbers)
CREATE TABLE IF NOT EXISTS order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  numbers INT[] NOT NULL,
  special_number INT,
  is_quick_pick BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Payment slips
CREATE TABLE IF NOT EXISTS payment_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  slip_image_url TEXT NOT NULL,
  amount DECIMAL(10,2),
  transfer_date TIMESTAMPTZ,
  bank_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ
);

-- 6. Draw results
CREATE TABLE IF NOT EXISTS draw_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_type_id UUID REFERENCES lottery_types(id),
  draw_date DATE NOT NULL,
  winning_numbers INT[] NOT NULL,
  special_number INT,
  jackpot_amount TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lottery_type_id, draw_date)
);

-- ==========================================
-- Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_slips_order_id ON payment_slips(order_id);
CREATE INDEX IF NOT EXISTS idx_draw_results_lottery_type ON draw_results(lottery_type_id, draw_date);

-- ==========================================
-- Seed: Default lottery types
-- ==========================================
INSERT INTO lottery_types (name, description, price_per_line, service_fee, max_number, max_special_number, numbers_to_pick, special_numbers_to_pick, draw_days, estimated_jackpot, is_active)
VALUES
  (
    'Powerball',
    'เลือก 5 ตัวเลขจาก 1-69 และ Powerball 1 ตัวจาก 1-26',
    250.00,
    50.00,
    69,
    26,
    5,
    1,
    ARRAY['monday', 'wednesday', 'saturday'],
    '$500 Million',
    true
  ),
  (
    'Mega Millions',
    'เลือก 5 ตัวเลขจาก 1-70 และ Mega Ball 1 ตัวจาก 1-25',
    250.00,
    50.00,
    70,
    25,
    5,
    1,
    ARRAY['tuesday', 'friday'],
    '$400 Million',
    true
  )
ON CONFLICT DO NOTHING;

-- ==========================================
-- RLS Policies
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;

-- Lottery types: everyone can read
CREATE POLICY "lottery_types_select" ON lottery_types FOR SELECT USING (true);

-- Draw results: everyone can read
CREATE POLICY "draw_results_select" ON draw_results FOR SELECT USING (true);

-- Storage bucket for payment slips
-- Run in Supabase Dashboard > Storage > Create bucket: payment-slips (public)

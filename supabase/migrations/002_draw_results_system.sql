-- ==========================================
-- Lottery Results System Migration
-- ==========================================

-- 1. Prize Tiers table
CREATE TABLE IF NOT EXISTS prize_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_type_id UUID REFERENCES lottery_types(id) ON DELETE CASCADE,
  match_count INT NOT NULL,
  match_special BOOLEAN NOT NULL,
  prize_name TEXT NOT NULL,
  prize_amount DECIMAL(15,2),
  tier_order INT NOT NULL,
  UNIQUE(lottery_type_id, match_count, match_special)
);

-- 2. Order Line Results table
CREATE TABLE IF NOT EXISTS order_line_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id UUID REFERENCES order_lines(id) ON DELETE CASCADE,
  draw_result_id UUID REFERENCES draw_results(id) ON DELETE CASCADE,
  matched_numbers INT[] NOT NULL DEFAULT '{}',
  matched_special BOOLEAN DEFAULT false,
  match_count INT NOT NULL DEFAULT 0,
  prize_tier_id UUID REFERENCES prize_tiers(id),
  prize_amount DECIMAL(15,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_line_id, draw_result_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_line_results_draw ON order_line_results(draw_result_id);
CREATE INDEX IF NOT EXISTS idx_order_line_results_winner ON order_line_results(is_winner) WHERE is_winner = true;
CREATE INDEX IF NOT EXISTS idx_prize_tiers_lottery ON prize_tiers(lottery_type_id);

-- RLS
ALTER TABLE prize_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prize_tiers_select" ON prize_tiers FOR SELECT USING (true);
CREATE POLICY "order_line_results_select" ON order_line_results FOR SELECT USING (true);

-- ==========================================
-- Seed: Powerball Prize Tiers
-- ==========================================
INSERT INTO prize_tiers (lottery_type_id, match_count, match_special, prize_name, prize_amount, tier_order)
SELECT lt.id, tiers.match_count, tiers.match_special, tiers.prize_name, tiers.prize_amount, tiers.tier_order
FROM lottery_types lt
CROSS JOIN (VALUES
  (5, true,  'Jackpot',     NULL,       1),
  (5, false, '$1,000,000',  1000000.00, 2),
  (4, true,  '$50,000',     50000.00,   3),
  (4, false, '$100',        100.00,     4),
  (3, true,  '$100',        100.00,     5),
  (3, false, '$7',          7.00,       6),
  (2, true,  '$7',          7.00,       7),
  (1, true,  '$4',          4.00,       8),
  (0, true,  '$4',          4.00,       9)
) AS tiers(match_count, match_special, prize_name, prize_amount, tier_order)
WHERE lt.name = 'Powerball'
ON CONFLICT DO NOTHING;

-- ==========================================
-- Seed: Mega Millions Prize Tiers
-- ==========================================
INSERT INTO prize_tiers (lottery_type_id, match_count, match_special, prize_name, prize_amount, tier_order)
SELECT lt.id, tiers.match_count, tiers.match_special, tiers.prize_name, tiers.prize_amount, tiers.tier_order
FROM lottery_types lt
CROSS JOIN (VALUES
  (5, true,  'Jackpot',     NULL,       1),
  (5, false, '$1,000,000',  1000000.00, 2),
  (4, true,  '$10,000',     10000.00,   3),
  (4, false, '$500',        500.00,     4),
  (3, true,  '$200',        200.00,     5),
  (3, false, '$10',         10.00,      6),
  (2, true,  '$10',         10.00,      7),
  (1, true,  '$4',          4.00,       8),
  (0, true,  '$2',          2.00,       9)
) AS tiers(match_count, match_special, prize_name, prize_amount, tier_order)
WHERE lt.name = 'Mega Millions'
ON CONFLICT DO NOTHING;

-- ==========================================
-- Prize Transfer Slips — Admin uploads proof of prize transfers
-- ==========================================

CREATE TABLE IF NOT EXISTS prize_transfer_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  draw_result_id UUID REFERENCES draw_results(id),
  image_url TEXT NOT NULL,
  transfer_amount DECIMAL(15,2),
  transfer_note TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prize_transfer_slips_order ON prize_transfer_slips(order_id);
CREATE INDEX IF NOT EXISTS idx_prize_transfer_slips_draw ON prize_transfer_slips(draw_result_id);

ALTER TABLE prize_transfer_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prize_transfer_slips_select" ON prize_transfer_slips FOR SELECT USING (true);
CREATE POLICY "prize_transfer_slips_all" ON prize_transfer_slips FOR ALL USING (true);

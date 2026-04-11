-- ==========================================
-- Add is_manual flag to draw_results
-- ==========================================

ALTER TABLE draw_results
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Create an index to quickly filter manual vs auto draws
CREATE INDEX IF NOT EXISTS idx_draw_results_is_manual ON draw_results(is_manual);

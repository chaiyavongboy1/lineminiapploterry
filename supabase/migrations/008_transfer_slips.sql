-- Add transfer slip fields to order_line_results
ALTER TABLE order_line_results 
ADD COLUMN IF NOT EXISTS transfer_slip_url TEXT,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

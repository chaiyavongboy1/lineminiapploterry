-- ==========================================
-- Add completed status + ticket_image to orders
-- ==========================================

-- 1. Add 'completed' to the status CHECK constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_payment',
    'pending_slip',
    'pending_review',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ));

-- 2. Add ticket_image column for storing lottery ticket photo URL
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS ticket_image TEXT;

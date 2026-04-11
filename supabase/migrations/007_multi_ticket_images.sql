-- ==========================================
-- Ticket Images — Multiple images per order
-- ==========================================

CREATE TABLE IF NOT EXISTS ticket_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_images_order_id ON ticket_images(order_id);

ALTER TABLE ticket_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket_images_select" ON ticket_images FOR SELECT USING (true);
CREATE POLICY "ticket_images_all" ON ticket_images FOR ALL USING (true);

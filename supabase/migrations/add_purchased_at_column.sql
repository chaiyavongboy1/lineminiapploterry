-- Migration: Add purchased_at column to orders table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/csnpujhgnwedmyenaokv/sql

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN orders.purchased_at IS 'Timestamp when the lottery ticket was successfully purchased (status = completed)';

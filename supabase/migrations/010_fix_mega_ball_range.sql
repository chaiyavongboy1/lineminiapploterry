-- ==========================================
-- Fix Mega Millions Mega Ball range from 1-25 to 1-24
-- As of April 8, 2025, Mega Ball range changed to 1-24
-- ==========================================

UPDATE lottery_types
SET
    max_special_number = 24,
    description = REPLACE(description, '1-25', '1-24')
WHERE name = 'Mega Millions'
  AND max_special_number = 25;

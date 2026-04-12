-- ==========================================
-- Re-seed prize tiers to ensure they match
-- current lottery_type UUIDs
-- ==========================================

-- 1. Remove any orphaned/stale prize tiers
DELETE FROM prize_tiers
WHERE lottery_type_id NOT IN (SELECT id FROM lottery_types);

-- 2. Re-seed Powerball prize tiers (skip if already correct)
INSERT INTO prize_tiers (lottery_type_id, match_count, match_special, prize_name, prize_amount, tier_order)
SELECT lt.id, tiers.match_count, tiers.match_special, tiers.prize_name, tiers.prize_amount, tiers.tier_order
FROM lottery_types lt
CROSS JOIN (VALUES
  (5, true,  'Jackpot',      0,          1),
  (5, false, '5 Match',      1000000.00, 2),
  (4, true,  '4 + Powerball', 50000.00,  3),
  (4, false, '4 Match',      100.00,     4),
  (3, true,  '3 + Powerball', 100.00,    5),
  (3, false, '3 Match',      7.00,       6),
  (2, true,  '2 + Powerball', 7.00,      7),
  (1, true,  '1 + Powerball', 4.00,      8),
  (0, true,  'Powerball Only', 4.00,     9)
) AS tiers(match_count, match_special, prize_name, prize_amount, tier_order)
WHERE lt.name = 'Powerball'
ON CONFLICT (lottery_type_id, match_count, match_special) 
DO UPDATE SET 
  prize_name = EXCLUDED.prize_name,
  prize_amount = EXCLUDED.prize_amount,
  tier_order = EXCLUDED.tier_order;

-- 3. Re-seed Mega Millions prize tiers
INSERT INTO prize_tiers (lottery_type_id, match_count, match_special, prize_name, prize_amount, tier_order)
SELECT lt.id, tiers.match_count, tiers.match_special, tiers.prize_name, tiers.prize_amount, tiers.tier_order
FROM lottery_types lt
CROSS JOIN (VALUES
  (5, true,  'Jackpot',        0,          1),
  (5, false, '5 Match',        1000000.00, 2),
  (4, true,  '4 + Mega Ball',  10000.00,   3),
  (4, false, '4 Match',        500.00,     4),
  (3, true,  '3 + Mega Ball',  200.00,     5),
  (3, false, '3 Match',        10.00,      6),
  (2, true,  '2 + Mega Ball',  10.00,      7),
  (1, true,  '1 + Mega Ball',  4.00,       8),
  (0, true,  'Mega Ball Only', 2.00,       9)
) AS tiers(match_count, match_special, prize_name, prize_amount, tier_order)
WHERE lt.name = 'Mega Millions'
ON CONFLICT (lottery_type_id, match_count, match_special) 
DO UPDATE SET 
  prize_name = EXCLUDED.prize_name,
  prize_amount = EXCLUDED.prize_amount,
  tier_order = EXCLUDED.tier_order;

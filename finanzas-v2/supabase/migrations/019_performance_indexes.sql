-- Migration: 019_performance_indexes.sql
-- Adds composite and partial indexes to support production-scale query patterns.
-- NOTE: CONCURRENTLY removed — Supabase SQL Editor runs inside a transaction block.
-- At production scale, apply these manually via psql outside a transaction if needed.

-- 1. Composite index for transactions: covers the most frequent query pattern.
--    Matches: WHERE tx_usr_id = ? AND tx_date BETWEEN ? AND ? ORDER BY tx_date DESC
--    Used by: getTransactions(), recalculate_monthly_summary() trigger (after 020 fix).
CREATE INDEX idx_tx_usr_date
  ON transactions(tx_usr_id, tx_date DESC);

-- 2. Partial index for recurring transaction lookups.
--    Matches: WHERE tx_rec_id = ? AND tx_date = ?
--    Used by: generateDueRecurring() duplicate check.
CREATE INDEX idx_tx_rec_id
  ON transactions(tx_rec_id)
  WHERE tx_rec_id IS NOT NULL;

-- 3. Covering index for RLS auth helper functions.
--    Turns is_valid_user() and is_admin() profile lookups into index-only scans.
--    Critical at scale: these functions run on every single query due to RLS.
CREATE INDEX idx_profiles_auth
  ON profiles(prof_id)
  INCLUDE (prof_is_active, prof_role);

-- 4. Partial index for open-ended budget queries.
--    Matches: WHERE bud_usr_id = ? AND bud_start_date <= ? AND bud_end_date IS NULL
--    Used by: getActiveBudgets() — the most common budget query pattern.
CREATE INDEX idx_bud_active
  ON budgets(bud_usr_id, bud_start_date)
  WHERE bud_end_date IS NULL;

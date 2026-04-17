-- Migration: 023_fix_account_balance | Date: 2026-04-17 | Author: backend-specialist
--
-- Problem: acc_current_balance drifts to 0 because:
--   1. The original trigger recalculates incrementally (+/-), which accumulates drift
--      when rows are updated or deleted in edge cases.
--   2. Accounts created via handle_new_user() set acc_current_balance = acc_initial_balance,
--      but DEFAULT 0 on the column can override that value through later migrations or
--      direct INSERT statements that omit acc_current_balance.
--
-- Fix:
--   A) Replace update_account_balance() with a full recalculation from scratch on every
--      trigger fire — no incremental drift possible.
--   B) Immediately recalculate all existing accounts so current state is correct.
--
-- Rollback hint:
--   To revert to incremental trigger, restore the function body from 001_initial_schema.sql.
--   Balance drift for existing rows would need a manual reconciliation pass.

-- ============================================================
-- STEP 1: Replace trigger function with full-recalculation approach
-- ============================================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc_id uuid;
BEGIN
  -- Determine which account(s) are affected.
  -- On UPDATE: if the account changed, recalculate both old and new accounts.
  -- On INSERT: only NEW.tx_acc_id.
  -- On DELETE: only OLD.tx_acc_id.

  IF TG_OP = 'UPDATE' AND OLD.tx_acc_id <> NEW.tx_acc_id THEN
    UPDATE accounts
    SET acc_current_balance = (
      SELECT COALESCE(SUM(CASE WHEN tx_type = 'income' THEN tx_amount ELSE -tx_amount END), 0)
      FROM transactions WHERE tx_acc_id = OLD.tx_acc_id
    )
    WHERE acc_id = OLD.tx_acc_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_acc_id := OLD.tx_acc_id;
  ELSE
    v_acc_id := NEW.tx_acc_id;
  END IF;

  UPDATE accounts
  SET acc_current_balance = (
    SELECT COALESCE(SUM(CASE WHEN tx_type = 'income' THEN tx_amount ELSE -tx_amount END), 0)
    FROM transactions WHERE tx_acc_id = v_acc_id
  )
  WHERE acc_id = v_acc_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- STEP 2: Immediate fix — recalculate all existing accounts
-- ============================================================
-- This corrects any existing drift in acc_current_balance for every account
-- in the database. Only real transactions (from the `transactions` table) are
-- counted. Demo data lives in user_demo_access / demo_data_templates and is
-- NOT included here.

UPDATE accounts a
SET acc_current_balance = (
  SELECT COALESCE(
    SUM(CASE WHEN t.tx_type = 'income' THEN t.tx_amount ELSE -t.tx_amount END),
    0
  )
  FROM transactions t
  WHERE t.tx_acc_id = a.acc_id
),
acc_initial_balance = 0;

-- ============================================================
-- STEP 3: Fix handle_new_user() — include acc_current_balance explicitly
-- so new users don't get DEFAULT 0 on their initial account
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       text;
  v_count      integer;
  v_account_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_count FROM profiles;
  v_role := CASE WHEN v_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO profiles (prof_id, prof_full_name, prof_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  );

  PERFORM seed_default_categories(NEW.id);

  INSERT INTO accounts (acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance, acc_current_balance)
  VALUES (NEW.id, 'Mi Cuenta', 'bank', 'EUR', 0, 0)
  RETURNING acc_id INTO v_account_id;

  PERFORM generate_demo_data(NEW.id, v_account_id);

  RETURN NEW;
END;
$$;

-- ============================================================
-- Verification query (run manually after applying migration)
-- ============================================================
-- SELECT
--   a.acc_id,
--   a.acc_name,
--   a.acc_initial_balance,
--   a.acc_current_balance,
--   COALESCE(SUM(CASE WHEN t.tx_type = 'income' THEN t.tx_amount ELSE -t.tx_amount END), 0) AS computed_delta,
--   a.acc_initial_balance + COALESCE(SUM(CASE WHEN t.tx_type = 'income' THEN t.tx_amount ELSE -t.tx_amount END), 0) AS expected_balance,
--   a.acc_current_balance = a.acc_initial_balance + COALESCE(SUM(CASE WHEN t.tx_type = 'income' THEN t.tx_amount ELSE -t.tx_amount END), 0) AS is_correct
-- FROM accounts a
-- LEFT JOIN transactions t ON t.tx_acc_id = a.acc_id
-- GROUP BY a.acc_id, a.acc_name, a.acc_initial_balance, a.acc_current_balance
-- ORDER BY a.acc_name;

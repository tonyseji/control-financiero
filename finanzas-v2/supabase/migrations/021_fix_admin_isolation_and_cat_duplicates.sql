-- Migration: 021_fix_admin_isolation_and_cat_duplicates | Date: 2026-04-17 | Author: backend-specialist
-- ============================================================
-- Fix 1: Remove admin "see-all" policies on data tables
-- ============================================================
-- Problem: admin-sees-all policies (e.g. tx_admin, acc_admin) grant admins
-- unrestricted read/write access to ALL users' financial data. This violates
-- data isolation — each user (including admins) should only see their own data.
--
-- Solution: drop admin policies on all data tables. Admins still operate
-- through the same _own policy as regular users (filtered to their own rows).
--
-- Exceptions (kept intentionally):
--   - prof_admin on profiles: admins must manage user profiles and roles
--   - demo_data_templates / user_demo_access: admin management required
--
-- Fix 2: Prevent duplicate categories
-- ============================================================
-- Problem: seed_default_categories() is not idempotent. Calling it twice
-- (e.g. during a retry or a bug) inserts duplicate category rows, which
-- breaks the UI and queries that assume one row per (user, name).
--
-- Solution:
--   1. Run a one-time deduplication (keep lowest cat_id = original insert)
--   2. Add UNIQUE constraint on (cat_usr_id, cat_name)
--   3. Replace seed_default_categories() to use ON CONFLICT DO NOTHING
-- ============================================================


-- ── Fix 1: Drop admin "see-all" policies on data tables ─────────────────────

DROP POLICY IF EXISTS "tx_admin"                 ON transactions;
DROP POLICY IF EXISTS "acc_admin"                ON accounts;
DROP POLICY IF EXISTS "cat_admin"                ON categories;
DROP POLICY IF EXISTS "rec_admin"                ON recurring_transactions;
DROP POLICY IF EXISTS "fcfg_admin"               ON financial_config;
DROP POLICY IF EXISTS "bud_admin"                ON budgets;
DROP POLICY IF EXISTS "goals_admin"              ON goals;
DROP POLICY IF EXISTS "monthly_summaries_admin"  ON monthly_summaries;

-- NOTE: prof_admin on profiles is intentionally preserved.
-- NOTE: demo_data_templates and user_demo_access admin policies are preserved.


-- ── Fix 2a: Deduplicate categories (keep lowest cat_id per user+name) ────────
-- Must run BEFORE adding the unique constraint.

DELETE FROM categories
WHERE cat_id IN (
  SELECT cat_id FROM (
    SELECT cat_id,
           ROW_NUMBER() OVER (PARTITION BY cat_usr_id, cat_name ORDER BY cat_id) AS rn
    FROM categories
  ) ranked
  WHERE rn > 1
);


-- ── Fix 2b: Add UNIQUE constraint on (cat_usr_id, cat_name) ─────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_cat_usr_id_cat_name'
      AND conrelid = 'categories'::regclass
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT uq_cat_usr_id_cat_name UNIQUE (cat_usr_id, cat_name);
  END IF;
END;
$$;


-- ── Fix 2c: Replace seed_default_categories() — idempotent with ON CONFLICT ──
-- Full canonical list as of migration 003 (21 categories).
-- ON CONFLICT DO NOTHING makes the function safe to call multiple times.

CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (cat_usr_id, cat_name, cat_type, cat_is_system) VALUES
    -- Gastos fijos
    (p_user_id, 'Alquiler',            'fixed_expense',    true),
    (p_user_id, 'Seguros',             'fixed_expense',    true),
    (p_user_id, 'Suministros',         'fixed_expense',    true),
    (p_user_id, 'Suscripciones',       'fixed_expense',    true),
    (p_user_id, 'Gimnasio',            'fixed_expense',    true),
    (p_user_id, 'Internet',            'fixed_expense',    true),
    -- Gastos variables
    (p_user_id, 'Supermercado',        'variable_expense', true),
    (p_user_id, 'Restaurantes',        'variable_expense', true),
    (p_user_id, 'Transporte',          'variable_expense', true),
    (p_user_id, 'Ocio',                'variable_expense', true),
    (p_user_id, 'Ropa',                'variable_expense', true),
    (p_user_id, 'Salud',               'variable_expense', true),
    (p_user_id, 'Gasolina',            'variable_expense', true),
    (p_user_id, 'Deporte',             'variable_expense', true),
    -- Ahorro
    (p_user_id, 'Fondo de emergencia', 'saving',           true),
    (p_user_id, 'Ahorro general',      'saving',           true),
    -- Inversión
    (p_user_id, 'Broker',              'investment',       true),
    (p_user_id, 'Fondos',              'investment',       true),
    -- Ingresos
    (p_user_id, 'Nómina',              'income',           true),
    (p_user_id, 'Freelance',           'income',           true),
    (p_user_id, 'Otros ingresos',      'income',           true)
  ON CONFLICT (cat_usr_id, cat_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── Verification queries (run after applying) ────────────────────────────────
--
-- 1. Confirm admin data-table policies are gone (should return 0 rows):
--    SELECT policyname, tablename
--    FROM pg_policies
--    WHERE policyname IN (
--      'tx_admin','acc_admin','cat_admin','rec_admin',
--      'fcfg_admin','bud_admin','goals_admin','monthly_summaries_admin'
--    );
--
-- 2. Confirm prof_admin is still present (should return 1 row):
--    SELECT policyname FROM pg_policies WHERE policyname = 'prof_admin';
--
-- 3. Confirm unique constraint exists:
--    SELECT conname FROM pg_constraint
--    WHERE conname = 'uq_cat_usr_id_cat_name';
--
-- 4. Confirm no duplicate categories remain:
--    SELECT cat_usr_id, cat_name, COUNT(*)
--    FROM categories
--    GROUP BY cat_usr_id, cat_name
--    HAVING COUNT(*) > 1;
--
-- 5. Confirm seed function is idempotent (run twice, expect same count):
--    SELECT COUNT(*) FROM categories WHERE cat_usr_id = '<any_user_id>';
--    SELECT seed_default_categories('<any_user_id>');
--    SELECT COUNT(*) FROM categories WHERE cat_usr_id = '<any_user_id>';
--    -- Both counts should be identical.

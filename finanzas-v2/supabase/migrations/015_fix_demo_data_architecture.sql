-- ============================================================
-- MIGRATION 015: Fix Demo Data Architecture (Clean Reset)
-- ============================================================
-- Problem: Conflicting versions of generate_demo_data and handle_new_user
-- from migrations 009, 010, 012, 014. Some reference transactions table,
-- others reference user_demo_access. This causes confusion and errors.
--
-- Solution: Define a SINGLE, authoritative version of the demo data flow:
-- 1. Demo data lives in demo_data_templates (read-only, shared across users)
-- 2. User access to demos lives in user_demo_access (per-user, with expiration)
-- 3. Transactions table is PURE (no demo flags, no expiration columns)
--    UNLESS migration 009 columns still exist (in which case we leave them)
-- ============================================================

-- ── Step 1: Recreate generate_demo_data() cleanly ──────────────────────
-- This is the AUTHORITATIVE version: links users to demo templates
-- (does NOT insert into transactions)
DROP FUNCTION IF EXISTS generate_demo_data(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION generate_demo_data(p_user_id uuid, p_account_id uuid)
RETURNS void AS $$
BEGIN
  -- Link user to ALL demo data templates for 12 hours
  INSERT INTO user_demo_access (uda_user_id, uda_template_id, uda_is_active, uda_expires_at)
  SELECT
    p_user_id,
    ddt_id,
    TRUE,
    NOW() + INTERVAL '12 hours'
  FROM demo_data_templates
  ORDER BY ddt_order
  ON CONFLICT DO NOTHING;  -- Safely idempotent
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Step 2: Recreate handle_new_user() cleanly ────────────────────────
-- AUTHORITATIVE version: follows the exact same flow as migration 012
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role        text;
  v_env         text;
  v_count       integer;
  v_account_id  uuid;
BEGIN
  SET search_path = public;

  SELECT COUNT(*) INTO v_count FROM profiles;
  v_env := current_setting('app.settings.app_env', true);

  -- ── Staging: cap at 5 users ────────────────────────────────────────────────
  IF v_env = 'staging' AND v_count >= 5 THEN
    RAISE EXCEPTION 'Registro desactivado: límite de usuarios de staging alcanzado.'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Assign role: first user = admin, rest = user ───────────────────────────
  v_role := CASE WHEN v_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO profiles (prof_id, prof_full_name, prof_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  );

  PERFORM seed_default_categories(NEW.id);

  -- ── Create default account ─────────────────────────────────────────────────
  INSERT INTO accounts (
    acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance
  ) VALUES (
    NEW.id, 'Mi Cuenta', 'bank', 'EUR', 5000
  )
  RETURNING acc_id INTO v_account_id;

  -- ── Generate 40 demo transactions for onboarding ───────────────────────────
  PERFORM generate_demo_data(NEW.id, v_account_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Step 3: Ensure hook_before_user_created is clean ────────────────────
-- AUTHORITATIVE version: from migration 013
DROP FUNCTION IF EXISTS hook_before_user_created(jsonb) CASCADE;

CREATE OR REPLACE FUNCTION hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env   text;
  v_count integer;
BEGIN
  v_env := current_setting('app.settings.app_env', true);

  -- In production: allow all registrations
  IF v_env IS DISTINCT FROM 'staging' THEN
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- ── Staging: allow only up to 5 users ─────────────────────────────────────
  SELECT COUNT(*) INTO v_count FROM profiles;

  IF v_count >= 5 THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Registro desactivado: límite de usuarios de staging alcanzado.',
        'http_status_code', 403
      )
    );
  END IF;

  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

-- Grant execute to supabase_auth_admin (required for Auth Hooks)
GRANT EXECUTE ON FUNCTION hook_before_user_created(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION hook_before_user_created(jsonb) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After applying this migration:
-- 1. Verify in Supabase: Extensions > Hooks > Authentication > hook_before_user_created
--    - Function should be: hook_before_user_created(jsonb)
--    - Should NOT have "Verify JWT with legacy secret" enabled (check Settings)
-- 2. Try to register a new user
-- 3. Check SQL Editor: SELECT COUNT(*) FROM user_demo_access;
--    Should return 42 (one row per demo template for that user)
-- ============================================================

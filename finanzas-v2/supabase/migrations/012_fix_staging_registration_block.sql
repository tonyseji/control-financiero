-- ============================================================
-- MIGRATION 012: Fix staging registration block
-- ============================================================
-- Problem: Migration 010 overwrote 011's handle_new_user() with a version
-- that blocks ALL signups in staging if any user exists (v_count > 0).
-- Migration 011 had the correct version allowing up to 5 users (v_count >= 5),
-- but 010 was applied after 011, reverting the fix.
--
-- This migration re-applies the correct function from 011 so it is the
-- last definition executed.
--
-- Security layers still active:
-- - Capa 0: Auth Hook blocks JWT issuance to non-admins
-- - Capa 2: Frontend redirects non-admins to StagingBlocked
-- - Capa 3: RLS denies all non-admin queries
--
-- So new users can register (up to 5 total), but cannot access the app.

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

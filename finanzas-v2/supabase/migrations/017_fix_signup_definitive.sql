-- ============================================================
-- MIGRATION 017: Fix signup — "Database error updating user"
-- ============================================================
-- Problem: handle_new_user() fails because the trigger raises
-- an exception (staging cap >= 5) which Supabase translates to
-- "Database error updating user". Accumulated test signups push
-- profiles count >= 5, blocking ALL new signups including admins.
--
-- Solution: Remove staging cap from the trigger entirely.
-- The cap is redundant — it's enforced by 3 other layers:
--   - Capa 0: auth-hook (hook_before_user_created) blocks JWT issuance
--   - Capa 2: Frontend redirects non-admins to StagingBlocked
--   - Capa 3: RLS denies all data access for non-admin users
--
-- The trigger now only does: profile + categories + account + demo links
-- ============================================================

-- ── Step 1: Recreate handle_new_user WITHOUT staging cap ──────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role       text;
  v_count      integer;
  v_account_id uuid;
BEGIN
  SET search_path = public;

  SELECT COUNT(*) INTO v_count FROM profiles;

  -- First user = admin, rest = user
  v_role := CASE WHEN v_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO profiles (prof_id, prof_full_name, prof_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  );

  PERFORM seed_default_categories(NEW.id);

  INSERT INTO accounts (acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance)
  VALUES (NEW.id, 'Mi Cuenta', 'bank', 'EUR', 5000)
  RETURNING acc_id INTO v_account_id;

  -- Link to demo templates (safe no-op if demo_data_templates is empty)
  PERFORM generate_demo_data(NEW.id, v_account_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Step 2: Ensure generate_demo_data is safe if templates missing ─────────
CREATE OR REPLACE FUNCTION generate_demo_data(p_user_id uuid, p_account_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_demo_access (uda_user_id, uda_template_id, uda_is_active, uda_expires_at)
  SELECT
    p_user_id,
    ddt_id,
    TRUE,
    NOW() + INTERVAL '12 hours'
  FROM demo_data_templates
  ORDER BY ddt_order
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- VERIFICATION — run after applying this migration:
-- ============================================================
-- 1. Check handle_new_user has no staging cap:
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';
--
-- 2. Check profiles count (doesn't matter how many — trigger won't block):
--    SELECT COUNT(*) FROM profiles;
--
-- 3. Register a new user via the app — should succeed
--
-- 4. Verify new user data was created:
--    SELECT prof_id, prof_role FROM profiles ORDER BY prof_created_at DESC LIMIT 3;
--    SELECT acc_id FROM accounts ORDER BY acc_created_at DESC LIMIT 3;
--    SELECT COUNT(*) FROM user_demo_access WHERE uda_user_id = '<new_user_id>';
-- ============================================================

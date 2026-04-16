-- ============================================================
-- MIGRATION 013: Fix auth hook staging block
-- ============================================================
-- Problem: hook_before_user_created() blocks new signups in staging
-- when any user already exists (v_count > 0), preventing up to 5 users.
--
-- Fix: Change condition to v_count >= 5, consistent with handle_new_user()
-- from migration 012.
--
-- Note: This function is called by Supabase Auth Hook (Authentication → Hooks).
-- It runs BEFORE the JWT is issued — before handle_new_user() trigger fires.

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

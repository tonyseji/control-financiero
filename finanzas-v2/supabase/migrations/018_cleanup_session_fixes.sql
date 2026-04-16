-- ============================================================
-- MIGRATION 018: Cleanup — consolida fixes manuales de sesión 2026-04-16/17
-- ============================================================
-- Documenta y formaliza los cambios hechos directamente en el SQL Editor:
--
-- 1. protect_prof_role() — permite cambios cuando auth.uid() IS NULL
--    (service role / SQL Editor). El bug original bloqueaba al propio admin de BD.
--
-- 2. handle_new_user() — elimina SET search_path del cuerpo de la función.
--    Tenerlo en el cuerpo contaminaba el search_path de la sesión completa,
--    haciendo que el UPDATE "users" interno de Supabase Auth fallara con
--    "relation users does not exist".
--
-- 3. Elimina policy prof_direct_own (parche de emergencia, ya no necesaria
--    porque getProfile() ahora filtra explícitamente por prof_id = user.id).
--
-- 4. Elimina policy profiles_insert_system (origen desconocido, no está en
--    ninguna migration, es redundante — el trigger handle_new_user inserta
--    con SECURITY DEFINER y no necesita policy de INSERT).
-- ============================================================

-- ── 1. protect_prof_role: permitir cuando auth.uid() IS NULL ──────────────
CREATE OR REPLACE FUNCTION protect_prof_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.prof_role = OLD.prof_role THEN
    RETURN NEW;
  END IF;

  -- auth.uid() = NULL → service role / SQL Editor → permitir siempre
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only admins can change prof_role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. handle_new_user: sin SET search_path en el cuerpo ──────────────────
-- (ya aplicado en BD — esta es la versión canónica para el repo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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

  INSERT INTO accounts (acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance)
  VALUES (NEW.id, 'Mi Cuenta', 'bank', 'EUR', 5000)
  RETURNING acc_id INTO v_account_id;

  PERFORM generate_demo_data(NEW.id, v_account_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. Eliminar policies de emergencia / origen desconocido ───────────────
DROP POLICY IF EXISTS prof_direct_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_system ON profiles;

-- ── Estado final de policies en profiles: ─────────────────────────────────
-- prof_own   → usuario lee/edita solo su propio perfil (requiere is_valid_user)
-- prof_admin → admin lee/edita todos los perfiles
-- (getProfile() filtra por .eq('prof_id', user.id) — no depende de RLS para filtrar)

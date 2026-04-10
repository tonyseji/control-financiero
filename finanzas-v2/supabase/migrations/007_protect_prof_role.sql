-- ============================================================
-- MIGRACIÓN 007 — Proteger prof_role contra auto-escalada
-- ============================================================
-- Problema: La policy prof_own permite UPDATE con WITH CHECK genérico,
-- lo que permitiría a un usuario cambiar su propio prof_role a 'admin'.
-- Solución: Trigger BEFORE UPDATE que impide modificar prof_role
-- a menos que el ejecutor sea un admin (o la llamada venga del service role).
-- ============================================================

CREATE OR REPLACE FUNCTION protect_prof_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si prof_role no cambió, no hay nada que hacer
  IF NEW.prof_role = OLD.prof_role THEN
    RETURN NEW;
  END IF;

  -- Solo los admins pueden cambiar prof_role
  -- is_admin() usa auth.uid() — si el ejecutor es el service role,
  -- auth.uid() es NULL y el bloqueo NO aplica (intencional).
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only admins can change prof_role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_prof_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_prof_role();

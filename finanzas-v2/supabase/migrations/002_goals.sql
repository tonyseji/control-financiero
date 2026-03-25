-- ============================================================
-- Migration 002 — goals
-- Tabla de objetivos de ahorro personales.
-- goal_saved es columna directa (manual "añadir ahorro"),
-- no calculado desde transactions — los goals son metas
-- independientes del sistema de cuentas.
-- ============================================================

-- ── Tabla ────────────────────────────────────────────────────
CREATE TABLE goals (
    goal_id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_usr_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name       text        NOT NULL,
    goal_category   text        NOT NULL DEFAULT 'other'
                                CHECK (goal_category IN (
                                    'emergency', 'travel', 'car',
                                    'home', 'education', 'retirement', 'other'
                                )),
    goal_target     numeric(15,2) NOT NULL CHECK (goal_target > 0),
    goal_saved      numeric(15,2) NOT NULL DEFAULT 0 CHECK (goal_saved >= 0),
    goal_monthly    numeric(15,2)          DEFAULT 0 CHECK (goal_monthly >= 0),
    goal_deadline   date,
    goal_is_active  boolean     NOT NULL DEFAULT true,
    goal_created_at timestamptz NOT NULL DEFAULT now(),
    goal_updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Índice ───────────────────────────────────────────────────
CREATE INDEX idx_goal_usr_id ON goals(goal_usr_id);

-- ── Trigger updated_at ───────────────────────────────────────
-- Reutiliza la misma función set_updated_at() de 001 si existe,
-- o la crea si esta migración se ejecuta sola.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.goal_updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Usuario propio: CRUD completo sobre sus goals
CREATE POLICY goals_own ON goals
    FOR ALL
    TO authenticated
    USING     (is_valid_user() AND goal_usr_id = auth.uid())
    WITH CHECK (is_valid_user() AND goal_usr_id = auth.uid());

-- Admin: lectura + edición de goals de cualquier usuario
CREATE POLICY goals_admin ON goals
    FOR ALL
    TO authenticated
    USING     (is_admin())
    WITH CHECK (is_admin());

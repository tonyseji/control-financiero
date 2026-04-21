-- Migration: 024_push_subscriptions | Date: 2026-04-21 | Author: backend-specialist
--
-- Crea la tabla push_subscriptions para almacenar suscripciones Web Push
-- de los usuarios. Cada fila representa un dispositivo/browser registrado.
--
-- Nota sobre set_updated_at(): la función existente en 001/002 hardcodea la
-- columna de cada tabla (goal_updated_at, etc.), por lo que NO es genérica.
-- Esta migración crea set_psub_updated_at() específica para esta tabla,
-- siguiendo el mismo patrón.
--
-- Rollback hint:
--   DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
--   DROP FUNCTION IF EXISTS set_psub_updated_at();
--   DROP TABLE IF EXISTS push_subscriptions;

-- ============================================================
-- STEP 1: Tabla push_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  psub_id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  psub_usr_id     uuid        NOT NULL,
  psub_endpoint   text        NOT NULL,
  psub_p256dh     text        NOT NULL,
  psub_auth       text        NOT NULL,
  psub_is_active  boolean     NOT NULL DEFAULT true,
  psub_created_at timestamptz NOT NULL DEFAULT now(),
  psub_updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (psub_id),
  CONSTRAINT push_subscriptions_usr_fk
    FOREIGN KEY (psub_usr_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT push_subscriptions_unique_endpoint
    UNIQUE (psub_usr_id, psub_endpoint)
);

COMMENT ON TABLE push_subscriptions IS
  'Suscripciones Web Push por usuario y dispositivo. Una fila = un browser/device registrado.';

-- ============================================================
-- STEP 2: Índices
-- ============================================================

-- Búsquedas por usuario (el caso más común en la EF push-subscribe)
CREATE INDEX IF NOT EXISTS idx_psub_usr_id
  ON push_subscriptions (psub_usr_id);

-- Índice parcial: solo suscripciones activas — filtro del cron diario
CREATE INDEX IF NOT EXISTS idx_psub_active
  ON push_subscriptions (psub_is_active)
  WHERE psub_is_active = true;

-- ============================================================
-- STEP 3: Función y trigger updated_at
-- Función dedicada por tabla (mismo patrón que 001/002).
-- ============================================================

CREATE OR REPLACE FUNCTION set_psub_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.psub_updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_psub_updated_at();

-- ============================================================
-- STEP 4: RLS
-- Policy _own: el usuario gestiona solo sus propias suscripciones.
-- NO se crea policy _admin (datos de usuario, no de plataforma).
-- ============================================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_own
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING  (psub_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (psub_usr_id = auth.uid() AND is_valid_user());

-- ============================================================
-- Verification query (ejecutar manualmente tras aplicar en staging)
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'push_subscriptions';
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'push_subscriptions';
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'push_subscriptions';

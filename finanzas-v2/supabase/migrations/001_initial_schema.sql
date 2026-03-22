-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA DE RATE LIMITING (intentos de registro fallidos)
-- ============================================================
-- Registra IPs que intentan registrarse en staging para bloquear
-- ataques de fuerza bruta. Solo usada por el trigger handle_new_user.
CREATE TABLE auth_rate_limit (
  arl_id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  arl_ip         text NOT NULL,
  arl_attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para limpiar y consultar por IP + ventana de tiempo
CREATE INDEX idx_arl_ip_time ON auth_rate_limit(arl_ip, arl_attempted_at DESC);

-- RLS: nadie puede leer ni escribir directamente desde el cliente
ALTER TABLE auth_rate_limit ENABLE ROW LEVEL SECURITY;
-- Sin policies → tabla completamente inaccesible desde el cliente (solo SECURITY DEFINER)

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  prof_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prof_full_name  text,
  prof_avatar_url text,
  prof_currency   text NOT NULL DEFAULT 'EUR',
  prof_locale     text NOT NULL DEFAULT 'es-ES',
  prof_role       text NOT NULL DEFAULT 'user'
                    CHECK (prof_role IN ('user', 'admin')),
  prof_is_active  boolean NOT NULL DEFAULT true,
  prof_created_at timestamptz NOT NULL DEFAULT now(),
  prof_updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
  acc_id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  acc_usr_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acc_name            text NOT NULL,
  acc_type            text NOT NULL DEFAULT 'bank'
                        CHECK (acc_type IN ('bank','cash','credit_card','savings','investment')),
  acc_currency        text NOT NULL DEFAULT 'EUR'
                        CHECK (acc_currency IN ('EUR','USD','GBP','CHF','JPY')),
  acc_initial_balance numeric(15,2) NOT NULL DEFAULT 0,
  acc_current_balance numeric(15,2) NOT NULL DEFAULT 0,
  acc_color           text,
  acc_icon            text,
  acc_is_active       boolean NOT NULL DEFAULT true,
  acc_created_at      timestamptz NOT NULL DEFAULT now(),
  acc_updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acc_usr_id ON accounts(acc_usr_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
-- cat_type values (in English — UI labels are handled separately in the frontend):
--   income | fixed_expense | variable_expense | saving | investment
-- Note: transfers are NOT a category type — they are 2 linked transactions (expense + income)
CREATE TABLE categories (
  cat_id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cat_usr_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_parent_id  uuid REFERENCES categories(cat_id) ON DELETE SET NULL,
  cat_name       text NOT NULL,
  cat_type       text NOT NULL DEFAULT 'variable_expense'
                   CHECK (cat_type IN ('income','fixed_expense','variable_expense','saving','investment')),
  cat_color      text,
  cat_icon       text,
  cat_is_system  boolean NOT NULL DEFAULT false,
  cat_is_visible boolean NOT NULL DEFAULT true,
  cat_created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cat_usr_id ON categories(cat_usr_id);
CREATE INDEX idx_cat_parent_id ON categories(cat_parent_id);

-- ============================================================
-- RECURRING TRANSACTIONS (antes de transactions por FK)
-- ============================================================
CREATE TABLE recurring_transactions (
  rec_id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rec_usr_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rec_acc_id         uuid NOT NULL,
  rec_cat_id         uuid REFERENCES categories(cat_id) ON DELETE SET NULL,
  rec_name           text NOT NULL,
  rec_amount         numeric(15,2) NOT NULL CHECK (rec_amount > 0),
  rec_is_variable    boolean NOT NULL DEFAULT false,
  rec_type           text NOT NULL CHECK (rec_type IN ('income','expense')),
  rec_notes          text,
  rec_frequency      text NOT NULL DEFAULT 'monthly'
                       CHECK (rec_frequency IN ('daily','weekly','monthly','yearly')),
  rec_day_of_month   integer CHECK (rec_day_of_month BETWEEN 1 AND 31),
  rec_start_date     date NOT NULL DEFAULT CURRENT_DATE,
  rec_end_date       date,
  rec_last_generated date,
  rec_is_active      boolean NOT NULL DEFAULT true,
  rec_created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rec_usr_id ON recurring_transactions(rec_usr_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
-- tx_type: only 'income' or 'expense'.
-- Transfers between accounts = 2 rows (expense on origin + income on destination)
-- linked by the same tx_transfer_pair_id UUID.
CREATE TABLE transactions (
  tx_id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_usr_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_acc_id           uuid NOT NULL REFERENCES accounts(acc_id) ON DELETE RESTRICT,
  tx_cat_id           uuid REFERENCES categories(cat_id) ON DELETE SET NULL,
  tx_rec_id           uuid REFERENCES recurring_transactions(rec_id) ON DELETE SET NULL,
  tx_transfer_pair_id uuid,
  tx_amount           numeric(15,2) NOT NULL CHECK (tx_amount > 0),
  tx_type             text NOT NULL CHECK (tx_type IN ('income','expense')),
  tx_date             date NOT NULL DEFAULT CURRENT_DATE,
  tx_notes            text,
  tx_is_pending       boolean NOT NULL DEFAULT false,
  tx_source           text NOT NULL DEFAULT 'manual'
                        CHECK (tx_source IN ('manual','voice','receipt','import','automatic')),
  tx_attachment_url   text,
  tx_metadata         jsonb,
  tx_created_at       timestamptz NOT NULL DEFAULT now(),
  tx_updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_usr_id    ON transactions(tx_usr_id);
CREATE INDEX idx_tx_acc_id    ON transactions(tx_acc_id);
CREATE INDEX idx_tx_cat_id    ON transactions(tx_cat_id);
CREATE INDEX idx_tx_date      ON transactions(tx_date DESC);
CREATE INDEX idx_tx_pair      ON transactions(tx_transfer_pair_id)
  WHERE tx_transfer_pair_id IS NOT NULL;

-- FK de recurring_transactions → accounts (deferred aquí por orden de creación)
ALTER TABLE recurring_transactions
  ADD CONSTRAINT fk_rec_acc_id
  FOREIGN KEY (rec_acc_id) REFERENCES accounts(acc_id) ON DELETE RESTRICT;

-- Trigger: actualizar acc_current_balance automáticamente
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tx_type = 'income' THEN
      UPDATE accounts SET acc_current_balance = acc_current_balance + NEW.tx_amount
        WHERE acc_id = NEW.tx_acc_id;
    ELSE
      UPDATE accounts SET acc_current_balance = acc_current_balance - NEW.tx_amount
        WHERE acc_id = NEW.tx_acc_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tx_type = 'income' THEN
      UPDATE accounts SET acc_current_balance = acc_current_balance - OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    ELSE
      UPDATE accounts SET acc_current_balance = acc_current_balance + OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revertir efecto anterior
    IF OLD.tx_type = 'income' THEN
      UPDATE accounts SET acc_current_balance = acc_current_balance - OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    ELSE
      UPDATE accounts SET acc_current_balance = acc_current_balance + OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    END IF;
    -- Aplicar nuevo efecto
    IF NEW.tx_type = 'income' THEN
      UPDATE accounts SET acc_current_balance = acc_current_balance + NEW.tx_amount
        WHERE acc_id = NEW.tx_acc_id;
    ELSE
      UPDATE accounts SET acc_current_balance = acc_current_balance - NEW.tx_amount
        WHERE acc_id = NEW.tx_acc_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tx_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- ============================================================
-- FINANCIAL CONFIG
-- ============================================================
CREATE TABLE financial_config (
  fcfg_id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fcfg_usr_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  fcfg_monthly_income_target numeric(15,2),
  fcfg_pct_fixed_expense     integer DEFAULT 0 CHECK (fcfg_pct_fixed_expense BETWEEN 0 AND 100),
  fcfg_pct_variable_expense  integer DEFAULT 0 CHECK (fcfg_pct_variable_expense BETWEEN 0 AND 100),
  fcfg_pct_saving            integer DEFAULT 0 CHECK (fcfg_pct_saving BETWEEN 0 AND 100),
  fcfg_pct_investment        integer DEFAULT 0 CHECK (fcfg_pct_investment BETWEEN 0 AND 100),
  fcfg_updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (
    fcfg_pct_fixed_expense + fcfg_pct_variable_expense +
    fcfg_pct_saving + fcfg_pct_investment <= 100
  )
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE budgets (
  bud_id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bud_usr_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bud_cat_id     uuid NOT NULL REFERENCES categories(cat_id) ON DELETE CASCADE,
  bud_amount     numeric(15,2) NOT NULL CHECK (bud_amount > 0),
  bud_period     text NOT NULL DEFAULT 'monthly' CHECK (bud_period IN ('monthly','yearly')),
  bud_start_date date NOT NULL DEFAULT CURRENT_DATE,
  bud_end_date   date,
  bud_created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bud_usr_id, bud_cat_id, bud_period, bud_start_date)
);

CREATE INDEX idx_bud_usr_id ON budgets(bud_usr_id);

-- ============================================================
-- TRIGGERS DE NUEVO USUARIO
-- ============================================================

-- Función para semillar categorías base al registrarse
CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (cat_usr_id, cat_name, cat_type, cat_is_system) VALUES
    -- Gastos fijos
    (p_user_id, 'Alquiler',            'fixed_expense',    true),
    (p_user_id, 'Seguros',             'fixed_expense',    true),
    (p_user_id, 'Suministros',         'fixed_expense',    true),
    (p_user_id, 'Suscripciones',       'fixed_expense',    true),
    -- Gastos variables
    (p_user_id, 'Supermercado',        'variable_expense', true),
    (p_user_id, 'Restaurantes',        'variable_expense', true),
    (p_user_id, 'Transporte',          'variable_expense', true),
    (p_user_id, 'Ocio',                'variable_expense', true),
    (p_user_id, 'Ropa',                'variable_expense', true),
    (p_user_id, 'Salud',               'variable_expense', true),
    -- Ahorro
    (p_user_id, 'Fondo de emergencia', 'saving',           true),
    (p_user_id, 'Ahorro general',      'saving',           true),
    -- Inversión
    (p_user_id, 'Broker',              'investment',       true),
    (p_user_id, 'Fondos',              'investment',       true),
    -- Ingresos
    (p_user_id, 'Nómina',              'income',           true),
    (p_user_id, 'Freelance',           'income',           true),
    (p_user_id, 'Otros ingresos',      'income',           true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: crear perfil + categorías base al registrarse.
-- Reglas:
--   · El primer usuario registrado recibe rol 'admin' automáticamente.
--   · En entorno 'staging': solo se permite el primer usuario (el admin).
--     Intentos posteriores se registran con rate limiting y se abortan.
--   · En entorno 'production': todos los usuarios siguientes reciben 'user'.
--
-- El entorno se lee de app.settings.app_env:
--   ALTER DATABASE postgres SET app.settings.app_env = 'staging';
-- Rate limit: máximo 5 intentos fallidos por IP en 15 minutos.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role        text;
  v_env         text;
  v_count       integer;
  v_ip          text;
  v_recent_attempts integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM profiles;
  v_env := current_setting('app.settings.app_env', true);

  -- ── Bloqueo de staging ────────────────────────────────────────────────────
  IF v_env = 'staging' AND v_count > 0 THEN

    -- Obtener IP del intento (disponible en request headers via Supabase)
    v_ip := COALESCE(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      'unknown'
    );

    -- Contar intentos recientes de esta IP (ventana de 15 minutos)
    SELECT COUNT(*) INTO v_recent_attempts
      FROM auth_rate_limit
     WHERE arl_ip = v_ip
       AND arl_attempted_at > now() - interval '15 minutes';

    -- Limpiar intentos viejos (> 1 hora) para no crecer indefinidamente
    DELETE FROM auth_rate_limit
     WHERE arl_attempted_at < now() - interval '1 hour';

    IF v_recent_attempts >= 5 THEN
      RAISE EXCEPTION 'Demasiados intentos. Espera 15 minutos.'
        USING ERRCODE = 'P0002';
    END IF;

    -- Registrar este intento fallido
    INSERT INTO auth_rate_limit (arl_ip) VALUES (v_ip);

    RAISE EXCEPTION 'Registro desactivado en entorno de staging.'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Asignar rol ───────────────────────────────────────────────────────────
  v_role := CASE WHEN v_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO profiles (prof_id, prof_full_name, prof_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  );

  PERFORM seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                ENABLE ROW LEVEL SECURITY;

-- Helper: devuelve true si el usuario autenticado tiene rol 'admin'.
-- SECURITY DEFINER + STABLE: se ejecuta con permisos del owner y se cachea
-- por query (no por fila), evitando N subqueries por cada fila escaneada.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE prof_id = auth.uid()
      AND prof_role = 'admin'
      AND prof_is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: devuelve true si el entorno actual es staging.
-- NOTA: Supabase no permite ALTER DATABASE/ROLE para parámetros GUC personalizados
-- desde el SQL Editor. En su lugar, cada proyecto tiene su propia versión de esta
-- función: el proyecto de staging devuelve true, el de producción devuelve false.
-- Esta versión (en 001_initial_schema.sql) es el TEMPLATE con lógica GUC.
-- En el proyecto staging se sobreescribe con: SELECT true
-- En el proyecto producción se sobreescribe con: SELECT false
CREATE OR REPLACE FUNCTION is_staging()
RETURNS boolean AS $$
  SELECT current_setting('app.settings.app_env', true) = 'staging'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: usuario válido = autenticado + activo + (si staging → solo admin).
-- Usado como condición base en todas las policies de usuario normal.
CREATE OR REPLACE FUNCTION is_valid_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE prof_id = auth.uid()
      AND prof_is_active = true
      AND (
        NOT is_staging()           -- en producción: cualquier usuario activo
        OR prof_role = 'admin'     -- en staging: solo admins
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ────────────────────────────────────────────────
-- user: solo su propio perfil, solo si es un usuario válido en este entorno
CREATE POLICY "prof_own" ON profiles
  USING (prof_id = auth.uid() AND is_valid_user())
  WITH CHECK (prof_id = auth.uid() AND is_valid_user());

-- admin: todos los perfiles
CREATE POLICY "prof_admin" ON profiles
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── ACCOUNTS ────────────────────────────────────────────────
CREATE POLICY "acc_own" ON accounts
  USING (acc_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (acc_usr_id = auth.uid() AND is_valid_user());

CREATE POLICY "acc_admin" ON accounts
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── CATEGORIES ──────────────────────────────────────────────
CREATE POLICY "cat_own" ON categories
  USING (cat_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (cat_usr_id = auth.uid() AND is_valid_user());

CREATE POLICY "cat_admin" ON categories
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── TRANSACTIONS ────────────────────────────────────────────
CREATE POLICY "tx_own" ON transactions
  USING (tx_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (
    tx_usr_id = auth.uid()
    AND is_valid_user()
    AND EXISTS (
      SELECT 1 FROM accounts
      WHERE acc_id = tx_acc_id
        AND acc_usr_id = auth.uid()
    )
  );

CREATE POLICY "tx_admin" ON transactions
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── RECURRING TRANSACTIONS ───────────────────────────────────
CREATE POLICY "rec_own" ON recurring_transactions
  USING (rec_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (
    rec_usr_id = auth.uid()
    AND is_valid_user()
    AND EXISTS (
      SELECT 1 FROM accounts
      WHERE acc_id = rec_acc_id
        AND acc_usr_id = auth.uid()
    )
  );

CREATE POLICY "rec_admin" ON recurring_transactions
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── FINANCIAL CONFIG ─────────────────────────────────────────
CREATE POLICY "fcfg_own" ON financial_config
  USING (fcfg_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (fcfg_usr_id = auth.uid() AND is_valid_user());

CREATE POLICY "fcfg_admin" ON financial_config
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── BUDGETS ──────────────────────────────────────────────────
CREATE POLICY "bud_own" ON budgets
  USING (bud_usr_id = auth.uid() AND is_valid_user())
  WITH CHECK (bud_usr_id = auth.uid() AND is_valid_user());

CREATE POLICY "bud_admin" ON budgets
  USING (is_admin())
  WITH CHECK (is_admin());

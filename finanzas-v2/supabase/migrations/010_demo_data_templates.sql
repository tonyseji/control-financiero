-- Migration 010: Demo Data Templates (N:N architecture)
-- Purpose: Refactor demo data from per-user generation to shared templates
-- Change: Instead of 40 tx per user (redundant), create 40 fixed templates that users link to
-- Benefit: Scales O(1) instead of O(N users); easier maintenance

-- ============================================================================
-- STEP 1: Create demo_data_templates table (40 fixed transactions)
-- ============================================================================

CREATE TABLE demo_data_templates (
  ddt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddt_tx_type TEXT NOT NULL CHECK (ddt_tx_type IN ('income', 'expense')),
  ddt_amount DECIMAL(12, 2) NOT NULL,
  ddt_date_offset INT NOT NULL,  -- days offset from TODAY (e.g., -30 for 1 month ago)
  ddt_cat_name TEXT NOT NULL,     -- category name (will be looked up per user)
  ddt_cat_type TEXT NOT NULL CHECK (ddt_cat_type IN ('income', 'fixed_expense', 'variable_expense', 'saving', 'investment')),
  ddt_note TEXT,
  ddt_order INT NOT NULL,         -- maintain insertion order
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for listing templates in order
CREATE INDEX idx_demo_templates_order ON demo_data_templates (ddt_order ASC);

-- ============================================================================
-- STEP 2: Create user_demo_access table (N:N relationship)
-- ============================================================================

CREATE TABLE user_demo_access (
  uda_user_id UUID NOT NULL REFERENCES profiles(prof_id) ON DELETE CASCADE,
  uda_template_id UUID NOT NULL REFERENCES demo_data_templates(ddt_id) ON DELETE CASCADE,
  uda_is_active BOOLEAN DEFAULT TRUE,
  uda_expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '12 hours',
  uda_created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (uda_user_id, uda_template_id)
);

-- Indexes for cleanup and queries
CREATE INDEX idx_user_demo_access_expires ON user_demo_access (uda_expires_at);
CREATE INDEX idx_user_demo_access_active ON user_demo_access (uda_user_id, uda_is_active) WHERE uda_is_active = TRUE;

-- ============================================================================
-- STEP 3: Insert 40 demo transactions (template data - GENERIC, no user-specific)
-- ============================================================================

-- Month -2 (2 months ago) - Ingresos
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('income', 2500.00, -58, 'Salary', 'income', 'Nómina febrero', 1),
('income', 650.00, -45, 'Freelance', 'income', 'Proyecto consultoría', 2);

-- Month -2 - Gastos Fijos
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 1200.00, -55, 'Rent', 'fixed_expense', 'Alquiler piso', 3),
('expense', 120.00, -52, 'Utilities', 'fixed_expense', 'Luz y agua', 4),
('expense', 80.00, -51, 'Gym', 'fixed_expense', 'Cuota gimnasio', 5),
('expense', 50.00, -48, 'Insurance', 'fixed_expense', 'Seguros hogar', 6),
('expense', 40.00, -46, 'Subscriptions', 'fixed_expense', 'Netflix suscripción', 7),
('expense', 15.00, -43, 'Subscriptions', 'fixed_expense', 'Spotify premium', 8),
('expense', 40.00, -40, 'Subscriptions', 'fixed_expense', 'Adobe Creative Cloud', 9);

-- Month -2 - Gastos Variables
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 95.00, -54, 'Groceries', 'variable_expense', 'Carrefour compra semanal', 10),
('expense', 87.00, -49, 'Groceries', 'variable_expense', 'Mercadona compra semanal', 11),
('expense', 92.00, -44, 'Groceries', 'variable_expense', 'Carrefour compra semanal', 12),
('expense', 78.00, -39, 'Groceries', 'variable_expense', 'Mercadona compra semanal', 13),
('expense', 35.00, -47, 'Restaurants', 'variable_expense', 'Comida con amigos', 14),
('expense', 28.00, -42, 'Restaurants', 'variable_expense', 'Cena viernes', 15),
('expense', 45.00, -37, 'Restaurants', 'variable_expense', 'Almuerzo laborable', 16),
('expense', 22.00, -50, 'Entertainment', 'variable_expense', 'Cine 2 entradas', 17),
('expense', 15.00, -35, 'Entertainment', 'variable_expense', 'Entrada museo', 18),
('expense', 60.00, -41, 'Transport', 'variable_expense', 'Gasolina', 19),
('expense', 55.00, -36, 'Transport', 'variable_expense', 'Gasolina', 20),
('expense', 48.00, -30, 'Transport', 'variable_expense', 'Abono transporte mes', 21);

-- Month -2 - Ahorro
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 300.00, -28, 'Emergency Fund', 'saving', 'Aporte fondo emergencia', 22);

-- Month -2 - Inversión
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 200.00, -25, 'Index Fund', 'investment', 'Aporte fondo índice', 23);

-- ============================================================================
-- Month -1 (last month) - Ingresos
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('income', 2500.00, -28, 'Salary', 'income', 'Nómina marzo', 24),
('income', 750.00, -15, 'Freelance', 'income', 'Proyecto desarrollo web', 25);

-- Month -1 - Gastos Fijos
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 1200.00, -27, 'Rent', 'fixed_expense', 'Alquiler piso', 26),
('expense', 110.00, -24, 'Utilities', 'fixed_expense', 'Luz y agua', 27),
('expense', 80.00, -21, 'Gym', 'fixed_expense', 'Cuota gimnasio', 28),
('expense', 50.00, -18, 'Insurance', 'fixed_expense', 'Seguros hogar', 29),
('expense', 40.00, -16, 'Subscriptions', 'fixed_expense', 'Netflix suscripción', 30),
('expense', 15.00, -13, 'Subscriptions', 'fixed_expense', 'Spotify premium', 31),
('expense', 40.00, -10, 'Subscriptions', 'fixed_expense', 'Adobe Creative Cloud', 32);

-- Month -1 - Gastos Variables
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 102.00, -26, 'Groceries', 'variable_expense', 'Carrefour compra semanal', 33),
('expense', 95.00, -19, 'Groceries', 'variable_expense', 'Mercadona compra semanal', 34),
('expense', 88.00, -14, 'Groceries', 'variable_expense', 'Carrefour compra semanal', 35),
('expense', 79.00, -9, 'Groceries', 'variable_expense', 'Mercadona compra semanal', 36),
('expense', 40.00, -20, 'Restaurants', 'variable_expense', 'Cena viernes con amigos', 37),
('expense', 32.00, -12, 'Restaurants', 'variable_expense', 'Almuerzo laborable', 38),
('expense', 18.00, -22, 'Entertainment', 'variable_expense', 'Entrada concierto', 39),
('expense', 65.00, -8, 'Transport', 'variable_expense', 'Gasolina', 40);

-- Month -1 - Ahorro & Inversión
INSERT INTO demo_data_templates (ddt_tx_type, ddt_amount, ddt_date_offset, ddt_cat_name, ddt_cat_type, ddt_note, ddt_order) VALUES
('expense', 300.00, -5, 'Emergency Fund', 'saving', 'Aporte fondo emergencia', 41),
('expense', 200.00, -2, 'Index Fund', 'investment', 'Aporte fondo índice', 42);

-- ============================================================================
-- STEP 4: RLS Policies for demo tables
-- ============================================================================

ALTER TABLE demo_data_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_demo_access ENABLE ROW LEVEL SECURITY;

-- demo_data_templates: admins can manage, valid users can read
CREATE POLICY "demo_templates_admin_all" ON demo_data_templates
  FOR ALL USING (is_admin());

CREATE POLICY "demo_templates_users_read" ON demo_data_templates
  FOR SELECT USING (is_valid_user());

-- user_demo_access: users can see their own access, admins can manage all
CREATE POLICY "user_demo_access_own" ON user_demo_access
  FOR SELECT USING (uda_user_id = auth.uid() AND is_valid_user());

CREATE POLICY "user_demo_access_admin" ON user_demo_access
  FOR ALL USING (is_admin());

-- ============================================================================
-- STEP 5: Modify handle_new_user() trigger to use templates
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role             text;
  v_env              text;
  v_count            integer;
  v_ip               text;
  v_recent_attempts  integer;
  v_account_id       uuid;
BEGIN
  SET search_path = public;

  SELECT COUNT(*) INTO v_count FROM profiles;
  v_env := current_setting('app.settings.app_env', true);

  -- ── Bloqueo de staging ─────────────────────────────────────────────────────
  IF v_env = 'staging' AND v_count > 0 THEN
    v_ip := COALESCE(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      'unknown'
    );

    SELECT COUNT(*) INTO v_recent_attempts
      FROM auth_rate_limit
     WHERE arl_ip = v_ip
       AND arl_attempted_at > now() - interval '15 minutes';

    DELETE FROM auth_rate_limit
     WHERE arl_attempted_at < now() - interval '1 hour';

    IF v_recent_attempts >= 5 THEN
      RAISE EXCEPTION 'Demasiados intentos. Espera 15 minutos.'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO auth_rate_limit (arl_ip) VALUES (v_ip);

    RAISE EXCEPTION 'Registro desactivado en entorno de staging.'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Asignar rol ────────────────────────────────────────────────────────────
  v_role := CASE WHEN v_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO profiles (prof_id, prof_full_name, prof_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  );

  PERFORM seed_default_categories(NEW.id);

  -- ── Create default account ──────────────────────────────────────────────────
  INSERT INTO accounts (
    acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance, acc_current_balance
  ) VALUES (
    NEW.id, 'Mi Cuenta', 'bank', 'EUR', 5000.00, 5000.00
  )
  RETURNING acc_id INTO v_account_id;

  -- ── Link user to demo data templates ─────────────────────────────────────
  INSERT INTO user_demo_access (uda_user_id, uda_template_id, uda_expires_at)
  SELECT NEW.id, ddt_id, NOW() + INTERVAL '12 hours'
  FROM demo_data_templates;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- ============================================================================
-- Recreate trigger with updated function
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

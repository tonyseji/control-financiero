-- ============================================================
-- MIGRATION 009: Demo Data Support
-- ============================================================
-- Add demo data support columns to transactions table.
-- Demo transactions are marked for auto-cleanup 12 hours after signup.
--
-- Changes:
-- 1. Add tx_is_demo BOOLEAN column (default FALSE)
-- 2. Add demo_expires_at TIMESTAMP column
-- 3. Create indexes for efficient filtering
-- 4. Create function to generate realistic demo data
-- 5. Modify handle_new_user() to call demo data generator

-- ============================================================
-- ALTER transactions TABLE
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN tx_is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN demo_expires_at TIMESTAMP;

COMMENT ON COLUMN transactions.tx_is_demo IS 'Demo data marked for auto-cleanup 12h after signup';
COMMENT ON COLUMN transactions.demo_expires_at IS 'Timestamp when demo record should be auto-deleted';

-- Index for fast filtering of real (non-demo) transactions
-- Common query: WHERE tx_is_demo = false AND tx_usr_id = $user_id
CREATE INDEX idx_tx_demo_user ON transactions(tx_usr_id, tx_is_demo)
  WHERE tx_is_demo = false;

-- Index for cleanup job: find expired demo transactions
CREATE INDEX idx_tx_demo_expires ON transactions(demo_expires_at)
  WHERE tx_is_demo = true AND demo_expires_at IS NOT NULL;

-- ============================================================
-- FUNCTION: Generate Demo Data for New User
-- ============================================================
-- Creates 40 realistic demo transactions (20/month × 2 months)
-- Distributed: incomes (1-2), fixed expenses (8-10), variable (5-6), saving (1-2), investment (1)
-- Dates: random within last 2 months
CREATE OR REPLACE FUNCTION generate_demo_data(p_user_id uuid, p_account_id uuid)
RETURNS void AS $$
DECLARE
  v_demo_expires TIMESTAMP;
  v_month_start DATE;
  v_month_end DATE;
  v_cat_id uuid;
  v_random_date DATE;
  v_amount NUMERIC;
  v_note TEXT;
BEGIN
  v_demo_expires := now() + INTERVAL '12 hours';

  -- Create 40 demo transactions spanning last 2 months
  -- Período: últimos 2 meses (desde hace 60 días hasta hoy)
  v_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  v_month_end := CURRENT_DATE;

  -- ── INCOME: 3 transacciones realistas en 2 meses ────────────────────────

  -- Salary (nómina) - first of each month
  FOR i IN 0..1 LOOP
    v_random_date := DATE_TRUNC('month', CURRENT_DATE - (INTERVAL '1 month' * i))::DATE;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Nómina'
        AND cat_type = 'income'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'income', 2500,
      v_random_date, 'Nómina ' || to_char(v_random_date, 'Month'),
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Freelance income - 1-2 random dates
  v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;
  SELECT cat_id INTO v_cat_id FROM categories
    WHERE cat_usr_id = p_user_id
      AND cat_name = 'Freelance'
      AND cat_type = 'income'
    LIMIT 1;

  INSERT INTO transactions (
    tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
    tx_notes, tx_source, tx_is_demo, demo_expires_at
  ) VALUES (
    p_user_id, p_account_id, v_cat_id, 'income',
    500 + (RANDOM() * 300)::NUMERIC,
    v_random_date,
    'Proyecto freelance completado',
    'automatic', TRUE, v_demo_expires
  );

  -- ── FIXED EXPENSES: 9 transacciones realistas ───────────────────────────

  -- Rent (alquiler) - 1st of each month
  FOR i IN 0..1 LOOP
    v_random_date := DATE_TRUNC('month', CURRENT_DATE - (INTERVAL '1 month' * i))::DATE + 1;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Alquiler'
        AND cat_type = 'fixed_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense', 1200,
      v_random_date, 'Alquiler piso',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Utilities (suministros) - 2 per month
  FOR i IN 0..3 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Suministros'
        AND cat_type = 'fixed_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense',
      80 + (RANDOM() * 40)::NUMERIC,
      v_random_date,
      'Factura electricidad y agua',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Gym subscription (suscripciones) - once per month
  FOR i IN 0..1 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Suscripciones'
        AND cat_type = 'fixed_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense', 40,
      v_random_date, 'Cuota gym mensual',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Insurance (seguros) - once per month
  FOR i IN 0..1 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Seguros'
        AND cat_type = 'fixed_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense', 150,
      v_random_date, 'Seguro de coche',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- ── VARIABLE EXPENSES: 12 transacciones realistas ───────────────────────

  -- Groceries (supermercado) - 3-4 per month
  FOR i IN 0..5 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Supermercado'
        AND cat_type = 'variable_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense',
      50 + (RANDOM() * 80)::NUMERIC,
      v_random_date,
      'Compra semanal supermercado',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Restaurants (restaurantes) - 2-3 per month
  FOR i IN 0..4 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Restaurantes'
        AND cat_type = 'variable_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense',
      20 + (RANDOM() * 35)::NUMERIC,
      v_random_date,
      'Cena con amigos',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Entertainment (ocio) - 1-2 per month
  FOR i IN 0..2 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Ocio'
        AND cat_type = 'variable_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense',
      15 + (RANDOM() * 25)::NUMERIC,
      v_random_date,
      'Entrada cine / evento',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- Transport (transporte) - 2 per month
  FOR i IN 0..3 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Transporte'
        AND cat_type = 'variable_expense'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense',
      30 + (RANDOM() * 40)::NUMERIC,
      v_random_date,
      'Gasolina / transporte público',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- ── SAVING: 2 transacciones ────────────────────────────────────────────

  FOR i IN 0..1 LOOP
    v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

    SELECT cat_id INTO v_cat_id FROM categories
      WHERE cat_usr_id = p_user_id
        AND cat_name = 'Fondo de emergencia'
        AND cat_type = 'saving'
      LIMIT 1;

    INSERT INTO transactions (
      tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
      tx_notes, tx_source, tx_is_demo, demo_expires_at
    ) VALUES (
      p_user_id, p_account_id, v_cat_id, 'expense', 300,
      v_random_date,
      'Ahorro fondo de emergencia',
      'automatic', TRUE, v_demo_expires
    );
  END LOOP;

  -- ── INVESTMENT: 1 transacción ──────────────────────────────────────────

  v_random_date := v_month_start + (RANDOM() * (v_month_end - v_month_start))::INTEGER;

  SELECT cat_id INTO v_cat_id FROM categories
    WHERE cat_usr_id = p_user_id
      AND cat_name = 'Fondos'
      AND cat_type = 'investment'
    LIMIT 1;

  INSERT INTO transactions (
    tx_usr_id, tx_acc_id, tx_cat_id, tx_type, tx_amount, tx_date,
    tx_notes, tx_source, tx_is_demo, demo_expires_at
  ) VALUES (
    p_user_id, p_account_id, v_cat_id, 'expense', 200,
    v_random_date,
    'Aportación fondo índice',
    'automatic', TRUE, v_demo_expires
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- UPDATE handle_new_user() to call demo data generator
-- ============================================================
-- Modify the trigger function to generate demo data after creating profile and categories

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role        text;
  v_env         text;
  v_count       integer;
  v_ip          text;
  v_recent_attempts integer;
  v_account_id  uuid;
BEGIN
  SET search_path = public;

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

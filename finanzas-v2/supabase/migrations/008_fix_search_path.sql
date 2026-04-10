-- ============================================================
-- FIX: SET search_path = public en todas las funciones SECURITY DEFINER
-- ============================================================
-- Sin este fix, un atacante que pueda crear objetos en un schema no-public
-- podría hacer shadow de tablas como `profiles` o `accounts`, corrompiendo
-- la lógica de RLS o los balances de cuentas.
--
-- Afecta: update_account_balance, seed_default_categories,
--         handle_new_user, is_admin, is_staging, is_valid_user
-- ============================================================

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
    IF OLD.tx_type = 'income' THEN
      UPDATE accounts SET acc_current_balance = acc_current_balance - OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    ELSE
      UPDATE accounts SET acc_current_balance = acc_current_balance + OLD.tx_amount
        WHERE acc_id = OLD.tx_acc_id;
    END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (cat_usr_id, cat_name, cat_type, cat_is_system) VALUES
    (p_user_id, 'Alquiler',            'fixed_expense',    true),
    (p_user_id, 'Seguros',             'fixed_expense',    true),
    (p_user_id, 'Suministros',         'fixed_expense',    true),
    (p_user_id, 'Suscripciones',       'fixed_expense',    true),
    (p_user_id, 'Supermercado',        'variable_expense', true),
    (p_user_id, 'Restaurantes',        'variable_expense', true),
    (p_user_id, 'Transporte',          'variable_expense', true),
    (p_user_id, 'Ocio',                'variable_expense', true),
    (p_user_id, 'Ropa',                'variable_expense', true),
    (p_user_id, 'Salud',               'variable_expense', true),
    (p_user_id, 'Fondo de emergencia', 'saving',           true),
    (p_user_id, 'Ahorro general',      'saving',           true),
    (p_user_id, 'Broker',              'investment',       true),
    (p_user_id, 'Fondos',              'investment',       true),
    (p_user_id, 'Nómina',              'income',           true),
    (p_user_id, 'Freelance',           'income',           true),
    (p_user_id, 'Otros ingresos',      'income',           true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role             text;
  v_env              text;
  v_count            integer;
  v_ip               text;
  v_recent_attempts  integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM profiles;
  v_env := current_setting('app.settings.app_env', true);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE prof_id = auth.uid()
      AND prof_role = 'admin'
      AND prof_is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_staging()
RETURNS boolean AS $$
  SELECT current_setting('app.settings.app_env', true) = 'staging'
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_valid_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE prof_id = auth.uid()
      AND prof_is_active = true
      AND (
        NOT is_staging()
        OR prof_role = 'admin'
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

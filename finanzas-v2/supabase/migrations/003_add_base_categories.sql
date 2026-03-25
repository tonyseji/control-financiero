-- Migration: 003_add_base_categories | Date: 2026-03-25 | Author: backend-specialist
-- Añade Gimnasio, Internet (fixed_expense) y Gasolina, Deporte (variable_expense)
-- a las categorías base. Actualiza la función seed para nuevos usuarios
-- e inserta directamente para usuarios ya existentes.

-- ── 1. Actualizar función seed para nuevos usuarios ───────────────────────────

CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (cat_usr_id, cat_name, cat_type, cat_is_system) VALUES
    -- Gastos fijos
    (p_user_id, 'Alquiler',            'fixed_expense',    true),
    (p_user_id, 'Seguros',             'fixed_expense',    true),
    (p_user_id, 'Suministros',         'fixed_expense',    true),
    (p_user_id, 'Suscripciones',       'fixed_expense',    true),
    (p_user_id, 'Gimnasio',            'fixed_expense',    true),
    (p_user_id, 'Internet',            'fixed_expense',    true),
    -- Gastos variables
    (p_user_id, 'Supermercado',        'variable_expense', true),
    (p_user_id, 'Restaurantes',        'variable_expense', true),
    (p_user_id, 'Transporte',          'variable_expense', true),
    (p_user_id, 'Ocio',                'variable_expense', true),
    (p_user_id, 'Ropa',                'variable_expense', true),
    (p_user_id, 'Salud',               'variable_expense', true),
    (p_user_id, 'Gasolina',            'variable_expense', true),
    (p_user_id, 'Deporte',             'variable_expense', true),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. Insertar para usuarios ya registrados (no duplicar si ya existen) ─────

INSERT INTO categories (cat_usr_id, cat_name, cat_type, cat_is_system)
SELECT u.id, c.cat_name, c.cat_type, true
FROM auth.users u
CROSS JOIN (VALUES
  ('Gimnasio', 'fixed_expense'   ),
  ('Internet', 'fixed_expense'   ),
  ('Gasolina', 'variable_expense'),
  ('Deporte',  'variable_expense')
) AS c(cat_name, cat_type)
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE cat_usr_id = u.id
    AND cat_name = c.cat_name
);

-- ── 3. Verificación ───────────────────────────────────────────────────────────

SELECT cat_name, cat_type, cat_is_system
FROM categories
WHERE cat_name IN ('Gimnasio', 'Internet', 'Gasolina', 'Deporte')
ORDER BY cat_type, cat_name;

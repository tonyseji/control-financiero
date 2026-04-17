-- Migration 022: Fix demo template category names to match Spanish seed categories
-- Problem: templates had English names (Groceries, Restaurants, etc.) that didn't match
-- the user's seed categories (Supermercado, Restaurantes, etc.), causing all variable_expense
-- demos to fall back to the first cat of that type (Supermercado) instead of correct mapping.

UPDATE demo_data_templates SET ddt_cat_name = 'Nómina'         WHERE ddt_cat_name = 'Salary';
UPDATE demo_data_templates SET ddt_cat_name = 'Freelance'      WHERE ddt_cat_name = 'Freelance'; -- ya coincide
UPDATE demo_data_templates SET ddt_cat_name = 'Alquiler'       WHERE ddt_cat_name = 'Rent';
UPDATE demo_data_templates SET ddt_cat_name = 'Suministros'    WHERE ddt_cat_name = 'Utilities';
UPDATE demo_data_templates SET ddt_cat_name = 'Gimnasio'       WHERE ddt_cat_name = 'Gym';
UPDATE demo_data_templates SET ddt_cat_name = 'Seguros'        WHERE ddt_cat_name = 'Insurance';
UPDATE demo_data_templates SET ddt_cat_name = 'Suscripciones'  WHERE ddt_cat_name = 'Subscriptions';
UPDATE demo_data_templates SET ddt_cat_name = 'Supermercado'   WHERE ddt_cat_name = 'Groceries';
UPDATE demo_data_templates SET ddt_cat_name = 'Restaurantes'   WHERE ddt_cat_name = 'Restaurants';
UPDATE demo_data_templates SET ddt_cat_name = 'Ocio'           WHERE ddt_cat_name = 'Entertainment';
UPDATE demo_data_templates SET ddt_cat_name = 'Transporte'     WHERE ddt_cat_name = 'Transport';
UPDATE demo_data_templates SET ddt_cat_name = 'Fondo de emergencia' WHERE ddt_cat_name = 'Emergency Fund';
UPDATE demo_data_templates SET ddt_cat_name = 'Fondos'              WHERE ddt_cat_name = 'Index Fund';

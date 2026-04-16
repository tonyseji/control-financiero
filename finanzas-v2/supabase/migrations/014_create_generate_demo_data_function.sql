-- ============================================================
-- MIGRATION 014: Create generate_demo_data() function
-- ============================================================
-- Purpose: Insert demo template links into user_demo_access (NOT transactions).
-- Called by handle_new_user() trigger on new user registration.
--
-- Architecture: N:N via user_demo_access — templates are shared, no per-user
-- transaction rows are created. The frontend reads demo data by joining
-- user_demo_access with demo_data_templates.

CREATE OR REPLACE FUNCTION generate_demo_data(p_user_id uuid, p_account_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_demo_access (uda_user_id, uda_template_id, uda_is_active, uda_expires_at)
  SELECT
    p_user_id,
    ddt_id,
    TRUE,
    NOW() + INTERVAL '12 hours'
  FROM demo_data_templates
  ORDER BY ddt_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

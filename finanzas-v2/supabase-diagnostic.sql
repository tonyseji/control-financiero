-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: ¿Por qué falla el signup con error 422?
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecuta este script en Supabase SQL Editor para diagnosticar el problema.
--
-- PASO 1: Verifica que las funciones existen
-- PASO 2: Verifica que las tablas están OK
-- PASO 3: Test manual del trigger
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PASO 1: Verifica las funciones ────────────────────────────────────────

-- 1a. ¿Existe handle_new_user?
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'handle_new_user'
LIMIT 1;

-- 1b. ¿Existe generate_demo_data?
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'generate_demo_data'
LIMIT 1;

-- 1c. ¿Existe seed_default_categories?
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'seed_default_categories'
LIMIT 1;

-- ─── PASO 2: Verifica las tablas ──────────────────────────────────────────

-- 2a. ¿Existe y está bien la tabla profiles?
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2b. ¿Existe y está bien la tabla accounts?
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;

-- 2c. ¿Existe y está bien la tabla categories?
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- 2d. ¿Cuántos usuarios existen en staging?
SELECT COUNT(*) as total_profiles FROM profiles;

-- 2e. ¿Hay error de rate_limit?
SELECT COUNT(*) as rate_limit_entries FROM auth_rate_limit;
SELECT * FROM auth_rate_limit ORDER BY arl_attempted_at DESC LIMIT 10;

-- ─── PASO 3: Test manual (SIN ejecutar realmente) ───────────────────────────

-- Si todo lo anterior está bien, el problema es probablemente:
-- - Email/password inválido (muy corto, formato inválido)
-- - El trigger falla internamente
-- - Las capas 0/2/3 de seguridad están bloqueando

-- Intenta con estos datos:
-- Email: test@example.com
-- Password: Test123456 (min 6 caracteres)
-- Observa si ves error 422 en la consola del navegador

-- Si sigue fallando, ejecuta esto para ver el último error:
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 20;

-- O verifica los logs de la Edge Function auth-hook:
-- Dashboard → Edge Functions → auth-hook → Invocations

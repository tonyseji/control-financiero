# Progreso Archivado — Finanzas V2

> Historial de sesiones anteriores al estado actual.
> Para el log detallado completo: `git log --follow docs/progress.md`
> No cargar en contexto de IA — es solo referencia humana.

---

## 2026-03-22 — Fixes de código + seguridad git + commits

### Fixes aplicados (Claude Code)

**`Accounts.jsx`:** último hex hardcodeado → `var(--income)` / `var(--expense)`. Zero hex hardcoded en toda la app.

**`Dashboard.jsx`:** resumen anual con `useMemo annualSummary` — 3 tarjetas (ingresos totales, gastos, balance) visibles solo en modo Año.

**`Transactions.jsx`:** `filterText` + input de búsqueda en tiempo real por `tx_notes` y `categories.cat_name`.

### Seguridad git
- `finanzas-v2/.gitignore` — excluye `.env.staging`, `.env.production`, `.env.local`, `supabase/.temp/`
- `control-financiero-app/.gitignore` — excluye `.vite/`
- Auditoría pre-commit: ningún `.env.*` con valores reales en el índice git

### Commits
1. `feat: añadir finanzas-v2 — app React + Supabase con UI completa`
2. `chore: mover legacy a carpeta legacy/ + excluir .vite/ de control-financiero-app`

**Estado roadmap:** Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ (parcial)

---

## 2026-03-21 — Rediseño completo de UI (dark mode inicial)

Rediseño total del sistema visual con dark mode (`#080b12` + `#4f91ff`).
Clases reutilizables: `.card`, `.badge`, `.num`, `.skeleton`.
Layout.jsx con sidebar glassmorphism + FAB circular para añadir en mobile.
Dashboard, Transactions, AddTransaction, Auth rediseñados.

---

## 2026-03-21 — Bug fix: Database error saving new user (500)

**Root cause:** `handle_new_user()` y `seed_default_categories()` eran `SECURITY DEFINER` sin `SET search_path = public`. Al ejecutarse como owner (`postgres`), perdían el search_path → "relation does not exist" → Supabase lo envolvía como 500.

**Fix:** Recrear ambas funciones con `SET search_path = public` + añadir policy `profiles_insert_system` (INSERT WITH CHECK true) para el trigger sin sesión activa.

**Lección permanente:** Toda función `SECURITY DEFINER` en Supabase necesita `SET search_path = public`.

**Resultado:** Signup end-to-end confirmado · auth-hook desplegada · secrets configurados ✅

---

## 2026-03-21 — Frontend: scaffolding completo de vistas

Layout.jsx + main.css (responsive, sidebar desktop, bottom nav mobile).
Vistas implementadas: Dashboard, Transactions, AddTransaction, Accounts, Categories, Settings.
Budget como stub pendiente.

**Protocolo de trabajo establecido:**
- Claude Code = código (React, SQL, npm, git)
- Cowork = navegador (Supabase Dashboard, Google Cloud, .env)

---

## 2026-03-20 — Seguridad, roles, auth completa y entornos

- Auth: Google OAuth + Email/Password + recuperación de contraseña
- Roles: `prof_role ('user'|'admin')` + `prof_is_active` en profiles
- Funciones SQL: `is_admin()` · `is_staging()` · `is_valid_user()` (SECURITY DEFINER STABLE)
- RLS: 14 policies `_own` + `_admin` en todas las tablas
- Seguridad staging: 4 capas (auth-hook + trigger + frontend + RLS)
- Entornos: `.env.staging` / `.env.production` (gitignored) + `VITE_APP_ENV`

---

## 2026-03-20 — Supabase staging configurado y operativo

- Proyecto `gestor-financiero` creado (`fuuvsfkxyppjrtrqyzdy.supabase.co`)
- `001_initial_schema.sql` ejecutado (7 tablas + triggers + RLS)
- Google OAuth configurado + bucket `receipts` creado
- `.env.staging` completo ✅
- `is_staging()` hardcodeada a `true` (Supabase no permite ALTER DATABASE en plan free)

---

## 2026-03-20 — Schema SQL v2.1 + scaffolding frontend

10 bugs/inconsistencias corregidos en `001_initial_schema.sql`:
- Eliminado `'transfer'` del CHECK de `tx_type` (dead code)
- Unificados valores `cat_type` en inglés
- Añadidos `tx_is_pending`, `rec_name`, `bud_end_date`, index `idx_tx_cat_id`
- `WITH CHECK` explícito en todas las policies

Scaffolding frontend: supabase.js, App.jsx, services/ completo, hooks/ (useAuth, useAccounts, useCategories, useTransactions), utils/ (constants, formatters, validators). Sin Zustand.

---

## 2026-03-19 — Arquitectura + schema inicial + organización

- Arquitectura V2 decidida: Supabase + Vite + Web Speech API + Claude/GPT Vision
- Schema diseñado: 7 tablas (`profiles`, `accounts`, `categories`, `transactions`, `recurring_transactions`, `financial_config`, `budgets`)
- SQL de migración completo en `supabase/migrations/001_initial_schema.sql`
- Estructura de carpetas creada · CLAUDE.md · docs/ inicializados
- Carpeta `Organizador Finanzas` reorganizada: legacy/ creado, finanzas-v2/ limpia
- V1 se mantiene en producción y no se toca

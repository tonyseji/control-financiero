# Log de Progreso — Finanzas V2

Actualizar este archivo al final de cada sesión de trabajo.
Formato: `## YYYY-MM-DD — Resumen`

---

## 2026-03-21 — Rediseño completo de UI

**Hecho:**
- Rediseño total del sistema visual — el diseño anterior era plano y sin jerarquía
- Nuevo sistema de variables CSS en `main.css` (paleta `#080b12` + azul `#4f91ff` + verde/rojo income/expense)
- Clases reutilizables: `.card`, `.badge`, `.num`, `.skeleton`
- **Layout.jsx**: sidebar con logo + icono SVG, barra activa, FAB circular para "Añadir" en mobile
- **Dashboard.jsx**: tarjetas stat con icono coloreado, barras de progreso en categorías, skeleton loading, chip de tasa de ahorro
- **Transactions.jsx**: pills de resumen, filas con cápsula de color, estado vacío elegante, botones SVG
- **AddTransaction.jsx**: importe grande y prominente (1.75rem), toggle de tipo con colores, campos limpios
- **Auth.jsx**: glow radial de fondo, logo centrado, campos con iconos inline

**Pendiente (pausado para hacer diseño primero):**
- `receipt-ocr` Edge Function (Claude Vision) — creada pero sin integración frontend
- Hook `useVoiceInput.js` — no iniciado
- Botones cámara/micrófono en `AddTransaction.jsx` — no iniciado

---

## 2026-03-19 — Sesión inicial: estructura y diseño

**Hecho:**
- Decidida arquitectura V2: Supabase + Vite + Web Speech API + Claude/GPT Vision
- Descartados: Google Sheets (no escala), localStorage solo, Railway (innecesario con Supabase), n8n (fase futura)
- Diseñado esquema de BD: 6 tablas (`profiles`, `accounts`, `categories`, `transactions`, `recurring_transactions`, `budgets`)
- SQL de migración completo en `supabase/migrations/001_initial_schema.sql`
- Creada estructura de carpetas `finanzas-v2/`
- Creados: `CLAUDE.md`, `docs/db-schema.md`, `docs/roadmap.md`, `docs/progress.md`

**Decisiones clave tomadas:**
- V1 (`control-financiero-app/`) se mantiene en producción, NO se toca
- V2 se construye en `finanzas-v2/app/` (repo GitHub separado)
- Cowork (este chat) = planificación, documentación, Supabase config via navegador
- Claude Code (terminal) = código, npm, git, push

**Próximo paso:**
- Fase 1: crear proyecto en Supabase y ejecutar la migración SQL
- URL: https://supabase.com/dashboard → New project

---

## 2026-03-19 (continuación) — Esquema definitivo + organización de carpetas

**Hecho:**
- Revisadas y cerradas las 7 tablas una a una: `profiles`, `accounts`, `categories`, `transactions`, `recurring_transactions`, `financial_config`, `budgets`
- Decisiones clave tomadas en sesión:
  - Tipos de categoría (en inglés, igual que el resto de valores CHECK): `income` · `fixed_expense` · `variable_expense` · `saving` · `investment` · `transfer`
  - Categorías base (`cat_is_system = true`): solo ocultables, no editables ni eliminables
  - `financial_config` separada de `profiles` para objetivos y porcentajes de presupuesto
  - `budgets` 100% opcional — nadie obligado a usarlos
  - Recurrentes con `rec_is_variable`: genera transacción marcada "pendiente de confirmar"
  - Convención de nombres adoptada: `prefijo_tabla_campo` en inglés, snake_case; labels en español en la app
  - Esquema 100% portable a cualquier PostgreSQL; solo auth + storage son específicos de Supabase
- Reorganizada carpeta "Organizador Finanzas": archivos legacy movidos a `legacy/`, `finanzas-v2/` limpia
- `db-schema.md` y `001_initial_schema.sql` actualizados con convención de nombres definitiva

**Próximo paso:**
- Fase 1: crear proyecto en Supabase y ejecutar la migración SQL
- Pendiente commit git: `git add -A && git commit -m "refactor: reorganizar estructura — legacy/ y finanzas-v2/"`

---

## 2026-03-20 — Revisión schema SQL + scaffolding frontend

**Hecho:**
- Revisados y corregidos 10 bugs/inconsistencias en `001_initial_schema.sql` (v2.1):
  - Eliminado `'transfer'` del CHECK de `tx_type` (dead code; transferencias = 2 filas con `tx_transfer_pair_id`)
  - Corregida doble definición de `handle_new_user()` — trigger se ejecutaba sin seed de categorías
  - Unificados valores de `cat_type` en inglés: `fixed_expense`, `variable_expense`, `saving`, `investment`
  - Añadidos campos faltantes: `tx_is_pending`, `rec_name`, `bud_end_date`
  - Añadido index `idx_tx_cat_id`
  - Añadido `WITH CHECK` explícito en todas las 7 RLS policies
  - Añadido CHECK suma ≤ 100 en `financial_config`
- Actualizados `db-schema.md` y `CLAUDE.md` para alinearse con SQL corregido
- Scaffolding frontend completado en `app/src/`:
  - `supabase.js` — cliente Supabase singleton
  - `main.jsx` + `App.jsx` — entry point + routing auth/app
  - `services/` — CRUD completo: auth, transactions (+ transfer), accounts, categories, recurring, budgets, config
  - `hooks/` — useAuth, useAccounts, useCategories, useTransactions (con filtros de fecha)
  - `utils/constants.js` — optionsets con labels en español
  - `utils/formatters.js` — formatCurrency, formatDate, formatPct
  - `utils/validators.js` — validación de formularios
  - Eliminada carpeta `store/` (Zustand innecesario; arquitectura simplificada a services + hooks)

**Decisiones:**
- Sin Zustand: estado gestionado por hooks React + Supabase. Añadir si surge necesidad real.
- `deleteAccount` hace soft-delete (`acc_is_active = false`) por la FK RESTRICT en transactions
- `createTransfer` genera 2 filas enlazadas con `crypto.randomUUID()` como `tx_transfer_pair_id`

**Próximo paso:**
- Fase 1: crear proyecto en Supabase → ejecutar `001_initial_schema.sql` en el SQL Editor
- Fase 2: `package.json` + `vite.config.js` → `npm install` → `npm run dev`

---

## 2026-03-20 (continuación) — Seguridad, roles, auth y entornos

**Hecho:**

**Autenticación completa:**
- `services/auth.js` ampliado: Google OAuth + Email/Password + recuperación de contraseña (`resetPasswordForEmail` / `updatePassword`)
- `hooks/useAuth.js` actualizado: expone `session`, `user`, `profile`, `role`, `isAdmin`, `isActive`, `loading`

**Roles de usuario:**
- Añadidos `prof_role text CHECK('user','admin')` y `prof_is_active boolean` a tabla `profiles`
- Trigger `handle_new_user()` actualizado: primer usuario registrado → `admin`; resto → `user`
- Funciones SQL helper:
  - `is_admin()` — SECURITY DEFINER STABLE, comprueba rol + activo
  - `is_staging()` — lee `app.settings.app_env`
  - `is_valid_user()` — en staging exige admin; en prod cualquier usuario activo
- RLS ampliado: cada tabla tiene ahora policy `_own` (usa `is_valid_user()`) + policy `_admin` (usa `is_admin()`)
- `services/auth.js`: funciones admin `getAllProfiles()`, `setUserRole()`, `setUserActive()`

**Entornos (staging + producción):**
- Dos proyectos Supabase independientes: `finanzas-v2-staging` y `finanzas-v2-prod`
- Archivos: `.env.example` (commiteado), `.env.staging` y `.env.production` (gitignored)
- `.gitignore` actualizado para cubrir ambos archivos
- Variable `VITE_APP_ENV` para lógica condicional en el frontend
- `roadmap.md` actualizado con pasos detallados para crear los dos proyectos

**Seguridad máxima en staging (4 capas independientes):**
- **Capa 0** — Edge Function `supabase/functions/auth-hook/index.ts`: intercepta el login ANTES de emitir JWT; bloquea a no-admins; imposible de bypassear desde el cliente
- **Capa 1** — Trigger SQL `handle_new_user()`: bloquea registro de nuevos usuarios; rate limiting 5 intentos/IP/15min con tabla `auth_rate_limit`
- **Capa 2** — `App.jsx`: guardia frontend; si staging + no admin → `<StagingBlocked>` + signOut automático; también cubre cuentas desactivadas (`<AccountDisabled>`)
- **Capa 3** — RLS `is_valid_user()`: fallback absoluto en BD; aunque exista JWT, todas las queries fallan para no-admins en staging

**Decisiones tomadas:**
- No encriptar columnas de importe (pgcrypto): incompatible con `SUM()`/`AVG()`/índices necesarios para analytics; protección suficiente con TLS + AES-256 en reposo + RLS. Revisable si el proyecto escala a compliance
- Sin Zustand: services + hooks es suficiente. Añadir si surge necesidad real
- Staging completamente cerrado: solo el primer usuario (admin) puede entrar; producción abierta a registro normal

**Archivos creados/modificados en esta sesión:**
- `supabase/migrations/001_initial_schema.sql` — tabla `auth_rate_limit`, funciones `is_admin/is_staging/is_valid_user`, trigger actualizado, RLS ampliado con `_admin` policies
- `supabase/functions/auth-hook/index.ts` — Edge Function nueva
- `app/src/App.jsx` — guardia de staging + cuentas desactivadas
- `app/src/services/auth.js` — auth completa + funciones admin
- `app/src/hooks/useAuth.js` — expone role, isAdmin, isActive, profile
- `app/.env.example` — documentación multi-entorno
- `app/.env.staging` / `app/.env.production` — plantillas por entorno (gitignored)
- `app/.gitignore` — cubre .env.staging y .env.production
- `docs/roadmap.md` — Fase 1 reescrita con pasos para dos proyectos Supabase
- `CLAUDE.md` — secciones Entornos y Seguridad completamente actualizadas

**Próximo paso:**
1. Crear proyecto `finanzas-v2-staging` en Supabase Dashboard
2. Ejecutar `001_initial_schema.sql` en SQL Editor
3. Ejecutar `ALTER DATABASE postgres SET app.settings.app_env = 'staging';`
4. Habilitar Google OAuth + Email/Password en Authentication
5. Desplegar Edge Function `auth-hook` y registrarla en Authentication → Hooks
6. Crear bucket `receipts` en Storage
7. Copiar credenciales a `.env.staging`
8. Arrancar: `package.json` + `vite.config.js` → `npm install` → `npm run dev`

---

## 2026-03-20 (continuación) — Supabase configurado y operativo

**Hecho:**
- Proyecto Supabase creado: `gestor-financiero` (renombrado de `finanzas-v2-staging`)
  - URL: `https://fuuvsfkxyppjrtrqyzdy.supabase.co`
  - Región: West EU (Ireland)
- `001_initial_schema.sql` ejecutado con éxito en SQL Editor ("Success. No rows returned")
  - 7 tablas creadas: `auth_rate_limit`, `profiles`, `accounts`, `categories`, `recurring_transactions`, `transactions`, `financial_config`, `budgets`
  - Triggers: `trg_tx_balance`, `on_auth_user_created` + funciones `seed_default_categories`, `handle_new_user`
  - RLS habilitado en todas las tablas; 14 policies (`_own` + `_admin`) + helpers `is_admin/is_staging/is_valid_user`
- Email/Password Auth: habilitado por defecto ✓
- Google OAuth: ✓ configurado y habilitado en Supabase
  - Client ID: `513502562101-adsci64u8c8nr7baq400d6t94smvfl6a.apps.googleusercontent.com`
  - JS origin: `http://localhost:5173`
  - Redirect URI: `https://fuuvsfkxyppjrtrqyzdy.supabase.co/auth/v1/callback`
  - Client Secret: guardado en Supabase (no registrar en texto plano)
- Bucket `receipts` creado: privado, 10 MB, MIME: jpeg/png/webp/heic/pdf ✓
- `.env.staging` — COMPLETO ✓
  - `VITE_SUPABASE_URL=https://fuuvsfkxyppjrtrqyzdy.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` — legacy anon key pegada
  - `VITE_APP_ENV=staging`

**Pendiente Fase 1:**
- [x] Pegar anon key en `.env.staging` ✓
- [x] Añadir `antonio.secojimenez@gmail.com` como usuario de prueba en Google Cloud ✓
- [x] ~~Ejecutar ALTER DATABASE...~~ — No posible en Supabase; `is_staging()` hardcodeada a `true`
- [ ] Desplegar Edge Function `auth-hook` (Claude Code: `supabase functions deploy auth-hook`)
- [ ] Registrar auth-hook en Supabase → Authentication → Auth Hooks

**Fase 1 completada al 100% — todo listo para Fase 2**

**Próximo paso — Claude Code:**
1. `package.json` + `vite.config.js` → `npm install` → `npm run dev`
2. Scaffolding React: servicios, hooks, vistas principales
3. `supabase functions deploy auth-hook`
4. Registrar hook en Supabase → Authentication → Auth Hooks

---

## 2026-03-21 — Bug fix: Database error saving new user (500)

**Bug resuelto:** `AuthApiError: Database error saving new user` (HTTP 500) al registrarse desde el frontend.

**Root cause:** `handle_new_user()` y `seed_default_categories()` son `SECURITY DEFINER` pero no tenían `SET search_path = public`. Al ejecutarse como owner (`postgres`), perdían el search_path y no encontraban la tabla `profiles` — PostgreSQL lanzaba "relation does not exist" internamente, Supabase Auth lo envolvía como 500.

**Fix aplicado en Supabase SQL Editor:**
- `handle_new_user()` → recreada con `SET search_path = public` + lógica completa (staging check, rol dinámico admin/user, llamada a seed)
- `seed_default_categories()` → recreada con `SET search_path = public`
- Verificado: `prosecdef=true`, `proconfig=["search_path=public"]` ✓
- Añadida policy `profiles_insert_system` (INSERT WITH CHECK true) para permitir el INSERT del trigger cuando no hay sesión activa (auth.uid() = NULL)

**Lección:** Toda función `SECURITY DEFINER` en Supabase debe incluir `SET search_path = public` para evitar pérdida del search_path al cambiar de rol.

**Estado tras el fix:**
- [x] Google OAuth configurado y funcionando
- [x] `.env.staging` completo
- [x] Trigger functions corregidas
- [x] Signup end-to-end confirmado — usuario creado en `auth.users` + `profiles` ✓
- [x] Deploy Edge Function `auth-hook` (`supabase functions deploy auth-hook`) ✓
- [x] Secrets `APP_ENV=staging` + `SUPABASE_SERVICE_ROLE_KEY` añadidos en Edge Functions ✓
- [x] Hook registrado en Supabase → Authentication → Auth Hooks → Before User Created ✓
- [x] Policy `profiles_insert_system` (INSERT WITH CHECK true) añadida para permitir INSERT del trigger sin sesión activa

---

## 2026-03-21 — Frontend: scaffolding completo de vistas

**Hecho:**

**Layout y navegación:**
- `src/components/Layout.jsx` — shell con sidebar (desktop) + bottom nav (móvil), navegación entre vistas
- `src/styles/main.css` — reset global + responsive (sidebar oculto en móvil, bottom nav visible)
- `src/App.jsx` — router por estado `view`, pasa `onNavigate` al Layout

**Vistas implementadas:**
- `Dashboard` — 4 tarjetas (patrimonio, ingresos, gastos, balance del mes), cuentas, top 5 categorías por gasto, últimas 5 transacciones
- `Transactions` — historial agrupado por fecha con navegación mes/año, eliminación con confirmación
- `AddTransaction` — formulario completo (tipo ingreso/gasto, importe, fecha, categoría filtrada por tipo, cuenta, nota)
- `Accounts` — CRUD de cuentas con soft-delete
- `Categories` — CRUD con selector de color (10 colores), agrupadas por tipo
- `Settings` — perfil del usuario + cerrar sesión
- `Budget` — stub (pendiente implementar)

**Protocolo de trabajo establecido:**
- Claude Code = código (React, SQL, npm, git)
- Cowork = navegador (Supabase Dashboard, Google Cloud, .env)
- Tony = orquestador
- Guardado en memoria: `~/.claude/projects/.../memory/feedback_protocol_cowork.md`

**Próximos pasos:**
- [x] Compilar sin errores ✓
- [ ] Crear primera cuenta bancaria + primera transacción para validar el flujo completo
- [x] Implementar vista Budget ✓ (sesión 2026-03-21)
- [x] Añadir navegación a Accounts/Categories desde Settings ✓

---

## 2026-03-21 — Bugs críticos, mejoras UI y vista Budget

**Bugs corregidos:**

- **`createTransaction` sin `tx_usr_id`** — el insert fallaba con NOT NULL violation + RLS violation. Fix: el service obtiene `user.id` de `supabase.auth.getUser()` e inyecta `tx_usr_id` igual que ya hacía `createTransfer`. También se añade `select('*, accounts, categories')` para que el resultado devuelto sea consistente con `getTransactions`.
- **`upsertConfig` sin `fcfg_usr_id`** — mismo patrón. Fix en `services/config.js`.
- **`upsertBudget` sin `bud_usr_id`** — mismo patrón. Fix en `services/budgets.js`. Añadido `select('*, categories(...)')` al upsert.
- **Fecha range con `-31` hardcoded** — `Dashboard` y `Transactions` usaban `to: YYYY-MM-31`, incorrecto para febrero y meses de 30 días. Fix: nueva función `monthRange(year, month)` en `utils/formatters.js` que calcula el último día real con `new Date(year, month, 0).getDate()`. Usada en ambas vistas.

**Mejoras a vistas existentes:**

- **`Settings.jsx`** — añadidos botones "Cuentas bancarias" y "Categorías" que navegan a esas vistas vía `onNavigate`. `App.jsx` ya pasaba `setView` — solo se añadió `onNavigate` al prop de Settings.
- **`Transactions.jsx`** — barra de resumen del mes (ingresos / gastos / balance) que aparece cuando hay transacciones, entre el header y el listado. Cálculo memoizado.
- **`AddTransaction.jsx`** — auto-selección de primera cuenta si solo hay una (`useEffect` sobre `accounts`). Auto-selección de primera categoría del tipo activo al cambiar el toggle ingreso/gasto (`useEffect` sobre `type` + `categories`). Eliminado el `setCatId('')` manual al hacer click en el toggle (lo gestiona el efecto).

**Vista Budget (implementada desde cero):**

- `src/hooks/useBudgets.js` — hook nuevo que carga `getActiveBudgets()` + `getConfig()` en paralelo (`Promise.all`). Expone `saveConfig`, `saveBudget`, `removeBudget` con actualización optimista del estado.
- `src/views/Budget.jsx` — tres secciones:
  - **ConfigSection** — muestra/edita `financial_config`: ingreso objetivo mensual + % por tipo (fijos, variables, ahorro, inversión). Indicador de suma en tiempo real (verde si ≤100%, rojo si excede). Modo lectura / modo edición con toggle.
  - **OverviewSection** — barras de progreso por tipo de categoría. Compara gasto real del mes (de `useTransactions`) vs límite calculado `(pct * income_target) / 100`. Semáforo: gastos = verde→amarillo→rojo; ahorro/inversión = inverso (rojo si bajo, verde si alcanzado). Solo visible si hay `income_target` configurado.
  - **CategoryBudgets** — CRUD de presupuestos por categoría individual. Select filtra categorías que no tienen presupuesto ya asignado. Barras de progreso por categoría. Eliminación con confirmación doble.

**Archivos modificados:**
- `app/src/services/transactions.js`
- `app/src/services/config.js`
- `app/src/services/budgets.js`
- `app/src/utils/formatters.js`
- `app/src/views/Dashboard.jsx`
- `app/src/views/Transactions.jsx`
- `app/src/views/AddTransaction.jsx`
- `app/src/views/Settings.jsx`
- `app/src/views/Budget.jsx`
- `app/src/App.jsx`

**Archivos nuevos:**
- `app/src/hooks/useBudgets.js`

**Próximos pasos:**
- [ ] Validar flujo completo: crear cuenta → crear transacción → ver en Dashboard y Transactions
- [ ] Validar Budget: configurar ingreso objetivo → ver barras de progreso
- [ ] Posible: edición de transacciones (ahora solo hay eliminación)
- [ ] Posible: input por voz (Web Speech API) en AddTransaction

---

## 2026-03-21 — Fix OWASP API3: usr_id faltante en services + helper centralizado

**Auditoría de seguridad (OWASP API3 — Broken Object Level Authorization):**
Todos los services que hacen INSERT deben inyectar el `user_id` desde la sesión autenticada del servidor, nunca confiar en que el cliente lo envíe. Se identificaron 3 services sin este control.

**Fix aplicado:**
- `src/supabase.js` — nueva función `getAuthUserId()`: obtiene `user.id` de `supabase.auth.getUser()` y lanza error si no hay sesión. Centraliza el patrón para todos los services.
- `src/services/accounts.js` — `createAccount` inyecta `acc_usr_id: await getAuthUserId()`
- `src/services/categories.js` — `createCategory` inyecta `cat_usr_id: await getAuthUserId()`
- `src/services/recurring.js` — `createRecurring` inyecta `rec_usr_id: await getAuthUserId()`
- (transactions, config, budgets ya corregidos en sesión anterior con patrón inline)

**Estado services tras auditoría — todos los CREATE incluyen usr_id:**
- `accounts.js` ✅ `categories.js` ✅ `recurring.js` ✅ `transactions.js` ✅ `config.js` ✅ `budgets.js` ✅

**UX:**
- `Accounts.jsx` — saldo inicial marcado como opcional en placeholder (ya era opcional en lógica, ahora queda claro en UI)

**Skills usadas esta sesión:**
- `secure-code-guardian` → auditoría OWASP API3, patrón `getAuthUserId()` centralizado
- `react-expert` → ya cargado, guía para forms y efectos

**Próximos pasos:**
- [x] Validar flujo completo end-to-end: cuenta → transacción → dashboard ✓
- [ ] Validar Budget funciona tras fix de bud_usr_id

---

## 2026-03-21 — Validación end-to-end confirmada

- [x] Flujo completo verificado: crear cuenta bancaria → crear transacción → visible en Supabase ✓
- [x] `acc_usr_id` fix confirmado correcto ✓
- [x] Categorías usuario existente sembradas manualmente con `SELECT public.seed_default_categories(prof_id) FROM profiles WHERE prof_id NOT IN (SELECT DISTINCT cat_usr_id FROM categories)` — para usuarios nuevos funciona automáticamente vía trigger ✓
- Fase 2 y Fase 3 del roadmap completadas al 90% — queda editar transacción y transferencias

---

## 2026-03-21 — Fase 3 completa + Fase 4 features

**Skills activas:** `react-expert` (hooks, efectos, componentes), `secure-code-guardian` (OWASP API3)

### Fase 3 completada

**Editar transacción:**
- `App.jsx` — estado `editTx` + función `navigate(view, tx)` que reemplaza `setView`. Pasa `editTx` a AddTransaction y `onEdit` a Transactions.
- `AddTransaction.jsx` — reescrito para soportar modo edición vía prop `editTx`. Si existe, pre-pobla el form y llama `update()` en submit. Modo creación llama `add()` o `addTransfer()` según el tipo.

**Transferencias entre cuentas:**
- Tercer toggle "Transferencia" en AddTransaction. Muestra cuenta origen + cuenta destino (filtrando la misma cuenta en destino). Llama `createTransfer` del service. Transferencias en Transactions.jsx muestran "Transferencia" en lugar de categoría y no tienen botón editar (son pares enlazados).

### Fase 4 implementada

**Búsqueda global (`src/components/SearchModal.jsx`):**
- Modal overlay activado desde botón 🔍 en Layout (sidebar desktop + header contenido).
- Carga todas las transacciones una sola vez al abrir (sin filtro de fecha).
- Filtrado en tiempo real por nota o categoría. Cierre con Escape o click fuera.
- Resultados agrupados por mes con neto del mes. Contador de resultados.

**Gráfica evolución mensual (`src/components/MonthlyChart.jsx`):**
- SVG nativo, sin dependencias. Barras agrupadas: verde (ingresos) + rojo (gastos) por mes.
- Dashboard carga los últimos 6 meses con un segundo `useTransactions` con rango calculado.
- `last6MonthsRange()` genera siempre los 6 meses aunque no tengan datos.
- Leyenda debajo del gráfico.

**Transacciones recurrentes:**
- `src/hooks/useRecurring.js` — hook con `add`, `toggle` (pausa/reanuda), `remove`.
- `src/views/Recurring.jsx` — CRUD completo: formulario con nombre, tipo, importe, frecuencia (diaria/semanal/mensual/anual), día del mes, cuenta, categoría. Lista con estado activa/pausada + eliminación con confirmación.
- Accesible desde Ajustes → Recurrentes.

**Archivos nuevos:**
- `src/components/SearchModal.jsx`
- `src/components/MonthlyChart.jsx`
- `src/hooks/useRecurring.js`
- `src/views/Recurring.jsx`

**Archivos modificados:**
- `src/App.jsx` — `navigate()`, `editTx`, casos `recurring` y `add` con `editTx`
- `src/views/AddTransaction.jsx` — modo edición + transferencias + toggle 3 tipos
- `src/views/Transactions.jsx` — prop `onEdit`, botón editar en TxRow, label transferencia
- `src/views/Settings.jsx` — botón "Recurrentes"
- `src/components/Layout.jsx` — SearchModal + botón búsqueda sidebar/header
- `src/views/Dashboard.jsx` — MonthlyChart + carga de 6 meses para chart

**Estado del roadmap:**
- Fase 3: ✅ completa (CRUD cuentas, categorías, transacciones, editar, eliminar, transferencias)
- Fase 4: ✅ parcial (búsqueda, chart, recurrentes, presupuesto) — queda: auto-generación de recurrentes al abrir app
- Fase 5 (IA): pendiente

**Próximos pasos:**
- [ ] Auto-generación de recurrentes al abrir la app (lógica en App.jsx o useRecurring)
- [ ] Input por voz — Web Speech API en AddTransaction
- [ ] Foto de ticket — Edge Function + Claude Vision

---

## 2026-03-21 — Fix: subcategorías visibles en Categories

**Problema:** `getCategories` devolvía una lista plana ignorando `cat_parent_id`. La vista agrupaba todo por tipo sin distinguir padre/hijo.

**Fix:**
- `services/categories.js` — añadido `parent:cat_parent_id(cat_id, cat_name, cat_color)` al select para traer info del padre en cada categoría
- `views/Categories.jsx` — reescrito para mostrar jerarquía:
  - Separa padres (`cat_parent_id = null`) de subcategorías
  - Agrupa padres por tipo con orden fijo: income → fixed → variable → saving → investment
  - Subcategorías aparecen indentadas con `↳` bajo su padre, fondo ligeramente diferente
  - Formulario añade select de "categoría padre" opcional, filtrado por el tipo seleccionado

**Skills activas esta sesión:** `react-expert` · `secure-code-guardian`

---

## 2026-03-21 — Auto-generación de recurrentes + fix warning media query

**Fix: warning @media en Layout.jsx**
- Eliminada línea `'@media (max-width: 768px)': { display: 'none' }` del objeto de estilos JS — los media queries no funcionan en inline styles de React. La lógica responsive ya estaba correctamente en `main.css` con `aside { display: none !important }`.

**Feature: auto-generación de recurrentes al arrancar la app**
- `services/recurring.js` — nueva función `generateDueRecurring()`:
  - Carga todos los recurrentes activos del usuario
  - Para cada uno calcula las fechas pendientes desde `rec_last_generated` (o `rec_start_date`) hasta hoy
  - Antes de insertar, comprueba si ya existe TX con `tx_rec_id + tx_date` (idempotente, sin duplicados)
  - Marca `tx_is_pending = true` si el recurrente es variable (`rec_is_variable`)
  - Actualiza `rec_last_generated` tras cada generación
  - Soporta frecuencias: `daily`, `weekly`, `monthly`, `yearly`
  - Para `monthly`: respeta `rec_day_of_month` con clamp al último día del mes (ej: 31 de febrero → 28/29)
- `App.jsx` — `useEffect` sobre `profile.prof_id`: llama `generateDueRecurring()` una vez al arrancar sesión

**Archivos modificados:**
- `app/src/services/recurring.js`
- `app/src/App.jsx`
- `app/src/components/Layout.jsx`

**Próximos pasos:**
- [ ] Input por voz — Web Speech API en AddTransaction
- [ ] Foto de ticket — Edge Function + Claude Vision

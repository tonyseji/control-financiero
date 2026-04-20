# Log de Progreso — Finanzas V2

Actualizar este archivo al final de cada sesión de trabajo.
Formato: `## YYYY-MM-DD — Resumen`
Historial completo: `docs/progress-archive.md`

---

## 2026-04-21 — UX: categorías editables, recurrentes en AddTransaction, asesor en header móvil, limpieza Settings (COMPLETADO)

### Categorías editables
- `Categories.jsx` — botón lápiz en cada categoría rellena el formulario con sus datos; título y botón cambian a "Editar categoría" / "Guardar cambios"; botón Cancelar; selector de padre oculto al editar
- `categories.js` service ya tenía `updateCategory`; `useCategories` ya exportaba `update` — sin cambios en backend

### Recurrentes inline en AddTransaction
- `AddTransaction.jsx` — toggle "Repetir mensualmente" al final del formulario (oculto en edición y transferencias)
- Al activar: campo nombre (opcional, hereda categoría) + día del mes (auto desde fecha, máx 28)
- Al guardar la transacción, crea la recurrente automáticamente via `useRecurring().add`; estado se resetea al limpiar formulario

### Asesor financiero — header en móvil
- `Layout.jsx` — icono de chat en topbar visible solo en móvil (≤768px); abre `ChatPanel` como overlay pantalla completa (`position: fixed; inset: 0`)
- `main.css` — `.floating-chat { display: none }` en móvil; `.mobile-chat-overlay` como full-screen overlay
- FloatingChat en esquina inferior derecha se mantiene intacto en desktop

### Limpieza de Settings
- Nuevo orden: Perfil → Nombre → Gestión → Seguridad → Cerrar sesión
- Eliminado bloque "Rol" (badge Admin)
- Eliminada sección "Preferencias" con selector de moneda (complejidad sin valor inmediato)
- Limpiado código muerto: constante `CURRENCIES`, estado `currency`, estilos `currencyRow/currencyBtn/currencyBtnActive/roleBadge`

**Archivos modificados:**
- `app/src/views/Categories.jsx`
- `app/src/views/AddTransaction.jsx`
- `app/src/views/Settings.jsx`
- `app/src/components/layout/Layout.jsx`
- `app/src/main.css`

**Próximos pasos:**
- Web Push notifications — recordatorio 22:30 con frases rotativas (ver instrucciones en chat para retomar en nueva sesión)
- Toggle tema claro/oscuro en Settings
- UI objetivo de ingreso mensual → `financial_config`

---

## 2026-04-20 — Mejoras responsive en pantalla de login (COMPLETADO)

**Problemas encontrados y resueltos en vista Auth (`/?auth`) en móvil:**

1. **Logo "Finanzas V2" flotando encima del formulario** — el logo estaba fuera del `formInner` como hermano del contenedor flex, quedando desalineado. Fix: mover el logo dentro de `formInner` para que forme parte del flujo del formulario.

2. **Formulario no ocupaba toda la pantalla en móvil** — `formPanel` carecía de `minHeight: 100vh`, `width: 100%` y `boxSizing: border-box`. Fix: añadir estas propiedades.

3. **Scroll cortado con teclado virtual** — `page` tenía `overflow: hidden`. Fix: cambiar a `overflowX: hidden` + `overflowY: auto`.

4. **Inputs desbordándose** — faltaba `boxSizing: border-box` en `input` y `btnGoogle`.

5. **Orden del botón de Google** — movido debajo del formulario de email/contraseña (era más natural poner primero el flujo principal y luego la alternativa OAuth).

6. **Eliminado `useEffect` que inyectaba CSS en el DOM** — era redundante con los estilos inline y propenso a bugs.

**Archivos modificados:**
- `app/src/views/Auth.jsx` — fixes responsive + reorden Google OAuth

**Próximos pasos:**
- Persistir moneda en BD desde Settings (ahora solo es estado local)
- UI para objetivo de ingreso mensual en Settings → `financial_config`

---

## 2026-04-17 — Fix experiencia usuario demo (COMPLETADO)

**Problemas encontrados y resueltos en pruebas con usuario nuevo:**

1. **Vista Análisis vacía con datos demo** — Analysis.jsx solo usaba `useTransactions()` (datos reales). Fix: añadir `useDemoData()` y mezclar con mismo patrón que Dashboard/Transactions.

2. **Categorías demo incorrectas en donut** — los templates tenían nombres en inglés (`Groceries`, `Restaurants`…) que no coincidían con el seed en español (`Supermercado`, `Restaurantes`…). Fix: migración `022_fix_demo_cat_names.sql` renombra los templates + `demo.js` hace match por nombre primero, fallback por tipo.

3. **Balance de cuenta en 0€** — `handle_new_user()` insertaba la cuenta omitiendo `acc_current_balance`, que cogía `DEFAULT 0`. Fix: migración `023_fix_account_balance.sql`:
   - Trigger `update_account_balance()` reescrito con recálculo completo (no incremental) desde transacciones reales
   - Bulk fix de cuentas existentes
   - `handle_new_user()` crea cuenta con `initial=0, current=0`
   - Balance visual con demos = `acc_current_balance + demoDelta` calculado en frontend (Dashboard, Accounts)

**Decisión de diseño — balance de cuentas:**
- `acc_current_balance` = solo transacciones reales (nunca saldo inicial ni demos)
- El saldo visual mientras hay demos activos se calcula en frontend sumando el delta de todas las demos
- Al limpiar demos, vuelve al valor real sin tocar BD

**Migraciones aplicadas en staging:**
- ✅ `022_fix_demo_cat_names.sql`
- ✅ `023_fix_account_balance.sql`

**Archivos modificados:**
- `app/src/views/Analysis.jsx` — useDemoData() integrado
- `app/src/views/Dashboard.jsx` — totalBalance incluye demoDelta
- `app/src/views/Accounts.jsx` — totalBalance y AccountCard incluyen demoDelta
- `app/src/services/demo.js` — match por nombre de categoría primero

**Próximos pasos:**
- Persistir moneda en BD desde Settings (ahora solo es estado local)
- UI para objetivo de ingreso mensual en Settings → `financial_config`
- Importar extracto bancario (PDF/CSV → Claude Vision)

---

## 2026-04-17 — Aislamiento de datos + fix categorías duplicadas (COMPLETADO)

**Problemas encontrados en pruebas con usuario nuevo:**

1. **Usuario admin veía transacciones de otros usuarios** — las policies `_admin` en tablas de datos (tx_admin, acc_admin, cat_admin, etc.) daban acceso irrestricto al admin sobre todos los datos. El diseño correcto es que cada usuario solo vea lo suyo. Fix: eliminar las 8 policies `_admin` en tablas de datos. `prof_admin` en profiles se conserva (gestión de roles).

2. **Categorías duplicadas al registrarse** — `seed_default_categories()` no tenía `ON CONFLICT`, por lo que una doble ejecución insertaba duplicados. Fix: deduplicación inmediata de existentes + constraint `UNIQUE (cat_usr_id, cat_name)` + función idempotente con `ON CONFLICT DO NOTHING`.

**Migración aplicada en staging:**
- ✅ `021_fix_admin_isolation_and_cat_duplicates.sql`

**Verificado en staging:**
- ✅ Test con usuario prueba: solo ve sus propios datos + demos
- ✅ Sin categorías duplicadas

---

## 2026-04-17 — Fix signup + permisos + getProfile (COMPLETADO)

**Problema principal:** El signup fallaba con "Database error updating user" y la app mostraba pantalla en blanco.

**Root causes encontrados y resueltos:**

1. **`SET search_path = public` en el cuerpo de `handle_new_user()`** — contaminaba el search_path de la sesión completa. Supabase Auth ejecuta `UPDATE "users"` internamente después del trigger, y con search_path = public no encontraba `auth.users`. Fix: quitar el SET del cuerpo (dejarlo solo en la firma de la función, que sí es local).

2. **`getProfile()` sin filtro explícito** — usaba `.single()` sin `.eq('prof_id', user.id)`. Con 2 admins en profiles, la policy `prof_admin` devolvía 2 filas y `.single()` fallaba con PGRST116. Fix: añadir `.eq('prof_id', user.id)` en `auth.js`.

3. **`protect_prof_role()` bloqueaba al admin de BD** — cuando `auth.uid() IS NULL` (SQL Editor / service role), `is_admin()` devuelve false y el trigger bloqueaba el UPDATE. Fix: permitir siempre cuando `auth.uid() IS NULL`.

**Migraciones aplicadas en staging:**
- ✅ `017_fix_signup_definitive.sql` — elimina staging cap del trigger (lo deja solo en auth-hook)
- ✅ `018_cleanup_session_fixes.sql` — consolida fixes manuales: protect_prof_role, handle_new_user, elimina policies de emergencia

**Estado BD staging:**
- Policies activas en profiles: `prof_own` + `prof_admin` (las dos originales, limpias)
- `handle_new_user()` sin SET search_path en el cuerpo
- `protect_prof_role()` permite cambios desde SQL Editor (auth.uid() IS NULL)
- Signup funcional: crea profile + account + categorías + demo links

**Archivos modificados:**
- `app/src/services/auth.js` — `getProfile()` ahora filtra por `prof_id = user.id`
- `supabase/migrations/017_fix_signup_definitive.sql` — nuevo
- `supabase/migrations/018_cleanup_session_fixes.sql` — nuevo

**Próximos pasos:**
- [ ] Test completo signup → ver demos en Dashboard y Transactions
- [ ] Test: clic "Limpiar" en Settings → demos desaparecen
- [ ] Verificar que migration 016 (RLS policy para limpiar demos) está aplicada en staging

---

## 2026-04-16 — Fase 6B: Frontend para datos demo (completado)

**Implementado:**
- ✅ `app/src/services/demo.js` — `getDemoTransactions()`, `clearDemoData()`, `getDemoCount()`, `getDemoExpiry()`
- ✅ `app/src/hooks/useDemoData.js` — `useDemoData()` + `formatDemoExpiry()`
- ✅ `Dashboard.jsx` — combina realTxs + demoTxs filtrados por mes/chart, banner con tiempo de expiración
- ✅ `Transactions.jsx` — ídem + bloqueo editar/borrar en txs demo + badge "Demo" en filas
- ✅ `Settings.jsx` — sección condicional "Datos de ejemplo" con contador y botón Limpiar

**Migraciones aplicadas en staging:**
- ✅ `009` al `018` aplicadas (ver entrada 2026-04-17 para detalles del fix)

---

## 2026-04-16 — Fase 6A: Demo Data Architecture — Opción 2 (Tablas separadas) — FIX

**Problema identificado (después de aplicar 012-014):**
- Error: "relation 'users' does not exist"
- Causa: Superposición de tres arquitecturas de demo data en migraciones 009, 010, 012-014
- Migración 009 insertaba directamente en `transactions` con flags de demo
- Migración 010 intentaba usar templates en `user_demo_access`
- Migraciones 012-014 intentaban hacer lo mismo pero con funciones separadas

**Solución (Migración 015):**
- ✅ DROP y recreación LIMPIA de `generate_demo_data()`
- ✅ DROP y recreación LIMPIA de `handle_new_user()`
- ✅ DROP y recreación LIMPIA de `hook_before_user_created()`
- ✅ Todas las funciones ahora usan la misma arquitectura: templates + user_demo_access
- ✅ SECURITY DEFINER + SET search_path = public en todas

**Arquitectura (definitiva, documentada en CLAUDE.md):**

| Componente | Responsabilidad |
|---|---|
| `demo_data_templates` | 42 transacciones plantilla (reutilizables, creadas en 010) |
| `user_demo_access` | Registro de templates activos + expiración por usuario |
| `transactions` | **SOLO datos reales** (sin contaminación, sin flags demo) |

**Pasos para aplicar:**
1. **En Supabase SQL Editor:**
   - Copiar y pegar el contenido de `supabase/migrations/015_fix_demo_data_architecture.sql`
   - Ejecutar
2. **Verificar en Supabase (Settings → Database):**
   - Mirar Functions: `generate_demo_data`, `handle_new_user`, `hook_before_user_created`
   - Verificar que exista el trigger `on_auth_user_created` en tabla `auth.users`
3. **En Settings → Authentication → Hooks:**
   - Verificar que `hook_before_user_created` existe
   - Verificar que `hook_before_user_created` (Edge Function si existe) tiene "Verify JWT with legacy secret" = OFF
4. **Test:**
   - Intentar registrar un nuevo usuario en la app
   - Si funciona: en SQL Editor, ejecutar: `SELECT COUNT(*) FROM user_demo_access WHERE uda_user_id = (SELECT prof_id FROM profiles ORDER BY prof_created_at DESC LIMIT 1);`
   - Debería retornar `42` (una fila por cada demo template)

**Próximos pasos después del fix:**
- [ ] Aplicar migration 015 en SQL Editor
- [ ] Test signup flow
- [ ] Si funciona: Fase 6B (frontend para mostrar y limpiar datos demo)
- [ ] Si sigue fallando: revisar logs en Supabase → SQL Editor y reportar último error SQL

---

## 2026-04-10 — Security fix: SET search_path en funciones SECURITY DEFINER

**Migración `008_fix_search_path.sql`:**
- Corrige 6 funciones `SECURITY DEFINER` que carecían de `SET search_path = public`
- Afecta: `update_account_balance`, `seed_default_categories`, `handle_new_user`, `is_admin`, `is_staging`, `is_valid_user`
- Sin el fix, un schema shadow podría redirigir queries de RLS (especialmente `is_valid_user()` que se usa en todas las policies)
- **Pendiente:** aplicar en SQL Editor de staging

---

## 2026-04-10 — Asesor IA: chat completo + admin bypass + fix seguridad

**Nuevos archivos (asesor financiero IA):**
- `app/src/components/ChatMessages.jsx` — renderiza el historial de mensajes del chat
- `app/src/components/ChatPanel.jsx` — panel principal del chat (input, voz, contador de llamadas, UI)
- `app/src/components/FloatingChat.jsx` — botón flotante que abre/cierra el ChatPanel
- `app/src/hooks/useFinancialAdvisor.js` — estado del chat: mensajes, loading, error, remainingCalls, sendQuestion
- `app/src/hooks/useFinancialData.js` — carga datos financieros del usuario (monthly_summaries) para contexto del asesor
- `app/src/services/advisor.js` — llama a la Edge Function `financial-advisor` con JWT + historial + contexto
- `app/src/utils/questionClassifier.js` — clasifica si una pregunta es personal (necesita datos) o general
- `supabase/functions/financial-advisor/` — Edge Function: valida JWT, rate-limit, construye prompt con contexto histórico, llama a Claude Haiku
- `supabase/migrations/004_advisor_calls.sql` — tabla `advisor_calls` + RPC `increment_advisor_call()` (rate-limit atómico)
- `supabase/migrations/005_monthly_summaries.sql` — tabla `monthly_summaries` + trigger que recalcula resumen al tocar transacciones
- `supabase/migrations/006_fix_monthly_summaries_savings.sql` — fix cálculo de savings en monthly_summaries

**Feature: Admin sin límite de consultas**
- `supabase/functions/financial-advisor/index.ts` — consulta `profiles.prof_id` con service role. Si `prof_role = 'admin'`, salta rate-limit. Devuelve `remainingCalls: -1` (sentinel = ilimitado).
- `app/src/hooks/useFinancialAdvisor.js` — al init consulta `prof_role`; si admin, `setRemainingCalls(-1)`. Maneja `-1` sin truncarlo a 0.
- `app/src/components/ChatPanel.jsx` — si `remainingCalls === -1`: muestra "∞ consultas", no deshabilita input.

**Fix seguridad: protección contra auto-escalada de rol**
- `supabase/migrations/007_protect_prof_role.sql` — trigger `BEFORE UPDATE` en `profiles` que bloquea cambios a `prof_role` si el ejecutor no es admin. El service role queda exento (`auth.uid() = NULL`).
- Problema cerrado: la policy `prof_own` con `WITH CHECK` genérico permitía `UPDATE profiles SET prof_role = 'admin'` desde el cliente.

**Bugs corregidos en esta sesión:**
- `profiles` tiene PK `prof_id`, no `user_id` — las queries con `.eq('user_id', ...)` devolvían null silenciosamente (admin nunca se detectaba)
- `useCallback(sendQuestion, [])` — dependencia vacía hacía que `messages` siempre fuera `[]` en el closure; la conversación no continuaba. Fix: `[messages]` como dependencia.

**Deployment a Supabase (COMPLETADO 2026-04-10):**
- ✅ Migración `007_protect_prof_role.sql` aplicada
- ✅ Toggle "Verify JWT with legacy secret" = OFF en `financial-advisor` verificado
- ✅ Edge Function `financial-advisor` redespliegada

**Estado: V12 COMPLETO EN PRODUCCIÓN** — Asesor IA funcional end-to-end con rate-limit, admin bypass, y protección de seguridad.

---

## 2026-04-09 — Fix: Asesor financiero solo veía mes actual, ignoraba histórico

**Problema reportado:** El asesor IA solo respondía sobre el mes actual. Preguntas sobre meses anteriores retornaban "no tengo información".

**Root cause:** La Edge Function `financial-advisor` estaba extrayendo el contexto histórico (`context.historicalSummary` con todos los meses anteriores) pero **NUNCA LO INCLUÍA en el system prompt de Claude**. El hook `useFinancialData.js` sí lo estaba retornando correctamente.

**Fix aplicado:**
- `supabase/functions/financial-advisor/index.ts:192-227` — Agregar sanitización y construcción de `historicalSummary` desde el contexto
- Ahora el system prompt de Claude incluye: mes actual (datos + categorías top) + histórico (últimos 12 meses con ingresos/gastos/ahorro)
- Código: extrae datos históricos, filtra a 12 meses máximo, sanitiza strings/números, agrega al prompt con formato claro

**Próximo paso:** Desplegar a Supabase (push a repo + trigger de Edge Function) para que el asesor tenga acceso al contexto histórico completo.

---

## 2026-04-07 — Fix tx_source + botón split importe (÷2 ÷3 ÷4)

**Fix `tx_source` values:**
- `AddTransaction.jsx:326` — valor `'ocr'` → `'receipt'` (consistencia con esquema BD)
- `recurring.js:71` — valor `'recurring'` → `'automatic'` (consistencia con esquema BD)

**Feature: botones de división de importe:**
- `AddTransaction.jsx` — aparecen botones ÷2 ÷3 ÷4 debajo del campo importe cuando hay un valor > 0
- Permite dividir el total de una cuenta/cena entre varias personas con un tap
- Redondeo a 2 decimales; aplica `userEdited.current.amount = true` para no conflictuar con voz

### Próximos pasos

- [ ] **Asesor financiero IA** — Edge Function `financial-advisor` + Claude API + UI de chat
- [ ] Importar extracto bancario (reutiliza arquitectura receipt-ocr cuando financial-advisor esté maduro)
- [ ] Revisar si existe algún script/CI que resetee el toggle de EF automáticamente

---

## 2026-04-07 — Fix crítico: hook `useReceiptOcr.js` truncado + re-aplicación toggle EF

**Problema reportado:** Usuario recibía error genérico "error al procesar la imagen" sin detalles específicos al subir foto de ticket en finanzas-v2.

**Root causes encontrados:**

1. **Hook truncado (BLOQUEANTE):** `app/src/hooks/useReceiptOcr.js` terminaba abruptamente sin:
   - Bloque `catch` para manejo de errores
   - Retorno final `return { scanFile, loading, error }`
   - Esto hacía que `useReceiptOcr()` retornara `undefined`, causando que `const { scanFile, ... } = useReceiptOcr()` fallara silenciosamente

2. **Toggle "Verify JWT with legacy secret" vuelto a activar:** En Supabase Dashboard, la EF `receipt-ocr` tenía el toggle nuevamente ON (estado desconocido cómo volvió a activarse). El gateway rechazaba JWT de usuario antes de ejecutar el código.

**Fixes aplicados:**

1. **Restaurar hook completo:** Completado `useReceiptOcr.js` con:
   - Bloque `catch(err)` que captura errores y actualiza estado `error` y `loading`
   - Manejo especial de `not_a_receipt` para mensaje específico al usuario
   - Retorno correcto: `return { scanFile, loading, error }`

2. **Desactivar toggle en Supabase:** Navegué a Dashboard → receipt-ocr → Settings → desactivé "Verify JWT with legacy secret" → guardé cambios. Confirmado con mensaje "Successfully updated edge function".

**Resultado:** Receipt-ocr ahora:
- Captura errores específicos en el hook (no silenciosos)
- La EF puede ejecutar correctamente (gateway no bloquea JWT)
- Usuario ve mensajes claros: "No parece un ticket válido", "No se detectó ningún ticket", etc.

**Lecciones aprendidas:**
- Los archivos hooks pueden corromperse/truncarse si se editan sin completar correctamente
- El toggle de Supabase puede revertirse (revisar si hay algún CI/CD que lo resetee)
- Siempre verificar la consola del navegador + logs de Supabase si un error es demasiado genérico

### Próximos pasos

- [ ] **Asesor financiero IA** — Edge Function `financial-advisor` + Claude API + UI de chat
- [ ] Importar extracto bancario (reutiliza arquitectura receipt-ocr cuando financial-advisor esté maduro)
- [ ] Revisar si existe algún script/CI que resetee el toggle de EF automáticamente

---

## 2026-04-06 — Fix: receipt-ocr funcionando en producción

**Bug root cause:** La Edge Function `receipt-ocr` tenía activada la opción "Verify JWT with legacy secret" en Supabase Dashboard → Edge Functions → Settings. Ese check lo hace el **gateway** antes de que el código corra — rechazaba el JWT de usuario (access token) con HTTP 401, `execution_id: null`. La función nunca llegaba a ejecutarse.

**Fix:** Desactivar el toggle "Verify JWT with legacy secret" → OFF en el dashboard. La función ya tiene su propio `supabase.auth.getUser(jwt)` que valida correctamente, lo que el propio Supabase recomienda para funciones con lógica auth propia.

**Resultado:** receipt-ocr funciona end-to-end: cámara → base64 → Edge Function → Claude Haiku Vision → campos extraídos en el formulario.

**Regla para nuevas Edge Functions:** Cualquier EF que implemente su propio auth check debe tener este toggle en OFF o el gateway bloqueará los tokens de usuario.

### Próximos pasos

- [ ] **Asesor financiero IA** — Edge Function `financial-advisor` + Claude API + UI de chat
- [ ] Importar extracto bancario (reutiliza arquitectura receipt-ocr cuando financial-advisor esté maduro)

---

## 2026-04-05 — Feature: receipt-ocr (foto de ticket)

**Edge Function `receipt-ocr`:**
- Modelo cambiado de `claude-opus-4-6` a `claude-haiku-4-5-20251001` (misma calidad para OCR, ~20x más barato)
- `ANTHROPIC_API_KEY` configurada en Supabase Secrets (staging)
- Función desplegada en Supabase

**Frontend:**
- `app/src/hooks/useReceiptOcr.js` — nuevo hook: abre cámara/galería, redimensiona imagen a máx 1200px, convierte a base64, llama a la EF con el JWT del usuario, devuelve `{ amount, merchant, date, notes }`
- `app/src/views/AddTransaction.jsx` — botón cámara añadido en `headerRow` junto al mic; aplica campos extraídos al formulario (amount, date, merchant+notes); estados de loading/feedback/error consistentes con el patrón de voz
- `app/src/styles/main.css` — animación `@keyframes spin` añadida para el spinner del botón cámara

**Roadmap:**
- `docs/roadmap.md` — marcados como completados: exportar CSV ✅ y migración datos V1 ✅
- Categorización automática standalone descartada — se absorbe en el flujo de receipt-ocr (el merchant del ticket ya provee el contexto necesario)

### Próximos pasos

- [ ] **Asesor financiero IA** — Edge Function `financial-advisor` + Claude API + UI de chat
- [ ] Importar extracto bancario (reutiliza arquitectura receipt-ocr cuando financial-advisor esté maduro)

---

## 2026-04-03 — Fix presupuesto dashboard + mejoras voz

**Fix barras de presupuesto en Dashboard:**
- `Dashboard.jsx`: las barras del presupuesto mensual usaban `income` real del mes como base, en vez del ingreso objetivo configurado. Si a mitad de mes el ingreso registrado era parcial, los porcentajes se disparaban.
- Fix: importado `useBudgets` en Dashboard; base del cálculo ahora usa `config.fcfg_monthly_income_target` (igual que `Budget.jsx`), con fallback al ingreso real si no hay objetivo configurado.

**Mejoras reconocimiento por voz:**
- `voiceParser.js`: `extractAmount` ahora soporta decimales en texto hablado — "cuarenta y cinco con cincuenta" → 45.50, "quince coma noventa y nueve" → 15.99, "tres y medio" → 3.50.
- `AddTransaction.jsx`: panel debug de voz (solo en `import.meta.env.DEV`) — muestra transcript y los 5 campos detectados con ✓/✗. Invisible en producción.
- `app/src/utils/__tests__/voiceParser.test.js`: 52 tests unitarios con Vitest cubriendo textToNumber, parseVoiceText (amount, txType, date, categoryId, accountId) y casos de integración. Requiere `npm install -D vitest @vitest/ui` + scripts `test`/`test:ui` en package.json.

### Próximos pasos

- [ ] Instalar Vitest: `cd app && npm install -D vitest @vitest/ui` + añadir scripts en package.json
- [ ] Foto de ticket — Edge Function `receipt-ocr` + Claude Vision + botón cámara en `AddTransaction.jsx`
- [ ] Categorización automática — sugerir categoría al escribir descripción, basado en historial
- [ ] Crear proyecto producción en Supabase cuando staging esté OK

---

## 2026-03-25 — Limpieza y verificación tab Transferencia

**Limpieza:**
- Eliminados 4 archivos vacíos creados por error: `80`, `Leerlo`, `div`, `finanzas-v2/app/Para`
- Añadidos al `.gitignore`: archivos vacíos + `.claude/settings*.json`
- Worktree colgado `cool-margulis` pendiente de eliminar (directorio bloqueado por VS Code — cerrar el archivo abierto y ejecutar `git worktree prune`)

**Tab Transferencia:**
- Verificado: ya estaba implementado completamente en `AddTransaction.jsx` (v anterior)
- 3 tabs: Gasto / Ingreso / Transferencia (oculto en modo edición)
- Transferencia crea 2 filas enlazadas por `tx_transfer_pair_id` via `addTransfer()` en service
- Validación: origen ≠ destino, cuenta destino requerida

### Próximos pasos

- [ ] Cerrar VS Code para poder ejecutar `git worktree prune` y limpiar `cool-margulis`
- [ ] Input por voz — `useVoiceInput.js` (Web Speech API) + botón micrófono en `AddTransaction.jsx`
- [ ] Foto de ticket — Edge Function `receipt-ocr` (Claude Vision) + botón cámara en `AddTransaction.jsx`
- [ ] Validar app en navegador (staging) antes de añadir Fase 5

---

## 2026-03-23 — Design system light mode + 6 features

**Design system:**
- Light mode activado (`#f8fafc`/`#ffffff`), paleta lovable
- Tipografía Inter con escala exacta (`--text-xs` … `--text-3xl`, tokens `--t-display` etc.)
- Recharts AreaChart con gradientes y tooltip personalizado en Dashboard
- KPI cards con `.kpi-value.pos/.neg/.cya` · Budget.jsx: zero hex hardcoded
- Sidebar: clases CSS reutilizables · `--border: #c8d3e0` · `--border-soft: #e2e8f0`

**Features añadidas:**
1. **Export CSV** en Transactions.jsx — dropdown Mes actual / Año completo, UTF-8 BOM
2. **Accounts.jsx redesign** — hero balance total, grid de cuentas con edición inline
3. **Goals.jsx** — nueva vista, localStorage `cf_v2_goals`, barras semáforo, sugerencia mensual
4. **Analysis.jsx** — nueva vista, 4 gráficas Recharts, toggle período 6m/año/todo
5. **Settings.jsx** — nombre editable en Supabase, toggle dark/light con `html.dark`
6. **Layout.jsx** — añadidos accounts / goals / analysis a NAV_ITEMS

**Commits:**
1. `feat: add Vite configuration for the project`
2. `style: refine design system — KPI colors, donut palette, summary cards, form inputs`
3. `style: polish KPI colors, filter padding, budget gap, auth title`
4. `style: switch to light mode + update Budget.jsx to CSS vars`
5. `style: typography from lovable — Inter weights, type scale, letter-spacing`

### Estado actual

- ✅ Fases 0-4 completas (auth, CRUD, transfers, recurring, budget, search, charts, design system)
- ✅ Light mode operativo · Tipografía Inter · Build limpio (740 módulos, 789 KB)
- ✅ Staging operativo (`gestor-financiero`) · Auth Google + Email/Password funcional
- ❌ Producción Supabase: pendiente crear cuando staging esté validado

---

## 2026-03-25 — Fix clasificación semántica de transacciones (txClassifier)

**Problema:** saving/investment contabilizaban como gastos normales; transfers incluidos en todos los totales.

**Cambios:**
- Nueva utilidad `app/src/utils/txClassifier.js` — 5 funciones puras: `isTransfer`, `isSaving`,
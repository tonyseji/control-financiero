# Log de Progreso — Finanzas V2

Actualizar este archivo al final de cada sesión de trabajo.
Formato: `## YYYY-MM-DD — Resumen`
Historial completo: `docs/progress-archive.md`

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

**Pendiente en Supabase (requiere acción manual):**
- Aplicar migración `007_protect_prof_role.sql` en SQL Editor de staging
- Redesplegar Edge Function `financial-advisor` (para que el admin bypass entre en efecto)
- Verificar toggle "Verify JWT with legacy secret" = OFF en `financial-advisor`

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
- Nueva utilidad `app/src/utils/txClassifier.js` — 5 funciones puras: `isTransfer`, `isSaving`, `isInvestment`, `isRealExpense`, `isIncome`. Fuente de verdad para toda la app.
- `Transactions.jsx`: métricas separadas (ingresos / gastos reales / ahorro+inv), pill "Ahorro/Inv." en el resumen, badge "Transferencia ↔", estilos teal para ahorro/inversión y neutral para transferencias, filtros de tipo ampliados (saving/investment/transfer), dayNet excluye transfers
- `Analysis.jsx`: todos los cálculos (monthlyData, categoryData, weeklyData, kpis) usan txClassifier; gráfica mensual añade línea Ahorro/Inv. (teal dashed); KPI "Tasa ahorro" calculado correctamente como savingInv/income
- `Dashboard.jsx`: métricas del mes usan txClassifier (expense = solo gastos reales, saving = saving+investment); chartData y annualSummary excluyen transfers; resumen anual añade tarjeta "Ahorro/Inv."; TxRow y DateGroup con estilos semánticos correctos

## 2026-03-25 — Fix 4 bugs de display/cálculo (validación Febrero 2026)

- **Bug 1** `Transactions.jsx` + `main.css`: importe de filas saving/investment mostraba rojo. Fix: añadida clase CSS `.tx-amount.saving { color: var(--cyan) }` y `amountCls` usa `'saving num'` en vez de `'num'` para esos tipos.
- **Bug 2** `Transactions.jsx`: pill "AHORRO/INV." mostraba signo negativo. Fix: quitado el `−` del valor — el ahorro es positivo.
- **Bug 3** `Transactions.jsx` + `Dashboard.jsx`: balance calculado como `income − expenses − savingInv`, resultando en 0 cuando ahorro = balance real. Fix: `balance = income − expenses` (el ahorro no reduce patrimonio neto, solo reclasifica).
- **Bug 4** `Dashboard.jsx` + `Analysis.jsx`: donut "Gastos por categoría" incluía categorías saving/investment. Fix: `byCategory` en Dashboard solo acumula `isRealExpense`; `categoryData` en Analysis excluye también `isSaving || isInvestment`.

## 2026-03-25 — Fix 2 bugs de display (segunda ronda)

- **Fix 1** `Transactions.jsx`: importe de filas saving/investment mostraba signo `−` en teal. Fix: `amountStr` no añade signo cuando `saving || investment` — el color teal ya comunica la semántica.
- **Fix 2** `Analysis.jsx`: chart "Gasto por día" con datos incoherentes según período. Fix: simplificado a "Gasto por día de la semana" — agrega solo `isRealExpense` del período por día (Lun–Dom), coherente en cualquier período. Semana reordenada Lun→Dom.

## 2026-03-25 — Feature: toggle de granularidad en chart "Gasto por día"

- `Analysis.jsx`: añadido mini toggle `Día sem. | Semanal | Mensual` en esquina superior derecha del chart de distribución de gastos.
- Estado local `granularity` independiente del período global.
- `buildGranData(transactions, granularity)`: función pura que produce los datos según la selección — siempre solo `isRealExpense`. Semana ISO (Lun=inicio), etiqueta `Sem N` o `SN 'YY` si año distinto al actual.
- Título de la tarjeta cambia dinámicamente: "Gasto por día de la semana" / "Gasto semanal" / "Gasto mensual".
- `ChartCard` acepta prop `headerRight` para alojar el toggle sin afectar a los demás charts.
- Estilos `miniToggle / miniBtn / miniBtnActive` añadidos al objeto `s`, visualmente consistentes con el toggle global pero más pequeños.

## 2026-03-26 — UI polish presupuesto + reorden navegación

**Budget.jsx:**
- Desglose desplegable por categorías en el resumen mensual (solo categorías con gasto, orden mayor→menor)
- Colores de importe/porcentaje en desglose usan texto por defecto (sin color heredado del tipo)
- Gasto variable: color 
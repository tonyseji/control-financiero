# Log de Progreso — Finanzas V2

Actualizar este archivo al final de cada sesión de trabajo.
Formato: `## YYYY-MM-DD — Resumen`
Historial completo: `docs/progress-archive.md`

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
- Gasto variable: color cambiado de verde `#22c55e` a naranja oscuro `#ea580c`

**Layout.jsx + main.css:**
- Nuevo orden del menú: Inicio → Movimientos → Análisis → Añadir → Presupuesto → Objetivos → Cuentas
- Ajustes eliminado del menú principal; icono de rueda dentada junto al nombre del usuario (sidebar desktop) y en el header móvil

### Próximos pasos — Fase 5 IA

- [ ] **Input por voz** — `useVoiceInput.js` (Web Speech API) + botón micrófono en `AddTransaction.jsx`
- [ ] **Foto de ticket** — Edge Function `receipt-ocr` + Claude Vision + botón cámara en `AddTransaction.jsx`
- [ ] **Categorización automática** — sugerir categoría al escribir descripción, basado en historial
- [ ] **Asesor financiero IA** — Edge Function `financial-advisor` + Claude API + UI chat
- [ ] Validar app en navegador (staging) antes de cada feature de Fase 5
- [ ] Crear proyecto producción en Supabase cuando staging esté OK

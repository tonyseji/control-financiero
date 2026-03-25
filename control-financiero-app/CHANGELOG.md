# Control Financiero V1 — Build History

> Registro de cómo se construyó este proyecto desde cero.
> No cargar en contexto de IA: es solo referencia histórica humana.

---

## v11 — 2026-03-19 · PWA en producción

- PWA instalable en móvil como app nativa
- manifest.json: name, short_name, icons, orientation, lang, categories
- public/sw.js: service worker cache-first para shell, network-only para Google Sheets API
- apple-touch-icon.png (180px) para iOS
- icon-192.png + icon-512.png generados con Pillow
- GitHub Actions: deploy.yml — build Vite + deploy a GitHub Pages en cada push a vite-migration
- URL pública: https://tonyseji.github.io/control-financiero/

## v10 — 2026-03-18 · Sync de cuentas y migración histórica

- Fix: accountId preservado en ciclos de sync con Google Sheets
  - Apps Script TX_HEADERS actualizado: incluye 'accountId'
  - syncFromSheets hace merge por id (preserva campos locales)
  - syncToSheets exportada + window.syncToSheets en main.js para DevTools
- Migración histórica: migrar-cuentas.js asigna accountId a 241 TX del Excel
  - 188 transacciones → acc1 (Cuenta principal)
  - 39 transacciones → acc2 (Cuenta comun)
  - Match por date+amount+type+note; fallback a orden de aparición

## v9 — 2026-03-17 · Cuentas bancarias

- Feature: Cuentas bancarias — número variable, crear/editar/eliminar como categorías
  - Store: cf_accounts — array {id, name}
  - Defaults: Cuenta principal, Cuenta comun, Tarjeta débito, Cuenta ahorro, Broker
  - Campo "Cuenta" en formulario añadir/editar transacción
  - Filtro por cuenta en vista Transacciones
  - Gestión de cuentas en vista Categorías (sección inferior)
  - Chip "tx-account" en cada fila de transacción
  - Al eliminar cuenta: aviso si tiene transacciones asociadas

## v8 — 2026-03-17 · Migración a Vite

- Migración a arquitectura modular ES modules en `control-financiero-app/`
  - src/utils.js, store.js, ui.js, api.js, charts.js, main.js
  - src/views/: dashboard.js, transactions.js, add-form.js, budget.js, categories.js, recurring.js, search.js
  - vite-plugin-singlefile: build genera un único HTML inline (compatible file://)
  - chart.js como npm package (no CDN) para que Vite lo bundle inline
  - window.* bindings en main.js para onclick= con ES modules
  - CustomEvent 'cf:datachanged' para evitar dependencia circular api.js ↔ main.js
- Fix: tasa de ahorro real — saving / income (no balance / income)
- Fix: categorías separadas por tipo en formulario
- Fix: sync badge clickable para reconfigurar URL
- Fix crítico: URL de Sheets sin comillas JSON

## v7 — 2026-03-17 · Recurrentes + Búsqueda global

- Feature: Transacciones recurrentes mensuales
  - Store: cf_recurring — templates {id, type, amount, catId, note, name, dayOfMonth, active, lastGenerated}
  - initRecurring(): auto-genera TX del mes actual al abrir la app
  - Toggle "Repetir mensualmente" en formulario añadir
  - Sección "Recurrentes activos" en vista Añadir — pausar / eliminar / ver estado
- Feature: Búsqueda global en todo el historial
  - Modal full-screen con búsqueda en tiempo real
  - Filtros: tipo de transacción + año
  - Resultados agrupados por mes con neto y contador

## v6 — 2026-03-16 · Fechas y resumen anual

- Fix crítico: fechas "Invalid Date" / "undefined/undefined/..."
  - normalizeDate(v): convierte cualquier formato a YYYY-MM-DD
  - parseDateParts(iso): parse seguro con normalizeDate interno
  - Aplicado en: carga de localStorage, syncFromSheets, importData
- Feature: Resumen anual — 4 tarjetas debajo del gráfico en modo "Año"
  - Ingresos totales + media mensual
  - Gastos totales + % de ingresos
  - Ahorro/Inversión + tasa de ahorro %
  - Balance anual (positivo/déficit)

## v5 — 2026-03-16 · Navegación año + transacciones agrupadas

- Feature: navegación de año en gráfica anual — botones ‹ YYYY › independientes de curY
  - Variable chartY; no afecta la navegación de meses del resto de la app
- Feature: transacciones agrupadas por fecha con cabecera de día
  - fmtDateLong: "lunes 15 de enero de 2026"
  - Cada grupo muestra el neto del día como chip
  - renderGroupedByDate(txs, withActions) reutilizada en dashboard y transacciones
- UX: modo 6M incluye año abreviado en etiquetas (ene 26)

## v4 — 2026-03-16 · Gráfica de evolución + semáforo presupuesto

- Fix: categorías Ahorro/Inversión en formulario — populateFormCats filtra por tipo
- Fix: gráfica evolución — expense solo expense+expense_var (sin saving/invest)
- Feature: dataset "Ahorro/Inv." en cian en la gráfica de evolución
- Feature: toggle 6M / Año en la gráfica de evolución
- Feature: colores semáforo en barras de presupuesto
  - Gastos: verde → amarillo (≥80%) → rojo (≥100%)
  - Ahorro/Inversión: invertido (rojo → amarillo → verde)

## v3 — 2026-03-16 · Correcciones base

- Fix: balance = income - expense - expense_var - saving - invest
- Fix: gráfica evolución mensual — bug `labels` → `months`
- Feature: presupuesto por porcentaje (0-100%) en lugar de € fijos
  - Inputs por grupo %, indicador de suma en tiempo real
  - Limit = (pct * monthlyIncome) / 100
- Fix: categorías — layout cat-main + cat-actions sin solapamiento

## v2 — 2026-03-15 · Base del proyecto

- Diseño UI oscuro con gradientes
- 5 vistas: dashboard, transactions, add, budget, categories
- 5 tipos de transacción: income, expense, expense_var, saving, invest
- Mobile bottom nav (≤768px)
- Budget overview bars en dashboard
- Google Sheets sync via Apps Script Web App
- Datos migrados: 241 transacciones (Sep 2025 – Mar 2026), 28 categorías

# Control Financiero — Contexto del Proyecto

## Archivos principales
- `control-financiero.html` — App web principal (single-file HTML+CSS+JS), funciona abriendo directamente en el navegador
- `control-financiero-app/` — Proyecto Vite con arquitectura modular ES modules (rama `vite-migration`)
- `apps-script-code.js` — Backend Google Apps Script (pegar en Script Editor del Sheet)
- ~~`importar-datos.json`~~ — eliminado (migración ya completada)
- ~~`Control_Financiero.xlsx`~~ — eliminado (datos en localStorage/Google Sheets)

## Arquitectura
- **Frontend (monolito)**: Single-file HTML con Chart.js 4.4.1 (CDN) — `control-financiero.html`
- **Frontend (Vite)**: ES modules + Chart.js npm + vite-plugin-singlefile — `control-financiero-app/`
- **Base de datos**: localStorage (caché local) + Google Sheets (nube via Apps Script)
- **Backend**: Google Apps Script Web App (GET = leer todo, POST urlencoded = guardar)
- **Sheet**: `Transacciones` + `Categorias` en Google Sheets

## Git / GitHub
- Repo: `https://github.com/tonyseji/control-financiero.git`
- `main` — monolito v7 estable
- `vite-migration` — arquitectura modular Vite (activa)
- Builds deben ejecutarse desde Git Bash en Windows (`npm run dev`, `npm run build`), no desde la VM
- La VM puede editar código fuente pero no ejecutar npm (node_modules de Windows no compatibles)

## Google Apps Script
- Deployment: Web App, Execute as: Me, Access: Anyone
- POST: `e.parameter.data` = JSON string `{action:'save', transactions:[...], categories:[...]}`
- GET: devuelve `{transactions:[...], categories:[...]}`
- Sheet headers TX: `['id','type','amount','date','catId','note']`
- Sheet headers Cats: `['id','name','type','color']`

## Tipos de transacción
| App type     | Excel Tipo       | Badge label       |
|--------------|------------------|-------------------|
| income       | Ingreso          | Ingreso           |
| expense      | Gasto fijo       | Gasto fijo        |
| expense_var  | Gasto variable   | Gasto variable    |
| saving       | Ahorro           | Ahorro            |
| invest       | Inversión        | Inversión         |

## localStorage keys
- `cf_cats` — array de categorías
- `cf_tx` — array de transacciones
- `cf_budgets` — configuración de presupuesto
- `cf_settings` — config general (ingresos objetivo, etc.)
- `cf_api_url` — URL del Apps Script deployado

## Datos de migración
- 241 transacciones: Sep 2025 – Mar 2026
- 28 categorías con colores y tipos correctamente mapeados
- Tipos: 77 expense, 139 expense_var, 19 income, 6 saving, 0 invest

## Parámetros del Excel (Panel_Mensual)
- Ingreso objetivo mensual: €2,100
- Distribución presupuesto:
  - Gastos fijos: 40%
  - Gastos variables: 25%
  - Ahorro: 15%
  - Inversión: 15%
  - (queda 5% libre / buffer)

## Cambios pendientes / historial de versiones

### v2 (actual)
- Redesign UI oscuro con gradientes
- 5 vistas: dashboard, transactions, add, budget, categories
- 5 tipos de transacción
- Mobile bottom nav (≤768px)
- Budget overview bars en dashboard
- Google Sheets sync

### v3 (próxima)
- [ ] Fix: balance incorrecto — revisar lógica de cálculo
- [ ] Fix: gráfica evolución mensual vacía — revisar agrupación por mes
- [ ] Feature: presupuesto por porcentaje (suma 100%) en lugar de montos fijos
- [ ] Fix: botones editar/eliminar en categorías se solapan

## Notas técnicas
- Cowork solo monta rutas `C:\Users\[username]\...` (no D:)
- VM no tiene acceso a internet (curl falla)
- Para escribir HTML largo usar: `cat > file.html << 'HEREDOC'`
- La migración re-generada usa tipos v2 correctos (NO usar el JSON viejo)

### v3 (aplicada el 2026-03-16)
- [x] Fix: balance = income - expense - expense_var - saving - invest (correcto)
      → "Gastos" card = solo expense + expense_var; "Ahorro/Inv" = saving + invest
- [x] Fix: gráfica evolución mensual — bug `labels` → `months` (Chart.js variable)
- [x] Feature: presupuesto por porcentaje (0-100%) en lugar de € fijos
      → Inputs por grupo %, con indicador de suma en tiempo real
      → Limit = (pct * monthlyIncome) / 100; se guarda en `pct_Fijos`, `pct_Variables`, `pct_Ahorro`, `pct_Inversión`
- [x] Fix: categorías — nuevo layout cat-main (nombre+badge vertical) + cat-actions (flex-shrink:0)
      → Botones nunca se solapan con el nombre/badge

### v4 (aplicada el 2026-03-16)
- [x] Fix: categorías Ahorro/Inversión en formulario — populateFormCats ahora filtra por tipo saving/invest
      → Fallback a todas las categorías si no hay coincidencias
- [x] Fix: gráfica evolución mensual barras iguales — expense ahora solo expense+expense_var (sin saving/invest)
- [x] Feature: gráfica evolución añade dataset "Ahorro/Inv." en cian
- [x] Feature: toggle 6M / Año en la gráfica de evolución (botones en header del card)
      → chartPeriod: '6m' (últimos 6 meses) | 'year' (12 meses del año actual curY)
- [x] Feature: colores semáforo en barras de presupuesto
      → Gastos: verde (bajo) → amarillo (≥80%) → rojo (≥100%)
      → Ahorro/Inversión: rojo (bajo) → amarillo (≥50%) → verde (≥100%) [inverso]
      → Label cambia a "Ahorrado:" para grupos de ahorro

### v5 (aplicada el 2026-03-16)
- [x] Feature: navegación de año en gráfica anual — botones ‹ 2025 › independientes de curY
      → Variable chartY; se inicializa con curY al cambiar a modo 'year'
      → changeChartYear(d) suma/resta al chartY sin afectar la navegación de meses del resto de la app
- [x] Feature: transacciones agrupadas por fecha con cabecera de día
      → fmtDateLong: "lunes 15 de enero de 2026"
      → Cada grupo muestra el neto del día (+€ verde / -€ rojo) como chip al lado de la fecha
      → renderGroupedByDate(txs, withActions) reutilizada en dashboard y en vista de transacciones
- [x] UX: fecha en transacciones más legible — .tx-date color var(--text) font-weight:600
      → Modos 6M: etiquetas incluyen año abreviado (ene 26) para evitar ambigüedad entre años

### v6 (aplicada el 2026-03-16)
- [x] Fix crítico: fechas "Invalid Date" / "undefined/undefined/..." 
      → normalizeDate(v): convierte cualquier formato (JS Date.toString, ISO, etc.) a YYYY-MM-DD
      → parseDateParts(iso): parse seguro con normalizeDate interno
      → Aplicado en: carga de localStorage, syncFromSheets, importData
- [x] Feature: Resumen anual — 4 tarjetas debajo del gráfico en modo "Año"
      → Ingresos totales + media mensual
      → Gastos totales + % de ingresos
      → Ahorro/Inversión + tasa de ahorro %
      → Balance anual (positivo/déficit)
      → Se oculta automáticamente al volver a modo 6M

### v7 (aplicada el 2026-03-17)
- [x] Feature: Transacciones recurrentes mensuales
      → Store: cf_recurring — array de templates {id, type, amount, catId, note, name, dayOfMonth, active, lastGenerated}
      → initRecurring(): al abrir la app, auto-genera las TX del mes actual si no existen (id: rec_<templateId>_YYYY-MM)
      → Toggle "Repetir mensualmente" en formulario añadir → muestra opciones (día del mes, nombre)
      → Sección "Recurrentes activos" en vista Añadir — pausar / eliminar / ver estado
      → Al pausar: no genera más hasta reanudar; TX ya generadas se mantienen
- [x] Feature: Búsqueda global en todo el historial
      → Botón 🔍 en el header — abre modal full-screen
      → Búsqueda en tiempo real por texto (nota + nombre de categoría)
      → Filtros: tipo de transacción + año
      → Resultados agrupados por mes con neto del mes y contador
      → Summary bar: total resultados + balance neto de la búsqueda

### v8 (aplicada el 2026-03-17)
- [x] Migración Vite — arquitectura modular ES modules en `control-financiero-app/`
      → src/utils.js, store.js, ui.js, api.js, charts.js, main.js
      → src/views/: dashboard.js, transactions.js, add-form.js, budget.js, categories.js, recurring.js, search.js
      → vite-plugin-singlefile: build genera un único HTML inline (compatible file://)
      → chart.js como npm package (no CDN) para que Vite lo bundle inline
      → window.* bindings en main.js para que onclick= funcione con ES modules
      → CustomEvent 'cf:datachanged' para evitar dependencia circular api.js ↔ main.js
- [x] Fix: tasa de ahorro real — saving / income (no balance / income)
- [x] Fix: categorías separadas por tipo — expense vs expense_var en formulario
- [x] Fix: sync badge clickable — onclick="toggleSetupBanner()" para reconfigurar URL
- [x] UX: botón "+ Añadir" con fondo azul para mayor visibilidad
- [x] Fix crítico: URL de Sheets sin comillas JSON
      → localStorage.setItem directo al guardar (sin JSON.stringify)
      → .replace(/^"|"$/g,'') al cargar por si había quedado con comillas
- [x] Limpieza: eliminados importar-datos.json y Control_Financiero.xlsx (artefactos de migración)

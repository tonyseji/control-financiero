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
- `vite-migration` — arquitectura modular Vite (activa) → se despliega automáticamente a GitHub Pages
- Builds deben ejecutarse desde Git Bash en Windows (`npm run dev`, `npm run build`), no desde la VM
- La VM puede editar código fuente pero no ejecutar npm (node_modules de Windows no compatibles)
- GitHub Pages: https://tonyseji.github.io/control-financiero/ (PWA instalable en móvil)
- Deploy automático: `.github/workflows/deploy.yml` — push a vite-migration → build → deploy

## Google Apps Script
- Deployment: Web App, Execute as: Me, Access: Anyone
- POST: `e.parameter.data` = JSON string `{action:'save', transactions:[...], categories:[...]}`
- GET: devuelve `{transactions:[...], categories:[...]}`
- Sheet headers TX: `['id','type','amount','date','catId','note','accountId']`
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
- `cf_accounts` — array de cuentas `{id, name}`

## Parámetros del Excel (Panel_Mensual)
- Ingreso objetivo mensual: €2,100
- Distribución presupuesto:
  - Gastos fijos: 40%
  - Gastos variables: 25%
  - Ahorro: 15%
  - Inversión: 15%
  - (queda 5% libre / buffer)

## Estado actual (v11 — en producción)
PWA funcional en https://tonyseji.github.io/control-financiero/ con: 5 vistas (dashboard, transactions, add, budget, categories), 5 tipos de transacción, recurrentes mensuales, búsqueda global, cuentas bancarias, sync Google Sheets, gráfica 6M/Año con resumen anual, modo offline (service worker).

## Pendiente
- [ ] Nada activo en V1 — desarrollo activo ha pasado a finanzas-v2/

## Notas técnicas
- Cowork solo monta rutas `C:\Users\[username]\...` (no D:)
- VM no tiene acceso a internet (curl falla)
- Para escribir HTML largo usar: `cat > file.html << 'HEREDOC'`
- Builds Vite ejecutar desde Git Bash en Windows, no desde la VM

# 💰 Control Financiero

App de gestión de finanzas personales — PWA instalable en móvil, con sincronización en la nube vía Google Sheets.

🌐 **[Abrir app](https://tonyseji.github.io/control-financiero/)**

---

## ¿Qué hace?

- Registra ingresos, gastos fijos, gastos variables, ahorro e inversión
- Organiza transacciones por categorías y cuentas bancarias
- Dashboard con resumen mensual, gráficas de evolución y semáforo de presupuesto
- Sincronización automática con Google Sheets como base de datos en la nube
- Funciona offline (PWA con service worker)
- Transacciones recurrentes mensuales
- Búsqueda global en todo el historial

## Instalación en móvil

1. Abre [la app](https://tonyseji.github.io/control-financiero/) desde el navegador del móvil
2. **Android (Chrome):** banner automático "Añadir a pantalla de inicio"
3. **iOS (Safari):** menú compartir → "Añadir a pantalla de inicio"

Una vez instalada se abre como app nativa, sin barra del navegador.

## Tecnología

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + ES Modules + Chart.js |
| Base de datos local | localStorage |
| Nube | Google Sheets + Apps Script Web App |
| Hosting | GitHub Pages (HTTPS) |
| PWA | Service Worker + Web App Manifest |

## Estructura del proyecto

```
control-financiero-app/
├── src/
│   ├── main.js          # Punto de entrada, bindings globales
│   ├── store.js         # Estado global
│   ├── api.js           # Sync con Google Sheets
│   ├── utils.js         # Helpers (fechas, localStorage)
│   ├── charts.js        # Gráficas Chart.js
│   ├── ui.js            # Toast, modales, estados de sync
│   └── views/           # Vistas: dashboard, transactions, add-form, budget, categories, recurring, search
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── sw.js            # Service worker
│   └── icon-*.png       # Iconos
└── index.html           # Template HTML

apps-script-code.js      # Backend Google Apps Script (pegar en Script Editor)
control-financiero.html  # Versión monolito (legacy)
```

## Configuración de Google Sheets

1. Crea una hoja de cálculo con dos pestañas: `Transacciones` y `Categorias`
2. Abre el editor de scripts (Extensiones → Apps Script)
3. Pega el contenido de `apps-script-code.js`
4. Despliega como Web App: ejecutar como "Yo", acceso "Cualquier persona"
5. Copia la URL del despliegue
6. En la app: icono de sync → pega la URL → guardar

## Deploy

Cada push a la rama `vite-migration` despliega automáticamente a GitHub Pages vía GitHub Actions.

```bash
# Desarrollo local (desde Git Bash en Windows)
cd control-financiero-app
npm install
npm run dev

# Build
npm run build
```

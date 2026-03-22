# Roadmap — Finanzas V2

## Fase 0 — Fundación ✅
- [x] Diseño del esquema de base de datos (PostgreSQL / Supabase)
- [x] Documentación inicial (CLAUDE.md, db-schema.md, roadmap.md)
- [x] SQL de migración listo en `supabase/migrations/001_initial_schema.sql`
- [x] Estructura de carpetas creada

## Fase 1 — Entornos + Backend + Auth ✅

### Supabase: dos proyectos independientes

| Proyecto Supabase | Entorno | Rama git | URL destino |
|---|---|---|---|
| `gestor-financiero` (staging) | Pre-producción / desarrollo | `main` | localhost:5173 |
| `finanzas-v2-prod` | Producción | `main` | tudominio.com (futuro) |

**Por qué dos proyectos y no dos schemas en el mismo:** aislamiento total — un error en staging no puede afectar datos de producción, y las migraciones se prueban en staging antes de aplicarse en prod.

### Pasos completados

**Staging ✅:**
- [x] Crear proyecto `gestor-financiero` en Supabase (`https://fuuvsfkxyppjrtrqyzdy.supabase.co`)
- [x] Ejecutar `001_initial_schema.sql` en SQL Editor (7 tablas + triggers + RLS)
- [x] Habilitar proveedores de Auth: Google OAuth + Email/Password
- [x] Configurar OAuth redirect URL y JS origins
- [x] Crear bucket `receipts` en Storage (privado, 10 MB, JPEG/PNG/WEBP/HEIC/PDF)
- [x] `.env.staging` completo con URL + anon key + `VITE_APP_ENV=staging`
- [x] Fix `handle_new_user()` y `seed_default_categories()` con `SET search_path = public`
- [x] Policy `profiles_insert_system` para trigger sin sesión
- [x] Edge Function `auth-hook` desplegada y registrada en Authentication → Hooks
- [x] Secrets `APP_ENV=staging` + `SUPABASE_SERVICE_ROLE_KEY` configurados
- [x] Signup end-to-end confirmado ✓

**Producción (pendiente — cuando staging esté validado en producción real):**
- [ ] Crear proyecto `finanzas-v2-prod` en Supabase
- [ ] Ejecutar `001_initial_schema.sql` en SQL Editor de prod
- [ ] Habilitar proveedores de Auth: Google OAuth + Email/Password
- [ ] Configurar OAuth redirect URL: URL de producción
- [ ] Crear bucket `receipts` en Storage
- [ ] Copiar credenciales → añadir a `.env.production`
- [ ] Añadir secrets de prod en GitHub: `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY`

### Estrategia de migraciones SQL

Cada cambio de schema sigue este flujo:
1. Crear archivo `supabase/migrations/NNN_descripcion.sql`
2. Ejecutar en **staging** → probar
3. Si OK → ejecutar en **producción**
4. Nunca ejecutar directamente en producción sin pasar por staging

## Fase 2 — Frontend base ✅
- [x] Inicializar proyecto Vite en `app/` con `package.json` + `vite.config.js`
- [x] Instalar `@supabase/supabase-js`
- [x] Configurar cliente Supabase con variables de entorno
- [x] Implementar login con Google (Supabase Auth) + Email/Password
- [x] Implementar logout
- [x] Pantalla principal autenticada con Layout + navegación

## Fase 3 — CRUD básico ✅
- [x] Gestión de cuentas (crear, soft-delete)
- [x] Gestión de categorías (ver sistema + crear propias, con subcategorías y jerarquía)
- [x] Añadir transacción manual (formulario con tipo ingreso/gasto)
- [x] Listar transacciones con filtros básicos (mes, tipo, cuenta, texto)
- [x] Editar y eliminar transacción
- [x] Transferencias entre cuentas
- [x] Dashboard con saldo total y resumen mensual

## Fase 4 — Features de calidad ✅
- [x] Transferencias entre cuentas (2 filas enlazadas por `tx_transfer_pair_id`)
- [x] Transacciones recurrentes (CRUD en Recurring.jsx + auto-generación al arrancar app)
- [x] Presupuesto por categoría con semáforo verde/amarillo/rojo (`Budget.jsx`)
- [x] Búsqueda global en transacciones (`SearchModal.jsx` — tiempo real, por nota + categoría)
- [x] Gráfica de evolución mensual (`MonthlyChart.jsx` — SVG nativo, toggle 6M/Año)
- [x] Resumen anual (4 tarjetas: ingresos, gastos, balance — visible en modo Año)
- [x] UI v12 — paleta azul v1 restaurada, Inter font, sistema de clases CSS reutilizables

## Fase 5 — IA y captura avanzada
- [ ] **Input por voz** — `useVoiceInput.js` (Web Speech API) → prellenar formulario + botón micrófono en AddTransaction
- [ ] **Foto de ticket** — botón cámara en AddTransaction → Edge Function `receipt-ocr` → Claude Vision → extraer importe + comercio + fecha
- [ ] **Categorización automática** — al escribir descripción, sugerir categoría basada en historial

## Fase 6 — Multi-usuario y escala
- [ ] Onboarding de nuevos usuarios (categorías por defecto, primera cuenta)
- [ ] Ajustes de perfil (moneda, idioma, objetivo de ingreso mensual)
- [ ] Importar datos de V1 (migración de las 241 transacciones históricas de Sep 2025 – Mar 2026)
- [ ] Exportar datos (CSV / PDF)
- [ ] Análisis mensual automático (resumen al inicio de mes)

## Fase 7 — Automatización externa (futuro)
- [ ] n8n conectado a Supabase para automatizaciones
- [ ] Importación de extracto bancario (Open Banking / GoCardless / Nordigen)
- [ ] Alertas por presupuesto vía email/Telegram
- [ ] Detección de anomalías (gasto inusual en una categoría)

---

## Principios de desarrollo

- **Mobile first** — diseñar para móvil desde el inicio
- **Offline friendly** — cachear datos localmente para uso sin red
- **Privacy first** — datos del usuario solo en su cuenta Supabase, nunca en el código
- **Iterativo** — cada fase entrega algo funcional antes de pasar a la siguiente
- **Documentado** — actualizar `progress.md` al final de cada sesión de trabajo

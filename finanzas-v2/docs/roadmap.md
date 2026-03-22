# Roadmap — Finanzas V2

## Fase 0 — Fundación ✅
- [x] Diseño del esquema de base de datos (PostgreSQL / Supabase)
- [x] Documentación inicial (CLAUDE.md, db-schema.md, roadmap.md)
- [x] SQL de migración listo en `supabase/migrations/001_initial_schema.sql`
- [x] Estructura de carpetas creada

## Fase 1 — Entornos + Backend + Auth

### Supabase: dos proyectos independientes

| Proyecto Supabase | Entorno | Rama git | URL destino |
|---|---|---|---|
| `finanzas-v2-staging` | Pre-producción | `develop` | staging.tudominio.com (o Vercel preview) |
| `finanzas-v2-prod` | Producción | `main` | tudominio.com |

**Por qué dos proyectos y no dos schemas en el mismo:** aislamiento total — un error en staging no puede afectar datos de producción, y las migraciones se prueban en staging antes de aplicarse en prod.

### Pasos (hacer dos veces, una por entorno)

**Staging primero:**
- [ ] Crear proyecto `finanzas-v2-staging` en Supabase (dashboard.supabase.com)
- [ ] Ejecutar `001_initial_schema.sql` en SQL Editor de staging
- [ ] Habilitar proveedores de Auth: Google OAuth + Email/Password
- [ ] Configurar OAuth redirect URL: URL de staging
- [ ] Crear bucket `receipts` en Storage (acceso privado)
- [ ] Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY` de staging → añadir a `.env.staging`
- [ ] Añadir secrets de staging en GitHub: `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`
- [ ] Verificar RLS: registrar usuario, comprobar que solo ve sus datos

**Producción (solo cuando staging está validado):**
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

## Fase 2 — Frontend base
- [ ] Inicializar proyecto Vite en `app/` (desde Claude Code)
- [ ] Instalar `@supabase/supabase-js`
- [ ] Configurar cliente Supabase con variables de entorno
- [ ] Implementar login con Google (Supabase Auth)
- [ ] Implementar logout
- [ ] Pantalla principal vacía autenticada

## Fase 3 — CRUD básico
- [ ] Gestión de cuentas (crear, editar, archivar)
- [ ] Gestión de categorías (ver sistema + crear propias)
- [ ] Añadir transacción manual (formulario)
- [ ] Listar transacciones con filtros básicos
- [ ] Editar y eliminar transacción
- [ ] Dashboard con saldo total y resumen mensual

## Fase 4 — Features de calidad
- [ ] Transferencias entre cuentas
- [ ] Transacciones recurrentes (auto-generación mensual via Edge Function o al abrir app)
- [ ] Presupuesto por categoría (con semáforo verde/amarillo/rojo)
- [ ] Búsqueda global en transacciones
- [ ] Gráfica de evolución mensual

## Fase 5 — IA y captura avanzada
- [ ] **Input por voz** — Web Speech API → parseo de texto → prellenar formulario
- [ ] **Foto de ticket** — cámara → Edge Function → Claude/GPT Vision → extraer importe + comercio + fecha
- [ ] **Categorización automática** — al escribir descripción, sugerir categoría basada en historial

## Fase 6 — Multi-usuario y escala
- [ ] Onboarding de nuevos usuarios (categorías por defecto, primera cuenta)
- [ ] Ajustes de perfil (moneda, idioma, objetivo de ingreso mensual)
- [ ] Importar datos de V1 (migración de las 241 transacciones históricas)
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

# Finanzas V2 — Contexto para IAt

> Este archivo es la fuente de verdad para cualquier asistente IA (Claude Code, Cowork, nueva sesión).
> Leerlo ANTES de tocar cualquier archivo del proyecto.

---

## Skills activas

Las siguientes skills están instaladas en `~/.claude/skills/` y deben usarse activamente en este proyecto:

| Skill | Cuándo usarla |
|---|---|
| `react-expert` | Al escribir o revisar componentes React, hooks, estado, rendering |
| `api-designer` | Al diseñar o modificar servicios (`services/`), endpoints, contratos de datos |
| `typescript-pro` | Al revisar tipos, interfaces o cuando se añada TypeScript |
| `secure-code-guardian` | Al tocar auth, RLS, Edge Functions, storage, cualquier cosa de seguridad |
| `database-optimizer` | Al escribir queries SQL, triggers, índices, migraciones |
| `superpowers` | Para tareas complejas que requieran razonamiento extendido o múltiples pasos |

**Instrucción:** Antes de implementar cualquier feature, activar la skill más relevante.

---

## Qué es este proyecto

Una aplicación web PWA de control financiero personal, construida para uso propio de Tony, con arquitectura pensada para escalar a multi-usuario y poder venderla o compartirla en el futuro.

**V1 (ya existe):** `../control-financiero-app/` — PWA en GitHub Pages con localStorage + Google Sheets. Funciona, está en producción, NO tocar.

**V2 (este proyecto):** Misma app pero con backend real (Supabase), autenticación, base de datos PostgreSQL, e integración de IA (voz + foto de ticket).

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Vite + (framework a decidir) | Ya familiar, genera bundle único |
| Base de datos | Supabase (PostgreSQL) | Gratis, auth incluido, storage, Edge Functions, open source |
| Autenticación | Supabase Auth (Google OAuth) | Sin contraseñas, multi-usuario desde el inicio |
| Almacenamiento | Supabase Storage | Fotos de tickets, avatares |
| Lógica serverless | Supabase Edge Functions | Llamadas a APIs de IA sin exponer keys en el frontend |
| IA — voz | Web Speech API (navegador) | Gratis, sin backend, funciona en móvil |
| IA — foto ticket | Claude API / GPT-4 Vision | Extrae importe, comercio y fecha de la imagen |
| Deploy frontend | GitHub Pages (actual) / Vercel (futuro) | Gratis |
| Automatización | n8n (futuro) | Cuando haya necesidad de conectar bancos u otras fuentes |

---

## Estructura de carpetas

```
finanzas-v2/
├── CLAUDE.md                        ← este archivo (contexto para IA)
├── docs/
│   ├── db-schema.md                 ← esquema PostgreSQL completo + SQL
│   ├── roadmap.md                   ← plan de desarrollo por fases
│   └── progress.md                  ← log de lo que se ha hecho (actualizar en cada sesión)
├── app/                             ← proyecto Vite (pendiente: package.json + npm install)
│   ├── .env.example                 ← variables de entorno (sin keys de IA — van en Edge Functions)
│   └── src/
│       ├── main.jsx                 ← entry point React
│       ├── App.jsx                  ← routing auth/app
│       ├── supabase.js              ← cliente Supabase singleton
│       ├── services/                ← CRUD puro contra Supabase (sin estado React)
│       │   ├── auth.js              ← signInWithGoogle, signOut
│       │   ├── transactions.js      ← CRUD + createTransfer
│       │   ├── accounts.js          ← CRUD + soft-delete
│       │   ├── categories.js        ← CRUD + hideCategory
│       │   ├── recurring.js         ← CRUD recurrentes
│       │   ├── budgets.js           ← getActiveBudgets, upsert
│       │   ├── config.js            ← financial_config upsert
│       │   └── storage.js           ← uploadReceipt, deleteReceipt, isValidStorageUrl
│       ├── hooks/                   ← estado React que consume services/
│       │   ├── useAuth.js
│       │   ├── useTransactions.js
│       │   ├── useAccounts.js
│       │   └── useCategories.js
│       ├── views/                   ← páginas (vacías — pendiente implementar)
│       ├── components/              ← componentes reutilizables (vacíos — pendiente)
│       ├── utils/
│       │   ├── constants.js         ← optionsets con labels en español
│       │   ├── formatters.js        ← formatCurrency, formatDate, formatPct
│       │   └── validators.js        ← validación de formularios
│       └── styles/main.css
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql   ← SQL completo listo para ejecutar en Supabase
    └── functions/
        ├── auth-hook/               ← Capa 0 seguridad staging: bloquea JWT antes de emitirlo
        │   └── index.ts
        └── (futuras: receipt-ocr, generate-recurring...)
```

---

## Base de datos

Esquema completo en `docs/db-schema.md`.

**7 tablas:** `profiles`, `accounts`, `categories`, `transactions`, `recurring_transactions`, `financial_config`, `budgets`

**Decisiones clave:**
- Transferencias = dos transacciones enlazadas por `tx_transfer_pair_id` (tipo `expense` en origen + `income` en destino); no existe tipo `transfer` en la tabla
- `TEXT + CHECK` en vez de ENUM (migraciones más limpias en Supabase)
- `tx_usr_id` redundante en `transactions` (RLS eficiente sin joins)
- `acc_current_balance` desnormalizado con trigger (O(1) en lectura)
- `tx_metadata JSONB` para datos extra sin alterar esquema
- Categorías por usuario (NOT NULL) — cada usuario tiene su propia copia de las 18 categorías base semilladas al registrarse
- `cat_type` en inglés (igual que el resto de valores CHECK): `income` · `fixed_expense` · `variable_expense` · `saving` · `investment` · `transfer` — los labels en UI se traducen en el frontend
- `tx_is_pending` para transacciones generadas desde recurrentes variables (pendiente de confirmar importe)
- `rec_name` obligatorio en recurrentes (ej: "Netflix", "Alquiler")

---

## Entornos

| Entorno | Proyecto Supabase | Rama git | Propósito |
|---|---|---|---|
| Local / Desarrollo | `finanzas-v2-staging` (mismas credenciales) | cualquiera | Desarrollo activo |
| **Staging / Pre-prod** | `finanzas-v2-staging` | `develop` | Validar antes de producción |
| **Producción** | `finanzas-v2-prod` | `main` | Usuarios reales |

### Archivos de entorno

| Archivo | Commiteado | Uso |
|---|---|---|
| `.env.example` | ✅ Sí | Plantilla pública, sin valores reales |
| `.env.staging` | ❌ No | Credenciales de staging (local) |
| `.env.production` | ❌ No | Credenciales de prod (local) |
| GitHub Secrets | — | CI/CD: `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY` |

### Regla de migraciones SQL

**Siempre:** `supabase/migrations/NNN_descripcion.sql` → staging → validar → producción.
Nunca ejecutar directamente en producción.

### `VITE_APP_ENV`

La variable `VITE_APP_ENV` (`development` | `staging` | `production`) controla el acceso y permite lógica condicional en el frontend.

### Acceso restringido en staging — 4 capas independientes

Staging es solo para admin. Cada capa es independiente — si una falla, las demás siguen activas.

| Capa | Dónde | Qué bloquea | Cuándo actúa |
|---|---|---|---|
| **0 — Auth Hook** | Edge Function `auth-hook` | Emitir JWT a no-admins | Antes de crear sesión |
| **1 — Trigger SQL** | `handle_new_user()` | Crear perfil de nuevos usuarios | Al registrarse |
| **2 — Frontend** | `App.jsx` | Mostrar la app a no-admins | Al cargar |
| **3 — RLS** | `is_valid_user()` en todas las policies | Acceso a cualquier dato | En cada query |

**Capa 0 — Edge Function `auth-hook`** (más importante):
- Se ejecuta **antes** de que Supabase emita el JWT
- Si el usuario no es admin activo → login cancelado, sin sesión, sin token
- Registrar en: Supabase Dashboard → Authentication → Hooks → "Before sign in"
- Secret necesario: `APP_ENV=staging` + `SUPABASE_SERVICE_ROLE_KEY`

**Capa 1 — Trigger `handle_new_user()`**:
- Si `app_env = 'staging'` y ya existe un perfil → `RAISE EXCEPTION`
- Rate limiting: máximo 5 intentos fallidos por IP en 15 minutos (tabla `auth_rate_limit`)
- Activar: `ALTER DATABASE postgres SET app.settings.app_env = 'staging';`

**Capa 2 — Frontend `App.jsx`**:
- Si `VITE_APP_ENV=staging` y `prof_role !== 'admin'` → `<StagingBlocked>` + signOut()

**Capa 3 — RLS `is_valid_user()`**:
- Todas las policies `_own` requieren `is_valid_user()` que en staging solo devuelve true para admins activos
- Fallback absoluto: aunque alguien obtuviera un JWT válido, la BD deniega todas las queries

**Para activar staging completo** (ejecutar en SQL Editor del proyecto staging):
```sql
ALTER DATABASE postgres SET app.settings.app_env = 'staging';
```

---

## Cómo trabajar en este proyecto

### Desde Claude Code (terminal)
- Usar para: inicializar el proyecto Vite, instalar dependencias, escribir código, correr tests, hacer commits y push
- Abrir Claude Code desde la carpeta `finanzas-v2/app/`
- El repo se creará nuevo en GitHub (separado del repo actual de V1)

### Desde Cowork (este chat)
- Usar para: planificación, diseño, documentación, configurar Supabase en navegador, revisar estructura
- Los archivos en `docs/` y `CLAUDE.md` se mantienen desde aquí

### Desde nueva sesión (cualquier chat)
1. Leer este `CLAUDE.md`
2. Leer `docs/progress.md` para saber el estado actual
3. Leer `docs/roadmap.md` para saber qué toca a continuación

---

## Flujo de tipos de transacción

| Tipo app | Significado | Afecta saldo |
|---|---|---|
| `income` | Ingreso (nómina, freelance) | +saldo |
| `expense` | Gasto (fijo o variable) | −saldo |

> Nota: No existe `transfer` como tipo de transacción. Una transferencia genera 2 filas: `expense` en cuenta origen + `income` en cuenta destino, enlazadas por `tx_transfer_pair_id`. El trigger actualiza ambas cuentas automáticamente.

> Nota V1: V1 tenía tipos `expense_var`, `saving`, `invest` separados. En V2 estos se manejan por **categoría** (`cat_type`), no por tipo de transacción. El tipo es solo la dirección del dinero: entra o sale.

---

## Seguridad

### Modelo de seguridad actual

| Capa | Mecanismo | Estado |
|---|---|---|
| Autenticación | Google OAuth + Email/Password via Supabase Auth | ✅ |
| Contraseñas | bcrypt gestionado por Supabase — nunca se tocan en texto plano | ✅ |
| Recuperación | `resetPasswordForEmail()` → email automático de Supabase | ✅ |
| Roles | `prof_role: 'user' \| 'admin'` en `profiles` | ✅ |
| Autorización | RLS en las 7 tablas — policies `_own` (user) + `_admin` (admin) | ✅ |
| Helper de rol | `is_admin()` SQL function — SECURITY DEFINER STABLE (sin N subqueries) | ✅ |
| Validación cruzada | Policy de `transactions` y `recurring_transactions` verifica que `acc_id` pertenezca al mismo usuario | ✅ |
| Tránsito | TLS 1.2+ gestionado por Supabase/AWS | ✅ |
| Reposo | AES-256 gestionado por Supabase/AWS | ✅ |
| API keys de IA | Solo en Supabase Edge Functions (secrets del dashboard) — nunca en el frontend | ✅ |
| URLs de Storage | `isValidStorageUrl()` valida que sean paths del propio proyecto antes de persistir | ✅ |

### Roles

| Rol | Puede hacer |
|---|---|
| `user` | Ver y gestionar sus propios datos (transacciones, cuentas, categorías, config, presupuesto) |
| `admin` | Todo lo anterior + ver/editar datos de todos los usuarios + cambiar roles + activar/desactivar usuarios |

**Primer usuario registrado** → recibe `admin` automáticamente (trigger `handle_new_user`).
**Todos los siguientes** → reciben `user`. El admin puede promover a otro usuario desde el panel de admin.

**Usuarios desactivados** (`prof_is_active = false`): la función `is_admin()` los excluye explícitamente — un admin desactivado pierde los privilegios sin eliminar su cuenta.

### Encriptación de importes — decisión deliberada

Los importes (`tx_amount`, `acc_current_balance`, etc.) **no están encriptados a nivel de columna**. Decisión tomada conscientemente por:

- La encriptación por columna (pgcrypto) elimina `SUM()`, `AVG()`, `ORDER BY` e índices — incompatible con analytics
- La protección real ya existe: TLS + AES-256 en reposo + RLS impide acceso cruzado entre usuarios
- El threat model que requeriría encriptación por columna (empleado de AWS/Supabase con acceso directo a BD) es PCI-DSS / bancario, no el de un SaaS personal

**Si el proyecto escala a requisitos de compliance**, la encriptación por columna se puede añadir en una migración futura sin cambiar la arquitectura general.

### Reglas para futuras sesiones

- Las API keys de IA **nunca** van en variables `VITE_*` — van en Supabase Dashboard → Edge Functions → Secrets
- Cualquier URL que se persista en BD (`tx_attachment_url`, `prof_avatar_url`) debe pasar por `isValidStorageUrl()` del `services/storage.js`
- No añadir nuevas tablas sin habilitar RLS + policy `_own` + policy `_admin`
- Cambios de rol solo via `services/auth.js → setUserRole()` — nunca directamente desde el cliente sin pasar por RLS
- La función `is_admin()` es la única fuente de verdad para permisos de admin en el SQL — no duplicar la lógica

---

## Estado actual

Ver `docs/progress.md` para el log detallado.

**Resumen:**
- [x] Esquema de BD diseñado, documentado y auditado (v2.1)
- [x] SQL completo: 7 tablas + `auth_rate_limit` + triggers + RLS con `_own` / `_admin` / `is_valid_user()`
- [x] Roles: `prof_role` + `prof_is_active` + funciones `is_admin()` / `is_staging()` / `is_valid_user()`
- [x] Auth completa: Google OAuth + Email/Password + recuperación de contraseña
- [x] Scaffolding frontend completo: services/, hooks/, utils/
- [x] Entornos: staging configurado y operativo (`gestor-financiero` en Supabase)
- [x] Seguridad staging: 4 capas (auth-hook Edge Function + trigger + frontend + RLS)
- [x] Proyecto Vite inicializado, npm install, npm run dev funcional
- [x] Login funcional (Google OAuth + Email/Password) ✓
- [x] CRUD completo: cuentas, categorías (con jerarquía), transacciones (crear/editar/eliminar), transferencias
- [x] Dashboard con métricas, gráfica evolución (6M/Año), resumen anual, top categorías
- [x] Transacciones recurrentes con auto-generación al arrancar
- [x] Búsqueda global (SearchModal), filtros por mes/tipo/cuenta/texto
- [x] Presupuesto por tipo de categoría con semáforo (Budget.jsx)
- [x] UI v12 — paleta azul v1, Inter font, sistema CSS reutilizable con clases v1
- [x] Seguridad git: `.gitignore` multicapa, sin credenciales en el repo
- [ ] Validar UI v12 en navegador (commit pendiente)
- [ ] Input por voz (Web Speech API)
- [ ] Foto de ticket con IA (Edge Function `receipt-ocr` + Claude Vision)
- [ ] Proyecto producción en Supabase (cuando staging esté validado)

---

## Contexto del usuario

- Tony, software engineer en Prodware Spain (Dynamics 365 / Power Platform)
- Madrid, España
- Ya tiene V1 en producción en `https://tonyseji.github.io/control-financiero/`
- 241 transacciones históricas de Sep 2025 – Mar 2026 a migrar eventualmente
- Objetivo inmediato: construir base sólida multi-usuario antes de añadir features de IA

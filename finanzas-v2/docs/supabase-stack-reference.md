# Gestor Financiero V2 — Referencia de Configuración

> **Propósito**: Captura exacta del estado actual del proyecto: infraestructura, base de datos,
> seguridad, frontend y entornos. Sirve como fuente de verdad para replicar la configuración
> en nuevos proyectos, hacer auditorías o retomar el trabajo tras una pausa larga.
>
> **Última actualización**: 2026-03-20

---

## 1. Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Base de datos | PostgreSQL (Supabase) | Hosted, plan Free |
| Auth | Supabase Auth | Email/Password activo; Google OAuth pendiente |
| Storage | Supabase Storage | Bucket `receipts` privado |
| Edge Functions | Supabase Edge Functions (Deno) | `auth-hook` (pendiente deploy) |
| Frontend | React + Vite | ES modules, single-file build con `vite-plugin-singlefile` |
| Hosting | GitHub Pages | Deploy automático vía GitHub Actions |
| IA (planificada) | Claude / GPT-4o Vision | Solo desde Edge Functions (nunca en frontend) |
| Voz (planificada) | Web Speech API | Gratuito, directo desde navegador |

---

## 2. Proyectos Supabase

### Staging (activo)
| Campo | Valor |
|-------|-------|
| Nombre | `gestor-financiero` |
| URL | `https://fuuvsfkxyppjrtrqyzdy.supabase.co` |
| Región | West EU — Ireland |
| Plan | Free |
| Entorno | staging (función `is_staging()` → `true` hardcodeado) |
| Auth | Email/Password ✓ · Google OAuth pendiente |
| Storage | bucket `receipts` ✓ |
| Edge Functions | `auth-hook` pendiente deploy |

### Producción (pendiente crear)
| Campo | Valor |
|-------|-------|
| Nombre | `gestor-financiero-prod` |
| URL | (por determinar) |
| Entorno | producción (`is_staging()` → `false` hardcodeado) |
| Nota | Crear cuando staging esté validado; usar el mismo `001_initial_schema.sql` |

---

## 3. Base de datos — tablas

### Convención de nombres
- Todos los campos: `prefijo_tabla_campo` en inglés snake_case
- Labels en español únicamente en el frontend (`src/utils/constants.js`)
- Ejemplo: `tx_amount`, `acc_usr_id`, `prof_created_at`

### Prefijos por tabla
| Tabla | Prefijo |
|-------|---------|
| `profiles` | `prof_` |
| `accounts` | `acc_` |
| `categories` | `cat_` |
| `transactions` | `tx_` |
| `recurring_transactions` | `rec_` |
| `financial_config` | `fcfg_` |
| `budgets` | `bud_` |
| `auth_rate_limit` | `arl_` |

### Tabla: `profiles`
Creada automáticamente por trigger `on_auth_user_created` al registrarse.

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `prof_id` | uuid PK | REFERENCES auth.users ON DELETE CASCADE | Mismo ID que Supabase Auth |
| `prof_full_name` | text | nullable | Nombre del usuario |
| `prof_avatar_url` | text | nullable | URL de foto de perfil |
| `prof_currency` | text | NOT NULL DEFAULT 'EUR' | Moneda por defecto |
| `prof_locale` | text | NOT NULL DEFAULT 'es-ES' | Locale para formateo |
| `prof_role` | text | CHECK IN ('user','admin') DEFAULT 'user' | Primer usuario → 'admin' |
| `prof_is_active` | boolean | NOT NULL DEFAULT true | Desactivar sin borrar |
| `prof_created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `prof_updated_at` | timestamptz | NOT NULL DEFAULT now() | |

### Tabla: `accounts`
Cuentas bancarias/financieras del usuario. FK RESTRICT en transactions (no se pueden borrar si tienen movimientos).

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `acc_id` | uuid PK | DEFAULT uuid_generate_v4() | |
| `acc_usr_id` | uuid | NOT NULL REFERENCES auth.users CASCADE | |
| `acc_name` | text | NOT NULL | Nombre libre |
| `acc_type` | text | CHECK IN ('bank','cash','credit_card','savings','investment') | |
| `acc_currency` | text | CHECK IN ('EUR','USD','GBP','CHF','JPY') DEFAULT 'EUR' | |
| `acc_initial_balance` | numeric(15,2) | NOT NULL DEFAULT 0 | Saldo al crear la cuenta |
| `acc_current_balance` | numeric(15,2) | NOT NULL DEFAULT 0 | Actualizado por trigger |
| `acc_color` | text | nullable | Hex color para UI |
| `acc_icon` | text | nullable | Nombre de icono |
| `acc_is_active` | boolean | NOT NULL DEFAULT true | Soft delete |
| `acc_created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `acc_updated_at` | timestamptz | NOT NULL DEFAULT now() | |

> **Trigger**: `trg_tx_balance` actualiza `acc_current_balance` automáticamente en INSERT/UPDATE/DELETE de transactions.

### Tabla: `categories`
Categorías de gastos/ingresos. Las del sistema (`cat_is_system = true`) solo se pueden ocultar, no editar ni borrar.

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `cat_id` | uuid PK | DEFAULT uuid_generate_v4() | |
| `cat_usr_id` | uuid | NOT NULL REFERENCES auth.users CASCADE | Cada usuario tiene SUS categorías |
| `cat_parent_id` | uuid | REFERENCES categories ON DELETE SET NULL | Para subcategorías (opcional) |
| `cat_name` | text | NOT NULL | |
| `cat_type` | text | CHECK IN ('income','fixed_expense','variable_expense','saving','investment','transfer') | |
| `cat_color` | text | nullable | |
| `cat_icon` | text | nullable | |
| `cat_is_system` | boolean | NOT NULL DEFAULT false | Si true: solo ocultable, no editable |
| `cat_is_visible` | boolean | NOT NULL DEFAULT true | Ocultar sin borrar |
| `cat_created_at` | timestamptz | NOT NULL DEFAULT now() | |

**Categorías base** (sembradas al registrarse, `cat_is_system = true`):
- Gastos fijos: Alquiler, Seguros, Suministros, Suscripciones
- Gastos variables: Supermercado, Restaurantes, Transporte, Ocio, Ropa, Salud
- Ahorro: Fondo de emergencia, Ahorro general
- Inversión: Broker, Fondos
- Ingresos: Nómina, Freelance, Otros ingresos
- Transferencias: Transferencia

### Tabla: `transactions`
Movimientos financieros. `tx_type` solo admite 'income' o 'expense'.
Las transferencias entre cuentas = 2 filas enlazadas por `tx_transfer_pair_id`.

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `tx_id` | uuid PK | | |
| `tx_usr_id` | uuid | NOT NULL REFERENCES auth.users CASCADE | |
| `tx_acc_id` | uuid | NOT NULL REFERENCES accounts RESTRICT | FK protege al borrar cuenta |
| `tx_cat_id` | uuid | REFERENCES categories ON DELETE SET NULL | nullable |
| `tx_rec_id` | uuid | REFERENCES recurring_transactions ON DELETE SET NULL | Si fue generada automáticamente |
| `tx_transfer_pair_id` | uuid | nullable | UUID compartido por el par de tx de una transferencia |
| `tx_amount` | numeric(15,2) | NOT NULL CHECK > 0 | Siempre positivo |
| `tx_type` | text | CHECK IN ('income','expense') | |
| `tx_date` | date | NOT NULL DEFAULT CURRENT_DATE | |
| `tx_notes` | text | nullable | |
| `tx_is_pending` | boolean | NOT NULL DEFAULT false | Para recurrentes variables no confirmadas |
| `tx_source` | text | CHECK IN ('manual','voice','receipt','import','automatic') DEFAULT 'manual' | Origen del dato |
| `tx_attachment_url` | text | nullable | Ruta en bucket `receipts` |
| `tx_metadata` | jsonb | nullable | Datos de OCR, confianza, etc. |
| `tx_created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `tx_updated_at` | timestamptz | NOT NULL DEFAULT now() | |

### Tabla: `recurring_transactions`
Templates para transacciones que se repiten periódicamente.

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `rec_id` | uuid PK | | |
| `rec_usr_id` | uuid | NOT NULL REFERENCES auth.users CASCADE | |
| `rec_acc_id` | uuid | NOT NULL REFERENCES accounts RESTRICT | |
| `rec_cat_id` | uuid | REFERENCES categories ON DELETE SET NULL | |
| `rec_name` | text | NOT NULL | Nombre descriptivo (ej: "Alquiler enero") |
| `rec_amount` | numeric(15,2) | NOT NULL CHECK > 0 | |
| `rec_is_variable` | boolean | NOT NULL DEFAULT false | Si true: genera tx con `tx_is_pending = true` |
| `rec_type` | text | CHECK IN ('income','expense') | |
| `rec_notes` | text | nullable | |
| `rec_frequency` | text | CHECK IN ('daily','weekly','monthly','yearly') DEFAULT 'monthly' | |
| `rec_day_of_month` | integer | CHECK BETWEEN 1 AND 31 | Para frecuencia monthly |
| `rec_start_date` | date | NOT NULL DEFAULT CURRENT_DATE | |
| `rec_end_date` | date | nullable | null = sin fin |
| `rec_last_generated` | date | nullable | Control de generación automática |
| `rec_is_active` | boolean | NOT NULL DEFAULT true | Pausar sin borrar |
| `rec_created_at` | timestamptz | NOT NULL DEFAULT now() | |

### Tabla: `financial_config`
Configuración financiera personal del usuario (1 fila por usuario, UNIQUE).

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `fcfg_id` | uuid PK | | |
| `fcfg_usr_id` | uuid | NOT NULL UNIQUE REFERENCES auth.users CASCADE | |
| `fcfg_monthly_income_target` | numeric(15,2) | nullable | Objetivo de ingreso mensual |
| `fcfg_pct_fixed_expense` | integer | CHECK 0-100 DEFAULT 0 | % presupuesto gastos fijos |
| `fcfg_pct_variable_expense` | integer | CHECK 0-100 DEFAULT 0 | % presupuesto gastos variables |
| `fcfg_pct_saving` | integer | CHECK 0-100 DEFAULT 0 | % ahorro |
| `fcfg_pct_investment` | integer | CHECK 0-100 DEFAULT 0 | % inversión |
| `fcfg_updated_at` | timestamptz | NOT NULL DEFAULT now() | |
| CHECK | | suma de los 4 porcentajes ≤ 100 | El 5% restante es buffer libre |

### Tabla: `budgets`
Presupuestos por categoría (opcional, no obligatorio).

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `bud_id` | uuid PK | | |
| `bud_usr_id` | uuid | NOT NULL REFERENCES auth.users CASCADE | |
| `bud_cat_id` | uuid | NOT NULL REFERENCES categories CASCADE | |
| `bud_amount` | numeric(15,2) | NOT NULL CHECK > 0 | Límite de gasto |
| `bud_period` | text | CHECK IN ('monthly','yearly') DEFAULT 'monthly' | |
| `bud_start_date` | date | NOT NULL DEFAULT CURRENT_DATE | |
| `bud_end_date` | date | nullable | null = indefinido |
| `bud_created_at` | timestamptz | NOT NULL DEFAULT now() | |
| UNIQUE | | (usr_id, cat_id, period, start_date) | No duplicados |

### Tabla: `auth_rate_limit` (sistema interno)
Registra intentos fallidos de registro en staging. Sin RLS → inaccesible desde el cliente.

| Campo | Tipo | Notas |
|-------|------|-------|
| `arl_id` | uuid PK | |
| `arl_ip` | text | IP del intento |
| `arl_attempted_at` | timestamptz | DEFAULT now() |

---

## 4. Seguridad — arquitectura en capas

### Row Level Security
Todas las tablas tienen RLS habilitado. Cada tabla tiene dos políticas:

| Política | Condición | Para quién |
|----------|-----------|------------|
| `tabla_own` | `usr_id = auth.uid() AND is_valid_user()` | Usuario normal sobre sus propios datos |
| `tabla_admin` | `is_admin()` | Admin: acceso a todos los datos |

### Funciones helper (SECURITY DEFINER STABLE)

```sql
-- Devuelve true si el usuario autenticado tiene rol 'admin'
is_admin() → boolean

-- Devuelve true si estamos en el proyecto de staging
-- IMPORTANTE: en staging está hardcodeado a true; en producción a false.
-- Supabase no permite ALTER DATABASE/ROLE para GUC personalizados desde SQL Editor.
is_staging() → boolean

-- Devuelve true si el usuario puede operar:
-- En staging: solo admins. En producción: cualquier usuario activo.
is_valid_user() → boolean
```

### Regla `tx_own` adicional
Las transacciones también verifican que la cuenta (`tx_acc_id`) pertenezca al mismo usuario:
```sql
AND EXISTS (SELECT 1 FROM accounts WHERE acc_id = tx_acc_id AND acc_usr_id = auth.uid())
```

### Triggers de negocio

| Trigger | Tabla | Cuándo | Qué hace |
|---------|-------|--------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Crea perfil + siembra categorías; bloquea registro en staging si ya hay un admin |
| `trg_tx_balance` | `transactions` | AFTER INSERT/UPDATE/DELETE | Actualiza `acc_current_balance` sumando/restando |

### Protección de staging (4 capas independientes)
1. **Edge Function `auth-hook`**: intercepta login ANTES de emitir JWT; bloquea no-admins
2. **Trigger SQL**: bloquea registro de nuevos usuarios; rate limiting 5 intentos/IP/15min
3. **`App.jsx` frontend**: guardia — si staging + no admin → pantalla de bloqueo + signOut
4. **RLS `is_valid_user()`**: fallback absoluto en BD; queries fallan aunque exista JWT válido

---

## 5. Storage

| Bucket | Acceso | Tamaño máx. | MIME types permitidos |
|--------|--------|-------------|----------------------|
| `receipts` | Privado | 10 MB | image/jpeg, image/png, image/webp, image/heic, application/pdf |

Política de acceso (a implementar en SQL):
```sql
-- Solo el propietario puede ver/subir sus propios archivos
-- Path esperado: receipts/{user_id}/{tx_id}.{ext}
```

---

## 6. Autenticación

| Proveedor | Estado | Notas |
|-----------|--------|-------|
| Email/Password | ✅ Activo | Confirmación de email habilitada |
| Google OAuth | ⏳ Pendiente | Necesita Client ID + Secret de Google Cloud Console |

**Para activar Google OAuth:**
1. Ir a [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Crear "OAuth 2.0 Client ID" → Web application
3. Authorized redirect URI: `https://fuuvsfkxyppjrtrqyzdy.supabase.co/auth/v1/callback`
4. Pegar Client ID y Secret en Supabase → Authentication → Providers → Google

---

## 7. Variables de entorno

### `.env.staging` (gitignored)
```env
VITE_SUPABASE_URL=https://fuuvsfkxyppjrtrqyzdy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key — Dashboard → Settings → API Keys → Legacy>
VITE_APP_ENV=staging
```

### `.env.production` (gitignored, pendiente)
```env
VITE_SUPABASE_URL=https://<nuevo-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del proyecto prod>
VITE_APP_ENV=production
```

> **⚠️ Regla**: Las API keys de Claude/OpenAI NUNCA van en variables `VITE_*`.
> Se configuran en Supabase → Project Settings → Edge Functions → Secrets.

---

## 8. Frontend — arquitectura

```
finanzas-v2/app/src/
├── supabase.js              # Cliente Supabase singleton
├── main.jsx                 # Entry point React
├── App.jsx                  # Router + guardia de staging/auth
├── services/
│   ├── auth.js              # signIn, signUp, OAuth, resetPassword, funciones admin
│   ├── transactions.js      # CRUD + createTransfer (2 filas linked)
│   ├── accounts.js          # CRUD + soft delete
│   ├── categories.js        # CRUD, respeta is_system
│   ├── recurring.js         # Templates recurrentes
│   ├── budgets.js           # CRUD presupuestos
│   ├── config.js            # financial_config upsert
│   └── storage.js           # upload/delete en bucket receipts
├── hooks/
│   ├── useAuth.js           # session, user, profile, role, isAdmin, isActive
│   ├── useTransactions.js   # con filtros de fecha
│   ├── useAccounts.js
│   └── useCategories.js
├── utils/
│   ├── constants.js         # Optionsets + labels en español
│   ├── formatters.js        # formatCurrency, formatDate, formatPct
│   └── validators.js        # Validación de formularios
└── views/
    ├── Auth.jsx
    ├── Dashboard.jsx
    ├── Transactions.jsx
    ├── AddTransaction.jsx
    ├── Accounts.jsx
    ├── Categories.jsx
    ├── Budget.jsx
    └── Settings.jsx
```

**Decisiones de arquitectura:**
- Sin Zustand: estado gestionado por hooks React + Supabase (añadir si surge necesidad real)
- Services layer agnóstica al framework: se puede portar a Vue/Svelte sin tocar la lógica
- `createTransfer()` genera 2 filas enlazadas con `crypto.randomUUID()` como `tx_transfer_pair_id`
- `deleteAccount()` hace soft-delete (`acc_is_active = false`) por la FK RESTRICT en transactions

---

## 9. Repositorio y despliegue

| Concepto | Valor |
|----------|-------|
| Repo GitHub | (pendiente crear repo independiente para V2) |
| Build | `npm run build` → genera `dist/index.html` (single-file inline) |
| Deploy staging | Manual o GitHub Actions push a rama `main` |
| Deploy prod | GitHub Actions push con tag de versión |

---

## 10. Cómo replicar esta configuración desde cero

Si en el futuro necesitas recrear este setup (nuevo proyecto, nuevo entorno, etc.):

1. **Crear proyecto Supabase** → región EU, plan Free
2. **Ejecutar SQL de migración**: `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. **Actualizar `is_staging()`**: si es staging → `SELECT true`; si es producción → `SELECT false`
4. **Configurar Auth**: Email/Password (ya activo por defecto) + Google OAuth si se necesita
5. **Crear bucket `receipts`**: privado, 10 MB, MIME: jpeg/png/webp/heic/pdf
6. **Copiar credenciales**: URL + anon key → `.env.[entorno]`
7. **Desplegar Edge Function `auth-hook`** (solo en staging): `supabase functions deploy auth-hook`
8. **Registrar auth-hook**: Authentication → Hooks → `before_sign_in`
9. **Instalar dependencias**: `npm install` (desde entorno con Node.js)
10. **Arrancar**: `npm run dev`

**Orden crítico**: el SQL debe ejecutarse antes de registrar ningún usuario, ya que el trigger `on_auth_user_created` crea el perfil y las categorías base al registrarse.

---

## 11. Decisiones de diseño relevantes

| Decisión | Alternativa descartada | Razón |
|----------|----------------------|-------|
| No encriptar columnas de importe | `pgcrypto` | Incompatible con `SUM()`/`AVG()`/índices. TLS + AES-256 en reposo + RLS es suficiente |
| `tx_type` solo 'income'/'expense' | Incluir 'transfer' | Transfers = 2 filas linked → más flexible, sin tipos especiales |
| Categorías por usuario (no globales) | Categorías globales compartidas | Cada usuario personaliza las suyas; más privacidad, más flexibilidad |
| `is_staging()` hardcodeado por proyecto | GUC `app.settings.app_env` | Supabase no permite `ALTER DATABASE/ROLE` para GUC personalizados desde SQL Editor |
| Sin Zustand | Redux, Zustand | Services + hooks cubre el 100% de los casos actuales; añadir si escala |
| PostgreSQL puro (sin ORMs) | Prisma, Drizzle | 90% SQL estándar = portabilidad total; solo auth/storage son Supabase-specific |

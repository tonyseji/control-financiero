# Finanzas V2 — Contexto para IA

> Leer ANTES de tocar cualquier archivo. Para el estado actual: `docs/progress.md` (últimas 2 entradas). Para el plan: `docs/roadmap.md`. Para el schema completo: `docs/db-schema.md`. Para entender el sistema de trabajo entre agentes: `docs/workflow.md`.
>
> **Si eres Claude Code:** tu rol es implementar, no arquitectar. No tomes decisiones de diseño por tu cuenta — si surge un dilema, repórtalo. Lee `docs/workflow.md` para el modelo completo.

---

## Qué es este proyecto

PWA de control financiero personal con backend real. Está en construcción activa.

- **V1** (`../control-financiero-app/`) — PWA en producción, localStorage + Google Sheets. **NO tocar.**
- **V2** (este proyecto) — Supabase + React + Vite. Backend real, auth, multi-usuario.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React (sin Zustand — services + hooks es suficiente) |
| Base de datos | Supabase (PostgreSQL) — proyecto `gestor-financiero` |
| Auth | Supabase Auth — Google OAuth + Email/Password |
| Storage | Supabase Storage — bucket `receipts` (privado, 10 MB) |
| Lógica serverless | Supabase Edge Functions |
| IA — voz | Web Speech API (navegador, sin backend) |
| IA — foto ticket | Claude Vision via Edge Function `receipt-ocr` |
| Deploy | GitHub Pages (actual) / Vercel (futuro) |

---

## Estructura del proyecto

```
finanzas-v2/
├── CLAUDE.md
├── docs/               ← db-schema.md · roadmap.md · progress.md
├── app/src/
│   ├── App.jsx         ← routing auth/app + guardia staging
│   ├── main.jsx        ← entry point + init tema dark/light
│   ├── services/       ← CRUD puro contra Supabase (sin estado React)
│   ├── hooks/          ← estado React que consume services/
│   │                   ← useReceiptOcr.js · useFinancialAdvisor.js · useFinancialData.js
│   ├── views/          ← Dashboard · Transactions · AddTransaction · Budget
│   │                      Accounts · Categories · Recurring · Goals · Analysis · Settings · Auth
│   ├── components/     ← Layout · MonthlyChart · SearchModal · FloatingChat · ChatPanel · ChatMessages
│   ├── services/       ← CRUD puro contra Supabase + advisor.js (llama a EF financial-advisor)
│   └── utils/          ← constants.js · formatters.js · validators.js · txClassifier.js · voiceParser.js · questionClassifier.js
└── supabase/
    ├── migrations/001_initial_schema.sql
    └── functions/
        ├── auth-hook/  ← bloquea JWT no-admin (staging)
        └── receipt-ocr/ ← extrae datos de tickets: amount, merchant, date, notes, categoryId
```

---

## Base de datos — resumen

7 tablas: `profiles`, `accounts`, `categories`, `transactions`, `recurring_transactions`, `financial_config`, `budgets`. Schema completo en `docs/db-schema.md`.

**Decisiones clave que NO cambiar:**
- Transferencia = 2 filas enlazadas por `tx_transfer_pair_id` (no existe tipo `transfer`)
- `TEXT + CHECK` en vez de ENUM (migraciones más limpias)
- `acc_current_balance` desnormalizado con trigger (O(1) en lectura)
- `cat_type` en inglés: `income` · `fixed_expense` · `variable_expense` · `saving` · `investment` · `transfer`
- Categorías por usuario (NOT NULL) — seed de 18 categorías base al registrarse
- `tx_is_pending` para recurrentes variables pendientes de confirmar importe

---

## Entornos

| Entorno | Proyecto Supabase | Archivo env |
|---|---|---|
| Staging / Dev | `gestor-financiero` (`fuuvsfkxyppjrtrqyzdy`) | `.env.staging` |
| Producción | (pendiente crear) | `.env.production` |

- `.env.staging` y `.env.production` → **gitignored, nunca commitear**
- Migraciones: siempre `supabase/migrations/NNN_*.sql` → staging → validar → producción
- `VITE_APP_ENV`: `development` | `staging` | `production`

### Supabase Auth (staging)
- Site URL: `http://localhost:5173`
- Callback OAuth: `https://fuuvsfkxyppjrtrqyzdy.supabase.co/auth/v1/callback`

---

## Seguridad — staging cerrado (4 capas)

Staging = solo admin. Cada capa es independiente.

| Capa | Dónde | Qué hace |
|---|---|---|
| 0 — Auth Hook | Edge Function `auth-hook` | Bloquea JWT antes de emitirlo a no-admins |
| 1 — Trigger SQL | `handle_new_user()` | Bloquea registro de nuevos usuarios |
| 2 — Frontend | `App.jsx` | Redirige a `<StagingBlocked>` si no es admin |
| 3 — RLS | `is_valid_user()` en todas las policies | Deniega queries aunque exista JWT |

**Reglas para no romper:**
- API keys de IA solo en Supabase Edge Functions → Secrets (nunca en `VITE_*`)
- Cualquier URL a Storage debe pasar por `isValidStorageUrl()` antes de persistir
- **Aislamiento de datos**: cada usuario (incluido admin) solo ve sus propios datos via policy `_own`. NO crear policies `_admin` en tablas de datos (transactions, accounts, categories, etc.). Solo `profiles` tiene `prof_admin` para gestión de roles.
- `seed_default_categories()` debe mantenerse idempotente (`ON CONFLICT DO NOTHING`) — constraint `UNIQUE (cat_usr_id, cat_name)` activo desde migration 021
- Nuevas tablas: RLS + policy `_own` + policy `_admin` obligatorio
- Toda función `SECURITY DEFINER` necesita `SET search_path = public`
- **⚠️ CRÍTICO — Edge Functions con auth propio:** Desactivar **"Verify JWT with legacy secret"** en Settings de la EF. Si está ON:
  - El gateway rechaza access tokens de usuario con HTTP 401 **antes de que el código corra**
  - Errores silenciosos: `execution_id: null` en logs
  - El usuario ve error genérico ("error al procesar"), no el real
  - Afecta todas las EF que llaman a `supabase.auth.getUser(jwt)` manualmente
  - Solución: OFF + confiar en el `getUser()` del código (recomendación oficial de Supabase)
  - **⚠️ El toggle puede revertirse solo** (comportamiento observado en `receipt-ocr` el 2026-04-07). Verificar antes de debuggear errores 401 en EF.

---

## Tipos de transacción

| App `tx_type` | Dirección | Nota |
|---|---|---|
| `income` | +saldo | Nómina, freelance, etc. |
| `expense` | −saldo | Cualquier gasto (fijo o variable según categoría) |
| — | ± | Transferencia = expense en origen + income en destino |

En V2 el tipo es solo la dirección del dinero. La granularidad (gasto fijo vs variable, ahorro, inversión) va en `cat_type`.

### Utilidades clave

**`txClassifier.js`** — fuente de verdad para clasificar transacciones. Usar siempre estas funciones en las vistas, nunca duplicar la lógica:

| Función | Condición | Uso en UI |
|---------|-----------|-----------|
| `isTransfer(tx)` | `tx_transfer_pair_id != null` | Excluir de todos los totales; badge gris "Transferencia ↔" |
| `isSaving(tx, cat)` | `cat_type === 'saving'` y no transfer | Contabilizar en "Ahorro", badge teal, importe neutro/teal |
| `isInvestment(tx, cat)` | `cat_type === 'investment'` y no transfer | Contabilizar en "Ahorro/Inv.", badge teal |
| `isRealExpense(tx, cat)` | `cat_type IN (fixed_expense, variable_expense)` y no transfer | Gasto real; rojo |
| `isIncome(tx)` | `tx_type === 'income'` y no transfer | Ingreso real; verde |

**`voiceParser.js`** — fuente de verdad para convertir texto hablado a campos de transacción. Soporta decimales ("cuarenta y cinco con cincuenta" → 45.50), tipos ("gasté", "cobré"), fechas relativas y categorías. Tests en `utils/__tests__/voiceParser.test.js` (52 casos, Vitest).

---

## Datos Demo — Arquitectura (Fase 6A)

**Propósito**: Al registrarse en staging, generar 40 transacciones demo realistas para que el usuario vea cómo funciona la app sin entrar datos manualmente.

### Tablas involucradas

| Tabla | Propósito | Notas |
|---|---|---|
| `demo_data_templates` | 40 transacciones "plantilla" reutilizables | Una sola vez; cada nuevo user las recibe |
| `user_demo_access` | Registro de qué templates activos tiene cada user | Controla visibilidad y expiración |
| `transactions` | **Solo datos REALES del usuario** | NO contiene columnas demo para mantener limpieza |

### Flujo de datos

1. **Al registrarse** (trigger `handle_new_user()`):
   - Crea entrada en `profiles`, `accounts`, seed de `categories`
   - Llama `generate_demo_data(p_user_id, p_account_id)`

2. **`generate_demo_data()` inserta en `user_demo_access`** (NO en `transactions`):
   ```sql
   INSERT INTO user_demo_access (uda_user_id, uda_template_id, uda_is_active, uda_expires_at)
   SELECT p_user_id, ddt_id, TRUE, NOW() + INTERVAL '12 hours'
   FROM demo_data_templates;
   ```

3. **Frontend junta datos** para mostrar:
   - Transacciones REALES: `SELECT * FROM transactions WHERE tx_usr_id = user_id`
   - Transacciones DEMO: `SELECT ddt.* FROM demo_data_templates ddt JOIN user_demo_access uda ON ddt.ddt_id = uda.uda_template_id WHERE uda.uda_user_id = user_id AND uda.uda_is_active = TRUE AND uda.uda_expires_at > NOW()`
   - Junta ambas en la UI

4. **Limpieza automática**:
   - Cron job (futuro): `DELETE FROM user_demo_access WHERE uda_expires_at < NOW()`
   - Manual (Settings): botón "Limpiar datos demo" que ejecuta el delete

### Ventajas de esta arquitectura

- ✅ `transactions` puro = solo datos reales, sin contaminación
- ✅ Fácil de limpiar: solo borra `user_demo_access`, no toca `transactions`
- ✅ Reutilizable: los 40 templates se usan para TODOS los usuarios nuevos
- ✅ Flexible: si el usuario quiere ver datos reales, simple query sin filtros
- ✅ Temporal: `uda_expires_at` es la fuente de verdad para expiración

---

## Agentes especializados

Tres agentes disponibles en `.claude/agents/`. **Claude Code los activa automáticamente** según el contexto de la tarea — no hace falta especificarlos en cada prompt.

| Agente | Activa cuando... | Skills |
|---|---|---|
| `frontend-specialist` | Vistas, componentes, JSX, hooks, diseño UI | `vercel-react-best-practices`, `frontend-design` |
| `backend-specialist` | Migrations SQL, services/, hooks de datos, RLS, schema | `supabase-postgres-best-practices` |
| `security-reviewer` | Revisión de seguridad, audit de RLS, variables de entorno | — (solo lee) |

### Cómo funcionan los agentes (auto-routing)

**Sistema de detección automática:**

1. Cada agente tiene una `description` clara con ejemplos en su frontmatter (`.claude/agents/*.md`)
2. Claude Code **lee estas descripciones** cuando inicia
3. Cuando describes una tarea, Claude Code **compara** tu request contra las descripciones
4. Si hay coincidencia → **el agente se activa automáticamente**
5. El agente carga sus **skills asignadas** (ej: `supabase-postgres-best-practices` para backend)
6. El agente ejecuta la tarea con su expertise especializado

**Ejemplos de auto-activación (TÚ NO ESPECIFICAS NADA):**

```
Tú: "Crea una tabla de goals con RLS y soft-delete"
↓
Claude Code ve: ".sql", "migrations", "RLS" → activa backend-specialist
backend-specialist carga `supabase-postgres-best-practices` skill
↓
Backend-specialist escribe la migration 002_goals.sql con RLS policies
↓
Claude Code ve: "RLS policies", "migration safety" → activa automáticamente security-reviewer
security-reviewer audita las policies sin que lo pidas
↓
Resultado: migration segura, completa, auditada ✅
```

```
Tú: "Crea un componente Goals que muestre progreso de ahorros"
↓
Claude Code ve: ".jsx", "componente", "hooks" → activa frontend-specialist
frontend-specialist carga `vercel-react-best-practices` + `frontend-design` skills
↓
Frontend-specialist crea GoalsView.jsx con hook useGoals()
↓
Resultado: componente React production-ready con design system integrado ✅
```

**Lo importante:** Tú solo describes QUÉ necesitas. Claude Code automáticamente:
- Elige el agente correcto
- Carga sus skills
- Usa el expertise especializado
- Verifica seguridad si es necesario

---

## Cómo trabajar

### En Claude Code (terminal)

Abre Git Bash desde `finanzas-v2/`:
```bash
cd "C:\Users\anton\Desktop\Organizador Finanzas\finanzas-v2"
npx claude
```

Entonces describe lo que necesitas — los agentes se activan automáticamente:

**Ejemplos de prompts:**
```
"Crea una tabla de goals con RLS, soft-delete y índice en usr_id"
→ backend-specialist + security-reviewer se activan automáticamente

"Crea un hook useGoals que consuma el service de goals con loading/error"
→ frontend-specialist se activa automáticamente

"Implementa voice input en AddTransaction con Web Speech API"
→ frontend-specialist carga vercel-react-best-practices + frontend-design

"Revisa si la migration de goals es segura"
→ security-reviewer se activa automáticamente
```

**NO NECESITAS decir:** "Usa el backend-specialist" o "Activa el security-reviewer". Claude Code lo detecta automáticamente.

### En Cowork (este chat)

Para planificación, diseño, decisiones arquitectónicas, configurar Supabase via navegador.

### Al comenzar nueva sesión

1. Leer este `CLAUDE.md`
2. Leer últimas 2 entradas de `docs/progress.md` (estado + próximos pasos)
3. Si toca BD: leer `docs/db-schema.md`

---

## Estado

### V12 — Asesor Financiero IA (COMPLETADO)

**Completado 2026-04-10/17:**
- ✅ Chat flotante completo: `FloatingChat` → `ChatPanel` → `ChatMessages`
- ✅ Edge Function `financial-advisor`: JWT + rate-limit + contexto histórico + Claude Haiku
- ✅ `monthly_summaries`: datos pre-calculados, trigger automático por transacción (O(1))
- ✅ `useFinancialData.js`: carga histórico y mes actual desde `monthly_summaries`
- ✅ `useFinancialAdvisor.js`: mensajes, loading, error, remainingCalls con init desde BD
- ✅ `questionClassifier.js`: detecta si la pregunta necesita datos del usuario o es general
- ✅ Admin bypass: `prof_role = 'admin'` → ilimitado (`remainingCalls = -1`), UI muestra "∞"
- ✅ Seguridad: trigger `protect_prof_role` — usuarios no pueden auto-escalarse a admin
- ✅ `007_protect_prof_role.sql` aplicado en staging
- ✅ Edge Function `financial-advisor` redesplegada
- ✅ Toggle "Verify JWT with legacy secret" = OFF verificado

### V13 — Fixes de datos demo y seguridad (COMPLETADO — 2026-04-17)
- ✅ Aislamiento de datos: eliminadas policies `_admin` en tablas de datos (migration 021)
- ✅ Categorías sin duplicados: constraint UNIQUE + seed idempotente (migration 021)
- ✅ Verificado en staging con usuario de prueba

**Próximos pasos:**
- Persistir moneda en BD desde Settings (ahora solo es estado local)
- UI para objetivo de ingreso mensual en Settings → `financial_config`
- Importar extracto bancario (PDF/CSV → Claude Vision)
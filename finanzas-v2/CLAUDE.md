# Finanzas V2 — Contexto para IA

> Leer ANTES de tocar cualquier archivo. Para el estado actual: `docs/progress.md` (últimas 2 entradas). Para el plan: `docs/roadmap.md`. Para el schema completo: `docs/db-schema.md`.

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
│   ├── views/          ← Dashboard · Transactions · AddTransaction · Budget
│   │                      Accounts · Categories · Recurring · Goals · Analysis · Settings · Auth
│   ├── components/     ← Layout · MonthlyChart · SearchModal
│   └── utils/          ← constants.js · formatters.js · validators.js
└── supabase/
    ├── migrations/001_initial_schema.sql
    └── functions/auth-hook/
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
- Nuevas tablas: RLS + policy `_own` + policy `_admin` obligatorio
- Toda función `SECURITY DEFINER` necesita `SET search_path = public`

---

## Tipos de transacción

| App `tx_type` | Dirección | Nota |
|---|---|---|
| `income` | +saldo | Nómina, freelance, etc. |
| `expense` | −saldo | Cualquier gasto (fijo o variable según categoría) |
| — | ± | Transferencia = expense en origen + income en destino |

En V2 el tipo es solo la dirección del dinero. La granularidad (gasto fijo vs variable, ahorro, inversión) va en `cat_type`.

### Clasificación semántica (txClassifier.js)

`app/src/utils/txClassifier.js` es la **fuente de verdad** para clasificar transacciones. Usar siempre estas funciones en las vistas, nunca duplicar la lógica:

| Función | Condición | Uso en UI |
|---------|-----------|-----------|
| `isTransfer(tx)` | `tx_transfer_pair_id != null` | Excluir de todos los totales; badge gris "Transferencia ↔" |
| `isSaving(tx, cat)` | `cat_type === 'saving'` y no transfer | Contabilizar en "Ahorro", badge teal, importe neutro/teal |
| `isInvestment(tx, cat)` | `cat_type === 'investment'` y no transfer | Contabilizar en "Ahorro/Inv.", badge teal |
| `isRealExpense(tx, cat)` | `cat_type IN (fixed_expense, variable_expense)` y no transfer | Gasto real; rojo |
| `isIncome(tx)` | `tx_type === 'income'` y no transfer | Ingreso real; verde |

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

## Estado actual

Ver `docs/progress.md` para el log detallado.

**Pendiente (Fase 5 — IA):**
- [ ] Input por voz — `useVoiceInput.js` (Web Speech API) + botón micrófono en `AddTransaction.jsx`
- [ ] Foto de ticket — Edge Function `receipt-ocr` (Claude Vision) + botón cámara en `AddTransaction.jsx`
- [ ] Categorización automática por historial

# Esquema de Base de Datos — Finanzas V2
**PostgreSQL (Supabase) · Versión 2.1**

---

## Convención de nombres

| Regla | Ejemplo |
|---|---|
| Nombres de tabla en inglés, snake_case | `financial_config` |
| Campos: `prefijo_tabla` + `_` + `nombre_campo` en inglés | `tx_amount` |
| FKs: `prefijo_origen` + `_` + `prefijo_destino` + `_id` | `tx_acc_id` |
| Labels en la app siempre en español | `tx_amount` → "Importe" |

### Prefijos por tabla

| Tabla | Prefijo |
|---|---|
| `profiles` | `prof` |
| `accounts` | `acc` |
| `categories` | `cat` |
| `transactions` | `tx` |
| `recurring_transactions` | `rec` |
| `financial_config` | `fcfg` |
| `budgets` | `bud` |
| `goals` | `goal` |

---

## Tablas

### `profiles`
Datos de perfil del usuario. Supabase gestiona autenticación en `auth.users`; esta tabla extiende con datos propios de la app. Se crea automáticamente al registrarse via trigger.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `prof_id` | uuid PK | — | FK a `auth.users.id` |
| `prof_full_name` | text | Nombre | |
| `prof_avatar_url` | text | Avatar | URL en Supabase Storage |
| `prof_currency` | text | Moneda | Default: `EUR` |
| `prof_locale` | text | Idioma | Default: `es-ES` |
| `prof_created_at` | timestamptz | — | |
| `prof_updated_at` | timestamptz | — | |

---

### `accounts`
Cuentas financieras del usuario (banco, efectivo, tarjeta, ahorro, inversión).

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `acc_id` | uuid PK | — | |
| `acc_usr_id` | uuid FK | — | → `auth.users.id` |
| `acc_name` | text | Nombre | Libre: "Santander", "ING"... |
| `acc_type` | text optionset | Tipo | `bank` · `cash` · `credit_card` · `savings` · `investment` |
| `acc_currency` | text optionset | Moneda | `EUR` · `USD` · `GBP` · `CHF` · `JPY` |
| `acc_initial_balance` | numeric(15,2) | Saldo inicial declarado (siempre 0 para cuentas nuevas) | |
| `acc_current_balance` | numeric(15,2) | Suma de transacciones reales | Mantenido por trigger; NO incluye saldo inicial ni demos |
| `acc_color` | text | Color | Hex para UI |
| `acc_icon` | text | Icono | Emoji o nombre de icono |
| `acc_is_active` | boolean | Activa | Ocultar sin eliminar |
| `acc_created_at` | timestamptz | — | |
| `acc_updated_at` | timestamptz | — | |

---

### `categories`
Categorías jerárquicas (raíz > subcategoría). Cada usuario tiene su propia copia de las categorías base (`cat_is_system = true`), semilladas al registrarse. Las categorías sistema no se pueden eliminar, solo ocultar (`cat_is_visible = false`).

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `cat_id` | uuid PK | — | |
| `cat_usr_id` | uuid FK | — | → `auth.users.id` (siempre NOT NULL; categorías son por usuario) |
| `cat_parent_id` | uuid FK | — | → `cat_id` (null = raíz) |
| `cat_name` | text | Nombre | |
| `cat_type` | text optionset | Tipo | `income` · `fixed_expense` · `variable_expense` · `saving` · `investment` · `transfer` |
| `cat_color` | text | Color | Hex |
| `cat_icon` | text | Icono | Emoji o nombre |
| `cat_is_system` | boolean | Base | true = solo ocultar; false = edición total |
| `cat_is_visible` | boolean | Visible | Mostrar/ocultar en la app |
| `cat_created_at` | timestamptz | — | |

**Categorías base (semilladas al registrarse — 21 categorías):**

Constraint `UNIQUE (cat_usr_id, cat_name)` activo desde migration 021. `seed_default_categories()` es idempotente (`ON CONFLICT DO NOTHING`).

| Nombre | Tipo |
|---|---|
| Alquiler | fixed_expense |
| Seguros | fixed_expense |
| Suministros | fixed_expense |
| Suscripciones | fixed_expense |
| Gimnasio | fixed_expense |
| Internet | fixed_expense |
| Supermercado | variable_expense |
| Restaurantes | variable_expense |
| Transporte | variable_expense |
| Ocio | variable_expense |
| Ropa | variable_expense |
| Salud | variable_expense |
| Gasolina | variable_expense |
| Deporte | variable_expense |
| Fondo de emergencia | saving |
| Ahorro general | saving |
| Broker | investment |
| Fondos | investment |
| Nómina | income |
| Freelance | income |
| Otros ingresos | income |

---

### `transactions`
Tabla central. Toda operación económica es una fila.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `tx_id` | uuid PK | — | |
| `tx_usr_id` | uuid FK | — | → `auth.users.id` (redundante para RLS eficiente) |
| `tx_acc_id` | uuid FK | Cuenta | → `accounts.acc_id` |
| `tx_cat_id` | uuid FK | Categoría | → `categories.cat_id` |
| `tx_rec_id` | uuid FK | Recurrente | → `recurring_transactions.rec_id` (null si manual) |
| `tx_transfer_pair_id` | uuid | — | UUID compartido entre las dos patas de una transferencia |
| `tx_amount` | numeric(15,2) | Importe | Siempre positivo |
| `tx_type` | text optionset | Tipo | `income` · `expense` |
| `tx_date` | date | Fecha | |
| `tx_notes` | text | Notas | Opcional |
| `tx_is_pending` | boolean | Pendiente | true = generada desde recurrente variable, pendiente de confirmar |
| `tx_source` | text optionset | Origen | `manual` · `voice` · `receipt` · `import` · `automatic` |
| `tx_attachment_url` | text | Adjunto | Path relativo en Supabase Storage |
| `tx_metadata` | jsonb | — | Datos extra: OCR crudo, dirección transferencia, etc. |
| `tx_created_at` | timestamptz | — | |
| `tx_updated_at` | timestamptz | — | |

**Nota — Tipos de transacción:**
- `income`: el dinero entra a la cuenta
- `expense`: el dinero sale de la cuenta
- No existe tipo `transfer` en la tabla. Una transferencia entre cuentas genera **2 filas**: `expense` en cuenta origen + `income` en cuenta destino, ambas con el mismo `tx_transfer_pair_id`. El trigger actualiza el saldo de las dos cuentas automáticamente.

---

### `recurring_transactions`
Plantillas para gastos/ingresos que se repiten. Generan transacciones automáticamente en la fecha indicada.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `rec_id` | uuid PK | — | |
| `rec_usr_id` | uuid FK | — | → `auth.users.id` |
| `rec_acc_id` | uuid FK | Cuenta | → `accounts.acc_id` |
| `rec_cat_id` | uuid FK | Categoría | → `categories.cat_id` |
| `rec_name` | text | Nombre | Ej: "Netflix", "Alquiler piso" |
| `rec_amount` | numeric(15,2) | Importe | Fijo o estimado |
| `rec_is_variable` | boolean | Variable | Si true: TX generada se marca `tx_is_pending = true` |
| `rec_type` | text optionset | Tipo | `income` · `expense` |
| `rec_notes` | text | Notas | Opcional |
| `rec_frequency` | text optionset | Frecuencia | `daily` · `weekly` · `monthly` · `yearly` |
| `rec_day_of_month` | integer | Día del mes | 1-31 (para frecuencia monthly) |
| `rec_start_date` | date | Desde | |
| `rec_end_date` | date | Hasta | null = indefinido |
| `rec_last_generated` | date | Última generación | |
| `rec_is_active` | boolean | Activa | Pausar sin eliminar |
| `rec_created_at` | timestamptz | — | |

---

### `financial_config`
Configuración financiera global del usuario. Una fila por usuario. Opcional — si no existe, la app funciona sin objetivos de presupuesto.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `fcfg_id` | uuid PK | — | |
| `fcfg_usr_id` | uuid FK | — | → `auth.users.id` (único por usuario) |
| `fcfg_monthly_income_target` | numeric(15,2) | Ingreso objetivo | Ej: 2100 |
| `fcfg_pct_fixed_expense` | integer | % Gastos fijos | Ej: 40 |
| `fcfg_pct_variable_expense` | integer | % Gastos variables | Ej: 25 |
| `fcfg_pct_saving` | integer | % Ahorro | Ej: 15 |
| `fcfg_pct_investment` | integer | % Inversión | Ej: 15 |
| `fcfg_updated_at` | timestamptz | — | Suma de % ≤ 100; resto = buffer libre |

**Constraint:** `fcfg_pct_fixed_expense + fcfg_pct_variable_expense + fcfg_pct_saving + fcfg_pct_investment <= 100`

---

### `budgets`
Límite de gasto opcional por categoría concreta. Nadie está obligado a usarlo.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `bud_id` | uuid PK | — | |
| `bud_usr_id` | uuid FK | — | → `auth.users.id` |
| `bud_cat_id` | uuid FK | Categoría | → `categories.cat_id` |
| `bud_amount` | numeric(15,2) | Límite | |
| `bud_period` | text optionset | Periodo | `monthly` · `yearly` |
| `bud_start_date` | date | Desde | |
| `bud_end_date` | date | Hasta | null = indefinido |
| `bud_created_at` | timestamptz | — | |

**Query "presupuesto activo hoy":**
```sql
SELECT * FROM budgets
WHERE bud_usr_id = auth.uid()
  AND bud_cat_id = $cat_id
  AND bud_start_date <= CURRENT_DATE
  AND (bud_end_date IS NULL OR bud_end_date >= CURRENT_DATE)
ORDER BY bud_start_date DESC
LIMIT 1;
```

---

### `goals`
Objetivos de ahorro personales. `goal_saved` es un acumulado manual (el usuario va añadiendo lo que aparta), **independiente** del sistema de cuentas y transacciones — los goals son metas con seguimiento propio.

| Campo | Tipo | Label ES | Notas |
|---|---|---|---|
| `goal_id` | uuid PK | — | |
| `goal_usr_id` | uuid FK | — | → `auth.users.id` |
| `goal_name` | text | Nombre | Ej: "Fondo emergencia", "Viaje Japón" |
| `goal_category` | text optionset | Categoría | `emergency` · `travel` · `car` · `home` · `education` · `retirement` · `other` |
| `goal_target` | numeric(15,2) | Objetivo | Importe total a alcanzar; > 0 |
| `goal_saved` | numeric(15,2) | Ahorrado | Acumulado manual; se incrementa via "Añadir ahorro" |
| `goal_monthly` | numeric(15,2) | Aportación mensual | Referencia orientativa (no genera transacciones) |
| `goal_deadline` | date | Fecha límite | null = sin plazo |
| `goal_is_active` | boolean | Activo | false = soft-delete (historial preservado) |
| `goal_created_at` | timestamptz | — | |
| `goal_updated_at` | timestamptz | — | Auto-actualizado por trigger |

**Decisión de diseño:** `goal_saved` es columna directa, no calculada desde `transactions`. Las metas de ahorro son independientes del sistema de cuentas; el usuario aporta manualmente cuánto ha apartado. Esto permite goals de ahorro fuera de las cuentas registradas en la app (hucha física, cuenta externa, etc.).

---

## Relaciones entre tablas

```
auth.users
    ├── profiles                  (1:1, auto-creado al registrarse)
    ├── accounts                  (1:N)
    ├── categories                (1:N, 18 base auto-creadas al registrarse)
    ├── transactions              (1:N)
    ├── recurring_transactions    (1:N)
    ├── financial_config          (1:1, opcional)
    ├── budgets                   (1:N, opcional)
    └── goals                     (1:N, opcional)

accounts     ──► transactions           (acc_id → tx_acc_id)
accounts     ──► recurring_transactions (acc_id → rec_acc_id)
categories   ──► transactions           (cat_id → tx_cat_id)
categories   ──► recurring_transactions (cat_id → rec_cat_id)
categories   ──► budgets                (cat_id → bud_cat_id)
categories   ──► categories             (cat_id → cat_parent_id, self-ref)
recurring    ──► transactions           (rec_id → tx_rec_id)
```

---

## Decisiones de diseño clave

| Decisión | Razón |
|---|---|
| `tx_type` solo `income`/`expense` (sin `transfer`) | Las transferencias son 2 filas enlazadas por `tx_transfer_pair_id`; el trigger actualiza ambas cuentas automáticamente |
| `cat_type` en inglés | Consistente con el resto de valores CHECK del schema (`tx_type`, `acc_type`, `tx_source`...); los labels en UI se traducen en el frontend |
| Categorías por usuario (no globales) | RLS simple; cada usuario puede personalizar sin afectar a otros |
| `tx_is_pending` en transactions | Para transacciones recurrentes variables: generadas automáticamente pero a confirmar manualmente |
| `rec_name` obligatorio | Identificador visual del recurrente en la UI (ej: "Netflix", "Alquiler") |
| `TEXT + CHECK` en vez de ENUM | Las migraciones en Supabase son más limpias sin ENUMs |
| `acc_current_balance` desnormalizado | O(1) en lectura; recalculado desde cero por trigger (no incremental). Siempre = suma real de transacciones, sin saldo inicial. El balance visual con demos se suma en frontend. |
| `tx_usr_id` redundante en transactions | RLS eficiente sin joins a accounts |
| `tx_metadata JSONB` | Datos extra de IA (OCR, etc.) sin alterar esquema |
| Suma de % ≤ 100 en `financial_config` | Constraint a nivel de tabla; el resto es buffer libre |
| `bud_end_date` nullable | null = presupuesto indefinido; facilita query "presupuesto activo hoy" |
| `goal_saved` columna directa (no calculada) | Goals son independientes del sistema de cuentas; permite metas en efectivo o cuentas externas sin registrar |
| `goal_is_active` soft-delete | Preserva historial de metas completadas o canceladas |
| Sin policies `_admin` en tablas de datos | Cada usuario (incluido admin) solo ve sus propios datos via policy `_own`. Solo `profiles` tiene `prof_admin` para gestión de roles. Migration 021. |

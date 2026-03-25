# 🚀 Guía Rápida: Migrar Datos V1 a V2

## Resumen de lo que tienes

📊 **Excel**: `Control_Financiero_DB.xlsx`
- 257 transacciones (sep-nov 2025)
- 25 categorías V1

🗄️ **Destino**: Supabase finanzas-v2
- PostgreSQL real
- 8 tablas con RLS
- 18 categorías base pre-seeded

---

## Proceso en 5 minutos

### 1️⃣ Obtén tu User ID (en Supabase)

Abre Supabase → SQL Editor → copia esto:

```sql
SELECT id, email FROM auth.users LIMIT 5;
```

Ejecuta y copia el `id` (UUID) del usuario que quieres usar.

**Ejemplo:** `550e8400-e29b-41d4-a716-446655440000`

---

### 2️⃣ Obtén o Crea una Cuenta

```sql
-- Ver cuentas existentes
SELECT acc_id, acc_name FROM accounts WHERE acc_usr_id = 'TU_USER_ID';

-- Si no hay, crear una:
INSERT INTO accounts (
  acc_usr_id, acc_name, acc_type, acc_currency,
  acc_initial_balance, acc_color, acc_icon
) VALUES (
  'TU_USER_ID'::UUID,
  'Principal',
  'bank',
  'EUR',
  0,
  '#3b82f6',
  '🏦'
) RETURNING acc_id;
```

Copia el `acc_id` que te devuelve.

**Ejemplo:** `550e8400-e29b-41d4-a716-446655440001`

---

### 3️⃣ Genera el SQL de Migración

Abre Claude Code desde la carpeta `finanzas-v2/` y ejecuta:

```bash
python scripts/migrate_v1_to_v2.py \
  --excel-path docs/Control_Financiero_DB.xlsx \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --account-id "550e8400-e29b-41d4-a716-446655440001"
```

El script genera `migration.sql` automáticamente.

---

### 4️⃣ Ejecuta la Migración en Supabase

1. Ve a Supabase → SQL Editor
2. Copia todo el contenido de `migration.sql`
3. Pega en el SQL Editor
4. Ejecuta (botón ▶️)

**Resultado esperado:**
```
query completed (257 rows affected)
Total inserted: 257
Summary by type:
income | 27 | 13,543.21
expense | 230 | 4,892.50
```

---

### 5️⃣ Verifica en la App

Abre finanzas-v2 en el navegador y ve el Dashboard. Deberías ver:
- Últimas transacciones importadas
- Saldo calculado automáticamente
- Gráfica con datos reales

---

## ¿Qué pasa si algo falla?

### Error: "Category not found"
**Causa:** El script no encuentra la categoría V2 por nombre.

**Solución:** Abre `scripts/migrate_v1_to_v2.py` y ajusta el `CATEGORY_NAME_MAPPING` con nombres exactos de tus categorías base.

### Error: "Foreign key violation"
**Causa:** El `user_id` o `account_id` no existen.

**Solución:** Verifica que copiaste correctamente en el paso 1-2.

### Error: "RLS denied access"
**Causa:** RLS está activo y el usuario no tiene permiso.

**Solución:** Verifica que usaste el `user_id` correcto (el del usuario autenticado).

---

## Qué ocurre en detalle

### Mapeo Automático de Categorías

El script mapea automáticamente:
```
V1 "Sueldo" (income)        → V2 "Nómina" (income)
V1 "Alquiler" (expense)     → V2 "Alquiler" (fixed_expense)
V1 "Compras" (expense_var)  → V2 "Supermercado" (variable_expense)
...
```

**Importante:** Algunos campos V1 se transforman:
- `tx.type` V1 (income/expense_var/saving/etc) → V2 `tx.type` (income/expense) + `cat_type`
- `catId` V1 (mig_1, mig_2...) → `tx_cat_id` V2 (UUID real)
- `accountId` V1 (acc1) → `tx_acc_id` V2 (UUID real)

### Datos que se Insertan

Cada transacción V1 genera una fila en `transactions` V2 con:
```sql
tx_id         UUID generado
tx_usr_id     Tu user ID
tx_acc_id     Tu account ID
tx_cat_id     ID de categoría mapeada
tx_amount     Del Excel (ej: 488.83)
tx_type       'income' o 'expense'
tx_date       Del Excel (ej: 2025-09-01)
tx_notes      Del Excel (ej: "Alquiler septiembre")
tx_source     'import' (marca que vienen del Excel)
```

### Saldo Automático

Después de insertar:
- El trigger `update_account_balance()` calcula `acc_current_balance` automáticamente
- Saldo = suma(income) - suma(expense) en la cuenta

---

## Archivos Creados

- ✅ `docs/MIGRACION_DATOS_V1_A_V2.md` — Documentación completa (tecnical)
- ✅ `scripts/migrate_v1_to_v2.py` — Script Python automático
- ✅ `docs/MIGRACION_GUIA_RAPIDA.md` — Este archivo (quick start)

---

## Checklist Final

- [ ] User ID copiado ✅
- [ ] Account ID copiado ✅
- [ ] Script ejecutado: `python scripts/migrate_v1_to_v2.py ...`
- [ ] `migration.sql` generado
- [ ] SQL pegado en Supabase SQL Editor
- [ ] Migración ejecutada sin errores
- [ ] 257 transacciones insertadas
- [ ] Dashboard muestra datos + gráfica

---

## Soporte

Si algo falla, revisa:
1. `docs/MIGRACION_DATOS_V1_A_V2.md` — Documentación técnica completa
2. Supabase Logs → Errores SQL exactos
3. `scripts/migrate_v1_to_v2.py` → Ajusta mapeos si es necesario

**¿Necesitas help?** Abre Claude Code y pregunta sobre la migración. El backend-specialist agent se activará automáticamente. 🤖

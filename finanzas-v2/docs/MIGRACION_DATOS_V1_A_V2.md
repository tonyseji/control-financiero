# Migración de Datos V1 → V2 (Excel a Supabase)

## Análisis del Excel

El archivo `Control_Financiero_DB.xlsx` contiene:

### 📊 Hoja "Transacciones"
- **257 transacciones** de septiembre a noviembre 2025
- Campos: `id`, `type`, `amount`, `date`, `catId`, `note`, `accountId`
- Rango de fechas: 2025-09-01 hasta 2025-11-30

### 📋 Hoja "Categorías"
- **25 categorías** con mapping de IDs V1
- Tipos V1: `expense`, `expense_var`, `income`, `saving`, `invest`
- Colores: Hex codes (#3b82f6, etc.)
- IDs: `mig_1`, `mig_2`, ... `mig_25`

---

## Mapeo V1 → V2

### Tipos de Transacción (catId.type V1 → tx.type V2)

En finanzas-v2, `tx.type` es solo **directional**:
```
V1 type              → V2 tx.type     | V2 cat_type
─────────────────────────────────────────────────
income               → income         | income
expense              → expense        | fixed_expense
expense_var          → expense        | variable_expense
saving               → expense        | saving
invest               → expense        | investment
```

**Nota crítica:** En V2, `tx.type` siempre es `income` o `expense`. La granularidad va en `categories.cat_type`.

### Mapeo de Categorías V1 a V2

Cada categoría V1 (`mig_*`) debe enlazarse a una categoría V2 existente (seed de 18 base):

| ID V1 | Nombre V1 | Tipo V1 | → Categoría V2 (cat_type) | cat_id (UUID) |
|---|---|---|---|---|
| mig_1 | Alquiler | expense | fixed_expense | [obtener de seed] |
| mig_2 | Otros | expense_var | variable_expense | [obtener de seed] |
| mig_3 | Compras | expense_var | variable_expense | [obtener de seed] |
| ... | ... | ... | ... | ... |

---

## Pasos de Migración

### PASO 1: Preparar datos (en Supabase SQL Editor)

Primero, obtén el `user_id` del usuario admin (o crea un usuario de prueba):

```sql
-- Ver usuarios en auth.users
SELECT id, email FROM auth.users LIMIT 5;

-- Copiar el ID del usuario que vas a usar
-- Ejemplo: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```

**Guarda el user_id para los siguientes pasos.**

---

### PASO 2: Crear tabla temporal de mapeo V1 → V2

En el SQL Editor de Supabase, copia este script:

```sql
-- Tabla temporal para mapear categorías V1 → V2
-- (Ejecuta esto SOLO UNA VEZ)

CREATE TEMP TABLE mig_cat_mapping (
  v1_id TEXT,
  v1_name TEXT,
  v1_type TEXT,
  v2_cat_type TEXT,
  v2_cat_id UUID,
  mapped BOOLEAN DEFAULT FALSE
);

-- Insert mapping data
-- Deberás obtener los cat_id reales de tu tabla categories
-- Por ahora, aquí está el MAPEO LÓGICO:

INSERT INTO mig_cat_mapping (v1_id, v1_name, v1_type, v2_cat_type) VALUES
  ('mig_1', 'Alquiler', 'expense', 'fixed_expense'),
  ('mig_2', 'Otros', 'expense_var', 'variable_expense'),
  ('mig_3', 'Compras', 'expense_var', 'variable_expense'),
  ('mig_4', 'Deporte', 'expense_var', 'variable_expense'),
  ('mig_5', 'Devolución impuestos', 'income', 'income'),
  ('mig_6', 'Donacion', 'expense_var', 'variable_expense'),
  ('mig_7', 'Factura Luz/Agua/Gas', 'expense', 'fixed_expense'),
  ('mig_8', 'Farmacia', 'expense_var', 'variable_expense'),
  ('mig_9', 'Fin de Semana', 'expense_var', 'variable_expense'),
  ('mig_10', 'Frigorífico', 'expense_var', 'variable_expense'),
  ('mig_11', 'Gasolina', 'expense_var', 'variable_expense'),
  ('mig_12', 'Internet / Móvil', 'expense', 'fixed_expense'),
  ('mig_13', 'Lavandería', 'expense_var', 'variable_expense'),
  ('mig_14', 'Limpieza', 'expense_var', 'variable_expense'),
  ('mig_15', 'Ocio', 'expense_var', 'variable_expense'),
  ('mig_16', 'Peluquería', 'expense_var', 'variable_expense'),
  ('mig_17', 'Ropa', 'expense_var', 'variable_expense'),
  ('mig_18', 'Suscripción', 'expense', 'fixed_expense'),
  ('mig_19', 'Sueldo', 'income', 'income'),
  ('mig_20', 'Taller Coche', 'expense_var', 'variable_expense'),
  ('mig_21', 'Taxi', 'expense_var', 'variable_expense'),
  ('mig_22', 'Otros Ingresos', 'income', 'income'),
  ('mig_23', 'Parking', 'expense_var', 'variable_expense'),
  ('mig_24', 'Restaurante', 'expense_var', 'variable_expense'),
  ('mig_25', 'Comida/Supermercado', 'expense_var', 'variable_expense'),
  ('mig_26', 'Snacks', 'expense_var', 'variable_expense');
```

---

### PASO 3: Obtener IDs reales de categorías base V2

Las categorías base se crean automáticamente al registrarse un usuario. Para obtener sus UUIDs:

```sql
-- Obtener todas las categorías base del usuario
-- (Reemplaza 'USER_ID_AQUI' con el UUID que copiaste en PASO 1)

SELECT
  cat_id,
  cat_name,
  cat_type,
  cat_is_system
FROM categories
WHERE cat_usr_id = 'USER_ID_AQUI'
  AND cat_is_system = TRUE
ORDER BY cat_name;
```

**Resultado esperado:** 18 categorías base (Alquiler, Supermercado, Nómina, etc.)

---

### PASO 4: Crear tabla de IDs de cuentas

Para las transacciones, necesitas saber qué cuenta (account) usar. En el Excel hay `accountId` = `acc1`.

```sql
-- Ver o crear cuenta
-- Primero, verifica si existe una cuenta:

SELECT
  acc_id,
  acc_name,
  acc_type,
  acc_current_balance
FROM accounts
WHERE acc_usr_id = 'USER_ID_AQUI';

-- Si no hay, crea una:
INSERT INTO accounts (acc_usr_id, acc_name, acc_type, acc_currency, acc_initial_balance, acc_color, acc_icon)
VALUES (
  'USER_ID_AQUI',
  'Cuenta Principal',
  'bank',
  'EUR',
  0,
  '#3b82f6',
  '🏦'
) RETURNING acc_id;

-- Guarda el acc_id que se devuelve
```

---

### PASO 5: Insertar Transacciones Migradas

Este es el script principal que INSERTA todas las transacciones. Reemplaza:
- `'USER_ID_AQUI'` con tu user_id
- `'ACC_ID_AQUI'` con el account ID
- Los `cat_id` con los UUIDs reales de las categorías

```sql
-- ⚠️ SCRIPT DE INSERCIÓN MASIVA DE TRANSACCIONES
-- Antes de ejecutar, asegúrate de haber completado los PASOS 1-4

INSERT INTO transactions (
  tx_usr_id,
  tx_acc_id,
  tx_cat_id,
  tx_amount,
  tx_type,
  tx_date,
  tx_notes,
  tx_source
)
-- Mapeo manual de transacciones (primeras 257 de V1)
-- El siguiente es PSEUDOCÓDIGO — necesitas rellenar los cat_id reales

SELECT
  'USER_ID_AQUI'::UUID as tx_usr_id,
  'ACC_ID_AQUI'::UUID as tx_acc_id,
  CASE
    WHEN catId = 'mig_1' THEN (SELECT cat_id FROM categories WHERE cat_name = 'Alquiler' AND cat_usr_id = 'USER_ID_AQUI')
    WHEN catId = 'mig_2' THEN (SELECT cat_id FROM categories WHERE cat_name = 'Otros' AND cat_usr_id = 'USER_ID_AQUI')
    WHEN catId = 'mig_3' THEN (SELECT cat_id FROM categories WHERE cat_name = 'Supermercado' AND cat_usr_id = 'USER_ID_AQUI')
    -- ... (continúa para mig_4 hasta mig_26)
  END as tx_cat_id,
  amount::NUMERIC(15,2) as tx_amount,
  CASE
    WHEN type = 'income' THEN 'income'
    WHEN type IN ('expense', 'expense_var', 'saving', 'invest') THEN 'expense'
  END as tx_type,
  date::DATE as tx_date,
  note as tx_notes,
  'import' as tx_source
FROM (
  VALUES
    ('xl_1', 'income', 1771.56, '2025-09-01', 'mig_22', 'Sueldo mensual'),
    ('xl_2', 'expense', 488.83, '2025-09-01', 'mig_1', 'Alquiler septiembre'),
    ('xl_3', 'expense', 6.82, '2025-09-02', 'mig_7', 'Factura Luz/Agua/Gas'),
    -- ... (257 transacciones total)
) AS data(id, type, amount, date, catId, note)
ON CONFLICT DO NOTHING;
```

---

## ⚠️ Enfoque Alternativo (Recomendado): Script Python

Para evitar errores manuales, es mejor usar un **script Python que genere el SQL correcto**.

Te preparo un script que:
1. Lee el Excel
2. Obtiene los cat_id reales de Supabase
3. Genera el INSERT SQL correcto
4. Lo ejecuta directamente

¿Quieres que te lo haga?

---

## Checklist Pre-Migración

- [ ] User creado y email verificado
- [ ] 18 categorías base seeded en la tabla `categories`
- [ ] Al menos una cuenta creada en `accounts`
- [ ] user_id copiado
- [ ] acc_id copiado
- [ ] Backup de Supabase realizado (desde Supabase dashboard)
- [ ] RLS habilitado en staging (si aplica)

---

## Post-Migración: Verificaciones

Después de insertar, verifica:

```sql
-- Ver transacciones insertadas
SELECT COUNT(*), SUM(tx_amount) FROM transactions WHERE tx_source = 'import';

-- Ver resumen por tipo
SELECT tx_type, COUNT(*), SUM(tx_amount) FROM transactions WHERE tx_source = 'import' GROUP BY tx_type;

-- Ver resumen por categoría
SELECT c.cat_name, COUNT(t.tx_id), SUM(t.tx_amount)
FROM transactions t
JOIN categories c ON t.tx_cat_id = c.cat_id
WHERE t.tx_source = 'import'
GROUP BY c.cat_name
ORDER BY SUM(t.tx_amount) DESC;
```

---

## Próximos Pasos

1. **Confirmar que quieres proceder** con la migración
2. **Decidir si prefieres:**
   - Opción A: Inserción manual via SQL Editor (requiere rellenar cat_id a mano)
   - Opción B: Script Python automático (más seguro y rápido)
3. **Ejecutar en staging primero**, validar, luego en producción

#!/usr/bin/env python3
"""
Migración de Datos V1 → V2 (Excel a Supabase)

Uso:
  python migrate_v1_to_v2.py --excel-path <ruta-excel> --user-id <user-uuid> --account-id <account-uuid>

Ejemplo:
  python migrate_v1_to_v2.py \
    --excel-path ../docs/Control_Financiero_DB.xlsx \
    --user-id "550e8400-e29b-41d4-a716-446655440000" \
    --account-id "550e8400-e29b-41d4-a716-446655440001"
"""

import pandas as pd
import argparse
import json
from datetime import datetime
from typing import Dict, List, Tuple
import re
import uuid

# Mapeo V1 → V2 de tipos de categoría
CATEGORY_TYPE_MAPPING = {
    'income': 'income',
    'expense': 'fixed_expense',
    'expense_var': 'variable_expense',
    'saving': 'saving',
    'invest': 'investment'
}

# Mapeo de categorías V1 → nombres V2 más probables
CATEGORY_NAME_MAPPING = {
    'mig_1': 'Alquiler',
    'mig_2': 'Otros gastos',
    'mig_3': 'Supermercado',
    'mig_4': 'Ocio',
    'mig_5': 'Otros ingresos',
    'mig_6': 'Ocio',
    'mig_7': 'Suministros',
    'mig_8': 'Salud',
    'mig_9': 'Ocio',
    'mig_10': 'Supermercado',
    'mig_11': 'Transporte',
    'mig_12': 'Suscripciones',
    'mig_13': 'Otros gastos',
    'mig_14': 'Otros gastos',
    'mig_15': 'Ocio',
    'mig_16': 'Otros gastos',
    'mig_17': 'Ropa',
    'mig_18': 'Suscripciones',
    'mig_19': 'Nómina',
    'mig_20': 'Otros gastos',
    'mig_21': 'Transporte',
    'mig_22': 'Otros ingresos',
    'mig_23': 'Transporte',
    'mig_24': 'Restaurantes',
    'mig_25': 'Supermercado',
    'mig_26': 'Ocio'
}


def validate_uuid(uuid_str: str) -> bool:
    """Valida que una string sea un UUID válido."""
    try:
        uuid.UUID(uuid_str)
        return True
    except ValueError:
        return False


def read_excel_data(excel_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Lee las hojas de Transacciones y Categorías del Excel."""
    try:
        transactions = pd.read_excel(excel_path, sheet_name='Transacciones')
        categories = pd.read_excel(excel_path, sheet_name='Categorias')
        return transactions, categories
    except Exception as e:
        print(f"❌ Error al leer Excel: {e}")
        exit(1)


def generate_migration_sql(
    transactions_df: pd.DataFrame,
    categories_df: pd.DataFrame,
    user_id: str,
    account_id: str,
    category_mapping: Dict[str, str]
) -> str:
    """Genera SQL INSERT para migración."""

    sql_lines = [
        "-- Migración de Transacciones V1 → V2",
        f"-- Generado: {datetime.now().isoformat()}",
        f"-- User ID: {user_id}",
        f"-- Account ID: {account_id}",
        f"-- Total transacciones: {len(transactions_df)}",
        "",
        "BEGIN;"
    ]

    # Preparar VALUES para insert masivo
    values = []

    for idx, row in transactions_df.iterrows():
        # Convertir tipo V1 a V2
        v1_type = row['type']
        v2_type = 'income' if v1_type == 'income' else 'expense'

        # Mapear categoría
        v1_cat_id = row['catId']
        v2_cat_name = category_mapping.get(v1_cat_id, 'Otros gastos')

        # Limpiar nota
        note = str(row['note']).replace("'", "''") if pd.notna(row['note']) else ""

        # Convertir fecha a ISO
        date = pd.to_datetime(row['date']).strftime('%Y-%m-%d')

        # Generar UUID para tx_id
        tx_id = str(uuid.uuid4())

        # Armar línea VALUES
        # (tx_id, tx_usr_id, tx_acc_id, tx_cat_id, tx_amount, tx_type, tx_date, tx_notes, tx_source, tx_created_at, tx_updated_at)
        values.append(
            f"('{tx_id}'::uuid, '{user_id}'::uuid, '{account_id}'::uuid, "
            f"(SELECT cat_id FROM categories WHERE cat_name = '{v2_cat_name}' AND cat_usr_id = '{user_id}' LIMIT 1), "
            f"{row['amount']}, '{v2_type}', '{date}'::date, '{note}', 'import', now(), now())"
        )

    # Insertar en una sola transacción
    sql_lines.append(
        "INSERT INTO transactions (tx_id, tx_usr_id, tx_acc_id, tx_cat_id, tx_amount, tx_type, tx_date, tx_notes, tx_source, tx_created_at, tx_updated_at)"
    )
    sql_lines.append("VALUES")
    sql_lines.append(",\n".join(values) + ";")

    # Verificaciones post-inserción
    sql_lines.extend([
        "",
        "-- Verificaciones",
        f"SELECT COUNT(*) as total_inserted FROM transactions WHERE tx_source = 'import' AND tx_usr_id = '{user_id}'::uuid;",
        f"SELECT tx_type, COUNT(*), SUM(tx_amount) FROM transactions WHERE tx_source = 'import' AND tx_usr_id = '{user_id}'::uuid GROUP BY tx_type;",
        "",
        "COMMIT;"
    ])

    return "\n".join(sql_lines)


def main():
    parser = argparse.ArgumentParser(
        description='Migra datos de Excel V1 a Supabase V2'
    )
    parser.add_argument(
        '--excel-path',
        required=True,
        help='Ruta al archivo Excel (Control_Financiero_DB.xlsx)'
    )
    parser.add_argument(
        '--user-id',
        required=True,
        help='UUID del usuario en auth.users'
    )
    parser.add_argument(
        '--account-id',
        required=True,
        help='UUID de la cuenta en accounts'
    )
    parser.add_argument(
        '--output',
        default='migration.sql',
        help='Archivo SQL de salida (default: migration.sql)'
    )

    args = parser.parse_args()

    # Validaciones
    if not validate_uuid(args.user_id):
        print(f"❌ user-id no es un UUID válido: {args.user_id}")
        exit(1)

    if not validate_uuid(args.account_id):
        print(f"❌ account-id no es un UUID válido: {args.account_id}")
        exit(1)

    print(f"📖 Leyendo Excel: {args.excel_path}")
    transactions, categories = read_excel_data(args.excel_path)

    print(f"✅ Transacciones: {len(transactions)} filas")
    print(f"✅ Categorías: {len(categories)} filas")

    print(f"\n🔄 Generando SQL de migración...")
    sql = generate_migration_sql(
        transactions,
        categories,
        args.user_id,
        args.account_id,
        CATEGORY_NAME_MAPPING
    )

    # Guardar SQL
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(sql)

    print(f"✅ SQL generado: {args.output}")
    print(f"\n📋 Próximos pasos:")
    print(f"1. Copia el contenido de {args.output}")
    print(f"2. Abre Supabase SQL Editor (SQL → New Query)")
    print(f"3. Pega el SQL y ejecuta")
    print(f"4. Verifica que las transacciones se insertaron correctamente")

    # Mostrar resumen
    print(f"\n📊 Resumen:")
    print(f"   Total transacciones a migrar: {len(transactions)}")
    print(f"   Rango de fechas: {transactions['date'].min().date()} a {transactions['date'].max().date()}")
    print(f"   Monto total: €{transactions['amount'].sum():.2f}")
    print(f"   Transacciones income: {(transactions['type'] == 'income').sum()}")
    print(f"   Transacciones expense: {(transactions['type'] != 'income').sum()}")


if __name__ == '__main__':
    main()

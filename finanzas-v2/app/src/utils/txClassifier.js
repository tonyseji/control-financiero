/**
 * txClassifier.js — Clasificación semántica de transacciones.
 * Fuente de verdad para todas las vistas. No duplicar esta lógica.
 *
 * Cada función recibe la transacción (tx) y opcionalmente su categoría (cat = tx.categories).
 */

/** Transferencia interna — excluir de todos los totales */
export function isTransfer(tx) {
  return tx.tx_transfer_pair_id != null
}

/** Ahorro (cat_type === 'saving' y no es transferencia) */
export function isSaving(tx, cat) {
  if (isTransfer(tx)) return false
  const catType = cat?.cat_type ?? tx?.categories?.cat_type
  return catType === 'saving'
}

/** Inversión (cat_type === 'investment' y no es transferencia) */
export function isInvestment(tx, cat) {
  if (isTransfer(tx)) return false
  const catType = cat?.cat_type ?? tx?.categories?.cat_type
  return catType === 'investment'
}

/** Gasto real (fixed_expense o variable_expense, no transferencia) */
export function isRealExpense(tx, cat) {
  if (isTransfer(tx)) return false
  const catType = cat?.cat_type ?? tx?.categories?.cat_type
  return catType === 'fixed_expense' || catType === 'variable_expense'
}

/** Ingreso real (tx_type === 'income' y no es transferencia) */
export function isIncome(tx) {
  return tx.tx_type === 'income' && !isTransfer(tx)
}

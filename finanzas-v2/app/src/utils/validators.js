// Validación de formularios antes de enviar a Supabase

export function validateTransaction(data) {
  const errors = {}
  if (!data.tx_acc_id)               errors.tx_acc_id = 'Elige una cuenta'
  if (!data.tx_amount || data.tx_amount <= 0) errors.tx_amount = 'El importe debe ser mayor que 0'
  if (!data.tx_type)                 errors.tx_type = 'Elige el tipo'
  if (!data.tx_date)                 errors.tx_date = 'Elige una fecha'
  return errors
}

export function validateAccount(data) {
  const errors = {}
  if (!data.acc_name?.trim()) errors.acc_name = 'El nombre es obligatorio'
  if (!data.acc_type)         errors.acc_type = 'Elige el tipo de cuenta'
  return errors
}

export function validateCategory(data) {
  const errors = {}
  if (!data.cat_name?.trim()) errors.cat_name = 'El nombre es obligatorio'
  if (!data.cat_type)         errors.cat_type = 'Elige el tipo'
  return errors
}
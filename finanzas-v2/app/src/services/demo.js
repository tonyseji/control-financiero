import { supabase, getAuthUserId } from './supabase'

// Colores por defecto para cat_type cuando no hay categoría real del usuario
const DEFAULT_CAT_COLORS = {
  income:           '#22c55e',
  fixed_expense:    '#6366f1',
  variable_expense: '#f43f5e',
  saving:           '#06b6d4',
  investment:       '#10b981',
}

/**
 * Retorna los demo templates activos del usuario, normalizados para que tengan
 * el mismo shape que las transacciones reales usadas en Dashboard y Transactions.
 *
 * Calcula la fecha real a partir de ddt_date_offset (días desde HOY).
 *
 * @returns {Promise<Array>}
 */
export async function getDemoTransactions() {
  const userId = await getAuthUserId()

  // 1. Obtener los templates activos del usuario
  const { data: access, error: accessError } = await supabase
    .from('user_demo_access')
    .select('uda_template_id, uda_expires_at')
    .eq('uda_user_id', userId)
    .eq('uda_is_active', true)
    .gt('uda_expires_at', new Date().toISOString())

  if (accessError) throw accessError
  if (!access || access.length === 0) return []

  const templateIds = access.map(a => a.uda_template_id)

  // 2. Obtener los templates
  const { data: templates, error: tplError } = await supabase
    .from('demo_data_templates')
    .select('*')
    .in('ddt_id', templateIds)
    .order('ddt_order', { ascending: true })

  if (tplError) throw tplError
  if (!templates || templates.length === 0) return []

  // 3. Obtener las categorías del usuario para enriquecer cat_name → cat real
  const { data: userCats } = await supabase
    .from('categories')
    .select('cat_id, cat_name, cat_type, cat_color')
    .eq('cat_usr_id', userId)

  // Mapa cat_type → primera categoría del usuario de ese tipo
  const catByType = {}
  if (userCats) {
    for (const cat of userCats) {
      if (!catByType[cat.cat_type]) catByType[cat.cat_type] = cat
    }
  }

  // 4. Normalizar cada template al shape de transacción real
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return templates.map(tpl => {
    const txDate = new Date(today)
    txDate.setDate(today.getDate() + tpl.ddt_date_offset)
    const dateStr = txDate.toISOString().slice(0, 10)

    // Enriquecer con categoría real del usuario si hay match por tipo
    const matchedCat = catByType[tpl.ddt_cat_type]
    const catName  = matchedCat?.cat_name  ?? tpl.ddt_cat_name
    const catColor = matchedCat?.cat_color ?? DEFAULT_CAT_COLORS[tpl.ddt_cat_type] ?? '#2e3558'
    const catType  = tpl.ddt_cat_type

    return {
      tx_id:              `demo_${tpl.ddt_id}`,
      tx_type:            tpl.ddt_tx_type,
      tx_amount:          tpl.ddt_amount,
      tx_date:            dateStr,
      tx_notes:           tpl.ddt_note ?? null,
      tx_is_demo:         true,
      tx_transfer_pair_id: null,
      tx_is_pending:      false,
      tx_usr_id:          userId,
      tx_acc_id:          null,
      accounts:           { acc_name: 'Demo' },
      categories: {
        cat_name:  catName,
        cat_type:  catType,
        cat_color: catColor,
      },
    }
  })
}

/**
 * Desactiva todos los demos del usuario actual.
 * No borra la fila, solo pone uda_is_active = false para mantener el historial.
 *
 * @returns {Promise<void>}
 */
export async function clearDemoData() {
  const userId = await getAuthUserId()
  const { error } = await supabase
    .from('user_demo_access')
    .update({ uda_is_active: false })
    .eq('uda_user_id', userId)
    .eq('uda_is_active', true)

  if (error) throw error
}

/**
 * Retorna el número de demos activos para el usuario actual.
 *
 * @returns {Promise<number>}
 */
export async function getDemoCount() {
  const userId = await getAuthUserId()
  const { count, error } = await supabase
    .from('user_demo_access')
    .select('*', { count: 'exact', head: true })
    .eq('uda_user_id', userId)
    .eq('uda_is_active', true)
    .gt('uda_expires_at', new Date().toISOString())

  if (error) throw error
  return count ?? 0
}

/**
 * Retorna la fecha de expiración del demo más próximo a vencer (la mínima).
 * Útil para mostrar "Expiran en X horas".
 *
 * @returns {Promise<Date|null>}
 */
export async function getDemoExpiry() {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('user_demo_access')
    .select('uda_expires_at')
    .eq('uda_user_id', userId)
    .eq('uda_is_active', true)
    .gt('uda_expires_at', new Date().toISOString())
    .order('uda_expires_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? new Date(data.uda_expires_at) : null
}

import { supabase, getAuthUserId } from './supabase'
import { createTransaction } from './transactions'

export async function getRecurring() {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, accounts(acc_name), categories(cat_name, cat_type)')
    .order('rec_created_at')
  if (error) throw error
  return data
}

export async function createRecurring(rec) {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({ ...rec, rec_usr_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurring(recId, changes) {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update(changes)
    .eq('rec_id', recId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurring(recId) {
  const { error } = await supabase.from('recurring_transactions').delete().eq('rec_id', recId)
  if (error) throw error
}

// Genera las transacciones pendientes de todos los recurrentes activos.
// Se llama una vez al arrancar la app (App.jsx). Es idempotente: comprueba
// si ya existe una TX con tx_rec_id + tx_date del periodo antes de insertar.
export async function generateDueRecurring() {
  const recs = await getRecurring()
  const active = recs.filter(r => r.rec_is_active && !r.rec_end_date || (r.rec_is_active && r.rec_end_date >= today()))

  const generated = []

  for (const rec of active) {
    const dates = getDueDates(rec)
    for (const date of dates) {
      // Verificar si ya existe TX generada para este recurrente en esta fecha
      const { data: existing } = await supabase
        .from('transactions')
        .select('tx_id')
        .eq('tx_rec_id', rec.rec_id)
        .eq('tx_date', date)
        .maybeSingle()

      if (existing) continue

      const tx = await createTransaction({
        tx_type:       rec.rec_type,
        tx_amount:     rec.rec_amount,
        tx_date:       date,
        tx_acc_id:     rec.rec_acc_id,
        tx_cat_id:     rec.rec_cat_id,
        tx_notes:      rec.rec_notes ?? null,
        tx_rec_id:     rec.rec_id,
        tx_is_pending: rec.rec_is_variable ?? false,
        tx_source:     'recurring',
      })
      generated.push(tx)

      // Actualizar rec_last_generated al último date procesado
      await updateRecurring(rec.rec_id, { rec_last_generated: date })
    }
  }

  return generated
}

// Devuelve las fechas en que debería haberse generado una TX y aún no se ha hecho.
// Cubre el periodo desde rec_last_generated (o rec_start_date) hasta hoy.
function getDueDates(rec) {
  const start = rec.rec_last_generated
    ? nextOccurrence(rec.rec_last_generated, rec.rec_frequency, rec.rec_day_of_month)
    : rec.rec_start_date ?? today()

  const end = today()
  const dates = []
  let current = start

  while (current <= end) {
    if (!rec.rec_end_date || current <= rec.rec_end_date) {
      dates.push(current)
    }
    current = nextOccurrence(current, rec.rec_frequency, rec.rec_day_of_month)
  }

  return dates
}

function nextOccurrence(fromDate, frequency, dayOfMonth) {
  const d = new Date(fromDate + 'T12:00:00')
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
    case 'monthly':
    default: {
      d.setMonth(d.getMonth() + 1)
      if (dayOfMonth) {
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(dayOfMonth, maxDay))
      }
      break
    }
  }
  return d.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
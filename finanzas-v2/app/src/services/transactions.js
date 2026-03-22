import { supabase } from '../supabase'

export async function getTransactions({ from, to } = {}) {
  let query = supabase
    .from('transactions')
    .select('*, accounts(acc_name), categories(cat_name, cat_type, cat_color)')
    .order('tx_date', { ascending: false })

  if (from) query = query.gte('tx_date', from)
  if (to)   query = query.lte('tx_date', to)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTransaction(tx) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...tx, tx_usr_id: user.id })
    .select('*, accounts(acc_name), categories(cat_name, cat_type, cat_color)')
    .single()
  if (error) throw error
  return data
}

// Transferencia: inserta 2 filas enlazadas por tx_transfer_pair_id
export async function createTransfer({ fromAccId, toAccId, amount, date, notes, catId }) {
  const pairId = crypto.randomUUID()
  const userId = (await supabase.auth.getUser()).data.user.id

  const rows = [
    {
      tx_usr_id: userId,
      tx_acc_id: fromAccId,
      tx_cat_id: catId ?? null,
      tx_transfer_pair_id: pairId,
      tx_amount: amount,
      tx_type: 'expense',
      tx_date: date,
      tx_notes: notes ?? null,
      tx_source: 'manual',
    },
    {
      tx_usr_id: userId,
      tx_acc_id: toAccId,
      tx_cat_id: catId ?? null,
      tx_transfer_pair_id: pairId,
      tx_amount: amount,
      tx_type: 'income',
      tx_date: date,
      tx_notes: notes ?? null,
      tx_source: 'manual',
    },
  ]

  const { data, error } = await supabase.from('transactions').insert(rows).select()
  if (error) throw error
  return data
}

export async function updateTransaction(txId, changes) {
  const { data, error } = await supabase
    .from('transactions')
    .update(changes)
    .eq('tx_id', txId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(txId) {
  const { error } = await supabase.from('transactions').delete().eq('tx_id', txId)
  if (error) throw error
}
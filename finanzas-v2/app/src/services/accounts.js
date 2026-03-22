import { supabase, getAuthUserId } from '../supabase'

export async function getAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('acc_is_active', true)
    .order('acc_created_at')
  if (error) throw error
  return data
}

export async function createAccount(account) {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      ...account,
      acc_usr_id: userId,
      acc_current_balance: account.acc_initial_balance ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(accId, changes) {
  const { data, error } = await supabase
    .from('accounts')
    .update(changes)
    .eq('acc_id', accId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAccount(accId) {
  // Soft-delete: marcar como inactiva (no borrar si tiene transacciones — RESTRICT en FK)
  const { data, error } = await supabase
    .from('accounts')
    .update({ acc_is_active: false })
    .eq('acc_id', accId)
    .select()
    .single()
  if (error) throw error
  return data
}
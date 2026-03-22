import { supabase } from '../supabase'

export async function getActiveBudgets() {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(cat_name, cat_type, cat_color)')
    .lte('bud_start_date', today)
    .or(`bud_end_date.is.null,bud_end_date.gte.${today}`)
    .order('bud_start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertBudget(budget) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('budgets')
    .upsert({ ...budget, bud_usr_id: user.id }, { onConflict: 'bud_usr_id,bud_cat_id,bud_period,bud_start_date' })
    .select('*, categories(cat_name, cat_type, cat_color)')
    .single()
  if (error) throw error
  return data
}

export async function deleteBudget(budId) {
  const { error } = await supabase.from('budgets').delete().eq('bud_id', budId)
  if (error) throw error
}
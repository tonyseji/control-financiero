import { supabase, getAuthUserId } from './supabase'

export async function getGoals() {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('goal_is_active', true)
    .order('goal_created_at')
  if (error) throw error
  return data
}

export async function createGoal(goal) {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('goals')
    .insert({
      goal_usr_id:    userId,
      goal_name:      goal.name,
      goal_category:  goal.category  ?? 'other',
      goal_target:    goal.target,
      goal_saved:     goal.saved     ?? 0,
      goal_monthly:   goal.monthly   ?? 0,
      goal_deadline:  goal.deadline  ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGoal(goalId, changes) {
  const { data, error } = await supabase
    .from('goals')
    .update(changes)
    .eq('goal_id', goalId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addSavings(goalId, amount) {
  // Leer el valor actual y sumar — no usamos rpc para mantener consistencia
  // con el patrón del resto de servicios
  const { data: current, error: fetchErr } = await supabase
    .from('goals')
    .select('goal_saved, goal_target')
    .eq('goal_id', goalId)
    .single()
  if (fetchErr) throw fetchErr

  const newSaved = Math.min(
    Number(current.goal_saved) + amount,
    Number(current.goal_target)
  )

  return updateGoal(goalId, { goal_saved: newSaved })
}

export async function deleteGoal(goalId) {
  // Soft-delete: marcar como inactiva para preservar historial
  return updateGoal(goalId, { goal_is_active: false })
}

import { useEffect, useState, useCallback } from 'react'
import { getGoals, createGoal, updateGoal, addSavings, deleteGoal } from '../services/goals'

export function useGoals() {
  const [goals, setGoals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGoals(await getGoals())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(goal) {
    const created = await createGoal(goal)
    setGoals(prev => [...prev, created])
    return created
  }

  async function update(goalId, changes) {
    const updated = await updateGoal(goalId, changes)
    setGoals(prev => prev.map(g => g.goal_id === goalId ? updated : g))
    return updated
  }

  async function addAmount(goalId, amount) {
    const updated = await addSavings(goalId, amount)
    setGoals(prev => prev.map(g => g.goal_id === goalId ? updated : g))
    return updated
  }

  async function remove(goalId) {
    await deleteGoal(goalId)
    setGoals(prev => prev.filter(g => g.goal_id !== goalId))
  }

  return { goals, loading, error, reload: load, add, update, addAmount, remove }
}

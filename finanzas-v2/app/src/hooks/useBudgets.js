import { useEffect, useState, useCallback } from 'react'
import { getActiveBudgets, upsertBudget, deleteBudget } from '../services/budgets'
import { getConfig, upsertConfig } from '../services/config'

export function useBudgets() {
  const [budgets, setBudgets]   = useState([])
  const [config, setConfig]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [b, c] = await Promise.all([getActiveBudgets(), getConfig()])
      setBudgets(b)
      setConfig(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveConfig(values) {
    const saved = await upsertConfig(values)
    setConfig(saved)
    return saved
  }

  async function saveBudget(budget) {
    const saved = await upsertBudget(budget)
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.bud_id === saved.bud_id)
      return idx >= 0 ? prev.map(b => b.bud_id === saved.bud_id ? saved : b) : [...prev, saved]
    })
    return saved
  }

  async function removeBudget(budId) {
    await deleteBudget(budId)
    setBudgets(prev => prev.filter(b => b.bud_id !== budId))
  }

  return { budgets, config, loading, error, reload: load, saveConfig, saveBudget, removeBudget }
}

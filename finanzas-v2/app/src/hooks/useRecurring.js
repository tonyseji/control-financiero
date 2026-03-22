import { useEffect, useState, useCallback } from 'react'
import { getRecurring, createRecurring, updateRecurring, deleteRecurring } from '../services/recurring'

export function useRecurring() {
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecurring(await getRecurring())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(rec) {
    const created = await createRecurring(rec)
    setRecurring(prev => [...prev, created])
    return created
  }

  async function toggle(recId, isActive) {
    const updated = await updateRecurring(recId, { rec_is_active: isActive })
    setRecurring(prev => prev.map(r => r.rec_id === recId ? updated : r))
    return updated
  }

  async function remove(recId) {
    await deleteRecurring(recId)
    setRecurring(prev => prev.filter(r => r.rec_id !== recId))
  }

  return { recurring, loading, error, reload: load, add, toggle, remove }
}

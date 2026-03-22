import { useEffect, useState, useCallback } from 'react'
import { getCategories, createCategory, updateCategory, hideCategory, deleteCategory } from '../services/categories'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCategories(await getCategories())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(category) {
    const created = await createCategory(category)
    setCategories(prev => [...prev, created])
    return created
  }

  async function update(catId, changes) {
    const updated = await updateCategory(catId, changes)
    setCategories(prev => prev.map(c => c.cat_id === catId ? updated : c))
    return updated
  }

  async function hide(catId) {
    await hideCategory(catId)
    setCategories(prev => prev.filter(c => c.cat_id !== catId))
  }

  async function remove(catId) {
    await deleteCategory(catId)
    setCategories(prev => prev.filter(c => c.cat_id !== catId))
  }

  return { categories, loading, error, reload: load, add, update, hide, remove }
}
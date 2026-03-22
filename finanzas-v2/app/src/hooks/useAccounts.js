import { useEffect, useState, useCallback } from 'react'
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts'

export function useAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await getAccounts())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(account) {
    const created = await createAccount(account)
    setAccounts(prev => [...prev, created])
    return created
  }

  async function update(accId, changes) {
    const updated = await updateAccount(accId, changes)
    setAccounts(prev => prev.map(a => a.acc_id === accId ? updated : a))
    return updated
  }

  async function remove(accId) {
    await deleteAccount(accId)
    setAccounts(prev => prev.filter(a => a.acc_id !== accId))
  }

  return { accounts, loading, error, reload: load, add, update, remove }
}
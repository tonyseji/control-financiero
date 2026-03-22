import { useEffect, useState, useCallback } from 'react'
import {
  getTransactions,
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
} from '../services/transactions'

export function useTransactions(filters = {}) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTransactions(await getTransactions(filters))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to])

  useEffect(() => { load() }, [load])

  async function add(tx) {
    const created = await createTransaction(tx)
    setTransactions(prev => [created, ...prev])
    return created
  }

  async function addTransfer(transfer) {
    const rows = await createTransfer(transfer)
    setTransactions(prev => [...rows, ...prev])
    return rows
  }

  async function update(txId, changes) {
    const updated = await updateTransaction(txId, changes)
    setTransactions(prev => prev.map(t => t.tx_id === txId ? updated : t))
    return updated
  }

  async function remove(txId) {
    await deleteTransaction(txId)
    setTransactions(prev => prev.filter(t => t.tx_id !== txId))
  }

  return { transactions, loading, error, reload: load, add, addTransfer, update, remove }
}
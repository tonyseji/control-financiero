import { useState, useEffect, useCallback } from 'react'
import { getDemoTransactions, clearDemoData, getDemoExpiry } from '../services/demo'

/**
 * Hook que gestiona los datos demo del usuario.
 *
 * - Carga los templates demo activos una sola vez al montar.
 * - Expone `clear()` para desactivar todos los demos y recargar.
 * - `demoActive` es true si hay al menos una transacción demo activa.
 * - `expiresAt` es la fecha Date de la expiración más próxima (o null).
 *
 * @returns {{
 *   demoTxs: Array,
 *   loading: boolean,
 *   error: string|null,
 *   demoActive: boolean,
 *   expiresAt: Date|null,
 *   clear: () => Promise<void>,
 *   reload: () => Promise<void>,
 * }}
 */
export function useDemoData() {
  const [demoTxs,   setDemoTxs]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txs, expiry] = await Promise.all([
        getDemoTransactions(),
        getDemoExpiry(),
      ])
      setDemoTxs(txs)
      setExpiresAt(expiry)
    } catch (err) {
      // Si el usuario no tiene sesión o no hay demos, no es error crítico
      const msg = err?.message ?? 'Error cargando datos de ejemplo'
      setError(msg)
      setDemoTxs([])
      setExpiresAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const clear = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await clearDemoData()
      setDemoTxs([])
      setExpiresAt(null)
    } catch (err) {
      setError(err?.message ?? 'Error al limpiar datos de ejemplo')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    demoTxs,
    loading,
    error,
    demoActive: demoTxs.length > 0,
    expiresAt,
    clear,
    reload: load,
  }
}

/**
 * Formatea el tiempo restante hasta `expiresAt` como texto legible.
 * Retorna null si expiresAt es null.
 *
 * @param {Date|null} expiresAt
 * @returns {string|null}
 */
export function formatDemoExpiry(expiresAt) {
  if (!expiresAt) return null
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return 'expirado'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours >= 1) return `${hours}h ${mins}m`
  return `${mins} min`
}

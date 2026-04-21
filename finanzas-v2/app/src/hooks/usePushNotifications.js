import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  savePushSubscription,
  removePushSubscription,
} from '../services/pushNotifications'

/**
 * Hook para gestionar la suscripción a Web Push Notifications.
 *
 * @returns {{
 *   isSubscribed: boolean,
 *   isLoading: boolean,
 *   error: string|null,
 *   isSupported: boolean,
 *   permissionDenied: boolean,
 *   enable: () => Promise<void>,
 *   disable: () => Promise<void>,
 * }}
 */
export function usePushNotifications() {
  const [isSubscribed,     setIsSubscribed]     = useState(false)
  const [isLoading,        setIsLoading]        = useState(true)
  const [error,            setError]            = useState(null)
  const [isSupported,      setIsSupported]      = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Al montar: verificar soporte del navegador y estado actual de suscripción
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (!supported) {
      setIsLoading(false)
      return
    }

    // Detectar si el permiso ya fue denegado por el usuario
    if (Notification.permission === 'denied') {
      setPermissionDenied(true)
      setIsLoading(false)
      return
    }

    getPushSubscription()
      .then((sub) => {
        setIsSubscribed(!!sub)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  /** Activa las notificaciones push: pide permiso, suscribe y persiste en backend */
  async function enable() {
    setIsLoading(true)
    setError(null)

    try {
      const sub = await subscribeToPush()

      if (!sub) {
        // El usuario denegó el permiso
        setPermissionDenied(Notification.permission === 'denied')
        setError(
          Notification.permission === 'denied'
            ? 'Permiso bloqueado. Actívalo desde la configuración del navegador.'
            : 'Permiso denegado'
        )
        setIsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Sesión expirada. Vuelve a iniciar sesión.'); return }
      await savePushSubscription(sub, session.access_token)
      setIsSubscribed(true)
    } catch (err) {
      setError(err?.message ?? 'Error al activar notificaciones')
    } finally {
      setIsLoading(false)
    }
  }

  /** Desactiva las notificaciones push: elimina del backend y desuscribe del navegador */
  async function disable() {
    setIsLoading(true)
    setError(null)

    try {
      const sub = await getPushSubscription()
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError('Sesión expirada. Vuelve a iniciar sesión.'); return }
        await removePushSubscription(sub.endpoint, session.access_token)
        await unsubscribeFromPush()
      }
      setIsSubscribed(false)
    } catch (err) {
      setError(err?.message ?? 'Error al desactivar notificaciones')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSubscribed,
    isLoading,
    error,
    isSupported,
    permissionDenied,
    enable,
    disable,
  }
}

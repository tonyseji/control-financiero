// VITE_VAPID_PUBLIC_KEY debe estar en .env.staging y .env.production
// Generar el par VAPID con: npx web-push generate-vapid-keys

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Convierte una cadena base64url a Uint8Array.
 * Necesario para pushManager.subscribe({ applicationServerKey }).
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Registra el Service Worker en /sw.js y devuelve el registration.
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker no soportado en este navegador')
  }
  return await navigator.serviceWorker.register('/sw.js')
}

/**
 * Solicita permiso de notificaciones y suscribe al push.
 * @returns {Promise<PushSubscription|null>} null si el permiso fue denegado
 */
export async function subscribeToPush() {
  const reg = await registerServiceWorker()

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  return subscription
}

/**
 * Desuscribe al usuario del push en el navegador.
 * @returns {Promise<void>}
 */
export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}

/**
 * Devuelve la suscripción activa del navegador, o null si no hay ninguna.
 * @returns {Promise<PushSubscription|null>}
 */
export async function getPushSubscription() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) return null

  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return null
  return await reg.pushManager.getSubscription()
}

/**
 * Persiste la suscripción en el backend (Edge Function push-subscribe).
 * @param {PushSubscription} subscription
 * @param {string} accessToken  — JWT de sesión de Supabase
 * @returns {Promise<void>}
 */
export async function savePushSubscription(subscription, accessToken) {
  const { endpoint, keys } = subscription.toJSON()
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscribe`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        action: 'subscribe',
      }),
    }
  )
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Error al guardar suscripción: ${msg}`)
  }
}

/**
 * Elimina la suscripción del backend.
 * @param {string} endpoint  — endpoint de la PushSubscription
 * @param {string} accessToken  — JWT de sesión de Supabase
 * @returns {Promise<void>}
 */
export async function removePushSubscription(endpoint, accessToken) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscribe`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ endpoint, action: 'unsubscribe' }),
    }
  )
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Error al cancelar suscripción: ${msg}`)
  }
}

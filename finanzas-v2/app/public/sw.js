// Service Worker — Web Push handler
// Solo push + notificationclick. Sin cache ni offline (no había SW previo).

self.addEventListener('push', (event) => {
  let title = 'Finanzas V2'
  let options = {
    body: 'Recuerda anotar tus gastos de hoy.',
    icon: '/logo/bilans-logo-positive-192.png',
    badge: '/logo/bilans-logo-positive-192.png',
    tag: 'daily-reminder',
    renotify: false,
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      if (payload.title) title = payload.title
      if (payload.body)  options.body = payload.body
      if (payload.icon)  options.icon = payload.icon
      if (payload.tag)   options.tag  = payload.tag
    } catch {
      // Si el payload no es JSON válido, usar los valores por defecto
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Intentar focusar una ventana de la app ya abierta
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Fetch handler mínimo para que el SW sea válido
self.addEventListener('fetch', () => {})

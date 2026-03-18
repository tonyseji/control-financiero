// ─── Service Worker — Control Financiero ────────────────────────────────────
// Estrategia: cache-first para el shell de la app, network-only para la API
// de Google Sheets (los datos financieros SIEMPRE deben ser frescos)

const CACHE_NAME = 'cf-v1';

// Assets estáticos a cachear (el build de Vite es un único index.html)
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// Dominios que NUNCA se cachean (API de Google Sheets)
const NO_CACHE_HOSTS = [
  'script.google.com',
  'docs.google.com',
  'accounts.google.com',
];

// ─── Instalación: precachear el shell ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activación: limpiar caches viejas ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: decidir estrategia por tipo de request ───────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API de Google Sheets → siempre red, nunca caché
  if (NO_CACHE_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Requests POST → siempre red (guardar transacciones)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Shell de la app → cache-first, fallback a red
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          // Guardar en caché si es una respuesta válida
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
  );
});

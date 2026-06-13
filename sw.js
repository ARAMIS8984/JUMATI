const CACHE_NAME = 'jumati-v1';

// Archivos que se guardan en caché para funcionar sin internet
const STATIC_ASSETS = [
  '/JUMATI/index.html',
  '/JUMATI/manifest.json',
  '/JUMATI/icons/icon-192x192.png',
  '/JUMATI/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalación: guarda los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Algunos recursos no se pudieron cachear:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network first, caché como respaldo
self.addEventListener('fetch', event => {
  // Las peticiones a Supabase siempre van a la red
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Sin conexión a internet' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Para todo lo demás: red primero, caché si falla
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guarda en caché la respuesta fresca
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

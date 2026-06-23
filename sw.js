const CACHE_NAME = 'calendrier-pompiers-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installation : mise en cache des ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('Cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : réseau d'abord, cache en fallback
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Firebase / API
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com/firestore') ||
      event.request.url.includes('api-adresse.data.gouv') ||
      event.request.url.includes('geo.api.gouv') ||
      event.request.url.includes('overpass')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible → utiliser le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Page de fallback hors ligne
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

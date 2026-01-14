// service-worker.js
const CACHE_NAME = 'mimarket-v1';
const urlsToCache = [
  '/EU-INO/',
  '/EU-INO/index.html',
  '/EU-INO/style.css',
  '/EU-INO/app.js',
  '/EU-INO/manifest.json',
  '/EU-INO/icon-192x192.png',
  '/EU-INO/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalado');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar y limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activado');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpiando cache viejo', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', event => {
  // Excluir Supabase y APIs externas del cache
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('api.')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolver
        if (response) {
          return response;
        }
        
        // Si no está, hacer fetch y guardar en cache
        return fetch(event.request).then(response => {
          // Solo cachear respuestas válidas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Si falla todo, mostrar página offline
        if (event.request.mode === 'navigate') {
          return caches.match('/EU-INO/index.html');
        }
      })
  );
});

// Manejar mensajes (para actualizaciones)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

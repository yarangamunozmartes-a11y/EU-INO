// service-worker.js
const CACHE_NAME = 'mimarket-v3';
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
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalación completada');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error cacheando archivos:', error);
      })
  );
});

// Activar y limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Eliminando cache viejo', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activación completada');
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  // Excluir peticiones a Supabase y APIs externas
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('api.') ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('unpkg.com')) {
    return;
  }
  
  // Solo cachear peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, devolverlo
        if (cachedResponse) {
          console.log('📂 Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }
        
        // Si no está en cache, hacer fetch
        console.log('🌐 Haciendo fetch:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('💾 Guardado en cache:', event.request.url);
              })
              .catch((error) => {
                console.error('Error guardando en cache:', error);
              });
            
            return response;
          })
          .catch(() => {
            // Si falla y es una navegación, mostrar la página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/EU-INO/index.html');
            }
            return null;
          });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME);
  }
});

// Sincronizar en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Sincronizando datos en segundo plano...');
  }
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación de MiMarket',
      icon: '/EU-INO/icon-192x192.png',
      badge: '/EU-INO/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MiMarket', options)
    );
  }
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


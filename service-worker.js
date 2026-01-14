// service-worker.js - Versión mejorada
const CACHE_NAME = 'mimarket-v4';
const OFFLINE_URL = '/EU-INO/index.html';
const SUPABASE_CACHE_NAME = 'mimarket-api-v1';

// URLs a cachear
const urlsToCache = [
  '/EU-INO/',
  '/EU-INO/index.html',
  '/EU-INO/style.css',
  '/EU-INO/app.js',
  '/EU-INO/supabase-config.js',
  '/EU-INO/manifest.json',
  '/EU-INO/icon-192x192.png',
  '/EU-INO/icon-512x512.png',
  '/EU-INO/favicon.ico'
];

// Instalación optimizada
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker: Instalando v4...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)),
      self.skipWaiting()
    ]).then(() => {
      console.log('✅ Service Worker instalado y activo');
    })
  );
});

// Limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Activando...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches viejos
      caches.keys().then(cacheNames => 
        Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME && cache !== SUPABASE_CACHE_NAME) {
              console.log(`🗑️ Eliminando cache: ${cache}`);
              return caches.delete(cache);
            }
          })
        )
      ),
      // Tomar control de todos los clients
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activado');
    })
  );
});

// Estrategia de cache: Cache First, luego Network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Excluir Supabase y APIs externas de cache
  if (url.href.includes('supabase.co') || 
      url.href.includes('api.') ||
      url.href.includes('unpkg.com') ||
      url.href.includes('cdn.jsdelivr.net')) {
    return event.respondWith(fetch(request));
  }
  
  // Estrategia para navegación (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(OFFLINE_URL).then(cachedResponse => {
        return fetch(request)
          .then(response => {
            // Actualizar cache con nueva versión
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => cachedResponse || caches.match(OFFLINE_URL));
      })
    );
  } else {
    // Estrategia para assets estáticos
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Devolver del cache y actualizar en background
          event.waitUntil(
            fetch(request).then(response => {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }).catch(() => {})
          );
          return cachedResponse;
        }
        
        // No está en cache, hacer fetch
        return fetch(request).then(response => {
          // Solo cachear respuestas exitosas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Si falla y es imagen, devolver placeholder
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f7fafc"/><text x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle" dy=".3em" fill="#718096">Sin imagen</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        });
      })
    );
  }
});

// Manejo de notificaciones push mejorado
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: 'MiMarket Perú',
    body: 'Tienes nuevas notificaciones',
    icon: '/EU-INO/icon-192x192.png',
    badge: '/EU-INO/icon-192x192.png'
  };
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// Sincronización en background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('🔄 Sincronizando datos en background...');
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Aquí implementarías la lógica de sincronización
  // con tu backend Supabase
  console.log('✅ Datos sincronizados');
}

// Manejo de errores
self.addEventListener('error', (error) => {
  console.error('❌ Error en Service Worker:', error);
});

// Comunicación con el cliente
self.addEventListener('message', (event) => {
  switch (event.data.action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;
    case 'clearCache':
      caches.delete(CACHE_NAME);
      break;
    case 'getCacheSize':
      caches.open(CACHE_NAME).then(cache => {
        cache.keys().then(keys => {
          event.ports[0].postMessage({ size: keys.length });
        });
      });
      break;
  }
});



// ========== CONFIGURACIÓN SERVICE WORKER ==========

const CACHE_NAME = 'mimarket-v2.0.0';
const DYNAMIC_CACHE = 'mimarket-dynamic-v2.0.0';

// Archivos críticos para el funcionamiento offline
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './install.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// ========== INSTALACIÓN ==========
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos core...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error durante la instalación:', error);
      })
  );
});

// ========== ACTIVACIÓN ==========
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Activando...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log(`🗑️ Eliminando cache antiguo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Tomar control de todos los clients
      self.clients.claim(),
      
      // Actualizar caché dinámico si es necesario
      actualizarCacheDinamico()
    ])
    .then(() => {
      console.log('✅ Service Worker activado y listo');
      
      // Enviar mensaje a todos los clients
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '2.0.0'
          });
        });
      });
    })
  );
});

// ========== ESTRATEGIA DE CACHE ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estrategia: Cache First para recursos estáticos, Network First para datos dinámicos
  if (request.method === 'GET') {
    // API calls y datos dinámicos
    if (url.pathname.includes('/api/') || 
        url.hostname.includes('supabase.co') ||
        request.headers.get('Accept')?.includes('application/json')) {
      event.respondWith(estrategiaNetworkFirst(request));
    }
    // Recursos estáticos (CSS, JS, imágenes locales)
    else if (url.origin === self.location.origin ||
             url.hostname.includes('unpkg.com')) {
      event.respondWith(estrategiaCacheFirst(request));
    }
    // Imágenes externas
    else if (request.destination === 'image') {
      event.respondWith(estrategiaCacheOnly(request));
    }
    // Por defecto: Network First
    else {
      event.respondWith(estrategiaNetworkFirst(request));
    }
  }
});

// ========== ESTRATEGIAS DE CACHE ==========

// Cache First (para recursos estáticos)
async function estrategiaCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log(`📦 Sirviendo desde cache: ${request.url}`);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Solo cachear respuestas exitosas
    if (networkResponse.status === 200) {
      console.log(`🌐 Cacheando nuevo recurso: ${request.url}`);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red y no hay en cache, mostrar página offline
    console.log(`❌ Error de red, recurso no en cache: ${request.url}`);
    
    if (request.destination === 'document') {
      return cache.match('./index.html');
    }
    
    // Para imágenes, devolver placeholder
    if (request.destination === 'image') {
      return new Response(
        '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Imagen no disponible offline</text></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    return new Response('Contenido no disponible offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network First (para datos dinámicos)
async function estrategiaNetworkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Si la respuesta es exitosa, actualizar cache
    if (networkResponse.status === 200) {
      console.log(`🌐 Actualizando cache dinámico: ${request.url}`);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`📦 Red caída, buscando en cache: ${request.url}`);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si es una petición de API, devolver datos demo
    if (request.url.includes('/api/')) {
      return devolverDatosDemo(request);
    }
    
    throw error;
  }
}

// Cache Only (para imágenes externas)
async function estrategiaCacheOnly(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cachear imagen para futuro uso
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Devolver imagen placeholder
    return new Response(
      '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Imagen no disponible</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// ========== DATOS DEMO PARA OFFLINE ==========
function devolverDatosDemo(request) {
  console.log('📊 Sirviendo datos demo para modo offline');
  
  const url = new URL(request.url);
  
  // Datos demo para productos
  if (url.pathname.includes('/productos')) {
    const productosDemo = [
      {
        id: 'demo_1',
        nombre: 'Bicicleta de montaña (Demo)',
        precio: 850,
        descripcion: 'Producto de demostración - Modo offline',
        provincia: 'Lima',
        distrito: 'Miraflores',
        vendedor_nombre: 'Vendedor Demo',
        estado: 'activo'
      },
      {
        id: 'demo_2',
        nombre: 'Sofá 3 plazas (Demo)',
        precio: 1200,
        descripcion: 'Producto de demostración - Modo offline',
        provincia: 'Lima',
        distrito: 'San Isidro',
        vendedor_nombre: 'Vendedor Demo',
        estado: 'activo'
      }
    ];
    
    return new Response(JSON.stringify(productosDemo), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Datos demo para vendedores
  if (url.pathname.includes('/vendedores')) {
    const vendedoresDemo = [
      {
        id: 'demo_vendedor',
        nombre: 'Vendedor Demo',
        email: 'demo@mimarket.pe',
        telefono: '999888777',
        estado: 'activo'
      }
    ];
    
    return new Response(JSON.stringify(vendedoresDemo), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Respuesta por defecto
  return new Response(JSON.stringify({ message: 'Modo offline activado' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// ========== SINCRONIZACIÓN EN SEGUNDO PLANO ==========
self.addEventListener('sync', (event) => {
  console.log('🔄 Evento de sincronización:', event.tag);
  
  if (event.tag === 'sync-productos') {
    event.waitUntil(sincronizarProductosPendientes());
  }
  
  if (event.tag === 'sync-vendedores') {
    event.waitUntil(sincronizarVendedoresPendientes());
  }
});

async function sincronizarProductosPendientes() {
  console.log('📤 Sincronizando productos pendientes...');
  
  // Aquí implementarías la lógica para sincronizar
  // productos creados offline con el servidor
  
  return Promise.resolve();
}

async function sincronizarVendedoresPendientes() {
  console.log('📤 Sincronizando vendedores pendientes...');
  
  // Aquí implementarías la lógica para sincronizar
  // vendedores registrados offline con el servidor
  
  return Promise.resolve();
}

// ========== ACTUALIZACIÓN DE CACHE DINÁMICO ==========
async function actualizarCacheDinamico() {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // URLs que deben estar siempre en cache dinámico
  const urlsDinamicas = [
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'
  ];
  
  try {
    await Promise.all(
      urlsDinamicas.map(async (url) => {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      })
    );
    
    console.log('✅ Cache dinámico actualizado');
  } catch (error) {
    console.warn('⚠️ Error actualizando cache dinámico:', error);
  }
}

// ========== MANEJO DE PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {
  console.log('📱 Evento push recibido:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nueva notificación de MiMarket',
      icon: './icon-192x192.png',
      badge: './icon-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || './',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'ver',
          title: 'Ver'
        },
        {
          action: 'cerrar',
          title: 'Cerrar'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MiMarket', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificación clickeada:', event.notification.data);
  
  event.notification.close();
  
  if (event.action === 'ver') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

// ========== MENSAJES DESDE LA APP ==========
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje recibido en Service Worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_PRODUCT') {
    cacheProducto(event.data.producto);
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    enviarInfoCache(event.ports[0]);
  }
});

async function cacheProducto(producto) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // Cachear imágenes del producto
  if (producto.fotos && Array.isArray(producto.fotos)) {
    producto.fotos.forEach(async (fotoUrl) => {
      try {
        const response = await fetch(fotoUrl);
        if (response.ok) {
          await cache.put(fotoUrl, response);
        }
      } catch (error) {
        console.warn('⚠️ Error cacheando imagen:', error);
      }
    });
  }
  
  console.log(`✅ Producto cacheado: ${producto.nombre}`);
}

async function enviarInfoCache(port) {
  const cacheNames = await caches.keys();
  const cacheInfo = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    cacheInfo[cacheName] = {
      count: requests.length,
      size: await calcularTamanioCache(cache)
    };
  }
  
  port.postMessage({
    type: 'CACHE_INFO',
    data: cacheInfo
  });
}

async function calcularTamanioCache(cache) {
  const requests = await cache.keys();
  let totalSize = 0;
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}

// ========== LIMPIEZA PERIÓDICA ==========
async function limpiarCacheAntiguo() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  const unaSemana = 7 * 24 * 60 * 60 * 1000;
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const fechaHeader = response.headers.get('date');
      if (fechaHeader) {
        const fecha = new Date(fechaHeader);
        if (Date.now() - fecha.getTime() > unaSemana) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Ejecutar limpieza cada 24 horas
setInterval(() => {
  limpiarCacheAntiguo();
}, 24 * 60 * 60 * 1000);



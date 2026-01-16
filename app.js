
// ============================================
// CONFIGURACIÓN SUPABASE
// ============================================
const SUPABASE_URL = 'https://vxzvnquhuebakzscfjvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4enZucXVodWViYWt6c2NmanZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzU2NjksImV4cCI6MjA4Mzg1MTY2OX0.YFQj-JCCnz8Q5oE4ajBbf9jEBu4h1fyjRXloX4SRZ2A';

let db = null;
let supabaseConectado = false;

// ============================================
// PWA - SERVICE WORKER
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Error registrando Service Worker:', error);
      });
  });
}

// Detectar instalación PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  mostrarBotonInstalacion();
});

function mostrarBotonInstalacion() {
  if (!deferredPrompt) return;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'install-btn';
  installBtn.innerHTML = '📱 Instalar App';
  installBtn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #4f46e5;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    z-index: 1000;
    font-weight: bold;
  `;
  
  installBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ Usuario instaló la app');
      installBtn.remove();
    }
    deferredPrompt = null;
  };
  
  if (!document.getElementById('install-btn')) {
    document.body.appendChild(installBtn);
  }
}

// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarApp();
});

async function inicializarApp() {
  // 1. Inicializar Supabase
  await inicializarSupabase();
  
  // 2. Mostrar splash screen
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      
      // 3. Verificar si hay vendedor logueado
      const vendedor = JSON.parse(localStorage.getItem('vendedor'));
      if (vendedor) {
        mostrarPerfilVendedor();
      }
    }, 600);
  }, 1500);
  
  // 3. Configurar event listeners
  configurarEventListeners();
  
  // 4. Cargar datos iniciales
  cargarDatosIniciales();
}

// ============================================
// INICIALIZACIÓN SUPABASE
// ============================================
async function inicializarSupabase() {
  try {
    if (typeof supabase !== 'undefined') {
      db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      
      // Probar conexión
      const { error } = await db.from('productos').select('count').limit(1);
      
      if (error) throw error;
      
      supabaseConectado = true;
      console.log('✅ Supabase conectado');
    } else {
      console.warn('⚠️ Supabase no disponible, usando modo offline');
    }
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error);
  }
}

// ============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  // Botones principales
  document.getElementById('btn-comprar').onclick = mostrarModoComprador;
  document.getElementById('btn-vender').onclick = mostrarModoVendedor;
  document.getElementById('btn-admin').onclick = mostrarPanelAdmin;
  
  // Formulario de búsqueda
  document.getElementById('form-busqueda').onsubmit = buscarProductos;
  
  // Formulario de registro vendedor
  document.getElementById('form-vendedor').onsubmit = registrarVendedor;
  
  // Botón saltar video
  document.getElementById('btn-saltar-video').onclick = () => {
    document.getElementById('video-tutorial').style.display = 'none';
    document.getElementById('registro-vendedor').style.display = 'block';
  };
  
  // Formulario de producto
  document.getElementById('form-producto').onsubmit = publicarProducto;
  document.getElementById('btn-cancelar').onclick = cancelarPublicacion;
  document.getElementById('btn-nuevo-producto').onclick = mostrarFormularioProducto;
  
  // Botones de pago
  document.getElementById('btn-realizar-pago').onclick = realizarPago;
  document.getElementById('btn-enviar-comprobante').onclick = enviarComprobante;
  
  // Panel admin
  document.getElementById('btn-login-admin').onclick = loginAdmin;
  document.getElementById('btn-cerrar-admin').onclick = cerrarSesionAdmin;
  document.getElementById('btn-habilitar-pago').onclick = habilitarVendedorDesdeAdmin;
  document.getElementById('btn-guardar-yape').onclick = guardarConfigYape;
  
  // Modal de contacto
  document.querySelector('.close-modal').onclick = cerrarModal;
  window.onclick = (event) => {
    const modal = document.getElementById('modal-contacto');
    if (event.target == modal) {
      cerrarModal();
    }
  };
  
  // Configuración de fotos
  configurarUploadFotos();
  
  // Atajo admin
  configurarAtajoAdmin();
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// 1. Navegación
function mostrarModoComprador() {
  activarBoton('btn-comprar');
  mostrarSeccion('busqueda');
  mostrarSeccion('resultados');
  ocultarSecciones(['video-tutorial', 'registro-vendedor', 'perfil-vendedor', 'panel-admin']);
  cargarResultados();
}

function mostrarModoVendedor() {
  const vendedor = JSON.parse(localStorage.getItem('vendedor'));
  if (!vendedor) {
    activarBoton('btn-vender');
    ocultarSecciones(['busqueda', 'resultados', 'perfil-vendedor', 'panel-admin']);
    mostrarSeccion('video-tutorial');
    document.getElementById('registro-vendedor').style.display = 'none';
  } else {
    mostrarPerfilVendedor();
  }
}

function mostrarPerfilVendedor() {
  activarBoton('btn-vender');
  ocultarSecciones(['busqueda', 'resultados', 'video-tutorial', 'registro-vendedor', 'panel-admin']);
  mostrarSeccion('perfil-vendedor');
  
  const vendedor = JSON.parse(localStorage.getItem('vendedor'));
  if (!vendedor) return;
  
  // Actualizar información del perfil
  document.getElementById('perfil-nombre').textContent = vendedor.nombre;
  document.getElementById('perfil-localidad').textContent = `📍 ${vendedor.provincia}, ${vendedor.distrito}`;
  document.getElementById('perfil-telefono').textContent = `📱 ${vendedor.telefono}`;
  document.getElementById('perfil-email').textContent = `✉️ ${vendedor.email}`;
  document.getElementById('contador-publicaciones').textContent = vendedor.publicacionesDisponibles || 0;
  
  // Mostrar/ocultar sección de pago
  const seccionPago = document.getElementById('seccion-pago');
  if (vendedor.publicacionesDisponibles <= 0) {
    seccionPago.style.display = 'block';
  } else {
    seccionPago.style.display = 'none';
  }
  
  // Actualizar estadísticas
  actualizarEstadisticasVendedor(vendedor.id);
  
  // Renderizar productos
  renderProductosVendedor(vendedor.id);
}

// 2. Búsqueda de productos
async function buscarProductos(e) {
  e.preventDefault();
  
  const busqueda = document.getElementById('buscar-producto').value;
  const provincia = document.getElementById('provincia').value;
  const distrito = document.getElementById('distrito').value;
  
  let productos = [];
  
  // Buscar en Supabase si está conectado
  if (supabaseConectado) {
    try {
      let query = db.from('productos').select('*').eq('activo', true);
      
      if (provincia) query = query.eq('provincia', provincia);
      if (distrito) query = query.eq('distrito', distrito);
      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
      }
      
      const { data, error } = await query;
      if (!error) productos = data;
    } catch (error) {
      console.error('Error buscando productos:', error);
    }
  }
  
  // Buscar en localStorage
  const productosLocal = JSON.parse(localStorage.getItem('productos')) || [];
  const filtradosLocal = productosLocal.filter(p => {
    const coincideBusqueda = !busqueda || 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const coincideProvincia = !provincia || p.provincia === provincia;
    const coincideDistrito = !distrito || p.distrito === distrito;
    
    return coincideBusqueda && coincideProvincia && coincideDistrito && p.activo !== false;
  });
  
  // Combinar resultados
  const todosProductos = [...productos, ...filtradosLocal];
  
  mostrarResultados(todosProductos);
}

function mostrarResultados(productos) {
  const lista = document.getElementById('lista-resultados');
  const mensaje = document.getElementById('mensaje-vacio');
  
  if (productos.length === 0) {
    lista.innerHTML = '';
    mensaje.style.display = 'block';
    return;
  }
  
  mensaje.style.display = 'none';
  lista.innerHTML = productos.map(producto => `
    <div class="producto-card" onclick="mostrarDetalleProducto('${producto.id}')">
      ${producto.fotos && producto.fotos.length > 0 ? 
        `<img src="${producto.fotos[0]}" class="producto-foto-principal" alt="${producto.nombre}">` : 
        `<div class="producto-foto-principal">📷 Sin foto</div>`
      }
      <div style="padding: 15px;">
        <div class="producto-header">
          <div>
            <h4>${producto.nombre}</h4>
            <p>${producto.categoria} • ${producto.distrito}</p>
          </div>
          <div class="producto-precio">S/ ${producto.precio}</div>
        </div>
        <p>${producto.descripcion?.substring(0, 100)}${producto.descripcion?.length > 100 ? '...' : ''}</p>
        <button class="btn-contactar">Ver detalles</button>
      </div>
    </div>
  `).join('');
}

// 3. Registro de vendedor
async function registrarVendedor(e) {
  e.preventDefault();
  
  const vendedor = {
    id: 'V' + Date.now(),
    nombre: document.getElementById('nombre').value,
    email: document.getElementById('email').value,
    provincia: document.getElementById('provincia-vendedor').value,
    distrito: document.getElementById('distrito-vendedor').value,
    telefono: document.getElementById('telefono').value,
    contactoWhatsapp: document.getElementById('contacto-whatsapp').checked,
    contactoLlamada: document.getElementById('contacto-llamada').checked,
    publicacionesDisponibles: 1,
    estado: 'pendiente_pago',
    fechaRegistro: new Date().toISOString(),
    productos: []
  };
  
  // Guardar en localStorage
  localStorage.setItem('vendedor', JSON.stringify(vendedor));
  
  // Guardar en Supabase si está conectado
  if (supabaseConectado) {
    try {
      const { error } = await db.from('vendedores').insert([{
        nombre: vendedor.nombre,
        email: vendedor.email,
        provincia: vendedor.provincia,
        distrito: vendedor.distrito,
        telefono: vendedor.telefono,
        contacto_whatsapp: vendedor.contactoWhatsapp,
        contacto_llamada: vendedor.contactoLlamada,
        publicaciones_disponibles: 1,
        estado: 'pendiente_pago'
      }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error guardando vendedor en Supabase:', error);
    }
  }
  
  // Guardar en lista global
  const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
  vendedores.push(vendedor);
  localStorage.setItem('vendedores', JSON.stringify(vendedores));
  
  mostrarPerfilVendedor();
  alert('✅ Registro exitoso. Tienes 1 publicación gratuita.');
}

// 4. Gestión de productos
function mostrarFormularioProducto() {
  const vendedor = JSON.parse(localStorage.getItem('vendedor'));
  if (!vendedor || vendedor.publicacionesDisponibles <= 0) {
    alert('No tienes publicaciones disponibles. Debes realizar el pago primero.');
    return;
  }
  
  document.getElementById('formulario-producto').style.display = 'block';
}

function cancelarPublicacion() {
  document.getElementById('formulario-producto').style.display = 'none';
  document.getElementById('form-producto').reset();
  fotosTemporales = [];
  actualizarPreviewFotos();
}

async function publicarProducto(e) {
  e.preventDefault();
  
  const vendedor = JSON.parse(localStorage.getItem('vendedor'));
  if (!vendedor) return;
  
  const producto = {
    id: Date.now().toString(),
    nombre: document.getElementById('prod-nombre').value,
    precio: parseFloat(document.getElementById('prod-precio').value),
    categoria: document.getElementById('prod-categoria').value,
    descripcion: document.getElementById('prod-descripcion').value,
    estado_producto: document.getElementById('prod-estado').value,
    vendedor_id: vendedor.id,
    provincia: vendedor.provincia,
    distrito: vendedor.distrito,
    fotos: fotosTemporales,
    fecha_publicacion: new Date().toISOString(),
    contacto_whatsapp: vendedor.contactoWhatsapp,
    contacto_llamada: vendedor.contactoLlamada,
    activo: true,
    vistas: 0
  };
  
  // Guardar en localStorage
  const productos = JSON.parse(localStorage.getItem('productos')) || [];
  productos.push(producto);
  localStorage.setItem('productos', JSON.stringify(productos));
  
  // Guardar en Supabase
  if (supabaseConectado) {
    try {
      const { error } = await db.from('productos').insert([{
        nombre: producto.nombre,
        precio: producto.precio,
        categoria: producto.categoria,
        descripcion: producto.descripcion,
        estado_producto: producto.estado_producto,
        vendedor_id: vendedor.id,
        provincia: producto.provincia,
        distrito: producto.distrito,
        fotos: producto.fotos,
        contacto_whatsapp: producto.contacto_whatsapp,
        contacto_llamada: producto.contacto_llamada
      }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error guardando producto en Supabase:', error);
    }
  }
  
  // Actualizar vendedor
  vendedor.productos.push(producto.id);
  vendedor.publicacionesDisponibles -= 1;
  localStorage.setItem('vendedor', JSON.stringify(vendedor));
  
  // Limpiar formulario
  document.getElementById('form-producto').reset();
  fotosTemporales = [];
  actualizarPreviewFotos();
  document.getElementById('formulario-producto').style.display = 'none';
  
  // Actualizar vista
  mostrarPerfilVendedor();
  alert('✅ Producto publicado exitosamente');
}

function renderProductosVendedor(vendedorId) {
  const productos = JSON.parse(localStorage.getItem('productos')) || [];
  const productosVendedor = productos.filter(p => p.vendedor_id === vendedorId);
  const lista = document.getElementById('lista-productos');
  
  if (productosVendedor.length === 0) {
    lista.innerHTML = '<p class="mensaje-vacio">No has publicado productos aún</p>';
    return;
  }
  
  lista.innerHTML = productosVendedor.map(producto => `
    <div class="producto-card">
      ${producto.fotos && producto.fotos.length > 0 ? 
        `<img src="${producto.fotos[0]}" class="producto-foto-principal" alt="${producto.nombre}">` : 
        `<div class="producto-foto-principal">📷 Sin foto</div>`
      }
      <div style="padding: 15px;">
        <div class="producto-header">
          <div>
            <h4>${producto.nombre}</h4>
            <p>${producto.categoria}</p>
          </div>
          <div class="producto-precio">S/ ${producto.precio}</div>
        </div>
        <p>${producto.descripcion?.substring(0, 100)}${producto.descripcion?.length > 100 ? '...' : ''}</p>
        <div class="producto-acciones">
          <button onclick="editarProducto('${producto.id}')" class="btn-secundario">Editar</button>
          <button onclick="eliminarProducto('${producto.id}')" class="btn-cancelar">Eliminar</button>
        </div>
      </div>
    </div>
  `).join('');
}

// 5. Panel Admin
function configurarAtajoAdmin() {
  let keySequence = [];
  const secretCode = ['a', 'd', 'm', 'i', 'n'];
  
  document.addEventListener('keydown', (e) => {
    keySequence.push(e.key.toLowerCase());
    if (keySequence.length > 5) keySequence.shift();
    
    if (keySequence.join('') === secretCode.join('')) {
      document.getElementById('btn-admin').style.display = 'block';
      keySequence = [];
    }
  });
}

function mostrarPanelAdmin() {
  activarBoton('btn-admin');
  ocultarSecciones(['busqueda', 'resultados', 'video-tutorial', 'registro-vendedor', 'perfil-vendedor']);
  mostrarSeccion('panel-admin');
}

async function loginAdmin() {
  const usuario = document.getElementById('admin-usuario').value;
  const password = document.getElementById('admin-password').value;
  
  // Credenciales por defecto (cambia esto en producción)
  if (usuario === 'admin' && password === 'admin123') {
    document.getElementById('login-admin').style.display = 'none';
    document.getElementById('contenido-admin').style.display = 'block';
    await cargarDatosAdmin();
  } else {
    alert('Credenciales incorrectas');
  }
}

async function cargarDatosAdmin() {
  // Cargar estadísticas
  const productos = JSON.parse(localStorage.getItem('productos')) || [];
  const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
  
  document.getElementById('total-productos').textContent = productos.length;
  document.getElementById('total-vendedores').textContent = vendedores.length;
  
  const pendientes = vendedores.filter(v => v.estado === 'pendiente_pago');
  document.getElementById('pagos-pendientes').textContent = pendientes.length;
  
  // Mostrar vendedores pendientes
  const listaPendientes = document.getElementById('lista-pagos-pendientes');
  listaPendientes.innerHTML = pendientes.map(v => `
    <div class="vendedor-pendiente">
      <div class="vendedor-info">
        <p><strong>${v.nombre}</strong></p>
        <p>Código: ${v.id}</p>
        <p>Teléfono: ${v.telefono}</p>
      </div>
      <button onclick="habilitarVendedor('${v.id}')" class="btn-habilitar">Habilitar</button>
    </div>
  `).join('');
  
  // Cargar todos los vendedores
  const listaTodos = document.getElementById('lista-todos-vendedores');
  listaTodos.innerHTML = vendedores.map(v => `
    <div class="producto-card">
      <p><strong>${v.nombre}</strong></p>
      <p>Estado: ${v.estado === 'activo' ? '✅ Activo' : '⏳ Pendiente'}</p>
      <p>Tel: ${v.telefono}</p>
    </div>
  `).join('');
}

function habilitarVendedor(vendedorId) {
  const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
  const vendedorIndex = vendedores.findIndex(v => v.id === vendedorId);
  
  if (vendedorIndex !== -1) {
    vendedores[vendedorIndex].estado = 'activo';
    vendedores[vendedorIndex].publicacionesDisponibles = 5;
    localStorage.setItem('vendedores', JSON.stringify(vendedores));
    
    // Si es el vendedor actual, actualizar
    const vendedorActual = JSON.parse(localStorage.getItem('vendedor'));
    if (vendedorActual && vendedorActual.id === vendedorId) {
      vendedorActual.estado = 'activo';
      vendedorActual.publicacionesDisponibles = 5;
      localStorage.setItem('vendedor', JSON.stringify(vendedorActual));
    }
    
    alert('✅ Vendedor habilitado');
    cargarDatosAdmin();
  }
}

function habilitarVendedorDesdeAdmin() {
  const codigo = document.getElementById('codigo-vendedor').value;
  const comprobante = document.getElementById('comprobante-pago').value;
  
  if (!codigo || !comprobante) {
    alert('Debes ingresar el código y comprobante');
    return;
  }
  
  habilitarVendedor(codigo);
  document.getElementById('codigo-vendedor').value = '';
  document.getElementById('comprobante-pago').value = '';
}

function guardarConfigYape() {
  const yapeNumero = document.getElementById('yape-numero').value;
  const config = JSON.parse(localStorage.getItem('adminConfig')) || {};
  
  config.yapeNumero = yapeNumero;
  localStorage.setItem('adminConfig', JSON.stringify(config));
  
  alert('✅ Configuración guardada');
}

function cerrarSesionAdmin() {
  document.getElementById('login-admin').style.display = 'block';
  document.getElementById('contenido-admin').style.display = 'none';
  document.getElementById('admin-password').value = '';
  mostrarModoComprador();
}

// 6. Sistema de fotos
let fotosTemporales = [];

function configurarUploadFotos() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('fotos-producto');
  
  uploadArea.addEventListener('click', () => fileInput.click());
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.background = '#edf2ff';
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.background = '#f8f9ff';
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.background = '#f8f9ff';
    procesarFotos(Array.from(e.dataTransfer.files));
  });
  
  fileInput.addEventListener('change', (e) => {
    procesarFotos(Array.from(e.target.files));
  });
}

function procesarFotos(files) {
  files = files.slice(0, 2 - fotosTemporales.length);
  
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es muy grande (máximo 2MB)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      fotosTemporales.push(e.target.result);
      actualizarPreviewFotos();
    };
    reader.readAsDataURL(file);
  });
}

function actualizarPreviewFotos() {
  const preview = document.getElementById('preview-fotos');
  preview.innerHTML = '';
  
  fotosTemporales.forEach((foto, index) => {
    const div = document.createElement('div');
    div.className = 'foto-preview';
    div.innerHTML = `
      <img src="${foto}" alt="Foto ${index + 1}">
      <button onclick="eliminarFoto(${index})">×</button>
    `;
    preview.appendChild(div);
  });
}

window.eliminarFoto = function(index) {
  fotosTemporales.splice(index, 1);
  actualizarPreviewFotos();
  document.getElementById('fotos-producto').value = '';
};

// 7. Funciones auxiliares
function activarBoton(botonId) {
  document.querySelectorAll('.acciones button').forEach(btn => {
    btn.classList.remove('btn-activo');
  });
  document.getElementById(botonId).classList.add('btn-activo');
}

function mostrarSeccion(seccionId) {
  document.getElementById(seccionId).style.display = 'block';
}

function ocultarSecciones(seccionesIds) {
  seccionesIds.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = 'none';
  });
}

function cargarDatosIniciales() {
  // Inicializar datos si no existen
  if (!localStorage.getItem('productos')) {
    localStorage.setItem('productos', JSON.stringify([]));
  }
  if (!localStorage.getItem('vendedores')) {
    localStorage.setItem('vendedores', JSON.stringify([]));
  }
  if (!localStorage.getItem('adminConfig')) {
    localStorage.setItem('adminConfig', JSON.stringify({
      yapeNumero: '999-888-777',
      precioPublicacion: 5.00
    }));
  }
}

function cargarResultados() {
  mostrarResultados([]);
}

function actualizarEstadisticasVendedor(vendedorId) {
  const productos = JSON.parse(localStorage.getItem('productos')) || [];
  const productosVendedor = productos.filter(p => p.vendedor_id === vendedorId);
  
  document.getElementById('productos-activos').textContent = productosVendedor.length;
  document.getElementById('vistas-totales').textContent = productosVendedor.reduce((sum, p) => sum + (p.vistas || 0), 0);
}

function realizarPago() {
  const config = JSON.parse(localStorage.getItem('adminConfig')) || {};
  alert(`Realiza el pago de S/ ${config.precioPublicacion || '5.00'} por Yape al: ${config.yapeNumero || '999-888-777'}`);
}

function enviarComprobante() {
  const vendedor = JSON.parse(localStorage.getItem('vendedor'));
  const config = JSON.parse(localStorage.getItem('adminConfig')) || {};
  const mensaje = `Hola, soy ${vendedor.nombre}. Acabo de realizar el pago para publicar en MiMarket. Mi código: ${vendedor.id}`;
  window.open(`https://wa.me/${config.yapeNumero.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function cerrarModal() {
  document.getElementById('modal-contacto').style.display = 'none';
}

// Exportar funciones al scope global
window.mostrarDetalleProducto = function(productoId) {
  // Implementar lógica para mostrar detalles del producto
  console.log('Mostrar detalle del producto:', productoId);
};

window.editarProducto = function(productoId) {
  // Implementar lógica para editar producto
  console.log('Editar producto:', productoId);
};

window.eliminarProducto = function(productoId) {
  if (confirm('¿Estás seguro de eliminar este producto?')) {
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const nuevosProductos = productos.filter(p => p.id !== productoId);
    localStorage.setItem('productos', JSON.stringify(nuevosProductos));
    
    const vendedor = JSON.parse(localStorage.getItem('vendedor'));
    if (vendedor) {
      mostrarPerfilVendedor();
      alert('✅ Producto eliminado');
    }
  }
};


// ============================================
// VERIFICACIÓN DE ICONOS PWA (PASO 6)
// ============================================

function verificarIconosPWA() {
  console.log('🔍 Verificando iconos PWA...');
  
  const iconosRequeridos = [
    { nombre: 'icon-192x192.png', tamaño: '192x192' },
    { nombre: 'icon-512x512.png', tamaño: '512x512' }
  ];
  
  let iconosFaltantes = [];
  let verificacionesCompletadas = 0;
  
  iconosRequeridos.forEach(icono => {
    const img = new Image();
    img.onload = function() {
      console.log(`✅ Icono encontrado: ${icono.nombre} (${icono.tamaño})`);
      verificacionesCompletadas++;
      
      // Verificar dimensiones
      if ((icono.nombre.includes('192') && (img.width !== 192 || img.height !== 192)) ||
          (icono.nombre.includes('512') && (img.width !== 512 || img.height !== 512))) {
        console.warn(`⚠️ Icono ${icono.nombre} tiene dimensiones incorrectas: ${img.width}x${img.height}`);
      }
      
      if (verificacionesCompletadas === iconosRequeridos.length) {
        if (iconosFaltantes.length === 0) {
          console.log('🎉 Todos los iconos PWA están correctos');
        } else {
          console.error('❌ Iconos faltantes:', iconosFaltantes);
        }
      }
    };
    
    img.onerror = function() {
      console.error(`❌ Icono NO encontrado: ${icono.nombre}`);
      iconosFaltantes.push(icono.nombre);
      verificacionesCompletadas++;
      
      if (verificacionesCompletadas === iconosRequeridos.length && iconosFaltantes.length > 0) {
        console.error('🚨 La PWA puede no funcionar correctamente. Iconos faltantes:', iconosFaltantes);
        
        // Mostrar alerta solo en desarrollo/localhost
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.protocol === 'file:') {
          setTimeout(() => {
            alert(`ADVERTENCIA DE DESARROLLO:\n\nFaltan iconos para la PWA:\n${iconosFaltantes.join('\n')}\n\nLa aplicación puede no instalarse correctamente.`);
          }, 1000);
        }
      }
    };
    
    // Intentar cargar el icono
    img.src = `./${icono.nombre}?v=${Date.now()}`;
  });
}

// Ejecutar verificación después de que la app se inicialice
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(verificarIconosPWA, 2000);
});

// También verificar al hacer clic en botones de instalación
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(verificarIconosPWA);
}



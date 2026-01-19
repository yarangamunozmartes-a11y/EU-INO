// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://vxzvnquhuebakzscfjvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4enZucXVo......'; // REEMPLAZA CON TU KEY

let supabaseClient = null;
let fotosTemporales = [];
let modoAdmin = false;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

async function inicializarApp() {
    console.log('🚀 Iniciando MiMarket Pro...');
    
    try {
        // 1. INICIALIZAR SUPABASE
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase inicializado');
            
            // Probar conexión
            const { error } = await supabaseClient.from('productos').select('*').limit(1);
            if (error) throw error;
        }
    } catch (error) {
        console.warn('⚠️ Modo offline activado:', error.message);
        supabaseClient = null;
    }
    
    // 2. SINCRONIZAR DATOS LOCALES CON SUPABASE
    await sincronizarDatos();
    
    // 3. CONFIGURAR INTERFAZ
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Verificar admin
        if (localStorage.getItem('es_admin') === 'true') {
            document.getElementById('btn-admin').style.display = 'inline-block';
            modoAdmin = true;
        }
        
        // Verificar sesión de vendedor
        const vendedor = obtenerVendedorActual();
        if (vendedor) {
            mostrarPerfilVendedor();
        } else {
            mostrarModoComprador();
        }
    }, 1500);
    
    // 4. CONFIGURAR EVENTOS
    configurarEventListeners();
    
    // 5. CARGAR DATOS DE DEMO SI NO HAY
    if (!localStorage.getItem('productos') || JSON.parse(localStorage.getItem('productos')).length === 0) {
        cargarDatosDemo();
    }
}

// ========== CONFIGURACIÓN DE EVENTOS ==========
function configurarEventListeners() {
    console.log('⚙️ Configurando eventos...');
    
    // BOTONES PRINCIPALES
    document.getElementById('btn-comprar').onclick = () => {
        mostrarModoComprador();
        document.getElementById('btn-comprar').classList.add('btn-activo');
        document.getElementById('btn-vender').classList.remove('btn-activo');
    };
    
    document.getElementById('btn-vender').onclick = () => {
        mostrarModoVendedor();
        document.getElementById('btn-vender').classList.add('btn-activo');
        document.getElementById('btn-comprar').classList.remove('btn-activo');
    };
    
    document.getElementById('btn-admin').onclick = mostrarPanelAdmin;
    
    // FORMULARIOS
    document.getElementById('form-busqueda').onsubmit = buscarProductos;
    document.getElementById('form-vendedor').onsubmit = registrarVendedor;
    document.getElementById('form-producto').onsubmit = publicarProducto;
    
    // BOTONES VENDEDOR
    document.getElementById('btn-cancelar').onclick = ocultarFormularioProducto;
    document.getElementById('btn-nuevo-producto').onclick = mostrarFormularioProducto;
    
    // VIDEO TUTORIAL
    document.getElementById('btn-saltar-video').onclick = () => {
        document.getElementById('video-tutorial').style.display = 'none';
        document.getElementById('registro-vendedor').style.display = 'block';
    };
    
    document.getElementById('btn-continuar-video').onclick = () => {
        alert('🎥 El video tutorial se implementará pronto');
    };
    
    // MODALES
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('modal-contacto').style.display = 'none';
            document.getElementById('modal-terminos').style.display = 'none';
        };
    });
    
    document.getElementById('btn-cerrar-modal').onclick = () => {
        document.getElementById('modal-contacto').style.display = 'none';
    };
    
    // UPLOAD DE FOTOS
    configurarUploadFotos();
    
    // CERRAR SESIÓN VENDEDOR (se crea dinámicamente)
    // La configuraremos cuando se cree el botón
}

// ========== SINCRONIZACIÓN CON SUPABASE ==========
async function sincronizarDatos() {
    if (!supabaseClient) return;
    
    try {
        console.log('🔄 Sincronizando datos con Supabase...');
        
        // SINCRONIZAR PRODUCTOS
        const { data: productosRemotos, error: errorProductos } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('estado', 'activo');
        
        if (!errorProductos && productosRemotos) {
            const productosLocales = JSON.parse(localStorage.getItem('productos')) || [];
            
            // Combinar: remotos tienen prioridad
            const productosCombinados = [...productosRemotos];
            productosLocales.forEach(local => {
                if (!productosCombinados.find(r => r.id === local.id)) {
                    productosCombinados.push(local);
                }
            });
            
            localStorage.setItem('productos', JSON.stringify(productosCombinados));
            console.log(`✅ ${productosCombinados.length} productos sincronizados`);
        }
        
        // SINCRONIZAR VENDEDORES
        const { data: vendedoresRemotos, error: errorVendedores } = await supabaseClient
            .from('vendedores')
            .select('*')
            .eq('estado', 'activo');
        
        if (!errorVendedores && vendedoresRemotos) {
            localStorage.setItem('vendedores', JSON.stringify(vendedoresRemotos));
            console.log(`✅ ${vendedoresRemotos.length} vendedores sincronizados`);
        }
        
    } catch (error) {
        console.warn('⚠️ Error en sincronización:', error.message);
    }
}

// ========== BÚSQUEDA Y PRODUCTOS ==========
async function buscarProductos(e) {
    e.preventDefault();
    
    const query = document.getElementById('buscar-producto').value.toLowerCase().trim();
    const provincia = document.getElementById('provincia').value;
    const distrito = document.getElementById('distrito').value;
    
    let productos = [];
    
    // BUSCAR EN SUPABASE PRIMERO
    if (supabaseClient) {
        try {
            let consulta = supabaseClient.from('productos').select('*').eq('estado', 'activo');
            
            if (query) consulta = consulta.or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%`);
            if (provincia) consulta = consulta.eq('provincia', provincia);
            if (distrito) consulta = consulta.eq('distrito', distrito);
            
            const { data, error } = await consulta;
            if (!error && data) productos = data;
        } catch (error) {
            console.log('Buscando en localStorage por error de Supabase');
        }
    }
    
    // SI NO HAY RESULTADOS O NO HAY SUPABASE, BUSCAR EN LOCAL
    if (productos.length === 0) {
        const todosProductos = JSON.parse(localStorage.getItem('productos')) || [];
        productos = todosProductos.filter(p => {
            if (p.estado !== 'activo') return false;
            
            const matchQuery = !query || 
                p.nombre.toLowerCase().includes(query) || 
                (p.descripcion && p.descripcion.toLowerCase().includes(query));
            
            const matchProvincia = !provincia || p.provincia === provincia;
            const matchDistrito = !distrito || p.distrito === distrito;
            
            return matchQuery && matchProvincia && matchDistrito;
        });
    }
    
    mostrarResultadosBusqueda(productos);
}

function mostrarResultadosBusqueda(productos) {
    const contenedor = document.getElementById('lista-resultados');
    const mensajeVacio = document.getElementById('mensaje-vacio');
    
    if (productos.length === 0) {
        contenedor.innerHTML = '';
        mensajeVacio.style.display = 'block';
        return;
    }
    
    mensajeVacio.style.display = 'none';
    
    contenedor.innerHTML = productos.map(producto => `
        <div class="producto-card" onclick="mostrarDetalleProducto('${producto.id}')">
            <div class="producto-imagen">
                <img src="${obtenerPrimeraFoto(producto)}" 
                     alt="${producto.nombre}"
                     class="producto-foto-principal"
                     onerror="this.src='https://via.placeholder.com/300x200?text=Producto'">
                ${producto.fotos && producto.fotos.length > 1 ? 
                    `<div class="contador-fotos">📷 ${producto.fotos.length}</div>` : ''}
            </div>
            <div class="producto-info">
                <h4 class="producto-nombre">${producto.nombre}</h4>
                <p class="producto-precio">S/ ${parseFloat(producto.precio).toFixed(2)}</p>
                <div class="producto-detalles">
                    <span class="producto-ubicacion">📍 ${producto.distrito || 'Sin ubicación'}</span>
                    <span class="producto-fecha">📅 ${formatearFecha(producto.fecha_publicacion)}</span>
                </div>
                <p class="producto-descripcion-corta">${(producto.descripcion || '').substring(0, 60)}...</p>
            </div>
        </div>
    `).join('');
}

// ========== DETALLE DE PRODUCTO ==========
window.mostrarDetalleProducto = async function(id) {
    let producto = null;
    
    // BUSCAR EN LOCALSTORAGE
    const productosLocales = JSON.parse(localStorage.getItem('productos')) || [];
    producto = productosLocales.find(p => p.id === id);
    
    // SI NO ESTÁ EN LOCAL, BUSCAR EN SUPABASE
    if (!producto && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('productos')
                .select('*')
                .eq('id', id)
                .single();
            
            if (!error && data) {
                producto = data;
                // Guardar en localStorage para futuro acceso offline
                productosLocales.push(producto);
                localStorage.setItem('productos', JSON.stringify(productosLocales));
            }
        } catch (error) {
            console.log('Error obteniendo producto:', error);
        }
    }
    
    if (!producto) {
        alert('❌ Producto no encontrado');
        return;
    }
    
    mostrarModalProducto(producto);
}

function mostrarModalProducto(producto) {
    // ACTUALIZAR INFORMACIÓN
    document.getElementById('modal-producto-nombre').textContent = producto.nombre;
    document.getElementById('modal-producto-precio').textContent = `S/ ${parseFloat(producto.precio).toFixed(2)}`;
    document.getElementById('modal-producto-descripcion').textContent = producto.descripcion || 'Sin descripción disponible';
    document.getElementById('modal-vendedor-nombre').textContent = producto.vendedor_nombre || 'Vendedor';
    document.getElementById('modal-vendedor-ubicacion').textContent = `${producto.distrito || ''}, ${producto.provincia || ''}`;
    
    // MOSTRAR FOTOS
    const contenedorFotos = document.getElementById('modal-fotos');
    contenedorFotos.innerHTML = '';
    
    if (producto.fotos && producto.fotos.length > 0) {
        producto.fotos.forEach((foto, index) => {
            const img = document.createElement('img');
            img.src = foto;
            img.className = 'modal-foto';
            img.alt = `${producto.nombre} - Foto ${index + 1}`;
            img.onclick = () => window.open(foto, '_blank');
            contenedorFotos.appendChild(img);
        });
    } else {
        contenedorFotos.innerHTML = `
            <div class="sin-fotos">
                <p>📷 No hay fotos disponibles</p>
            </div>
        `;
    }
    
    // CONFIGURAR BOTONES DE CONTACTO
    document.getElementById('btn-llamar').onclick = () => {
        if (producto.telefono && producto.telefono.length >= 9) {
            window.location.href = `tel:+51${producto.telefono}`;
        } else {
            alert('📞 El vendedor no tiene número de teléfono disponible');
        }
    };
    
    document.getElementById('btn-whatsapp').onclick = () => {
        if (producto.telefono && producto.telefono.length >= 9) {
            const mensaje = `Hola ${producto.vendedor_nombre}, vi tu producto "${producto.nombre}" en MiMarket por S/ ${producto.precio}. ¿Todavía está disponible?`;
            const url = `https://wa.me/51${producto.telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        } else {
            alert('📱 El vendedor no tiene WhatsApp disponible');
        }
    };
    
    // MOSTRAR MODAL
    document.getElementById('modal-contacto').style.display = 'block';
}

// ========== VENDEDOR - REGISTRO ==========
async function registrarVendedor(e) {
    e.preventDefault();
    
    // VALIDAR TÉRMINOS
    if (!document.getElementById('acepto-terminos').checked) {
        alert('📝 Debes aceptar los términos y condiciones');
        document.getElementById('acepto-terminos').focus();
        return;
    }
    
    // RECOLECTAR DATOS
    const vendedor = {
        id: 'vendedor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        nombre: document.getElementById('nombre').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        telefono: document.getElementById('telefono').value.replace(/\D/g, ''),
        provincia: document.getElementById('provincia-vendedor').value,
        distrito: document.getElementById('distrito-vendedor').value,
        fecha_registro: new Date().toISOString(),
        publicaciones_disponibles: 5, // 5 publicaciones gratuitas al registrarse
        estado: 'activo',
        tipo: 'vendedor_basico',
        verificado: false
    };
    
    // VALIDACIONES
    if (!vendedor.nombre || !vendedor.email || !vendedor.telefono || !vendedor.provincia || !vendedor.distrito) {
        alert('❌ Por favor completa todos los campos obligatorios');
        return;
    }
    
    if (vendedor.telefono.length !== 9) {
        alert('❌ El número de WhatsApp debe tener 9 dígitos (sin código de país)');
        document.getElementById('telefono').focus();
        return;
    }
    
    if (!validarEmail(vendedor.email)) {
        alert('❌ Por favor ingresa un email válido');
        document.getElementById('email').focus();
        return;
    }
    
    // GUARDAR EN LOCALSTORAGE
    localStorage.setItem('vendedor_actual', JSON.stringify(vendedor));
    
    // AGREGAR A LISTA DE VENDEDORES
    const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
    if (!vendedores.find(v => v.email === vendedor.email)) {
        vendedores.push(vendedor);
        localStorage.setItem('vendedores', JSON.stringify(vendedores));
    }
    
    // SINCRONIZAR CON SUPABASE SI ESTÁ DISPONIBLE
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('vendedores')
                .upsert(vendedor, { onConflict: 'email' });
            
            if (error) throw error;
            console.log('✅ Vendedor guardado en Supabase');
        } catch (error) {
            console.warn('⚠️ Error guardando en Supabase:', error.message);
        }
    }
    
    // MOSTRAR CONFIRMACIÓN
    alert(`🎉 ¡Bienvenido ${vendedor.nombre}!\n\n✅ Te has registrado exitosamente.\n📊 Tienes 5 publicaciones gratuitas.\n📍 Ubicación: ${vendedor.distrito}, ${vendedor.provincia}`);
    
    // LIMPIAR FORMULARIO
    document.getElementById('form-vendedor').reset();
    
    // MOSTRAR PERFIL
    mostrarPerfilVendedor();
}

// ========== VENDEDOR - PERFIL ==========
function mostrarPerfilVendedor() {
    const vendedor = obtenerVendedorActual();
    
    if (!vendedor) {
        mostrarModoVendedor();
        return;
    }
    
    // OCULTAR OTRAS SECCIONES
    ocultarTodasSecciones();
    document.getElementById('perfil-vendedor').style.display = 'block';
    
    // ACTUALIZAR INFORMACIÓN DEL PERFIL
    document.getElementById('perfil-nombre').textContent = vendedor.nombre;
    document.getElementById('perfil-localidad').textContent = `${vendedor.distrito}, ${vendedor.provincia}`;
    document.getElementById('contador-publicaciones').textContent = vendedor.publicaciones_disponibles || vendedor.publicacionesDisponibles || 0;
    
    // CONFIGURAR BOTÓN CERRAR SESIÓN
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    btnCerrarSesion.onclick = cerrarSesionVendedor;
    
    // CARGAR PRODUCTOS DEL VENDEDOR
    cargarProductosDelVendedor(vendedor.id);
    
    // ACTUALIZAR BOTÓN ADMIN SI ES ADMIN
    if (modoAdmin) {
        document.getElementById('btn-admin').style.display = 'inline-block';
    }
}

function cargarProductosDelVendedor(vendedorId) {
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const productosVendedor = productos.filter(p => p.vendedor_id === vendedorId && p.estado !== 'eliminado');
    const contenedor = document.getElementById('lista-productos');
    const mensajeVacio = document.getElementById('mensaje-sin-productos');
    
    if (productosVendedor.length === 0) {
        contenedor.innerHTML = '';
        mensajeVacio.style.display = 'block';
        return;
    }
    
    mensajeVacio.style.display = 'none';
    
    contenedor.innerHTML = productosVendedor.map(producto => `
        <div class="producto-card producto-propio">
            <div class="producto-imagen">
                <img src="${obtenerPrimeraFoto(producto)}" 
                     alt="${producto.nombre}"
                     class="producto-foto-principal">
                <div class="producto-estado ${producto.estado === 'inactivo' ? 'inactivo' : 'activo'}">
                    ${producto.estado === 'inactivo' ? '⏸️ Inactivo' : '✅ Activo'}
                </div>
            </div>
            <div class="producto-info">
                <h4 class="producto-nombre">${producto.nombre}</h4>
                <p class="producto-precio">S/ ${parseFloat(producto.precio).toFixed(2)}</p>
                <p class="producto-fecha">Publicado: ${formatearFecha(producto.fecha_publicacion)}</p>
                <p class="producto-descripcion">${(producto.descripcion || '').substring(0, 80)}...</p>
                
                <div class="producto-acciones-vendedor">
                    <button onclick="editarProductoVendedor('${producto.id}')" 
                            class="btn-editar">✏️ Editar</button>
                    <button onclick="eliminarProductoVendedor('${producto.id}')" 
                            class="btn-eliminar">🗑️ Eliminar</button>
                    <button onclick="cambiarEstadoProducto('${producto.id}', '${producto.estado === 'activo' ? 'inactivo' : 'activo'}')" 
                            class="btn-estado">
                        ${producto.estado === 'activo' ? '⏸️ Pausar' : '▶️ Activar'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== VENDEDOR - GESTIÓN DE PRODUCTOS ==========
function mostrarFormularioProducto() {
    document.getElementById('formulario-producto').style.display = 'block';
    document.getElementById('btn-nuevo-producto').style.display = 'none';
    document.getElementById('btn-cerrar-sesion').style.display = 'none';
    
    // Resetear formulario
    document.getElementById('form-producto').reset();
    fotosTemporales = [];
    document.getElementById('preview-fotos').innerHTML = '';
}

function ocultarFormularioProducto() {
    document.getElementById('formulario-producto').style.display = 'none';
    document.getElementById('btn-nuevo-producto').style.display = 'block';
    document.getElementById('btn-cerrar-sesion').style.display = 'block';
}

async function publicarProducto(e) {
    e.preventDefault();
    
    const vendedor = obtenerVendedorActual();
    if (!vendedor) {
        alert('❌ No hay sesión de vendedor activa');
        return;
    }
    
    // VERIFICAR CRÉDITOS
    const creditosDisponibles = vendedor.publicaciones_disponibles || vendedor.publicacionesDisponibles || 0;
    if (creditosDisponibles <= 0) {
        alert('❌ No tienes créditos disponibles.\n\n💡 Opciones:\n1. Esperar a que se liberen publicaciones\n2. Contactar al administrador\n3. Eliminar productos antiguos');
        return;
    }
    
    // RECOLECTAR DATOS DEL PRODUCTO
    const producto = {
        id: 'producto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        vendedor_id: vendedor.id,
        vendedor_nombre: vendedor.nombre,
        telefono: vendedor.telefono,
        email: vendedor.email,
        provincia: vendedor.provincia,
        distrito: vendedor.distrito,
        nombre: document.getElementById('prod-nombre').value.trim(),
        precio: parseFloat(document.getElementById('prod-precio').value) || 0,
        descripcion: document.getElementById('prod-descripcion').value.trim(),
        fotos: [...fotosTemporales],
        fecha_publicacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        estado: 'activo',
        categoria: 'general',
        vistas: 0,
        contactos: 0
    };
    
    // VALIDACIONES
    if (!producto.nombre || producto.precio <= 0) {
        alert('❌ Nombre y precio son obligatorios');
        return;
    }
    
    if (producto.precio > 1000000) {
        alert('❌ El precio no puede ser mayor a S/ 1,000,000');
        return;
    }
    
    // GUARDAR EN LOCALSTORAGE
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    productos.push(producto);
    localStorage.setItem('productos', JSON.stringify(productos));
    
    // ACTUALIZAR CRÉDITOS DEL VENDEDOR
    vendedor.publicaciones_disponibles = creditosDisponibles - 1;
    localStorage.setItem('vendedor_actual', JSON.stringify(vendedor));
    
    // ACTUALIZAR EN LISTA DE VENDEDORES
    const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
    const vendedorIndex = vendedores.findIndex(v => v.id === vendedor.id);
    if (vendedorIndex !== -1) {
        vendedores[vendedorIndex] = vendedor;
        localStorage.setItem('vendedores', JSON.stringify(vendedores));
    }
    
    // SINCRONIZAR CON SUPABASE
    if (supabaseClient) {
        try {
            // Guardar producto
            await supabaseClient.from('productos').upsert(producto);
            
            // Actualizar créditos del vendedor
            await supabaseClient.from('vendedores')
                .update({ publicaciones_disponibles: vendedor.publicaciones_disponibles })
                .eq('id', vendedor.id);
                
            console.log('✅ Producto sincronizado con Supabase');
        } catch (error) {
            console.warn('⚠️ Error sincronizando:', error.message);
        }
    }
    
    // MOSTRAR CONFIRMACIÓN
    alert(`✅ ¡Producto publicado exitosamente!\n\n📦 ${producto.nombre}\n💰 S/ ${producto.precio}\n📊 Créditos restantes: ${vendedor.publicaciones_disponibles}`);
    
    // RESETEAR Y ACTUALIZAR INTERFAZ
    ocultarFormularioProducto();
    mostrarPerfilVendedor();
}

// ========== PANEL DE ADMINISTRACIÓN ==========
async function mostrarPanelAdmin() {
    // VERIFICAR ACCESO
    if (!modoAdmin) {
        const clave = prompt('🔐 Ingresa la clave de administrador:');
        if (clave !== 'AdminMiMarket2024') { // CAMBIA ESTA CLAVE
            alert('❌ Clave incorrecta');
            return;
        }
        localStorage.setItem('es_admin', 'true');
        modoAdmin = true;
        document.getElementById('btn-admin').style.display = 'inline-block';
    }
    
    // OCULTAR OTRAS SECCIONES
    ocultarTodasSecciones();
    
    // CREAR O MOSTRAR PANEL ADMIN
    let panelAdmin = document.getElementById('panel-admin');
    if (!panelAdmin) {
        panelAdmin = document.createElement('section');
        panelAdmin.id = 'panel-admin';
        panelAdmin.className = 'panel-admin';
        panelAdmin.innerHTML = `
            <div class="admin-header">
                <h2>🔧 Panel de Administración</h2>
                <button onclick="cerrarSesionAdmin()" class="btn-secundario">👋 Cerrar Sesión Admin</button>
            </div>
            
            <div class="admin-stats" id="admin-stats">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-number" id="total-productos">0</div>
                    <div class="stat-label">Productos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-number" id="total-vendedores">0</div>
                    <div class="stat-label">Vendedores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-number" id="total-ingresos">S/ 0</div>
                    <div class="stat-label">Ingresos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-number" id="total-vistas">0</div>
                    <div class="stat-label">Vistas</div>
                </div>
            </div>
            
            <div class="admin-tabs">
                <button class="admin-tab active" onclick="mostrarTabAdmin('vendedores')">👥 Vendedores</button>
                <button class="admin-tab" onclick="mostrarTabAdmin('productos')">📦 Productos</button>
                <button class="admin-tab" onclick="mostrarTabAdmin('finanzas')">💰 Finanzas</button>
                <button class="admin-tab" onclick="mostrarTabAdmin('config')">⚙️ Configuración</button>
            </div>
            
            <div class="admin-content">
                <div id="tab-vendedores" class="admin-tab-content active">
                    <h3>📋 Gestión de Vendedores</h3>
                    <div class="admin-acciones">
                        <input type="text" id="buscar-vendedor" placeholder="🔍 Buscar vendedor..." 
                               onkeyup="filtrarVendedores()">
                        <button onclick="exportarVendedores()" class="btn-exportar">📥 Exportar CSV</button>
                    </div>
                    <div id="lista-vendedores-admin"></div>
                </div>
                
                <div id="tab-productos" class="admin-tab-content">
                    <h3>📦 Gestión de Productos</h3>
                    <div class="admin-filtros">
                        <select id="filtro-estado-producto" onchange="filtrarProductosAdmin()">
                            <option value="todos">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="inactivo">Inactivos</option>
                            <option value="eliminado">Eliminados</option>
                        </select>
                        <input type="text" id="buscar-producto-admin" placeholder="🔍 Buscar producto..." 
                               onkeyup="filtrarProductosAdmin()">
                    </div>
                    <div id="lista-productos-admin"></div>
                </div>
                
                <div id="tab-finanzas" class="admin-tab-content">
                    <h3>💰 Reportes Financieros</h3>
                    <div class="finanzas-info">
                        <p>Esta sección estará disponible próximamente</p>
                    </div>
                </div>
                
                <div id="tab-config" class="admin-tab-content">
                    <h3>⚙️ Configuración del Sistema</h3>
                    <div class="config-opciones">
                        <div class="config-item">
                            <label>Clave de administrador:</label>
                            <input type="password" id="nueva-clave-admin" placeholder="Nueva clave">
                            <button onclick="cambiarClaveAdmin()" class="btn-config">Cambiar</button>
                        </div>
                        <div class="config-item">
                            <label>Créditos por registro:</label>
                            <input type="number" id="creditos-registro" value="5" min="1" max="50">
                            <button onclick="actualizarCreditosRegistro()" class="btn-config">Actualizar</button>
                        </div>
                        <div class="config-item">
                            <button onclick="limpiarCache()" class="btn-config danger">🗑️ Limpiar Cache Local</button>
                            <button onclick="sincronizarForzada()" class="btn-config">🔄 Sincronizar con Supabase</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('app').appendChild(panelAdmin);
    }
    
    panelAdmin.style.display = 'block';
    cargarDatosAdmin();
}

async function cargarDatosAdmin() {
    // ESTADÍSTICAS
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
    
    document.getElementById('total-productos').textContent = productos.filter(p => p.estado === 'activo').length;
    document.getElementById('total-vendedores').textContent = vendedores.filter(v => v.estado === 'activo').length;
    
    // CALCULAR INGRESOS (ejemplo: S/ 5 por publicación activa)
    const ingresos = productos.filter(p => p.estado === 'activo').length * 5;
    document.getElementById('total-ingresos').textContent = `S/ ${ingresos}`;
    
    // CALCULAR VISTAS
    const totalVistas = productos.reduce((sum, p) => sum + (p.vistas || 0), 0);
    document.getElementById('total-vistas').textContent = totalVistas.toLocaleString();
    
    // CARGAR LISTA DE VENDEDORES
    const listaVendedores = document.getElementById('lista-vendedores-admin');
    listaVendedores.innerHTML = vendedores.map(v => `
        <div class="item-admin vendedor-admin">
            <div class="info-admin">
                <div class="info-principal">
                    <strong>${v.nombre}</strong>
                    <span class="badge ${v.verificado ? 'verificado' : 'no-verificado'}">
                        ${v.verificado ? '✅ Verificado' : '⏳ Pendiente'}
                    </span>
                </div>
                <div class="info-secundaria">
                    <span>📧 ${v.email}</span>
                    <span>📱 ${v.telefono}</span>
                    <span>📍 ${v.distrito}, ${v.provincia}</span>
                </div>
                <div class="info-estadisticas">
                    <span>📦 Productos: ${productos.filter(p => p.vendedor_id === v.id && p.estado === 'activo').length}</span>
                    <span>💰 Créditos: ${v.publicaciones_disponibles || v.publicacionesDisponibles || 0}</span>
                    <span>📅 Registro: ${formatearFecha(v.fecha_registro)}</span>
                </div>
            </div>
            <div class="acciones-admin">
                <button onclick="verificarVendedor('${v.id}', ${!v.verificado})" 
                        class="btn-admin ${v.verificado ? 'btn-desverificar' : 'btn-verificar'}">
                    ${v.verificado ? '❌ Desverificar' : '✅ Verificar'}
                </button>
                <button onclick="recargarCreditosVendedor('${v.id}')" class="btn-admin btn-recargar">
                    💰 Recargar Créditos
                </button>
                <button onclick="eliminarVendedorAdmin('${v.id}')" class="btn-admin btn-eliminar">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
    
    // CARGAR LISTA DE PRODUCTOS
    mostrarTabAdmin('vendedores'); // Mostrar pestaña de vendedores por defecto
}

// ========== FUNCIONES AUXILIARES ==========
function obtenerVendedorActual() {
    return JSON.parse(localStorage.getItem('vendedor_actual'));
}

function obtenerPrimeraFoto(producto) {
    if (producto.fotos && producto.fotos.length > 0 && producto.fotos[0]) {
        return producto.fotos[0];
    }
    return 'https://via.placeholder.com/300x200?text=MiMarket';
}

function formatearFecha(fechaString) {
    if (!fechaString) return 'Fecha desconocida';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function ocultarTodasSecciones() {
    const secciones = ['busqueda', 'resultados', 'video-tutorial', 'registro-vendedor', 'perfil-vendedor', 'panel-admin'];
    secciones.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.style.display = 'none';
    });
}

function mostrarModoComprador() {
    ocultarTodasSecciones();
    document.getElementById('busqueda').style.display = 'block';
    document.getElementById('resultados').style.display = 'block';
    
    // Cargar productos
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    mostrarResultadosBusqueda(productos.filter(p => p.estado === 'activo'));
    
    // Actualizar estado de botones
    document.getElementById('btn-comprar').classList.add('btn-activo');
    document.getElementById('btn-vender').classList.remove('btn-activo');
}

function mostrarModoVendedor() {
    const vendedor = obtenerVendedorActual();
    
    if (vendedor) {
        mostrarPerfilVendedor();
    } else {
        ocultarTodasSecciones();
        document.getElementById('video-tutorial').style.display = 'block';
    }
    
    // Actualizar estado de botones
    document.getElementById('btn-vender').classList.add('btn-activo');
    document.getElementById('btn-comprar').classList.remove('btn-activo');
}

function configurarUploadFotos() {
    const input = document.getElementById('fotos-producto');
    const uploadArea = document.getElementById('upload-area');
    
    if (!uploadArea || !input) return;
    
    uploadArea.addEventListener('click', () => input.click());
    
    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 2);
        const preview = document.getElementById('preview-fotos');
        
        // Limpiar anteriores
        fotosTemporales = [];
        preview.innerHTML = '';
        
        if (files.length === 0) return;
        
        files.forEach((file, index) => {
            // Validaciones
            if (!file.type.startsWith('image/')) {
                alert(`❌ El archivo "${file.name}" no es una imagen válida`);
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB máximo
                alert(`❌ La imagen "${file.name}" es muy grande (máximo 5MB)`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                fotosTemporales.push(event.target.result);
                
                const div = document.createElement('div');
                div.className = 'foto-preview';
                div.innerHTML = `
                    <img src="${event.target.result}" alt="Preview ${index + 1}">
                    <button type="button" class="eliminar-foto" 
                            onclick="eliminarFotoTemporal(${index})"
                            title="Eliminar esta foto">×</button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });
}

// ========== FUNCIONES GLOBALES (window) ==========
window.eliminarFotoTemporal = function(index) {
    fotosTemporales.splice(index, 1);
    const preview = document.getElementById('preview-fotos');
    const fotos = preview.querySelectorAll('.foto-preview');
    
    if (fotos[index]) {
        fotos[index].remove();
    }
};

window.editarProductoVendedor = function(id) {
    alert('✏️ La función de edición estará disponible en la próxima actualización');
    // Implementar lógica de edición
};

window.eliminarProductoVendedor = function(id) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este producto?\n\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const productoIndex = productos.findIndex(p => p.id === id);
    
    if (productoIndex !== -1) {
        // Marcar como eliminado en lugar de borrar
        productos[productoIndex].estado = 'eliminado';
        productos[productoIndex].fecha_eliminacion = new Date().toISOString();
        localStorage.setItem('productos', JSON.stringify(productos));
        
        // Devolver crédito al vendedor
        const vendedor = obtenerVendedorActual();
        if (vendedor) {
            vendedor.publicaciones_disponibles = (vendedor.publicaciones_disponibles || 0) + 1;
            localStorage.setItem('vendedor_actual', JSON.stringify(vendedor));
        }
        
        alert('✅ Producto eliminado');
        mostrarPerfilVendedor();
    }
};

window.cambiarEstadoProducto = function(id, nuevoEstado) {
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const producto = productos.find(p => p.id === id);
    
    if (producto) {
        producto.estado = nuevoEstado;
        localStorage.setItem('productos', JSON.stringify(productos));
        mostrarPerfilVendedor();
    }
};

window.cerrarSesionVendedor = function() {
    if (confirm('¿Cerrar sesión y cambiar de cuenta?')) {
        localStorage.removeItem('vendedor_actual');
        mostrarModoVendedor();
    }
};

window.cerrarSesionAdmin = function() {
    localStorage.removeItem('es_admin');
    modoAdmin = false;
    document.getElementById('btn-admin').style.display = 'none';
    mostrarModoComprador();
};

window.mostrarTabAdmin = function(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Marcar botón como activo
    document.querySelector(`.admin-tab[onclick="mostrarTabAdmin('${tabName}')"]`).classList.add('active');
    
    // Cargar contenido específico de la pestaña
    if (tabName === 'productos') {
        cargarProductosAdmin();
    }
};

window.cargarProductosAdmin = function() {
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const lista = document.getElementById('lista-productos-admin');
    
    lista.innerHTML = productos.map(p => `
        <div class="item-admin producto-admin">
            <div class="info-admin">
                <div class="info-principal">
                    <strong>${p.nombre}</strong>
                    <span class="badge estado-${p.estado}">${p.estado}</span>
                    <span class="precio-admin">S/ ${p.precio}</span>
                </div>
                <div class="info-secundaria">
                    <span>👤 ${p.vendedor_nombre}</span>
                    <span>📍 ${p.distrito}, ${p.provincia}</span>
                    <span>📅 ${formatearFecha(p.fecha_publicacion)}</span>
                </div>
                <div class="info-estadisticas">
                    <span>👁️ ${p.vistas || 0} vistas</span>
                    <span>📞 ${p.contactos || 0} contactos</span>
                    <span>${p.fotos ? `📷 ${p.fotos.length} fotos` : '📷 Sin fotos'}</span>
                </div>
            </div>
            <div class="acciones-admin">
                <button onclick="cambiarEstadoProductoAdmin('${p.id}', '${p.estado === 'activo' ? 'inactivo' : 'activo'}')" 
                        class="btn-admin btn-estado">
                    ${p.estado === 'activo' ? '⏸️ Pausar' : '▶️ Activar'}
                </button>
                <button onclick="eliminarProductoAdmin('${p.id}')" class="btn-admin btn-eliminar">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
};

// ========== DATOS DEMO ==========
function cargarDatosDemo() {
    console.log('📦 Cargando datos de demostración...');
    
    const productosDemo = [
        {
            id: 'producto_demo_1',
            vendedor_id: 'vendedor_demo_1',
            vendedor_nombre: 'Juan Pérez',
            telefono: '987654321',
            email: 'juan@ejemplo.com',
            provincia: 'Lima',
            distrito: 'Miraflores',
            nombre: 'Bicicleta Mountain Bike Trek',
            precio: 1250,
            descripcion: 'Bicicleta en excelente estado, solo 6 meses de uso. Incluye casco, candado y bomba de aire.',
            fotos: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=300&fit=crop'],
            fecha_publicacion: '2024-01-10T10:30:00Z',
            estado: 'activo',
            categoria: 'deportes',
            vistas: 45,
            contactos: 3
        },
        {
            id: 'producto_demo_2',
            vendedor_id: 'vendedor_demo_2',
            vendedor_nombre: 'María García',
            telefono: '912345678',
            email: 'maria@ejemplo.com',
            provincia: 'Lima',
            distrito: 'San Isidro',
            nombre: 'Sofá de 3 plazas moderno',
            precio: 1800,
            descripcion: 'Sofá negro en piel sintética, perfecto estado. Medidas: 2m x 0.9m x 0.8m.',
            fotos: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop'],
            fecha_publicacion: '2024-01-12T14:20:00Z',
            estado: 'activo',
            categoria: 'hogar',
            vistas: 67,
            contactos: 5
        },
        {
            id: 'producto_demo_3',
            vendedor_id: 'vendedor_demo_1',
            vendedor_nombre: 'Juan Pérez',
            telefono: '987654321',
            email: 'juan@ejemplo.com',
            provincia: 'Lima',
            distrito: 'Miraflores',
            nombre: 'Laptop Dell i7 16GB RAM',
            precio: 3200,
            descripcion: 'Laptop Dell Inspiron, procesador i7, 16GB RAM, SSD 512GB, pantalla 15.6". 1 año de garantía.',
            fotos: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop'],
            fecha_publicacion: '2024-01-15T09:15:00Z',
            estado: 'activo',
            categoria: 'tecnologia',
            vistas: 89,
            contactos: 7
        }
    ];
    
    const vendedoresDemo = [
        {
            id: 'vendedor_demo_1',
            nombre: 'Juan Pérez',
            email: 'juan@ejemplo.com',
            telefono: '987654321',
            provincia: 'Lima',
            distrito: 'Miraflores',
            fecha_registro: '2024-01-01T10:00:00Z',
            publicaciones_disponibles: 8,
            estado: 'activo',
            verificado: true,
            tipo: 'vendedor_premium'
        },
        {
            id: 'vendedor_demo_2',
            nombre: 'María García',
            email: 'maria@ejemplo.com',
            telefono: '912345678',
            provincia: 'Lima',
            distrito: 'San Isidro',
            fecha_registro: '2024-01-05T14:30:00Z',
            publicaciones_disponibles: 5,
            estado: 'activo',
            verificado: true,
            tipo: 'vendedor_basico'
        }
    ];
    
    localStorage.setItem('productos', JSON.stringify(productosDemo));
    localStorage.setItem('vendedores', JSON.stringify(vendedoresDemo));
    
    console.log('✅ Datos demo cargados exitosamente');
}

// Inicializar cuando se carga la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}

window.addEventListener("load", () => {
    // ========== CONFIGURACIÓN SUPABASE ==========
    let db = null;
    let supabaseConectado = false;
    let datosPendientesSync = JSON.parse(localStorage.getItem('datosPendientesSync')) || [];
    
    // Intentar conectar a Supabase
    if (window.supabase && window.SUPABASE_CONFIG) {
        try {
            db = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
            supabaseConectado = true;
            console.log('✅ Supabase conectado desde supabase-config.js');
        } catch (error) {
            console.warn('⚠️ Error conectando a Supabase, usando modo offline');
        }
        // ============================================
// REGISTRAR SERVICE WORKER PARA PWA
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/EU-INO/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Verificar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nuevo Service Worker encontrado');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              if (confirm('¡Nueva versión disponible! ¿Recargar para actualizar?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.log('❌ Error registrando Service Worker:', error);
      });
  });
  
  // Manejar actualizaciones
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Detectar si es PWA instalada
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              window.navigator.standalone ||
              document.referrer.includes('android-app://');
              
if (isPWA) {
  console.log('📱 App ejecutándose como PWA instalada');
  document.documentElement.classList.add('pwa-mode');
}
    } else {
        // Configuración directa si falla el otro método
        const SUPABASE_URL = 'https://vxzvnquhuebakzscfjvg.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4enZucXVodWViYWt6c2NmanZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzU2NjksImV4cCI6MjA4Mzg1MTY2OX0.YFQj-JCCnz8Q5oE4ajBbf9jEBu4h1fyjRXloX4SRZ2A';
        
        if (window.supabase) {
            db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            supabaseConectado = true;
            console.log('✅ Supabase conectado directamente');
        }
    }
    
    // ========== CONFIGURACIÓN INICIAL ==========
    const splash = document.getElementById("splash");
    const app = document.getElementById("app");
    
    // DATOS VACÍOS - Sin ejemplos
    let productosGlobales = JSON.parse(localStorage.getItem('productosGlobales')) || [];
    let vendedoresGlobales = JSON.parse(localStorage.getItem('vendedoresGlobales')) || [];
    
    // CONFIGURACIÓN ADMIN - Credenciales ocultas
    let adminConfig = JSON.parse(localStorage.getItem('adminConfig')) || {
        yapeNumero: "999-888-777",
        yapeQR: "",
        adminUser: "admin",
        adminPass: "admin123",
        precioPublicacion: 5.00
    };
    
    localStorage.setItem('adminConfig', JSON.stringify(adminConfig));
    
    let fotosTemporales = [];

    // ========== FUNCIONES SUPABASE MEJORADAS ==========
    
    // 1. Subir foto a Supabase Storage (opcional - más eficiente)
    async function subirFotoASupabaseStorage(archivoBase64, nombreArchivo, productoId) {
        if (!supabaseConectado || !db) return archivoBase64;
        
        try {
            // Convertir base64 a blob
            const blob = await fetch(archivoBase64).then(r => r.blob());
            const nombreUnico = `producto_${productoId}_${Date.now()}_${nombreArchivo}`;
            
            // Subir a Supabase Storage
            const { data, error } = await db.storage
                .from('productos-fotos')
                .upload(nombreUnico, blob);
            
            if (error) throw error;
            
            // Obtener URL pública
            const { data: urlData } = db.storage
                .from('productos-fotos')
                .getPublicUrl(nombreUnico);
            
            console.log('✅ Foto subida a Supabase Storage:', urlData.publicUrl);
            return urlData.publicUrl;
            
        } catch (error) {
            console.error('❌ Error subiendo foto a Storage, usando Base64:', error.message);
            return archivoBase64; // Fallback a Base64
        }
    }
    
    // 2. Guardar vendedor en Supabase con sincronización
    async function guardarVendedorSupabase(vendedorLocal) {
        if (!supabaseConectado || !db) {
            // Guardar en pendientes de sincronización
            datosPendientesSync.push({
                tipo: 'vendedor',
                datos: vendedorLocal,
                fecha: new Date().toISOString()
            });
            localStorage.setItem('datosPendientesSync', JSON.stringify(datosPendientesSync));
            console.log('📱 Vendedor guardado para sincronización posterior');
            return vendedorLocal;
        }
        
        try {
            const vendedorData = {
                nombre: vendedorLocal.nombre,
                email: vendedorLocal.email,
                provincia: vendedorLocal.provincia,
                distrito: vendedorLocal.distrito,
                telefono: vendedorLocal.telefono,
                publicaciones_disponibles: vendedorLocal.publicacionesDisponibles,
                estado: vendedorLocal.estado,
                contacto_whatsapp: vendedorLocal.contactoWhatsapp,
                contacto_llamada: vendedorLocal.contactoLlamada,
                contactos_recibidos: 0,
                codigo_referencia: vendedorLocal.id
            };
            
            const { data, error } = await db
                .from('vendedores')
                .insert([vendedorData])
                .select();
            
            if (error) throw error;
            
            console.log('✅ Vendedor guardado en Supabase');
            return {
                ...vendedorLocal,
                id_supabase: data[0].id  // ID real de Supabase
            };
            
        } catch (error) {
            console.error('❌ Error Supabase:', error.message);
            // Guardar en pendientes
            datosPendientesSync.push({
                tipo: 'vendedor',
                datos: vendedorLocal,
                fecha: new Date().toISOString(),
                error: error.message
            });
            localStorage.setItem('datosPendientesSync', JSON.stringify(datosPendientesSync));
            return vendedorLocal;
        }
    }
    
    // 3. Guardar producto en Supabase con fotos optimizadas
    async function guardarProductoSupabase(productoLocal, vendedorIdSupabase) {
        if (!supabaseConectado || !db) {
            // Guardar en pendientes
            datosPendientesSync.push({
                tipo: 'producto',
                datos: { ...productoLocal, vendedor_id_supabase: vendedorIdSupabase },
                fecha: new Date().toISOString()
            });
            localStorage.setItem('datosPendientesSync', JSON.stringify(datosPendientesSync));
            console.log('📱 Producto guardado para sincronización posterior');
            return productoLocal;
        }
        
        try {
            // Procesar fotos (subir a Storage o mantener Base64)
            let fotosProcesadas = [];
            
            for (let i = 0; i < productoLocal.fotos.length; i++) {
                const foto = productoLocal.fotos[i];
                
                // Si es Base64 muy grande (>500KB), subir a Storage
                if (foto.length > 500000) { // ~500KB
                    const url = await subirFotoASupabaseStorage(
                        foto, 
                        `foto_${i}.jpg`, 
                        productoLocal.id
                    );
                    fotosProcesadas.push(url);
                } else {
                    // Mantener Base64 si es pequeña
                    fotosProcesadas.push(foto);
                }
            }
            
            const productoData = {
                nombre: productoLocal.nombre,
                precio: productoLocal.precio,
                categoria: productoLocal.categoria,
                descripcion: productoLocal.descripcion,
                estado_producto: productoLocal.estado,
                vendedor_id: vendedorIdSupabase,
                provincia: productoLocal.provincia,
                distrito: productoLocal.distrito,
                vistas: 0,
                fotos: fotosProcesadas,
                contacto_whatsapp: productoLocal.contactoWhatsapp,
                contacto_llamada: productoLocal.contactoLlamada,
                codigo_local: productoLocal.id // Guardamos el ID local para referencia
            };
            
            const { data, error } = await db
                .from('productos')
                .insert([productoData])
                .select();
            
            if (error) throw error;
            
            console.log('✅ Producto guardado en Supabase');
            return {
                ...productoLocal,
                id_supabase: data[0].id,
                fotos: fotosProcesadas
            };
            
        } catch (error) {
            console.error('❌ Error guardando producto:', error.message);
            // Guardar en pendientes
            datosPendientesSync.push({
                tipo: 'producto',
                datos: { ...productoLocal, vendedor_id_supabase: vendedorIdSupabase },
                fecha: new Date().toISOString(),
                error: error.message
            });
            localStorage.setItem('datosPendientesSync', JSON.stringify(datosPendientesSync));
            return productoLocal;
        }
    }
    
    // 4. Sincronización automática de datos pendientes
    async function sincronizarDatosPendientes() {
        if (!supabaseConectado || !db || datosPendientesSync.length === 0) return;
        
        console.log('🔄 Sincronizando datos pendientes...');
        
        const exitosos = [];
        const fallidos = [];
        
        for (let i = 0; i < datosPendientesSync.length; i++) {
            const pendiente = datosPendientesSync[i];
            
            try {
                if (pendiente.tipo === 'vendedor') {
                    await guardarVendedorSupabase(pendiente.datos);
                    exitosos.push(i);
                } else if (pendiente.tipo === 'producto') {
                    await guardarProductoSupabase(
                        pendiente.datos, 
                        pendiente.datos.vendedor_id_supabase
                    );
                    exitosos.push(i);
                }
            } catch (error) {
                console.error(`Error sincronizando ${pendiente.tipo}:`, error);
                fallidos.push(i);
            }
        }
        
        // Eliminar solo los exitosos
        if (exitosos.length > 0) {
            datosPendientesSync = datosPendientesSync.filter((_, index) => !exitosos.includes(index));
            localStorage.setItem('datosPendientesSync', JSON.stringify(datosPendientesSync));
            console.log(`✅ Sincronizados ${exitosos.length} datos pendientes`);
            
            // Notificar al usuario
            if (exitosos.length > 0) {
                mostrarNotificacion(`✅ ${exitosos.length} datos sincronizados con la nube`);
            }
        }
        
        if (fallidos.length > 0) {
            console.log(`⚠️ ${fallidos.length} datos no pudieron sincronizarse`);
        }
    }
    
    // 5. Buscar productos en Supabase
    async function buscarProductosSupabase(busqueda, provincia, distrito) {
        if (!supabaseConectado || !db) return [];
        
        try {
            let query = db.from('productos').select('*');
            
            if (provincia) query = query.eq('provincia', provincia);
            if (distrito) query = query.eq('distrito', distrito);
            if (busqueda) {
                query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%`);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            // Convertir formato Supabase a nuestro formato
            return data.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio,
                categoria: item.categoria,
                descripcion: item.descripcion,
                estado: item.estado_producto,
                vendedor: 'Vendedor Supabase',
                vendedorId: item.vendedor_id,
                provincia: item.provincia,
                distrito: item.distrito,
                vistas: item.vistas,
                fotos: item.fotos || [],
                fechaPublicacion: item.fecha_publicacion,
                contactoWhatsapp: item.contacto_whatsapp,
                contactoLlamada: item.contacto_llamada
            }));
            
        } catch (error) {
            console.error('❌ Error buscando en Supabase:', error.message);
            return [];
        }
    }
    
    // 6. Obtener vendedores desde Supabase
    async function obtenerVendedoresSupabase() {
        if (!supabaseConectado || !db) return [];
        
        try {
            const { data, error } = await db
                .from('vendedores')
                .select('*')
                .order('fecha_registro', { ascending: false });
            
            if (error) throw error;
            
            return data.map(v => ({
                id: v.id,
                nombre: v.nombre,
                email: v.email,
                provincia: v.provincia,
                distrito: v.distrito,
                telefono: v.telefono,
                productos: [],
                publicacionesDisponibles: v.publicaciones_disponibles,
                pagos: [],
                estado: v.estado,
                fechaRegistro: v.fecha_registro,
                contactoWhatsapp: v.contacto_whatsapp,
                contactoLlamada: v.contacto_llamada,
                contactosRecibidos: v.contactos_recibidos,
                codigoReferencia: v.codigo_referencia
            }));
            
        } catch (error) {
            console.error('❌ Error obteniendo vendedores:', error.message);
            return [];
        }
    }

    // ========== SPLASH SCREEN ==========
    setTimeout(() => {
        splash.style.opacity = "0";
        splash.style.transition = "opacity .6s";
        setTimeout(() => {
            splash.style.display = "none";
            app.style.display = "block";
            
            const vendedor = JSON.parse(localStorage.getItem("vendedor"));
            if (vendedor) {
                mostrarPerfil();
            }
        }, 600);
    }, 1500);

    // ========== ACCESO SECRETO AL ADMIN ==========
    // Combinación secreta para mostrar botón Admin
    let keySequence = [];
    const secretCode = ['a', 'd', 'm', 'i', 'n']; // Escribir "admin" en el teclado
    
    document.addEventListener('keydown', (e) => {
        keySequence.push(e.key.toLowerCase());
        
        // Mantener solo los últimos 5 caracteres
        if (keySequence.length > 5) {
            keySequence.shift();
        }
        
        // Verificar si coincide con el código secreto
        if (keySequence.join('') === secretCode.join('')) {
            mostrarBotonAdmin();
            keySequence = []; // Reiniciar secuencia
        }
        
        // Atajo Ctrl+Shift+A también funciona
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            mostrarBotonAdmin();
        }
    });
    
    function mostrarBotonAdmin() {
        const btnAdmin = document.getElementById("btn-admin");
        btnAdmin.style.display = "block";
        btnAdmin.style.animation = "pulse 0.5s 3";
        
        // Ocultar después de 10 segundos
        setTimeout(() => {
            btnAdmin.style.display = "none";
        }, 10000);
        
        // Guardar en localStorage para mantener visible en esta sesión
        sessionStorage.setItem('adminVisible', 'true');
    }
    
    // Verificar si ya se activó en esta sesión
    if (sessionStorage.getItem('adminVisible') === 'true') {
        mostrarBotonAdmin();
    }

    // ========== MANEJO DE FOTOS MEJORADO ==========
    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("fotos-producto");
    const previewFotos = document.getElementById("preview-fotos");

    uploadArea.addEventListener("click", () => {
        fileInput.click();
    });

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.style.background = "#edf2ff";
        uploadArea.style.borderColor = "#764ba2";
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.style.background = "#f8f9ff";
        uploadArea.style.borderColor = "#667eea";
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.style.background = "#f8f9ff";
        uploadArea.style.borderColor = "#667eea";
        
        const files = Array.from(e.dataTransfer.files).slice(0, 2);
        procesarFotos(files);
    });

    fileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files).slice(0, 2);
        procesarFotos(files);
    });

    function procesarFotos(files) {
        if (fotosTemporales.length + files.length > 2) {
            alert("Solo puedes subir máximo 2 fotos por producto");
            files = files.slice(0, 2 - fotosTemporales.length);
        }

        files.forEach(file => {
            if (!file.type.startsWith("image/")) {
                alert("Solo se permiten archivos de imagen (JPG, PNG, WebP)");
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert("La imagen es muy grande (máximo 2MB cada una)");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                // Comprimir imagen si es muy grande
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Redimensionar si es muy grande
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1200;
                    
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        } else {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convertir a JPEG con 80% calidad
                    const fotoComprimida = canvas.toDataURL('image/jpeg', 0.8);
                    
                    fotosTemporales.push({
                        nombre: file.name,
                        data: fotoComprimida,
                        tamañoOriginal: file.size,
                        tamañoComprimido: fotoComprimida.length
                    });
                    actualizarPreviewFotos();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function actualizarPreviewFotos() {
        previewFotos.innerHTML = '';
        
        fotosTemporales.forEach((foto, index) => {
            const div = document.createElement("div");
            div.className = "foto-preview";
            div.innerHTML = `
                <img src="${foto.data}" alt="${foto.nombre}">
                <button class="eliminar-foto" onclick="eliminarFotoTemporal(${index})">×</button>
                <div class="foto-info">
                    <small>${Math.round(foto.tamañoComprimido / 1024)}KB</small>
                </div>
            `;
            previewFotos.appendChild(div);
        });

        if (fotosTemporales.length === 0) {
            uploadArea.querySelector(".upload-placeholder").innerHTML = `
                <p>📷 Arrastra o haz clic para subir fotos</p>
                <p class="upload-info">JPG, PNG, WebP (Máx 2MB c/u)</p>
            `;
        } else {
            uploadArea.querySelector(".upload-placeholder").innerHTML = `
                <p>✅ ${fotosTemporales.length} foto(s) seleccionada(s)</p>
                <p class="upload-info">Haz clic para agregar más (máx 2)</p>
            `;
        }
    }

    window.eliminarFotoTemporal = function(index) {
        fotosTemporales.splice(index, 1);
        actualizarPreviewFotos();
        fileInput.value = '';
    };

    // ========== NAVEGACIÓN PRINCIPAL ==========
    const btnComprar = document.getElementById("btn-comprar");
    const btnVender = document.getElementById("btn-vender");
    const btnAdmin = document.getElementById("btn-admin");
    const busqueda = document.getElementById("busqueda");
    const resultados = document.getElementById("resultados");
    const registro = document.getElementById("registro-vendedor");
    const videoTutorial = document.getElementById("video-tutorial");
    const perfil = document.getElementById("perfil-vendedor");
    const panelAdmin = document.getElementById("panel-admin");

    // Botón Admin INVISIBLE por defecto
    btnAdmin.style.display = "none";

    btnComprar.onclick = () => {
        activarBoton(btnComprar, btnVender);
        mostrarSeccion(busqueda);
        mostrarSeccion(resultados);
        ocultarSeccion(registro);
        ocultarSeccion(videoTutorial);
        ocultarSeccion(perfil);
        ocultarSeccion(panelAdmin);
        cargarResultados();
    };

    btnVender.onclick = () => {
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        if (!vendedor) {
            activarBoton(btnVender, btnComprar);
            ocultarSeccion(busqueda);
            ocultarSeccion(resultados);
            ocultarSeccion(registro);
            ocultarSeccion(perfil);
            ocultarSeccion(panelAdmin);
            mostrarSeccion(videoTutorial);
        } else {
            mostrarPerfil();
        }
    };

    btnAdmin.onclick = () => {
        activarBoton(btnAdmin, btnComprar);
        ocultarSeccion(busqueda);
        ocultarSeccion(resultados);
        ocultarSeccion(registro);
        ocultarSeccion(videoTutorial);
        ocultarSeccion(perfil);
        mostrarSeccion(panelAdmin);
        cargarPanelAdmin();
    };

    // ========== VIDEO TUTORIAL ==========
    document.getElementById("btn-saltar-video").onclick = () => {
        ocultarSeccion(videoTutorial);
        mostrarSeccion(registro);
    };

    // ========== REGISTRO VENDEDOR MEJORADO ==========
    const formVendedor = document.getElementById("form-vendedor");
    formVendedor.onsubmit = async e => {
        e.preventDefault();

        const vendedorId = "V" + Date.now().toString().slice(-6);
        const vendedor = {
            id: vendedorId,
            nombre: document.getElementById("nombre").value,
            email: document.getElementById("email").value,
            provincia: document.getElementById("provincia-vendedor").value,
            distrito: document.getElementById("distrito-vendedor").value,
            telefono: document.getElementById("telefono").value,
            productos: [],
            publicacionesDisponibles: 1,
            pagos: [],
            estado: "pendiente_pago",
            fechaRegistro: new Date().toISOString(),
            contactoWhatsapp: document.getElementById("contacto-whatsapp").checked,
            contactoLlamada: document.getElementById("contacto-llamada").checked,
            contactosRecibidos: 0
        };

        // ✅ Guardar en Supabase (con sincronización automática)
        const vendedorConSupabase = await guardarVendedorSupabase(vendedor);

        // Guardar en localStorage local
        localStorage.setItem("vendedor", JSON.stringify(vendedorConSupabase));
        
        // Agregar a lista global de vendedores
        vendedoresGlobales.push(vendedorConSupabase);
        localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
        
        mostrarPerfil();
        formVendedor.reset();
        
        alert("✅ Registro exitoso. Tienes 1 publicación gratuita.");
    };

    // ========== PERFIL VENDEDOR MEJORADO ==========
    function mostrarPerfil() {
        activarBoton(btnVender, btnComprar);
        ocultarSeccion(busqueda);
        ocultarSeccion(resultados);
        ocultarSeccion(registro);
        ocultarSeccion(videoTutorial);
        ocultarSeccion(panelAdmin);
        mostrarSeccion(perfil);

        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        if (!vendedor) return;

        document.getElementById("perfil-nombre").textContent = vendedor.nombre;
        document.getElementById("perfil-localidad").textContent = `📍 ${vendedor.provincia}, ${vendedor.distrito}`;
        document.getElementById("perfil-telefono").textContent = `📱 Teléfono: ${vendedor.telefono}`;
        document.getElementById("perfil-email").textContent = `✉️ Email: ${vendedor.email}`;
        
        // Mostrar código del vendedor
        mostrarCodigoVendedor(vendedor);
        
        // Actualizar contador
        const contador = document.getElementById("contador-publicaciones");
        contador.textContent = vendedor.publicacionesDisponibles;
        
        // Mostrar/ocultar sección de pago
        const seccionPago = document.getElementById("seccion-pago");
        const mensajePago = document.getElementById("mensaje-pago");
        
        if (vendedor.publicacionesDisponibles <= 0) {
            seccionPago.style.display = "block";
            mensajePago.style.display = "block";
            
            // Configurar botón de WhatsApp
            document.getElementById("btn-enviar-comprobante").onclick = () => {
                const mensaje = `Hola, soy ${vendedor.nombre}. Acabo de realizar el pago para publicar en MiMarket. Mi código: ${vendedor.id}`;
                window.open(`https://wa.me/${adminConfig.yapeNumero.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`, '_blank');
            };
        } else {
            seccionPago.style.display = "none";
            mensajePago.style.display = "none";
        }

        // Actualizar estadísticas
        const productosVendedor = productosGlobales.filter(p => p.vendedorId === vendedor.id);
        document.getElementById("productos-activos").textContent = productosVendedor.length;
        const vistasTotales = productosVendedor.reduce((total, prod) => total + (prod.vistas || 0), 0);
        document.getElementById("vistas-totales").textContent = vistasTotales;
        document.getElementById("contactos-recibidos").textContent = vendedor.contactosRecibidos || 0;

        renderProductosVendedor();
    }
    
    // Función para mostrar código del vendedor
    function mostrarCodigoVendedor(vendedor) {
        let codigoSection = document.getElementById("codigo-vendedor-section");
        if (!codigoSection) {
            codigoSection = document.createElement("div");
            codigoSection.id = "codigo-vendedor-section";
            codigoSection.className = "codigo-section";
            document.querySelector(".perfil-header").after(codigoSection);
        }
        
        codigoSection.innerHTML = `
            <h3>🔑 Tu Código de Vendedor</h3>
            <div class="codigo-container">
                <p class="codigo-numero">${vendedor.id}</p>
                <button onclick="copiarCodigo('${vendedor.id}')" class="btn-copiar">📋 Copiar Código</button>
            </div>
            <p class="codigo-instrucciones">
                <strong>Instrucciones para pagar:</strong><br>
                1. Realiza pago de S/ ${adminConfig.precioPublicacion || '5.00'} por Yape al: <strong>${adminConfig.yapeNumero}</strong><br>
                2. Envía el comprobante al WhatsApp del admin con tu código<br>
                3. Espera la confirmación para poder publicar más productos
            </p>
        `;
    }
    
    // Función para copiar código
    window.copiarCodigo = function(codigo) {
        navigator.clipboard.writeText(codigo)
            .then(() => mostrarNotificacion("✅ Código copiado al portapapeles"))
            .catch(err => console.error('Error copiando:', err));
    };

    // ========== GESTIÓN DE PAGOS VENDEDOR ==========
    document.getElementById("btn-realizar-pago").onclick = () => {
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        const precio = adminConfig.precioPublicacion || 5.00;
        alert(`Realiza el pago de S/ ${precio} por Yape al número: ${adminConfig.yapeNumero}\n\nTu código de vendedor: ${vendedor.id}\n\nDespués del pago, envía el comprobante por WhatsApp para habilitar tu cuenta.`);
    };

    // ========== GESTIÓN DE PRODUCTOS (VENDEDOR) MEJORADA ==========
    const btnNuevoProducto = document.getElementById("btn-nuevo-producto");
    const formularioProducto = document.getElementById("formulario-producto");
    const formProducto = document.getElementById("form-producto");

    btnNuevoProducto.onclick = () => {
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        if (vendedor.publicacionesDisponibles <= 0) {
            const precio = adminConfig.precioPublicacion || 5.00;
            alert(`No tienes publicaciones disponibles. Debes realizar el pago de S/ ${precio}.00`);
            return;
        }
        formularioProducto.style.display = "block";
        fotosTemporales = [];
        actualizarPreviewFotos();
    };

    document.getElementById("btn-cancelar").onclick = () => {
        formularioProducto.style.display = "none";
        formProducto.reset();
        fotosTemporales = [];
        actualizarPreviewFotos();
    };

    formProducto.onsubmit = async e => {
        e.preventDefault();
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));

        if (fotosTemporales.length === 0) {
            alert("Debes subir al menos una foto del producto");
            return;
        }

        const nuevoProducto = {
            id: Date.now(),
            nombre: document.getElementById("prod-nombre").value,
            precio: parseFloat(document.getElementById("prod-precio").value),
            categoria: document.getElementById("prod-categoria").value,
            descripcion: document.getElementById("prod-descripcion").value,
            estado: document.getElementById("prod-estado").value,
            vendedor: vendedor.nombre,
            vendedorId: vendedor.id,
            telefono: vendedor.telefono,
            email: vendedor.email,
            provincia: vendedor.provincia,
            distrito: vendedor.distrito,
            vistas: 0,
            fotos: fotosTemporales.map(foto => foto.data),
            fechaPublicacion: new Date().toISOString(),
            contactoWhatsapp: vendedor.contactoWhatsapp,
            contactoLlamada: vendedor.contactoLlamada
        };

        // ✅ NUEVO: Guardar en Supabase (con manejo de fotos mejorado)
        const productoConSupabase = await guardarProductoSupabase(
            nuevoProducto, 
            vendedor.id_supabase || vendedor.id
        );

        // Agregar a productos globales
        productosGlobales.push(productoConSupabase);
        localStorage.setItem('productosGlobales', JSON.stringify(productosGlobales));
        
        // Actualizar vendedor
        vendedor.productos.push(productoConSupabase.id);
        vendedor.publicacionesDisponibles -= 1;
        localStorage.setItem("vendedor", JSON.stringify(vendedor));
        
        // Actualizar vendedor global
        const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === vendedor.id);
        if (vendedorIndex !== -1) {
            vendedoresGlobales[vendedorIndex] = vendedor;
            localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
        }

        // ✅ NUEVO: Actualizar vendedor en Supabase
        if (vendedor.id_supabase) {
            try {
                await db.from('vendedores')
                    .update({ publicaciones_disponibles: vendedor.publicacionesDisponibles })
                    .eq('id', vendedor.id_supabase);
            } catch (error) {
                console.error('Error actualizando vendedor en Supabase:', error);
            }
        }

        // Resetear formulario
        formProducto.reset();
        fotosTemporales = [];
        actualizarPreviewFotos();
        formularioProducto.style.display = "none";

        // Actualizar vista
        mostrarPerfil();
        mostrarNotificacion("✅ Producto publicado exitosamente!");
    };

    function renderProductosVendedor() {
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        const listaProductos = document.getElementById("lista-productos");

        const productosVendedor = productosGlobales.filter(p => p.vendedorId === vendedor.id);

        if (productosVendedor.length === 0) {
            listaProductos.innerHTML = `
                <div class="mensaje-vacio">
                    <p>📦 Aún no has publicado productos</p>
                    <p>Usa tu publicación gratuita ahora</p>
                </div>`;
            return;
        }

        listaProductos.innerHTML = productosVendedor.map(producto => `
            <div class="producto-card producto-con-fotos">
                ${producto.fotos && producto.fotos.length > 0 ? `
                    <img src="${producto.fotos[0]}" class="producto-foto-principal" alt="${producto.nombre}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjNzE4MDk2Ij7imYMgU2luIGZvdG88L3RleHQ+PC9zdmc+'">
                    ${producto.fotos.length > 1 ? `
                        <div class="producto-miniaturas">
                            ${producto.fotos.slice(1).map((foto, i) => `
                                <img src="${foto}" class="miniatura" alt="Foto ${i+2}">
                            `).join('')}
                        </div>
                    ` : ''}
                ` : '<div class="producto-foto-principal" style="display:flex;align-items:center;justify-content:center;background:#f7fafc;">📷 Sin foto</div>'}
                
                <div style="padding:15px;">
                    <div class="producto-header">
                        <div>
                            <h4 class="producto-nombre">${producto.nombre}</h4>
                            <p class="producto-categoria">${producto.categoria}</p>
                        </div>
                        <div class="producto-precio">S/ ${producto.precio}</div>
                    </div>
                    
                    <p class="producto-descripcion" style="margin:10px 0;">${producto.descripcion.substring(0, 100)}${producto.descripcion.length > 100 ? '...' : ''}</p>
                    
                    <div class="producto-info">
                        <span>📊 ${producto.vistas} vistas</span>
                        <span>🏷️ ${producto.estado}</span>
                        <span>📅 ${new Date(producto.fechaPublicacion).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="producto-contacto">
                        ${producto.contactoWhatsapp ? `<button onclick="contactarWhatsApp('${producto.telefono}', '${producto.nombre}', '${vendedor.nombre}')" class="btn-whatsapp">💬 WhatsApp</button>` : ''}
                        ${producto.contactoLlamada ? `<button onclick="window.open('tel:${producto.telefono}')" class="btn-llamar">📞 Llamar</button>` : ''}
                    </div>
                    
                    <div class="producto-acciones">
                        <button onclick="editarProducto(${producto.id})" class="btn-secundario">✏️ Editar</button>
                        <button onclick="eliminarProducto(${producto.id})" class="btn-cancelar">🗑️ Eliminar</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========== BÚSQUEDA Y RESULTADOS (COMPRADOR) MEJORADA ==========
    const formBusqueda = document.getElementById("form-busqueda");
    formBusqueda.onsubmit = async e => {
        e.preventDefault();
        
        const busqueda = document.getElementById("buscar-producto").value;
        const provincia = document.getElementById("provincia").value;
        const distrito = document.getElementById("distrito").value;
        
        let resultadosFiltrados = [];
        
        // 1. Buscar en datos locales primero
        resultadosFiltrados = productosGlobales.filter(prod => {
            const coincideProducto = prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                                   prod.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                                   prod.categoria.toLowerCase().includes(busqueda.toLowerCase());
            const coincideProvincia = !provincia || prod.provincia === provincia;
            const coincideDistrito = !distrito || prod.distrito === distrito;
            
            return coincideProducto && coincideProvincia && coincideDistrito;
        });
        
        // 2. Si no hay resultados locales, buscar en Supabase
        if (resultadosFiltrados.length === 0 && supabaseConectado) {
            console.log('🔍 Buscando en Supabase...');
            const resultadosSupabase = await buscarProductosSupabase(busqueda, provincia, distrito);
            resultadosFiltrados = resultadosSupabase;
            
            // Guardar los productos de Supabase localmente para futuras búsquedas
            resultadosSupabase.forEach(prod => {
                if (!productosGlobales.some(p => p.id === prod.id)) {
                    productosGlobales.push(prod);
                }
            });
            localStorage.setItem('productosGlobales', JSON.stringify(productosGlobales));
        }
        
        mostrarResultados(resultadosFiltrados);
    };

    function mostrarResultados(productos) {
        const listaResultados = document.getElementById("lista-resultados");
        const mensajeVacio = document.getElementById("mensaje-vacio");

        if (!productos || productos.length === 0) {
            listaResultados.innerHTML = '';
            mensajeVacio.style.display = 'block';
            mensajeVacio.textContent = 'No se encontraron productos en tu zona. Intenta con otros filtros.';
            return;
        }

        mensajeVacio.style.display = 'none';
        
        listaResultados.innerHTML = productos.map(producto => `
            <div class="producto-card" data-id="${producto.id}">
                ${producto.fotos && producto.fotos.length > 0 ? `
                    <img src="${producto.fotos[0]}" class="producto-foto-principal" alt="${producto.nombre}" 
                         onclick="mostrarModalProducto(${producto.id})" style="cursor:pointer;"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjNzE4MDk2Ij7imYMgU2luIGZvdG88L3RleHQ+PC9zdmc+';">
                    ${producto.fotos.length > 1 ? `
                        <div class="producto-miniaturas">
                            <small>+${producto.fotos.length - 1} más</small>
                        </div>
                    ` : ''}
                ` : '<div class="producto-foto-principal" style="display:flex;align-items:center;justify-content:center;background:#f7fafc;">📷 Sin foto</div>'}
                
                <div style="padding:15px;">
                    <div class="producto-header">
                        <div>
                            <h4 class="producto-nombre">${producto.nombre}</h4>
                            <p class="producto-categoria">${producto.categoria} • ${producto.distrito}</p>
                        </div>
                        <div class="producto-precio">S/ ${producto.precio}</div>
                    </div>
                    
                    <p class="producto-descripcion">${producto.descripcion.substring(0, 120)}${producto.descripcion.length > 120 ? '...' : ''}</p>
                    
                    <div class="producto-info">
                        <span>🏷️ ${producto.estado}</span>
                        <span>📍 ${producto.distrito}</span>
                        <span>👤 ${producto.vendedor}</span>
                    </div>
                    
                    <button class="btn-contactar" onclick="mostrarModalProducto(${producto.id})">
                        📞 Ver detalles y contactar
                    </button>
                </div>
            </div>
        `).join('');

        // Incrementar vistas
        productos.forEach(producto => {
            const index = productosGlobales.findIndex(p => p.id === producto.id);
            if (index !== -1) {
                productosGlobales[index].vistas = (productosGlobales[index].vistas || 0) + 1;
                
                // Incrementar contactos del vendedor
                const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === productosGlobales[index].vendedorId);
                if (vendedorIndex !== -1) {
                    vendedoresGlobales[vendedorIndex].contactosRecibidos = 
                        (vendedoresGlobales[vendedorIndex].contactosRecibidos || 0) + 1;
                }
            }
        });
        
        localStorage.setItem('productosGlobales', JSON.stringify(productosGlobales));
        localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
    }

    function cargarResultados() {
        mostrarResultados([]);
    }

    // ========== MODAL DE PRODUCTO COMPLETO ==========
    window.mostrarModalProducto = function(id) {
        const producto = productosGlobales.find(p => p.id === id);
        if (!producto) return;

        const modal = document.getElementById("modal-contacto");
        const fotosContainer = document.getElementById("modal-fotos");
        
        // Mostrar fotos
        fotosContainer.innerHTML = '';
        if (producto.fotos && producto.fotos.length > 0) {
            producto.fotos.forEach((foto, index) => {
                const img = document.createElement("img");
                img.src = foto;
                img.className = "modal-foto";
                img.alt = `Foto ${index + 1} de ${producto.nombre}`;
                img.onerror = function() {
                    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzcxODA5NiI+U2luIGZvdG88L3RleHQ+PC9zdmc+';
                };
                fotosContainer.appendChild(img);
            });
        }

        // Llenar información
        document.getElementById("modal-producto-nombre").textContent = producto.nombre;
        document.getElementById("modal-producto-precio").textContent = `S/ ${producto.precio}`;
        document.getElementById("modal-producto-descripcion").textContent = producto.descripcion;
        document.getElementById("modal-vendedor-nombre").textContent = producto.vendedor;
        document.getElementById("modal-vendedor-ubicacion").textContent = `${producto.distrito}, ${producto.provincia}`;
        document.getElementById("modal-vendedor-telefono").textContent = producto.telefono;
        document.getElementById("modal-producto-fecha").textContent = new Date(producto.fechaPublicacion).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Configurar botones de contacto
        const btnLlamar = document.getElementById("btn-llamar");
        const btnWhatsapp = document.getElementById("btn-whatsapp");
        
        btnLlamar.onclick = () => {
            window.open(`tel:${producto.telefono}`, '_blank');
            // Registrar contacto
            registrarContacto(producto.vendedorId, 'llamada');
        };
        
        btnWhatsapp.onclick = () => {
            const mensaje = `Hola ${producto.vendedor}, estoy interesado en tu producto "${producto.nombre}" (S/ ${producto.precio}) que vi en MiMarket.`;
            window.open(`https://wa.me/${producto.telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
            // Registrar contacto
            registrarContacto(producto.vendedorId, 'whatsapp');
        };
        
        // Mostrar/ocultar botones según preferencias
        btnLlamar.style.display = producto.contactoLlamada ? 'block' : 'none';
        btnWhatsapp.style.display = producto.contactoWhatsapp ? 'block' : 'none';
        
        modal.style.display = "block";
    };

    function registrarContacto(vendedorId, tipo) {
        const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === vendedorId);
        if (vendedorIndex !== -1) {
            vendedoresGlobales[vendedorIndex].contactosRecibidos = 
                (vendedoresGlobales[vendedorIndex].contactosRecibidos || 0) + 1;
            localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
        }
    }

    // ========== FUNCIONES WHATSAPP ==========
    window.contactarWhatsApp = function(telefono, producto, vendedor) {
        const mensaje = `Hola ${vendedor}, estoy interesado en tu producto "${producto}" que vi en MiMarket.`;
        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    // Cerrar modal
    document.querySelector(".close-modal").onclick = function() {
        document.getElementById("modal-contacto").style.display = "none";
    };

    // Cerrar modal al hacer clic fuera
    window.onclick = function(event) {
        const modal = document.getElementById("modal-contacto");
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // ========== PANEL DE ADMINISTRACIÓN MEJORADO ==========
    document.getElementById("btn-login-admin").onclick = function() {
        const usuario = document.getElementById("admin-usuario").value;
        const password = document.getElementById("admin-password").value;
        
        if (usuario === adminConfig.adminUser && password === adminConfig.adminPass) {
            document.getElementById("login-admin").style.display = "none";
            document.getElementById("contenido-admin").style.display = "block";
            cargarDatosAdmin();
        } else {
            alert("Credenciales incorrectas");
        }
    };

    document.getElementById("btn-cerrar-admin").onclick = function() {
        document.getElementById("login-admin").style.display = "block";
        document.getElementById("contenido-admin").style.display = "none";
        document.getElementById("admin-password").value = "";
        sessionStorage.removeItem('adminVisible');
        btnAdmin.style.display = "none";
        btnComprar.click();
    };

    function cargarPanelAdmin() {
        document.getElementById("login-admin").style.display = "block";
        document.getElementById("contenido-admin").style.display = "none";
        document.getElementById("admin-usuario").value = adminConfig.adminUser;
    }

    // ========== FUNCIONES MEJORADAS PARA ADMIN CON SUPABASE ==========
    
    async function cargarDatosAdmin() {
        // Actualizar estado de conexión
        const statusElement = document.getElementById("admin-conexion-status");
        if (statusElement) {
            statusElement.textContent = supabaseConectado ? "✅ Conectado a Supabase" : "⚠️ Modo offline";
            statusElement.className = supabaseConectado ? "status-online" : "status-offline";
        }
        
        // Mostrar datos pendientes de sincronización
        if (datosPendientesSync.length > 0) {
            mostrarNotificacion(`🔄 ${datosPendientesSync.length} datos pendientes de sincronización`);
        }
        
        // Cargar configuración Yape desde Supabase si está disponible
        if (supabaseConectado && db) {
            try {
                const { data, error } = await db
                    .from('configuracion')
                    .select('*');
                
                if (!error && data) {
                    // Actualizar configuración local
                    data.forEach(config => {
                        if (config.clave === 'yape_numero') {
                            adminConfig.yapeNumero = config.valor;
                            document.getElementById("yape-numero").value = config.valor;
                        }
                        if (config.clave === 'yape_qr') {
                            adminConfig.yapeQR = config.valor;
                            document.getElementById("yape-qr").value = config.valor;
                        }
                        if (config.clave === 'precio_publicacion') {
                            adminConfig.precioPublicacion = parseFloat(config.valor);
                        }
                    });
                    localStorage.setItem('adminConfig', JSON.stringify(adminConfig));
                }
            } catch (error) {
                console.error('Error cargando configuración:', error);
            }
        } else {
            // Usar configuración local
            document.getElementById("yape-numero").value = adminConfig.yapeNumero;
            document.getElementById("yape-qr").value = adminConfig.yapeQR || "";
        }
        
        // Cargar estadísticas desde Supabase
        if (supabaseConectado && db) {
            try {
                // Total vendedores
                const { data: vendedoresData, error: errorVendedores } = await db
                    .from('vendedores')
                    .select('id');
                
                // Total productos
                const { data: productosData, error: errorProductos } = await db
                    .from('productos')
                    .select('id');
                
                // Vendedores pendientes
                const { data: pendientesData, error: errorPendientes } = await db
                    .from('vendedores')
                    .select('*')
                    .eq('estado', 'pendiente_pago');
                
                if (!errorVendedores) {
                    document.getElementById("total-vendedores").textContent = vendedoresData.length;
                    // Actualizar vendedores globales desde Supabase
                    const vendedoresSupabase = await obtenerVendedoresSupabase();
                    vendedoresGlobales = [...vendedoresSupabase, ...vendedoresGlobales.filter(v => !v.id_supabase)];
                }
                
                if (!errorProductos) {
                    document.getElementById("total-productos").textContent = productosData.length;
                }
                
                if (!errorPendientes) {
                    const pagosPendientes = pendientesData.length;
                    document.getElementById("pagos-pendientes").textContent = pagosPendientes;
                    
                    // Lista de pagos pendientes
                    const listaPagos = document.getElementById("lista-pagos-pendientes");
                    
                    if (pagosPendientes === 0) {
                        listaPagos.innerHTML = '<p class="mensaje-vacio">No hay pagos pendientes</p>';
                    } else {
                        listaPagos.innerHTML = pendientesData.map(vendedor => `
                            <div class="vendedor-pendiente">
                                <div class="vendedor-info">
                                    <p><strong>${vendedor.nombre}</strong></p>
                                    <p>Código: ${vendedor.codigo_referencia || vendedor.id}</p>
                                    <p>Teléfono: ${vendedor.telefono}</p>
                                    <p>Registrado: ${new Date(vendedor.fecha_registro).toLocaleDateString()}</p>
                                    <p>Email: ${vendedor.email}</p>
                                </div>
                                <div class="vendedor-acciones">
                                    <button onclick="habilitarVendedorAdmin('${vendedor.id}')" class="btn-habilitar">✅ Habilitar</button>
                                    <button onclick="rechazarVendedorAdmin('${vendedor.id}')" class="btn-rechazar">❌ Rechazar</button>
                                </div>
                            </div>
                        `).join('');
                    }
                }
                
            } catch (error) {
                console.error('Error cargando datos admin:', error);
                // Si falla Supabase, usar datos locales
                cargarDatosAdminLocal();
            }
        } else {
            cargarDatosAdminLocal();
        }
        
        // Cargar todos los vendedores
        cargarTodosVendedores();
    }
    
    function cargarDatosAdminLocal() {
        // Estadísticas locales
        const pagosPendientes = vendedoresGlobales.filter(v => v.estado === "pendiente_pago").length;
        document.getElementById("pagos-pendientes").textContent = pagosPendientes;
        document.getElementById("total-vendedores").textContent = vendedoresGlobales.length;
        document.getElementById("total-productos").textContent = productosGlobales.length;
        
        // Lista de pagos pendientes locales
        const listaPagos = document.getElementById("lista-pagos-pendientes");
        const pendientes = vendedoresGlobales.filter(v => v.estado === "pendiente_pago");
        
        if (pendientes.length === 0) {
            listaPagos.innerHTML = '<p class="mensaje-vacio">No hay pagos pendientes</p>';
        } else {
            listaPagos.innerHTML = pendientes.map(vendedor => `
                <div class="vendedor-pendiente">
                    <div class="vendedor-info">
                        <p><strong>${vendedor.nombre}</strong></p>
                        <p>Código: ${vendedor.id}</p>
                        <p>Teléfono: ${vendedor.telefono}</p>
                        <p>Registrado: ${new Date(vendedor.fechaRegistro).toLocaleDateString()}</p>
                    </div>
                    <div class="vendedor-acciones">
                        <button onclick="habilitarVendedor('${vendedor.id}')" class="btn-habilitar">✅ Habilitar</button>
                        <button onclick="rechazarVendedor('${vendedor.id}')" class="btn-rechazar">❌ Rechazar</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async function cargarTodosVendedores() {
        const listaTodos = document.getElementById("lista-todos-vendedores");
        
        if (supabaseConectado && db) {
            try {
                const { data, error } = await db
                    .from('vendedores')
                    .select('*')
                    .order('fecha_registro', { ascending: false });
                
                if (!error && data) {
                    listaTodos.innerHTML = data.map(vendedor => `
                        <div class="producto-card">
                            <p><strong>${vendedor.nombre}</strong> (${vendedor.codigo_referencia || vendedor.id})</p>
                            <p>Estado: ${vendedor.estado === "activo" ? "✅ Activo" : "⏳ Pendiente"}</p>
                            <p>Publicaciones disponibles: ${vendedor.publicaciones_disponibles}</p>
                            <p>Tel: ${vendedor.telefono} | Email: ${vendedor.email}</p>
                            <p>Registrado: ${new Date(vendedor.fecha_registro).toLocaleDateString()}</p>
                            <div class="admin-acciones-vendedor">
                                <button onclick="verProductosVendedor('${vendedor.id}')">📦 Ver Productos</button>
                                <button onclick="editarVendedorAdmin('${vendedor.id}')">✏️ Editar</button>
                            </div>
                        </div>
                    `).join('');
                    return;
                }
            } catch (error) {
                console.error('Error cargando vendedores:', error);
            }
        }
        
        // Fallback a datos locales
        listaTodos.innerHTML = vendedoresGlobales.map(vendedor => `
            <div class="producto-card">
                <p><strong>${vendedor.nombre}</strong> (${vendedor.id})</p>
                <p>Estado: ${vendedor.estado === "activo" ? "✅ Activo" : "⏳ Pendiente"}</p>
                <p>Productos: ${vendedor.productos.length} | Contactos: ${vendedor.contactosRecibidos || 0}</p>
                <p>Tel: ${vendedor.telefono} | Email: ${vendedor.email}</p>
            </div>
        `).join('');
    }

    // Habilitar vendedor (con Supabase)
    window.habilitarVendedorAdmin = async function(vendedorIdSupabase) {
        const comprobante = document.getElementById("comprobante-pago").value;
        if (!comprobante) {
            alert("Ingresa el número de comprobante de pago");
            return;
        }
        
        if (supabaseConectado && db) {
            try {
                // Actualizar en Supabase
                const { error } = await db
                    .from('vendedores')
                    .update({ 
                        estado: 'activo',
                        publicaciones_disponibles: 5
                    })
                    .eq('id', vendedorIdSupabase);
                
                if (error) throw error;
                
                // Registrar log
                await db.from('logs_admin').insert([{
                    accion: 'habilitar_vendedor',
                    detalles: {
                        vendedor_id: vendedorIdSupabase,
                        comprobante: comprobante,
                        publicaciones_otorgadas: 5
                    },
                    usuario: 'admin'
                }]);
                
                mostrarNotificacion(`✅ Vendedor habilitado en Supabase`);
                
            } catch (error) {
                console.error('Error habilitando vendedor:', error);
                alert("Error al habilitar en Supabase. Intentando modo local...");
                // Fallback a modo local
                habilitarVendedor(vendedorIdSupabase);
            }
        } else {
            // Modo local
            habilitarVendedor(vendedorIdSupabase);
        }
        
        cargarDatosAdmin();
    };
    
    // Rechazar vendedor (con Supabase)
    window.rechazarVendedorAdmin = async function(vendedorIdSupabase) {
        if (!confirm("¿Estás seguro de rechazar este vendedor?")) return;
        
        if (supabaseConectado && db) {
            try {
                const { error } = await db
                    .from('vendedores')
                    .update({ estado: 'rechazado' })
                    .eq('id', vendedorIdSupabase);
                
                if (error) throw error;
                
                await db.from('logs_admin').insert([{
                    accion: 'rechazar_vendedor',
                    detalles: { vendedor_id: vendedorIdSupabase },
                    usuario: 'admin'
                }]);
                
                mostrarNotificacion("✅ Vendedor rechazado en Supabase");
                
            } catch (error) {
                console.error('Error rechazando vendedor:', error);
                rechazarVendedor(vendedorIdSupabase);
            }
        } else {
            rechazarVendedor(vendedorIdSupabase);
        }
        
        cargarDatosAdmin();
    };
    
    // Guardar configuración Yape (con Supabase)
    document.getElementById("btn-guardar-yape").onclick = async function() {
        const nuevoNumero = document.getElementById("yape-numero").value;
        const nuevoQR = document.getElementById("yape-qr").value;
        
        // Actualizar local
        adminConfig.yapeNumero = nuevoNumero;
        adminConfig.yapeQR = nuevoQR;
        localStorage.setItem('adminConfig', JSON.stringify(adminConfig));
        
        // Guardar en Supabase si está disponible
        if (supabaseConectado && db) {
            try {
                // Actualizar o insertar configuración
                const { error } = await db
                    .from('configuracion')
                    .upsert([
                        { clave: 'yape_numero', valor: nuevoNumero, descripcion: 'Número de Yape para pagos' },
                        { clave: 'yape_qr', valor: nuevoQR, descripcion: 'Código QR de Yape' }
                    ]);
                
                if (error) throw error;
                
                await db.from('logs_admin').insert([{
                    accion: 'actualizar_config_yape',
                    detalles: { nuevo_numero: nuevoNumero },
                    usuario: 'admin'
                }]);
                
                mostrarNotificacion("✅ Configuración de Yape guardada en la nube");
                return;
                
            } catch (error) {
                console.error('Error guardando en Supabase:', error);
            }
        }
        
        mostrarNotificacion("✅ Configuración de Yape guardada localmente");
    };
    
    // Ver productos de un vendedor
    window.verProductosVendedor = async function(vendedorId) {
        let productos = [];
        
        if (supabaseConectado && db) {
            try {
                const { data, error } = await db
                    .from('productos')
                    .select('*')
                    .eq('vendedor_id', vendedorId)
                    .order('fecha_publicacion', { ascending: false });
                
                if (!error && data) {
                    productos = data;
                }
            } catch (error) {
                console.error('Error cargando productos:', error);
            }
        } else {
            // Buscar en productos globales
            productos = productosGlobales.filter(p => p.vendedorId === vendedorId);
        }
        
        if (productos.length === 0) {
            alert("Este vendedor no tiene productos publicados");
            return;
        }
        
        let mensaje = `📦 Productos del vendedor:\n\n`;
        productos.forEach((prod, index) => {
            mensaje += `${index + 1}. ${prod.nombre}\n`;
            mensaje += `   Precio: S/ ${prod.precio}\n`;
            mensaje += `   Estado: ${prod.estado || prod.estado_producto}\n`;
            mensaje += `   Publicado: ${new Date(prod.fechaPublicacion || prod.fecha_publicacion).toLocaleDateString()}\n\n`;
        });
        
        alert(mensaje);
    };
    
    // Editar vendedor (modal)
    window.editarVendedorAdmin = async function(vendedorId) {
        let vendedor = null;
        
        if (supabaseConectado && db) {
            try {
                const { data, error } = await db
                    .from('vendedores')
                    .select('*')
                    .eq('id', vendedorId)
                    .single();
                
                if (!error && data) {
                    vendedor = data;
                }
            } catch (error) {
                console.error('Error cargando vendedor:', error);
            }
        }
        
        if (!vendedor) {
            vendedor = vendedoresGlobales.find(v => v.id === vendedorId);
        }
        
        if (!vendedor) {
            alert("Vendedor no encontrado");
            return;
        }
        
        const nuevoNombre = prompt("Nuevo nombre:", vendedor.nombre);
        const nuevoTelefono = prompt("Nuevo teléfono:", vendedor.telefono);
        const nuevoEmail = prompt("Nuevo email:", vendedor.email);
        const nuevasPublicaciones = prompt("Publicaciones disponibles:", vendedor.publicaciones_disponibles || vendedor.publicacionesDisponibles);
        
        if (nuevoNombre && nuevoTelefono && nuevoEmail && nuevasPublicaciones) {
            const cambios = {
                nombre: nuevoNombre,
                telefono: nuevoTelefono,
                email: nuevoEmail,
                publicaciones_disponibles: parseInt(nuevasPublicaciones)
            };
            
            if (supabaseConectado && db) {
                try {
                    const { error } = await db
                        .from('vendedores')
                        .update(cambios)
                        .eq('id', vendedorId);
                    
                    if (error) throw error;
                    
                    mostrarNotificacion("✅ Vendedor actualizado en Supabase");
                    
                } catch (error) {
                    console.error('Error actualizando:', error);
                    mostrarNotificacion("✅ Vendedor actualizado localmente");
                }
            }
            
            cargarDatosAdmin();
        }
    };

    window.habilitarVendedor = function(vendedorId) {
        const comprobante = document.getElementById("comprobante-pago").value;
        if (!comprobante) {
            alert("Ingresa el número de comprobante de pago");
            return;
        }
        
        const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === vendedorId);
        if (vendedorIndex !== -1) {
            vendedoresGlobales[vendedorIndex].estado = "activo";
            vendedoresGlobales[vendedorIndex].publicacionesDisponibles = 5; // Dar 5 publicaciones
            vendedoresGlobales[vendedorIndex].pagos.push({
                fecha: new Date().toISOString(),
                monto: 5,
                comprobante: comprobante
            });
            
            localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
            
            // Actualizar vendedor local si es el mismo
            const vendedorLocal = JSON.parse(localStorage.getItem("vendedor"));
            if (vendedorLocal && vendedorLocal.id === vendedorId) {
                vendedorLocal.estado = "activo";
                vendedorLocal.publicacionesDisponibles = 5;
                localStorage.setItem("vendedor", JSON.stringify(vendedorLocal));
            }
            
            mostrarNotificacion(`✅ Vendedor ${vendedoresGlobales[vendedorIndex].nombre} habilitado con éxito`);
            cargarDatosAdmin();
        }
    };

    window.rechazarVendedor = function(vendedorId) {
        if (!confirm("¿Estás seguro de rechazar este vendedor?")) return;
        
        const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === vendedorId);
        if (vendedorIndex !== -1) {
            vendedoresGlobales[vendedorIndex].estado = "rechazado";
            localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
            cargarDatosAdmin();
        }
    };

    // Habilitar vendedor desde panel
    document.getElementById("btn-habilitar-pago").onclick = function() {
        const codigo = document.getElementById("codigo-vendedor").value;
        const comprobante = document.getElementById("comprobante-pago").value;
        
        if (!codigo || !comprobante) {
            alert("Debes ingresar el código del vendedor y el comprobante");
            return;
        }
        
        habilitarVendedor(codigo);
        document.getElementById("codigo-vendedor").value = "";
        document.getElementById("comprobante-pago").value = "";
    };

    // ========== FUNCIONES PARA EDITAR/ELIMINAR PRODUCTOS ==========
    window.editarProducto = function(id) {
        const producto = productosGlobales.find(p => p.id === id);
        if (!producto) return;
        
        // Cargar datos en el formulario
        document.getElementById("prod-nombre").value = producto.nombre;
        document.getElementById("prod-precio").value = producto.precio;
        document.getElementById("prod-categoria").value = producto.categoria;
        document.getElementById("prod-descripcion").value = producto.descripcion || '';
        document.getElementById("prod-estado").value = producto.estado;
        
        // Cargar fotos existentes
        fotosTemporales = producto.fotos ? producto.fotos.map((foto, index) => ({
            nombre: `Foto ${index + 1}`,
            data: foto
        })) : [];
        actualizarPreviewFotos();
        
        // Mostrar formulario con mensaje diferente
        document.querySelector("#formulario-producto h3").textContent = "✏️ Editar Producto";
        document.querySelector("#formulario-producto button[type='submit']").textContent = "💾 Guardar Cambios";
        
        // Guardar el ID del producto a editar
        document.getElementById("form-producto").dataset.editingId = id;
        
        formularioProducto.style.display = "block";
    };

    window.eliminarProducto = function(id) {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;
        
        const vendedor = JSON.parse(localStorage.getItem("vendedor"));
        
        if (vendedor) {
            // Eliminar de productos del vendedor
            vendedor.productos = vendedor.productos.filter(p => p !== id);
            localStorage.setItem("vendedor", JSON.stringify(vendedor));
        }
        
        // Eliminar de productos globales
        productosGlobales = productosGlobales.filter(p => p.id !== id);
        localStorage.setItem('productosGlobales', JSON.stringify(productosGlobales));
        
        // Actualizar vendedores globales
        const vendedorIndex = vendedoresGlobales.findIndex(v => v.id === vendedor.id);
        if (vendedorIndex !== -1) {
            vendedoresGlobales[vendedorIndex].productos = vendedoresGlobales[vendedorIndex].productos.filter(p => p !== id);
            localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
        }
        
        // Actualizar vista
        mostrarPerfil();
        mostrarNotificacion("✅ Producto eliminado exitosamente");
    };

    // ========== FUNCIONES AUXILIARES MEJORADAS ==========
    function activarBoton(botonActivo, ...botonesInactivos) {
        botonActivo.classList.add("btn-activo");
        botonesInactivos.forEach(boton => boton.classList.remove("btn-activo"));
    }

    function mostrarSeccion(elemento) {
        elemento.style.display = "block";
    }

    function ocultarSeccion(elemento) {
        elemento.style.display = "none";
    }
    
    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.innerHTML = `
            <div class="notificacion-contenido">
                <span class="notificacion-texto">${mensaje}</span>
                <button class="notificacion-cerrar" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Estilos para la notificación
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'success' ? '#48bb78' : '#f56565'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notificacion);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notificacion.parentNode) {
                        notificacion.parentNode.removeChild(notificacion);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Agregar estilos CSS para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .notificacion-contenido {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .notificacion-cerrar {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
        }
    `;
    document.head.appendChild(style);

    // ========== SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA ==========
    
    // Detectar cambios en la conexión
    window.addEventListener('online', () => {
        console.log('🌐 Conexión a internet restaurada');
        mostrarNotificacion('🌐 Conexión restaurada - Sincronizando datos...');
        
        // Intentar sincronizar datos pendientes
        setTimeout(() => {
            sincronizarDatosPendientes();
        }, 2000);
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Sin conexión a internet');
        mostrarNotificacion('📴 Modo offline - Los datos se guardarán localmente', 'warning');
    });
    
    // Sincronizar automáticamente cada 5 minutos si hay datos pendientes
    setInterval(() => {
        if (datosPendientesSync.length > 0 && supabaseConectado) {
            console.log('🔄 Sincronización automática programada...');
            sincronizarDatosPendientes();
        }
    }, 5 * 60 * 1000); // 5 minutos

    // ========== INICIALIZACIÓN MEJORADA ==========
    cargarResultados();
    
    // Verificar conexión Supabase al iniciar
    if (supabaseConectado) {
        console.log('🚀 App funcionando con Supabase + LocalStorage');
        
        // Intentar sincronizar datos pendientes al iniciar
        setTimeout(() => {
            if (datosPendientesSync.length > 0) {
                console.log(`📦 Sincronizando ${datosPendientesSync.length} datos pendientes al inicio...`);
                sincronizarDatosPendientes();
            }
            
            // Cargar vendedores desde Supabase
            setTimeout(async () => {
                try {
                    const vendedoresSupabase = await obtenerVendedoresSupabase();
                    if (vendedoresSupabase.length > 0) {
                        vendedoresGlobales = [...vendedoresSupabase, ...vendedoresGlobales.filter(v => !v.id_supabase)];
                        localStorage.setItem('vendedoresGlobales', JSON.stringify(vendedoresGlobales));
                        console.log(`✅ Cargados ${vendedoresSupabase.length} vendedores desde Supabase`);
                    }
                } catch (error) {
                    console.error('Error cargando vendedores iniciales:', error);
                }
            }, 3000);
        }, 2000);
    } else {
        console.log('📱 App funcionando solo con LocalStorage (offline mode)');
    }
    
    // Mostrar estado de conexión
    setTimeout(() => {
        const estadoConexion = document.createElement('div');
        estadoConexion.id = 'estado-conexion';
        estadoConexion.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: ${supabaseConectado ? '#48bb78' : '#f56565'};
            color: white;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 12px;
            z-index: 9998;
        `;
        estadoConexion.textContent = supabaseConectado ? '☁️ En línea' : '📴 Offline';
        document.body.appendChild(estadoConexion);
        
        // Actualizar estado dinámicamente
        window.addEventListener('online', () => {
            estadoConexion.textContent = '☁️ En línea';
            estadoConexion.style.background = '#48bb78';
        });
        
        window.addEventListener('offline', () => {
            estadoConexion.textContent = '📴 Offline';
            estadoConexion.style.background = '#f56565';
        });
    }, 1000);
});


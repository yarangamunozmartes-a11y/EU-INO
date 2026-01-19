// ========== INSTALACIÓN PWA ==========

// Variable para almacenar el evento de instalación diferido
let deferredPrompt;
let installButton = document.getElementById('installButton');
let cancelInstallButton = document.getElementById('cancelInstall');
let installPrompt = document.getElementById('installPrompt');

// ========== REGISTRAR SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                scope: './'
            });
            
            console.log('✅ Service Worker registrado correctamente:', registration.scope);
            
            // Verificar si hay actualizaciones
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nueva versión del Service Worker encontrada:', newWorker);
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('📦 Nueva versión lista para instalar');
                        mostrarActualizacionDisponible();
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
        }
    });
}

// ========== DETECTAR EVENTO DE INSTALACIÓN ==========
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 Evento beforeinstallprompt activado');
    
    // Prevenir que el navegador muestre el prompt automático
    e.preventDefault();
    
    // Guardar el evento para usarlo después
    deferredPrompt = e;
    
    // Mostrar el botón de instalación
    if (installPrompt) {
        installPrompt.classList.remove('hidden');
        console.log('✅ Mostrando prompt de instalación');
    }
    
    // Configurar botón de instalación
    if (installButton) {
        installButton.addEventListener('click', instalarPWA);
    }
    
    // Configurar botón de cancelar
    if (cancelInstallButton) {
        cancelInstallButton.addEventListener('click', () => {
            installPrompt.classList.add('hidden');
            console.log('❌ Instalación cancelada por el usuario');
        });
    }
});

// ========== FUNCIÓN PARA INSTALAR PWA ==========
async function instalarPWA() {
    if (!deferredPrompt) {
        console.log('❌ No hay prompt de instalación disponible');
        return;
    }
    
    try {
        // Mostrar el prompt de instalación
        deferredPrompt.prompt();
        console.log('📱 Mostrando prompt de instalación nativo');
        
        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✅ PWA instalada por el usuario');
            mostrarMensajeInstalacionExitosa();
            
            // Ocultar el prompt
            if (installPrompt) {
                installPrompt.classList.add('hidden');
            }
        } else {
            console.log('❌ El usuario canceló la instalación');
        }
        
        // Limpiar la referencia
        deferredPrompt = null;
        
    } catch (error) {
        console.error('❌ Error durante la instalación:', error);
    }
}

// ========== DETECTAR CUANDO LA PWA YA ESTÁ INSTALADA ==========
window.addEventListener('appinstalled', (e) => {
    console.log('🎉 PWA instalada exitosamente');
    
    // Ocultar el prompt si aún está visible
    if (installPrompt) {
        installPrompt.classList.add('hidden');
    }
    
    // Guardar en localStorage que la app está instalada
    localStorage.setItem('pwa_installed', 'true');
    
    // Mostrar mensaje de bienvenida
    mostrarMensajeBienvenidaInstalada();
    
    // Actualizar interfaz para modo instalado
    actualizarInterfazParaPWA();
});

// ========== VERIFICAR SI LA PWA YA ESTÁ INSTALADA ==========
function verificarSiPWAInstalada() {
    // Método 1: display-mode standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Método 2: navigator.standalone (iOS)
    const isIOSStandalone = window.navigator.standalone === true;
    
    // Método 3: revisar si se inició desde la pantalla de inicio
    const isInStandaloneMode = () => {
        return (window.matchMedia('(display-mode: standalone)').matches) ||
               (window.navigator.standalone) ||
               document.referrer.includes('android-app://');
    };
    
    const instalada = isStandalone || isIOSStandalone || isInStandaloneMode();
    
    if (instalada) {
        console.log('📱 PWA ya está instalada');
        localStorage.setItem('pwa_installed', 'true');
        actualizarInterfazParaPWA();
    }
    
    return instalada;
}

// ========== ACTUALIZAR INTERFAZ PARA MODO PWA ==========
function actualizarInterfazParaPWA() {
    // Agregar clase al body para estilos específicos
    document.body.classList.add('pwa-installed');
    
    // Ocultar el prompt de instalación
    if (installPrompt) {
        installPrompt.classList.add('hidden');
    }
    
    // Ajustar padding para la barra de estado en iOS
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        const app = document.getElementById('app');
        if (app) {
            app.style.paddingTop = 'env(safe-area-inset-top)';
        }
        
        const topBar = document.querySelector('.top-bar');
        if (topBar) {
            topBar.style.paddingTop = 'calc(15px + env(safe-area-inset-top))';
        }
    }
}

// ========== MOSTRAR ACTUALIZACIÓN DISPONIBLE ==========
function mostrarActualizacionDisponible() {
    // Puedes implementar un banner para actualizar la app
    const updateBanner = document.createElement('div');
    updateBanner.id = 'updateBanner';
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
        <div class="update-content">
            <p>🔄 Nueva versión disponible</p>
            <button id="updateButton" class="btn-update">Actualizar ahora</button>
            <button id="closeUpdate" class="btn-update-secondary">Después</button>
        </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    document.getElementById('updateButton').addEventListener('click', () => {
        window.location.reload();
    });
    
    document.getElementById('closeUpdate').addEventListener('click', () => {
        updateBanner.remove();
    });
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        if (updateBanner.parentNode) {
            updateBanner.remove();
        }
    }, 10000);
}

// ========== MENSAJES DE FEEDBACK ==========
function mostrarMensajeInstalacionExitosa() {
    const mensaje = document.createElement('div');
    mensaje.className = 'mensaje-flotante mensaje-exito';
    mensaje.innerHTML = `
        <p>✅ ¡MiMarket instalado correctamente!</p>
        <p>Ahora puedes acceder desde tu pantalla de inicio.</p>
    `;
    
    document.body.appendChild(mensaje);
    
    setTimeout(() => {
        mensaje.classList.add('mostrando');
    }, 100);
    
    setTimeout(() => {
        mensaje.classList.remove('mostrando');
        setTimeout(() => mensaje.remove(), 300);
    }, 4000);
}

function mostrarMensajeBienvenidaInstalada() {
    // Mostrar mensaje de bienvenida solo la primera vez
    if (!localStorage.getItem('pwa_welcome_shown')) {
        setTimeout(() => {
            alert('🎉 ¡Bienvenido a MiMarket instalado!\n\nAhora puedes usar la aplicación sin conexión a internet.');
            localStorage.setItem('pwa_welcome_shown', 'true');
        }, 1000);
    }
}

// ========== FUNCIONES DE UTILIDAD ==========
function esDispositivoMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function esIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function esAndroid() {
    return /Android/i.test(navigator.userAgent);
}

// ========== DETECTAR CONEXIÓN ==========
function verificarConexion() {
    const estadoConexion = document.createElement('div');
    estadoConexion.id = 'estado-conexion';
    estadoConexion.className = 'estado-conexion desconectado';
    estadoConexion.innerHTML = '🌐 Sin conexión - Modo offline';
    
    document.body.appendChild(estadoConexion);
    
    function actualizarEstadoConexion() {
        if (navigator.onLine) {
            estadoConexion.className = 'estado-conexion conectado';
            estadoConexion.innerHTML = '✅ Conectado';
            
            setTimeout(() => {
                estadoConexion.classList.add('ocultando');
                setTimeout(() => estadoConexion.remove(), 300);
            }, 3000);
        } else {
            estadoConexion.className = 'estado-conexion desconectado';
            estadoConexion.innerHTML = '🌐 Sin conexión - Modo offline';
            
            if (!estadoConexion.parentNode) {
                document.body.appendChild(estadoConexion);
            }
        }
    }
    
    window.addEventListener('online', actualizarEstadoConexion);
    window.addEventListener('offline', actualizarEstadoConexion);
    
    // Verificar estado inicial
    actualizarEstadoConexion();
}

// ========== INICIALIZAR ==========
function inicializarInstalacion() {
    console.log('🔧 Inicializando sistema de instalación PWA');
    
    // Verificar si ya está instalada
    verificarSiPWAInstalada();
    
    // Configurar detección de conexión
    verificarConexion();
    
    // Solo mostrar prompt en dispositivos móviles
    if (!esDispositivoMovil()) {
        console.log('🖥️ Dispositivo de escritorio, ocultando prompt de instalación');
        if (installPrompt) {
            installPrompt.style.display = 'none';
        }
    }
    
    // Agregar estilos dinámicos
    agregarEstilosDinamicos();
}

// ========== ESTILOS DINÁMICOS ==========
function agregarEstilosDinamicos() {
    const estilos = document.createElement('style');
    estilos.textContent = `
        .mensaje-flotante {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            max-width: 300px;
        }
        
        .mensaje-flotante.mostrando {
            transform: translateX(0);
        }
        
        .mensaje-exito {
            border-left: 4px solid #48bb78;
        }
        
        .update-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #667eea, #764ba2);
            color: white;
            padding: 15px;
            z-index: 10000;
            text-align: center;
        }
        
        .update-content {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .btn-update {
            background: white;
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
        }
        
        .btn-update-secondary {
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
        }
        
        .estado-conexion {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 9999;
            transition: all 0.3s ease;
        }
        
        .estado-conexion.conectado {
            background: #48bb78;
            color: white;
        }
        
        .estado-conexion.desconectado {
            background: #fc8181;
            color: white;
        }
        
        .estado-conexion.ocultando {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        
        /* Estilos para modo PWA instalado */
        body.pwa-installed header {
            padding-top: env(safe-area-inset-top);
        }
        
        @media (display-mode: standalone) {
            body {
                -webkit-tap-highlight-color: transparent;
            }
            
            button, a {
                -webkit-tap-highlight-color: rgba(0,0,0,0.1);
            }
        }
    `;
    
    document.head.appendChild(estilos);
}

// ========== EJECUTAR AL CARGAR ==========
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un momento para que todo cargue
    setTimeout(() => {
        inicializarInstalacion();
    }, 1000);
});

// ========== EXPORTAR FUNCIONES ==========
window.instalarPWA = instalarPWA;
window.verificarSiPWAInstalada = verificarSiPWAInstalada;

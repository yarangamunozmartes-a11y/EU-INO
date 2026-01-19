// Detectar si es instalable
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Service Worker error:', error);
            });
    });
}

// Manejar instalación PWA
let deferredPrompt;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', installApp);
    }
});

async function installApp() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('Usuario aceptó la instalación');
        if (installButton) installButton.style.display = 'none';
    }
    
    deferredPrompt = null;
}

// Verificar si ya está instalada
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

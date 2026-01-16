// Detectar si la PWA ya está instalada
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Mostrar/ocultar botón de instalación
function updateInstallButton() {
  const installBtn = document.getElementById('install-btn');
  if (!installBtn) return;
  
  if (isPWAInstalled()) {
    installBtn.style.display = 'none';
  }
}

// Ejecutar al cargar
window.addEventListener('load', () => {
  updateInstallButton();
});
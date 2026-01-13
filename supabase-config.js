// supabase-config.js
// CONFIGURACIÓN GLOBAL DE TU PWA

window.SUPABASE_CONFIG = {
  url: 'https://vxzvnquhuebakzscfjvg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4enZucXVodWViYWt6c2NmanZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzU2NjksImV4cCI6MjA4Mzg1MTY2OX0.YFQj-JCCnz8Q5oE4ajBbf9jEBu4h1fyjRXloX4SRZ2A'
};

// Inicializar Supabase automáticamente
document.addEventListener('DOMContentLoaded', function() {
  if (window.supabase) {
    window.db = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    console.log('✅ Supabase inicializado');
  }
});
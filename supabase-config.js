// supabase-config.js - Versión mejorada
const SUPABASE_CONFIG = {
  url: 'https://vxzvnquhuebakzscfjvg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4enZucXVodWViYWt6c2NmanZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzU2NjksImV4cCI6MjA4Mzg1MTY2OX0.YFQj-JCCnz8Q5oE4ajBbf9jEBu4h1fyjRXloX4SRZ2A',
  tables: {
    vendedores: 'vendedores',
    productos: 'productos',
    configuracion: 'configuracion',
    logs_admin: 'logs_admin'
  },
  storage: {
    bucket: 'productos-fotos'
  }
};

// Función para verificar conexión
async function checkSupabaseConnection() {
  try {
    if (!window.supabase) {
      console.warn('⚠️ Supabase no está disponible');
      return false;
    }
    
    const client = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    
    // Verificar conexión
    const { data, error } = await client.from('productos').select('count').limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase conectado correctamente');
    return client;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    return false;
  }
}

// Exportar configuración
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.checkSupabaseConnection = checkSupabaseConnection;

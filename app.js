const SUPABASE_URL = 'https://vxzvnquhuebakzscfjvg.supabase.co';
const SUPABASE_KEY = 'TU_KEY_AQUI'; // Usa la que tenías
let db = null;
let fotosTemporales = [];

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

async function inicializarApp() {
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    // Splash logic
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        const vendedor = JSON.parse(localStorage.getItem('vendedor'));
        if (vendedor) mostrarPerfilVendedor();
        else mostrarModoComprador();
    }, 1500);

    configurarEventListeners();
}

function configurarEventListeners() {
    document.getElementById('btn-comprar').onclick = mostrarModoComprador;
    document.getElementById('btn-vender').onclick = mostrarModoVendedor;
    document.getElementById('form-busqueda').onsubmit = buscarProductos;
    document.getElementById('form-vendedor').onsubmit = registrarVendedor;
    document.getElementById('form-producto').onsubmit = publicarProducto;
    document.getElementById('btn-cancelar').onclick = () => document.getElementById('formulario-producto').style.display = 'none';
    document.getElementById('btn-nuevo-producto').onclick = () => document.getElementById('formulario-producto').style.display = 'block';
    document.getElementById('btn-saltar-video').onclick = () => {
        ocultarSecciones(['video-tutorial']);
        mostrarSeccion('registro-vendedor');
    };

    // Cerrar Modal
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('modal-contacto').style.display = 'none';
    };

    configurarUploadFotos();
}

// --- LÓGICA DE BÚSQUEDA Y DETALLES ---

async function buscarProductos(e) {
    e.preventDefault();
    const busqueda = document.getElementById('buscar-producto').value.toLowerCase();
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    
    const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(busqueda) || 
        p.descripcion.toLowerCase().includes(busqueda)
    );
    
    renderizarResultados(filtrados);
}

function renderizarResultados(productos) {
    const lista = document.getElementById('lista-resultados');
    lista.innerHTML = productos.map(p => `
        <div class="producto-card" onclick="mostrarDetalleProducto('${p.id}')">
            <img src="${p.fotos[0] || 'placeholder.jpg'}" class="img-grid">
            <h4>${p.nombre}</h4>
            <p class="precio">S/ ${p.precio}</p>
        </div>
    `).join('');
    document.getElementById('mensaje-vacio').style.display = productos.length ? 'none' : 'block';
}

window.mostrarDetalleProducto = function(id) {
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    const p = productos.find(item => item.id === id);
    if(!p) return;

    document.getElementById('modal-producto-nombre').textContent = p.nombre;
    document.getElementById('modal-producto-precio').textContent = `S/ ${p.precio}`;
    document.getElementById('modal-producto-descripcion').textContent = p.descripcion;
    document.getElementById('modal-vendedor-nombre').textContent = p.vendedor_nombre || 'Usuario';
    
    // Botones contacto
    document.getElementById('btn-llamar').onclick = () => window.location.href = `tel:${p.telefono}`;
    document.getElementById('btn-whatsapp').onclick = () => {
        const msg = encodeURIComponent(`Hola, me interesa tu producto: ${p.nombre}`);
        window.open(`https://wa.me/51${p.telefono}?text=${msg}`);
    };

    document.getElementById('modal-contacto').style.display = 'block';
}

// --- GESTIÓN VENDEDOR ---

function registrarVendedor(e) {
    e.preventDefault();
    const vendedor = {
        id: 'V' + Date.now(),
        nombre: document.getElementById('nombre').value,
        telefono: document.getElementById('telefono').value,
        provincia: document.getElementById('provincia-vendedor').value,
        distrito: document.getElementById('distrito-vendedor').value,
        publicacionesDisponibles: 1
    };
    localStorage.setItem('vendedor', JSON.stringify(vendedor));
    mostrarPerfilVendedor();
}

function mostrarPerfilVendedor() {
    const v = JSON.parse(localStorage.getItem('vendedor'));
    ocultarSecciones(['busqueda', 'resultados', 'video-tutorial', 'registro-vendedor']);
    mostrarSeccion('perfil-vendedor');
    
    document.getElementById('perfil-nombre').textContent = v.nombre;
    document.getElementById('contador-publicaciones').textContent = v.publicacionesDisponibles;
    renderizarProductosPropios(v.id);
}

function publicarProducto(e) {
    e.preventDefault();
    const v = JSON.parse(localStorage.getItem('vendedor'));
    
    const nuevoProd = {
        id: 'P' + Date.now(),
        vendedor_id: v.id,
        vendedor_nombre: v.nombre,
        telefono: v.telefono,
        nombre: document.getElementById('prod-nombre').value,
        precio: document.getElementById('prod-precio').value,
        descripcion: document.getElementById('prod-descripcion').value,
        fotos: fotosTemporales
    };

    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    productos.push(nuevoProd);
    localStorage.setItem('productos', JSON.stringify(productos));
    
    v.publicacionesDisponibles--;
    localStorage.setItem('vendedor', JSON.stringify(v));
    
    fotosTemporales = [];
    document.getElementById('form-producto').reset();
    document.getElementById('formulario-producto').style.display = 'none';
    mostrarPerfilVendedor();
}

// --- HELPERS ---

function configurarUploadFotos() {
    const input = document.getElementById('fotos-producto');
    document.getElementById('upload-area').onclick = () => input.click();
    
    input.onchange = (e) => {
        const files = Array.from(e.target.files).slice(0, 2);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                fotosTemporales.push(ev.target.result);
                document.getElementById('preview-fotos').innerHTML += `<img src="${ev.target.result}" width="50">`;
            };
            reader.readAsDataURL(file);
        });
    };
}

function mostrarSeccion(id) { document.getElementById(id).style.display = 'block'; }
function ocultarSecciones(ids) { ids.forEach(id => document.getElementById(id).style.display = 'none'); }
function mostrarModoComprador() {
    ocultarSecciones(['perfil-vendedor', 'registro-vendedor', 'video-tutorial']);
    mostrarSeccion('busqueda');
    mostrarSeccion('resultados');
    renderizarResultados(JSON.parse(localStorage.getItem('productos')) || []);
}
function mostrarModoVendedor() {
    const v = localStorage.getItem('vendedor');
    if (v) mostrarPerfilVendedor();
    else {
        ocultarSecciones(['busqueda', 'resultados']);
        mostrarSeccion('video-tutorial');
    }
}

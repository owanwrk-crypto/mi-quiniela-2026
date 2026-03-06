const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';

// 1. CARGAR CARTELERA DE INICIO (PÚBLICA)
async function loadPreview() {
    const container = document.getElementById('preview-list');
    try {
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha, hora') 
            .order('fecha', { ascending: true })
            .limit(6);

        if (error) throw error;
        if (!matches || matches.length === 0) {
            container.innerHTML = "📭 No hay partidos programados.";
            return;
        }

        container.innerHTML = '';
        matches.forEach(m => {
            const d = new Date(m.fecha + "T12:00:00");
            const fechaTxt = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
            const horaTxt = m.hora || "TBD";

            container.innerHTML += `
                <div class="fifa-match-row">
                    <div class="fifa-date">${fechaTxt}</div>
                    <div class="fifa-time">${horaTxt}</div>
                    <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
                </div>`;
        });
    } catch (err) {
        console.error("Error en Preview:", err);
        container.innerHTML = `<div style="color:red">Error de conexión</div>`;
    }
}

// 2. LOGICA DE LOGIN
async function handleLogin() {
    const nameInput = document.getElementById('login-name');
    const pinInput = document.getElementById('login-pin');
    const name = nameInput.value.toLowerCase().trim();
    const pin = pinInput.value;

    if (!name || !pin) return alert("Ingresa usuario y PIN");

    const { data, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

    if (data) {
        window.currentUser = data; 
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerText = "JUGADOR: " + data.nombre.toUpperCase();
        showTab('Grupos'); 
    } else {
        alert("Usuario o PIN incorrectos");
    }
}

// 3. NAVEGACIÓN DE PESTAÑAS
function showTab(fase) {
    current
const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

async function loadPreview() {
    const { data: matches, error } = await _sb.from('partidos').select('*').order('fecha', {ascending: true}).limit(5);
    const container = document.getElementById('preview-list');
    
    if (error || !matches) {
        container.innerHTML = "Error de conexión";
        return;
    }

    container.innerHTML = '';
    matches.forEach(m => {
        const d = new Date(m.fecha);
        container.innerHTML += `
            <div class="fifa-match-row">
                <div class="fifa-date">${d.toLocaleDateString('es-ES', {day:'2-digit', month:'short'})}</div>
                <div class="fifa-time">${d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</div>
                <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
            </div>
        `;
    });
}

async function handleLogin() {
    const name = document.getElementById('login-name').value.toLowerCase().trim();
    const pin = document.getElementById('login-pin').value;

    const { data, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

    if (data) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerText = "JUGADOR: " + data.nombre.toUpperCase();
        // Aquí podrías llamar a una función para cargar los partidos del usuario
    } else {
        alert("Acceso denegado");
    }
}

// Ejecutar al cargar
loadPreview();
const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

async function loadPreview() {
    const container = document.getElementById('preview-list');
    console.log("Iniciando carga de partidos...");

    try {
        // Intentamos traer los datos
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha')
            .order('fecha', { ascending: true })
            .limit(6);

        if (error) {
            console.error("Error de Supabase:", error);
            container.innerHTML = `<div style="color:#ff4444; font-size:12px;">❌ Error: ${error.message}</div>`;
            return;
        }

        if (!matches || matches.length === 0) {
            console.warn("La tabla está vacía");
            container.innerHTML = "📭 No hay partidos programados.";
            return;
        }

        // Si hay datos, limpiamos y llenamos
        container.innerHTML = '';
        matches.forEach(m => {
            const d = new Date(m.fecha);
            const fechaTxt = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
            const horaTxt = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            container.innerHTML += `
                <div class="fifa-match-row">
                    <div class="fifa-date">${fechaTxt}</div>
                    <div class="fifa-time">${horaTxt}</div>
                    <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
                </div>
            `;
        });
        console.log("Partidos cargados correctamente:", matches);

    } catch (err) {
        console.error("Error inesperado:", err);
        container.innerHTML = `<div style="color:red">Error fatal al cargar</div>`;
    }
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
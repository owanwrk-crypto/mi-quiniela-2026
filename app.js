const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
// Asegúrate de tener tus constantes URL_SB y KEY_SB definidas arriba
// Asegúrate de tener tus constantes URL_SB y KEY_SB definidas arriba
const _sb = supabase.createClient(URL_SB, KEY_SB);

async function loadPreview() {
    const container = document.getElementById('preview-list');
    console.log("Iniciando carga de partidos con columna hora...");

    try {
        // 1. Agregamos 'hora' a la selección de columnas
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha, hora') 
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
            /* AJUSTE DE FECHA: 
               Si 'fecha' es "2026-06-11", al añadirle "T12:00:00" nos aseguramos 
               de que JS no la mueva de día por temas de zona horaria.
            */
            const d = new Date(m.fecha + "T12:00:00");
            const fechaTxt = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
            
            // 2. Priorizamos tu nueva columna 'hora'. Si está vacía, ponemos "TBD"
            const horaTxt = m.hora || "TBD";

            container.innerHTML += `
                <div class="fifa-match-row">
                    <div class="fifa-date">${fechaTxt}</div>
                    <div class="fifa-time">${horaTxt}</div>
                    <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
                </div>
            `;
        });
        console.log("Partidos con hora cargados correctamente:", matches);

    } catch (err) {
        console.error("Error inesperado:", err);
        container.innerHTML = `<div style="color:red">Error fatal al cargar</div>`;
    }
}

async function handleLogin() {
    const nameInput = document.getElementById('login-name');
    const pinInput = document.getElementById('login-pin');

    if (!nameInput || !pinInput) return;

    const name = nameInput.value.toLowerCase().trim();
    const pin = pinInput.value;

    if (!name || !pin) {
        alert("Por favor, ingresa usuario y PIN");
        return;
    }

    const { data, error } = await _sb
        .from('perfiles')
        .select('*')
        .eq('nombre', name)
        .eq('pin', pin)
        .single();

    if (data) {
        // Guardamos el usuario globalmente para usarlo en las apuestas
        window.currentUser = data; 
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        
        const display = document.getElementById('user-display');
        if (display) display.innerText = "JUGADOR: " + data.nombre.toUpperCase();
        
        // Aquí puedes llamar a loadMatches('Grupos') cuando tengas esa función lista
        console.log("Login exitoso para:", data.nombre);
    } else {
        alert("Acceso denegado: Usuario o PIN incorrectos");
    }
}

// Ejecutar al cargar la página
loadPreview();
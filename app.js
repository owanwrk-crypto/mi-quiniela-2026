const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';

// ESPERAR A QUE EL HTML ESTÉ LISTO
document.addEventListener('DOMContentLoaded', () => {
    console.log("App iniciada...");
    loadPreview(); 
});

// 1. CARGAR CARTELERA DE INICIO (PÚBLICA)
async function loadPreview() {
    const container = document.getElementById('preview-list');
    if (!container) return; // Evita error si el elemento no existe

    try {
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha, hora') 
            .order('fecha', { ascending: true })
            .limit(6);

        if (error) throw error;
        
        container.innerHTML = '';
        matches.forEach(m => {
            // Ajuste de fecha para evitar desfases de zona horaria
            const d = new Date(m.fecha + "T12:00:00");
            const fechaTxt = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
            
            container.innerHTML += `
                <div class="fifa-match-row">
                    <div class="fifa-date">${fechaTxt}</div>
                    <div class="fifa-time">${m.hora || "TBD"}</div>
                    <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
                </div>`;
        });
    } catch (err) {
        console.error("Error en preview:", err);
        container.innerHTML = "<p style='color:red'>Error de conexión con la base de datos</p>";
    }
}

// 2. LÓGICA DE LOGIN
async function handleLogin() {
    const nameInput = document.getElementById('login-name');
    const pinInput = document.getElementById('login-pin');
    
    if (!nameInput || !pinInput) return;

    const name = nameInput.value.toLowerCase().trim();
    const pin = pinInput.value.trim();

    if (!name || !pin) {
        alert("Por favor, ingresa tu usuario y PIN.");
        return;
    }

    try {
        const { data, error } = await _sb
            .from('perfiles')
            .select('*')
            .eq('nombre', name)
            .eq('pin', pin)
            .single();

        if (error || !data) {
            alert("Usuario o PIN incorrectos. Revisa bien tus datos.");
            return;
        }

        // Login Exitoso
        window.currentUser = data; 
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerText = "JUGADOR: " + data.nombre.toUpperCase();
        
        showTab('Grupos'); 

    } catch (err) {
        console.error("Error en login:", err);
        alert("Hubo un error al conectar con el servidor.");
    }
}

// 3. NAVEGACIÓN Y PESTAÑAS
function showTab(fase) {
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
    // Cambiar estado de botones
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText.includes(fase));
    });

    if (fase === 'Ranking') {
        list.style.display = 'none';
        saveBtn.style.display = 'none';
        ranking.style.display = 'block';
        loadRanking();
    } else {
        list.style.display = 'block';
        saveBtn.style.display = 'block';
        ranking.style.display = 'none';
        loadMatches(fase);
    }
}

// 4. BANDERAS (Asegúrate que los nombres en Supabase coincidan)
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng',
        'holanda': 'nl', 'paises bajos': 'nl', 'uruguay': 'uy', 'colombia': 'co'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return nombres[n] || 'un';
};

// 5. CARGAR PARTIDOS CON BLOQUEO
async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando encuentros...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    const ahora = new Date();

    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const horaLimpia = m.hora ? m.hora.replace(' ', '') : "12:00";
        const fechaPartido = new Date(`${m.fecha}T${horaLimpia}:00`);
        const tiempoCerrado = (fechaPartido - ahora) < 3600000;
        
        const yaAposto = bet !== undefined;
        const bloqueado = yaAposto || tiempoCerrado;

        container.innerHTML += `
            <div class="match-card ${bloqueado ? 'locked' : ''}">
                <div class="team left">
                    <span>${m.equipo_a.toUpperCase()}</span>
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <div class="score-container">
                    <input type="number" class="score-box" id="a-${m.id}" 
                        value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                    <span class="vs-divider">-</span>
                    <input type="number" class="score-box" id="b-${m.id}" 
                        value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                </div>
                <div class="team right">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png">
                    <span>${m.equipo_b.toUpperCase()}</span>
                </div>
                <div class="status-label">
                    ${yaAposto ? '<span class="status-ok">✓ GUARDADO (NO EDITABLE)</span>' : (tiempoCerrado ? '<span class="status-fail">CERRADO</span>' : '')}
                </div>
            </div>`;
    });
}

// 6. GUARDAR (UPSERT)
async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    const tempMap = new Map();

    inputs.forEach(input => {
        const [prefijo, partidoId] = input.id.split('-');
        const val = input.value;
        if (val === "") return;

        if (!tempMap.has(partidoId)) {
            tempMap.set(partidoId, { perfil_id: window.currentUser.id, partido_id: parseInt(partidoId) });
        }
        const obj = tempMap.get(partidoId);
        if (prefijo === 'a') obj.goles_a_user = parseInt(val);
        else obj.goles_b_user = parseInt(val);
    });

    const finalData = Array.from(tempMap.values()).filter(d => d.hasOwnProperty('goles_a_user') && d.hasOwnProperty('goles_b_user'));

    if (finalData.length === 0) return alert("Completa ambos campos para guardar.");

    if (!confirm("⚠️ Una vez guardados, no podrás modificar estos marcadores. ¿Deseas continuar?")) return;

    const { error } = await _sb.from('pronosticos').upsert(finalData, { onConflict: 'perfil_id, partido_id' });

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        alert("✅ ¡Pronósticos guardados!");
        loadMatches(currentFase);
    }
}

// 7. RANKING
async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = '';
    data.forEach((u, i) => {
        const esYo = u.id === window.currentUser.id;
        body.innerHTML += `
            <tr class="${esYo ? 'me' : ''}">
                <td style="padding: 10px;">${i + 1}</td>
                <td>${u.nombre.toUpperCase()} ${esYo ? '(TÚ)' : ''}</td>
                <td style="text-align: center; color:var(--neon-cyan); font-weight:bold;">${u.puntos_totales || 0}</td>
            </tr>`;
    });
}
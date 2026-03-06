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
    if (!container) return;

    try {
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha, hora') 
            .order('fecha', { ascending: true })
            .limit(6);

        if (error) throw error;
        
        container.innerHTML = '';
        matches.forEach(m => {
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
        container.innerHTML = "<p style='color:red'>Error de conexión</p>";
    }
}

// 2. LÓGICA DE LOGIN
async function handleLogin() {
    const nameInput = document.getElementById('login-name');
    const pinInput = document.getElementById('login-pin');
    if (!nameInput || !pinInput) return;

    const name = nameInput.value.toLowerCase().trim();
    const pin = pinInput.value.trim();

    if (!name || !pin) return alert("Ingresa usuario y PIN.");

    try {
        const { data, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

        if (error || !data) return alert("Usuario o PIN incorrectos.");

        window.currentUser = data; 
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerText = "JUGADOR: " + data.nombre.toUpperCase();
        
        showTab('Grupos'); 
    } catch (err) {
        alert("Error de conexión al servidor.");
    }
}

// 3. NAVEGACIÓN Y PESTAÑAS (Soporta Grupos, Octavos, Cuartos, Semis, Final)
function showTab(fase) {
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
    // Actualizar estilo visual de los botones de pestañas
    document.querySelectorAll('.tab-btn').forEach(b => {
        // Comparamos el texto del botón con la fase elegida
        if(b.innerText.toLowerCase().includes(fase.toLowerCase())) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
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

// 4. DICCIONARIO DE BANDERAS
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

// 5. CARGAR PARTIDOS (Con ajuste de diseño para marcadores amplios)
async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando fase ' + fase + '...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    const ahora = new Date();

    if (!matches || matches.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No hay partidos programados para esta fase aún.</p>`;
        return;
    }

    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const horaLimpia = m.hora ? m.hora.replace(' ', '') : "12:00";
        const fechaPartido = new Date(`${m.fecha}T${horaLimpia}:00`);
        const tiempoCerrado = (fechaPartido - ahora) < 3600000;
        
        const yaAposto = bet !== undefined;
        const bloqueado = yaAposto || tiempoCerrado;

        container.innerHTML += `
            <div class="match-card ${bloqueado ? 'locked' : ''}" style="grid-template-columns: 1fr 150px 1fr;">
                <div class="team left">
                    <span>${m.equipo_a.toUpperCase()}</span>
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <div class="score-container" style="gap: 10px;">
                    <input type="number" class="score-box" id="a-${m.id}" 
                        value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''}
                        style="width: 55px; height: 50px; font-size: 24px;">
                    <span class="vs-divider">-</span>
                    <input type="number" class="score-box" id="b-${m.id}" 
                        value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''}
                        style="width: 55px; height: 50px; font-size: 24px;">
                </div>
                <div class="team right">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png">
                    <span>${m.equipo_b.toUpperCase()}</span>
                </div>
                <div class="status-label">
                    ${yaAposto ? '<span class="status-ok">✓ PRONÓSTICO REGISTRADO</span>' : (tiempoCerrado ? '<span class="status-fail">TIEMPO AGOTADO</span>' : '')}
                </div>
            </div>`;
    });
}

// 6. GUARDAR PRONÓSTICOS
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

    if (finalData.length === 0) return alert("Escribe los marcadores completos antes de guardar.");

    if (!confirm("⚠️ Al guardar, los marcadores de esta fase se bloquearán. ¿Confirmar envío?")) return;

    const { error } = await _sb.from('pronosticos').upsert(finalData, { onConflict: 'perfil_id, partido_id' });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("✅ ¡Pronósticos guardados correctamente!");
        loadMatches(currentFase);
    }
}

// 7. RANKING
async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    if (!body) return;
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
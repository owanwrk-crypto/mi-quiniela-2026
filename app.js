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
        container.innerHTML = "Error de conexión";
    }
}

// 2. LÓGICA DE LOGIN
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

// 3. NAVEGACIÓN Y PESTAÑAS
function showTab(fase) {
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
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

// 4. DICCIONARIO DE BANDERAS AMPLIADO
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng',
        'paises bajos': 'nl', 'holanda': 'nl', 'belgica': 'be', 'croacia': 'hr',
        'uruguay': 'uy', 'colombia': 'co', 'chile': 'cl', 'japon': 'jp', 'corea del sur': 'kr',
        'marruecos': 'ma', 'suiza': 'ch', 'dinamarca': 'dk', 'ecuador': 'ec'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return nombres[n] || 'un';
};

// 5. CARGAR PARTIDOS (CON DISEÑO MEJORADO Y BLOQUEO POST-GUARDADO)
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
        
        // Bloqueo si: ya pasó el tiempo O si ya existe una apuesta en la base de datos
        const yaAposto = bet !== undefined;
        const tiempoCerrado = (fechaPartido - ahora) < 3600000;
        const bloqueado = yaAposto || tiempoCerrado;

        container.innerHTML += `
            <div class="match-card ${bloqueado ? 'locked' : ''}" style="position:relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1);">
                
                <div class="team" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-weight: bold;">
                    <span>${m.equipo_a.toUpperCase()}</span>
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                </div>

                <div style="display: flex; gap: 8px; align-items: center; padding: 0 15px;">
                    <input type="number" class="score-box" id="a-${m.id}" 
                        value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''} 
                        style="width: 45px; height: 45px; text-align: center; font-size: 20px; background: #000; border: 2px solid var(--neon-cyan); color: #fff; border-radius: 8px;">
                    <span style="color: var(--neon-cyan); font-weight: bold;">-</span>
                    <input type="number" class="score-box" id="b-${m.id}" 
                        value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''} 
                        style="width: 45px; height: 45px; text-align: center; font-size: 20px; background: #000; border: 2px solid var(--neon-cyan); color: #fff; border-radius: 8px;">
                </div>

                <div class="team" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px; font-weight: bold;">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                    <span>${m.equipo_b.toUpperCase()}</span>
                </div>

                <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: bold;">
                    ${yaAposto ? '<span style="color:var(--neon-green)">✓ GUARDADO</span>' : (tiempoCerrado ? '<span style="color:#ff4444">CERRADO</span>' : '')}
                </div>
            </div>`;
    });
}

// 6. GUARDAR PRONÓSTICOS
async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    const dataToSave = new Map();

    inputs.forEach(input => {
        const [prefijo, partidoId] = input.id.split('-');
        const val = input.value;

        if (val !== "") {
            if (!dataToSave.has(partidoId)) {
                dataToSave.set(partidoId, { 
                    perfil_id: window.currentUser.id, 
                    partido_id: parseInt(partidoId) 
                });
            }
            const obj = dataToSave.get(partidoId);
            if (prefijo === 'a') obj.goles_a_user = parseInt(val);
            else obj.goles_b_user = parseInt(val);
        }
    });

    const listaFinal = Array.from(dataToSave.values()).filter(d => 
        d.hasOwnProperty('goles_a_user') && d.hasOwnProperty('goles_b_user')
    );

    if (listaFinal.length === 0) return alert("Ingresa marcadores completos para guardar");

    // Confirmación antes de bloquear para siempre
    if (!confirm("⚠️ Una vez guardados, no podrás modificar estos marcadores. ¿Deseas continuar?")) return;

    const { error } = await _sb.from('pronosticos').upsert(listaFinal, { onConflict: 'perfil_id, partido_id' });

    if (error) alert("Error: " + error.message);
    else {
        alert("✅ ¡Pronósticos guardados exitosamente!");
        loadMatches(currentFase);
    }
}

// 7. RANKING EN TIEMPO REAL
async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = '';
    data.forEach((u, i) => {
        const esYo = u.id === window.currentUser.id;
        body.innerHTML += `
            <tr class="${esYo ? 'me' : ''}">
                <td>${i + 1}</td>
                <td>${u.nombre.toUpperCase()} ${esYo ? '(TÚ)' : ''}</td>
                <td style="color:var(--neon-cyan); font-weight:bold;">${u.puntos_totales || 0}</td>
            </tr>`;
    });
}

loadPreview();
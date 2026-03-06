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

// 4. BANDERAS AUTOMÁTICAS
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return nombres[n] || 'un';
};

// 5. CARGAR PARTIDOS CON BLOQUEO DE TIEMPO
async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando partidos...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    const ahora = new Date();

    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        
        // LÓGICA DE BLOQUEO: Combinamos fecha y hora (ej: 2026-06-11 + 15:00)
        // Si el partido no tiene hora, usamos las 12:00 por defecto
        const horaLimpia = m.hora ? m.hora.replace(' ', '') : "12:00";
        const fechaPartido = new Date(`${m.fecha}T${horaLimpia}:00`);
        
        // Bloqueamos 1 hora (3600000 ms) antes del inicio
        const bloqueado = (fechaPartido - ahora) < 3600000;

        container.innerHTML += `
            <div class="match-card ${bloqueado ? 'locked' : ''}">
                <div class="team">
                    ${m.equipo_a} <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="number" class="score-box" id="a-${m.id}" 
                        value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''} placeholder="-">
                    <input type="number" class="score-box" id="b-${m.id}" 
                        value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''} placeholder="-">
                </div>
                <div class="team">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"> ${m.equipo_b}
                </div>
                ${bloqueado ? '<div style="font-size:10px; color:#ff4444; position:absolute; bottom:5px;">CERRADO</div>' : ''}
            </div>`;
    });
}

// 6. GUARDAR PRONÓSTICOS (UPSERT)
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

    if (listaFinal.length === 0) return alert("Completa ambos campos de un partido para guardar");

    const { error } = await _sb.from('pronosticos').upsert(listaFinal, { onConflict: 'perfil_id, partido_id' });

    if (error) alert("Error: " + error.message);
    else {
        alert("✅ ¡Pronósticos guardados!");
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
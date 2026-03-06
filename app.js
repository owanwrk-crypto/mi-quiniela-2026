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
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
    // Actualizar botones visualmente
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

// 4. OBTENER CÓDIGO DE BANDERA
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return nombres[n] || 'un';
};

// 5. CARGAR PARTIDOS PARA APOSTAR
async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando partidos...</p>';

    // Traer partidos y pronósticos actuales del usuario
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        container.innerHTML += `
            <div class="match-card">
                <div class="team">
                    ${m.equipo_a} <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" placeholder="0">
                    <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" placeholder="0">
                </div>
                <div class="team">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"> ${m.equipo_b}
                </div>
            </div>`;
    });
}

// 6. GUARDAR PRONÓSTICOS
async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box');
    const dataToSave = [];

    inputs.forEach(input => {
        const isTeamA = input.id.startsWith('a-');
        const partidoId = input.id.split('-')[1];
        const val = input.value;

        if (val !== "") {
            let item = dataToSave.find(d => d.partido_id === parseInt(partidoId));
            if (!item) {
                item = { perfil_id: window.currentUser.id, partido_id: parseInt(partidoId) };
                dataToSave.push(item);
            }
            if (isTeamA) item.goles_a_user = parseInt(val);
            else item.goles_b_user = parseInt(val);
        }
    });

    if (dataToSave.length === 0) return alert("Ingresa al menos un resultado");

    const { error } = await _sb.from('pronosticos').upsert(dataToSave, { onConflict: 'perfil_id, partido_id' });

    if (error) alert("Error al guardar: " + error.message);
    else alert("✅ ¡Pronósticos guardados!");
}

// 7. CARGAR RANKING
async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = '';
    data.forEach((u, i) => {
        body.innerHTML += `
            <tr ${u.id === window.currentUser.id ? 'class="me"' : ''}>
                <td>${i + 1}</td>
                <td>${u.nombre.toUpperCase()}</td>
                <td>${u.puntos_totales || 0}</td>
            </tr>`;
    });
}

// Iniciar Cartelera
loadPreview();
// CONFIGURACIÓN DE CONEXIÓN
const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentUser = null;
let currentFase = 'Grupos';

// 1. CARGAR CARTELERA (PÁGINA PRINCIPAL)
async function loadPreview() {
    console.log("Intentando cargar cartelera...");
    const container = document.getElementById('preview-list');
    
    try {
        const { data: matches, error } = await _sb
            .from('partidos')
            .select('equipo_a, equipo_b, fecha')
            .order('fecha', {ascending: true})
            .limit(6);

        if (error) throw error;

        if (!matches || matches.length === 0) {
            container.innerHTML = "📭 No hay partidos cargados.";
            return;
        }

        container.innerHTML = '';
        matches.forEach(m => {
            const d = new Date(m.fecha);
            const fechaStr = isNaN(d) ? "PENDIENTE" : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
            const horaStr = isNaN(d) ? "--:--" : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            container.innerHTML += `
                <div class="fifa-match-row">
                    <div class="fifa-date">${fechaStr}</div>
                    <div class="fifa-time">${horaStr}</div>
                    <div class="fifa-teams">${m.equipo_a} vs ${m.equipo_b}</div>
                </div>
            `;
        });
        console.log("Cartelera cargada con éxito.");

    } catch (err) {
        console.error("Error crítico en loadPreview:", err);
        container.innerHTML = `<div style="color:red; font-size:10px;">Error: ${err.message}</div>`;
    }
}

// 2. INICIO DE SESIÓN
async function handleLogin() {
    const name = document.getElementById('login-name').value.toLowerCase().trim();
    const pin = document.getElementById('login-pin').value;

    if(!name || !pin) return alert("Llena todos los campos");

    const { data, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

    if (data) {
        currentUser = data;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerHTML = `<span>JUGADOR:</span> ${data.nombre}`;
        showTab('Grupos');
    } else {
        alert("Nombre o PIN incorrectos");
    }
}

// 3. NAVEGACIÓN
async function showTab(fase) {
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(fase)));

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

// 4. BANDERAS (ISO)
const getIso = (t) => {
    const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
    const name = normalize(t);
    const codes = {
        'mexico': 'mx', 'canada': 'ca', 'estados unidos': 'us', 'usa': 'us',
        'espana': 'es', 'francia': 'fr', 'alemania': 'de', 'portugal': 'pt', 
        'inglaterra': 'gb-eng', 'italia': 'it', 'argentina': 'ar', 'brasil': 'br'
    };
    return codes[name] || 'un'; 
};

// 5. CARGAR PARTIDOS PARA JUGAR
async function loadMatches(fase) {
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', currentUser.id);
    
    const container = document.getElementById('match-list');
    container.innerHTML = '';
    const now = new Date();

    matches.forEach(m => {
        const isLocked = (now > new Date(new Date(m.fecha).getTime() - (3*60*60*1000))) || myBets.some(b => b.partido_id === m.id);
        const bet = myBets.find(b => b.partido_id === m.id);

        container.innerHTML += `
            <div class="match-card ${isLocked ? 'locked' : ''}">
                <div class="team">
                    ${m.equipo_a} <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <div class="team">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"> ${m.equipo_b}
                </div>
            </div>
        `;
    });
}

// 6. GUARDAR PRONÓSTICOS
async function savePredictions() {
    const confirmacion = confirm("⚠️ ¿Guardar pronósticos?");
    if (!confirmacion) return; 

    const cards = document.querySelectorAll('.match-card');
    const dataToSave = [];

    cards.forEach(card => {
        const inputA = card.querySelector('input[id^="a-"]');
        const inputB = card.querySelector('input[id^="b-"]');
        const id = inputA.id.split('-')[1];

        if (!inputA.disabled && !inputB.disabled) {
            const ga = inputA.value;
            const gb = inputB.value;
            if (ga !== "" && gb !== "") {
                dataToSave.push({
                    perfil_id: currentUser.id,
                    partido_id: parseInt(id),
                    goles_a_user: parseInt(ga),
                    goles_b_user: parseInt(gb)
                });
            }
        }
    });

    if (dataToSave.length === 0) return;
    const { error } = await _sb.from('pronosticos').upsert(dataToSave, { onConflict: 'perfil_id, partido_id' });
    if (error) alert(error.message);
    else { alert("✅ Guardado"); loadMatches(currentFase); }
}

// 7. RANKING
async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = '';
    data.forEach((u, i) => {
        let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
        body.innerHTML += `
            <tr ${u.id === currentUser.id ? 'class="me"' : ''}>
                <td class="medal">${medal}</td>
                <td>${u.nombre.toUpperCase()}</td>
                <td><span style="color:var(--neon-cyan)">${u.puntos_totales} pts</span></td>
            </tr>
        `;
    });
}

// INICIO AUTOMÁTICO
loadPreview();
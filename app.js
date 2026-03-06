const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentUser = null;
let currentFase = 'Grupos';

async function handleLogin() {
    const name = document.getElementById('login-name').value.toLowerCase().trim();
    const pin = document.getElementById('login-pin').value;

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

async function showTab(fase) {
    currentFase = fase;
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    
    // UI Tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText.includes(fase)));

    if (fase === 'Ranking') {
        list.style.display = 'none'; saveBtn.style.display = 'none'; ranking.style.display = 'block';
        loadRanking();
    } else {
        list.style.display = 'block'; saveBtn.style.display = 'block'; ranking.style.display = 'none';
        loadMatches(fase);
    }
}

async function loadMatches(fase) {
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', currentUser.id);
    const container = document.getElementById('match-list');
    container.innerHTML = '';
    const now = new Date();

    // Diccionario simple para banderas (puedes ampliarlo)
    const getFlag = (team) => `https://flagcdn.com/w80/${getIso(team)}.png`;
    // Reemplaza la parte interna de loadMatches donde está getIso:

const getIso = (t) => {
    // 1. Limpieza total: quitamos acentos, espacios extras y pasamos a minúsculas
    const normalize = (str) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

    const name = normalize(t);

    const codes = {
        'mexico': 'mx', 'canada': 'ca', 'estados unidos': 'us', 'usa': 'us',
        'espana': 'es', 'francia': 'fr', 'alemania': 'de', 'portugal': 'pt', 
        'inglaterra': 'gb-eng', 'italia': 'it', 'paises bajos': 'nl', 'holanda': 'nl',
        'belgica': 'be', 'croacia': 'hr', 'dinamarca': 'dk', 'suiza': 'ch', 
        'austria': 'at', 'hungria': 'hu', 'turquia': 'tr', 'polonia': 'pl',
        'escocía': 'gb-sct', 'serbia': 'rs', 'republica checa': 'cz',
        'argentina': 'ar', 'brasil': 'br', 'uruguay': 'uy', 'colombia': 'co', 
        'ecuador': 'ec', 'chile': 'cl', 'venezuela': 've', 'paraguay': 'py', 'peru': 'pe',
        'panama': 'pa', 'costa rica': 'cr', 'jamaica': 'jm', 'honduras': 'hn', 'el salvador': 'sv',
        'marruecos': 'ma', 'senegal': 'sn', 'tunez': 'tn', 'argelia': 'dz', 'egipto': 'eg',
        'nigeria': 'ng', 'camerun': 'cm', 'ghana': 'gh', 'costa de marfil': 'ci',
        'japon': 'jp', 'corea del sur': 'kr', 'australia': 'au', 'arabia saudita': 'sa', 'iran': 'ir'
    };
    
    // Si el nombre contiene una diagonal (repechajes), devolvemos bandera de la FIFA/ONU
    if (name.includes('/')) return 'un';

    return codes[name] || 'un'; 
};
    
    // Limpiamos el nombre: quitamos espacios extras y lo pasamos a minúsculas
    const name = t.trim().toLowerCase();
    return codes[name] || 'un'; // Si no lo encuentra, usa 'un' (ONU)
};
    matches.forEach(m => {
        const isLocked = (now > new Date(new Date(m.fecha).getTime() - (3*60*60*1000))) || myBets.some(b => b.partido_id === m.id);
        const bet = myBets.find(b => b.partido_id === m.id);

        container.innerHTML += `
            <div class="match-card ${isLocked ? 'locked' : ''}">
                <div class="team" style="display:flex; align-items:center; flex:1; justify-content:flex-end">
                    ${m.equipo_a} <img class="flag" src="${getFlag(m.equipo_a)}">
                </div>
                <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <div class="team" style="display:flex; align-items:center; flex:1">
                    <img class="flag" src="${getFlag(m.equipo_b)}"> ${m.equipo_b}
                </div>
            </div>
        `;
    });
}

async function savePredictions() {
    // 1. Preguntar al usuario antes de proceder
    const confirmacion = confirm("⚠️ ¿Estás seguro de guardar tus pronósticos?\n\nUna vez guardados, NO podrás modificarlos ni corregirlos.");

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

    if (dataToSave.length === 0) {
        alert("No hay resultados nuevos para guardar.");
        return;
    }

    const { error } = await _sb.from('pronosticos').upsert(dataToSave, { onConflict: 'perfil_id, partido_id' });
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("✅ ¡Guardado y bloqueado!");
        loadMatches(currentFase); // Esto hace que se pongan grises los campos
    }
}

// ... (función loadRanking abajo)

async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = '';

    data.forEach((u, i) => {
        let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
        // Si el ID del ranking es el del usuario actual, le ponemos la clase 'me'
        const isMe = u.id === currentUser.id ? 'class="me"' : '';
        
        body.innerHTML += `
            <tr ${isMe}>
                <td class="medal">${medal}</td>
                <td>${u.nombre.toUpperCase()}</td>
                <td><span style="color:var(--neon-cyan)">${u.puntos_totales} pts</span></td>
            </tr>
        `;
    });
}
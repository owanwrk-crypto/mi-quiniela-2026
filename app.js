const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;

const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'canada': 'ca',
        'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng', 'japon': 'jp', 'qatar': 'qa', 'ecuador': 'ec'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const primeraPalabra = n.split('/')[0].split(' ')[0];
    return nombres[primeraPalabra] || 'un';
};

async function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    if(!name || !pin) return alert("Ingresa datos");
    
    const { data: user, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();
    if (error || !user) return alert("Error de acceso");

    window.currentUser = user;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('user-display').innerText = `JUGADOR: ${user.nombre.toUpperCase()}`;
    loadMatches('Grupos');
}

function showTab(fase) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');

    const matchList = document.getElementById('match-list');
    const rankingList = document.getElementById('ranking-list');
    const wallChart = document.getElementById('wall-chart-section');
    const saveBtn = document.getElementById('save-btn');

    matchList.style.display = 'none';
    rankingList.style.display = 'none';
    wallChart.style.display = 'none';
    saveBtn.style.display = 'none';

    if (fase === 'WallChart') {
        wallChart.style.display = 'block';
        renderWallChart();
    } else if (fase === 'Ranking') {
        rankingList.style.display = 'block';
        loadRanking();
    } else {
        matchList.style.display = 'block';
        saveBtn.style.display = 'block';
        loadMatches(fase);
    }
}

async function renderWallChart() {
    const container = document.getElementById('groups-wall-container');
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center">Cargando Tablero United 2026...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').order('grupo', {ascending: true});
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    if(!matches || matches.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center">No hay partidos configurados en la fase "Grupos".</p>';
        return;
    }

    const grupos = {};
    matches.forEach(m => {
        if (!grupos[m.grupo]) grupos[m.grupo] = [];
        grupos[m.grupo].push(m);
    });

    container.innerHTML = '';
    Object.keys(grupos).forEach(g => {
        let rows = '';
        grupos[g].forEach(m => {
            const b = bets?.find(x => x.partido_id === m.id);
            rows += `
                <div class="match-row-wall">
                    <span style="font-size:10px"><img src="https://flagcdn.com/w20/${getIso(m.equipo_a)}.png" width="14"> ${m.equipo_a.substring(0,3).toUpperCase()}</span>
                    <div style="display:flex; gap:2px">
                        <input type="number" class="box-wall wall-in" data-id="${m.id}" data-side="a" value="${b?.goles_a_user ?? ''}">
                        <input type="number" class="box-wall wall-in" data-id="${m.id}" data-side="b" value="${b?.goles_b_user ?? ''}">
                    </div>
                    <span style="font-size:10px">${m.equipo_b.substring(0,3).toUpperCase()} <img src="https://flagcdn.com/w20/${getIso(m.equipo_b)}.png" width="14"></span>
                </div>`;
        });
        container.innerHTML += `<div class="group-wall-block"><h4>GRUPO ${g}</h4>${rows}</div>`;
    });
}

async function loadMatches(fase) {
    currentFase = fase;
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando partidos...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    matches?.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const yaAposto = bet !== undefined;
        container.innerHTML += `
            <div class="match-card">
                <div style="text-align:right"><span>${m.equipo_a}</span> <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png"></div>
                <div style="display:flex; justify-content:center; gap:10px">
                    <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                    <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                </div>
                <div><img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"> <span>${m.equipo_b}</span></div>
                <div style="grid-column:1/span 3; text-align:center; font-size:10px; margin-top:5px; color:var(--neon-green)">${yaAposto ? '✓ PRONÓSTICO GUARDADO' : ''}</div>
            </div>`;
    });
}

async function savePredictions() {
    // Esta función guarda tanto de la vista Neón como del Wall Chart
    const inputs = document.querySelectorAll('.score-box:not(:disabled), .wall-in:not(:disabled)');
    const predictions = [];
    
    const ids = new Set();
    inputs.forEach(i => ids.add(i.id ? i.id.split('-')[1] : i.dataset.id));

    ids.forEach(id => {
        let gA, gB;
        if(document.getElementById(`a-${id}`)) {
            gA = document.getElementById(`a-${id}`).value;
            gB = document.getElementById(`b-${id}`).value;
        } else {
            gA = document.querySelector(`.wall-in[data-id="${id}"][data-side="a"]`).value;
            gB = document.querySelector(`.wall-in[data-id="${id}"][data-side="b"]`).value;
        }

        if(gA !== '' && gB !== '') {
            predictions.push({ perfil_id: window.currentUser.id, partido_id: id, goles_a_user: parseInt(gA), goles_b_user: parseInt(gB) });
        }
    });

    if(predictions.length === 0) return alert("Ingresa resultados");
    const { error } = await _sb.from('pronosticos').upsert(predictions, { onConflict: 'perfil_id,partido_id' });
    
    if (error) alert("Error al guardar");
    else { alert("¡Guardado!"); showTab(currentFase); }
}

async function loadRanking() {
    const body = document.getElementById('ranking-body');
    body.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
    const { data } = await _sb.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    body.innerHTML = data.map((p, i) => `<tr><td>${i+1}</td><td>${p.nombre}</td><td>${p.puntos_totales || 0}</td></tr>`).join('');
}

async function loadPreview() {
    const { data } = await _sb.from('partidos').select('*').limit(3);
    const container = document.getElementById('preview-list');
    if(container && data) container.innerHTML = data.map(m => `<div style="font-size:10px; margin-bottom:5px; border-bottom:1px solid #333">${m.equipo_a} vs ${m.equipo_b}</div>`).join('');
}

document.addEventListener('DOMContentLoaded', loadPreview);
const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;

async function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    const { data: user, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

    if (error || !user) return alert("Usuario o PIN incorrectos");

    window.currentUser = user;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('user-display').innerText = `JUGADOR: ${user.nombre.toUpperCase()}`;
    loadMatches('Grupos');
}

function showTab(fase) {
    const sections = ['match-list', 'ranking-list', 'wall-chart-section', 'save-btn'];
    sections.forEach(s => document.getElementById(s).style.display = 'none');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');

    if (fase === 'WallChart') {
        document.getElementById('wall-chart-section').style.display = 'block';
        document.getElementById('save-btn').style.display = 'block';
        renderWallChart();
    } else if (fase === 'Ranking') {
        document.getElementById('ranking-list').style.display = 'block';
        loadRanking();
    } else {
        document.getElementById('match-list').style.display = 'block';
        document.getElementById('save-btn').style.display = 'block';
        loadMatches(fase);
    }
}

async function renderWallChart() {
    const container = document.getElementById('groups-wall-container');
    container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Conectando con la base de datos...</p>';

    // IMPORTANTE: Verifica que en Supabase la fase se llame "Grupos"
    const { data: matches, error } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').order('grupo', {ascending: true});
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    if (error || !matches || matches.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column:1/-1;">No hay partidos configurados como "Grupos". Verifica tu tabla de Supabase.</p>`;
        return;
    }

    const grupos = {};
    matches.forEach(m => {
        if (!grupos[m.grupo]) grupos[m.grupo] = [];
        grupos[m.grupo].push(m);
    });

    container.innerHTML = '';
    Object.keys(grupos).sort().forEach(g => {
        let rows = '';
        grupos[g].forEach(m => {
            const b = bets?.find(x => x.partido_id === m.id);
            rows += `
                <div class="match-row-wall">
                    <span style="font-size:11px">${m.equipo_a.toUpperCase()}</span>
                    <div style="display:flex; gap:4px">
                        <input type="number" class="box-wall wall-input" data-id="${m.id}" data-side="a" value="${b?.goles_a_user ?? ''}">
                        <input type="number" class="box-wall wall-input" data-id="${m.id}" data-side="b" value="${b?.goles_b_user ?? ''}">
                    </div>
                    <span style="font-size:11px">${m.equipo_b.toUpperCase()}</span>
                </div>`;
        });
        container.innerHTML += `<div class="group-wall-block"><h4>GRUPO ${g}</h4>${rows}</div>`;
    });
}

async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled), .wall-input');
    const predictions = [];
    const idsProcessed = new Set();

    inputs.forEach(input => {
        const id = input.id ? input.id.split('-')[1] : input.dataset.id;
        if (!idsProcessed.has(id)) {
            let gA, gB;
            if (input.id) {
                gA = document.getElementById(`a-${id}`).value;
                gB = document.getElementById(`b-${id}`).value;
            } else {
                gA = document.querySelector(`.wall-input[data-id="${id}"][data-side="a"]`).value;
                gB = document.querySelector(`.wall-input[data-id="${id}"][data-side="b"]`).value;
            }

            if (gA !== '' && gB !== '') {
                predictions.push({ 
                    perfil_id: window.currentUser.id, 
                    partido_id: id, 
                    goles_a_user: parseInt(gA), 
                    goles_b_user: parseInt(gB) 
                });
                idsProcessed.add(id);
            }
        }
    });

    const { error } = await _sb.from('pronosticos').upsert(predictions, { onConflict: 'perfil_id,partido_id' });
    if (error) alert("Error al guardar");
    else alert("¡Pronósticos actualizados!");
}

async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p>Cargando...</p>';
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase);
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = matches.map(m => {
        const b = bets?.find(x => x.partido_id === m.id);
        return `
            <div class="match-card" style="display:grid; grid-template-columns: 1fr 120px 1fr; align-items:center; background:rgba(255,255,255,0.05); margin-bottom:10px; padding:15px; border-radius:10px;">
                <div style="text-align:right">${m.equipo_a}</div>
                <div style="display:flex; gap:5px; justify-content:center">
                    <input type="number" id="a-${m.id}" class="score-box" value="${b?.goles_a_user ?? ''}" style="width:40px; text-align:center">
                    <input type="number" id="b-${m.id}" class="score-box" value="${b?.goles_b_user ?? ''}" style="width:40px; text-align:center">
                </div>
                <div>${m.equipo_b}</div>
            </div>`;
    }).join('');
}
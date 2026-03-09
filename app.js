const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;

document.addEventListener('DOMContentLoaded', () => { loadPreview(); });

const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'canada': 'ca',
        'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng', 'japon': 'jp'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const primeraPalabra = n.split('/')[0].split(' ')[0];
    return nombres[n] || nombres[primeraPalabra] || 'un';
};

async function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    const btn = document.getElementById('login-btn');
    if(!name || !pin) return alert("Completa los datos");
    btn.innerText = "VERIFICANDO...";
    const { data: user, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();
    if (error || !user) {
        alert("Usuario o PIN incorrectos");
        btn.innerText = "ENTRAR A JUGAR";
    } else {
        window.currentUser = user;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        document.getElementById('user-display').innerText = `JUGADOR: ${user.nombre.toUpperCase()}`;
        loadMatches('Grupos');
    }
}

function showTab(fase) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');

    const matchList = document.getElementById('match-list');
    const rankingList = document.getElementById('ranking-list');
    const wallChart = document.getElementById('wall-chart-section');
    const saveBtn = document.getElementById('save-btn');

    // Reset views
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
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted)">Syncing United 2026 Data...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').order('grupo', {ascending: true});
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    const grupos = {};
    matches?.forEach(m => {
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
                    <span style="font-size:11px"><img src="https://flagcdn.com/w20/${getIso(m.equipo_a)}.png" width="14"> ${m.equipo_a.substring(0,3).toUpperCase()}</span>
                    <div style="display:flex; gap:3px;">
                        <input type="text" class="box-wall" value="${b?.goles_a_user ?? ''}" readonly>
                        <input type="text" class="box-wall" value="${b?.goles_b_user ?? ''}" readonly>
                    </div>
                    <span style="font-size:11px">${m.equipo_b.substring(0,3).toUpperCase()} <img src="https://flagcdn.com/w20/${getIso(m.equipo_b)}.png" width="14"></span>
                </div>`;
        });
        container.innerHTML += `<div class="group-wall-block"><h4>GROUP ${g}</h4>${rows}</div>`;
    });
}

async function loadMatches(fase) {
    currentFase = fase;
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center; color: var(--neon-cyan)">Sincronizando satélites...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    const ahora = new Date();

    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const yaAposto = bet !== undefined;
        container.innerHTML += `
            <div class="match-card">
                <div class="team left"><span>${m.equipo_a}</span><img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png"></div>
                <div class="score-container">
                    <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                    <span style="font-weight:bold; color:#444">VS</span>
                    <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                </div>
                <div class="team right"><img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"><span>${m.equipo_b}</span></div>
                <div class="status-label">${yaAposto ? '<span class="status-ok">✓ PRONÓSTICO ASEGURADO</span>' : ''}</div>
            </div>`;
    });
}

async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    if (inputs.length === 0) return alert("No hay pronósticos nuevos.");
    const predictions = [];
    inputs.forEach(input => {
        const id = input.id.split('-')[1];
        const val = input.value;
        if(val !== '') {
            const side = input.id.split('-')[0];
            let pred = predictions.find(p => p.partido_id === id);
            if(!pred) {
                pred = { perfil_id: window.currentUser.id, partido_id: id, goles_a_user: 0, goles_b_user: 0 };
                predictions.push(pred);
            }
            if(side === 'a') pred.goles_a_user = parseInt(val);
            else pred.goles_b_user = parseInt(val);
        }
    });
    const { error } = await _sb.from('pronosticos').insert(predictions);
    if (error) alert("Error al guardar.");
    else { alert("¡Guardado!"); loadMatches(currentFase); }
}

async function loadRanking() {
    const body = document.getElementById('ranking-body');
    body.innerHTML = '<tr><td colspan="3">CARGANDO RANKING...</td></tr>';
    const { data: perfiles } = await _sb.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    body.innerHTML = perfiles.map((p, i) => `
        <tr>
            <td>${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</td>
            <td style="color:var(--neon-cyan)">${p.nombre.toUpperCase()}</td>
            <td style="color:var(--neon-green)">${p.puntos_totales || 0}</td>
        </tr>`).join('');
}

async function loadPreview() {
    const { data } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').limit(3);
    const container = document.getElementById('preview-list');
    if(data && container) container.innerHTML = data.map(m => `<div style="font-size:11px; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:5px;">${m.equipo_a} vs ${m.equipo_b} <br> <span style="color:var(--neon-purple)">${m.fecha}</span></div>`).join('');
}
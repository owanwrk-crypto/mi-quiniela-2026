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

async function loadMatches(fase) {
    currentFase = fase;
    const container = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const bracket = document.getElementById('bracket-view');
    const saveBtn = document.getElementById('save-btn');
    ranking.style.display = 'none';
    bracket.style.display = 'none';
    saveBtn.style.display = 'block';
    container.style.display = 'block';
    container.innerHTML = '<p style="text-align:center">Cargando partidos...</p>';
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);
    container.innerHTML = '';
    const ahora = new Date();
    matches?.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const yaAposto = bet !== undefined;
        container.innerHTML += `
            <div class="match-card">
                <div class="team left"><span>${m.equipo_a}</span><img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png"></div>
                <div class="score-container">
                    <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                    <span>VS</span>
                    <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${yaAposto ? 'disabled' : ''}>
                </div>
                <div class="team right"><img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png"><span>${m.equipo_b}</span></div>
            </div>`;
    });
}

async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    if (inputs.length === 0) return alert("Nada que guardar.");
    const predictions = [];
    const idsProcessed = new Set();
    inputs.forEach(input => {
        const id = input.id.split('-')[1];
        if (!idsProcessed.has(id)) {
            const gA = document.getElementById(`a-${id}`).value;
            const gB = document.getElementById(`b-${id}`).value;
            if (gA !== '' && gB !== '') {
                predictions.push({ perfil_id: window.currentUser.id, partido_id: id, goles_a_user: parseInt(gA), goles_b_user: parseInt(gB) });
                idsProcessed.add(id);
            }
        }
    });
    const { error } = await _sb.from('pronosticos').insert(predictions);
    if (error) alert("Error."); else { alert("Guardado!"); loadMatches(currentFase); }
}

function showTab(fase) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    const bracketView = document.getElementById('bracket-view');
    const matchList = document.getElementById('match-list');
    const rankingList = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    if (fase === 'Bracket') {
        matchList.style.display = 'none'; rankingList.style.display = 'none'; saveBtn.style.display = 'none'; bracketView.style.display = 'block';
        renderBracket();
    } else if (fase === 'Ranking') {
        matchList.style.display = 'none'; bracketView.style.display = 'none'; saveBtn.style.display = 'none'; rankingList.style.display = 'block';
        loadRanking();
    } else {
        bracketView.style.display = 'none'; rankingList.style.display = 'none'; saveBtn.style.display = 'block'; matchList.style.display = 'block';
        loadMatches(fase);
    }
}

async function renderBracket() {
    const container = document.getElementById('groups-summary');
    container.innerHTML = 'Calculando...';
    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', 'Grupos');
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);
    const grupos = {};
    matches?.forEach(m => { if (!grupos[m.grupo]) grupos[m.grupo] = []; grupos[m.grupo].push(m); });
    container.innerHTML = '';
    const lideres = {};
    Object.keys(grupos).sort().forEach(g => {
        const s = {};
        grupos[g].forEach(m => {
            const b = bets?.find(x => x.partido_id === m.id);
            if (!s[m.equipo_a]) s[m.equipo_a] = { pts: 0, dg: 0 };
            if (!s[m.equipo_b]) s[m.equipo_b] = { pts: 0, dg: 0 };
            if (b) {
                const ga = b.goles_a_user; const gb = b.goles_b_user;
                s[m.equipo_a].dg += (ga - gb); s[m.equipo_b].dg += (gb - ga);
                if (ga > gb) s[m.equipo_a].pts += 3; else if (gb > ga) s[m.equipo_b].pts += 3; else { s[m.equipo_a].pts += 1; s[m.equipo_b].pts += 1; }
            }
        });
        const tabla = Object.entries(s).sort((a, b) => b[1].pts - a[1].pts || b[1].dg - a[1].dg);
        lideres[g] = { p: tabla[0]?.[0] || '?', s: tabla[1]?.[0] || '?' };
        container.innerHTML += `<div class="group-card"><h3>GRUPO ${g}</h3><table class="mini-table">${tabla.map((t, i) => `<tr><td>${i+1}</td><td>${t[0].toUpperCase()}</td><td>${t[1].pts}</td></tr>`).join('')}</table></div>`;
    });
    const fill = (id, t1, t2) => { document.getElementById(id).innerHTML = `<div class="team-row"><span>${t1}</span><span>-</span></div><div class="team-row"><span>${t2}</span><span>-</span></div>`; };
    fill('oct-1', lideres['A']?.p, lideres['B']?.s); fill('oct-2', lideres['C']?.p, lideres['D']?.s);
    fill('oct-3', lideres['E']?.p, lideres['F']?.s); fill('oct-4', lideres['G']?.p, lideres['H']?.s);
    fill('oct-5', lideres['B']?.p, lideres['A']?.s); fill('oct-6', lideres['D']?.p, lideres['C']?.s);
    fill('oct-7', lideres['F']?.p, lideres['E']?.s); fill('oct-8', lideres['H']?.p, lideres['G']?.s);
    document.getElementById('final-match').innerHTML = `<div class="team-row"><span>FINALISTA 1</span></div><div class="team-row"><span>FINALISTA 2</span></div>`;
}

async function loadRanking() {
    const { data: perfiles } = await _sb.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    document.getElementById('ranking-body').innerHTML = perfiles?.map((p, i) => `<tr><td>${i+1}</td><td>${p.nombre.toUpperCase()}</td><td>${p.puntos_totales || 0}</td></tr>`).join('') || '';
}

async function loadPreview() {
    const { data } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').limit(3);
    const container = document.getElementById('preview-list');
    if(data && container) container.innerHTML = data.map(m => `<div style="font-size:10px; margin-bottom:5px;">${m.equipo_a} vs ${m.equipo_b}</div>`).join('');
}
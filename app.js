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
    container.innerHTML = '<p style="text-align:center; color: var(--neon-cyan)">Sincronizando satélites...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
    const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    container.innerHTML = '';
    const ahora = new Date();

    matches.forEach(m => {
        const bet = myBets?.find(b => b.partido_id === m.id);
        const horaLimpia = m.hora ? m.hora.replace(' ', '') : "12:00";
        const fechaPartido = new Date(`${m.fecha}T${horaLimpia}:00`);
        const tiempoCerrado = (fechaPartido - ahora) < 3600000;
        const yaAposto = bet !== undefined;
        const bloqueado = yaAposto || tiempoCerrado;

        container.innerHTML += `
            <div class="match-card">
                <div class="team left">
                    <span>${m.equipo_a}</span>
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                </div>
                <div class="score-container">
                    <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                    <span style="font-weight:bold; color:#444">VS</span>
                    <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                </div>
                <div class="team right">
                    <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png">
                    <span>${m.equipo_b}</span>
                </div>
                <div class="status-label">${yaAposto ? '<span class="status-ok">✓ PRONÓSTICO ASEGURADO</span>' : ''}</div>
            </div>`;
    });
}

async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    if (inputs.length === 0) return alert("No hay pronósticos nuevos para guardar o el tiempo expiró.");

    const predictions = [];
    const idsProcessed = new Set();

    inputs.forEach(input => {
        const id = input.id.split('-')[1];
        if (!idsProcessed.has(id)) {
            const golesA = document.getElementById(`a-${id}`).value;
            const golesB = document.getElementById(`b-${id}`).value;
            if (golesA !== '' && golesB !== '') {
                predictions.push({ perfil_id: window.currentUser.id, partido_id: id, goles_a_user: parseInt(golesA), goles_b_user: parseInt(golesB) });
                idsProcessed.add(id);
            }
        }
    });

    if (predictions.length === 0) return alert("Ingresa resultados válidos.");

    const { error } = await _sb.from('pronosticos').insert(predictions);
    if (error) alert("Error al guardar.");
    else { alert("¡Pronósticos guardados!"); loadMatches(currentFase); }
}

function showTab(fase) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    const bracketView = document.getElementById('bracket-view');
    const matchList = document.getElementById('match-list');
    const rankingList = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');

    if (fase === 'Bracket') {
        matchList.style.display = 'none';
        rankingList.style.display = 'none';
        saveBtn.style.display = 'none';
        bracketView.style.display = 'block';
        renderBracket();
    } else if (fase === 'Ranking') {
        bracketView.style.display = 'none';
        loadRanking();
    } else {
        bracketView.style.display = 'none';
        loadMatches(fase);
    }
}

async function renderBracket() {
    const container = document.getElementById('groups-summary');
    container.innerHTML = '<p style="text-align:center; color: var(--neon-cyan)">Calculando proyecciones...</p>';

    const { data: matches } = await _sb.from('partidos').select('*').eq('fase', 'Grupos');
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    const grupos = {};
    matches.forEach(m => {
        if (!grupos[m.grupo]) grupos[m.grupo] = [];
        grupos[m.grupo].push(m);
    });

    container.innerHTML = '';

    Object.keys(grupos).sort().forEach(nombreGrupo => {
        const stats = {};
        grupos[nombreGrupo].forEach(m => {
            const b = bets?.find(bet => bet.partido_id === m.id);
            if (!stats[m.equipo_a]) stats[m.equipo_a] = { pts: 0, gf: 0, gc: 0 };
            if (!stats[m.equipo_b]) stats[m.equipo_b] = { pts: 0, gf: 0, gc: 0 };

            if (b) {
                stats[m.equipo_a].gf += b.goles_a_user;
                stats[m.equipo_a].gc += b.goles_b_user;
                stats[m.equipo_b].gf += b.goles_b_user;
                stats[m.equipo_b].gc += b.goles_a_user;

                if (b.goles_a_user > b.goles_b_user) stats[m.equipo_a].pts += 3;
                else if (b.goles_a_user < b.goles_b_user) stats[m.equipo_b].pts += 3;
                else { stats[m.equipo_a].pts += 1; stats[m.equipo_b].pts += 1; }
            }
        });

        const tablaOrdenada = Object.entries(stats).sort((a, b) => {
            const difA = a[1].gf - a[1].gc;
            const difB = b[1].gf - b[1].gc;
            return b[1].pts - a[1].pts || difB - difA;
        });

        container.innerHTML += `
            <div class="group-card">
                <h3>GRUPO ${nombreGrupo}</h3>
                <table class="mini-table">
                    <thead><tr><th>#</th><th>EQUIPO</th><th>PTS</th><th>DG</th></tr></thead>
                    <tbody>
                        ${tablaOrdenada.map((item, i) => `
                            <tr>
                                <td class="pos-num">${i + 1}</td>
                                <td style="text-transform: uppercase;">${item[0]}</td>
                                <td style="color:var(--neon-green)">${item[1].pts}</td>
                                <td>${item[1].gf - item[1].gc}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    });
}

async function loadRanking() {
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const bracket = document.getElementById('bracket-view');
    const saveBtn = document.getElementById('save-btn');
    const body = document.getElementById('ranking-body');

    list.style.display = 'none';
    bracket.style.display = 'none';
    saveBtn.style.display = 'none';
    ranking.style.display = 'block';
    
    body.innerHTML = '<tr><td colspan="3" style="color:var(--neon-cyan)">ACCEDIENDO A LA RED...</td></tr>';

    try {
        const { data: perfiles, error } = await _sb
            .from('perfiles')
            .select('nombre, puntos_totales')
            .order('puntos_totales', { ascending: false });

        if (error) throw error;

        body.innerHTML = perfiles.map((p, i) => {
            let medalla = i + 1;
            if(i === 0) medalla = '🥇';
            if(i === 1) medalla = '🥈';
            if(i === 2) medalla = '🥉';
            return `<tr><td>${medalla}</td><td style="color:var(--neon-cyan)">${p.nombre.toUpperCase()}</td><td style="color:var(--neon-green)">${p.puntos_totales || 0}</td></tr>`;
        }).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="3" style="color:var(--neon-red)">ERROR EN CONEXIÓN</td></tr>';
    }
}

async function loadPreview() {
    try {
        const { data } = await _sb.from('partidos').select('*').eq('fase', 'Grupos').limit(3);
        const container = document.getElementById('preview-list');
        if(data && container) {
            container.innerHTML = data.map(m => `
                <div style="font-size:11px; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:5px;">
                    ${m.equipo_a} vs ${m.equipo_b} <br> <span style="color:var(--neon-purple)">${m.fecha}</span>
                </div>`).join('');
        }
    } catch (e) { console.log("Error en preview"); }
}
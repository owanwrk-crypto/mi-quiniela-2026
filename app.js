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
    const saveBtn = document.getElementById('save-btn');

    ranking.style.display = 'none';
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
    
    if (fase === 'Ranking') loadRanking();
    else loadMatches(fase);
}

async function loadRanking() {
    const list = document.getElementById('match-list');
    const ranking = document.getElementById('ranking-list');
    const saveBtn = document.getElementById('save-btn');
    const body = document.getElementById('ranking-body');

    list.style.display = 'none';
    saveBtn.style.display = 'none';
    ranking.style.display = 'block';
    
    body.innerHTML = '<tr><td colspan="3" style="color:var(--neon-cyan)">ACCEDIENDO A LA RED...</td></tr>';

    try {
        // CORRECCIÓN AQUÍ: Se usa puntos_totales
        const { data: perfiles, error } = await _sb
            .from('perfiles')
            .select('nombre, puntos_totales')
            .order('puntos_totales', { ascending: false });

        if (error) throw error;

        if (!perfiles || perfiles.length === 0) {
            body.innerHTML = '<tr><td colspan="3">SIN JUGADORES ACTIVOS</td></tr>';
            return;
        }

        body.innerHTML = perfiles.map((p, i) => {
            let medalla = i + 1;
            if(i === 0) medalla = '🥇';
            if(i === 1) medalla = '🥈';
            if(i === 2) medalla = '🥉';
            
            return `
                <tr>
                    <td style="font-family:'Orbitron'; font-weight:bold;">${medalla}</td>
                    <td style="color:var(--neon-cyan); text-align:left; padding-left:20px;">${p.nombre.toUpperCase()}</td>
                    <td style="font-weight:bold; color:var(--neon-green)">${p.puntos_totales || 0}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Error en Ranking:", err);
        body.innerHTML = '<tr><td colspan="3" style="color:var(--neon-red)">ERROR: REVISA LA COLUMNA puntos_totales</td></tr>';
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
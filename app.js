const URL_SB = 'Thttps://hamqbcccmefflpkurouu.supabase.co';
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
        document.getElementById('user-display').innerText = `Jugador: ${data.nombre}`;
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

    matches.forEach(m => {
        const matchDate = new Date(m.fecha);
        const lockTime = new Date(matchDate.getTime() - (3 * 60 * 60 * 1000));
        const isLocked = now > lockTime;
        const bet = myBets.find(b => b.partido_id === m.id);

        container.innerHTML += `
            <div class="match-card ${isLocked ? 'locked' : ''}">
                <div class="team" style="text-align:right">${m.equipo_a}</div>
                <input type="number" class="score-box" id="a-${m.id}" value="${bet?.goles_a_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <input type="number" class="score-box" id="b-${m.id}" value="${bet?.goles_b_user ?? ''}" ${isLocked ? 'disabled' : ''}>
                <div class="team">${m.equipo_b}</div>
                ${isLocked ? '<span>🔒</span>' : ''}
            </div>
        `;
    });
}

async function savePredictions() {
    const cards = document.querySelectorAll('.match-card:not(.locked)');
    const dataToSave = [];

    cards.forEach(card => {
        const id = card.querySelector('input').id.split('-')[1];
        const ga = document.getElementById(`a-${id}`).value;
        const gb = document.getElementById(`b-${id}`).value;

        if (ga !== "" && gb !== "") {
            dataToSave.push({
                perfil_id: currentUser.id,
                partido_id: parseInt(id),
                goles_a_user: parseInt(ga),
                goles_b_user: parseInt(gb)
            });
        }
    });

    const { error } = await _sb.from('pronosticos').upsert(dataToSave, { onConflict: 'perfil_id, partido_id' });
    if (error) alert("Error: " + error.message);
    else alert("¡Pronósticos guardados!");
}

async function loadRanking() {
    const { data } = await _sb.from('perfiles').select('*').order('puntos_totales', {ascending: false});
    const body = document.getElementById('ranking-body');
    body.innerHTML = data.map((u, i) => `<tr><td>${i+1}</td><td>${u.nombre}</td><td><strong>${u.puntos_totales}</strong></td></tr>`).join('');
}
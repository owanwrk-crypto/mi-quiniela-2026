const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;

async function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    
    // Intento de login
    const { data: user, error } = await _sb.from('perfiles').select('*').eq('nombre', name).eq('pin', pin).single();

    if (error || !user) {
        console.error("Error de login:", error);
        return alert("Usuario o PIN incorrectos");
    }

    window.currentUser = user;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('user-display').innerText = `JUGADOR: ${user.nombre.toUpperCase()}`;
    
    // Cargar la pestaña inicial
    showTab('Grupos');
}

function showTab(fase) {
    currentFase = fase;
    const sections = ['match-list', 'ranking-list', 'wall-chart-section', 'save-btn'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Activar botón visualmente
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText.includes(fase.toUpperCase()));
    if(activeBtn) activeBtn.classList.add('active');

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
    container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Buscando partidos en la base de datos...</p>';

    // PRUEBA DE DEPURACIÓN: Traemos TODO para ver qué hay en la tabla
    const { data: allMatches, error: errDebug } = await _sb.from('partidos').select('fase, grupo, equipo_a');
    console.log("DEBUG - Todos los partidos encontrados:", allMatches);

    // Consulta específica
    const { data: matches, error } = await _sb.from('partidos')
        .select('*')
        .ilike('fase', 'Grupos') // ilike es insensible a mayúsculas/minúsculas
        .order('grupo', {ascending: true});

    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    if (error) {
        container.innerHTML = `<p style="color:red; grid-column:1/-1;">Error de Supabase: ${error.message}</p>`;
        return;
    }

    if (!matches || matches.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:20px;">
                <p>⚠️ No se encontraron partidos con fase "Grupos".</p>
                <small style="color:gray">Datos en tabla: ${allMatches ? allMatches.length : 0} filas encontradas en total.</small>
                <br><button onclick="renderWallChart()" style="margin-top:10px; background:var(--neon-cyan); border:none; padding:5px 10px; cursor:pointer">Reintentar</button>
            </div>`;
        return;
    }

    const grupos = {};
    matches.forEach(m => {
        const gLabel = m.grupo || 'S/G';
        if (!grupos[gLabel]) grupos[gLabel] = [];
        grupos[gLabel].push(m);
    });

    container.innerHTML = '';
    Object.keys(grupos).sort().forEach(g => {
        let rows = '';
        grupos[g].forEach(m => {
            const b = bets?.find(x => x.partido_id === m.id);
            rows += `
                <div class="match-row-wall">
                    <span style="font-size:11px; width:80px">${m.equipo_a.toUpperCase()}</span>
                    <div style="display:flex; gap:4px">
                        <input type="number" class="box-wall wall-input" data-id="${m.id}" data-side="a" value="${b?.goles_a_user ?? ''}">
                        <input type="number" class="box-wall wall-input" data-id="${m.id}" data-side="b" value="${b?.goles_b_user ?? ''}">
                    </div>
                    <span style="font-size:11px; width:80px; text-align:right">${m.equipo_b.toUpperCase()}</span>
                </div>`;
        });
        container.innerHTML += `<div class="group-wall-block"><h4>GRUPO ${g}</h4>${rows}</div>`;
    });
}

async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando jornada...</p>';
    
    const { data: matches } = await _sb.from('partidos').select('*').ilike('fase', fase);
    const { data: bets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

    if(!matches || matches.length === 0) {
        container.innerHTML = `<p style="text-align:center">No hay partidos para la fase: ${fase}</p>`;
        return;
    }

    container.innerHTML = matches.map(m => {
        const b = bets?.find(x => x.partido_id === m.id);
        return `
            <div class="match-card" style="display:grid; grid-template-columns: 1fr 120px 1fr; align-items:center; background:rgba(255,255,255,0.05); margin-bottom:10px; padding:15px; border-radius:10px; border:1px solid rgba(0,242,255,0.2)">
                <div style="text-align:right; font-weight:bold">${m.equipo_a}</div>
                <div style="display:flex; gap:5px; justify-content:center">
                    <input type="number" id="a-${m.id}" class="score-box" value="${b?.goles_a_user ?? ''}" style="width:40px; height:40px; text-align:center; background:#000; color:#00f2ff; border:1px solid #00f2ff; border-radius:5px">
                    <input type="number" id="b-${m.id}" class="score-box" value="${b?.goles_b_user ?? ''}" style="width:40px; height:40px; text-align:center; background:#000; color:#00f2ff; border:1px solid #00f2ff; border-radius:5px">
                </div>
                <div style="font-weight:bold">${m.equipo_b}</div>
            </div>`;
    }).join('');
}

async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box, .wall-input');
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
                const inA = document.querySelector(`.wall-input[data-id="${id}"][data-side="a"]`);
                const inB = document.querySelector(`.wall-input[data-id="${id}"][data-side="b"]`);
                gA = inA ? inA.value : '';
                gB = inB ? inB.value : '';
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

    if(predictions.length === 0) return alert("Ingresa al menos un resultado completo");

    const { error } = await _sb.from('pronosticos').upsert(predictions, { onConflict: 'perfil_id,partido_id' });
    
    if (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar en la base de datos");
    } else {
        alert("¡Pronósticos guardados correctamente!");
        showTab(currentFase);
    }
}

async function loadRanking() {
    const body = document.getElementById('ranking-body');
    body.innerHTML = '<tr><td colspan="3">Cargando tabla de posiciones...</td></tr>';
    const { data, error } = await _sb.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    
    if(error) return body.innerHTML = '<tr><td colspan="3">Error al cargar ranking</td></tr>';
    
    body.innerHTML = data.map((p, i) => `
        <tr>
            <td>${i+1}</td>
            <td style="text-align:left; padding-left:20px">${p.nombre}</td>
            <td style="color:var(--neon-green); font-weight:bold">${p.puntos_totales || 0}</td>
        </tr>`).join('');
}
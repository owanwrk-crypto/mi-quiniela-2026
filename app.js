const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';

// 1. DICCIONARIO DE BANDERAS (Asegúrate que los nombres en Supabase coincidan)
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng',
        'holanda': 'nl', 'paises bajos': 'nl', 'uruguay': 'uy', 'colombia': 'co'
    };
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return nombres[n] || 'un';
};

// 2. CARGAR PARTIDOS CON DOBLE CANDADO (TIEMPO Y REGISTRO PREVIO)
async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando encuentros...</p>';

    try {
        const { data: matches } = await _sb.from('partidos').select('*').eq('fase', fase).order('fecha', {ascending: true});
        const { data: myBets } = await _sb.from('pronosticos').select('*').eq('perfil_id', window.currentUser.id);

        container.innerHTML = '';
        const ahora = new Date();

        matches.forEach(m => {
            const bet = myBets?.find(b => b.partido_id === m.id);
            
            // Lógica de tiempo
            const horaLimpia = m.hora ? m.hora.replace(' ', '') : "12:00";
            const fechaPartido = new Date(`${m.fecha}T${horaLimpia}:00`);
            const tiempoCerrado = (fechaPartido - ahora) < 3600000;

            // EL CANDADO: Bloqueado si ya apostó O si ya es tarde
            const yaAposto = bet !== undefined;
            const bloqueado = yaAposto || tiempoCerrado;

            container.innerHTML += `
                <div class="match-card ${bloqueado ? 'locked' : ''}">
                    <div class="team left">
                        <span>${m.equipo_a.toUpperCase()}</span>
                        <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_a)}.png">
                    </div>

                    <div class="score-container">
                        <input type="number" class="score-box" id="a-${m.id}" 
                            value="${bet?.goles_a_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                        <span class="vs-divider">-</span>
                        <input type="number" class="score-box" id="b-${m.id}" 
                            value="${bet?.goles_b_user ?? ''}" ${bloqueado ? 'disabled' : ''}>
                    </div>

                    <div class="team right">
                        <img class="flag" src="https://flagcdn.com/w80/${getIso(m.equipo_b)}.png">
                        <span>${m.equipo_b.toUpperCase()}</span>
                    </div>

                    <div class="status-label">
                        ${yaAposto ? '<span class="status-ok">✓ PRONÓSTICO REGISTRADO</span>' : (tiempoCerrado ? '<span class="status-fail">CERRADO</span>' : '')}
                    </div>
                </div>`;
        });
    } catch (e) {
        container.innerHTML = "Error al cargar partidos.";
    }
}

// 3. GUARDAR (CON CONFIRMACIÓN ADICIONAL)
async function savePredictions() {
    const inputs = document.querySelectorAll('.score-box:not(:disabled)');
    const dataToSave = [];
    const tempMap = new Map();

    inputs.forEach(input => {
        const [prefijo, partidoId] = input.id.split('-');
        const val = input.value;
        if (val === "") return;

        if (!tempMap.has(partidoid)) tempMap.set(partidoId, { perfil_id: window.currentUser.id, partido_id: parseInt(partidoId) });
        const obj = tempMap.get(partidoId);
        if (prefijo === 'a') obj.goles_a_user = parseInt(val);
        else obj.goles_b_user = parseInt(val);
    });

    const finalData = Array.from(tempMap.values()).filter(d => d.hasOwnProperty('goles_a_user') && d.hasOwnProperty('goles_b_user'));

    if (finalData.length === 0) return alert("Ingresa resultados completos.");

    if (!confirm("¿Estás seguro? Una vez guardados, no podrás modificar tus resultados.")) return;

    const { error } = await _sb.from('pronosticos').upsert(finalData, { onConflict: 'perfil_id, partido_id' });

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        alert("✅ Guardado con éxito.");
        loadMatches(currentFase); // Recarga para bloquear los inputs
    }
}
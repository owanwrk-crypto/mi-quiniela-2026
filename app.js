const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';
const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';

document.addEventListener('DOMContentLoaded', () => { loadPreview(); });

// DICCIONARIO DE BANDERAS AMPLIADO
const getIso = (equipo) => {
    const nombres = {
        'mexico': 'mx', 'argentina': 'ar', 'brasil': 'br', 'espana': 'es',
        'francia': 'fr', 'alemania': 'de', 'usa': 'us', 'estados unidos': 'us',
        'canada': 'ca', 'portugal': 'pt', 'italia': 'it', 'inglaterra': 'gb-eng',
        'holanda': 'nl', 'paises bajos': 'nl', 'uruguay': 'uy', 'colombia': 'co',
        'paraguay': 'py', 'australia': 'au', 'marruecos': 'ma', 'sudafrica': 'za',
        'corea del sur': 'kr', 'republica de corea': 'kr', 'japon': 'jp',
        'turquia': 'tr', 'rumania': 'ro', 'eslovaquia': 'sk', 'kosovo': 'xk'
    };
    // Limpieza de texto para buscar coincidencias
    const n = equipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // Si el nombre es largo (como "Italia/Nigeria..."), buscamos la primera palabra
    const primeraPalabra = n.split('/')[0].split(' ')[0];
    
    return nombres[n] || nombres[primeraPalabra] || 'un';
};

async function loadMatches(fase) {
    const container = document.getElementById('match-list');
    container.innerHTML = '<p style="text-align:center">Cargando...</p>';

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
            <div class="match-card ${bloqueado ? 'locked' : ''}">
                <div class="team left">
                    <span>${m.equipo_a}</span>
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
                    <span>${m.equipo_b}</span>
                </div>
                <div class="status-label">
                    ${yaAposto ? '<span class="status-ok">✓ PRONÓSTICO REGISTRADO</span>' : ''}
                </div>
            </div>`;
    });
}

// ... Mantén el resto de tus funciones (handleLogin, showTab, savePredictions, loadRanking) igual ...
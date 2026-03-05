const supabaseUrl = 'TU_URL_AQUI';
const supabaseKey = 'TU_KEY_ANON_AQUI';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Función para cargar partidos
async function loadMatches() {
    const { data: matches, error } = await supabase.from('partidos').select('*');
    const container = document.getElementById('matches-container');
    
    matches.forEach(m => {
        container.innerHTML += `
            <div class="match-card" data-id="${m.id}">
                <span>${m.equipo_a}</span>
                <input type="number" class="score-a" min="0">
                <span>vs</span>
                <input type="number" class="score-b" min="0">
                <span>${m.equipo_b}</span>
            </div>
        `;
    });
}

// Lógica de puntos (5 puntos exacto, 2 puntos resultado)
function calcularPuntos(userA, userB, realA, realB) {
    if (userA === realA && userB === realB) return 5;
    if ((userA > userB && realA > realB) || (userA < userB && realA < realB) || (userA === userB && realA === realB)) return 2;
    return 0;
}

loadMatches();
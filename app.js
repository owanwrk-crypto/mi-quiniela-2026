const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co'
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z'

const _sb = supabase.createClient(URL_SB, KEY_SB)

let currentTab="Grupos"
window.currentUser=null
// Ya no usaremos una variable global única para el bloqueo
let pronosticosUsuario = []; 


function getFlag(team){

const flags={

"México":"mx",
"Mexico":"mx",
"Estados Unidos":"us",
"Canadá":"ca",

"Argentina":"ar",
"Brasil":"br",
"Uruguay":"uy",
"Paraguay":"py",
"Colombia":"co",
"Ecuador":"ec",
"Bolivia":"bo",

"España":"es",
"Francia":"fr",
"Alemania":"de",
"Inglaterra":"gb",
"Escocia":"gb-sct",
"Gales":"gb-wls",
"Irlanda":"ie",
"Irlanda del Norte":"gb-nir",
"Portugal":"pt",
"Croacia":"hr",
"Suiza":"ch",
"Austria":"at",
"Bélgica":"be",
"Países Bajos":"nl",

"Marruecos":"ma",
"Egipto":"eg",
"Sudáfrica":"za",
"Costa de Marfil":"ci",
"Cabo Verde":"cv",
"Senegal":"sn",
"Ghana":"gh",
"RD de Congo":"cd",

"Japón":"jp",
"República de Corea":"kr",
"Corea del Sur":"kr",
"Irán":"ir",
"RI de Irán":"ir",
"Arabia Saudí":"sa",
"Catar":"qa",

"Australia":"au",
"Nueva Zelanda":"nz",

"Haití":"ht",
"Curazao":"cw",
"Panamá":"pa"

}

return flags[team] || "un"

}

function flagURL(team){

const code=getFlag(team)
return `https://flagcdn.com/w40/${code}.png`

}


async function handleLogin(){

const name=document.getElementById("login-name").value
const pin=document.getElementById("login-pin").value

try {
    const {data:user,error}=await _sb
    .from("perfiles")
    .select("*")
    .eq("nombre",name)
    .eq("pin",pin)
    .single()

    if(error || !user){
        alert("Usuario o PIN incorrecto")
        return
    }

    window.currentUser=user

    document.getElementById("login-section").style.display="none"
    document.getElementById("main-section").style.display="block"

    // Es Administrador?
    const isAdmin = user.rol === 'admin' || user.nombre.toUpperCase() === 'ADMIN' || user.es_admin === true;

    if(isAdmin) {
        // Modo Administrador: Ocultar pestañas de juego y mostrar panel admin
        document.querySelector(".tabs-container").style.display = "none";
        document.getElementById("user-display").innerText = "MODO ADMINISTRADOR";
        showTab("Admin");
    } else {
        // Modo Jugador: Mostrar pestañas y flujo normal
        document.querySelector(".tabs-container").style.display = "flex";
        document.getElementById("user-display").innerText = `JUGADOR: ${user.nombre}`;
        
        // Ejecutamos estas funciones, pero si fallan no bloqueamos el inicio
        try {
            await checkQuinielaGuardada()
        } catch (e) {
            console.error("Error en checkQuinielaGuardada:", e)
        }

        showTab("Grupos");

        // Cargamos estadísticas en segundo plano
        updateGlobalStats().catch(e => console.error("Error en updateGlobalStats:", e))
    }
} catch (err) {
    console.error("Error en login:", err)
    alert("Error de conexión al servidor.")
}

}



async function updateGlobalStats(){

const {data:perfiles} = await _sb.from("perfiles").select("*")
const {data:matches} = await _sb.from("partidos").select("*")
const {data:pronosticos} = await _sb.from("pronosticos").select("*")

if(!perfiles || !matches || !pronosticos) return

// Filtrar administradores para las estadísticas globales
const jugadores = perfiles.filter(p => {
    const nombre = (p.nombre || "").trim().toUpperCase();
    const rol = (p.rol || "").trim().toLowerCase();
    return rol !== 'admin' && nombre !== 'ADMIN' && p.es_admin !== true;
});

let ranking = []

jugadores.forEach(p=>{

let puntos=0
let total=0
let aciertos=0

const bets = pronosticos.filter(x=>x.perfil_id === p.id)

bets.forEach(b=>{

const m = matches.find(x=>x.id === b.partido_id)

if(!m || m.goles_a == null || m.goles_b == null) return

total++

if(b.goles_a_user == m.goles_a && b.goles_b_user == m.goles_b){

puntos+=3
aciertos++

}else{

let real=""
let user=""

if(m.goles_a > m.goles_b) real="A"
else if(m.goles_b > m.goles_a) real="B"
else real="E"

if(b.goles_a_user > b.goles_b_user) user="A"
else if(b.goles_b_user > b.goles_a_user) user="B"
else user="E"

if(real === user){

  // Bonus de penales en fases de eliminación
  if (real === "E" && m.grupo.length > 1) {
    const realPenal = m.penales_a > m.penales_b ? "A" : "B";
    const userPenal = b.penales_a_user > b.penales_b_user ? "A" : "B";
    if (realPenal === userPenal) puntos += 1;
  }

  puntos+=1
  aciertos++

}

}

})

ranking.push({
id: p.id,
nombre:p.nombre,
puntos:puntos,
porcentaje: total ? Math.round((aciertos/total)*100) : 0
})

}) // Fin jugadores.forEach

ranking.sort((a,b)=> b.puntos - a.puntos)

const myData = ranking.find(r => r.id === window.currentUser.id)
const myRank = ranking.findIndex(r => r.id === window.currentUser.id) + 1

if(myData){

document.getElementById("stat-points").innerText = myData.puntos
document.getElementById("stat-rank").innerText = `#${myRank}`
document.getElementById("stat-accuracy").innerText = `${myData.porcentaje}%`

}

} // Fin updateGlobalStats



// --- FUNCIONES DE ADMINISTRADOR ---

function showAdminSubTab(tabId) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.admin-subtab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Quitar clase active de todos los botones
    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el seleccionado
    document.getElementById(`admin-subtab-${tabId}`).style.display = 'block';
    
    // Activar el botón correspondiente
    event.currentTarget.classList.add('active');

    // Cargar datos según la pestaña
    if (tabId === 'users') adminLoadUsers();
    if (tabId === 'matches') adminLoadMatches(document.getElementById('admin-match-phase').value);
}

async function adminLoadUsers() {
    const container = document.getElementById("admin-users-list");
    const { data: users, error } = await _sb.from("perfiles").select("*").order("nombre");
    
    if (error || !users) return;

    container.innerHTML = users.map(u => `
        <div class="admin-item">
            <div class="admin-user-info">
                <strong>${u.nombre}</strong>
                <span>PIN: ${u.pin}</span>
            </div>
            <button class="btn-small-danger" onclick="adminDeleteUser('${u.id}')">ELIMINAR</button>
        </div>
    `).join("");
}

async function adminAddUser() {
    const name = document.getElementById("new-user-name").value;
    const pin = document.getElementById("new-user-pin").value;

    if (!name || !pin) {
        alert("Completa todos los campos");
        return;
    }

    // Generar un ID aleatorio (UUID) por si la base de datos no lo hace automáticamente
    const newId = crypto.randomUUID();

    const { error } = await _sb.from("perfiles").insert({ 
        id: newId,
        nombre: name, 
        pin: pin
    });

    if (error) {
        alert("Error al registrar: " + error.message);
    } else {
        alert("Jugador registrado");
        document.getElementById("new-user-name").value = "";
        document.getElementById("new-user-pin").value = "";
        adminLoadUsers();
    }
}

async function adminDeleteUser(id) {
    if (!confirm("¿Seguro que quieres eliminar a este jugador? Se borrarán también sus pronósticos.")) return;
    
    // Primero borrar pronósticos (por integridad)
    await _sb.from("pronosticos").delete().eq("perfil_id", id);
    const { error } = await _sb.from("perfiles").delete().eq("id", id);

    if (error) alert("Error: " + error.message);
    else adminLoadUsers();
}

async function adminLoadMatches(fase) {
    const container = document.getElementById("admin-matches-list");
    container.innerHTML = `<div class="empty-msg">Cargando fase ${fase}...</div>`;
    
    const { data: matches, error } = await _sb.from("partidos").select("*").order("id");

    if (error || !matches) return;

    const filtered = matches.filter(m => {
        const g = (m.grupo || "").trim().toUpperCase();
        if (fase === "Grupos") {
            return g.length === 1 || g.includes("GRUPO") || g.includes("GROUP") || g === "GRUPOS";
        }
        return g === fase.toUpperCase();
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-msg">No hay partidos en esta fase.</div>`;
        return;
    }

    // Agrupar por sub-fase (Grupo A, Grupo B, etc.) si es fase de grupos
    let grouped = {};
    filtered.forEach(m => {
        const groupKey = m.grupo.length === 1 ? `GRUPO ${m.grupo}` : m.grupo.toUpperCase();
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(m);
    });

    container.innerHTML = Object.keys(grouped).map(groupName => `
        <div class="admin-group-section">
            <h4 class="admin-group-title">${groupName}</h4>
            <div class="admin-matches-grid">
                ${grouped[groupName].map((m, idx) => `
                    <div class="admin-item-match-card" style="animation-delay: ${idx * 0.05}s">
                        <div class="admin-match-teams">
                            <div class="admin-team">
                                <img src="${flagURL(m.equipo_a)}" class="flag-min">
                                <span>${m.equipo_a}</span>
                            </div>
                            <span class="admin-vs">VS</span>
                            <div class="admin-team">
                                <span>${m.equipo_b}</span>
                                <img src="${flagURL(m.equipo_b)}" class="flag-min">
                            </div>
                        </div>
                        
                        <div class="admin-match-controls">
                            <div class="admin-score-inputs">
                                <input type="number" id="admin-ga-${m.id}" value="${m.goles_a ?? ''}" placeholder="G">
                                <span class="sep">-</span>
                                <input type="number" id="admin-gb-${m.id}" value="${m.goles_b ?? ''}" placeholder="G">
                            </div>
                            
                            ${m.grupo.length > 1 ? `
                                <div class="admin-penalty-inputs">
                                    <span class="p-label">P</span>
                                    <input type="number" id="admin-pa-${m.id}" value="${m.penales_a ?? ''}" placeholder="0">
                                    <span class="p-sep">:</span>
                                    <input type="number" id="admin-pb-${m.id}" value="${m.penales_b ?? ''}" placeholder="0">
                                </div>
                            ` : ''}
                            
                            <button class="btn-admin-save" onclick="adminUpdateMatch('${m.id}', '${m.grupo}')">
                                <span>GUARDAR</span>
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");
}

async function adminUpdateMatch(id, grupo) {
    const ga = document.getElementById(`admin-ga-${id}`).value;
    const gb = document.getElementById(`admin-gb-${id}`).value;
    
    let updateData = {
        goles_a: ga === "" ? null : parseInt(ga),
        goles_b: gb === "" ? null : parseInt(gb)
    };

    // Solo intentar actualizar penales si existen los inputs en el DOM (lo que indica que la columna debería existir)
    const paInput = document.getElementById(`admin-pa-${id}`);
    const pbInput = document.getElementById(`admin-pb-${id}`);

    if (paInput && pbInput) {
        const pa = paInput.value;
        const pb = pbInput.value;
        updateData.penales_a = pa === "" ? null : parseInt(pa);
        updateData.penales_b = pb === "" ? null : parseInt(pb);
    }

    const { error } = await _sb.from("partidos").update(updateData).eq("id", id);

    if (error) {
        // Si el error es específicamente por la columna de penales, reintentar sin ellos
        if (error.message.includes("penales_a") || error.message.includes("penales_b")) {
            delete updateData.penales_a;
            delete updateData.penales_b;
            const { error: error2 } = await _sb.from("partidos").update(updateData).eq("id", id);
            if (error2) alert("Error: " + error2.message);
            else {
                alert("Resultado actualizado (sin penales)");
                await pushWinnerToNextMatch(id, updateData);
            }
        } else {
            alert("Error: " + error.message);
        }
    } else {
        alert("Resultado actualizado");
        await pushWinnerToNextMatch(id, updateData);
    }
}

/**
 * "Magia" del Bracket: Empuja al ganador al siguiente partido automáticamente.
 */
async function pushWinnerToNextMatch(currentMatchId, results) {
    try {
        // 1. Obtener los datos completos del partido actual
        const { data: match, error } = await _sb
            .from("partidos")
            .select("*")
            .eq("id", currentMatchId)
            .single();

        if (error || !match || !match.sig_partido_id) return;

        let ganador = null;
        const gA = results.goles_a;
        const gB = results.goles_b;

        // 2. Determinar ganador
        if (gA !== null && gB !== null) {
            if (gA > gB) {
                ganador = match.equipo_a;
            } else if (gB > gA) {
                ganador = match.equipo_b;
            } else {
                // Empate: Ver penales (si existen en results o en el match)
                const pA = results.penales_a ?? match.penales_a;
                const pB = results.penales_b ?? match.penales_b;
                
                if (pA !== null && pB !== null) {
                    ganador = pA > pB ? match.equipo_a : match.equipo_b;
                }
            }
        }

        // 3. Actualizar el siguiente partido si hay un ganador claro
        // Si ganador es null (porque se borró el resultado), también actualizamos para limpiar el bracket
        const columnaSiguiente = match.posicion_en_sig_partido === 'A' ? 'equipo_a' : 'equipo_b';
        
        const { error: updateError } = await _sb
            .from("partidos")
            .update({ [columnaSiguiente]: ganador })
            .eq("id", match.sig_partido_id);

        if (updateError) console.error("Error al empujar ganador:", updateError.message);
        else console.log(`Magia aplicada: ${ganador || 'Vacío'} movido al siguiente partido.`);

    } catch (e) {
        console.error("Error en la magia del bracket:", e);
    }
}


async function adminResetMatches() {
    if (!confirm("⚠️ ¿Estás seguro de limpiar todos los resultados reales? Se pondrán todos en blanco (Goles).")) return;
    
    // Si la columna penales_a no existe, solo actualizamos goles
    const { error } = await _sb
        .from("partidos")
        .update({
            goles_a: null,
            goles_b: null
        })
        .gt("id", 0); 

    if (error) {
        alert("Error al limpiar resultados: " + error.message);
    } else {
        alert("Resultados reales limpiados correctamente. El tablero está listo.");
        adminLoadMatches(document.getElementById('admin-match-phase').value);
    }
}

async function adminResetPredictions() {
    if (!confirm("⚠️ ADVERTENCIA: Se borrarán TODOS los pronósticos de TODOS los jugadores. ¿Continuar?")) return;
    
    // El ID de pronósticos es bigint, no UUID. Usamos un filtro que atrape a todos los IDs (mayores a 0)
    const { error } = await _sb.from("pronosticos").delete().gt("id", 0); 

    if (error) alert("Error: " + error.message);
    else alert("Sistema reseteado correctamente");
}

async function adminDownloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    try {
        // Cargar datos
        const { data: perfiles } = await _sb.from("perfiles").select("*").order("nombre");
        const { data: matches } = await _sb.from("partidos").select("*").order("id");
        const { data: pronosticos } = await _sb.from("pronosticos").select("*");

        if (!perfiles || !matches || !pronosticos) {
            alert("No hay suficientes datos para generar el reporte.");
            return;
        }

        // Filtrar administradores
        const jugadores = perfiles.filter(p => {
            const nombre = (p.nombre || "").trim().toUpperCase();
            const rol = (p.rol || "").trim().toLowerCase();
            return rol !== 'admin' && nombre !== 'ADMIN' && p.es_admin !== true;
        });

        // Configuración de encabezado
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 242, 255); // Color neón
        doc.text("REPORTE DE PRONÓSTICOS - MUNDIAL 2026", 105, 15, { align: "center" });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 22, { align: "center" });

        let currentY = 30;

        jugadores.forEach((player, index) => {
            // Si no cabe el siguiente jugador, añadir página
            if (currentY > 260) {
                doc.addPage();
                currentY = 20;
            }

            // Título de Jugador
            doc.setFillColor(5, 22, 45); // Color oscuro
            doc.rect(10, currentY, 190, 8, 'F');
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text(`JUGADOR: ${player.nombre.toUpperCase()}`, 15, currentY + 6);
            currentY += 10;

            // Pronósticos del jugador
            const playerBets = pronosticos.filter(b => b.perfil_id === player.id);
            
            if (playerBets.length === 0) {
                doc.setFont("helvetica", "italic");
                doc.setTextColor(150);
                doc.text("Sin pronósticos registrados.", 15, currentY + 5);
                currentY += 10;
            } else {
                const tableRows = playerBets.map(b => {
                    const m = matches.find(match => match.id === b.partido_id);
                    if (!m) return null;
                    
                    const score = `${b.goles_a_user} - ${b.goles_b_user}`;
                    const penalties = (b.penales_a_user != null) ? ` (P: ${b.penales_a_user}:${b.penales_b_user})` : "";
                    const phase = m.grupo.length === 1 ? `Grupo ${m.grupo}` : m.grupo;

                    return [
                        phase,
                        m.equipo_a,
                        score + penalties,
                        m.equipo_b
                    ];
                }).filter(r => r !== null);

                doc.autoTable({
                    startY: currentY,
                    head: [['Fase', 'Equipo A', 'Pronóstico', 'Equipo B']],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [0, 242, 255], textColor: [0, 0, 0] },
                    margin: { left: 10, right: 10 }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }
        });

        doc.save(`Pronosticos_Mundial_2026.pdf`);

    } catch (err) {
        console.error("Error al generar PDF:", err);
        alert("Error al generar el archivo PDF: " + err.message);
    }
}





async function checkQuinielaGuardada(){

const {data,error}=await _sb
.from("pronosticos")
.select("*")
.eq("perfil_id",window.currentUser.id)

if(data){
pronosticosUsuario = data;
}

}



function showTab(tab) {
    currentTab = tab;

    // 1. Ocultamos TODAS las secciones principales primero
    const sections = [
        'wall-chart-section', 
        'ranking-list', 
        'rules-section', 
        'admin-section', 
        'predictions-others-section',
        'save-btn'
    ];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Quitamos la clase active de todos los botones de tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // Comprobar si el atributo onclick contiene el nombre de la pestaña exacta
        const onclickAttr = btn.getAttribute('onclick') || "";
        if (onclickAttr.includes(`'${tab}'`) || onclickAttr.includes(`"${tab}"`)) {
            btn.classList.add('active');
        }
    });

    // 3. Lógica para mostrar la sección correcta
    if (tab === "Ranking") {
        document.getElementById("ranking-list").style.display = "block";
        loadRanking();
    } else if (tab === "Pronosticos") {
        document.getElementById("predictions-others-section").style.display = "block";
        loadUserList();
    } else if (tab === "Admin") {
        document.getElementById("admin-section").style.display = "block";
        adminLoadUsers();
        adminLoadMatches("Grupos");
    } else if (tab === "Reglas") {
        document.getElementById("rules-section").style.display = "block";
    } else {
        // Fases: Grupos, 16avos, Octavos, Cuartos, Semifinal, Final
        document.getElementById("wall-chart-section").style.display = "block";
        document.getElementById("save-btn").style.display = "block";
        
        console.log("Cargando fase:", tab);
        renderWallChart(tab).catch(err => {
            console.error("Error en renderWallChart:", err);
            const container = document.getElementById("groups-wall-container");
            if(container) container.innerHTML = `<div class="empty-msg">Error fatal: ${err.message}</div>`;
        });
    }
}



async function loadUserList() {
    const select = document.getElementById("user-search");
    const { data: users, error } = await _sb.from("perfiles").select("*").order("nombre");
    
    if (error || !users) return;

    // Filtrar administradores para no mostrarlos en la búsqueda de pronósticos
    const jugadores = users.filter(p => {
        const nombre = (p.nombre || "").trim().toUpperCase();
        const rol = (p.rol || "").trim().toLowerCase();
        return rol !== 'admin' && nombre !== 'ADMIN' && p.es_admin !== true;
    });

    // Guardar la opción actual para no perderla al refrescar la lista
    const currentVal = select.value;
    select.innerHTML = '<option value="">Selecciona un jugador...</option>';
    
    jugadores.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.nombre}</option>`;
    });
    
    select.value = currentVal;
}

async function loadOtherUserPredictions(userId) {
    if (!userId) {
        document.getElementById("predictions-display-container").innerHTML = '<p class="empty-msg">Selecciona un jugador para ver sus pronósticos.</p>';
        return;
    }

    const container = document.getElementById("predictions-display-container");
    container.innerHTML = '<p class="empty-msg">Cargando pronósticos...</p>';

    const { data: matches, error: e1 } = await _sb.from("partidos").select("*").order("id");
    const { data: bets, error: e2 } = await _sb.from("pronosticos").select("*").eq("perfil_id", userId);

    if (e1 || e2) {
        container.innerHTML = '<p class="empty-msg">Error cargando datos.</p>';
        return;
    }

    // Agrupar por fase (usaremos el campo "grupo" o si existe "fase", por ahora agrupemos por lo disponible)
    // Asumiremos que el campo 'grupo' contiene la fase si no es A-H
    let phases = {};
    matches.forEach(m => {
        let phaseName = m.grupo.length === 1 ? `GRUPO ${m.grupo}` : m.grupo;
        if (!phases[phaseName]) phases[phaseName] = [];
        phases[phaseName].push(m);
    });

    container.innerHTML = "";

    Object.keys(phases).forEach((p, idx) => {
        let rows = "";
        phases[p].forEach(m => {
            const b = bets?.find(x => x.partido_id === m.id);
            
            // Lógica de colores (reutilizada de renderWallChart)
            let resultClass = "";
            if (m.goles_a != null && m.goles_b != null && b) {
                if (b.goles_a_user == m.goles_a && b.goles_b_user == m.goles_b) resultClass = "correct";
                else {
                    let real = m.goles_a > m.goles_b ? "A" : (m.goles_b > m.goles_a ? "B" : "E");
                    let user = b.goles_a_user > b.goles_b_user ? "A" : (b.goles_b_user > b.goles_a_user ? "B" : "E");
                    resultClass = (real === user) ? "close" : "wrong";
                }
            }

            // Renderizado de scores y penales
            let scoreUI = `
                <div class="score-display">
                    <div class="score-group">
                        <span class="score-val">${b?.goles_a_user ?? '-'}</span>
                        ${b?.penales_a_user ? `<span class="penalty-tag">P: ${b.penales_a_user}</span>` : ''}
                    </div>
                    <span>:</span>
                    <div class="score-group">
                        <span class="score-val">${b?.goles_b_user ?? '-'}</span>
                        ${b?.penales_b_user ? `<span class="penalty-tag">P: ${b.penales_b_user}</span>` : ''}
                    </div>
                </div>
            `;

            rows += `
                <div class="wall-match ${resultClass}">
                    <div class="team-left">
                        <img class="flag" src="${flagURL(m.equipo_a)}">
                        ${m.equipo_a}
                    </div>
                    ${scoreUI}
                    <div class="team-right">
                        ${m.equipo_b}
                        <img class="flag" src="${flagURL(m.equipo_b)}">
                    </div>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="group-wall" style="animation-delay: ${idx * 0.1}s; margin-bottom: 30px;">
                <h3>${p}</h3>
                ${rows}
            </div>
        `;
    });
}

async function renderWallChart(filterPhase = "Grupos"){

const container=document.getElementById("groups-wall-container")
if(!container) return;

container.innerHTML = `<p class="empty-msg">Cargando partidos de ${filterPhase}...</p>`;

try {
    const {data:matches,error:e1}=await _sb
    .from("partidos")
    .select("*")
    .order("id")

    const {data:bets,error:e2}=await _sb
    .from("pronosticos")
    .select("*")
    .eq("perfil_id",window.currentUser.id)

    if(e1 || e2){
        console.error("Error Supabase:", e1, e2)
        container.innerHTML=`<div class="empty-msg">Error de conexión con la base de datos: ${e1?.message || e2?.message || "Error desconocido"}</div>`
        return
    }

    console.log(`Partidos totales: ${matches?.length}, Pronósticos: ${bets?.length}`)

    if (!matches || matches.length === 0) {
        container.innerHTML = `<p class="empty-msg">No se encontraron partidos en la base de datos.</p>`;
        return;
    }

    // Determinar si es fase de grupos o eliminación directa
    const isGroups = filterPhase === "Grupos";

    let filteredMatches = matches.filter(m => {
        if (!m.grupo) return false;
        const g = m.grupo.trim().toUpperCase();
        const phase = filterPhase.toUpperCase();
        
        if (isGroups) {
            // Un partido es de grupos si:
            // 1. Su grupo es una sola letra (A, B, C...)
            // 2. Contiene la palabra "GRUPO" o "GROUP"
            // 3. Su fase se llama exactamente "GRUPOS"
            return g.length === 1 || g.includes("GRUPO") || g.includes("GROUP") || g === "GRUPOS"; 
        }
        
        // Mapeo flexible pero con prioridad a coincidencia exacta para evitar vacíos
        if (g === phase) return true;
        
        // Búsqueda por palabras clave para mayor compatibilidad con la DB
        if (phase === "16AVOS" && (g.includes("16") || g.includes("DIECI"))) return true;
        if (phase === "OCTAVOS" && (g.includes("OCTAVO") || g.includes("8VOS"))) return true;
        if (phase === "CUARTOS" && (g.includes("CUARTO") || g.includes("4TOS"))) return true;
        if ((phase === "SEMIFINAL" || phase === "SEMI") && (g.includes("SEMI"))) return true;
        if (phase === "FINAL" && g === "FINAL") return true;
        
        return g.includes(phase);
    });

    // Removido el fallback que causaba mostrar todos los partidos en la pestaña de Grupos
    
    // Corregido: Usar 'bets' (datos frescos) en lugar de 'pronosticosUsuario' (que puede estar desactualizado)
    const faseGuardada = filteredMatches.length > 0 && filteredMatches.every(m => 
        bets?.some(p => p.partido_id === m.id)
    );

    container.innerHTML=""

    if (filteredMatches.length === 0) {
        console.warn(`No se encontraron partidos para la fase: ${filterPhase}. Grupo de búsqueda: ${filterPhase.toUpperCase()}`);
        container.innerHTML = `
            <div class="empty-msg">
                <p>No hay partidos programados para la fase: <strong>${filterPhase.toUpperCase()}</strong></p>
                <p style="font-size: 0.8em; opacity: 0.6; margin-top: 10px;">Si eres el administrador, asegúrate de que los partidos de esta fase estén registrados en la base de datos con el nombre de grupo correcto.</p>
            </div>
        `;
        return;
    }

    // Vista de Grupos (Grid)
    if (isGroups) {
        let grupos={}
        filteredMatches.forEach(m=>{
            const gName = m.grupo || "S/G";
            if(!grupos[gName]) grupos[gName]=[]
            grupos[gName].push(m)
        })

        Object.keys(grupos).sort().forEach((g, index)=>{
            let rows=""
            grupos[g].forEach(m=>{
                const b=bets?.find(x=>x.partido_id===m.id)
                let resultClass = getResultClass(m, b);

                rows+=`
                    <div class="wall-match ${resultClass}">
                        <div class="team-left">
                            <img class="flag" src="${flagURL(m.equipo_a)}">
                            <span>${m.equipo_a || 'TBD'}</span>
                        </div>
                        <div class="score-inputs">
                            <input type="number" class="wall-input" data-id="${m.id}" data-side="a" ${faseGuardada ? "disabled":""} value="${b?.goles_a_user ?? ''}">
                            <span>-</span>
                            <input type="number" class="wall-input" data-id="${m.id}" data-side="b" ${faseGuardada ? "disabled":""} value="${b?.goles_b_user ?? ''}">
                        </div>
                        <div class="team-right">
                            <span>${m.equipo_b || 'TBD'}</span>
                            <img class="flag" src="${flagURL(m.equipo_b)}">
                        </div>
                    </div>
                `;
            })

            container.innerHTML+=`
                <div class="group-wall" style="animation-delay: ${index * 0.1}s">
                    <h3>${g.length === 1 ? 'GRUPO ' + g : g}</h3>
                    ${rows}
                </div>
            `;
        })
    } 
    // Vista de Eliminación Directa (Lista una debajo de otra)
    else {
        let rows = "";
        filteredMatches.forEach((m, index) => {
            const b = bets?.find(x => x.partido_id === m.id);
            let resultClass = getResultClass(m, b);

            rows += `
                <div class="knockout-match ${resultClass}" style="animation: groupEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: ${index * 0.1}s">
                    <div class="team-left knockout-team">
                        <img class="flag-large" src="${flagURL(m.equipo_a)}">
                        <span>${m.equipo_a || 'Por Definir'}</span>
                    </div>
                    
                    <div class="score-inputs knockout-scores">
                        <div class="score-group">
                            <input type="number" class="wall-input knockout-input" data-id="${m.id}" data-side="a" ${faseGuardada ? "disabled":""} value="${b?.goles_a_user ?? ''}">
                            <div class="penalty-input-container" title="Penales si hay empate">
                                <span class="penalty-label">P</span>
                                <input type="number" class="penalty-input" data-id="${m.id}" data-side="pa" ${faseGuardada ? "disabled":""} value="${b?.penales_a_user ?? ''}">
                            </div>
                        </div>
                        
                        <span class="vs-text">VS</span>
                        
                        <div class="score-group">
                            <input type="number" class="wall-input knockout-input" data-id="${m.id}" data-side="b" ${faseGuardada ? "disabled":""} value="${b?.goles_b_user ?? ''}">
                            <div class="penalty-input-container" title="Penales si hay empate">
                                <span class="penalty-label">P</span>
                                <input type="number" class="penalty-input" data-id="${m.id}" data-side="pb" ${faseGuardada ? "disabled":""} value="${b?.penales_b_user ?? ''}">
                            </div>
                        </div>
                    </div>

                    <div class="team-right knockout-team">
                        <span>${m.equipo_b || 'Por Definir'}</span>
                        <img class="flag-large" src="${flagURL(m.equipo_b)}">
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="knockout-list-container">
                <h2 class="knockout-title">${filterPhase.toUpperCase()}</h2>
                <p class="knockout-hint">En caso de empate después de 120', usa los campos de <strong>P</strong> (Penales) para decidir quién avanza.</p>
                ${rows}
            </div>
        `;
    }

    // Ocultar botón de guardar si la fase ya está bloqueada
    if (faseGuardada) {
        document.getElementById("save-btn").style.display = "none";
    }
} catch (error) {
    console.error("Error fatal en renderWallChart:", error)
    container.innerHTML = `<div class="empty-msg">Error inesperado: ${error.message}</div>`
}
}



function getResultClass(m, b) {
    if (m.goles_a == null || m.goles_b == null || !b) return "";
    
    if (b.goles_a_user == m.goles_a && b.goles_b_user == m.goles_b) return "correct";
    
    let real = m.goles_a > m.goles_b ? "A" : (m.goles_b > m.goles_a ? "B" : "E");
    let user = b.goles_a_user > b.goles_b_user ? "A" : (b.goles_b_user > b.goles_a_user ? "B" : "E");
    
    return (real === user) ? "close" : "wrong";
}



async function savePredictions(){

// Pedir confirmación antes de guardar
const confirmacion = confirm("¿Estás seguro de tus pronósticos? Una vez guardados, no podrás modificarlos para esta fase.");
if(!confirmacion) return;

const inputs = document.querySelectorAll(".wall-input, .penalty-input")

let bets={}

inputs.forEach(i=>{
const id=i.dataset.id
const side=i.dataset.side

if(!bets[id]) bets[id]={}

bets[id][side]=i.value
})

for(const matchId in bets){
const a = bets[matchId].a
const b = bets[matchId].b
const pa = bets[matchId].pa || null // Penales A
const pb = bets[matchId].pb || null // Penales B

if(a==="" || b==="") continue

await _sb.from("pronosticos").insert({
  perfil_id:window.currentUser.id,
  partido_id:matchId,
  goles_a_user:a,
  goles_b_user:b,
  penales_a_user: pa,
  penales_b_user: pb
  })
  }

  // Actualizar el estado local y la UI
  await checkQuinielaGuardada();
  alert("Pronósticos guardados correctamente.");
  showTab(currentTab);
  }



async function loadRanking(){

const tbody = document.getElementById("ranking-body")
const podium = document.getElementById("top3-podium")

tbody.innerHTML = "<tr><td colspan='5'>Cargando ranking...</td></tr>"

const {data:perfiles,error:e1} = await _sb.from("perfiles").select("*")
const {data:matches,error:e2} = await _sb.from("partidos").select("*")
const {data:pronosticos,error:e3} = await _sb.from("pronosticos").select("*")

if(e1 || e2 || e3){
    console.error(e1,e2,e3)
    tbody.innerHTML="<tr><td colspan='5'>Error cargando ranking</td></tr>"
    return
}

// Filtrar administradores para el ranking
const jugadores = perfiles.filter(p => {
    const nombre = (p.nombre || "").trim().toUpperCase();
    const rol = (p.rol || "").trim().toLowerCase();
    return rol !== 'admin' && nombre !== 'ADMIN' && p.es_admin !== true;
});

let ranking = []

jugadores.forEach(p=>{

let puntos=0
let total=0
let aciertos=0

const bets = pronosticos.filter(x=>x.perfil_id === p.id)

bets.forEach(b=>{

const m = matches.find(x=>x.id === b.partido_id)

if(!m) return
if(m.goles_a == null || m.goles_b == null) return

total++

if(b.goles_a_user == m.goles_a && b.goles_b_user == m.goles_b){

puntos+=3
aciertos++

}else{

let real=""
let user=""

if(m.goles_a > m.goles_b) real="A"
else if(m.goles_b > m.goles_a) real="B"
else real="E"

if(b.goles_a_user > b.goles_b_user) user="A"
else if(b.goles_b_user > b.goles_a_user) user="B"
else user="E"

if(real === user){

  // Bonus de penales en fases de eliminación
  if (real === "E" && m.grupo.length > 1) {
    const realPenal = m.penales_a > m.penales_b ? "A" : "B";
    const userPenal = b.penales_a_user > b.penales_b_user ? "A" : "B";
    if (realPenal === userPenal) puntos += 1;
  }

  puntos+=1
  aciertos++

}

}

})

let porcentaje = total ? Math.round((aciertos/total)*100) : 0

ranking.push({
nombre:p.nombre,
puntos:puntos,
porcentaje:porcentaje
})

})

ranking.sort((a,b)=> b.puntos - a.puntos)



podium.innerHTML=""

ranking.slice(0,3).forEach((p,i)=>{

let medal=["🥇","🥈","🥉"][i]

podium.innerHTML+=`

<div class="podium-player pos${i+1}">
<div class="podium-medal">${medal}</div>
<div class="podium-name">${p.nombre}</div>
<div class="podium-points">${p.puntos} pts</div>
</div>

`

})



tbody.innerHTML=""

ranking.forEach((r,i)=>{

let medal=["🥇","🥈","🥉"][i] || ""

let highlight=""

if(window.currentUser && r.nombre===window.currentUser.nombre){
highlight="highlight-player"
}

tbody.innerHTML+=`

<tr class="${highlight}" style="animation: groupEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: ${i * 0.05}s">
<td>${i+1}</td>
<td>${medal}</td>
<td>${r.nombre}</td>
<td>${r.puntos}</td>
<td>${r.porcentaje}%</td>
</tr>

`

})

}
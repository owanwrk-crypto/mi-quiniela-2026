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
    const { data: matches, error } = await _sb.from("partidos").select("*").order("id");

    if (error || !matches) return;

    const filtered = matches.filter(m => {
        if (fase === "Grupos") return m.grupo.length === 1 || m.grupo.toUpperCase().includes("GRUPO");
        return m.grupo.toLowerCase() === fase.toLowerCase();
    });

    container.innerHTML = filtered.map(m => `
        <div class="admin-item-match">
            <div class="match-info-small">
                <strong>${m.equipo_a} vs ${m.equipo_b}</strong>
            </div>
            <div class="admin-inputs">
                <input type="number" id="admin-ga-${m.id}" value="${m.goles_a ?? ''}" placeholder="G">
                <span>-</span>
                <input type="number" id="admin-gb-${m.id}" value="${m.goles_b ?? ''}" placeholder="G">
                
                ${m.grupo.length > 1 ? `
                    <div class="admin-penalties">
                        <input type="number" id="admin-pa-${m.id}" value="${m.penales_a ?? ''}" placeholder="P">
                        <span>:</span>
                        <input type="number" id="admin-pb-${m.id}" value="${m.penales_b ?? ''}" placeholder="P">
                    </div>
                ` : ''}
                
                <button class="btn-save-small" onclick="adminUpdateMatch('${m.id}', '${m.grupo}')" title="Guardar">💾</button>
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

    if (grupo.length > 1) {
        const pa = document.getElementById(`admin-pa-${id}`).value;
        const pb = document.getElementById(`admin-pb-${id}`).value;
        updateData.penales_a = pa === "" ? null : parseInt(pa);
        updateData.penales_b = pb === "" ? null : parseInt(pb);
    }

    const { error } = await _sb.from("partidos").update(updateData).eq("id", id);

    if (error) alert("Error: " + error.message);
    else alert("Resultado actualizado");
}

async function adminResetPredictions() {
    if (!confirm("⚠️ ADVERTENCIA: Se borrarán TODOS los pronósticos de TODOS los jugadores. ¿Continuar?")) return;
    
    // El ID de pronósticos es bigint, no UUID. Usamos un filtro que atrape a todos los IDs (mayores a 0)
    const { error } = await _sb.from("pronosticos").delete().gt("id", 0); 

    if (error) alert("Error: " + error.message);
    else alert("Sistema reseteado correctamente");
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



function showTab(tab){

currentTab=tab

// Actualizar resaltado de botones de tab
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    // Comprobar si el atributo onclick contiene el nombre de la pestaña exacta
    const onclickAttr = btn.getAttribute('onclick') || "";
    if (onclickAttr.includes(`'${tab}'`) || onclickAttr.includes(`"${tab}"`)) {
        btn.classList.add('active');
    }
});

document.getElementById("wall-chart-section").style.display="none"
document.getElementById("ranking-list").style.display="none"
document.getElementById("save-btn").style.display="none"
document.getElementById("rules-section").style.display="none"
document.getElementById("predictions-others-section").style.display="none"
document.getElementById("admin-section").style.display="none"

const phases = ['Grupos', '16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Final'];

if(tab==="Ranking"){

document.getElementById("ranking-list").style.display="block"
loadRanking()

}

if(tab==="Pronosticos"){

document.getElementById("predictions-others-section").style.display="block"
loadUserList()

}

if(tab==="Admin"){

document.getElementById("admin-section").style.display="block"
adminLoadUsers()
adminLoadMatches("Grupos")

}

if(tab==="Reglas"){

document.getElementById("rules-section").style.display="block"

}

if(phases.includes(tab)){

document.getElementById("wall-chart-section").style.display="block"
document.getElementById("save-btn").style.display="block"

console.log("Cargando fase:", tab)
renderWallChart(tab).catch(err => {
    console.error("Error en renderWallChart:", err)
    document.getElementById("groups-wall-container").innerHTML = `<div class="empty-msg">Error fatal: ${err.message}</div>`
})

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
        
        if (isGroups) {
            return g.length === 1 || g.includes("GRUPO"); 
        }
        
        const phase = filterPhase.toUpperCase();
        // Permitir que "SEMIFINAL" coincida con "SEMI" y viceversa
        if (phase === "SEMIFINAL" || phase === "SEMI") {
            return g === "SEMIFINAL" || g === "SEMI";
        }
        
        return g === phase || g.includes(phase);
    });

    if (isGroups && filteredMatches.length === 0) {
        filteredMatches = matches.filter(m => m.grupo);
    }

    const faseGuardada = filteredMatches.length > 0 && filteredMatches.every(m => 
        pronosticosUsuario.some(p => p.partido_id === m.id)
    );

    container.innerHTML=""

    if (filteredMatches.length === 0) {
        container.innerHTML = `<p class="empty-msg">No hay partidos programados para la fase: ${filterPhase.toUpperCase()}</p>`;
        return;
    }

    // Vista de Grupos (Grid)
    if (isGroups) {
        let grupos={}
        filteredMatches.forEach(m=>{
            if(!grupos[m.grupo]) grupos[m.grupo]=[]
            grupos[m.grupo].push(m)
        })

        Object.keys(grupos).forEach((g, index)=>{
            let rows=""
            grupos[g].forEach(m=>{
                const b=bets?.find(x=>x.partido_id===m.id)
                let resultClass = getResultClass(m, b);

                rows+=`
                    <div class="wall-match ${resultClass}">
                        <div class="team-left">
                            <img class="flag" src="${flagURL(m.equipo_a)}">
                            ${m.equipo_a}
                        </div>
                        <div class="score-inputs">
                            <input type="number" class="wall-input" data-id="${m.id}" data-side="a" ${faseGuardada ? "disabled":""} value="${b?.goles_a_user ?? ''}">
                            <span>-</span>
                            <input type="number" class="wall-input" data-id="${m.id}" data-side="b" ${faseGuardada ? "disabled":""} value="${b?.goles_b_user ?? ''}">
                        </div>
                        <div class="team-right">
                            ${m.equipo_b}
                            <img class="flag" src="${flagURL(m.equipo_b)}">
                        </div>
                    </div>
                `;
            })

            container.innerHTML+=`
                <div class="group-wall" style="animation-delay: ${index * 0.1}s">
                    <h3>GRUPO ${g}</h3>
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
                        <span>${m.equipo_a}</span>
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
                        <span>${m.equipo_b}</span>
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
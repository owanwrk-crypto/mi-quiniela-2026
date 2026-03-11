const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co'
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z'

const _sb = supabase.createClient(URL_SB, KEY_SB)

let currentTab="Grupos"
window.currentUser=null
let quinielaGuardada=false


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

document.getElementById("user-display").innerText=`JUGADOR: ${user.nombre}`

await checkQuinielaGuardada()
await updateGlobalStats()

showTab("Grupos")

}



async function updateGlobalStats(){

const {data:perfiles} = await _sb.from("perfiles").select("*")
const {data:matches} = await _sb.from("partidos").select("*")
const {data:pronosticos} = await _sb.from("pronosticos").select("*")

if(!perfiles || !matches || !pronosticos) return

let ranking = []

perfiles.forEach(p=>{

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
else if(b.goles_b_user > b.goles_b_user) user="B"
else user="E"

if(real === user){

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

})

ranking.sort((a,b)=> b.puntos - a.puntos)

const myData = ranking.find(r => r.id === window.currentUser.id)
const myRank = ranking.findIndex(r => r.id === window.currentUser.id) + 1

if(myData){

document.getElementById("stat-points").innerText = myData.puntos
document.getElementById("stat-rank").innerText = `#${myRank}`
document.getElementById("stat-accuracy").innerText = `${myData.porcentaje}%`

}

}



async function checkQuinielaGuardada(){

const {data,error}=await _sb
.from("pronosticos")
.select("*")
.eq("perfil_id",window.currentUser.id)
.limit(1)

if(data && data.length>0){

quinielaGuardada=true

}

}



function showTab(tab){

currentTab=tab

// Actualizar resaltado de botones de tab
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.innerText.includes(tab.toUpperCase())) {
        btn.classList.add('active');
    }
});

document.getElementById("wall-chart-section").style.display="none"
document.getElementById("ranking-list").style.display="none"
document.getElementById("save-btn").style.display="none"
document.getElementById("rules-section").style.display="none"
document.getElementById("predictions-others-section").style.display="none"

const phases = ['Grupos', '16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Final'];

if(tab==="Ranking"){

document.getElementById("ranking-list").style.display="block"
loadRanking()

}

if(tab==="Pronosticos"){

document.getElementById("predictions-others-section").style.display="block"
loadUserList()

}

if(tab==="Reglas"){

document.getElementById("rules-section").style.display="block"

}

if(phases.includes(tab)){

document.getElementById("wall-chart-section").style.display="block"

if(!quinielaGuardada){

document.getElementById("save-btn").style.display="block"

}

renderWallChart(tab)

}

}



async function loadUserList() {
    const select = document.getElementById("user-search");
    const { data: users, error } = await _sb.from("perfiles").select("id, nombre").order("nombre");
    
    if (error) return;
    
    // Guardar la opción actual para no perderla al refrescar la lista
    const currentVal = select.value;
    select.innerHTML = '<option value="">Selecciona un jugador...</option>';
    
    users.forEach(u => {
        // No mostrar al usuario actual si quieres, o dejarlo
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

            rows += `
                <div class="wall-match ${resultClass}">
                    <div class="team-left">
                        <img class="flag" src="${flagURL(m.equipo_a)}">
                        ${m.equipo_a}
                    </div>
                    <div class="score-display">
                        <span class="score-val">${b?.goles_a_user ?? '-'}</span>
                        <span>:</span>
                        <span class="score-val">${b?.goles_b_user ?? '-'}</span>
                    </div>
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

const {data:matches,error:e1}=await _sb
.from("partidos")
.select("*")
.order("id")

const {data:bets,error:e2}=await _sb
.from("pronosticos")
.select("*")
.eq("perfil_id",window.currentUser.id)

if(e1 || e2){

console.log(e1,e2)
container.innerHTML="Error cargando partidos"
return

}

// Filtrar según la fase
let filteredMatches = matches.filter(m => {
    if (filterPhase === "Grupos") return m.grupo.length === 1;
    return m.grupo.toLowerCase() === filterPhase.toLowerCase();
});

let grupos={}

filteredMatches.forEach(m=>{

if(!grupos[m.grupo]) grupos[m.grupo]=[]
grupos[m.grupo].push(m)

})

container.innerHTML=""

if (filteredMatches.length === 0) {
    container.innerHTML = `<p class="empty-msg">No hay partidos programados para la fase: ${filterPhase}</p>`;
    return;
}

Object.keys(grupos).forEach((g, index)=>{

let rows=""

grupos[g].forEach(m=>{

const b=bets?.find(x=>x.partido_id===m.id)

let resultClass=""

if(m.goles_a!=null && m.goles_b!=null && b){

if(b.goles_a_user==m.goles_a && b.goles_b_user==m.goles_b){

resultClass="correct"

}else{

let real=""
let user=""

if(m.goles_a>m.goles_b) real="A"
else if(m.goles_b>m.goles_a) real="B"
else real="E"

if(b.goles_a_user>b.goles_b_user) user="A"
else if(b.goles_b_user>b.goles_a_user) user="B"
else user="E"

if(real===user){

resultClass="close"

}else{

resultClass="wrong"

}

}

}

rows+=`

<div class="wall-match ${resultClass}">

<div class="team-left">
<img class="flag" src="${flagURL(m.equipo_a)}">
${m.equipo_a}
</div>

<div class="score-inputs">

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="a"
${quinielaGuardada ? "disabled":""}
value="${b?.goles_a_user ?? ''}">

<span>-</span>

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="b"
${quinielaGuardada ? "disabled":""}
value="${b?.goles_b_user ?? ''}">

</div>

<div class="team-right">

${m.equipo_b}

<img class="flag" src="${flagURL(m.equipo_b)}">

</div>

</div>

`

})

container.innerHTML+=`

<div class="group-wall" style="animation-delay: ${index * 0.1}s">

<h3>GRUPO ${g}</h3>

${rows}

</div>

`

})

}



async function savePredictions(){

if(quinielaGuardada){

alert("La quiniela ya fue guardada")
return

}

const inputs=document.querySelectorAll(".wall-input")

let bets={}

inputs.forEach(i=>{

const id=i.dataset.id
const side=i.dataset.side

if(!bets[id]) bets[id]={}

bets[id][side]=i.value

})

for(const matchId in bets){

const a=bets[matchId].a
const b=bets[matchId].b

if(a==="" || b==="") continue

await _sb.from("pronosticos").insert({

perfil_id:window.currentUser.id,
partido_id:matchId,
goles_a_user:a,
goles_b_user:b

})

}

quinielaGuardada=true

alert("Quiniela guardada")

showTab("Grupos")

}



async function loadRanking(){

const tbody = document.getElementById("ranking-body")
const podium = document.getElementById("top3-podium")

tbody.innerHTML = "<tr><td colspan='5'>Cargando ranking...</td></tr>"

const {data:perfiles,error:e1} = await _sb.from("perfiles").select("*")
const {data:matches,error:e2} = await _sb.from("partidos").select("*")
const {data:pronosticos,error:e3} = await _sb.from("pronosticos").select("*")

if(e1 || e2 || e3){

console.log(e1,e2,e3)
tbody.innerHTML="<tr><td colspan='5'>Error cargando ranking</td></tr>"
return

}

let ranking = []

perfiles.forEach(p=>{

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
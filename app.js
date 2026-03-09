const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';

const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentTab="Grupos";
window.currentUser=null;
let quinielaGuardada=false;



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
"Noruega":"no",
"Dinamarca":"dk",
"Suecia":"se",
"Polonia":"pl",
"Ucrania":"ua",
"Albania":"al",
"República Checa":"cz",
"Eslovaquia":"sk",
"Rumania":"ro",
"Turquía":"tr",
"Kosovo":"xk",

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
"Uzbekistán":"uz",
"Jordania":"jo",
"Irak":"iq",

"Australia":"au",
"Nueva Zelanda":"nz",
"Nueva Caledonia":"nc",

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

const {data:user}=await _sb
.from("perfiles")
.select("*")
.eq("nombre",name)
.eq("pin",pin)
.single()

if(!user){

alert("Usuario o PIN incorrecto")
return

}

window.currentUser=user

document.getElementById("login-section").style.display="none"
document.getElementById("main-section").style.display="block"

document.getElementById("user-display").innerText=`JUGADOR: ${user.nombre}`

checkQuinielaGuardada()

showTab("Grupos")

}



async function checkQuinielaGuardada(){

const {data}=await _sb
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

document.getElementById("wall-chart-section").style.display="none"
document.getElementById("ranking-list").style.display="none"
document.getElementById("save-btn").style.display="none"

if(tab==="Ranking"){

document.getElementById("ranking-list").style.display="block"
loadRanking()

}

if(tab==="Grupos"){

document.getElementById("wall-chart-section").style.display="block"

if(!quinielaGuardada){

document.getElementById("save-btn").style.display="block"

}

renderWallChart()

}

}



async function renderWallChart(){

const container=document.getElementById("groups-wall-container")

const {data:matches}=await _sb
.from("partidos")
.select("*")
.order("grupo")

const {data:bets}=await _sb
.from("pronosticos")
.select("*")
.eq("perfil_id",window.currentUser.id)

let grupos={}

matches.forEach(m=>{

if(!grupos[m.grupo]) grupos[m.grupo]=[]

grupos[m.grupo].push(m)

})

container.innerHTML=""

Object.keys(grupos).forEach(g=>{

let rows=""

grupos[g].forEach(m=>{

const b=bets?.find(x=>x.partido_id===m.id)

let resultClass=""

if(m.goles_a!=null && m.goles_b!=null && b){

if(b.goles_a_user==m.goles_a && b.goles_b_user==m.goles_b){

resultClass="correct"

}

else{

resultClass="wrong"

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

<div class="group-wall">

<h3>GRUPO ${g}</h3>

${rows}

</div>

`

})

}



async function savePredictions(){

if(quinielaGuardada){

alert("Tu quiniela ya fue guardada y no puede modificarse.")
return

}

const confirmar=confirm("¿Estás seguro de guardar tu quiniela?\n\nUna vez guardada NO podrás modificar tus pronósticos.")

if(!confirmar){

return

}

const inputs=document.querySelectorAll(".wall-input")

let predictions=[]
let ids=new Set()

inputs.forEach(i=>{

const id=i.dataset.id

if(!ids.has(id)){

const a=document.querySelector(`.wall-input[data-id="${id}"][data-side="a"]`).value
const b=document.querySelector(`.wall-input[data-id="${id}"][data-side="b"]`).value

if(a!=="" && b!==""){

predictions.push({

perfil_id:window.currentUser.id,
partido_id:id,
goles_a_user:parseInt(a),
goles_b_user:parseInt(b)

})

}

ids.add(id)

}

})

if(predictions.length===0){

alert("Debes ingresar al menos un pronóstico")

return

}

const {error}=await _sb
.from("pronosticos")
.upsert(predictions,{onConflict:"perfil_id,partido_id"})

if(error){

alert("Error guardando pronósticos")

}

else{

alert("Tu quiniela fue guardada correctamente")

quinielaGuardada=true

showTab("Grupos")

}

}



async function loadRanking(){

const body=document.getElementById("ranking-body")

const {data}=await _sb
.from("perfiles")
.select("nombre,puntos")
.order("puntos",{ascending:false})

body.innerHTML=data.map((p,i)=>`

<tr>

<td>${i+1}</td>

<td>${p.nombre}</td>

<td>${p.puntos || 0}</td>

</tr>

`).join("")

}
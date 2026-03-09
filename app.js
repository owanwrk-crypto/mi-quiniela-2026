const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';

const _sb = supabase.createClient(URL_SB, KEY_SB);

window.currentUser = null;

/* =========================
   BANDERAS
========================= */

function getFlag(team){

const flags={

"México":"mx",
"Estados Unidos":"us",
"Canadá":"ca",

"Argentina":"ar",
"Brasil":"br",
"Uruguay":"uy",
"Paraguay":"py",
"Colombia":"co",
"Ecuador":"ec",

"España":"es",
"Francia":"fr",
"Alemania":"de",
"Inglaterra":"gb",
"Portugal":"pt",
"Croacia":"hr",
"Suiza":"ch",
"Bélgica":"be",
"Países Bajos":"nl",

"Japón":"jp",
"República de Corea":"kr",
"Irán":"ir",
"Arabia Saudí":"sa",
"Catar":"qa",

"Australia":"au",
"Nueva Zelanda":"nz",

"Marruecos":"ma",
"Egipto":"eg",
"Sudáfrica":"za",
"Costa de Marfil":"ci",
"Senegal":"sn",
"Ghana":"gh",

"Curazao":"cw",
"Panamá":"pa",
"Haití":"ht"

}

return flags[team] || "un"

}

/* =========================
   LOGIN
========================= */

async function handleLogin(){

const name=document.getElementById('login-name').value;
const pin=document.getElementById('login-pin').value;

const {data:user,error}=await _sb
.from('perfiles')
.select('*')
.eq('nombre',name)
.eq('pin',pin)
.single();

if(error || !user){

alert("Usuario o PIN incorrecto");
return;

}

window.currentUser=user;

document.getElementById('login-section').style.display='none';
document.getElementById('main-section').style.display='block';

document.getElementById('user-display').innerText=
`JUGADOR: ${user.nombre}`;

renderWallChart();

}

/* =========================
   TABS
========================= */

function showTab(tab){

document.getElementById('wall-chart-section').style.display='none';
document.getElementById('ranking-list').style.display='none';

if(tab==="Ranking"){

document.getElementById('ranking-list').style.display='block';
loadRanking();

}else{

document.getElementById('wall-chart-section').style.display='block';
renderWallChart();

}

}

/* =========================
   MOSTRAR PARTIDOS
========================= */

async function renderWallChart(){

const container=document.getElementById('groups-wall-container');

const {data:matches}=await _sb
.from('partidos')
.select('*')
.order('grupo',{ascending:true});

const {data:bets}=await _sb
.from('pronosticos')
.select('*')
.eq('perfil_id',window.currentUser.id);

let grupos={};

matches.forEach(m=>{

if(!grupos[m.grupo]) grupos[m.grupo]=[];
grupos[m.grupo].push(m);

});

container.innerHTML="";

Object.keys(grupos).forEach(g=>{

let rows="";

grupos[g].forEach(m=>{

const bet=bets?.find(x=>x.partido_id===m.id);

rows+=`

<div class="wall-match">

<div class="team-left">

<img class="flag"
src="https://flagcdn.com/w40/${getFlag(m.equipo_a)}.png">

${m.equipo_a}

</div>

<div class="score-inputs">

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="a"
value="${bet?.goles_a_user ?? ''}">

<span>-</span>

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="b"
value="${bet?.goles_b_user ?? ''}">

</div>

<div class="team-right">

${m.equipo_b}

<img class="flag"
src="https://flagcdn.com/w40/${getFlag(m.equipo_b)}.png">

</div>

</div>

`;

});

container.innerHTML+=`

<div class="group-wall">

<h3>GRUPO ${g}</h3>

${rows}

</div>

`;

});

}

/* =========================
   GUARDAR PRONOSTICOS
========================= */

async function savePredictions(){

const inputs=document.querySelectorAll(".wall-input");

let predictions=[];
let processed=new Set();

inputs.forEach(i=>{

const id=i.dataset.id;

if(!processed.has(id)){

const a=document.querySelector(`.wall-input[data-id="${id}"][data-side="a"]`).value;
const b=document.querySelector(`.wall-input[data-id="${id}"][data-side="b"]`).value;

if(a!=="" && b!==""){

predictions.push({

perfil_id:window.currentUser.id,
partido_id:id,
goles_a_user:parseInt(a),
goles_b_user:parseInt(b)

});

}

processed.add(id);

}

});

if(predictions.length===0){

alert("Ingresa al menos un resultado");
return;

}

const {error}=await _sb
.from("pronosticos")
.upsert(predictions,{onConflict:"perfil_id,partido_id"});

if(error){

alert("Error guardando");

}else{

alert("Pronósticos guardados");

}

}

/* =========================
   RANKING
========================= */

async function loadRanking(){

const body=document.getElementById("ranking-body");

const {data}=await _sb
.from("perfiles")
.select("nombre,puntos")
.order("puntos",{ascending:false});

body.innerHTML=data.map((p,i)=>`

<tr>

<td>${i+1}</td>
<td>${p.nombre}</td>
<td>${p.puntos || 0}</td>

</tr>

`).join("");

}
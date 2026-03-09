const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';

const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;


/* =========================
   FUNCION BANDERAS
========================= */

function getFlag(team){

const flags={

"Mexico":"mx",
"México":"mx",
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
"Corea del Sur":"kr",
"República de Corea":"kr",
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


/* =========================
   LOGIN
========================= */

async function handleLogin(){

const name=document.getElementById('login-name').value;
const pin=document.getElementById('login-pin').value;

const {data:user}=await _sb
.from('perfiles')
.select('*')
.eq('nombre',name)
.eq('pin',pin)
.single();

if(!user){

alert("Usuario incorrecto");
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

if(tab==='Ranking'){

document.getElementById('ranking-list').style.display='block';
loadRanking();

}

else{

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
.order('grupo');

const {data:bets}=await _sb
.from('pronosticos')
.select('*')
.eq('perfil_id',window.currentUser.id);

let grupos={};

matches.forEach(m=>{

if(!grupos[m.grupo]) grupos[m.grupo]=[];
grupos[m.grupo].push(m);

});

container.innerHTML='';

Object.keys(grupos).forEach(g=>{

let rows='';

grupos[g].forEach(m=>{

const b=bets?.find(x=>x.partido_id===m.id);

rows+=`

<div class="wall-match">

<div class="team-left">

<img class="flag" src="https://flagcdn.com/w40/${getFlag(m.equipo_a)}.png">

${m.equipo_a}

</div>

<div class="score-inputs">

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="a"
value="${b?.goles_a_user ?? ''}">

<span>-</span>

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="b"
value="${b?.goles_b_user ?? ''}">

</div>

<div class="team-right">

${m.equipo_b}

<img class="flag" src="https://flagcdn.com/w40/${getFlag(m.equipo_b)}.png">

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

const inputs=document.querySelectorAll('.wall-input');

let predictions=[];
let ids=new Set();

inputs.forEach(i=>{

const id=i.dataset.id;

if(!ids.has(id)){

const a=document.querySelector(`.wall-input[data-id="${id}"][data-side="a"]`).value;
const b=document.querySelector(`.wall-input[data-id="${id}"][data-side="b"]`).value;

if(a!=='' && b!==''){

predictions.push({

perfil_id:window.currentUser.id,
partido_id:id,
goles_a_user:parseInt(a),
goles_b_user:parseInt(b)

});

}

ids.add(id);

}

});

await _sb
.from('pronosticos')
.upsert(predictions,{onConflict:'perfil_id,partido_id'});

alert("Pronósticos guardados");

}


/* =========================
   RANKING
========================= */

async function loadRanking(){

const body=document.getElementById('ranking-body');

const {data}=await _sb
.from('perfiles')
.select('nombre,puntos')
.order('puntos',{ascending:false});

body.innerHTML=data.map((p,i)=>`

<tr>

<td>${i+1}</td>
<td>${p.nombre}</td>
<td>${p.puntos || 0}</td>

</tr>

`).join('');

}
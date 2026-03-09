const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';

const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase='Grupos';

window.currentUser=null;



function bandera(pais){

const map={

"Argentina":"ar",
"Brasil":"br",
"Uruguay":"uy",
"España":"es",
"Francia":"fr",
"Alemania":"de",
"Inglaterra":"gb",
"Portugal":"pt",
"Estados Unidos":"us",
"México":"mx",
"Canadá":"ca",
"Japón":"jp",
"Australia":"au",
"Países Bajos":"nl",
"Bélgica":"be",
"Croacia":"hr",
"Suiza":"ch",
"Senegal":"sn",
"Marruecos":"ma",
"Egipto":"eg",
"Argelia":"dz",
"Colombia":"co",
"Paraguay":"py",
"Ecuador":"ec"

};

return `https://flagcdn.com/w40/${map[pais] || 'un'}.png`;

}



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

<img class="flag" src="${bandera(m.equipo_a)}">

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

<img class="flag" src="${bandera(m.equipo_b)}">

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
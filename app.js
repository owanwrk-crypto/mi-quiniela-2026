const URL_SB = 'https://hamqbcccmefflpkurouu.supabase.co';
const KEY_SB = 'sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z';

const _sb = supabase.createClient(URL_SB, KEY_SB);

let currentFase = 'Grupos';
window.currentUser = null;



/* BANDERAS */

function bandera(pais){

const map = {
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
"Corea del Sur":"kr",
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
}

return `https://flagcdn.com/w40/${map[pais] || 'un'}.png`

}



/* LOGIN */

async function handleLogin(){

const name=document.getElementById('login-name').value.trim();
const pin=document.getElementById('login-pin').value.trim();

if(!name || !pin){
alert("Ingresa usuario y PIN");
return;
}

const {data:user,error} = await _sb
.from('perfiles')
.select('*')
.eq('nombre',name)
.eq('pin',pin)
.single();

if(error || !user){
alert("Usuario o PIN incorrectos");
return;
}

window.currentUser=user;

document.getElementById('login-section').style.display='none';
document.getElementById('main-section').style.display='block';

document.getElementById('user-display').innerText =
`JUGADOR: ${user.nombre.toUpperCase()}`;

activarRankingEnVivo();

showTab('Grupos');

}



/* LOGOUT */

function logout(){
window.currentUser=null;
location.reload();
}



/* CAMBIAR TAB */

function showTab(fase){

currentFase=fase;

const sections=[
'match-list',
'ranking-list',
'wall-chart-section'
];

sections.forEach(s=>{
const el=document.getElementById(s);
if(el) el.style.display='none';
});

document.querySelectorAll('.tab-btn')
.forEach(b=>b.classList.remove('active'));

if(fase==='Ranking'){

document.getElementById('ranking-list').style.display='block';
loadRanking();

}

else if(fase==='WallChart'){

document.getElementById('wall-chart-section').style.display='block';
renderWallChart();

}

else{

document.getElementById('match-list').style.display='block';
loadMatches(fase);

}

}



/* CONTADOR REGRESIVO */

function countdown(fecha){

const now = new Date();
const match = new Date(fecha);

const diff = match - now;

if(diff <= 0) return "EN JUEGO";

const h = Math.floor(diff/3600000);
const m = Math.floor((diff%3600000)/60000);

return `${h}h ${m}m`;

}



/* CARGAR PARTIDOS */

async function loadMatches(fase){

const container=document.getElementById('match-list');

container.innerHTML="Cargando partidos...";

const {data:matches} = await _sb
.from('partidos')
.select('*')
.ilike('fase',fase)
.order('fecha',{ascending:true});

const {data:bets} = await _sb
.from('pronosticos')
.select('*')
.eq('perfil_id',window.currentUser.id);

container.innerHTML = matches.map(m=>{

const b=bets?.find(x=>x.partido_id===m.id);

const now=new Date();
const matchDate=new Date(m.fecha);

const disabled = now>=matchDate ? 'disabled' : '';

return `

<div class="match-card">

<div style="text-align:right;font-weight:bold">

<img src="${bandera(m.equipo_a)}" width="22">

${m.equipo_a}

</div>

<div style="display:flex;gap:5px;justify-content:center">

<input type="number"
id="a-${m.id}"
class="score-box"
value="${b?.goles_a_user ?? ''}"
${disabled}>

<input type="number"
id="b-${m.id}"
class="score-box"
value="${b?.goles_b_user ?? ''}"
${disabled}>

</div>

<div style="font-weight:bold">

${m.equipo_b}

<img src="${bandera(m.equipo_b)}" width="22">

</div>

<div style="grid-column:1/-1;text-align:center;font-size:12px;color:#00f2ff">

⏳ ${countdown(m.fecha)}

</div>

</div>

`;

}).join('');

}



/* WALL CHART */

async function renderWallChart(){

const container=document.getElementById('groups-wall-container');

const {data:matches} = await _sb
.from('partidos')
.select('*')
.ilike('fase','Grupos')
.order('grupo');

const {data:bets} = await _sb
.from('pronosticos')
.select('*')
.eq('perfil_id',window.currentUser.id);

const grupos={};

matches.forEach(m=>{
if(!grupos[m.grupo]) grupos[m.grupo]=[];
grupos[m.grupo].push(m);
});

container.innerHTML='';

Object.keys(grupos).sort().forEach(g=>{

let rows='';

grupos[g].forEach(m=>{

const b=bets?.find(x=>x.partido_id===m.id);

rows+=`

<div class="match-row-wall">

<span>${m.equipo_a}</span>

<div>

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="a"
value="${b?.goles_a_user ?? ''}">

<input type="number"
class="wall-input"
data-id="${m.id}"
data-side="b"
value="${b?.goles_b_user ?? ''}">

</div>

<span>${m.equipo_b}</span>

</div>

`;

});

container.innerHTML+=`

<div class="group-wall-block">

<h4>GRUPO ${g}</h4>

${rows}

</div>

`;

});

}



/* GUARDAR PRONOSTICOS */

async function savePredictions(){

const inputs=document.querySelectorAll('.score-box');

const predictions=[];

inputs.forEach(input=>{

const id=input.id.split('-')[1];

const gA=document.getElementById(`a-${id}`).value;
const gB=document.getElementById(`b-${id}`).value;

if(gA!=='' && gB!==''){

predictions.push({

perfil_id:window.currentUser.id,
partido_id:id,
goles_a_user:parseInt(gA),
goles_b_user:parseInt(gB)

});

}

});

if(predictions.length===0){
alert("Ingresa resultados");
return;
}

const {error}=await _sb
.from('pronosticos')
.upsert(predictions,{onConflict:'perfil_id,partido_id'});

if(error){

alert("Error al guardar");

}else{

alert("Pronósticos guardados");

showTab(currentFase);

}

}



/* RANKING */

async function loadRanking(){

const body=document.getElementById('ranking-body');

body.innerHTML="Cargando ranking...";

const {data}=await _sb
.from('perfiles')
.select('nombre,puntos_totales')
.order('puntos_totales',{ascending:false});

body.innerHTML=data.map((p,i)=>`

<tr>

<td>${i+1}</td>

<td>${p.nombre}</td>

<td style="color:#00ff9c;font-weight:bold">
${p.puntos_totales ?? 0}
</td>

</tr>

`).join('');

}



/* RANKING EN VIVO */

function activarRankingEnVivo(){

_sb.channel('ranking-live')

.on(
'postgres_changes',
{
event:'UPDATE',
schema:'public',
table:'perfiles'
},
payload=>{

if(currentFase==='Ranking'){
loadRanking();
}

}

)

.subscribe()

}



/* TABLA DE GRUPOS */

async function tablaGrupo(grupo){

const {data:matches} = await _sb
.from('partidos')
.select('*')
.eq('grupo',grupo);

let tabla={};

matches.forEach(m=>{

if(!tabla[m.equipo_a])
tabla[m.equipo_a]={pts:0,pj:0,gf:0,gc:0};

if(!tabla[m.equipo_b])
tabla[m.equipo_b]={pts:0,pj:0,gf:0,gc:0};

if(m.goles_a!=null){

tabla[m.equipo_a].pj++;
tabla[m.equipo_b].pj++;

tabla[m.equipo_a].gf+=m.goles_a;
tabla[m.equipo_a].gc+=m.goles_b;

tabla[m.equipo_b].gf+=m.goles_b;
tabla[m.equipo_b].gc+=m.goles_a;

if(m.goles_a>m.goles_b) tabla[m.equipo_a].pts+=3;
else if(m.goles_b>m.goles_a) tabla[m.equipo_b].pts+=3;
else{
tabla[m.equipo_a].pts+=1;
tabla[m.equipo_b].pts+=1;
}

}

});

return Object.entries(tabla)
.map(([team,stats])=>({

team,
...stats,
dg:stats.gf-stats.gc

}))
.sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf);

}
/* TABLA DE POSICIONES POR GRUPO */

async function mostrarTablaGrupo(grupo){

const {data:matches} = await _sb
.from('partidos')
.select('*')
.eq('grupo',grupo);

let tabla = {};

matches.forEach(m=>{

if(!tabla[m.equipo_a]){
tabla[m.equipo_a]={pj:0,pts:0,gf:0,gc:0};
}

if(!tabla[m.equipo_b]){
tabla[m.equipo_b]={pj:0,pts:0,gf:0,gc:0};
}

if(m.goles_a !== null && m.goles_b !== null){

tabla[m.equipo_a].pj++;
tabla[m.equipo_b].pj++;

tabla[m.equipo_a].gf += m.goles_a;
tabla[m.equipo_a].gc += m.goles_b;

tabla[m.equipo_b].gf += m.goles_b;
tabla[m.equipo_b].gc += m.goles_a;

if(m.goles_a > m.goles_b){

tabla[m.equipo_a].pts += 3;

}

else if(m.goles_b > m.goles_a){

tabla[m.equipo_b].pts += 3;

}

else{

tabla[m.equipo_a].pts += 1;
tabla[m.equipo_b].pts += 1;

}

}

});

let lista = Object.entries(tabla).map(([team,data])=>({

team,
...data,
dg:data.gf-data.gc

}));

lista.sort((a,b)=> b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

return lista;

}
async function renderTablaGrupo(grupo){

const tabla = await mostrarTablaGrupo(grupo);

return `

<table class="tabla-grupo">

<tr>

<th>Equipo</th>
<th>PTS</th>
<th>PJ</th>
<th>GF</th>
<th>GC</th>
<th>DG</th>

</tr>

${tabla.map(t=>`

<tr>

<td>${t.team}</td>
<td>${t.pts}</td>
<td>${t.pj}</td>
<td>${t.gf}</td>
<td>${t.gc}</td>
<td>${t.dg}</td>

</tr>

`).join('')}

</table>

`;

}
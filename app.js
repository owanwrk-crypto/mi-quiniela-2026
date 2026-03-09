const URL_SB = "https://hamqbcccmefflpkurouu.supabase.co"
const KEY_SB = "sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z"

const { createClient } = supabase
const _sb = createClient(URL_SB, KEY_SB)

window.currentUser = null
let quinielaGuardada = false


// LOGIN

async function handleLogin(){

const name = document.getElementById("login-name").value
const pin = document.getElementById("login-pin").value

const { data:user, error } = await _sb
.from("perfiles")
.select("*")
.eq("nombre", name)
.eq("pin", pin)
.single()

if(error || !user){

alert("Usuario o PIN incorrecto")
return

}

window.currentUser = user

document.getElementById("login-section").style.display="none"
document.getElementById("main-section").style.display="block"

document.getElementById("user-display").innerText="JUGADOR: "+user.nombre

showTab("Grupos")

}



// CAMBIO DE PESTAÑAS

function showTab(tab){

document.getElementById("wall-chart-section").style.display="none"
document.getElementById("ranking-list").style.display="none"

if(tab==="Grupos"){

document.getElementById("wall-chart-section").style.display="block"
renderWallChart()

}

if(tab==="Ranking"){

document.getElementById("ranking-list").style.display="block"
loadRanking()

}

}



// CARGAR PARTIDOS (GRUPOS)

async function renderWallChart(){

const container = document.getElementById("groups-wall-container")

container.innerHTML="Cargando partidos..."

const { data:matches, error } = await _sb
.from("partidos")
.select("*")
.order("grupo")

if(error){

console.log(error)
container.innerHTML="Error cargando partidos"
return

}

let grupos = {}

matches.forEach(m=>{

if(!grupos[m.grupo]) grupos[m.grupo]=[]
grupos[m.grupo].push(m)

})

container.innerHTML=""

Object.keys(grupos).forEach(g=>{

let rows=""

grupos[g].forEach(m=>{

rows+=`

<div class="match">

<div class="team">
${m.equipo_a}
</div>

<div class="score">
<input type="number" class="score-input" data-id="${m.id}" data-side="a">
-
<input type="number" class="score-input" data-id="${m.id}" data-side="b">
</div>

<div class="team">
${m.equipo_b}
</div>

</div>

`

})

container.innerHTML+=`

<div class="group">

<h3>GRUPO ${g}</h3>

${rows}

</div>

`

})

}



// GUARDAR PRONOSTICOS

async function savePredictions(){

const inputs = document.querySelectorAll(".score-input")

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

alert("Pronósticos guardados")

}



// CARGAR RANKING

async function loadRanking(){

const tbody = document.getElementById("ranking-body")
const podium = document.getElementById("top3-podium")

tbody.innerHTML="<tr><td colspan='5'>Cargando ranking...</td></tr>"

const { data:perfiles, error:e1 } = await _sb.from("perfiles").select("*")
const { data:matches, error:e2 } = await _sb.from("partidos").select("*")
const { data:pronosticos, error:e3 } = await _sb.from("pronosticos").select("*")

if(e1 || e2 || e3){

console.log(e1,e2,e3)
tbody.innerHTML="<tr><td colspan='5'>Error cargando ranking</td></tr>"
return

}

let ranking=[]

perfiles.forEach(p=>{

let puntos=0
let total=0
let aciertos=0

const bets = pronosticos.filter(x=>x.perfil_id===p.id)

bets.forEach(b=>{

const m = matches.find(x=>x.id===b.partido_id)

if(!m) return
if(m.goles_a==null || m.goles_b==null) return

total++

if(b.goles_a_user==m.goles_a && b.goles_b_user==m.goles_b){

puntos+=3
aciertos++

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



// PODIUM

podium.innerHTML=""

ranking.slice(0,3).forEach((p,i)=>{

let medal=["🥇","🥈","🥉"][i]

podium.innerHTML+=`

<div class="podium-player">
<div>${medal}</div>
<div>${p.nombre}</div>
<div>${p.puntos} pts</div>
</div>

`

})



// TABLA

tbody.innerHTML=""

ranking.forEach((r,i)=>{

let medal=["🥇","🥈","🥉"][i] || ""

tbody.innerHTML+=`

<tr>
<td>${i+1}</td>
<td>${medal}</td>
<td>${r.nombre}</td>
<td>${r.puntos}</td>
<td>${r.porcentaje}%</td>
</tr>

`

})

}
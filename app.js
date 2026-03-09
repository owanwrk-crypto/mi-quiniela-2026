const URL_SB = "https://hamqbcccmefflpkurouu.supabase.co"
const KEY_SB = "sb_publishable_t3-L72VE7ViAc4D_0-noqg_Uhdgnn6Z"

const { createClient } = supabase
const _sb = createClient(URL_SB, KEY_SB)

window.currentUser = null
let quinielaGuardada = false


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



function showTab(tab){

document.getElementById("wall-chart-section").style.display="none"
document.getElementById("ranking-list").style.display="none"

if(tab==="Grupos"){

document.getElementById("wall-chart-section").style.display="block"

}

if(tab==="Ranking"){

document.getElementById("ranking-list").style.display="block"

loadRanking()

}

}



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



podium.innerHTML=""

ranking.slice(0,3).forEach((p,i)=>{

let medal=["🥇","🥈","🥉"][i]

podium.innerHTML+=`

<div>
<div>${medal}</div>
<div>${p.nombre}</div>
<div>${p.puntos} pts</div>
</div>

`

})



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
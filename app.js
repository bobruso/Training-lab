import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const SUPABASE_URL = "https://nnpvklaxhomarxszlclt.supabase.co";
const SUPABASE_KEY = "sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;
let cloudAnalyses = [];

const DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DAYSHORT=['D','L','M','X','J','V','S'];
const STORE='traininglab-v2';
const base={
 profile:{weight:70,height:1.74,age:38,protein:130},
 activities:[],weights:[],footballOverrides:{},restDays:{},fatigue:{}
};
let S=load();
function load(){try{const x=JSON.parse(localStorage.getItem(STORE));return Object.assign(structuredClone(base),x||{})}catch(e){return structuredClone(base)}}
function save(){localStorage.setItem(STORE,JSON.stringify(S));}
function iso(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mondayOf(d=new Date()){let x=new Date(d);let n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);x.setHours(0,0,0,0);return x}
function addDays(d,n){let x=new Date(d);x.setDate(x.getDate()+n);return x}
function dateEq(a,b){return iso(a)===iso(b)}
function actsOn(date){return S.activities.filter(a=>a.date===iso(date))}
function hasDone(date,type){return actsOn(date).some(a=>a.type===type)}
function footballScheduled(date){
 const k=iso(date); if(k in S.footballOverrides)return S.footballOverrides[k];
 return date.getDay()===1||date.getDay()===5;
}
function fatigueFor(date){return Number(S.fatigue[iso(date)]||3)}
function restSet(date){return !!S.restDays[iso(date)]}
function weekActivities(date=new Date()){
 const m=mondayOf(date), end=addDays(m,7);
 return S.activities.filter(a=>{let d=new Date(a.date+'T12:00:00');return d>=m&&d<end});
}
function counts(date=new Date()){
 const a=weekActivities(date); return {gym:a.filter(x=>x.type==='gym').length,run:a.filter(x=>x.type==='run').length,football:a.filter(x=>x.type==='football').length}
}
function recentHard(date){
 let prev=addDays(date,-1); return actsOn(prev).some(a=>a.type==='football'||(a.type==='gym'&&a.rpe>=8));
}
function nextFootballWithin(date,days=1){
 for(let i=1;i<=days;i++){if(footballScheduled(addDays(date,i)))return true}return false;
}
function adaptivePlan(date=new Date()){
 const d=date.getDay(), c=counts(date), fatigue=fatigueFor(date), hasFootball=footballScheduled(date);
 if(restSet(date))return {title:'Descanso',reason:'Has marcado hoy como descanso. Se preservan las pachangas y se recolocan sesiones desplazables.',kind:'rest'};
 if(hasFootball){
   let gymOkay = fatigue<=3 && !hasDone(date,'gym');
   return {title:(gymOkay?'Torso + ':'')+'Pachanga',reason:gymOkay?'Agrupamos carga: torso antes o separado varias horas y fútbol como trabajo intenso. Evitamos pierna dura.':'Hoy manda el fútbol. Con fatiga alta, omite fuerza y reserva energía para el partido.',kind:'football'};
 }
 if(fatigue>=5)return {title:'Descanso / paseo suave',reason:'Fatiga 5/5: hoy no compensa añadir carga. Recupera y vuelve a evaluar mañana.',kind:'rest'};
 if(fatigue===4 && recentHard(date))return {title:'Recuperación',reason:'Vienes cargado de una sesión exigente. Mejor paseo, movilidad y sueño.',kind:'rest'};
 // Priority: ensure 3 gym and 2 runs, respecting football next day and not leg gym before football
 if(c.gym<3){
   if(nextFootballWithin(date,1)){
     return {title:'Fuerza de torso',reason:'Falta fuerza semanal, pero mañana hay fútbol: torso sí; pierna dura no.',kind:'gym'};
   }
   if(c.run<2 && !recentHard(date) && (d===3||d===6)){
     return {title:'Fuerza + rodaje suave',reason:'Buen hueco para combinar hipertrofia con base aeróbica sin añadir alta intensidad.',kind:'combo'};
   }
   return {title:(d===3?'Pierna':'Fuerza full body/torso'),reason:'La prioridad pendiente de esta semana es completar el volumen de fuerza.',kind:'gym'};
 }
 if(c.run<2 && !recentHard(date)){
   return {title:'Rodaje aeróbico suave 40–60 min',reason:'Fuerza semanal cubierta. Falta trabajo de base para mejorar eficiencia cardiovascular.',kind:'run'};
 }
 return {title:'Descanso activo',reason:'Los objetivos principales de la semana están cubiertos. No añadimos carga por añadir.',kind:'rest'};
}
function loadLabel(plan){
 if(plan.kind==='football')return ['alta','350–425 g'];
 if(plan.kind==='combo')return ['media/alta','320–370 g'];
 if(plan.kind==='gym'||plan.kind==='run')return ['media','300–350 g'];
 return ['baja','250–300 g'];
}
const recipes=[
 ['desayuno','Avena + skyr + plátano',34,82,14,'Avena, leche, skyr, plátano y nueces.'],
 ['desayuno','Tostadas + huevos + fruta',32,68,20,'Pan, tomate, AOVE, 3 huevos, yogur y fruta.'],
 ['comida','Arroz con pollo',43,95,18,'Arroz abundante, pollo, verduras y AOVE.'],
 ['comida','Pasta boloñesa',42,105,19,'Pasta, carne magra, tomate y parmesano.'],
 ['comida','Lentejas + arroz + huevo',35,100,17,'Legumbre + cereal + huevo.'],
 ['merienda','Batido de crecimiento',38,72,16,'Leche, whey, plátano, avena y crema de cacahuete.'],
 ['merienda','Bocadillo + yogur + fruta',31,74,11,'Pavo o tortilla, yogur y fruta.'],
 ['cena','Salmón + patata',40,70,24,'Salmón, patata y ensalada.'],
 ['cena','Burritos de pollo y arroz',44,92,20,'Tortillas, pollo, arroz, frijoles y verduras.'],
 ['recena','Skyr + avena + fruta',28,46,8,'Proteína fácil antes de dormir.'],
 ['recena','Leche + plátano + tostada',20,58,10,'Sencillo si faltan calorías.']
];
function mealForHour(h){if(h>=5&&h<10)return'desayuno';if(h>=10&&h<15)return'comida';if(h>=15&&h<19)return'merienda';if(h>=19&&h<24)return'cena';return'recena'}
function recipeCard(r){let [meal,n,p,c,f,desc]=r;return `<div class="card recipe"><span class="tag">${meal}</span><h3>${n}</h3><div class="meta">P ${p} g · HC ${c} g · G ${f} g</div><p class="muted">${desc}</p><a class="btn alt" style="display:inline-block;text-decoration:none" target="_blank" href="https://cookidoo.es/search/es-ES?query=${encodeURIComponent(n)}">Buscar en Cookidoo</a></div>`}
function renderToday(){
 const n=new Date(), plan=adaptivePlan(n), [load,carbs]=loadLabel(plan), fat=fatigueFor(n), meal=mealForHour(n.getHours());
 document.getElementById('todayText').textContent='Hoy es '+DAYS[n.getDay()][0].toUpperCase()+DAYS[n.getDay()].slice(1);
 document.getElementById('clock').textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
 document.getElementById('mealNow').textContent='Por la hora, toca '+meal+'.';
 document.getElementById('mealLabel').textContent=meal+' · carga '+load;
 document.getElementById('todayPlan').textContent=plan.title;
 document.getElementById('todayReason').textContent=plan.reason;
 document.getElementById('weeklyLoad').textContent='Carga prevista: '+load;
 document.getElementById('carbPill').textContent='HC: '+carbs;
 document.getElementById('fatiguePill').textContent='Fatiga: '+fat+'/5';
 document.getElementById('fatigueSel').value=String(fat);
 document.getElementById('footballStatus').textContent=footballScheduled(n)?'Pachanga marcada para hoy.':'Sin pachanga marcada hoy.';
 let rr=recipes.filter(r=>r[0]===meal);document.getElementById('todayRecipes').innerHTML=rr.map(recipeCard).join('');
 updateWeigh();
}
window.setFootball=async function setFootball(v){
  S.footballOverrides[iso()]=v; save();
  if(currentUser){
    await supabase.from('daily_status').upsert({
      user_id: currentUser.id, day: iso(), football_override: v,
      fatigue: fatigueFor(new Date()), rest_requested: !!S.restDays[iso()]
    },{onConflict:'user_id,day'});
  }
  renderAll();
}
window.restToday=async function restToday(){
  S.restDays[iso()]=true; save();
  if(currentUser){
    await supabase.from('daily_status').upsert({
      user_id: currentUser.id, day: iso(), rest_requested: true,
      fatigue: fatigueFor(new Date()),
      football_override: (iso() in S.footballOverrides)?S.footballOverrides[iso()]:null
    },{onConflict:'user_id,day'});
  }
  document.getElementById('restResult').textContent='Descanso guardado. El plan semanal se ha recalculado.';
  renderAll();
}
window.saveFatigue=async function saveFatigue(){
  const f=Number(document.getElementById('fatigueSel').value);
  S.fatigue[iso()]=f; save();
  if(currentUser){
    await supabase.from('daily_status').upsert({
      user_id: currentUser.id, day: iso(), fatigue:f,
      rest_requested:!!S.restDays[iso()],
      football_override:(iso() in S.footballOverrides)?S.footballOverrides[iso()]:null
    },{onConflict:'user_id,day'});
  }
  renderAll();
}
window.markTodayDone=async function markTodayDone(){
 let p=adaptivePlan(new Date()), types=p.kind==='combo'?['gym','run']:[p.kind];
 types=types.filter(t=>['gym','run','football'].includes(t));
 if(!types.length){alert('Hoy no hay sesión que registrar automáticamente.');return}
 for(const t of types){
   const a={date:iso(),type:t,duration:t==='gym'?45:(t==='run'?45:60),rpe:t==='football'?8:(t==='gym'?7:4),distance:'',hr:'',hrmax:'',kcal:''};
   S.activities.push(a);
   if(currentUser){
     await supabase.from('activities').insert({
       user_id:currentUser.id,activity_date:a.date,activity_type:a.type,source:'manual',
       duration_min:a.duration,rpe:a.rpe
     });
   }
 }
 save();renderAll();alert('Sesión guardada.');
}
function renderWeek(){
 let m=mondayOf(), html='', c=counts();
 for(let i=0;i<7;i++){
   let d=addDays(m,i), plan=adaptivePlan(d), done=actsOn(d), isToday=dateEq(d,new Date());
   let football=footballScheduled(d);
   let events=[];
   if(football)events.push({t:'football',n:'Pachanga'});
   if(plan.kind==='combo'){events.push({t:'gym',n:'Fuerza'});events.push({t:'run',n:'Rodaje suave'})}
   else if(plan.kind==='gym')events.push({t:'gym',n:plan.title});
   else if(plan.kind==='run')events.push({t:'run',n:plan.title});
   else if(plan.kind==='rest')events.push({t:'rest',n:plan.title});
   // de-dupe football if plan title is football
   html+=`<div class="day ${isToday?'todayday':''}"><div class="dayname">${DAYS[d.getDay()]}</div><div class="daydate">${d.getDate()}</div>`+
    events.map(e=>`<div class="event ${e.t} ${done.some(x=>x.type===e.t)?'done':''}">${e.n}</div>`).join('')+
    (done.length?`<div class="small muted" style="margin-top:8px">${done.length} actividad(es) registrada(s)</div>`:'')+
    `</div>`;
 }
 document.getElementById('weekGrid').innerHTML=html;
 document.getElementById('gymCount').textContent=c.gym+'/3';document.getElementById('runCount').textContent=c.run+'/2';document.getElementById('footballCount').textContent=String(c.football);
 let notes=[];
 if(c.gym<3)notes.push(`Faltan ${3-c.gym} sesiones de fuerza.`);
 if(c.run<2)notes.push(`Faltan ${2-c.run} rodajes aeróbicos.`);
 if(c.football>=3)notes.push('Semana con 3+ pachangas: conviene recortar antes running que recuperación.');
 if(c.gym>=3&&c.run>=2)notes.push('Objetivos desplazables cubiertos: prioriza recuperación.');
 document.getElementById('plannerNotes').textContent=notes.join(' ');
}
window.saveActivity=async function saveActivity(){
 let a={date:document.getElementById('actDate').value,type:document.getElementById('actType').value,duration:+document.getElementById('actDur').value||0,rpe:+document.getElementById('actRpe').value||0,distance:+document.getElementById('actDist').value||0,hr:+document.getElementById('actHr').value||0,hrmax:+document.getElementById('actHrMax').value||0,kcal:+document.getElementById('actKcal').value||0};
 if(!a.date){alert('Pon la fecha.');return}
 S.activities.push(a); save();
 if(currentUser){
   const {error}=await supabase.from('activities').insert({
     user_id:currentUser.id,activity_date:a.date,activity_type:a.type,source:'manual',
     duration_min:a.duration,rpe:a.rpe,distance_km:a.distance||null,avg_hr:a.hr||null,max_hr:a.hrmax||null,calories:a.kcal||null
   });
   if(error) alert('Guardado local; error de nube: '+error.message);
 }
 renderAll();
}
window.saveWeight=async function saveWeight(){
 let d=document.getElementById('weightDate').value,w=+document.getElementById('weightKg').value;if(!d||!w)return;
 S.weights=S.weights.filter(x=>x.date!==d);S.weights.push({date:d,kg:w});save();
 if(currentUser){
   const {error}=await supabase.from('weigh_ins').upsert({user_id:currentUser.id,measured_on:d,weight_kg:w},{onConflict:'user_id,measured_on'});
   if(error) alert('Guardado local; error de nube: '+error.message);
 }
 renderAll();
}
function renderHistory(){
 let arr=[...S.activities].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
 document.getElementById('activityRows').innerHTML=arr.map(a=>`<tr><td>${a.date}</td><td>${a.type}</td><td>${a.duration||'—'}'</td><td>${a.rpe||'—'}</td><td>${a.distance?a.distance+' km':'—'}</td><td>${a.hr||'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">Todavía no hay actividades registradas.</td></tr>';
}
function updateProgress(){
 let seven=new Date();seven.setDate(seven.getDate()-6);seven.setHours(0,0,0,0);
 let a=S.activities.filter(x=>new Date(x.date+'T12:00:00')>=seven);
 let load=a.reduce((s,x)=>s+(Number(x.duration)||0)*(Number(x.rpe)||0),0), km=a.reduce((s,x)=>s+(Number(x.distance)||0),0);
 let football=a.filter(x=>x.type==='football'&&x.hr);let avg=football.length?Math.round(football.reduce((s,x)=>s+Number(x.hr),0)/football.length):'—';
 let weights=[...S.weights].sort((a,b)=>a.date.localeCompare(b.date));let cw=weights.length?weights.at(-1).kg:S.profile.weight;
 document.getElementById('currentWeight').textContent=Number(cw).toFixed(1)+' kg';document.getElementById('load7').textContent=Math.round(load);document.getElementById('km7').textContent=km.toFixed(1);document.getElementById('avgFootballHr').textContent=avg==='—'?'—':avg+' ppm';
 if(weights.length>=2){
   let first=weights[Math.max(0,weights.length-4)],last=weights.at(-1);let diff=last.kg-first.kg;
   document.getElementById('weightTrend').textContent=`Últimos registros: ${first.kg.toFixed(1)} → ${last.kg.toFixed(1)} kg (${diff>=0?'+':''}${diff.toFixed(1)} kg). Busca una subida lenta, no diaria.`;
 }
}
function updateWeigh(){
 const n=new Date(), isSun=n.getDay()===0;
 document.getElementById('weighTitle').textContent=isSun?'Hoy toca pesarse':'Próximo control';
 document.getElementById('weighText').textContent=isSun?'Idealmente al levantarte, tras ir al baño y antes de desayunar.':'Domingo por la mañana, en condiciones parecidas.';
}
window.registerFit=async function registerFit(){
 const f=document.getElementById('fitInput').files[0];
 const el=document.getElementById('fitResult');
 if(!f){el.textContent='Selecciona un archivo .fit.';return}
 if(!currentUser){el.textContent='Para analizar y guardar el FIT, inicia sesión primero.';return}
 el.textContent='1/3 · Subiendo FIT...';
 const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 const path=`${currentUser.id}/${Date.now()}-${safe}`;
 const {error:upErr}=await supabase.storage.from('fit-files').upload(path,f,{contentType:'application/octet-stream',upsert:false});
 if(upErr){el.textContent='Error al subir: '+upErr.message;return}

 el.textContent='2/3 · Creando actividad...';
 const {data:act,error:actErr}=await supabase.from('activities').insert({
   user_id:currentUser.id,activity_date:iso(),activity_type:'football',source:'fit',title:f.name
 }).select('id').single();
 if(actErr){el.textContent='FIT subido, pero no pude crear actividad: '+actErr.message;return}

 const {data:meta,error:metaErr}=await supabase.from('fit_files').insert({
   user_id:currentUser.id,activity_id:act.id,original_name:f.name,storage_path:path,file_size_bytes:f.size,parse_status:'pending'
 }).select('id').single();
 if(metaErr){el.textContent='FIT subido, pero falló el registro: '+metaErr.message;return}

 el.textContent='3/3 · Analizando GPS, FC y esfuerzos...';
 const {data:analysis,error:fnErr}=await supabase.functions.invoke('analyze-fit',{body:{fit_file_id:meta.id}});
 if(fnErr){
   el.textContent='El FIT está guardado, pero el análisis falló: '+fnErr.message;
   await loadCloud();
   return;
 }
 el.textContent=`Analizado: ${Number(analysis.summary?.distanceKm||0).toFixed(2)} km · FC ${analysis.summary?.avgHr??'—'} ppm · ${Math.round(analysis.summary?.highIntensityM||0)} m alta intensidad.`;
 await loadCloud();
 navTo('progreso');
}
window.navTo=function navTo(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===p));window.scrollTo({top:0,behavior:'smooth'})}
window.openRegister=function openRegister(){window.navTo('registro')}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>window.navTo(b.dataset.page)));

async function ensureProfile(){
 if(!currentUser)return;
 await supabase.from('profiles').upsert({
   user_id:currentUser.id,display_name:'Jorge',birth_year:1988,height_cm:174,weight_kg:70,target_weight_kg:73,protein_target_g:130,timezone:'Europe/Madrid'
 },{onConflict:'user_id'});
}
async function loadCloud(){
 if(!currentUser)return;
 const [acts,weights,statuses,analyses]=await Promise.all([
   supabase.from('activities').select('*').order('activity_date',{ascending:true}),
   supabase.from('weigh_ins').select('*').order('measured_on',{ascending:true}),
   supabase.from('daily_status').select('*'),
   supabase.from('activity_analysis').select('*').order('analyzed_at',{ascending:false})
 ]);
 if(!acts.error){
   S.activities=acts.data.map(a=>({date:a.activity_date,type:a.activity_type,duration:Number(a.duration_min)||0,rpe:Number(a.rpe)||0,distance:Number(a.distance_km)||0,hr:Number(a.avg_hr)||0,hrmax:Number(a.max_hr)||0,kcal:Number(a.calories)||0,fitName:a.source==='fit'?a.title:null}));
 }
 if(!weights.error) S.weights=weights.data.map(w=>({date:w.measured_on,kg:Number(w.weight_kg)}));
 if(!statuses.error){
   for(const s of statuses.data){
     if(s.fatigue)S.fatigue[s.day]=s.fatigue;
     if(s.rest_requested)S.restDays[s.day]=true;
     if(s.football_override!==null)S.footballOverrides[s.day]=s.football_override;
   }
 }
 if(!analyses.error) cloudAnalyses = analyses.data || [];
 save();renderAll();
}
function setCloudUI(){
 const status=document.getElementById('cloudStatus'),detail=document.getElementById('cloudDetail'),actions=document.getElementById('authActions');
 if(currentUser){
   status.textContent='Sincronizado';
   detail.textContent=currentUser.email+' · proyecto Training Lab';
   actions.innerHTML='<button class="btn alt" id="logoutBtn">Cerrar sesión</button>';
   document.getElementById('logoutBtn').onclick=async()=>{await supabase.auth.signOut();};
   document.getElementById('syncNotice').textContent='Datos sincronizados con Supabase. Puedes usar la misma cuenta desde móvil y PC.';
 }else{
   status.textContent='Modo local';
   detail.textContent='Tus datos se guardan en este navegador. Inicia sesión para sincronizar móvil y PC.';
   actions.innerHTML='<input id="authEmail" type="email" placeholder="tu@email.com" style="min-width:220px;background:#0d1316;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px"><button class="btn" id="loginBtn">Enviar enlace</button>';
   document.getElementById('loginBtn').onclick=login;
   document.getElementById('syncNotice').textContent='Los datos locales funcionan ya. Al iniciar sesión se sincronizarán con tu proyecto Training Lab.';
 }
}
async function login(){
 const email=document.getElementById('authEmail').value.trim();if(!email)return alert('Escribe tu email.');
 const redirect=location.protocol==='http:'||location.protocol==='https:'?location.origin+location.pathname:undefined;
 const {error}=await supabase.auth.signInWithOtp({email,options:redirect?{emailRedirectTo:redirect}:{}});
 if(error)alert(error.message);else alert('Te he enviado el enlace de acceso. Ábrelo desde el mismo dispositivo o desde la web ya publicada.');
}
document.getElementById('loginBtn').onclick=login;
const {data:{session}}=await supabase.auth.getSession();
currentUser=session?.user||null;
setCloudUI();
if(currentUser){await ensureProfile();await loadCloud();}
supabase.auth.onAuthStateChange(async(event,session)=>{
 currentUser=session?.user||null;setCloudUI();
 if(currentUser){await ensureProfile();await loadCloud();}
});


function metricBox(label,value){
 return `<div class="metric"><div class="k">${label}</div><div class="v" style="font-size:22px">${value}</div></div>`;
}
function drawHeatmap(track){
 const c=document.getElementById('heatmapCanvas'); if(!c)return;
 const ctx=c.getContext('2d'), w=c.width,h=c.height;
 ctx.clearRect(0,0,w,h); ctx.fillStyle='#0b1114';ctx.fillRect(0,0,w,h);
 if(!track?.length){
   ctx.fillStyle='#7d8c94';ctx.font='22px system-ui';ctx.textAlign='center';ctx.fillText('Sin track GPS todavía',w/2,h/2);return;
 }
 const xs=track.map(p=>p.lon), ys=track.map(p=>p.lat);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const dx=Math.max(1e-9,maxX-minX),dy=Math.max(1e-9,maxY-minY),pad=34;
 const points=track.map(p=>({
   x:pad+(p.lon-minX)/dx*(w-pad*2),
   y:h-pad-(p.lat-minY)/dy*(h-pad*2),
   s:Number(p.speed_kmh||0),hr:Number(p.hr||0)
 }));
 // density glow
 ctx.globalCompositeOperation='lighter';
 for(const p of points){
   const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,18);
   g.addColorStop(0,'rgba(217,255,99,.18)');
   g.addColorStop(1,'rgba(217,255,99,0)');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
 ctx.strokeStyle='rgba(143,213,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();
 points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
}
function renderLatestAnalysis(){
 const a=cloudAnalyses?.[0], title=document.getElementById('latestAnalysisTitle');
 if(!title)return;
 if(!a){
   title.textContent='Todavía no hay análisis';
   document.getElementById('latestAnalysisMetrics').innerHTML='';
   document.getElementById('latestAnalysisText').textContent='Cuando subas el primer partido aparecerá aquí el resumen automático.';
   document.getElementById('latestStrengths').innerHTML='';
   drawHeatmap([]);return;
 }
 const s=a.summary||{},r=a.report||{};
 title.textContent='Última actividad analizada';
 document.getElementById('latestAnalysisMetrics').innerHTML=
   metricBox('Distancia',`${Number(s.distanceKm||0).toFixed(2)} km`)+
   metricBox('FC media',s.avgHr?`${s.avgHr} ppm`:'—')+
   metricBox('Alta intensidad',`${Math.round(s.highIntensityM||0)} m`)+
   metricBox('Sprints >18',`${s.absoluteSprintCount??0}`);
 document.getElementById('latestAnalysisText').textContent=r.analysis||'Análisis completado.';
 const strengths=(r.strengths||[]).map(x=>`<div class="notice" style="margin-top:7px">${x}</div>`).join('');
 const improve=(r.improvements||[]).map(x=>`<div class="warning" style="margin-top:7px">${x}</div>`).join('');
 document.getElementById('latestStrengths').innerHTML=strengths+improve;
 drawHeatmap(a.track_points||[]);
}

function renderAll(){renderToday();renderWeek();renderHistory();updateProgress();renderLatestAnalysis()}
document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();
document.getElementById('allRecipes').innerHTML=recipes.map(recipeCard).join('');
renderAll();setInterval(renderToday,30000);

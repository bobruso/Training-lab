import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const SUPABASE_URL = "https://nnpvklaxhomarxszlclt.supabase.co";
const SUPABASE_KEY = "sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;
let cloudAnalyses = [];
let cloudSleep=[]; let cloudCheckins=[]; let cloudSets=[]; let cloudAchievements=[]; let cloudGame=null; let dailyDraft={};

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
   user_id:currentUser.id,display_name:'Jorge',birth_year:1988,height_cm:174,weight_kg:70,target_weight_kg:73,protein_target_g:130,timezone:'Europe/Madrid',sleep_target_start:'05:00',sleep_target_end:'13:00'
 },{onConflict:'user_id'});
}
async function loadCloud(){
 if(!currentUser)return;
 const [acts,weights,statuses,analyses,sleep,checkins,sets,achievements,game,meals]=await Promise.all([
   supabase.from('activities').select('*').order('activity_date',{ascending:true}),
   supabase.from('weigh_ins').select('*').order('measured_on',{ascending:true}),
   supabase.from('daily_status').select('*'),
   supabase.from('activity_analysis').select('*').order('analyzed_at',{ascending:false}),
   supabase.from('sleep_records').select('*').order('sleep_date',{ascending:false}).limit(30),
   supabase.from('daily_checkins').select('*').order('checkin_date',{ascending:false}).limit(60),
   supabase.from('strength_sets').select('*').order('performed_at',{ascending:false}).limit(500),
   supabase.from('achievements').select('*').order('unlocked_at',{ascending:false}),
   supabase.from('game_state').select('*').maybeSingle(),
   supabase.from('meal_logs').select('*').order('eaten_at',{ascending:false}).limit(100)
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
 if(!sleep.error) cloudSleep=sleep.data||[];
 if(!checkins.error) cloudCheckins=checkins.data||[];
 if(!sets.error) cloudSets=sets.data||[];
 if(!achievements.error) cloudAchievements=achievements.data||[];
 if(!game.error) cloudGame=game.data||null;
 if(!meals.error) window.cloudMeals=meals.data||[];
 if(!cloudGame){ await supabase.from('game_state').upsert({user_id:currentUser.id},{onConflict:'user_id'}); cloudGame={level:1,xp:0,strength:1,endurance:1,recovery:1,inventory:[]}; }
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


const CHECKIN_Q=[
 ['energy','Energía'],['soreness','Agujetas / carga muscular'],['stress','Estrés'],['mood','Ánimo'],['motivation','Motivación'],['sleep_quality','Sensación de sueño']
];
function renderQuestions(){
 const el=document.getElementById('dailyQuestions'); if(!el)return;
 el.innerHTML=CHECKIN_Q.map(([k,label])=>`<div class="qcard"><b>${label}</b><div class="scale" style="margin-top:8px">${[1,2,3,4,5].map(v=>`<button onclick="setScaleAnswer('${k}',${v},this)">${v}</button>`).join('')}</div></div>`).join('');
}
window.setScaleAnswer=function(k,v,btn){dailyDraft[k]=v;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
window.setBoolAnswer=function(k,v,btn){dailyDraft[k]=v;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
window.saveCheckin=async function(){
 if(!currentUser)return alert('Inicia sesión para guardar el test diario.');
 const row={user_id:currentUser.id,checkin_date:iso(),notes:document.getElementById('checkinNotes').value||null};
 for(const [k] of CHECKIN_Q) if(dailyDraft[k]!=null)row[k]=dailyDraft[k];
 for(const k of ['alcohol','caffeine_late','enough_carbs','hydration_ok']) if(dailyDraft[k]!=null)row[k]=dailyDraft[k];
 const {error}=await supabase.from('daily_checkins').upsert(row,{onConflict:'user_id,checkin_date'});
 if(error)return alert(error.message); await awardXp(15,'daily_checkin'); await loadCloud(); alert('Check-in guardado.');
}

function sleepMinutes(start,end){
 const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
 let a=sh*60+sm,b=eh*60+em;if(b<a)b+=1440;return b-a;
}
function circDistMin(a,b){
 const [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);let d=Math.abs((ah*60+am)-(bh*60+bm));return Math.min(d,1440-d);
}
window.saveSleep=async function(){
 if(!currentUser)return alert('Inicia sesión.');
 const date=document.getElementById('sleepDate').value,start=document.getElementById('sleepStart').value,end=document.getElementById('sleepEnd').value;
 if(!date||!start||!end)return;
 const mins=sleepMinutes(start,end);
 const startDt=new Date(date+'T'+start+':00');let endDt=new Date(date+'T'+end+':00');if(endDt<=startDt)endDt.setDate(endDt.getDate()+1);
 const row={user_id:currentUser.id,sleep_date:date,source:'manual',sleep_start:startDt.toISOString(),sleep_end:endDt.toISOString(),total_sleep_min:mins,
 deep_sleep_min:+document.getElementById('deepMin').value||null,rem_sleep_min:+document.getElementById('remMin').value||null,sleep_score:+document.getElementById('sleepScoreInput').value||null,
 avg_hrv:+document.getElementById('sleepHrv').value||null,resting_hr:+document.getElementById('sleepRhr').value||null};
 const {error}=await supabase.from('sleep_records').upsert(row,{onConflict:'user_id,sleep_date,source'});if(error)return alert(error.message);
 await awardXp(10,'sleep_log');await loadCloud();
}
window.alertCorosSleep=function(){
 document.getElementById('corosSleepStatus').textContent='COROS está soportado a nivel de datos, pero tu cuenta debe autorizar el conector/API. La web seguirá funcionando con Health Connect/registro manual mientras tanto.';
}
function renderSleep(){
 const a=cloudSleep?.[0], ring=document.getElementById('sleepRing'); if(!ring)return;
 if(!a){document.getElementById('sleepScore').textContent='—';return}
 const score=a.sleep_score??Math.min(100,Math.round((a.total_sleep_min||0)/480*85+15));
 ring.style.setProperty('--pct',score+'%');document.getElementById('sleepScore').textContent=score;
 const hrs=((a.total_sleep_min||0)/60).toFixed(1);
 document.getElementById('sleepSummary').textContent=`${hrs} h · profundo ${a.deep_sleep_min??'—'} min · REM ${a.rem_sleep_min??'—'} min · HRV ${a.avg_hrv??'—'}`;
 let start=a.sleep_start?new Date(a.sleep_start).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—';
 let end=a.sleep_end?new Date(a.sleep_end).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—';
 const consistency=(start!=='—')?circDistMin(start,'05:00'):999;
 document.getElementById('sleepConsistency').textContent=`${start} → ${end}. Desviación de tu hora habitual: ${consistency<60?consistency+' min · normal':Math.round(consistency/60*10)/10+' h · fuera de tu rango habitual'}.`;
 let insight='Con 7–14 noches empezaremos a comparar duración, regularidad, HRV y FC en reposo.';
 if(cloudSleep.length>=5){
  const mins=cloudSleep.slice(0,7).map(x=>x.total_sleep_min||0); insight=`Media reciente: ${(mins.reduce((a,b)=>a+b,0)/mins.length/60).toFixed(1)} h. Tu objetivo práctico está alrededor de 8 h, manteniendo consistencia dentro de ±1 h.`;
 }
 document.getElementById('sleepInsights').textContent=insight;
 document.getElementById('todaySleep').textContent=hrs+' h';document.getElementById('todaySleepWindow').textContent=`${start} → ${end}`;
}
function readiness(){
 let score=70,reasons=[];
 const s=cloudSleep?.[0];if(s){const hrs=(s.total_sleep_min||0)/60;if(hrs>=7.5)score+=10;else if(hrs<6)score-=18; if(s.sleep_score>=80)score+=7;if(s.sleep_score&&s.sleep_score<60)score-=10}
 const c=cloudCheckins?.find(x=>x.checkin_date===iso());if(c){if(c.energy>=4)score+=5;if(c.energy<=2)score-=8;if(c.soreness>=4)score-=8;if(c.stress>=4)score-=6;if(c.motivation<=2)score-=4}
 const recent=S.activities.filter(a=>{let d=(new Date()-new Date(a.date+'T12:00:00'))/86400000;return d>=0&&d<=2});if(recent.some(a=>a.type==='football'))score-=8;
 score=Math.max(20,Math.min(100,Math.round(score)));
 if(score>=80)reasons.push('buena disposición');else if(score>=60)reasons.push('carga manejable');else reasons.push('conviene reducir carga');
 return {score,text:reasons.join(', ')};
}
function renderReadiness(){const r=readiness(),el=document.getElementById('readinessScore');if(!el)return;el.textContent=r.score+'/100';document.getElementById('readinessWhy').textContent=r.text}

const RECOVERY_BASE={pecho:96,espalda:94,hombro:92,biceps:95,triceps:95,cuadriceps:78,isquios:72,gluteo:80,gemelos:70,core:92};
function calcRecovery(){
 const r={...RECOVERY_BASE}, now=Date.now();
 for(const a of S.activities){
  const age=(now-new Date(a.date+'T12:00:00'))/3600000;if(age<0||age>96)continue;
  const decay=Math.max(0,1-age/96),load=(a.rpe||5)*decay;
  if(a.type==='football'||a.type==='run'){for(const m of ['cuadriceps','isquios','gluteo','gemelos'])r[m]-=load*3.0}
  if(a.type==='gym'){for(const m of ['pecho','espalda','hombro','biceps','triceps','cuadriceps','isquios','gluteo'])r[m]-=load*1.0}
 }
 for(const st of cloudSets||[]){const age=(now-new Date(st.performed_at))/3600000;if(age>72)continue;let m=st.muscle_group;if(m&&r[m]!=null)r[m]-=(Number(st.rpe)||7)*Math.max(0,1-age/72)*2.2}
 Object.keys(r).forEach(k=>r[k]=Math.max(10,Math.min(100,Math.round(r[k]))));return r;
}
function renderRecovery(){
 const el=document.getElementById('recoveryList');if(!el)return;const r=calcRecovery();
 el.innerHTML=Object.entries(r).map(([k,v])=>`<div class="recovery-row"><span>${k}</span><div class="recovery-bar"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('');
 const legs=(r.cuadriceps+r.isquios+r.gemelos)/3;for(const id of ['bodyLegL','bodyLegR']){let x=document.getElementById(id);if(x)x.className='bodypart '+(id==='bodyLegL'?'body-leg-l ':'body-leg-r ')+(legs>75?'good':legs>45?'mid':'low')}
}
window.analyzeInjury=async function(){
 const area=document.getElementById('injuryArea').value,side=document.getElementById('injurySide').value,pain=+document.getElementById('injuryPain').value,text=document.getElementById('injuryText').value;
 const red=[['rfTrauma','traumatismo/deformidad'],['rfNoWeight','incapacidad para apoyar'],['rfNeuro','síntomas neurológicos'],['rfSwelling','hinchazón importante']].filter(([id])=>document.getElementById(id).checked).map(x=>x[1]);
 let advice={};
 if(red.length||pain>=8)advice={level:'urgent',title:'No entrenaría hoy',text:'Hay señales que justifican valoración sanitaria presencial. Evita cargar la zona y busca atención profesional, especialmente si empeora.'};
 else if(pain>=5)advice={level:'moderate',title:'Modificar entrenamiento',text:`Evitaría por ahora movimientos que reproduzcan claramente el dolor en ${area}. Mantén actividad indolora, reduce carga/rango y reevalúa en 24–48 h. Si persiste, empeora o limita la marcha, consulta con fisio/médico.`};
 else advice={level:'mild',title:'Carga prudente',text:`Con dolor leve en ${area}, puedes mantener trabajo que sea prácticamente indoloro. Calentamiento progresivo, menor carga/velocidad y sin “probar” sprints fuertes. Si aumenta durante o después, detén esa tarea.`};
 document.getElementById('injuryAdvice').innerHTML=`<div class="${advice.level==='urgent'?'redflag':advice.level==='moderate'?'warning':'notice'}"><b>${advice.title}</b><br>${advice.text}<br><span class="small">Esto es orientación de entrenamiento y triaje, no un diagnóstico.</span></div>`;
 if(currentUser)await supabase.from('injuries').insert({user_id:currentUser.id,body_area:area,side,pain_score:pain,onset_date:document.getElementById('injuryDate').value||iso(),trigger:text||null,red_flags:red,advice});
}
window.saveStrengthSet=async function(){
 if(!currentUser)return alert('Inicia sesión.');
 const row={user_id:currentUser.id,exercise:document.getElementById('setExercise').value,muscle_group:document.getElementById('setMuscle').value,reps:+document.getElementById('setReps').value||null,weight_kg:+document.getElementById('setWeight').value||null,rir:+document.getElementById('setRir').value||null,rpe:+document.getElementById('setRpe').value||null};
 if(!row.exercise)return alert('Pon el ejercicio.');
 const {error}=await supabase.from('strength_sets').insert(row);if(error)return alert(error.message);await awardXp(4,'strength_set');await loadCloud();
}
function renderCompare(){
 const sel=document.getElementById('compareSelector');if(!sel)return;
 const acts=S.activities.filter(a=>['football','run'].includes(a.type)&&a.distance).slice(-12).reverse();
 sel.innerHTML=acts.map((a,i)=>`<label class="checkline"><input class="cmp" type="checkbox" data-i="${i}" onchange="runCompare()"> ${a.date} · ${a.type} · ${Number(a.distance).toFixed(2)} km · FC ${a.hr||'—'}</label>`).join('')||'<p class="muted">Necesitas al menos dos actividades con métricas.</p>';
 renderStrengthCompare();
}
window.runCompare=function(){
 const acts=S.activities.filter(a=>['football','run'].includes(a.type)&&a.distance).slice(-12).reverse(),ids=[...document.querySelectorAll('.cmp:checked')].slice(0,2).map(x=>+x.dataset.i);
 document.querySelectorAll('.cmp:checked').forEach((x,i)=>{if(i>=2)x.checked=false});if(ids.length<2)return;
 const a=acts[ids[0]],b=acts[ids[1]];if(a.type!==b.type){document.getElementById('compareResult').innerHTML='<div class="warning">Compara actividades del mismo tipo para que el resultado tenga sentido.</div>';return}
 const d=(x,y)=>y?((x-y)/y*100):0,dist=d(b.distance,a.distance),hr=(a.hr&&b.hr)?b.hr-a.hr:null;
 document.getElementById('compareResult').innerHTML=`<h2>${a.date} → ${b.date}</h2><div class="grid g3"><div class="metric"><div class="k">Distancia</div><div class="v">${dist>=0?'+':''}${dist.toFixed(1)}%</div></div><div class="metric"><div class="k">FC media</div><div class="v">${hr==null?'—':(hr>=0?'+':'')+hr+' ppm'}</div></div><div class="metric"><div class="k">Carga</div><div class="v">${Math.round((b.duration||0)*(b.rpe||0))}</div></div></div><p class="muted">${hr!=null&&dist>0&&hr<=0?'Buena señal: produces más trabajo con una FC igual o menor.':'Necesitamos más sesiones comparables para interpretar tendencia.'}</p>`;
}
function renderStrengthCompare(){
 const el=document.getElementById('strengthCompare');if(!el)return;const by={};for(const s of cloudSets||[]){(by[s.exercise]??=[]).push(s)}
 const rows=Object.entries(by).slice(0,8).map(([ex,arr])=>{arr.sort((a,b)=>new Date(a.performed_at)-new Date(b.performed_at));const first=arr[0],last=arr.at(-1);const v1=(first.weight_kg||0)*(first.reps||0),v2=(last.weight_kg||0)*(last.reps||0);return `<div class="checkline"><b style="min-width:130px">${ex}</b><span>${first.weight_kg||0}×${first.reps||0}</span> → <span>${last.weight_kg||0}×${last.reps||0}</span><span class="muted">${v1?((v2-v1)/v1*100).toFixed(0)+'%':'—'}</span></div>`}).join('');
 el.innerHTML=rows||'Todavía no hay suficientes series.';
}
function targetsForToday(){
 const p=adaptivePlan(new Date()),football=footballScheduled(new Date()),carbs=football?390:(p.kind==='rest'?275:330);
 return {protein:130,carbs,fat:75};
}
function todayMeals(){
 const now=iso();return (window.cloudMeals||[]).filter(x=>String(x.eaten_at||'').slice(0,10)===now)
}
function renderMealPlanner(){
 const el=document.getElementById('macroRemaining');if(!el)return;const t=targetsForToday(),m=todayMeals(),sum=k=>m.reduce((s,x)=>s+Number(x[k]||0),0);
 const rem={p:Math.max(0,t.protein-sum('protein_g')),c:Math.max(0,t.carbs-sum('carbs_g')),f:Math.max(0,t.fat-sum('fat_g'))};
 el.innerHTML=`<div class="grid g3"><div class="metric"><div class="k">Proteína restante</div><div class="v">${Math.round(rem.p)} g</div></div><div class="metric"><div class="k">HC restantes</div><div class="v">${Math.round(rem.c)} g</div></div><div class="metric"><div class="k">Grasa restante</div><div class="v">${Math.round(rem.f)} g</div></div></div>`;
 const eaten=t.carbs-rem.c;document.getElementById('macroFuel').style.width=Math.min(100,eaten/t.carbs*100)+'%';
 const plan=[['desayuno','Avena + skyr + plátano'],['comida','Arroz/pasta + pollo + verduras'],['merienda',footballScheduled(new Date())?'Bocadillo ligero + plátano':'Batido + fruta'],['cena',footballScheduled(new Date())?'Arroz/patata + proteína postpartido':'Pescado/carne + patata/arroz'],['recena','Skyr/leche + fruta']];
 document.getElementById('mealPlanSlots').innerHTML=plan.map(([slot,name])=>`<div class="meal-slot"><b>${slot}</b><br><span class="muted">${name}</span><button class="btn alt" style="margin-top:6px" onclick="logSuggestedMeal('${slot}','${name.replaceAll("'","")}')">✓ He comido algo así</button></div>`).join('');
}
window.logSuggestedMeal=async function(type,title){
 if(!currentUser)return alert('Inicia sesión.');
 const defaults={desayuno:[30,70,15],comida:[40,95,18],merienda:[25,65,10],cena:[38,80,20],recena:[20,35,8]},v=defaults[type]||[25,60,15];
 await supabase.from('meal_logs').insert({user_id:currentUser.id,meal_type:type,title,protein_g:v[0],carbs_g:v[1],fat_g:v[2]});window.cloudMeals=(window.cloudMeals||[]);window.cloudMeals.push({eaten_at:new Date().toISOString(),meal_type:type,protein_g:v[0],carbs_g:v[1],fat_g:v[2]});renderMealPlanner();
}
function renderMatchMode(){
 const panel=document.getElementById('matchDayPanel');if(!panel)return;const isMatch=footballScheduled(new Date());panel.style.display=isMatch?'block':'none';if(!isMatch)return;
 const hour=20.5,now=new Date(),match=new Date();match.setHours(20,30,0,0);if(match<now)match.setDate(match.getDate()+1);const ms=match-now,h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);
 document.getElementById('matchCountdown').textContent=`${h}h ${m}m`;
 const t=targetsForToday(),mels=todayMeals(),c=mels.reduce((s,x)=>s+Number(x.carbs_g||0),0),pct=Math.min(100,c/t.carbs*100);
 document.getElementById('matchFuel').style.width=pct+'%';document.getElementById('matchFuelText').textContent=`${Math.round(c)} / ${t.carbs} g de HC objetivo`;
 document.getElementById('matchMealAdvice').innerHTML=ms/3600000>4?'<div class="notice">Prioriza ahora una comida alta en carbohidratos y moderada en grasa/fibra.</div>':ms/3600000>1.5?'<div class="notice">Merienda fácil: pan/arroz/avena + fruta; evita una comida muy pesada.</div>':'<div class="notice">Pequeño aporte fácil si tienes hambre: plátano, tostada con miel o bebida con carbohidrato.</div>';
}
function renderPostMatch(){
 const el=document.getElementById('postMatchRecovery');if(!el)return;const f=S.activities.filter(a=>a.type==='football').sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!f)return;const age=(Date.now()-new Date(f.date+'T22:00:00'))/3600000;if(age<0||age>36)return;
 document.getElementById('postMatchTitle').textContent='Recuperación tras tu último partido';
 el.innerHTML=`<div class="grid g3"><div class="notice"><b>Ahora</b><br>5–8 min caminando + hidratación.</div><div class="notice"><b>Comida</b><br>25–40 g proteína + carbohidratos abundantes.</div><div class="notice"><b>Mañana</b><br>${(f.rpe||8)>=8?'Recuperación o torso ligero. Evita pierna intensa si sigue cargada.':'Movilidad + actividad suave.'}</div></div>`;
}
async function awardXp(amount,reason){
 if(!currentUser)return;let g=cloudGame||{level:1,xp:0,strength:1,endurance:1,recovery:1,inventory:[]};let xp=(g.xp||0)+amount,level=g.level||1,need=level*100,inv=[...(g.inventory||[])];
 while(xp>=need){xp-=need;level++;need=level*100;const drops=['Botas del Corredor +1','Guantes de Hierro +1','Amuleto del Sueño +1','Cinturón de Recuperación +1'];inv.push({name:drops[(level-2)%drops.length],level,found_at:new Date().toISOString()})}
 await supabase.from('game_state').upsert({user_id:currentUser.id,level,xp,inventory:inv},{onConflict:'user_id'});
 cloudGame={...g,level,xp,inventory:inv};
}
window.checkAchievements=async function(){
 if(!currentUser)return alert('Inicia sesión.');
 const c=counts(), candidates=[];
 if(c.gym>=3)candidates.push(['weekly_strength_3','Semana de Hierro','Has completado 3 sesiones de fuerza.',40,'rare']);
 if(c.run>=2)candidates.push(['weekly_aerobic_2','Motor Aeróbico','Has completado 2 rodajes aeróbicos.',35,'rare']);
 if(c.football>=2)candidates.push(['weekly_football_2','Doble Jornada','Has jugado 2 pachangas esta semana.',30,'common']);
 if(cloudSleep.filter(x=>(x.total_sleep_min||0)>=420).length>=5)candidates.push(['sleep_5x7h','Guardia del Sueño','5 noches recientes con al menos 7 horas.',50,'epic']);
 let added=0;for(const [code,title,description,xp,rarity] of candidates){if(!cloudAchievements.some(a=>a.code===code)){const {error}=await supabase.from('achievements').insert({user_id:currentUser.id,code,title,description,xp,rarity});if(!error){await awardXp(xp,'achievement');added++}}}
 await loadCloud();alert(added?`Has desbloqueado ${added} logro(s).`:'No hay nuevos logros todavía.');
}
function renderRpg(){
 const g=cloudGame||{level:1,xp:0,strength:1,endurance:1,recovery:1,inventory:[]};const need=g.level*100;
 for(const [id,val] of [['rpgLevel','Nivel '+g.level],['statStrength',g.strength||1],['statEndurance',g.endurance||1],['statRecovery',g.recovery||1],['todayLevel',g.level]]){let e=document.getElementById(id);if(e)e.textContent=val}
 let e=document.getElementById('todayXp');if(e)e.textContent=(g.xp||0)+' XP';e=document.getElementById('rpgXpText');if(e)e.textContent=`${g.xp||0} / ${need} XP`;e=document.getElementById('rpgXpBar');if(e)e.style.width=Math.min(100,(g.xp||0)/need*100)+'%';
 e=document.getElementById('inventory');if(e)e.innerHTML=(g.inventory||[]).map(it=>`<div class="item">🎁<br>${it.name}</div>`).join('')||'<span class="muted">Todavía vacío.</span>';
 e=document.getElementById('achievementList');if(e)e.innerHTML=(cloudAchievements||[]).map(a=>`<div class="badge rarity-${a.rarity}"><b>${a.title}</b><br><span class="muted">${a.description||''} · +${a.xp} XP</span></div>`).join('')||'<p class="muted">Todavía sin logros.</p>';
}
window.generateWeeklyReport=async function(){
 const m=mondayOf(),end=addDays(m,6),acts=weekActivities(),c=counts(),weights=[...S.weights].sort((a,b)=>a.date.localeCompare(b.date));
 const sleep=cloudSleep.filter(s=>new Date(s.sleep_date+'T12:00:00')>=m&&new Date(s.sleep_date+'T12:00:00')<=addDays(end,1));
 const sleepAvg=sleep.length?sleep.reduce((x,s)=>x+(s.total_sleep_min||0),0)/sleep.length/60:null;
 const load=acts.reduce((x,a)=>x+(a.duration||0)*(a.rpe||0),0),km=acts.reduce((x,a)=>x+(a.distance||0),0);
 let wt='sin suficientes datos';if(weights.length>=2)wt=`${weights.at(-2).kg.toFixed(1)} → ${weights.at(-1).kg.toFixed(1)} kg`;
 const txt=`FUERZA: ${c.gym}/3\nRUNNING: ${c.run}/2\nFÚTBOL: ${c.football}\nCARGA: ${Math.round(load)} min×RPE\nDISTANCIA: ${km.toFixed(1)} km\nSUEÑO MEDIO: ${sleepAvg?sleepAvg.toFixed(1)+' h':'—'}\nPESO: ${wt}\n\nRECOMENDACIÓN: ${c.gym<3?'priorizar fuerza; ':''}${c.run<2?'mantener al menos un rodaje fácil; ':''}${sleepAvg&&sleepAvg<7?'proteger algo más el sueño; ':''}${load>1200?'reducir carga desplazable la próxima semana.':'mantener progresión gradual.'}`;
 document.getElementById('weeklyReport').textContent=txt;
 if(currentUser)await supabase.from('weekly_reports').upsert({user_id:currentUser.id,week_start:iso(m),week_end:iso(end),summary:{gym:c.gym,run:c.run,football:c.football,load,km,sleepAvg},report:{text:txt}},{onConflict:'user_id,week_start'});
 await awardXp(20,'weekly_report');renderRpg();
}
function renderWeeklyAuto(){const n=new Date();if(n.getDay()===0){document.getElementById('weeklyReportTitle').textContent='Hoy toca revisión semanal';window.generateWeeklyReport()}}

function renderV5(){
 renderQuestions();renderSleep();renderReadiness();renderRecovery();renderCompare();renderMealPlanner();renderMatchMode();renderPostMatch();renderRpg();
}

function renderAll(){renderToday();renderWeek();renderHistory();updateProgress();renderLatestAnalysis();renderV5()}
document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();
document.getElementById('sleepDate').value=iso();document.getElementById('injuryDate').value=iso();
document.getElementById('allRecipes').innerHTML=recipes.map(recipeCard).join('');
renderAll();setInterval(renderToday,30000);

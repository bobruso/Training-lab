import {analyzeLocalFit} from './vendor/fit-local.js?v=20260910home79';
import {readinessModel,recoveryModel,runningTarget,uniqueNights} from './domain.js?v=20260910home79';
import { createClient } from "./vendor/supabase.js?v=20260910home79";

const SUPABASE_URL = "https://nnpvklaxhomarxszlclt.supabase.co";
const SUPABASE_KEY = "sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {global:{fetch:async(input,options)=>{
 const response=await window.TrainingLab.request(input,options);
 const path=new URL(typeof input==='string'?input:input.url).pathname;
 if(path.includes('/functions/v1/'))window.TrainingLab.update({lastFunction:path.split('/').at(-1)});
 if(!response.ok&&!path.startsWith('/auth/v1/'))window.TrainingLab.report('Supabase', 'La operación no se ha completado (HTTP '+response.status+'). Revisa la conexión y vuelve a intentarlo.');
 return response;
}}});
// Stop a failed write before callers can announce success or award XP.
const rawFrom=supabase.from.bind(supabase);
supabase.from=table=>{
 let writing=false;
 const wrap=builder=>new Proxy(builder,{get(target,key){
   if(key==='then')return(resolve,reject)=>target.then(result=>{if(writing&&result.error){window.TrainingLab.report('Guardado '+table,result.error);throw new Error('No se ha guardado '+table+'. Reintenta cuando tengas conexión.');}return result;}).then(resolve,reject);
   const value=Reflect.get(target,key,target);
   if(typeof value!=='function')return value;
   return (...args)=>{if(['insert','upsert','update','delete'].includes(key))writing=true;const next=value.apply(target,args);return next&&typeof next==='object'?wrap(next):next;};
 }});
 return wrap(rawFrom(table));
};
let currentUser = null;
let cloudAnalyses=[]; let cloudSleep=[]; let cloudCheckins=[]; let cloudSets=[]; let cloudAchievements=[]; let cloudGame=null; let dailyDraft={};
let cloudGoals=[]; let cloudReports=[]; let cloudInjuries=[]; let cloudSync=[];

const DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DAYSHORT=['D','L','M','X','J','V','S'];
const STORE='traininglab-v2';
const base={
 profile:{weight:70,height:1.74,age:38,protein:130},
 activities:[],weights:[],footballOverrides:{},restDays:{},fatigue:{},matchTimes:{}
};
let S=load();
function load(){try{const x=JSON.parse(localStorage.getItem(currentUser ? STORE+':'+currentUser.id : STORE));return Object.assign(structuredClone(base),x||{})}catch(e){return structuredClone(base)}}
function save(){try{localStorage.setItem(currentUser ? STORE+':'+currentUser.id : STORE,JSON.stringify(S));}catch(e){window.TrainingLab.report('Guardado local',e);}}
function iso(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mondayOf(d=new Date()){let x=new Date(d);let n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);x.setHours(0,0,0,0);return x}
function addDays(d,n){let x=new Date(d);x.setDate(x.getDate()+n);return x}
function dateEq(a,b){return iso(a)===iso(b)}
function actsOn(date){return S.activities.filter(a=>a.date===iso(date))}
function hasDone(date,type){return actsOn(date).some(a=>a.type===type)}
function footballScheduled(date){
 const k=iso(date); if(k in S.footballOverrides)return S.footballOverrides[k];
 return false; // Habitual days are not confirmed matches.
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
 const d=date.getDay(), c=counts(date), fatigue=fatigueFor(date), hasFootball=footballScheduled(date), runTarget=weekRunTarget(date);
 const ready=readiness().score, rec=calcRecovery(date);
 const legRecovery=(rec.cuadriceps+rec.isquios+rec.gemelos+rec.gluteo)/4;
 const lowerAreas=['isquios','cuadriceps','gemelo','tobillo','pie','rodilla','aductor','ingle','gluteo'];
 const activeLower=cloudInjuries.some(i=>i.status==='active'&&lowerAreas.includes(String(i.body_area).toLowerCase())&&Number(i.pain_score||0)>=4);
 const redFlag=cloudInjuries.some(i=>i.status==='active'&&(Number(i.pain_score)>=8||(Array.isArray(i.red_flags)&&i.red_flags.length)));
 if(redFlag)return {title:hasFootball?'Fútbol confirmado · no entrenar con señales de alarma':'Pausa de entrenamiento',reason:'Hay señales de alarma registradas. Busca valoración sanitaria; el evento de fútbol se conserva en el calendario.',kind:'rest'};
 if(actsOn(date).some(a=>['gym','run','football'].includes(a.type))&&!hasFootball)return {title:'Sesión completada · recuperar',reason:'El trabajo registrado ya cuenta. No añadimos otra sesión para llenar el día.',kind:'rest'};
 if(restSet(date)&&!hasFootball)return {title:'Descanso',reason:'Has marcado hoy como descanso. Se preservan las pachangas y se recolocan sesiones desplazables.',kind:'rest'};
 if(hasFootball){
   const gymOkay=c.gym<3 && fatigue<=3 && ready>=65 && !restSet(date) && !hasDone(date,'gym') && !hasDone(date,'football');
   if(hasDone(date,'football'))return {title:'Pachanga completada · recuperación',reason:'El partido ya cuenta para la carga semanal. Prioriza comida y recuperación.',kind:'rest'};
   let reason=gymOkay?'Agrupamos carga: torso antes o separado varias horas y fútbol como trabajo intenso. Evitamos pierna dura.':'Hoy manda el fútbol. Reserva energía y evita añadir fuerza si la recuperación no acompaña.';
   if(ready<50)reason+=' Tu readiness está bajo: prioriza calentamiento, hidratación y recuperación posterior.';
   if(activeLower)reason+=' Hay una molestia activa de tren inferior: no ignores dolor creciente ni hagas sprints “de prueba”.';
   return {title:(gymOkay?'Torso + ':'')+'Pachanga',reason,kind:'football'};
 }
 if(ready<45||fatigue>=5)return {title:'Descanso / paseo suave',reason:`Readiness ${ready}/100 y/o fatiga alta: hoy interesa recuperar más que acumular carga.`,kind:'rest'};
 if(activeLower)return {title:c.gym<3?'Torso + recuperación de piernas':'Recuperación de piernas',reason:'Hay una molestia activa del tren inferior. Quitamos running y pierna hasta que la carga sea tolerable y prácticamente indolora.',kind:c.gym<3?'gym':'rest'};
 if(fatigue===4&&recentHard(date))return {title:'Recuperación',reason:'Vienes cargado de una sesión exigente. Mejor paseo, movilidad y sueño.',kind:'rest'};
 if(legRecovery<50)return {title:c.gym<3?'Torso / core':'Recuperación',reason:`Recuperación estimada de piernas ${Math.round(legRecovery)} %. Evitamos pierna dura y running hoy.`,kind:c.gym<3?'gym':'rest'};
 if(hasDone(addDays(date,-1),'gym'))return c.run<runTarget&&!nextFootballWithin(date,1)&&!recentHard(date)&&legRecovery>=65?{title:'Rodaje fácil',reason:'Alternamos la fuerza de ayer con trabajo aeróbico suave.',kind:'run'}:{title:'Recuperación',reason:'Fuerza ayer: dejamos espacio antes de repetirla.',kind:'rest'};
 if(c.gym<3){
   if(nextFootballWithin(date,1))return {title:'Fuerza de torso',reason:'Falta fuerza semanal, pero mañana hay fútbol: torso sí; pierna dura no.',kind:'gym'};
   if(c.run<runTarget&&!recentHard(date)&&(d===3||d===6)&&legRecovery>=65&&ready>=65&&readiness().missing.length<=1)return {title:'Fuerza + rodaje suave',reason:'Buen hueco: recuperación suficiente para combinar hipertrofia y base aeróbica sin añadir HIIT.',kind:'combo'};
   if(d===3&&legRecovery>=65)return {title:'Pierna',reason:`Piernas al ${Math.round(legRecovery)} % y readiness ${ready}/100: buen momento para el estímulo principal de fuerza.`,kind:'gym'};
   return {title:'Fuerza full body/torso',reason:'La prioridad pendiente de esta semana es completar el volumen de fuerza sin comprometer el siguiente partido.',kind:'gym'};
 }
 if(c.run<runTarget&&!recentHard(date)&&legRecovery>=60&&ready>=55)return {title:'Rodaje aeróbico suave 40–60 min',reason:'Fuerza semanal cubierta. Falta base aeróbica y las piernas están suficientemente recuperadas.',kind:'run'};
 return {title:'Descanso activo',reason:'Los objetivos principales están cubiertos o tu recuperación aconseja no añadir otra sesión.',kind:'rest'};
}
function weekRunTarget(date=new Date()){
 const m=mondayOf(date);let football=0;
 for(let i=0;i<7;i++){const d=addDays(m,i);if(footballScheduled(d)||hasDone(d,'football'))football++;}
 return runningTarget(football);
}
window.setFootballFor=async function(day,value){
 S.footballOverrides[day]=value;save();
 if(currentUser){const {error}=await supabase.from('daily_status').upsert({user_id:currentUser.id,day,football_override:value},{onConflict:'user_id,day'});if(error)window.TrainingLab.report('Plan semanal',error);}
 renderAll();
};
function loadLabel(plan){
 if(plan.kind==='football')return ['alta','350–425 g'];
 if(plan.kind==='combo')return ['media/alta','320–370 g'];
 if(plan.kind==='gym'||plan.kind==='run')return ['media','300–350 g'];
 return ['baja','250–300 g'];
}
const recipes=[
 ['desayuno','Avena + skyr + plátano',34,82,14,'Avena, leche, skyr, plátano y nueces.','https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=900&q=78'],
 ['desayuno','Tostadas + huevos + fruta',32,68,20,'Pan, tomate, AOVE, 3 huevos, yogur y fruta.','https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=78'],
 ['comida','Arroz con pollo',43,95,18,'Arroz abundante, pollo, verduras y AOVE.','https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=78'],
 ['comida','Pasta boloñesa',42,105,19,'Pasta, carne magra, tomate y parmesano.','https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=900&q=78'],
 ['comida','Lentejas + arroz + huevo',35,100,17,'Legumbre + cereal + huevo.','https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=78'],
 ['merienda','Batido de crecimiento',38,72,16,'Leche, whey, plátano, avena y crema de cacahuete.','https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=78'],
 ['merienda','Bocadillo + yogur + fruta',31,74,11,'Pavo o tortilla, yogur y fruta.','https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=78'],
 ['cena','Salmón + patata',40,70,24,'Salmón, patata y ensalada.','https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=78'],
 ['cena','Burritos de pollo y arroz',44,92,20,'Tortillas, pollo, arroz, frijoles y verduras.','https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=900&q=78'],
 ['recena','Skyr + avena + fruta',28,46,8,'Proteína fácil antes de dormir.','https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=78'],
 ['recena','Leche + plátano + tostada',20,58,10,'Sencillo si faltan calorías.','https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=78']
];
function mealForHour(h){if(h>=13&&h<15)return'desayuno';if(h>=15&&h<18)return'comida';if(h>=18&&h<21)return'merienda';if(h>=21||h<1)return'cena';return'recena'}
function recipeCard(r){let [meal,n,p,c,f,desc,img]=r;return `<div class="card recipe">${img?`<img class="recipe-media" loading="lazy" decoding="async" src="${img}" alt="${n}" onerror="this.style.display='none'">`:''}<span class="tag">${meal}</span><h3>${n}</h3><div class="meta">P ${p} g · HC ${c} g · G ${f} g</div><p class="muted">${desc}</p><a class="btn alt" style="display:inline-block;text-decoration:none" target="_blank" href="https://cookidoo.es/search/es-ES?query=${encodeURIComponent(n)}">Buscar en Cookidoo</a></div>`}
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
 let m=mondayOf(), html='', c=counts(),runTarget=weekRunTarget();
 const actualActivities=S.activities;
 S.activities=[...actualActivities];
 try{
 for(let i=0;i<7;i++){
   let d=addDays(m,i), plan=adaptivePlan(d), done=actsOn(d), isToday=dateEq(d,new Date());
   if(iso(d)<iso())plan={title:done.length?'Registrado':'Sin sesión registrada',reason:'Histórico',kind:'history'};
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
    `<button class="btn alt" onclick="setFootballFor('${iso(d)}',${!football})">${football?'Cancelar fútbol':'Confirmar fútbol'}</button></div>`;
   if(iso(d)>=iso()&&!done.length){
     const types=plan.kind==='combo'?['gym','run']:plan.kind==='football'&&plan.title.startsWith('Torso')?['gym','football']:[plan.kind];
     for(const type of types.filter(t=>['gym','run','football'].includes(t)))S.activities.push({date:iso(d),type,duration:45,rpe:5,planned:true});
   }
 }
 }finally{S.activities=actualActivities;}
 document.getElementById('weekGrid').innerHTML=html;
 document.getElementById('gymCount').textContent=c.gym+'/3';document.getElementById('runCount').textContent=c.run+'/'+runTarget;document.getElementById('footballCount').textContent=String(c.football);
 let notes=[];
 if(c.gym<3)notes.push(`Faltan ${3-c.gym} sesiones de fuerza.`);
 if(c.run<runTarget)notes.push(`Faltan ${runTarget-c.run} rodajes aeróbicos.`);
 if(c.football>=3)notes.push('Semana con 3+ pachangas: conviene recortar antes running que recuperación.');
 if(c.gym>=3&&c.run>=runTarget)notes.push('Objetivos desplazables cubiertos: prioriza recuperación.');
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
 if(!/\.fit$/i.test(f.name)||f.size>20*1024*1024){el.textContent='Selecciona un archivo .fit de hasta 20 MB.';return}
 if(!currentUser){
   el.textContent='Analizando FIT en este dispositivo…';
   try {
     const {summary:s,report}=await analyzeLocalFit(await f.arrayBuffer(),document.getElementById('fitType')?.value||'football');
     el.textContent=[
       'Analizado localmente · no guardado en una cuenta.',
       Math.floor(s.durationSec/60)+':'+String(s.durationSec%60).padStart(2,'0')+' min · '+s.distanceKm+' km · FC '+(s.avgHr??'—')+' / '+(s.maxHr??'—')+' ppm.',
       report.analysis,
       ...(report.strengths||[]),...(report.improvements||[])
     ].join('\n\n');
     el.style.whiteSpace='pre-line';
   } catch(error){el.textContent='No se pudo analizar el FIT: '+(error?.message||'Archivo inválido.');}
   return;
 }
 el.textContent='1/3 · Subiendo FIT...';
 const fitType=document.getElementById('fitType')?.value||'football';
 const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 const path=`${currentUser.id}/${Date.now()}-${safe}`;
 const {error:upErr}=await supabase.storage.from('fit-files').upload(path,f,{contentType:'application/octet-stream',upsert:false});
 if(upErr){el.textContent='Error al subir: '+upErr.message;return}

 el.textContent='2/3 · Creando actividad...';
 const {data:act,error:actErr}=await supabase.from('activities').insert({
   user_id:currentUser.id,activity_date:iso(),activity_type:fitType,source:'fit',title:f.name
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
 const sm=analysis.summary||{};
 if(fitType==='gym'){
   el.textContent=`Analizado: ${sm.strengthSetCount??0} series FIT · ${sm.totalReps??0} reps · ${sm.totalVolumeKg?Math.round(sm.totalVolumeKg)+' kg·rep':'volumen no disponible'} · FC ${sm.avgHr??'—'} ppm.`;
 }else{
   el.textContent=`Analizado: ${Number(sm.distanceKm||0).toFixed(2)} km · FC ${sm.avgHr??'—'} ppm · ${Math.round(sm.highIntensityM||0)} m alta intensidad · ${sm.absoluteSprintCount??0} >18 km/h.`;
 }
 await loadCloud();
 navTo('progreso');
}
window.navTo=function navTo(p){document.body.dataset.section=p;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===p));const active=document.querySelector(`nav [data-page="${p}"]`);if(active&&window.matchMedia('(max-width: 700px)').matches)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});window.scrollTo({top:0,behavior:'smooth'})}
window.openRegister=function openRegister(){window.navTo('registro')}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>window.navTo(b.dataset.page)));
document.querySelectorAll('[data-football-metric]').forEach(b=>b.addEventListener('click',()=>window.setFootballTrendMetric(b.dataset.footballMetric)));

async function ensureProfile(){
 if(!currentUser)return;
 await supabase.from('profiles').upsert({
   user_id:currentUser.id,display_name:'Jorge',birth_year:1988,height_cm:174,weight_kg:70,target_weight_kg:73,protein_target_g:130,timezone:'Europe/Madrid',sleep_target_start:'05:00',sleep_target_end:'13:00'
 },{onConflict:'user_id',ignoreDuplicates:true});
}
async function loadCloud(){
 if(!currentUser)return;
 const requestedUser=currentUser.id;
 const [acts,weights,statuses,analyses,sleep,checkins,sets,achievements,game,meals,goals,reports,injuries,syncs]=await Promise.all([
   supabase.from('activities').select('*').eq('user_id',currentUser.id).order('activity_date',{ascending:true}),
   supabase.from('weigh_ins').select('*').eq('user_id',currentUser.id).order('measured_on',{ascending:true}),
   supabase.from('daily_status').select('*').eq('user_id',currentUser.id),
   supabase.from('activity_analysis').select('*').eq('user_id',currentUser.id).order('analyzed_at',{ascending:false}),
   supabase.from('sleep_records').select('*').eq('user_id',currentUser.id).order('sleep_date',{ascending:false}).limit(60),
   supabase.from('daily_checkins').select('*').eq('user_id',currentUser.id).order('checkin_date',{ascending:false}).limit(90),
   supabase.from('strength_sets').select('*').eq('user_id',currentUser.id).order('performed_at',{ascending:false}).limit(800),
   supabase.from('achievements').select('*').eq('user_id',currentUser.id).order('unlocked_at',{ascending:false}),
   supabase.from('game_state').select('*').eq('user_id',currentUser.id).maybeSingle(),
   supabase.from('meal_logs').select('*').eq('user_id',currentUser.id).order('eaten_at',{ascending:false}).limit(200),
   supabase.from('goal_confirmations').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(30),
   supabase.from('weekly_reports').select('*').eq('user_id',currentUser.id).order('week_start',{ascending:false}).limit(12),
   supabase.from('injuries').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(30),
   supabase.from('sync_sources').select('*').eq('user_id',currentUser.id)
 ]);
 if(currentUser?.id!==requestedUser)return; // Ignore a response from an account that has signed out.
 const results=[acts,weights,statuses,analyses,sleep,checkins,sets,achievements,game,meals,goals,reports,injuries,syncs];
 const failed=results.filter(r=>r.error);
 if(failed.length)window.TrainingLab.report('Sincronización',failed.length+' consultas no se han podido completar. Los datos pueden estar incompletos.');
 else window.TrainingLab.update({lastSync:new Date().toISOString()});
 window.TrainingLab.update({activities:acts.data?.length||0,sleep:sleep.data?.length||0});
 if(!acts.error){
   S.activities=acts.data.map(a=>({id:a.id,date:a.activity_date,type:a.activity_type,source:a.source,title:a.title||null,started_at:a.started_at,duration:Number(a.duration_min)||0,moving:Number(a.moving_time_min)||0,rpe:Number(a.rpe)||0,distance:Number(a.distance_km)||0,hr:Number(a.avg_hr)||0,hrmax:Number(a.max_hr)||0,kcal:Number(a.calories)||0,topSpeed:Number(a.top_speed_kmh)||0,highIntensity:Number(a.high_intensity_m)||0,sprints:Number(a.sprint_count)||0,absSprints:Number(a.absolute_sprint_count)||0,pace:Number(a.avg_pace_sec_km)||0,metrics:a.metrics||{},fitName:a.source==='fit'?a.title:null}));
 }
 if(!weights.error) S.weights=weights.data.map(w=>({date:w.measured_on,kg:Number(w.weight_kg)}));
 if(!statuses.error){
   for(const s of statuses.data){
     if(s.fatigue)S.fatigue[s.day]=s.fatigue;
     if(s.rest_requested)S.restDays[s.day]=true;
     if(s.football_override!==null)S.footballOverrides[s.day]=s.football_override;
     if(s.football_time)(S.matchTimes??={})[s.day]=s.football_time.slice(0,5);
   }
 }
 if(!analyses.error) cloudAnalyses = analyses.data || [];
 if(!sleep.error) cloudSleep=uniqueNights(sleep.data||[]);
 if(!checkins.error) cloudCheckins=checkins.data||[];
 if(!sets.error) cloudSets=sets.data||[];
 if(!achievements.error) cloudAchievements=achievements.data||[];
 if(!game.error) cloudGame=game.data||null;
 if(!meals.error) window.cloudMeals=meals.data||[];
 if(!goals.error) cloudGoals=goals.data||[];
 if(!reports.error) cloudReports=reports.data||[];
 if(!injuries.error) cloudInjuries=injuries.data||[];
 if(!syncs.error) cloudSync=syncs.data||[];
 if(!cloudGame&&!game.error){ await supabase.from('game_state').upsert({user_id:currentUser.id},{onConflict:'user_id',ignoreDuplicates:true}); cloudGame={level:1,xp:0,strength:1,endurance:1,recovery:1,inventory:[]}; }
 save();renderAll();
 document.getElementById('cloudStatus').textContent=failed.length?'Sincronización incompleta':'Sincronizado';
}
function setCloudUI(){
 const status=document.getElementById('cloudStatus'),detail=document.getElementById('cloudDetail'),actions=document.getElementById('authActions');
 if(currentUser){
   status.textContent='Sesión iniciada';
   detail.textContent=currentUser.email+' · proyecto Training Lab';
   actions.innerHTML=window.TrainingLab.authForm(true)+'<button class="btn alt" id="logoutBtn">Cerrar sesión</button>';
   document.getElementById('logoutBtn').onclick=async()=>{const {error}=await supabase.auth.signOut();if(error){window.TrainingLab.report('Cerrar sesión',error);return;}location.reload();};
   document.getElementById('syncNotice').textContent='Datos sincronizados con Supabase. Puedes usar la misma cuenta desde móvil y PC.';
 }else{
   status.textContent='Modo local';
   detail.textContent='Tus datos se guardan en este navegador. Inicia sesión para sincronizar móvil y PC.';
   actions.innerHTML=window.TrainingLab.authForm();
   
   document.getElementById('syncNotice').textContent='Los datos locales funcionan ya. Al iniciar sesión se sincronizarán con tu proyecto Training Lab.';
 }
}
// Auth callbacks must return immediately; cloud work runs outside the auth lock.
let authGeneration=0;
async function applySession(session){
 const generation=++authGeneration;
 const nextUser=session?.user||null;
 if(currentUser?.id!==nextUser?.id){
   currentUser=nextUser;S=load();
   cloudAnalyses=[];cloudSleep=[];cloudCheckins=[];cloudSets=[];cloudAchievements=[];cloudGame=null;
   cloudGoals=[];cloudReports=[];cloudInjuries=[];cloudSync=[];window.cloudMeals=[];dailyDraft={};
 }
 setCloudUI();renderAll();
 window.TrainingLab.update({authenticated:!!currentUser,email:currentUser?.email||null});
 if(currentUser){
   await ensureProfile();
   if(generation===authGeneration){
     await loadCloud();
     queueAutoHealthConnectSync();
   }
 }
}
window.TrainingLab.passwordAuth=async(action,email,password)=>{
 let result;
 if(action==='signin')result=await supabase.auth.signInWithPassword({email,password});
 else if(action==='signup')result=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.TrainingLab.config.redirect}});
 else if(action==='recover')result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.TrainingLab.config.redirect});
 else if(action==='update')result=await supabase.auth.updateUser({password});
 else throw new Error('Acción inválida');
 if(result.error)throw result.error;
 if(action==='signin'||(action==='signup'&&result.data.session))await applySession(result.data.session);
 if(action==='update')return 'Contraseña guardada. Ya puedes entrar con email y contraseña en la APK.';
 if(action==='recover')return 'Si la cuenta existe, recibirás un correo para recuperar el acceso. Ábrelo en el navegador y usa Guardar contraseña; después entra en la APK con esa contraseña.';
 if(action==='signup'&&!result.data.session)return 'Revisa tu correo para confirmar la cuenta. Si ya tenías cuenta, recupera el acceso o guarda una contraseña desde tu sesión abierta. Después entra con email y contraseña.';
 return 'Sesión iniciada en este dispositivo.';
};
async function initAuth(){
 try{
   const {data,error}=await supabase.auth.getSession();if(error)throw error;
   await applySession(data.session);
   supabase.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;setTimeout(()=>applySession(session).catch(e=>window.TrainingLab.report('Sesión',e)),0);});
 }catch(e){window.TrainingLab.report('Inicio de sesión',e);}
}


function metricBox(label,value){
 return `<div class="metric"><div class="k">${label}</div><div class="v" style="font-size:22px">${value}</div></div>`;
}
function drawHeatmap(track,canvasId='heatmapCanvas'){
 const c=document.getElementById(canvasId); if(!c)return;
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
 const saved=cloudCheckins.find(c=>c.checkin_date===iso());
 const answers={...saved,...dailyDraft};
 el.innerHTML=(saved?'<p class="notice">Test de hoy guardado. Puedes corregir tus respuestas.</p>':'')+CHECKIN_Q.map(([k,label])=>`<div class="qcard"><b>${label}</b><div class="scale" style="margin-top:8px">${[1,2,3,4,5].map(v=>`<button class="${answers[k]===v?'on':''}" aria-pressed="${answers[k]===v}" onclick="setScaleAnswer('${k}',${v},this)">${v}</button>`).join('')}</div></div>`).join('');
 document.querySelectorAll('[onclick^="setBoolAnswer"]').forEach(btn=>{const match=btn.getAttribute('onclick').match(/setBoolAnswer\('([^']+)',(true|false)/);if(match){const selected=answers[match[1]]===(match[2]==='true');btn.classList.toggle('on',selected);btn.setAttribute('aria-pressed',String(selected));}});
 const notes=document.getElementById('checkinNotes');if(saved&&document.activeElement!==notes&&!notes.value)notes.value=saved.notes||'';
}
window.setScaleAnswer=function(k,v,btn){dailyDraft[k]=v;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
window.setBoolAnswer=function(k,v,btn){dailyDraft[k]=v;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
window.saveCheckin=async function(){
 if(!currentUser)return alert('Inicia sesión para guardar el test diario.');
 const existed=cloudCheckins.some(c=>c.checkin_date===iso());
 const row={user_id:currentUser.id,checkin_date:iso(),notes:document.getElementById('checkinNotes').value||null};
 for(const [k] of CHECKIN_Q) if(dailyDraft[k]!=null)row[k]=dailyDraft[k];
 for(const k of ['alcohol','caffeine_late','enough_carbs','hydration_ok']) if(dailyDraft[k]!=null)row[k]=dailyDraft[k];
 const {error}=await supabase.from('daily_checkins').upsert(row,{onConflict:'user_id,checkin_date'});
 if(error)return alert(error.message); if(!existed)await awardXp(15,'daily_checkin'); dailyDraft={};await loadCloud(); alert('Check-in guardado.');
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
 if(!date||!start||!end){window.TrainingLab.report('Sueño','Completa fecha, hora de dormir y despertar.');return;}
 const mins=sleepMinutes(start,end);
 if(mins<=0||mins>16*60){window.TrainingLab.report('Sueño','Revisa la duración del sueño: debe ser mayor que cero y como máximo 16 horas.');return;}
 const stageTotal=Number(document.getElementById('deepMin').value||0)+Number(document.getElementById('remMin').value||0);
 if(stageTotal>mins){window.TrainingLab.report('Sueño','Profundo y REM no pueden superar la duración total.');return;}
 const startDt=new Date(date+'T'+start+':00');let endDt=new Date(date+'T'+end+':00');if(endDt<=startDt)endDt.setDate(endDt.getDate()+1);
 const row={user_id:currentUser.id,sleep_date:date,source:'manual',sleep_start:startDt.toISOString(),sleep_end:endDt.toISOString(),total_sleep_min:mins,
 deep_sleep_min:+document.getElementById('deepMin').value||null,rem_sleep_min:+document.getElementById('remMin').value||null,sleep_score:+document.getElementById('sleepScoreInput').value||null,
 avg_hrv:+document.getElementById('sleepHrv').value||null,resting_hr:+document.getElementById('sleepRhr').value||null};
 const {error}=await supabase.from('sleep_records').upsert(row,{onConflict:'user_id,sleep_date,source'});if(error)return alert(error.message);
 if(!cloudSleep.some(s=>s.sleep_date===date))await awardXp(10,'sleep_log');await loadCloud();
}
window.alertCorosSleep=function(){
 document.getElementById('corosSleepStatus').textContent='COROS está soportado a nivel de datos, pero tu cuenta debe autorizar el conector/API. La web seguirá funcionando con Health Connect/registro manual mientras tanto.';
}
function renderSleep(){
 const headline=document.getElementById('sleepHeadline');
 if(!headline)return;
 const recent=cloudSleep?.find(s=>(Date.now()-new Date(s.sleep_end||s.sleep_date+'T13:00:00'))/36e5<=40);
 const metrics=document.getElementById('sleepKeyMetrics'),bar=document.getElementById('sleepStageBar'),legend=document.getElementById('sleepStageLegend');
 const analysis=document.getElementById('sleepAnalysisList'),history=document.getElementById('sleepHistory'),deepStudy=document.getElementById('sleepDeepStudy');
 const verdict=document.getElementById('sleepVerdict'),windowEl=document.getElementById('sleepWindow');
 const fmtMin=m=>{m=Math.max(0,Math.round(Number(m)||0));return `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min`;};
 const localTime=v=>v?new Date(v).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—';
 const percent=(v,total)=>total>0?Math.max(0,Number(v)||0)/total*100:0;
 if(!recent){
   headline.textContent='Aún no hay sueño reciente';
   verdict.textContent='La APK intentará sincronizar Health Connect automáticamente al abrirse. También puedes usar el botón manual.';
   metrics.innerHTML=metricBox('Sueño total','—')+metricBox('Profundo','—')+metricBox('REM','—')+metricBox('Ligero','—');
   bar.innerHTML='';legend.innerHTML='';windowEl.textContent='Sin una noche reciente sincronizada.';
   analysis.innerHTML='<p class="muted">Cuando Health Connect entregue una noche aparecerá aquí el análisis.</p>';
   history.innerHTML='<p class="muted">Necesitamos noches sincronizadas.</p>';
   deepStudy.style.display='none';
   document.getElementById('todaySleep').textContent='—';document.getElementById('todaySleepWindow').textContent='Falta sueño reciente';
   return;
 }
 const total=Number(recent.total_sleep_min)||0,deep=Number(recent.deep_sleep_min)||0,light=Number(recent.light_sleep_min)||0,rem=Number(recent.rem_sleep_min)||0;
 const start=localTime(recent.sleep_start),end=localTime(recent.sleep_end);
 const sessionMin=recent.sleep_start&&recent.sleep_end?Math.max(0,(new Date(recent.sleep_end)-new Date(recent.sleep_start))/60000):total;
 const awake=recent.awake_min!=null?Number(recent.awake_min):Math.max(0,sessionMin-total);
 const pDeep=percent(deep,total),pLight=percent(light,total),pRem=percent(rem,total);
 const startDev=start!=='—'?circDistMin(start,'05:00'):null,endDev=end!=='—'?circDistMin(end,'13:00'):null;
 const target=480,diff=total-target;
 let title=total>=450?'Buena duración de sueño':total>=420?'Noche bastante completa':total>=360?'Sueño algo corto':'Sueño claramente corto';
 if(startDev!=null&&startDev<=60)title+=' y horario estable';
 else if(startDev!=null&&startDev>90)title+=' con horario desplazado';
 headline.textContent=title;
 const durationText=diff>=0?`Has superado en ${fmtMin(diff)} tu referencia práctica de 8 h.`:`Te has quedado a ${fmtMin(Math.abs(diff))} de la referencia práctica de 8 h.`;
 verdict.textContent=`Has dormido ${fmtMin(total)}. ${durationText}`;
 const scoreCard=recent.sleep_score!=null?metricBox('Sleep Score',Math.round(recent.sleep_score)):'';
 metrics.innerHTML=metricBox('Sueño total',fmtMin(total))+metricBox('Profundo',`${Math.round(deep)} min · ${pDeep.toFixed(0)}%`)+metricBox('REM',`${Math.round(rem)} min · ${pRem.toFixed(0)}%`)+metricBox('Ligero',`${Math.round(light)} min · ${pLight.toFixed(0)}%`)+scoreCard;
 const stageSum=Math.max(1,deep+light+rem+awake);
 bar.innerHTML=`<span class="deep" style="width:${deep/stageSum*100}%"></span><span class="light" style="width:${light/stageSum*100}%"></span><span class="rem" style="width:${rem/stageSum*100}%"></span>${awake>0?`<span class="awake" style="width:${awake/stageSum*100}%"></span>`:''}`;
 legend.innerHTML=`<span><i class="deep"></i><b>Profundo</b> ${Math.round(deep)} min</span><span><i class="light"></i><b>Ligero</b> ${Math.round(light)} min</span><span><i class="rem"></i><b>REM</b> ${Math.round(rem)} min</span>${awake>0?`<span><i class="awake"></i><b>Despierto/sin clasificar</b> ~${Math.round(awake)} min</span>`:''}`;
 windowEl.textContent=`Sesión registrada ${start} → ${end}${startDev!=null?` · inicio ${startDev<=60?'dentro':'fuera'} de tu ventana habitual (±1 h)`:''}`;
 const notes=[];
 notes.push(total>=420?`Duración: ${fmtMin(total)} es una base razonable para recuperación.`:`Duración: ${fmtMin(total)} puede limitar recuperación si se repite varios días.`);
 if(deep||rem||light)notes.push(`Arquitectura registrada: ${pDeep.toFixed(0)}% profundo, ${pRem.toFixed(0)}% REM y ${pLight.toFixed(0)}% ligero. Miraremos sobre todo tu propia tendencia, no una noche aislada.`);
 if(startDev!=null)notes.push(startDev<=60?`Regularidad: te dormiste prácticamente dentro de tu horario habitual; desviación ${startDev} min.`:`Regularidad: el inicio se desplazó ${startDev} min respecto a las 05:00 habituales.`);
 if(endDev!=null&&endDev>60)notes.push(`La sesión terminó ${Math.round(endDev/60*10)/10} h alejada de las 13:00 habituales. Health Connect puede incluir tiempo despierto dentro de la sesión, así que no lo tratamos automáticamente como sueño real.`);
 if(recent.avg_hrv!=null){
   const vals=cloudSleep.filter(x=>x.avg_hrv!=null).slice(0,14).map(x=>Number(x.avg_hrv));
   const baseline=vals.length>=5?vals.reduce((a,b)=>a+b,0)/vals.length:null;
   notes.push(baseline?`HRV nocturna: ${Number(recent.avg_hrv).toFixed(0)} ms frente a tu media reciente ${baseline.toFixed(0)} ms.`:`HRV nocturna: ${Number(recent.avg_hrv).toFixed(0)} ms. Necesitamos más noches para crear tu baseline.`);
 }else notes.push('HRV nocturna: Health Connect no la ha entregado en esta sincronización; no se estima ni se inventa.');
 if(recent.resting_hr!=null){
   const vals=cloudSleep.filter(x=>x.resting_hr!=null).slice(0,14).map(x=>Number(x.resting_hr));
   const baseline=vals.length>=5?vals.reduce((a,b)=>a+b,0)/vals.length:null;
   notes.push(baseline?`FC en reposo: ${Math.round(recent.resting_hr)} ppm frente a tu media reciente ${baseline.toFixed(0)} ppm.`:`FC en reposo durante la ventana: ${Math.round(recent.resting_hr)} ppm.`);
 }
 if(Array.isArray(recent.naps)&&recent.naps.length)notes.push(`Siestas detectadas: ${recent.naps.length}, ${recent.naps.reduce((s,n)=>s+Number(n.duration_min||0),0)} min en total.`);
 analysis.innerHTML=notes.map(x=>`<div class="insight">${x}</div>`).join('');
 const nights=cloudSleep.slice(0,7);
 history.innerHTML=nights.map(n=>{
   const t=Math.max(1,Number(n.total_sleep_min)||0),d=Number(n.deep_sleep_min)||0,l=Number(n.light_sleep_min)||0,r=Number(n.rem_sleep_min)||0,other=Math.max(0,t-d-l-r);
   const label=new Date(n.sleep_date+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit'});
   return `<div class="sleep-history-row"><span>${label}</span><div class="sleep-history-bar"><i class="deep" style="width:${d/t*100}%"></i><i class="light" style="width:${l/t*100}%"></i><i class="rem" style="width:${r/t*100}%"></i><i class="other" style="width:${other/t*100}%"></i></div><span>${(t/60).toFixed(1)} h</span></div>`;
 }).join('');
 if(cloudSleep.length>=7){
   const seven=cloudSleep.slice(0,7),durations=seven.map(x=>Number(x.total_sleep_min)||0),avg=durations.reduce((a,b)=>a+b,0)/durations.length;
   const variance=durations.reduce((s,x)=>s+(x-avg)**2,0)/durations.length,sd=Math.sqrt(variance);
   const starts=seven.filter(x=>x.sleep_start).map(x=>circDistMin(localTime(x.sleep_start),'05:00'));
   const avgStartDev=starts.length?starts.reduce((a,b)=>a+b,0)/starts.length:null;
   const deepPct=seven.reduce((s,x)=>s+percent(x.deep_sleep_min,x.total_sleep_min),0)/seven.length;
   const remPct=seven.reduce((s,x)=>s+percent(x.rem_sleep_min,x.total_sleep_min),0)/seven.length;
   const deepNotes=[`Últimas 7 noches: media ${fmtMin(avg)}; variación típica ±${Math.round(sd)} min.`,avgStartDev!=null?`Regularidad de inicio: desviación media ${Math.round(avgStartDev)} min respecto a las 05:00.`:'',`Promedio de fases registradas: profundo ${deepPct.toFixed(0)}% · REM ${remPct.toFixed(0)}%.`].filter(Boolean);
   if(cloudSleep.length>=14){const prev=cloudSleep.slice(7,14).map(x=>Number(x.total_sleep_min)||0),prevAvg=prev.reduce((a,b)=>a+b,0)/prev.length;deepNotes.push(`Frente a las 7 noches anteriores: ${avg>=prevAvg?'+':''}${Math.round(avg-prevAvg)} min de sueño por noche.`);}
   const hrv=seven.filter(x=>x.avg_hrv!=null).map(x=>Number(x.avg_hrv));if(hrv.length>=5)deepNotes.push(`Baseline HRV de esta semana: ${Math.round(hrv.reduce((a,b)=>a+b,0)/hrv.length)} ms.`);
   const rhr=seven.filter(x=>x.resting_hr!=null).map(x=>Number(x.resting_hr));if(rhr.length>=5)deepNotes.push(`FC reposo media de esta semana: ${Math.round(rhr.reduce((a,b)=>a+b,0)/rhr.length)} ppm.`);
   document.getElementById('sleepDeepTitle').textContent='Tu patrón · 7 noches';
   document.getElementById('sleepInsights').innerHTML=deepNotes.map(x=>`<div class="insight">${x}</div>`).join('');
   deepStudy.style.display='block';
 }else deepStudy.style.display='none';
 document.getElementById('todaySleep').textContent=(total/60).toFixed(1)+' h';document.getElementById('todaySleepWindow').textContent=`${start} → ${end}`;
}
function readiness(){return readinessModel({sleep:cloudSleep,checkins:cloudCheckins,activities:S.activities,injuries:cloudInjuries});}
function renderReadiness(){
 const r=readiness(),el=document.getElementById('readinessScore');if(!el)return;
 const label=r.score>=80?'Muy buena disponibilidad':r.score>=65?'Buena disponibilidad':r.score>=50?'Disponibilidad intermedia':'Disponibilidad baja';
 el.textContent=r.score+'/100';
 const lab=document.getElementById('readinessLabel');if(lab)lab.textContent=label;
 const why=document.getElementById('readinessWhy');if(why)why.textContent='Te orienta sobre cuánta carga tiene sentido meter hoy. Se calcula con tus datos reales y tu percepción.';
 const box=document.getElementById('readinessBreakdown');if(box){
   const parts=(r.parts||[]).filter(p=>p.label!=='Base orientativa');
   box.innerHTML=parts.length?parts.map(p=>`<div class="readiness-factor"><span>${p.label}</span><b class="${p.value>0?'delta-good':p.value<0?'delta-bad':'delta-neutral'}">${p.value>0?'+':''}${p.value}</b></div>`).join(''):'<div class="small muted">Todavía faltan datos para desglosarlo bien.</div>';
   if(r.missing?.length)box.innerHTML+=`<div class="small muted readiness-missing">Aún faltan: ${r.missing.join(', ')}.</div>`;
 }
}

function calcRecovery(date=new Date()){const now=iso(date)===iso()?new Date():new Date(iso(date)+'T15:00:00');return recoveryModel({activities:S.activities,sets:cloudSets,now});}
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
 if(currentUser){await supabase.from('injuries').insert({user_id:currentUser.id,body_area:area,side,pain_score:pain,onset_date:document.getElementById('injuryDate').value||iso(),status:'active',trigger:text||null,red_flags:red,advice});await loadCloud();}
}
window.saveStrengthSet=async function(){
 if(!currentUser)return alert('Inicia sesión.');
 const row={user_id:currentUser.id,exercise:document.getElementById('setExercise').value,muscle_group:document.getElementById('setMuscle').value,reps:+document.getElementById('setReps').value||null,weight_kg:+document.getElementById('setWeight').value||null,rir:+document.getElementById('setRir').value||null,rpe:+document.getElementById('setRpe').value||null};
 if(!row.exercise)return alert('Pon el ejercicio.');
 const {error}=await supabase.from('strength_sets').insert(row);if(error)return alert(error.message);await awardXp(4,'strength_set');await loadCloud();
}
function renderCompare(){
 const sel=document.getElementById('compareSelector');if(!sel)return;
 const acts=S.activities.filter(a=>['football','run'].includes(a.type)&&a.distance).slice(-16).reverse();
 sel.innerHTML=acts.map((a,i)=>`<label class="checkline"><input class="cmp" type="checkbox" data-i="${i}" onchange="runCompare()"> ${a.date} · ${a.type} · ${Number(a.distance).toFixed(2)} km · FC ${a.hr||'—'} · HI ${Math.round(a.highIntensity||0)} m</label>`).join('')||'<p class="muted">Necesitas al menos dos actividades con métricas.</p>';
 renderStrengthCompare();
}
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.runCompare=function(){
 const acts=S.activities.filter(a=>['football','run'].includes(a.type)&&a.distance).slice(-16).reverse();
 const inputs=[...document.querySelectorAll('.cmp:checked')];
 inputs.slice(5).forEach(x=>x.checked=false);
 const selected=inputs.slice(0,5).map(x=>acts[Number(x.dataset.i)]).sort((a,b)=>a.date.localeCompare(b.date));
 const el=document.getElementById('compareResult');
 if(selected.length<2){el.textContent='Selecciona entre 2 y 5 actividades.';return;}
 if(selected.some(a=>a.type!==selected[0].type)){el.textContent='Selecciona actividades del mismo deporte.';return;}
 const metric=(a,key)=>a.metrics?.[key]??cloudAnalyses.find(x=>x.activity_id===a.id)?.summary?.[key]??null;
 const fields=[['Distancia (km)',a=>a.distance],['Movimiento (min)',a=>a.moving||null],['FC media (ppm)',a=>a.hr||null],['Carga (min × RPE)',a=>a.rpe&&a.duration?a.rpe*a.duration:null]];
 if(selected[0].type==='football')fields.push(['m/min',a=>a.moving?a.distance*1000/a.moving:null],['Z4/Z5 (%)',a=>metric(a,'hrZone45Share')===null?null:metric(a,'hrZone45Share')*100],['Alta intensidad (m)',a=>metric(a,'highIntensityM')],['Sprints relativos',a=>metric(a,'sprintCount')],['Sprints >18 km/h',a=>metric(a,'absoluteSprintCount')],['Velocidad robusta (km/h)',a=>metric(a,'robustTopKmh')],['P99 velocidad (km/h)',a=>metric(a,'p99TopKmh')],['Primeros 10 min (m)',a=>metric(a,'first10MinM')],['Últimos 10 min (m)',a=>metric(a,'last10MinM')]);
 else fields.push(['Ritmo (min/km)',a=>a.pace?a.pace/60:null],['Desnivel (m)',a=>metric(a,'elevationGainM')]);
 const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(1);
 const head='<tr><th>Métrica</th>'+selected.map(a=>'<th>'+escapeHtml(a.date)+'</th>').join('')+'</tr>';
 el.innerHTML='<div style="overflow-x:auto"><table><thead>'+head+'</thead><tbody>'+fields.map(([name,get])=>'<tr><th>'+name+'</th>'+selected.map(a=>'<td>'+fmt(get(a))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const first=selected[0],last=selected.at(-1),oldHi=metric(first,'highIntensityM'),newHi=metric(last,'highIntensityM');
 if(first.type==='football'&&oldHi>0&&newHi!=null&&first.hr>0&&last.hr>0){const delta=(newHi-oldHi)/oldHi*100,hr=last.hr-first.hr;el.innerHTML+='<p class="notice">Última frente a primera: '+(delta>=0?'+':'')+delta.toFixed(0)+' % de alta intensidad y '+(hr>=0?'+':'')+hr+' ppm de FC media. Asociación ≠ causalidad; revisa duración, posición y contexto.</p>';}
 if(first.type==='run'&&first.hr&&last.hr&&Math.abs(first.hr-last.hr)<=3&&first.pace&&last.pace)el.innerHTML+='<p class="notice">FC similar (±3 ppm): diferencia de ritmo '+(last.pace-first.pace).toFixed(0)+' s/km. Revisa desnivel y condiciones; no prueba por sí sola una mejora fisiológica.</p>';
 if(first.type==='football')selected.forEach((act,i)=>{const track=cloudAnalyses.find(x=>x.activity_id===act.id)?.track_points;if(track?.length){const canvas=document.createElement('canvas');canvas.id='compareHeatmap'+i;canvas.width=400;canvas.height=260;canvas.style.cssText='width:100%;max-width:400px';canvas.setAttribute('aria-label','Recorrido relativo '+act.date);el.append(canvas);drawHeatmap(track,canvas.id);}});
};
function renderStrengthCompare(){
 const el=document.getElementById('strengthCompare');if(!el)return;const by={};
 for(const s of cloudSets){const date=iso(new Date(s.performed_at)),ex=s.exercise||'Sin ejercicio';((by[ex]??={})[date]??=[]).push(s);}
 el.innerHTML=Object.entries(by).slice(0,12).map(([exercise,days])=>{
 const rows=Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).slice(-5).map(([date,sets])=>{
 const reps=sets.reduce((sum,s)=>sum+Number(s.reps||0),0),volume=sets.reduce((sum,s)=>sum+Number(s.reps||0)*Number(s.weight_kg||0),0);
 const estimates=sets.filter(s=>s.weight_kg>0&&s.reps>=1&&s.reps<=12).map(s=>Number(s.weight_kg)*(1+Number(s.reps)/30));
 return '<tr><td>'+date+'</td><td>'+sets.length+'</td><td>'+reps+'</td><td>'+volume.toFixed(0)+'</td><td>'+(estimates.length?Math.max(...estimates).toFixed(1):'—')+'</td></tr>';
 }).join('');return '<h3>'+escapeHtml(exercise)+'</h3><div style="overflow-x:auto"><table><tr><th>Fecha</th><th>Series</th><th>Reps</th><th>kg·rep</th><th>1RM estimado</th></tr>'+rows+'</table></div>';
 }).join('')||'Registra series para comparar sesiones por ejercicio.';
 if(cloudSets.length)el.innerHTML+='<p class="small muted">1RM orientativo (Epley, series de 1–12 reps). El tonelaje depende también del número de series y no equivale a fuerza máxima.</p>';
}
function targetsForToday(){
 const p=adaptivePlan(new Date()),football=footballScheduled(new Date()),carbs=football?390:(p.kind==='rest'?275:330);
 return {protein:130,carbs,fat:75};
}
function todayMeals(){
 const now=iso();return (window.cloudMeals||[]).filter(x=>x.eaten_at&&iso(new Date(x.eaten_at))===now)
}
function renderMealPlanner(){
 const el=document.getElementById('macroRemaining');if(!el)return;const t=targetsForToday(),m=todayMeals(),sum=k=>m.reduce((s,x)=>s+Number(x[k]||0),0);
 const rem={p:Math.max(0,t.protein-sum('protein_g')),c:Math.max(0,t.carbs-sum('carbs_g')),f:Math.max(0,t.fat-sum('fat_g'))};
 el.innerHTML=`<div class="grid g3"><div class="metric"><div class="k">Proteína restante</div><div class="v">${Math.round(rem.p)} g</div></div><div class="metric"><div class="k">HC restantes</div><div class="v">${Math.round(rem.c)} g</div></div><div class="metric"><div class="k">Grasa restante</div><div class="v">${Math.round(rem.f)} g</div></div></div>`;
 el.innerHTML+=`<p class="small muted">Consumido / objetivo: proteína ${Math.round(sum('protein_g'))} / ${t.protein} g · HC ${Math.round(sum('carbs_g'))} / ${t.carbs} g · grasas ${Math.round(sum('fat_g'))} / ${t.fat} g. Las comidas sugeridas usan porciones estimadas.</p>`;
 const eaten=t.carbs-rem.c;document.getElementById('macroFuel').style.width=Math.min(100,eaten/t.carbs*100)+'%';
 const plan=[['desayuno','Avena + skyr + plátano'],['comida','Arroz/pasta + pollo + verduras'],['merienda',footballScheduled(new Date())?'Bocadillo ligero + plátano':'Batido + fruta'],['cena',footballScheduled(new Date())?'Arroz/patata + proteína postpartido':'Pescado/carne + patata/arroz'],['recena','Skyr/leche + fruta']];
 document.getElementById('mealPlanSlots').innerHTML=plan.map(([slot,name])=>`<div class="meal-slot"><b>${slot}</b><br><span class="muted">${name}</span><button class="btn alt" style="margin-top:6px" onclick="logSuggestedMeal('${slot}','${name.replaceAll("'","")}')">✓ He comido algo así</button></div>`).join('');
}
window.logSuggestedMeal=async function(type,title){
 if(!currentUser)return alert('Inicia sesión.');
 const defaults={desayuno:[30,70,15],comida:[40,95,18],merienda:[25,65,10],cena:[38,80,20],recena:[20,35,8]},v=defaults[type]||[25,60,15];
 await supabase.from('meal_logs').insert({user_id:currentUser.id,meal_type:type,title,protein_g:v[0],carbs_g:v[1],fat_g:v[2]});window.cloudMeals=(window.cloudMeals||[]);window.cloudMeals.push({eaten_at:new Date().toISOString(),meal_type:type,protein_g:v[0],carbs_g:v[1],fat_g:v[2]});renderMealPlanner();
}

function renderFootballHub(){
 const title=document.getElementById('footballHubTitle');if(!title)return;
 const now=new Date(),isMatch=footballScheduled(now),time=S.matchTimes?.[iso()],input=document.getElementById('footballHubTime');
 if(input&&document.activeElement!==input)input.value=time||'';
 const match=time?new Date(iso()+'T'+time+':00'):null,ms=match?match-now:null,hours=ms==null?null:ms/36e5;
 const countdown=document.getElementById('footballHubCountdown'),label=document.getElementById('footballHubCountdownLabel');
 const fat=fatigueFor(now),ready=readiness(),rec=calcRecovery(now),legs=Math.round((rec.cuadriceps+rec.isquios+rec.gemelos+rec.gluteo)/4);
 document.getElementById('footballReadiness').textContent=ready.score+'/100';
 document.getElementById('footballReadinessText').textContent=ready.score>=65?'contexto favorable':ready.score>=50?'conviene moderar':'prioriza recuperación';
 document.getElementById('footballLegs').textContent=legs+'%';document.getElementById('footballFatigue').textContent=fat+'/5';
 document.getElementById('footballHubStatus').textContent=isMatch?'Pachanga confirmada para hoy.':'Todavía no has confirmado pachanga hoy.';
 if(!isMatch){title.textContent='¿Hay pachanga hoy?';document.getElementById('footballHubSubtitle').textContent='Confírmala para adaptar esta pantalla y la planificación del día.';countdown.textContent='—';label.textContent='sin partido confirmado';}
 else if(!time){title.textContent='Pachanga confirmada';document.getElementById('footballHubSubtitle').textContent='Añade la hora para activar la cuenta atrás y los consejos por momento.';countdown.textContent='—';label.textContent='hora por confirmar';}
 else if(ms>0){title.textContent='Hoy hay partido';document.getElementById('footballHubSubtitle').textContent='La preparación se adapta a lo que falta para empezar.';const hh=Math.floor(ms/36e5),mm=Math.floor((ms%36e5)/60000);countdown.textContent=`${hh}h ${mm}m`;label.textContent='para empezar';}
 else {title.textContent='Partido en curso o recién terminado';document.getElementById('footballHubSubtitle').textContent='Al terminar, deja que Health Connect sincronice o sube el FIT.';countdown.textContent='POST';label.textContent='recuperación';}

 const nowTitle=document.getElementById('footballNowTitle'),nowAdvice=document.getElementById('footballNowAdvice'),fuel=document.getElementById('footballFuelAdvice');
 if(!isMatch){nowTitle.textContent='Día sin partido confirmado';nowAdvice.innerHTML='<p>Si finalmente juegas, pulsa <b>Jugaré hoy</b> y pon la hora. Training Lab recalculará la carga del día.</p>';fuel.innerHTML='<p>Mantén tu alimentación normal según la carga prevista.</p>';}
 else if(hours==null){nowTitle.textContent='Pon la hora del partido';nowAdvice.innerHTML='<p>Con la hora podremos decirte cuándo hacer la comida principal, merienda y calentamiento.</p>';fuel.innerHTML='<p>Prioriza carbohidratos durante el día y llega bien hidratado.</p>';}
 else if(hours>4){nowTitle.textContent='Carga combustible con calma';nowAdvice.innerHTML='<p>Quedan más de 4 horas. Haz una comida normal rica en carbohidratos, proteína suficiente y sin pasarte con grasa/fibra si suelen sentarte pesadas.</p>';fuel.innerHTML='<p><b>4–6 h antes:</b> arroz, pasta, patata o pan + proteína. Bebe de forma repartida; no intentes compensar litros justo antes.</p>';}
 else if(hours>1.5){nowTitle.textContent='Merienda y empieza a prepararte';nowAdvice.innerHTML='<p>Evita comidas grandes. Un aporte fácil de carbohidratos y líquido suele ser suficiente.</p>';fuel.innerHTML='<p><b>90–120 min:</b> bocadillo sencillo, yogur + cereal, plátano, avena ligera o similar. Ajusta cantidades a tu tolerancia.</p>';}
 else if(hours>.45){nowTitle.textContent='Últimos preparativos';nowAdvice.innerHTML='<p>Ya no interesa comer pesado. Organiza botas, agua y empieza a moverte progresivamente cuando falten unos 15 minutos.</p>';fuel.innerHTML='<p>Si tienes hambre, algo pequeño y fácil: plátano, tostada con miel o bebida con carbohidratos.</p>';}
 else if(hours>0){nowTitle.textContent='Calentamiento';nowAdvice.innerHTML='<p><b>Haz ahora el protocolo de 12–15 minutos de abajo.</b> La última aceleración debe dejarte preparado, no fatigado.</p>';fuel.innerHTML='<p>Solo pequeños sorbos si lo necesitas.</p>';}
 else {nowTitle.textContent='Recuperación postpartido';nowAdvice.innerHTML='<p>Camina unos minutos antes de quedarte parado, rehidrata y mete carbohidratos + proteína en las próximas horas.</p>';fuel.innerHTML='<p>Si has sudado mucho, acompaña el líquido con comida salada/electrolitos según tolerancia.</p>';}

 const lower=['isquios','cuadriceps','gemelo','tobillo','pie','rodilla','aductor','ingle','gluteo'];
 const injury=cloudInjuries.find(i=>i.status==='active'&&lower.includes(String(i.body_area).toLowerCase())&&Number(i.pain_score||0)>=3);
 const alert=document.getElementById('footballWarmupAlert');
 if(injury)alert.innerHTML=`<div class="warning"><b>Molestia registrada: ${escapeHtml(injury.body_area)}</b><br>Calienta más progresivo y no uses los sprints para “comprobar” la zona. Si el dolor aumenta, altera la carrera o te hace proteger la pierna, no fuerces el partido.</div>`;
 else if(fat>=4||ready.score<50||legs<50)alert.innerHTML='<div class="warning"><b>Hoy no llegas especialmente fresco.</b><br>Alarga 3–5 minutos la parte progresiva, reduce la intensidad de las primeras acciones y no conviertas el calentamiento en un test máximo.</div>';
 else alert.innerHTML='<div class="notice"><b>Contexto razonable para jugar.</b><br>Haz el calentamiento completo aunque te notes bien; las aceleraciones deben ser progresivas.</div>';

 document.getElementById('footballPostAdvice').innerHTML='<p><b>0–10 min:</b> 5–8 min andando suave; evita pasar de máxima intensidad a sentarte sin transición.</p><p><b>30–120 min:</b> líquido + comida con 25–40 g de proteína y carbohidratos abundantes.</p><p><b>Día siguiente:</b> paseo/movilidad suave y decide la carga con sueño, piernas y molestias reales.</p>';
 const last=S.activities.filter(a=>a.type==='football').sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(last){document.getElementById('footballLastTitle').textContent=`Partido · ${last.date}`;document.getElementById('footballLastSummary').innerHTML=`${last.duration?`<b>${Math.round(last.duration)} min</b> · `:''}${last.distance?`${Number(last.distance).toFixed(2)} km · `:''}${last.hr?`FC media ${Math.round(last.hr)} · `:''}${last.highIntensity?`${Math.round(last.highIntensity)} m alta intensidad · `:''}${last.absSprints!=null?`${last.absSprints} esfuerzos >18 km/h`:''}`||'Partido registrado. Sube o sincroniza el FIT para ampliar métricas.';}
}
window.saveFootballHubTime=async function(){
 const input=document.getElementById('footballHubTime'),time=input?.value;if(!time){window.TrainingLab.report('Partido','Introduce una hora válida.');return;}
 (S.matchTimes??={})[iso()]=time;S.footballOverrides[iso()]=true;save();
 if(currentUser)await supabase.from('daily_status').upsert({user_id:currentUser.id,day:iso(),football_time:time,football_override:true},{onConflict:'user_id,day'});
 renderAll();
};


function renderMatchReport(){
 const headline=document.getElementById('matchReportHeadline');if(!headline)return;
 const football=[...S.activities].filter(a=>a.type==='football'&&!a.planned).sort((a,b)=>(b.started_at||b.date).localeCompare(a.started_at||a.date));
 const latest=football[0];
 const metrics=document.getElementById('matchReportMetrics'),verdict=document.getElementById('matchReportVerdict'),insights=document.getElementById('matchReportInsights'),comparison=document.getElementById('matchReportComparison'),recovery=document.getElementById('matchReportRecovery');
 if(!latest){
   headline.textContent='Aún no hay partido analizado';document.getElementById('matchReportDate').textContent='';
   verdict.textContent='Cuando llegue una pachanga desde Health Connect o un FIT, Training Lab generará aquí el parte automático.';
   metrics.innerHTML='';insights.innerHTML='<p class="muted">Sin datos todavía.</p>';comparison.innerHTML='<p class="muted">Necesitamos partidos anteriores.</p>';recovery.innerHTML='';return;
 }
 const analysis=cloudAnalyses.find(x=>x.activity_id===latest.id),summary=analysis?.summary||{},report=analysis?.report||{};
 const val=(key,fallback=null)=>summary[key]??latest.metrics?.[key]??fallback;
 const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
 const distance=num(latest.distance)||num(val('distanceKm'));
 const moving=num(latest.moving)||num(val('movingTimeMin'));
 const duration=num(latest.duration)||num(val('durationMin'));
 const avgHr=num(latest.hr)||num(val('avgHr'));
 const maxHr=num(latest.hrmax)||num(val('maxHr'));
 const high=num(latest.highIntensity)||num(val('highIntensityM'));
 const sprints=num(latest.sprints)||num(val('sprintCount'));
 const absSprints=num(latest.absSprints); const absCount=absSprints!==null?absSprints:num(val('absoluteSprintCount'));
 const top=num(latest.topSpeed)||num(val('robustTopKmh'))||num(val('p99TopKmh'));
 const first10=num(val('first10MinM')),last10=num(val('last10MinM'));
 const z45=num(val('hrZone45Share'));
 const mpm=distance&&moving?distance*1000/moving:null;
 document.getElementById('matchReportDate').textContent=latest.date||'';
 const boxes=[];
 if(distance!==null)boxes.push(metricBox('Distancia',distance.toFixed(2)+' km'));
 if(avgHr!==null)boxes.push(metricBox('FC media',Math.round(avgHr)+' ppm'));
 if(high!==null)boxes.push(metricBox('Alta intensidad',Math.round(high)+' m'));
 if(absCount!==null)boxes.push(metricBox('Sprints >18',Math.round(absCount)));
 if(top!==null)boxes.push(metricBox('Vel. robusta',top.toFixed(1)+' km/h'));
 if(mpm!==null)boxes.push(metricBox('Ritmo de trabajo',mpm.toFixed(0)+' m/min'));
 metrics.innerHTML=boxes.slice(0,6).join('')||metricBox('Partido','registrado');

 const notes=[];
 if(duration!==null)notes.push(`Jugaste ${Math.round(duration)} min${moving&&Math.abs(moving-duration)>2?`, con ${Math.round(moving)} min en movimiento`:''}.`);
 if(z45!==null)notes.push(`Pasaste aproximadamente ${(z45*100).toFixed(0)}% del tiempo de FC en zonas altas Z4–Z5.`);
 if(first10!==null&&last10!==null){
   const delta=last10-first10,pct=first10>0?delta/first10*100:null;
   if(pct!==null&&pct>=8)notes.push(`Terminaste con más producción: últimos 10 min ${Math.round(last10)} m frente a ${Math.round(first10)} m al inicio (+${pct.toFixed(0)}%).`);
   else if(pct!==null&&pct<=-12)notes.push(`La producción cayó al final: últimos 10 min ${Math.round(last10)} m frente a ${Math.round(first10)} m al inicio (${pct.toFixed(0)}%). Puede reflejar fatiga, contexto o posición.`);
   else notes.push(`Producción bastante estable: ${Math.round(first10)} m en los primeros 10 min y ${Math.round(last10)} m en los últimos.`);
 }
 if(high!==null&&high>=900)notes.push(`Partido con mucha carga de alta intensidad (${Math.round(high)} m).`);
 if(absCount!==null&&absCount>=6)notes.push(`Acumulaste ${Math.round(absCount)} esfuerzos por encima de 18 km/h.`);
 if(report.analysis)notes.push(report.analysis);
 insights.innerHTML=notes.length?notes.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join(''):'<p class="muted">El partido está registrado, pero aún faltan métricas para una lectura más profunda.</p>';

 const previous=football.slice(1,6);
 const comparable=previous.map(a=>{
   const an=cloudAnalyses.find(x=>x.activity_id===a.id),sm=an?.summary||{};
   return {a,d:num(a.distance)||num(sm.distanceKm),hr:num(a.hr)||num(sm.avgHr),hi:num(a.highIntensity)||num(sm.highIntensityM),move:num(a.moving)||num(sm.movingTimeMin),last10:num(sm.last10MinM),first10:num(sm.first10MinM)};
 });
 const avg=key=>{const xs=comparable.map(x=>x[key]).filter(x=>x!==null);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null};
 const comp=[];
 const avgHi=avg('hi'),avgHrPrev=avg('hr'),avgDist=avg('d');
 if(previous.length<2)comp.push('Necesitamos al menos 2 partidos previos para sacar conclusiones personales con más sentido.');
 if(high!==null&&avgHi!==null){const d=(high-avgHi)/avgHi*100;comp.push(`Alta intensidad: ${d>=0?'+':''}${d.toFixed(0)}% frente a tu media de ${comparable.filter(x=>x.hi!==null).length} partidos recientes.`);}
 if(avgHr!==null&&avgHrPrev!==null)comp.push(`FC media: ${avgHr-avgHrPrev>=0?'+':''}${(avgHr-avgHrPrev).toFixed(0)} ppm frente a tu media reciente.`);
 if(distance!==null&&avgDist!==null){const d=(distance-avgDist)/avgDist*100;comp.push(`Distancia: ${d>=0?'+':''}${d.toFixed(0)}% frente a tu media reciente.`);}
 if(first10!==null&&last10!==null&&comparable.some(x=>x.first10&&x.last10)){
   const fade=(last10-first10)/Math.max(1,first10)*100;
   const fades=comparable.filter(x=>x.first10&&x.last10).map(x=>(x.last10-x.first10)/x.first10*100);const base=fades.reduce((a,b)=>a+b,0)/fades.length;
   comp.push(`Final vs inicio: ${fade-base>=0?'+':''}${(fade-base).toFixed(0)} puntos porcentuales respecto a tu patrón reciente.`);
 }
 comparison.innerHTML=comp.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join('');

 let title='Partido registrado';
 if(first10!==null&&last10!==null&&last10>first10*1.08)title='Buen final de partido';
 else if(first10!==null&&last10!==null&&last10<first10*.82)title='La intensidad cayó al final';
 else if(high!==null&&avgHi!==null&&high>avgHi*1.12&&(avgHrPrev===null||avgHr<=avgHrPrev+4))title='Más producción sin disparar el coste';
 else if(high!==null&&high>=900)title='Partido de carga alta';
 else if(mpm!==null&&mpm>=90)title='Partido de ritmo alto';
 headline.textContent=title;
 const pieces=[];
 if(high!==null)pieces.push(`${Math.round(high)} m de alta intensidad`);
 if(avgHr!==null)pieces.push(`FC media ${Math.round(avgHr)} ppm`);
 if(absCount!==null)pieces.push(`${Math.round(absCount)} sprints >18 km/h`);
 verdict.textContent=pieces.length?pieces.join(' · ')+'.':'Parte creado con los datos disponibles.';

 const hard=(high!==null&&high>=900)||(z45!==null&&z45>=.35)||(latest.rpe&&latest.rpe>=8)||(first10!==null&&last10!==null&&last10<first10*.8);
 recovery.innerHTML=`<div class="${hard?'warning':'notice'}"><b>Próximas 24 h</b><br>${hard?'Prioriza recuperación: caminar/movilidad suave, hidratarte, carbohidratos y proteína. Evita pierna dura mientras siga cargada.':'Recuperación normal: movimiento suave, comida completa y reevalúa piernas mañana antes de añadir carga.'}</div>`;
}


let footballTrendMetric='high';
function footballTrendRows(){
 return [...S.activities]
  .filter(a=>a.type==='football'&&!a.planned)
  .sort((a,b)=>(a.started_at||a.date).localeCompare(b.started_at||b.date))
  .slice(-10)
  .map(a=>{
    const sm=cloudAnalyses.find(x=>x.activity_id===a.id)?.summary||{};
    const n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
    const distance=n(a.distance)??n(sm.distanceKm),moving=n(a.moving)??n(sm.movingTimeMin);
    const first=n(sm.first10MinM),last=n(sm.last10MinM);
    return {
      date:a.date,
      high:n(a.highIntensity)??n(sm.highIntensityM),
      hr:n(a.hr)??n(sm.avgHr),
      sprints:n(a.absSprints)??n(sm.absoluteSprintCount),
      mpm:distance&&moving?distance*1000/moving:null,
      distance,
      finish:first&&last?(last-first)/first*100:null
    };
  });
}
function drawFootballTrend(){
 const svg=document.getElementById('footballTrendChart');if(!svg)return;
 const rows=footballTrendRows(),cfg={
   high:['Alta intensidad','m',v=>Math.round(v)],
   hr:['FC media','ppm',v=>Math.round(v)],
   sprints:['Sprints >18 km/h','',v=>Math.round(v)],
   mpm:['Ritmo de trabajo','m/min',v=>Math.round(v)],
   distance:['Distancia','km',v=>v.toFixed(2)],
   finish:['Final vs inicio','%',v=>(v>=0?'+':'')+v.toFixed(0)]
 }[footballTrendMetric];
 document.querySelectorAll('[data-football-metric]').forEach(b=>b.classList.toggle('on',b.dataset.footballMetric===footballTrendMetric));
 const valid=rows.map((r,i)=>({...r,i,value:r[footballTrendMetric]})).filter(r=>r.value!==null);
 document.getElementById('footballTrendSample').textContent=valid.length?`${valid.length} partido${valid.length===1?'':'s'} con esta métrica`:'sin datos para esta métrica';
 if(!valid.length){svg.innerHTML='<text x="380" y="150" text-anchor="middle" class="chart-empty">Aún no hay datos suficientes</text>';renderFootballTrendStats(rows,valid,cfg);return;}
 const W=760,H=300,pad={l:52,r:24,t:24,b:48};
 let min=Math.min(...valid.map(x=>x.value)),max=Math.max(...valid.map(x=>x.value));
 if(min===max){min-=1;max+=1;} const spread=max-min;min-=spread*.12;max+=spread*.12;
 if(footballTrendMetric==='finish'){min=Math.min(min,0);max=Math.max(max,0);}
 const x=i=>pad.l+(i/Math.max(1,valid.length-1))*(W-pad.l-pad.r),y=v=>pad.t+(max-v)/(max-min)*(H-pad.t-pad.b);
 const ticks=[0,.25,.5,.75,1].map(t=>{const v=max-(max-min)*t,yy=pad.t+(H-pad.t-pad.b)*t;return `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" class="chart-grid"/><text x="${pad.l-8}" y="${yy+4}" text-anchor="end" class="chart-axis">${cfg[2](v)}</text>`}).join('');
 const zero=footballTrendMetric==='finish'&&min<0&&max>0?`<line x1="${pad.l}" y1="${y(0)}" x2="${W-pad.r}" y2="${y(0)}" class="chart-zero"/>`:'';
 const path=valid.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(r.value).toFixed(1)).join(' ');
 const pts=valid.map((r,i)=>`<g><circle cx="${x(i)}" cy="${y(r.value)}" r="5" class="chart-point"/><text x="${x(i)}" y="${H-24}" text-anchor="middle" class="chart-date">${r.date.slice(5).replace('-','/')}</text><text x="${x(i)}" y="${y(r.value)-11}" text-anchor="middle" class="chart-value">${cfg[2](r.value)}</text></g>`).join('');
 svg.innerHTML=ticks+zero+`<path d="${path}" class="chart-line"/>`+pts;
 renderFootballTrendStats(rows,valid,cfg);
}
function renderFootballTrendStats(rows,valid,cfg){
 const stats=document.getElementById('footballTrendStats'),ins=document.getElementById('footballTrendInsights');if(!stats||!ins)return;
 if(!valid.length){stats.innerHTML='';ins.innerHTML='<div class="insight muted">Sin datos suficientes para calcular tendencia.</div>';return;}
 const vals=valid.map(x=>x.value),avg=vals.reduce((a,b)=>a+b,0)/vals.length,last=vals.at(-1),best=footballTrendMetric==='hr'?Math.min(...vals):Math.max(...vals);
 stats.innerHTML=metricBox('Último',`${cfg[2](last)}${cfg[1]?' '+cfg[1]:''}`)+metricBox('Media',`${cfg[2](avg)}${cfg[1]?' '+cfg[1]:''}`)+metricBox(footballTrendMetric==='hr'?'FC más baja':'Mejor registro',`${cfg[2](best)}${cfg[1]?' '+cfg[1]:''}`);
 const notes=[];
 if(valid.length<4)notes.push('Con menos de 4 partidos, esto es histórico descriptivo; todavía no lo tratamos como tendencia.');
 else {
   const split=Math.floor(valid.length/2),old=valid.slice(0,split).map(x=>x.value),recent=valid.slice(split).map(x=>x.value),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
   const a=mean(old),b=mean(recent),delta=b-a,pct=a!==0?delta/Math.abs(a)*100:null;
   if(footballTrendMetric==='hr'){
     if(delta<=-3)notes.push(`Tu FC media reciente está ${Math.abs(delta).toFixed(0)} ppm por debajo de la primera mitad del historial.`);
     else if(delta>=3)notes.push(`Tu FC media reciente está ${delta.toFixed(0)} ppm por encima de la primera mitad; revisa también ritmo, calor y carga del partido.`);
     else notes.push('La FC media está bastante estable entre la primera y la segunda mitad del historial.');
   } else if(pct!==null&&pct>=8)notes.push(`${cfg[0]} ha subido aproximadamente ${pct.toFixed(0)}% en la mitad más reciente del historial.`);
   else if(pct!==null&&pct<=-8)notes.push(`${cfg[0]} ha bajado aproximadamente ${Math.abs(pct).toFixed(0)}% en la mitad más reciente.`);
   else notes.push(`${cfg[0]} se mantiene bastante estable en tus partidos recientes.`);
 }
 const enriched=rows.filter(r=>r.high!==null&&r.hr!==null);
 if(enriched.length>=5){
   const half=Math.floor(enriched.length/2),old=enriched.slice(0,half),recent=enriched.slice(half),mean=(a,k)=>a.reduce((s,x)=>s+x[k],0)/a.length;
   const hiDelta=(mean(recent,'high')-mean(old,'high'))/Math.max(1,mean(old,'high'))*100,hrDelta=mean(recent,'hr')-mean(old,'hr');
   if(hiDelta>=10&&hrDelta<=3)notes.push(`Señal interesante: alta intensidad +${hiDelta.toFixed(0)}% con solo ${hrDelta>=0?'+':''}${hrDelta.toFixed(0)} ppm de cambio en FC media. Es compatible con mejor eficiencia, aunque no demuestra por sí sola una mejora fisiológica.`);
 }
 const finishes=rows.filter(r=>r.finish!==null).map(r=>r.finish);
 if(finishes.length>=4){const recent=finishes.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,finishes.length);if(recent>=5)notes.push('En tus últimos partidos estás terminando, de media, con más producción en los últimos 10 min que en los primeros.');else if(recent<=-15)notes.push('Se repite una caída clara al final. Conviene vigilar sueño, combustible previo y cuánto aprietas al inicio.');}
 ins.innerHTML=notes.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join('');
}
function renderFootballTrends(){drawFootballTrend();}
window.setFootballTrendMetric=function(metric){footballTrendMetric=metric;drawFootballTrend();};

function renderMatchMode(){
 const panel=document.getElementById('matchDayPanel');if(!panel)return;const isMatch=footballScheduled(new Date());panel.style.display=isMatch?'block':'none';if(!isMatch)return;
 const time=S.matchTimes?.[iso()],now=new Date(),match=time?new Date(iso()+'T'+time+':00'):null;
 const ms=match?match-now:Infinity,h=Math.floor(Math.max(0,ms)/3600000),m=Math.floor(Math.max(0,ms)%3600000/60000);
 document.getElementById('matchCountdown').textContent=!time?'Hora por confirmar':ms<=0?'Hora de partido alcanzada':`${h}h ${m}m`;
 const input=document.getElementById('matchTime');if(input&&document.activeElement!==input)input.value=time||'';
 const t=targetsForToday(),mels=todayMeals(),c=mels.reduce((s,x)=>s+Number(x.carbs_g||0),0),pct=Math.min(100,c/t.carbs*100);
 document.getElementById('matchFuel').style.width=pct+'%';document.getElementById('matchFuelText').textContent=`${Math.round(c)} / ${t.carbs} g de HC objetivo`;
 document.getElementById('matchMealAdvice').innerHTML=ms/3600000>4?'<div class="notice">Prioriza ahora una comida alta en carbohidratos y moderada en grasa/fibra.</div>':ms/3600000>1.5?'<div class="notice">Merienda fácil: pan/arroz/avena + fruta; evita una comida muy pesada.</div>':'<div class="notice">Pequeño aporte fácil si tienes hambre: plátano, tostada con miel o bebida con carbohidrato.</div>';
 if(ms<=0)document.getElementById('matchMealAdvice').textContent='Al terminar, registra el partido o sube el FIT para adaptar la recuperación.';
}
window.saveMatchTime=async function(){
 const time=document.getElementById('matchTime').value;
 if(!time){window.TrainingLab.report('Partido','Introduce una hora válida.');return;}
 if(currentUser)await supabase.from('daily_status').upsert({user_id:currentUser.id,day:iso(),football_time:time,football_override:true},{onConflict:'user_id,day'});
 (S.matchTimes??={})[iso()]=time;S.footballOverrides[iso()]=true;save();renderAll();
};
function renderPostMatch(){
 const el=document.getElementById('postMatchRecovery');if(!el)return;
 const f=S.activities.filter(a=>a.type==='football').sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!f){document.getElementById('postMatchTitle').textContent='Sin partido reciente detectado';el.textContent='Tras registrar/subir un partido, aquí aparecerá una rutina de recuperación adaptada.';return}
 const start=f.started_at|| (S.matchTimes?.[f.date]?f.date+'T'+S.matchTimes[f.date]+':00':null);
 if(!start){document.getElementById('postMatchTitle').textContent='Partido registrado · hora desconocida';return;}
 const ended=new Date(start).getTime()+(Number(f.duration)||0)*60000,age=(Date.now()-ended)/3600000;
 if(age<0||age>36){document.getElementById('postMatchTitle').textContent='Sin partido reciente finalizado';el.textContent='La recuperación aparecerá tras un partido finalizado en las últimas 36 horas.';return;}
 const high=f.highIntensity||0,hard=(f.rpe||8)>=8||high>=900||(f.hr&&f.hr>=158);
 document.getElementById('postMatchTitle').textContent=hard?'Recuperación prioritaria tras el partido':'Recuperación tras tu último partido';
 el.innerHTML=`<div class="grid g3"><div class="notice"><b>0–20 min</b><br>5–8 min caminando, rehidratar y no pasar de sprint a quedarte inmóvil.</div><div class="notice"><b>Comida</b><br>25–40 g proteína + carbohidratos abundantes. ${high?`Has registrado ${Math.round(high)} m de alta intensidad.`:''}</div><div class="${hard?'warning':'notice'}"><b>Próximas 24 h</b><br>${hard?'Torso ligero o descanso. Nada de pierna pesada si sigue cargada.':'Actividad suave y reevalúa piernas/readiness.'}</div></div>`;
}
async function awardXp(amount,reason){
 if(!currentUser)return;
 let g=cloudGame||{level:1,xp:0,strength:1,endurance:1,recovery:1,inventory:[],equipped:{}},xp=(g.xp||0)+amount,level=g.level||1,need=level*100,inv=[...(g.inventory||[])];
 const loot=[
  {name:'Botas del Corredor',slot:'boots',rarity:'rare',effects:{endurance:1}},
  {name:'Guantes de Hierro',slot:'gloves',rarity:'rare',effects:{strength:1}},
  {name:'Amuleto del Sueño',slot:'amulet',rarity:'epic',effects:{recovery:2}},
  {name:'Cinturón de Recuperación',slot:'belt',rarity:'rare',effects:{recovery:1}},
  {name:'Anillo del Todocampista',slot:'ring',rarity:'legendary',effects:{strength:1,endurance:1,recovery:1}}
 ];
 while(xp>=need){xp-=need;level++;need=level*100;const base=loot[(level-2)%loot.length];inv.push({...base,uid:crypto.randomUUID(),level,found_at:new Date().toISOString()})}
 await supabase.from('game_state').upsert({user_id:currentUser.id,level,xp,inventory:inv,equipped:g.equipped||{}},{onConflict:'user_id'});
 cloudGame={...g,level,xp,inventory:inv};
}
window.checkAchievements=async function(){
 if(!currentUser)return alert('Inicia sesión.');
 const runTarget=weekRunTarget(),c=counts(),candidates=[],weights=[...S.weights].sort((a,b)=>a.date.localeCompare(b.date));
 if(c.gym>=3)candidates.push(['weekly_strength_3_'+iso(mondayOf()),'Semana de Hierro','Has completado 3 sesiones de fuerza esta semana.',40,'rare']);
 if(c.run>=2)candidates.push(['weekly_aerobic_2_'+iso(mondayOf()),'Motor Aeróbico','Has completado 2 rodajes aeróbicos esta semana.',35,'rare']);
 if(c.football>=2)candidates.push(['weekly_football_2_'+iso(mondayOf()),'Doble Jornada','Has jugado 2 pachangas esta semana.',30,'common']);
 if(cloudSleep.filter(x=>(x.total_sleep_min||0)>=420).slice(0,7).length>=5)candidates.push(['sleep_5x7h_'+iso(mondayOf()),'Guardia del Sueño','5 noches recientes con al menos 7 horas.',50,'epic']);
 if(cloudAnalyses.length>=1)candidates.push(['first_fit','Cartógrafo del Esfuerzo','Has completado tu primer análisis FIT.',25,'common']);
 if(cloudAnalyses.length>=10)candidates.push(['ten_fit','Archivista del Rendimiento','10 actividades FIT analizadas.',80,'epic']);
 if(weights.some(w=>w.kg>=72))candidates.push(['weight_72','Masa Crítica','Has alcanzado 72 kg.',100,'legendary']);
 let added=0;
 for(const [code,title,description,xp,rarity] of candidates){
   if(!cloudAchievements.some(a=>a.code===code)){
     const {error}=await supabase.from('achievements').insert({user_id:currentUser.id,code,title,description,xp,rarity});
     if(!error){await awardXp(xp,'achievement');added++}
   }
 }
 await loadCloud();alert(added?`Has desbloqueado ${added} logro(s).`:'No hay nuevos logros todavía.');
}
function renderRpg(){
 const g=cloudGame||{level:1,xp:0,inventory:[],equipped:{}},need=(g.level||1)*100,baseStats=derivedGameStats();
 const eq=Object.values(g.equipped||{});const bonus=k=>eq.reduce((s,it)=>s+Number(it?.effects?.[k]||0),0);
 const stats={strength:baseStats.strength+bonus('strength'),endurance:baseStats.endurance+bonus('endurance'),recovery:baseStats.recovery+bonus('recovery')};
 for(const [id,val] of [['rpgLevel','Nivel '+(g.level||1)],['statStrength',stats.strength],['statEndurance',stats.endurance],['statRecovery',stats.recovery],['todayLevel',g.level||1]]){let e=document.getElementById(id);if(e)e.textContent=val}
 let e=document.getElementById('todayXp');if(e)e.textContent=(g.xp||0)+' XP';e=document.getElementById('rpgXpText');if(e)e.textContent=`${g.xp||0} / ${need} XP`;e=document.getElementById('rpgXpBar');if(e)e.style.width=Math.min(100,(g.xp||0)/need*100)+'%';
 e=document.getElementById('inventory');if(e)e.innerHTML=(g.inventory||[]).map((it,i)=>{const equipped=eq.some(x=>x?.uid&&x.uid===it.uid);const eff=Object.entries(it.effects||{}).map(([k,v])=>`+${v} ${k}`).join(' · ');return `<div class="item rarity-${it.rarity||'common'} ${equipped?'equipped':''}" onclick="equipItem(${i})">🎁<br><b>${it.name}</b><br><span class="rar">${eff||it.rarity||''}</span></div>`}).join('')||'<span class="muted">Todavía vacío.</span>';
 e=document.getElementById('equippedItems');if(e)e.textContent=eq.length?'Equipado: '+eq.map(x=>x.name).join(' · '):'Toca un objeto para equiparlo. Sus bonus solo afectan al personaje, nunca a tus recomendaciones médicas/de entrenamiento.';
 e=document.getElementById('achievementList');if(e)e.innerHTML=(cloudAchievements||[]).map(a=>`<div class="badge rarity-${a.rarity}"><b>${a.title}</b><br><span class="muted">${a.description||''} · +${a.xp} XP</span></div>`).join('')||'<p class="muted">Todavía sin logros.</p>';
}
window.generateWeeklyReport=async function(){
 const runTarget=weekRunTarget();
 const m=mondayOf(),end=addDays(m,6),acts=weekActivities(),c=counts(),weights=[...S.weights].sort((a,b)=>a.date.localeCompare(b.date));
 const sleep=cloudSleep.filter(s=>new Date(s.sleep_date+'T12:00:00')>=m&&new Date(s.sleep_date+'T12:00:00')<=addDays(end,1));
 const sleepAvg=sleep.length?sleep.reduce((x,s)=>x+(s.total_sleep_min||0),0)/sleep.length/60:null;
 const load=acts.reduce((x,a)=>x+(a.duration||0)*(a.rpe||0),0),km=acts.reduce((x,a)=>x+(a.distance||0),0);
 let wt='sin suficientes datos';if(weights.length>=2)wt=`${weights.at(-2).kg.toFixed(1)} → ${weights.at(-1).kg.toFixed(1)} kg`;
 const txt=`FUERZA: ${c.gym}/3\nRUNNING: ${c.run}/2\nFÚTBOL: ${c.football}\nCARGA: ${Math.round(load)} min×RPE\nDISTANCIA: ${km.toFixed(1)} km\nSUEÑO MEDIO: ${sleepAvg?sleepAvg.toFixed(1)+' h':'—'}\nPESO: ${wt}\n\nRECOMENDACIÓN: ${c.gym<3?'priorizar fuerza; ':''}${c.run<runTarget?'mantener al menos un rodaje fácil; ':''}${sleepAvg&&sleepAvg<7?'proteger algo más el sueño; ':''}${load>1200?'reducir carga desplazable la próxima semana.':'mantener progresión gradual.'}`;
 document.getElementById('weeklyReport').textContent=txt;
 const existed=cloudReports.some(r=>r.week_start===iso(m));
 if(currentUser){
   await supabase.from('weekly_reports').upsert({user_id:currentUser.id,week_start:iso(m),week_end:iso(end),summary:{gym:c.gym,run:c.run,football:c.football,load,km,sleepAvg},report:{text:txt,generatedBy:'manual-v2'}},{onConflict:'user_id,week_start'});
   if(!existed)await awardXp(20,'weekly_report');
   await loadCloud();
 }
}
function renderWeeklyAuto(){const n=new Date();if(n.getDay()===0){document.getElementById('weeklyReportTitle').textContent='Hoy toca revisión semanal';window.generateWeeklyReport()}}


function smartHomeContext(){
 const now=new Date(),today=iso(),plan=adaptivePlan(now),ready=readiness(),rec=calcRecovery(now);
 const legs=Math.round((rec.cuadriceps+rec.isquios+rec.gemelos+rec.gluteo)/4),fat=fatigueFor(now);
 const sleep=cloudSleep?.find(x=>Math.abs((new Date(x.sleep_date+'T12:00:00')-new Date(today+'T12:00:00'))/86400000)<=1)||null;
 const checked=cloudCheckins.some(x=>x.checkin_date===today),isMatch=footballScheduled(now),time=S.matchTimes?.[today]||null;
 const match=time?new Date(today+'T'+time+':00'):null,hours=match?(match-now)/3600000:null;
 const lower=['isquios','cuadriceps','gemelo','tobillo','pie','rodilla','aductor','ingle','gluteo'];
 const injury=cloudInjuries.find(i=>i.status==='active'&&lower.includes(String(i.body_area).toLowerCase())&&Number(i.pain_score||0)>=3)||null;
 return {now,today,plan,ready,rec,legs,fat,sleep,checked,isMatch,time,match,hours,injury,meal:mealForHour(now.getHours())};
}
function renderSmartHome(){
 const c=smartHomeContext(),legsEl=document.getElementById('homeLegs'),legsText=document.getElementById('homeLegsText');
 if(legsEl)legsEl.textContent=c.legs+'%';
 if(legsText)legsText.textContent=c.legs>=75?'bien recuperadas':c.legs>=50?'recuperación intermedia':'recuperación baja';
 const stamp=document.getElementById('homeContextStamp');if(stamp)stamp.textContent='actualizado '+String(c.now.getHours()).padStart(2,'0')+':'+String(c.now.getMinutes()).padStart(2,'0');
 const checkBtn=document.getElementById('homeCheckinBtn');if(checkBtn){checkBtn.hidden=c.checked;checkBtn.textContent='Check-in rápido';}

 let decision={tag:'Plan del día',title:c.plan.title,text:c.plan.reason};
 if(c.isMatch){
   if(c.hours===null)decision={tag:'PARTIDO HOY',title:'Pachanga · falta la hora',text:'El fútbol manda sobre el resto del plan. Añade la hora en Fútbol para ajustar comida y calentamiento.'};
   else if(c.hours>6)decision={tag:'PARTIDO HOY',title:'Pachanga · prepara el día',text:'Reserva las piernas. Prioriza carbohidratos e hidratación repartida y evita una sesión dura de tren inferior.'};
   else if(c.hours>2)decision={tag:`PARTIDO EN ${Math.floor(c.hours)} H`,title:'Pachanga · combustible y calma',text:'No añadas carga dura. Come fácil, hidrátate y guarda las piernas para el partido.'};
   else if(c.hours>.5)decision={tag:'PARTIDO CERCA',title:'Pachanga · últimos preparativos',text:'Nada pesado ahora. Organiza material, pequeños sorbos y empieza el calentamiento cuando falten unos 15 minutos.'};
   else if(c.hours>0)decision={tag:'CALENTAMIENTO',title:'Pachanga · calienta ahora',text:'Haz el protocolo progresivo de 12–15 min. No conviertas el calentamiento en un test máximo.'};
   else decision={tag:'POSTPARTIDO',title:'Recuperar',text:'Camina unos minutos, rehidrata y mete carbohidratos + proteína. La siguiente carga depende de cómo queden las piernas.'};
 }
 if(c.injury&&Number(c.injury.pain_score||0)>=5)decision={tag:'MODIFICAR CARGA',title:c.isMatch?'Pachanga con precaución':'Evita cargar la zona',text:`Tienes ${escapeHtml(c.injury.body_area)} con dolor ${Number(c.injury.pain_score)}/10. Si aumenta, altera la carrera o limita el apoyo, no fuerces.`};
 if(c.ready.score<45&&!c.isMatch)decision={tag:'RECUPERACIÓN',title:'Descanso / paseo suave',text:'El contexto de hoy no favorece meter intensidad. Prioriza sueño, comida y movimiento suave.'};
 document.getElementById('todayPlan').textContent=decision.title;
 document.getElementById('todayReason').textContent=decision.text;
 const tag=document.getElementById('homeDecisionTag');if(tag)tag.textContent=decision.tag;
 const ctx=document.getElementById('homeDecisionContext');if(ctx){
   const sleepTxt=c.sleep?`${(Number(c.sleep.total_sleep_min||0)/60).toFixed(1)} h sueño`:'sueño pendiente';
   ctx.innerHTML=`<span>Estado ${c.ready.score}/100</span><span>Piernas ${c.legs}%</span><span>${sleepTxt}</span><span>Fatiga ${c.fat}/5</span>`;
 }
}
function renderCoachTasks(){
 const el=document.getElementById('coachTasks');if(!el)return;
 const c=smartHomeContext(),tasks=[];
 const push=(priority,icon,title,text,action=null,label=null)=>tasks.push({priority,icon,title,text,action,label});

 if(c.injury){
   const pain=Number(c.injury.pain_score||0);push(pain>=5?100:80,'⚠️',`Molestia: ${c.injury.body_area} ${pain}/10`,pain>=5?'No uses el calentamiento ni los sprints para probar la zona. Reduce o cancela si cambia tu forma de correr.':'Calienta progresivamente y vigila si el dolor aumenta con velocidad o cambios de dirección.',`navTo('recuperacion')`,'Ver recuperación');
 }
 if(c.isMatch){
   if(c.hours===null)push(96,'⚽','Hoy hay pachanga','Falta la hora. Añádela para que la Home pueda decirte cuándo comer y cuándo empezar el calentamiento.',`navTo('futbol')`,'Poner hora');
   else if(c.hours>0&&c.hours<=.5)push(99,'🔥','Calentamiento ahora',`Faltan ${Math.max(1,Math.round(c.hours*60))} min. Haz el calentamiento progresivo de 12–15 min.`,`navTo('futbol')`,'Abrir calentamiento');
   else if(c.hours>0&&c.hours<=2)push(94,'⚽','Partido muy cerca',`Faltan ${Math.round(c.hours*60)} min. Evita comida pesada y no añadas entrenamiento.`,`navTo('futbol')`,'Modo partido');
   else if(c.hours>0&&c.hours<=6){
     const t=targetsForToday(),carbs=todayMeals().reduce((sum,x)=>sum+Number(x.carbs_g||0),0);
     push(90,'🍌','Combustible para el partido',`Faltan ${c.hours.toFixed(1)} h. Llevas ~${Math.round(carbs)} g de HC; objetivo diario orientativo ${t.carbs} g.`,`navTo('comer')`,'Ver comida');
   } else if(c.hours!==null&&c.hours<=0)push(95,'🧊','Recuperación postpartido','Camina, rehidrata y come. Cuando llegue Health Connect/FIT, el parte del partido se actualizará solo.',`navTo('futbol')`,'Ver parte');
 }
 if(c.sleep){
   const mins=Number(c.sleep.total_sleep_min||0);
   if(mins<360)push(88,'🌙','Sueño claramente corto',`Has dormido ${(mins/60).toFixed(1)} h. Protege la recuperación y evita añadir intensidad que no sea necesaria.`,`navTo('sueno')`,'Ver sueño');
   else if(mins<420)push(74,'🌙','Sueño algo corto',`Has dormido ${(mins/60).toFixed(1)} h. No invalida el día, pero pesa en la decisión de carga.`,`navTo('sueno')`,'Ver sueño');
 }else push(70,'🌙','Falta el sueño reciente','La sincronización automática no ha dejado una noche reciente. Puedes forzar Health Connect desde Sueño.',`navTo('sueno')`,'Ver sueño');
 if(c.legs<45)push(86,'🦵','Piernas poco recuperadas',`Recuperación estimada ${c.legs} %. Evita pierna dura y sprints extra fuera de un partido confirmado.`,`navTo('recuperacion')`,'Ver piernas');
 else if(c.legs<60)push(64,'🦵','Piernas a media carga',`Recuperación estimada ${c.legs} %. Mejor no añadir trabajo intenso innecesario.`,`navTo('recuperacion')`,'Ver recuperación');
 if(c.ready.score<50)push(82,'🧭','Estado para entrenar bajo',`${c.ready.score}/100. Mira el desglose antes de añadir carga desplazable.`,null,null);
 if(!c.checked)push(68,'✓','Falta tu check-in','30 segundos de energía, agujetas, estrés y motivación mejoran la interpretación del día.',`navTo('checkin')`,'Responder');
 const nowHour=c.now.getHours();
 if(!c.isMatch&&nowHour>=18&&nowHour<21)push(45,'🥪','Ahora toca merienda','Aprovecha para acercarte al objetivo de proteína y carbohidratos sin tener que compensar al final del día.',`navTo('comer')`,'Ver opciones');
 if(c.now.getDay()===0&&!S.weights.some(w=>w.date===c.today))push(55,'⚖️','Control de peso pendiente','Si todavía estás en condiciones comparables, registra el peso; si no, mejor esperar al próximo control.',`navTo('registro');document.getElementById('weightKg').focus()`,'Registrar');

 const selected=tasks.sort((a,b)=>b.priority-a.priority).slice(0,3);
 if(!selected.length)selected.push({icon:'✓',title:'Todo en orden',text:'No hay ninguna prioridad especial ahora mismo. Sigue el plan del día.'});
 el.innerHTML=selected.map((t,i)=>`<div class="coach-task smart-priority"><div class="priority-rank">${i+1}</div><div class="task-main"><div class="task-icon">${t.icon}</div><div><b>${escapeHtml(t.title)}</b><div class="muted small">${escapeHtml(t.text)}</div></div></div>${t.action?`<button class="btn alt" onclick="${t.action}">${t.label}</button>`:''}</div>`).join('');
 renderSmartHome();
}

window.answerGoal=async function(id,status){
 if(!currentUser)return;
 const goal=cloudGoals.find(g=>g.id===id);if(!goal||goal.status!=='pending')return;
 const {error}=await supabase.from('goal_confirmations').update({status,answered_at:new Date().toISOString()}).eq('id',id);
 if(error)return alert(error.message);
 if(status==='yes')await awardXp(Number(goal.xp_reward||10),'goal_confirmation');
 await loadCloud();
}

let healthConnectSilent=false;
let autoHealthConnectQueued=false;
function queueAutoHealthConnectSync(){
 if(!currentUser||autoHealthConnectQueued)return;
 if(!(window.TrainingLabAndroid&&typeof window.TrainingLabAndroid.syncHealthConnect==='function'))return;
 const key='traininglab-hc-auto:'+currentUser.id,now=Date.now(),last=Number(sessionStorage.getItem(key)||0);
 if(now-last<90000)return;
 sessionStorage.setItem(key,String(now));
 autoHealthConnectQueued=true;
 setTimeout(()=>{autoHealthConnectQueued=false;window.syncHealthConnect({silent:true,auto:true}).catch(e=>window.TrainingLab.report('Health Connect automático',e));},350);
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queueAutoHealthConnectSync();});
window.addEventListener('focus',()=>queueAutoHealthConnectSync());
window.syncHealthConnect=async function(options={}){
 if(!currentUser)return alert('Inicia sesión primero: Health Connect necesita sincronizar los datos con tu usuario.');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return alert('La sesión ha caducado. Vuelve a iniciar sesión.');
 if(window.TrainingLabAndroid && typeof window.TrainingLabAndroid.syncHealthConnect==='function'){
   healthConnectSilent=!!options?.silent;
   const sleepStatus=document.getElementById('sleepSyncStatus');if(sleepStatus)sleepStatus.textContent=options?.auto?'Sincronizando Health Connect automáticamente…':'Sincronizando Health Connect…';
   try{window.TrainingLabAndroid.syncHealthConnect(session.access_token,SUPABASE_URL);}
   catch(e){healthConnectSilent=false;if(sleepStatus)sleepStatus.textContent='No se pudo iniciar la sincronización.';if(!options?.silent)alert('No pude iniciar Health Connect: '+e.message);else window.TrainingLab.report('Health Connect',e);}
 }else if(!options?.silent){
   alert('Health Connect solo puede leerse desde la APK Training Lab Android. En el navegador normal no existe el puente nativo.');
 }
}
window.healthConnectSyncFinished=async function(payload){
 let info={};try{info=typeof payload==='string'?JSON.parse(payload):payload||{}}catch{}
 const silent=healthConnectSilent;healthConnectSilent=false;
 await loadCloud();
 renderAdaptiveActivityResponse();renderWeek();renderToday();reorderHomeForContext();
 const el=document.getElementById('sleepSyncStatus');if(el)el.textContent=`Health Connect sincronizado · ${info.sleep??0} sueño(s) · ${info.activities??0} entrenamiento(s)`;
 if(!silent)alert(`Health Connect sincronizado: ${info.sleep??0} sueños y ${info.activities??0} entrenamientos.`);
}
window.healthConnectSyncError=function(message){
 const silent=healthConnectSilent;healthConnectSilent=false;
 const el=document.getElementById('sleepSyncStatus');if(el)el.textContent='Health Connect: '+message;
 if(!silent)alert('Health Connect: '+message);else window.TrainingLab.report('Health Connect automático',message);
}

function renderSyncSources(){
 const el=document.getElementById('syncSources');if(!el)return;
 const hc=cloudSync.find(x=>x.source==='health_connect'),coros=cloudSync.find(x=>x.source==='coros');
 const fmt=x=>x?.last_sync_at?new Date(x.last_sync_at).toLocaleString('es-ES'):'sin sincronizar';
 el.innerHTML=`<div class="source-row"><span><i class="status-dot ${hc?'ok':'wait'}"></i>Health Connect</span><span class="muted small">${hc?'última '+fmt(hc):'bridge Android pendiente'}</span></div><div class="source-row"><span><i class="status-dot ${coros?'ok':'wait'}"></i>COROS</span><span class="muted small">${coros?'última '+fmt(coros):'autorización pendiente'}</span></div>`;
 const sleepStatus=document.getElementById('sleepSyncStatus');if(sleepStatus){const d=hc?.details||{};sleepStatus.textContent=hc?`Health Connect · última ${fmt(hc)} · ${d.sleep??0} sueño(s) · ${d.activities??0} entrenamiento(s)`:'Health Connect sin sincronizar todavía.';}
}
function renderWeeklyReportFromCloud(){
 const el=document.getElementById('weeklyReport');if(!el)return;
 const r=cloudReports?.[0];
 if(r?.report?.text){
   el.textContent=r.report.text;
   const auto=r.report.generatedBy==='cron-v1';
   document.getElementById('weeklyReportTitle').textContent=`Semana ${r.week_start} → ${r.week_end}${auto?' · automático':''}`;
 }
}
function renderCorrelations(){
 const el=document.getElementById('correlationInsights');if(!el)return;
 const insights=[];
 const football=S.activities.filter(a=>a.type==='football'&&a.hr&&a.distance);
 function paired(filterFn){
   const vals=[];
   for(const a of football){
     const d=new Date(a.date+'T12:00:00'),prev=iso(addDays(d,-1));
     const c=cloudCheckins.find(x=>x.checkin_date===prev||x.checkin_date===a.date);
     if(c&&filterFn(c))vals.push(a);
   }
   return vals;
 }
 const goodSleep=football.filter(a=>{
   const d=new Date(a.date+'T12:00:00');const s=cloudSleep.find(x=>Math.abs((new Date(x.sleep_date+'T12:00:00')-d)/86400000)<=1);return s&&(s.total_sleep_min||0)>=420;
 });
 const lowSleep=football.filter(a=>{
   const d=new Date(a.date+'T12:00:00');const s=cloudSleep.find(x=>Math.abs((new Date(x.sleep_date+'T12:00:00')-d)/86400000)<=1);return s&&(s.total_sleep_min||0)<420;
 });
 if(goodSleep.length>=5&&lowSleep.length>=5){
   const g=goodSleep.reduce((s,a)=>s+a.hr,0)/goodSleep.length,l=lowSleep.reduce((s,a)=>s+a.hr,0)/lowSleep.length;
   insights.push(`Con ≥7 h de sueño tu FC media en fútbol es ${g.toFixed(0)} ppm frente a ${l.toFixed(0)} ppm con <7 h. Aún es asociación, no causalidad.`);
 }
 const carbYes=paired(c=>c.enough_carbs===true),carbNo=paired(c=>c.enough_carbs===false);
 if(carbYes.length>=5&&carbNo.length>=5){
   const metric=a=>a.highIntensity;
   if([...carbYes,...carbNo].some(a=>!Number.isFinite(a.highIntensity)))return;
   const y=carbYes.reduce((s,a)=>s+metric(a),0)/carbYes.length,n=carbNo.reduce((s,a)=>s+metric(a),0)/carbNo.length;
   insights.push(`Cuando marcas “carbohidratos suficientes”, tu trabajo intenso/volumen asociado es ${((y-n)/Math.max(1,n)*100).toFixed(0)} % diferente.`);
 }
 if(cloudCheckins.length<10)insights.push(`Llevas ${cloudCheckins.length} check-ins. A partir de ~10–20 registros empiezan a tener sentido las primeras comparaciones.`);
 insights.push('Asociación ≠ causalidad. Mínimo 5 sesiones por grupo; compara condiciones y duración similares.');
 el.innerHTML=insights.map(x=>`<div class="insight">${x}</div>`).join('');
}
function renderQuestList(){
 const el=document.getElementById('rpgQuests');if(!el)return;const q=cloudGoals.filter(x=>x.status==='pending');
 el.innerHTML=q.length?q.map(g=>`<div class="quest"><b>${g.prompt}</b><div class="muted small">${g.category} · +${g.xp_reward} XP</div><div class="actions"><button class="btn" onclick="answerGoal('${g.id}','yes')">Sí</button><button class="btn alt" onclick="answerGoal('${g.id}','no')">No</button><button class="btn alt" onclick="answerGoal('${g.id}','skipped')">Omitir</button></div></div>`).join(''):'<p class="muted">No hay misiones pendientes.</p>';
}
function derivedGameStats(){
 const strengthSessions=S.activities.filter(a=>a.type==='gym').length;
 const enduranceSessions=S.activities.filter(a=>a.type==='football'||a.type==='run').length;
 const recoveryInputs=cloudSleep.length+cloudCheckins.length;
 return {strength:1+Math.floor(strengthSessions/4)+Math.floor(cloudSets.length/25),endurance:1+Math.floor(enduranceSessions/5),recovery:1+Math.floor(recoveryInputs/14)};
}
window.equipItem=async function(index){
 if(!currentUser||!cloudGame)return;const item=(cloudGame.inventory||[])[index];if(!item)return;
 const equipped={...(cloudGame.equipped||{})};equipped[item.slot||'trinket']=item;
 const {error}=await supabase.from('game_state').update({equipped}).eq('user_id',currentUser.id);if(error)return alert(error.message);
 cloudGame={...cloudGame,equipped};renderRpg();
}
function formatActivityDuration(mins){
 const sec=Math.max(0,Math.round(Number(mins||0)*60));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}
function activityLabel(type){return ({run:'Carrera',football:'Fútbol',gym:'Fuerza',walk:'Paseo',other:'Actividad'})[type]||'Actividad';}
function activityIcon(type){return ({run:'🏃',football:'⚽',gym:'🏋️',walk:'🚶',other:'●'})[type]||'●';}
function activityPace(a){
 const sec=Number(a.pace)||(a.distance>0&&a.duration>0?(a.duration*60/a.distance):0);if(!sec)return null;
 return `${Math.floor(sec/60)}′${String(Math.round(sec%60)).padStart(2,'0')}″/km`;
}
function latestTodayActivity(){
 return [...S.activities].filter(a=>a.date===iso()&&['run','football','gym','walk'].includes(a.type))
   .sort((a,b)=>new Date(b.started_at||b.date+'T12:00:00')-new Date(a.started_at||a.date+'T12:00:00'))[0]||null;
}
function recentSameType(a,limit=5){
 return [...S.activities].filter(x=>x.type===a.type&&x.id!==a.id&&x.date<=a.date)
   .sort((x,y)=>new Date(y.started_at||y.date+'T12:00:00')-new Date(x.started_at||x.date+'T12:00:00')).slice(0,limit);
}
function avg(vals){const v=vals.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
function pctDelta(v,base){return Number.isFinite(v)&&Number.isFinite(base)&&base!==0?(v-base)/base*100:null;}
function signedPct(v){return `${v>=0?'+':''}${v.toFixed(0)} %`;}
function activityEnd(a){
 const start=a.started_at?new Date(a.started_at):null;if(!start||Number.isNaN(start.getTime()))return null;
 return new Date(start.getTime()+Number(a.duration||0)*60000);
}
function activityPaceSec(a){return Number(a.pace)||(a.distance>0&&a.duration>0?(a.duration*60/a.distance):0);}
function formatPaceSec(sec){if(!sec||!Number.isFinite(sec))return null;return `${Math.floor(sec/60)}′${String(Math.round(sec%60)).padStart(2,'0')}″/km`;}
function activityReference(a){
 const peers=recentSameType(a,5),last=peers[0]||null;
 return {peers,last,avgDistance:avg(peers.map(x=>Number(x.distance)).filter(x=>x>0)),avgDuration:avg(peers.map(x=>Number(x.duration)).filter(x=>x>0)),avgHr:avg(peers.map(x=>Number(x.hr)).filter(x=>x>0)),avgPace:avg(peers.map(activityPaceSec).filter(x=>x>0))};
}
function sessionLoadEstimate(a){
 const ref=activityReference(a);let score=0,reasons=[];const dur=Number(a.duration||0),rpe=Number(a.rpe||0),hr=Number(a.hr||0);
 if(dur>=75){score+=2;reasons.push('duración larga')}else if(dur>=45){score+=1;reasons.push('duración media')}
 if(rpe>=8){score+=2;reasons.push('RPE alto')}else if(rpe>=6){score+=1;reasons.push('RPE moderado')}
 if(hr&&ref.avgHr&&hr-ref.avgHr>=8){score+=1;reasons.push('FC por encima de tu referencia')}
 if(a.type==='football'){score+=1;reasons.push('fútbol = carga intermitente alta')}
 if(a.type==='run'&&Number(a.distance)>=10){score+=1;reasons.push('volumen de carrera alto')}
 const level=score>=4?'alta':score>=2?'moderada':'baja';
 return {level,score,gauge:level==='alta'?88:level==='moderada'?62:36,reasons};
}
function activityReport(a){
 const ref=activityReference(a),load=sessionLoadEstimate(a),pace=activityPaceSec(a),paceGain=ref.avgPace&&pace?(ref.avgPace-pace)/ref.avgPace*100:null,hrDelta=ref.avgHr&&a.hr?Number(a.hr)-ref.avgHr:null,distDelta=ref.avgDistance&&a.distance?(Number(a.distance)-ref.avgDistance)/ref.avgDistance*100:null;
 let title=`${activityLabel(a.type)} registrada`,text='La actividad real ya ha cambiado tu planificación de hoy.';
 if(a.type==='run'){
   if(ref.peers.length>=3&&paceGain!=null&&paceGain>=4&&(!hrDelta||hrDelta<=3)){title='Más rápido sin pagar más pulsaciones';text='Tu ritmo ha mejorado frente a tus salidas recientes sin un aumento claro de la FC media.';}
   else if(ref.peers.length>=3&&paceGain!=null&&paceGain>=4){title='Buen salto de ritmo';text='Has corrido más rápido que tu referencia reciente. Ahora interesa ver cuánto costó en pulsaciones y recuperación.';}
   else if(ref.peers.length>=3&&hrDelta!=null&&hrDelta>=8&&(paceGain==null||paceGain<3)){title='Pulso más alto de lo habitual';text='La FC media ha quedado por encima de tu referencia reciente sin una mejora equivalente del ritmo. Puede influir fatiga, calor, terreno o sensaciones.';}
   else if(ref.peers.length>=3&&distDelta!=null&&distDelta>=12){title='Más volumen que en tus últimas salidas';text='Has acumulado más distancia que tu media reciente; la recuperación de hoy gana importancia.';}
   else if(Number(a.duration||0)<=40){title='Rodaje corto: suma sin ocupar todo el día';text='Sesión compacta. Cuenta como trabajo aeróbico y evita añadir otro rodaje solo por cumplir el plan.';}
   else {title='Carrera completada · toca absorberla';text='Training Lab da por hecho el trabajo aeróbico de hoy y recalcula lo siguiente desde esta sesión.';}
 }else if(a.type==='football'){
   title=load.level==='alta'?'Partido de carga alta · prioriza piernas':'Pachanga registrada · ahora manda recuperar';
   text='El fútbol pasa a ser la sesión intensa del día y condiciona las próximas 24–36 h.';
 }else if(a.type==='gym'){title='Fuerza registrada · estímulo cubierto';text='La fuerza realizada ya cuenta para el reparto semanal; no hay que duplicarla por mantener el plan antiguo.';}
 const chips=[`Carga estimada ${load.level}`];
 if(paceGain!=null&&Math.abs(paceGain)>=2)chips.push(`Ritmo ${paceGain>=0?'+':''}${paceGain.toFixed(0)} %`);
 if(hrDelta!=null&&Math.abs(hrDelta)>=2)chips.push(`FC ${hrDelta>=0?'+':''}${Math.round(hrDelta)} ppm`);
 if(distDelta!=null&&Math.abs(distDelta)>=5)chips.push(`Distancia ${distDelta>=0?'+':''}${distDelta.toFixed(0)} %`);
 return {title,text,chips,load,ref};
}
function activityCard(a){
 const report=activityReport(a),primary=a.distance>0?`${Number(a.distance).toFixed(2)} km`:formatActivityDuration(a.duration),pace=a.type==='run'?formatPaceSec(activityPaceSec(a)):null;
 const when=a.started_at?new Date(a.started_at).toLocaleString('es-ES',{weekday:'long',hour:'2-digit',minute:'2-digit'}):'hoy';
 const source=a.source==='health_connect'?'Health Connect':a.source==='fit'?'FIT':'Training Lab';
 const stats=[a.duration?['TIEMPO',formatActivityDuration(a.duration)]:null,pace?['RITMO',pace]:null,a.hr?['FC MEDIA',`${Math.round(a.hr)} ppm`]:null,a.hrmax?['FC MÁX',`${Math.round(a.hrmax)} ppm`]:null,a.kcal?['ENERGÍA',`${Math.round(a.kcal)} kcal`]:null].filter(Boolean).slice(0,4);
 return `<button class="coros-activity-card activity-${escapeHtml(a.type||'other')}" onclick="navTo('entrenos')" style="--load:${report.load.gauge}%"><div class="coros-card-top"><div><span class="coros-sport-icon">${activityIcon(a.type)}</span><b>${escapeHtml(activityLabel(a.type))}</b></div><span class="coros-source">${source}</span></div><div class="coros-card-main"><div class="coros-card-copy"><div class="coros-primary">${primary}</div><div class="coros-subline">${escapeHtml([a.duration?formatActivityDuration(a.duration):null,pace].filter(Boolean).join(' · '))}</div><div class="coros-activity-title">${escapeHtml(a.title||activityLabel(a.type))}</div><div class="coros-date">${escapeHtml(when)}</div></div><div class="coros-load-ring"><div><span>${activityIcon(a.type)}</span><b>${report.load.level}</b><small>carga</small></div></div></div><div class="coros-stat-grid">${stats.map(x=>`<div><small>${x[0]}</small><b>${escapeHtml(x[1])}</b></div>`).join('')}</div></button>`;
}
function recoveryForActivity(a){
 const duration=Number(a.duration||0),rpe=Number(a.rpe||0),hard=rpe>=8||duration>=75||(a.type==='football'&&duration>=50);
 const sinceEnd=activityEnd(a)?Math.max(0,(Date.now()-activityEnd(a))/60000):null;
 const fresh=sinceEnd!=null&&sinceEnd<120;
 if(a.type==='run')return {
   title:hard?'Carrera exigente registrada · ahora toca absorberla':'Carrera registrada · el plan cambia a recuperación',
   text:`Esta carrera ya cuenta como tu trabajo aeróbico de hoy. Training Lab no añadirá otra sesión solo por cumplir el plan.`,
   recovery:[fresh?'5–10 min andando muy suave para bajar pulsaciones y soltar piernas.':'Paseo suave opcional si notas las piernas rígidas; no necesitas “compensar” con más cardio.','Movilidad de tobillo 1–2 min por lado + 2×10 elevaciones de gemelo suaves.','2×8 puente de glúteo y movilidad de cadera, sin buscar fatiga.','Si aparece dolor localizado o creciente, no conviertas la recuperación en otro entrenamiento.'],
   nutrition:[hard?'Haz una comida con carbohidratos abundantes y 25–35 g de proteína en las próximas horas.':'Comida normal completa: carbohidratos para reponer + 25–35 g de proteína.','Bebe según sed; si has sudado mucho, acompaña líquidos con comida/sodio en vez de beber agua a la fuerza.','No hace falta “premiar” la carrera con calorías vacías: usa la sesión para ajustar el total del día.']
 };
 if(a.type==='football')return {
   title:'Pachanga registrada · prioridad a piernas y combustible',text:'El fútbol ya es la sesión intensa del día y condiciona las próximas 24–36 h.',
   recovery:['5–10 min andando y movilidad muy suave al terminar.','Tobillo, gemelo, aductor y cadera: movilidad corta, sin estiramientos agresivos.','Nada de fuerza dura de piernas después del partido.','Mañana la carga se decidirá con sueño, dolor y recuperación real.'],
   nutrition:['Carbohidratos altos después del partido + 25–35 g de proteína.','Rehidrátate según sed; añade sal/comida si la sudoración fue alta.','Prioriza una cena fácil de digerir y suficiente energía total.']
 };
 if(a.type==='gym')return {title:'Fuerza registrada · no dupliques estímulo',text:'La sesión de fuerza ya modifica el reparto semanal.',recovery:['5–10 min de vuelta a la calma opcional.','Movilidad solo donde notes rigidez; no necesitas estirar por obligación.','Deja al grupo trabajado recuperar antes de repetir carga dura.'],nutrition:['25–35 g de proteína en una comida próxima.','Carbohidratos según el resto de actividad del día.','Hidratación normal según sed.']};
 return {title:'Actividad registrada · plan recalculado',text:'Training Lab usa lo que realmente haces por encima del plan teórico.',recovery:['Movimiento suave y cómodo.','No añadas intensidad solo para completar casillas.'],nutrition:['Comida completa con proteína y carbohidratos según el gasto del día.','Hidratación según sed.']};
}
function analysisForActivity(a){
 const out=[],ref=activityReference(a),last=ref.last,pace=activityPaceSec(a),load=sessionLoadEstimate(a);
 if(a.distance&&a.duration)out.push(`Hoy: ${Number(a.distance).toFixed(2)} km en ${formatActivityDuration(a.duration)}${pace?` · ${formatPaceSec(pace)}`:''}.`);
 else if(a.duration)out.push(`Duración registrada: ${formatActivityDuration(a.duration)}.`);
 if(a.hr)out.push(`FC media ${Math.round(a.hr)} ppm${a.hrmax?` · máxima ${Math.round(a.hrmax)} ppm`:''}.`);
 if(last){
   if(a.distance&&last.distance){const diff=Number(a.distance)-Number(last.distance);out.push(`Vs tu última ${activityLabel(a.type).toLowerCase()}: ${Math.abs(diff).toFixed(2)} km ${diff>=0?'más':'menos'} (${Number(last.distance).toFixed(2)} km la anterior).`);}
   const lp=activityPaceSec(last);if(a.type==='run'&&pace&&lp){const d=Math.round(pace-lp);out.push(`Ritmo vs la última: ${Math.abs(d)} s/km ${d<=0?'más rápido':'más lento'} (${formatPaceSec(lp)} antes).`);}
   if(a.hr&&last.hr){const d=Math.round(Number(a.hr)-Number(last.hr));out.push(`FC media vs la última: ${Math.abs(d)} ppm ${d>=0?'más':'menos'} (${Math.round(last.hr)} ppm antes).`);}
 }
 if(ref.peers.length>=3){
   if(ref.avgDistance&&a.distance){const d=(Number(a.distance)-ref.avgDistance)/ref.avgDistance*100;out.push(`Distancia vs media de tus ${ref.peers.length} sesiones previas: ${d>=0?'+':''}${d.toFixed(0)} %.`);}
   if(a.type==='run'&&ref.avgPace&&pace){const d=(ref.avgPace-pace)/ref.avgPace*100;out.push(`Ritmo vs referencia reciente: ${d>=0?'+':''}${d.toFixed(0)} % ${d>=0?'más rápido':'más lento'}.`);}
   if(ref.avgHr&&a.hr){const d=Math.round(Number(a.hr)-ref.avgHr);out.push(`FC media vs referencia reciente: ${d>=0?'+':''}${d} ppm.`);}
 }else out.push('Con 3 o más sesiones similares el informe ganará una referencia personal más sólida.');
 out.push(`Carga estimada: ${load.level}. ${load.reasons.length?'Se apoya en '+load.reasons.join(', ')+'.':'Aún hay pocos datos para afinarla.'}`);
 if(a.kcal)out.push(`${Math.round(a.kcal)} kcal registradas por el reloj/Health Connect: se muestran como estimación, no como gasto exacto que debas comer de vuelta.`);
 return out;
}
function recoveryTitleFor(a){return a.type==='run'?'Vuelta a la calma y movilidad post-carrera':a.type==='football'?'Descarga post-partido':a.type==='gym'?'Recuperación post-fuerza':'Recuperación post-actividad';}
function homeRecentActivityRows(limit=3){
 return [...S.activities]
  .filter(a=>['run','football','gym','walk'].includes(a.type))
  .sort((a,b)=>new Date(b.started_at||b.date+'T12:00:00')-new Date(a.started_at||a.date+'T12:00:00'))
  .slice(0,limit);
}
function sleepAdviceForActivity(a,load){
 const rows=uniqueNights(cloudSleep||[]),night=rows[0]||null,out=[];
 const mins=Number(night?.total_sleep_min||0);
 if(mins){
   const h=Math.floor(mins/60),m=Math.round(mins%60);
   out.push(`Último sueño registrado: ${h} h ${String(m).padStart(2,'0')} min.`);
   if(mins<360)out.push('La última noche fue corta. Hoy la prioridad es no añadir carga innecesaria y proteger una noche completa.');
   else if(mins<420)out.push('Vienes de una noche algo corta: intenta que la recuperación de esta sesión no se apoye en recortar más sueño.');
   else if(mins>=450)out.push('La duración de la última noche fue favorable. Mantén tu horario habitual y deja que el sueño haga parte del trabajo de recuperación.');
   else out.push('La duración de la última noche fue razonable. Mantén una ventana de sueño completa dentro de tu horario habitual.');
 }else out.push('Cuando Health Connect aporte el próximo sueño, Training Lab cruzará esta sesión con duración y fases para ajustar la lectura de recuperación.');
 if(load.level==='alta')out.push('Por la carga estimada alta de esta actividad, esta noche gana importancia: evita encadenar otra sesión dura antes de comprobar cómo recuperas.');
 else if(load.level==='moderada')out.push('Carga moderada: una noche completa y tu horario habitual deberían tener más prioridad que añadir entrenamiento extra.');
 else out.push('Carga estimada baja: no hace falta “compensar” con más ejercicio; deja que cuente como parte de la semana.');
 return out;
}
function renderAdaptiveActivityResponse(){
 const wrap=document.getElementById('homeActivityNow'),list=document.getElementById('homeRecentActivities');if(!wrap||!list)return;
 const recent=homeRecentActivityRows(3);
 if(!recent.length){wrap.hidden=true;list.innerHTML='';return;}
 const a=recent[0],isToday=a.date===iso();
 wrap.hidden=false;
 list.innerHTML=recent.map((row,i)=>`<div class="home-activity-item ${i===0?'is-latest':''}">${activityCard(row)}</div>`).join('');
 const report=activityReport(a),r=recoveryForActivity(a),plan=adaptivePlan(new Date()),c=counts(new Date()),runTarget=weekRunTarget(new Date());
 const heading=document.getElementById('homeActivityHeading');if(heading)heading.textContent=isToday?'Actividad de hoy y anteriores':'Tus últimas actividades';
 document.getElementById('adaptiveResponseTitle').textContent=report.title;
 document.getElementById('adaptiveResponseText').textContent=isToday?report.text:`Esta es tu actividad más reciente. ${report.text} El plan de hoy se calcula desde el historial real, no desde una agenda rígida.`;
 const chips=document.getElementById('adaptiveHeadlineChips');if(chips)chips.innerHTML=report.chips.map(x=>`<span>${escapeHtml(x)}</span>`).join('');
 const rt=document.getElementById('adaptiveRecoveryTitle');if(rt)rt.textContent=recoveryTitleFor(a);
 document.getElementById('adaptiveRecovery').innerHTML=r.recovery.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 document.getElementById('adaptiveNutrition').innerHTML=r.nutrition.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 const sleep=document.getElementById('adaptiveSleepAdvice');if(sleep)sleep.innerHTML=sleepAdviceForActivity(a,report.load).map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 const future=[];
 future.push(`<div class="notice"><b>Ahora:</b> ${escapeHtml(plan.title)}<br><span class="small">${escapeHtml(plan.reason)}</span></div>`);
 future.push(`<div class="adaptive-step"><b>Semana real:</b> ${c.run}/${runTarget} running · ${c.football} fútbol · ${c.gym} fuerza. Las actividades registradas ya cuentan.</div>`);
 for(let i=1;i<=2;i++){const d=addDays(new Date(),i),next=adaptivePlan(d);future.push(`<div class="adaptive-step"><b>${DAYS[d.getDay()]}:</b> ${escapeHtml(next.title)}</div>`);}
 document.getElementById('adaptivePlanChanges').innerHTML=future.join('');
 const analysis=analysisForActivity(a);
 document.getElementById('adaptiveAnalysisTitle').textContent=isToday?`Cómo ha ido esta ${activityLabel(a.type).toLowerCase()}`:`Cómo fue tu última ${activityLabel(a.type).toLowerCase()}`;
 document.getElementById('adaptiveAnalysis').innerHTML=analysis.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join('');
}
function renderHomeActivities(){renderAdaptiveActivityResponse();}


function homeLatestActivityAny(){
 const acts=[...S.activities].filter(a=>['run','football','gym','walk'].includes(a.type));
 return acts.sort((a,b)=>new Date(b.started_at||b.date+'T12:00:00')-new Date(a.started_at||a.date+'T12:00:00'))[0]||null;
}
function homeActivityEndMs(a){
 if(!a)return null;
 const start=new Date(a.started_at||a.date+'T12:00:00').getTime();
 if(!Number.isFinite(start))return null;
 return start+Number(a.duration||0)*60000;
}
function homeMatchDeltaMin(){
 if(!footballScheduled(new Date()))return null;
 const raw=S.matchTimes?.[iso()];
 if(!raw)return null;
 const m=String(raw).match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;
 const target=new Date();target.setHours(Number(m[1]),Number(m[2]),0,0);
 return (target-Date.now())/60000;
}
function latestSleepEndMs(){
 const rows=uniqueNights(cloudSleep||[]);if(!rows.length)return null;
 const x=rows[0]?.sleep_end?new Date(rows[0].sleep_end).getTime():null;
 return Number.isFinite(x)?x:null;
}
function homeContextMode(){
 const now=Date.now(),a=homeLatestActivityAny(),end=homeActivityEndMs(a),match=homeMatchDeltaMin();
 if(a&&a.date===iso()&&end!=null&&now-end>=-30*60000&&now-end<=6*3600000){
   return {key:'post',label:'POST-ACTIVIDAD',title:`Ahora toca absorber la ${activityLabel(a.type).toLowerCase()}`,text:'La actividad real manda sobre el plan. Recuperación, comida y la siguiente sesión se recalculan desde lo que acabas de hacer.'};
 }
 if(match!=null&&match<=360&&match>=-150){
   if(match>90)return {key:'prematch',label:'PARTIDO HOY',title:'El fútbol pasa a ser la prioridad',text:`Faltan ${Math.max(1,Math.round(match/60))} h aprox. para la pachanga. Combustible, hidratación y llegar con piernas frescas mandan ahora.`};
   if(match>20)return {key:'prematch',label:'PRE-PARTIDO',title:'Entra en modo partido',text:`Faltan ${Math.round(match)} min. Ahora importan calentamiento, calma y llegar con energía.`};
   return {key:'prematch',label:'PARTIDO / POST',title:match>=0?'Partido inminente':'Acabas de jugar',text:match>=0?'No añadas carga. Haz el calentamiento progresivo y juega.':'Training Lab cambiará a recuperación en cuanto llegue la actividad del reloj.'};
 }
 const sleepEnd=latestSleepEndMs();
 if(sleepEnd&&now-sleepEnd>=0&&now-sleepEnd<=3*3600000){
   return {key:'wake',label:'AL DESPERTAR',title:'Primero: cómo has recuperado',text:'Sueño, piernas y percepción de hoy tienen más peso que el plan que estaba escrito ayer.'};
 }
 const rec=calcRecovery(new Date());
 const legs=(Number(rec.cuadriceps||0)+Number(rec.isquios||0)+Number(rec.gemelos||0)+Number(rec.gluteo||0))/4;
 const ready=readiness().score;
 if(ready<50||legs<55||fatigueFor(new Date())>=4){
   return {key:'recovery',label:'RECUPERACIÓN',title:'Hoy manda recuperar',text:`Contexto actual: estado ${ready}/100 · piernas ${Math.round(legs)} %. La app reduce carga antes de obligarte a cumplir un calendario.`};
 }
 return {key:'normal',label:'HOY',title:'Plan adaptado al contexto actual',text:'Training Lab combina lo que has hecho, cómo has dormido, tu recuperación y lo que viene después.'};
}
function ensureHomeModeBanner(){
 const hoy=document.getElementById('hoy');if(!hoy)return null;
 let el=document.getElementById('homeModeBanner');
 if(!el){
   el=document.createElement('div');el.id='homeModeBanner';el.className='card home-mode-banner';
   el.innerHTML='<div class="eyebrow" id="homeModeLabel">HOY</div><div class="home-mode-title" id="homeModeTitle">Calculando contexto…</div><p class="muted" id="homeModeText"></p>';
   hoy.prepend(el);
 }
 return el;
}
function reorderHomeForContext(){
 const hoy=document.getElementById('hoy');if(!hoy)return;
 document.getElementById('homeModeBanner')?.remove();
 const activity=document.getElementById('homeActivityNow');
 if(activity)hoy.prepend(activity);
}

function renderV5(){reorderHomeForContext();renderAdaptiveActivityResponse();
 renderHomeActivities();renderQuestions();renderSleep();renderReadiness();renderRecovery();renderCompare();renderMealPlanner();renderMatchMode();renderFootballHub();renderMatchReport();renderFootballTrends();renderPostMatch();renderRpg();renderCoachTasks();renderSyncSources();renderWeeklyReportFromCloud();renderCorrelations();renderQuestList();
}

function renderAll(){renderToday();renderWeek();renderHistory();updateProgress();renderLatestAnalysis();renderV5()}
document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();
document.getElementById('injuryDate').value=iso();
document.getElementById('allRecipes').innerHTML=recipes.map(recipeCard).join('');
document.body.dataset.section=document.querySelector('.page.on')?.id||'hoy';renderAll();setInterval(()=>{renderToday();renderSmartHome();renderCoachTasks();},30000);

window.TrainingLab.update({appReady:true});
void initAuth();

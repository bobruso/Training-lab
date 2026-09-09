import {readinessModel,recoveryModel,runningTarget,uniqueNights} from './domain.js';
import { createClient } from "./vendor/supabase.js";

const SUPABASE_URL = "https://nnpvklaxhomarxszlclt.supabase.co";
const SUPABASE_KEY = "sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {global:{fetch:async(input,options)=>{
 const response=await window.TrainingLab.request(input,options);
 const path=new URL(typeof input==='string'?input:input.url).pathname;
 if(path.includes('/functions/v1/'))window.TrainingLab.update({lastFunction:path.split('/').at(-1)});
 if(!response.ok)window.TrainingLab.report('Supabase', 'La operación no se ha completado (HTTP '+response.status+'). Revisa la conexión y vuelve a intentarlo.');
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
function mealForHour(h){if(h>=13&&h<16)return'desayuno';if(h>=16&&h<19)return'comida';if(h>=19&&h<22)return'merienda';if(h>=22||h<2)return'cena';return'recena'}
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
 if(!currentUser){el.textContent='Para analizar y guardar el FIT, inicia sesión primero.';return}
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
window.navTo=function navTo(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===p));window.scrollTo({top:0,behavior:'smooth'})}
window.openRegister=function openRegister(){window.navTo('registro')}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>window.navTo(b.dataset.page)));

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
   S.activities=acts.data.map(a=>({id:a.id,date:a.activity_date,type:a.activity_type,source:a.source,started_at:a.started_at,duration:Number(a.duration_min)||0,moving:Number(a.moving_time_min)||0,rpe:Number(a.rpe)||0,distance:Number(a.distance_km)||0,hr:Number(a.avg_hr)||0,hrmax:Number(a.max_hr)||0,kcal:Number(a.calories)||0,topSpeed:Number(a.top_speed_kmh)||0,highIntensity:Number(a.high_intensity_m)||0,sprints:Number(a.sprint_count)||0,absSprints:Number(a.absolute_sprint_count)||0,pace:Number(a.avg_pace_sec_km)||0,metrics:a.metrics||{},fitName:a.source==='fit'?a.title:null}));
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
   actions.innerHTML='<button class="btn alt" id="logoutBtn">Cerrar sesión</button>';
   document.getElementById('logoutBtn').onclick=async()=>{const {error}=await supabase.auth.signOut();if(error){window.TrainingLab.report('Cerrar sesión',error);return;}location.reload();};
   document.getElementById('syncNotice').textContent='Datos sincronizados con Supabase. Puedes usar la misma cuenta desde móvil y PC.';
 }else{
   status.textContent='Modo local';
   detail.textContent='Tus datos se guardan en este navegador. Inicia sesión para sincronizar móvil y PC.';
   actions.innerHTML='<input id="authEmail" aria-label="Email de acceso" required type="email" placeholder="tu@email.com" style="min-width:220px;background:#0d1316;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px"><button class="btn" id="loginBtn">Enviar enlace</button>';
   
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
 if(currentUser){await ensureProfile();if(generation===authGeneration)await loadCloud();}
}
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
 const a=cloudSleep?.find(s=>(Date.now()-new Date(s.sleep_end||s.sleep_date+'T13:00:00'))/36e5<=36), ring=document.getElementById('sleepRing'); if(!ring)return;
 if(!a){document.getElementById('sleepScore').textContent='—';document.getElementById('todaySleep').textContent='—';document.getElementById('todaySleepWindow').textContent='Falta sueño reciente';document.getElementById('sleepSummary').textContent='Sin sueño reciente';document.getElementById('sleepConsistency').textContent='Referencia personal: 05:00–13:00 ±1 h';ring.style.setProperty('--pct','0%');return}
 const score=a.sleep_score??null;
 ring.style.setProperty('--pct',score+'%');document.getElementById('sleepScore').textContent=score??'—';
 const hrs=((a.total_sleep_min||0)/60).toFixed(1);
 document.getElementById('sleepSummary').textContent=`${hrs} h · profundo ${a.deep_sleep_min??'—'} min · REM ${a.rem_sleep_min??'—'} min · HRV ${a.avg_hrv??'—'}`;
 let start=a.sleep_start?new Date(a.sleep_start).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—';
 let end=a.sleep_end?new Date(a.sleep_end).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'—';
 const consistency=(start!=='—')?circDistMin(start,'05:00'):999;
 document.getElementById('sleepConsistency').textContent=`${start} → ${end}. Desviación de tu hora habitual: ${consistency<=60?consistency+' min · normal':Math.round(consistency/60*10)/10+' h · fuera de tu rango habitual'}.`;
 let insight='Con 7–14 noches empezaremos a comparar duración, regularidad, HRV y FC en reposo.';
 if(cloudSleep.length>=5){
  const mins=cloudSleep.slice(0,7).map(x=>x.total_sleep_min||0); insight=`Media reciente: ${(mins.reduce((a,b)=>a+b,0)/mins.length/60).toFixed(1)} h. Tu objetivo práctico está alrededor de 8 h, manteniendo consistencia dentro de ±1 h.`;
 }
 document.getElementById('sleepInsights').textContent=insight;
 document.getElementById('todaySleep').textContent=hrs+' h';document.getElementById('todaySleepWindow').textContent=`${start} → ${end}`;
}
function readiness(){return readinessModel({sleep:cloudSleep,checkins:cloudCheckins,activities:S.activities,injuries:cloudInjuries});}
function renderReadiness(){const r=readiness(),el=document.getElementById('readinessScore');if(!el)return;el.textContent=r.score+'/100';document.getElementById('readinessWhy').textContent=r.text}

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


function renderCoachTasks(){
 const el=document.getElementById('coachTasks');if(!el)return;
 const tasks=[],today=iso(),now=new Date(),meal=mealForHour(now.getHours());
 const checked=cloudCheckins.some(x=>x.checkin_date===today);
 if(!checked)tasks.push({icon:'🧭',title:'Haz el test diario',text:'30 segundos para que readiness y correlaciones tengan contexto.',action:`navTo('checkin')`,label:'Responder'});
 const sleepRecent=cloudSleep.some(x=>Math.abs((new Date(x.sleep_date+'T12:00:00')-new Date(today+'T12:00:00'))/86400000)<=1);
 if(!sleepRecent)tasks.push({icon:'🌙',title:'Falta el sueño reciente',text:'Sin sueño/HRV el readiness es menos fiable.',action:`navTo('sueno')`,label:'Añadir'});
 if(now.getDay()===0&&!S.weights.some(w=>w.date===today))tasks.push({icon:'⚖️',title:'Hoy toca pesarse',text:'En condiciones parecidas: al levantarte y antes de comer.',action:`navTo('registro');document.getElementById('weightKg').focus()`,label:'Registrar'});
 const pending=cloudGoals.filter(g=>g.status==='pending').slice(0,2);
 pending.forEach(g=>tasks.push({icon:'🎯',title:'Misión pendiente',text:g.prompt,goal:g}));
 if(footballScheduled(now)){
   const t=targetsForToday(),carbs=todayMeals().reduce((s,x)=>s+Number(x.carbs_g||0),0);
   const match=new Date();match.setHours(20,30,0,0);const hours=(match-now)/3600000;
   if(hours>0&&hours<6&&carbs<t.carbs*.55)tasks.push({icon:'⚽',title:'Gasolina de partido baja',text:`Llevas ~${Math.round(carbs)} g de HC de ${t.carbs} g objetivo.`,action:`navTo('comer')`,label:'Ver comida'});
 }
 if(!tasks.length)tasks.push({icon:'✓',title:'Todo al día',text:'No hay ninguna tarea prioritaria ahora mismo.'});
 el.innerHTML=tasks.map(t=>{
   if(t.goal)return `<div class="coach-task"><div class="task-main"><div class="task-icon">${t.icon}</div><div><b>${t.title}</b><div class="muted small">${t.text}</div></div></div><div class="actions"><button class="btn" onclick="answerGoal('${t.goal.id}','yes')">Sí</button><button class="btn alt" onclick="answerGoal('${t.goal.id}','no')">No</button></div></div>`;
   return `<div class="coach-task"><div class="task-main"><div class="task-icon">${t.icon}</div><div><b>${t.title}</b><div class="muted small">${t.text}</div></div></div>${t.action?`<button class="btn alt" onclick="${t.action}">${t.label}</button>`:''}</div>`;
 }).join('');
}
window.answerGoal=async function(id,status){
 if(!currentUser)return;
 const goal=cloudGoals.find(g=>g.id===id);if(!goal||goal.status!=='pending')return;
 const {error}=await supabase.from('goal_confirmations').update({status,answered_at:new Date().toISOString()}).eq('id',id);
 if(error)return alert(error.message);
 if(status==='yes')await awardXp(Number(goal.xp_reward||10),'goal_confirmation');
 await loadCloud();
}

window.syncHealthConnect=async function(){
 if(!currentUser)return alert('Inicia sesión primero: Health Connect necesita sincronizar los datos con tu usuario.');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return alert('La sesión ha caducado. Vuelve a iniciar sesión.');
 if(window.TrainingLabAndroid && typeof window.TrainingLabAndroid.syncHealthConnect==='function'){
   try{
     window.TrainingLabAndroid.syncHealthConnect(session.access_token,SUPABASE_URL);
     const el=document.getElementById('syncSources');if(el)el.insertAdjacentHTML('beforeend','<div class="notice" style="margin-top:8px">Solicitando permisos y leyendo Health Connect…</div>');
   }catch(e){alert('No pude iniciar Health Connect: '+e.message)}
 }else{
   alert('Health Connect solo puede leerse desde Android. La web está preparada, pero necesitas abrirla dentro del companion Training Lab Android. El proyecto Android viene incluido en el paquete GitHub.');
 }
}
window.healthConnectSyncFinished=async function(payload){
 let info={};try{info=typeof payload==='string'?JSON.parse(payload):payload||{}}catch{}
 await loadCloud();
 alert(`Health Connect sincronizado: ${info.sleep??0} sueños y ${info.activities??0} entrenamientos.`);
}
window.healthConnectSyncError=function(message){alert('Health Connect: '+message)}

function renderSyncSources(){
 const el=document.getElementById('syncSources');if(!el)return;
 const hc=cloudSync.find(x=>x.source==='health_connect'),coros=cloudSync.find(x=>x.source==='coros');
 const fmt=x=>x?.last_sync_at?new Date(x.last_sync_at).toLocaleString('es-ES'):'sin sincronizar';
 el.innerHTML=`<div class="source-row"><span><i class="status-dot ${hc?'ok':'wait'}"></i>Health Connect</span><span class="muted small">${hc?'última '+fmt(hc):'bridge Android pendiente'}</span></div><div class="source-row"><span><i class="status-dot ${coros?'ok':'wait'}"></i>COROS</span><span class="muted small">${coros?'última '+fmt(coros):'autorización pendiente'}</span></div>`;
 const sleepStatus=document.getElementById('sleepSyncStatus');if(sleepStatus)sleepStatus.textContent=hc?`Health Connect: sincronizado ${fmt(hc)}`:'Health Connect: endpoint listo; falta instalar/construir el bridge Android.';
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
function renderV5(){
 renderQuestions();renderSleep();renderReadiness();renderRecovery();renderCompare();renderMealPlanner();renderMatchMode();renderPostMatch();renderRpg();renderCoachTasks();renderSyncSources();renderWeeklyReportFromCloud();renderCorrelations();renderQuestList();
}

function renderAll(){renderToday();renderWeek();renderHistory();updateProgress();renderLatestAnalysis();renderV5()}
document.getElementById('actDate').value=iso();document.getElementById('weightDate').value=iso();
document.getElementById('sleepDate').value=iso();document.getElementById('injuryDate').value=iso();
document.getElementById('allRecipes').innerHTML=recipes.map(recipeCard).join('');
renderAll();setInterval(renderToday,30000);

window.TrainingLab.update({appReady:true});
void initAuth();

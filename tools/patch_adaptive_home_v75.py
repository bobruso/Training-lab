from pathlib import Path

OLD='20260909activity74'
NEW='20260909adaptive75'

# ---- index ----
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v7.4 · build activity74','v7.5 · build adaptive75').replace(OLD,NEW)

old_block='''  <div class="section home-activity-section">\n   <div class="sectionhead"><div><div class="eyebrow">Actividad reciente</div><h2>Últimos entrenamientos</h2></div><button class="btn alt" onclick="navTo('entrenos')">Ver todas</button></div>\n   <div id="homeRecentActivities" class="home-activity-list"></div>\n  </div>\n\n'''
s=s.replace(old_block,'',1)
anchor=''' <section class="page on" id="hoy">\n'''
new_top=''' <section class="page on" id="hoy">\n  <div id="homeActivityNow" class="home-activity-now" hidden>\n   <div class="sectionhead"><div><div class="eyebrow">Lo último que has hecho</div><h2>Actividad detectada</h2></div><button class="btn alt" onclick="navTo('entrenos')">Ver actividad</button></div>\n   <div id="homeRecentActivities" class="home-activity-list"></div>\n   <div id="homeAdaptiveResponse" class="adaptive-response">\n    <div class="card adaptive-summary-card">\n      <div class="eyebrow">Training Lab se ha adaptado</div>\n      <h2 id="adaptiveResponseTitle">Recalculando tu día…</h2>\n      <p class="muted" id="adaptiveResponseText"></p>\n      <div id="adaptiveWatchMetrics" class="home-decision-context"></div>\n    </div>\n    <div class="grid g3 adaptive-action-grid">\n      <div class="card"><div class="eyebrow">Ahora</div><h3>Recuperación</h3><div id="adaptiveRecovery"></div></div>\n      <div class="card"><div class="eyebrow">Después</div><h3>Comida e hidratación</h3><div id="adaptiveNutrition"></div></div>\n      <div class="card"><div class="eyebrow">Plan mutado</div><h3>Qué cambia</h3><div id="adaptivePlanChanges"></div></div>\n    </div>\n    <div class="card adaptive-analysis-card">\n      <div class="eyebrow">Lectura de tus datos</div><h3 id="adaptiveAnalysisTitle">Análisis de la sesión</h3><div id="adaptiveAnalysis"></div>\n    </div>\n   </div>\n  </div>\n'''
if anchor not in s: raise SystemExit('home section anchor missing')
s=s.replace(anchor,new_top,1)
p.write_text(s,encoding='utf-8')

# ---- app ----
p=Path('app.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)

# Replace current home activity renderer with adaptive one.
start=s.find('function formatActivityDuration(')
end=s.find('function renderV5(){',start)
if start<0 or end<0: raise SystemExit('activity renderer bounds missing')

adaptive=r'''function formatActivityDuration(mins){
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
function activityCard(a){
 const primary=a.distance>0?`${Number(a.distance).toFixed(2)} km`:formatActivityDuration(a.duration);
 const pace=a.type==='run'?activityPace(a):null;
 const meta=[a.duration?formatActivityDuration(a.duration):null,pace,a.hr?`${Math.round(a.hr)} ppm`:null,a.kcal?`${Math.round(a.kcal)} kcal`:null].filter(Boolean).join(' · ');
 const when=a.started_at?new Date(a.started_at).toLocaleString('es-ES',{weekday:'long',hour:'2-digit',minute:'2-digit'}):'hoy';
 const source=a.source==='health_connect'?'Health Connect':a.source==='fit'?'FIT':'Training Lab';
 return `<button class="activity-card activity-${escapeHtml(a.type||'other')} activity-card-primary" onclick="navTo('entrenos')"><div class="activity-copy"><div class="activity-kicker">${activityIcon(a.type)} ${escapeHtml(activityLabel(a.type))}</div><div class="activity-primary">${primary}</div><div class="activity-meta">${escapeHtml(meta||'Métricas pendientes')}</div><div class="activity-title">${escapeHtml(a.title||activityLabel(a.type))}</div><div class="activity-source">${escapeHtml(when)} · ${source}</div></div><div class="activity-visual" aria-hidden="true"><span>${activityIcon(a.type)}</span><svg viewBox="0 0 120 80"><path d="M7 62 C24 52 28 19 45 25 S59 67 74 47 S91 20 113 13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="7" cy="62" r="4"/><circle cx="113" cy="13" r="4"/></svg></div></button>`;
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
 const out=[];const peers=recentSameType(a,5);
 if(a.type==='run'){
   if(a.distance&&a.duration)out.push(`Has hecho ${Number(a.distance).toFixed(2)} km en ${formatActivityDuration(a.duration)} (${activityPace(a)}).`);
   if(a.hr)out.push(`FC media registrada: ${Math.round(a.hr)} ppm${a.hrmax?` · máxima ${Math.round(a.hrmax)} ppm`:''}.`);
 } else {
   if(a.distance)out.push(`Distancia registrada: ${Number(a.distance).toFixed(2)} km.`);
   if(a.duration)out.push(`Duración: ${formatActivityDuration(a.duration)}.`);
   if(a.hr)out.push(`FC media: ${Math.round(a.hr)} ppm.`);
 }
 if(a.kcal)out.push(`El reloj/Health Connect ha registrado ${Math.round(a.kcal)} kcal; lo tratamos como una estimación, no como calorías exactas para “comer de vuelta”.`);
 if(peers.length>=3){
   const d=avg(peers.map(x=>Number(x.distance)).filter(x=>x>0)),dur=avg(peers.map(x=>Number(x.duration)).filter(x=>x>0)),hr=avg(peers.map(x=>Number(x.hr)).filter(x=>x>0));
   const dd=pctDelta(Number(a.distance),d),td=pctDelta(Number(a.duration),dur);
   if(dd!=null)out.push(`Distancia: ${signedPct(dd)} frente a la media de tus ${peers.length} ${activityLabel(a.type).toLowerCase()}s anteriores.`);
   if(td!=null)out.push(`Duración: ${signedPct(td)} frente a tu referencia reciente.`);
   if(a.hr&&hr)out.push(`FC media: ${Math.round(a.hr)} ppm vs ${Math.round(hr)} ppm de media reciente. Lo interpretaremos junto con ritmo, duración y sensaciones, no de forma aislada.`);
 }else out.push(`Cuando acumules al menos 3 sesiones similares, empezaremos a compararla automáticamente contigo mismo.`);
 return out;
}
function renderAdaptiveActivityResponse(){
 const wrap=document.getElementById('homeActivityNow'),list=document.getElementById('homeRecentActivities');if(!wrap||!list)return;
 const a=latestTodayActivity();
 if(!a){wrap.hidden=true;list.innerHTML='';return;}
 wrap.hidden=false;list.innerHTML=activityCard(a);
 const r=recoveryForActivity(a),plan=adaptivePlan(new Date()),c=counts(new Date()),runTarget=weekRunTarget(new Date());
 document.getElementById('adaptiveResponseTitle').textContent=r.title;
 document.getElementById('adaptiveResponseText').textContent=r.text;
 const metrics=[];
 if(a.distance)metrics.push(`<span>${Number(a.distance).toFixed(2)} km</span>`);
 if(a.duration)metrics.push(`<span>${formatActivityDuration(a.duration)}</span>`);
 if(a.type==='run'&&activityPace(a))metrics.push(`<span>${activityPace(a)}</span>`);
 if(a.hr)metrics.push(`<span>FC ${Math.round(a.hr)} ppm</span>`);
 if(a.kcal)metrics.push(`<span>${Math.round(a.kcal)} kcal</span>`);
 document.getElementById('adaptiveWatchMetrics').innerHTML=metrics.join('');
 document.getElementById('adaptiveRecovery').innerHTML=r.recovery.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 document.getElementById('adaptiveNutrition').innerHTML=r.nutrition.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 const future=[];
 future.push(`<div class="notice"><b>Hoy:</b> ${escapeHtml(plan.title)}<br><span class="small">${escapeHtml(plan.reason)}</span></div>`);
 future.push(`<div class="adaptive-step">Semana real: ${c.run}/${runTarget} running · ${c.football} fútbol · ${c.gym} fuerza.</div>`);
 for(let i=1;i<=2;i++){const d=addDays(new Date(),i),p=adaptivePlan(d);future.push(`<div class="adaptive-step"><b>${DAYS[d.getDay()]}:</b> ${escapeHtml(p.title)}</div>`);}
 document.getElementById('adaptivePlanChanges').innerHTML=future.join('');
 const analysis=analysisForActivity(a);
 document.getElementById('adaptiveAnalysisTitle').textContent=`Qué dice esta ${activityLabel(a.type).toLowerCase()}`;
 document.getElementById('adaptiveAnalysis').innerHTML=analysis.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join('');
}
function renderHomeActivities(){renderAdaptiveActivityResponse();}

'''
s=s[:start]+adaptive+s[end:]

# Ensure adaptive response is always re-rendered with all cloud/activity updates.
old='function renderV5(){\n renderQuestions();'
new='function renderV5(){\n renderAdaptiveActivityResponse();renderQuestions();'
if old not in s: raise SystemExit('renderV5 anchor missing')
s=s.replace(old,new,1)

# After Health Connect sync, make adaptation explicit and rerender before any manual alert.
old_finish='''window.healthConnectSyncFinished=async function(payload){\n let info={};try{info=typeof payload==='string'?JSON.parse(payload):payload||{}}catch{}\n const silent=healthConnectSilent;healthConnectSilent=false;\n await loadCloud();'''
new_finish='''window.healthConnectSyncFinished=async function(payload){\n let info={};try{info=typeof payload==='string'?JSON.parse(payload):payload||{}}catch{}\n const silent=healthConnectSilent;healthConnectSilent=false;\n await loadCloud();\n renderAdaptiveActivityResponse();renderWeek();renderToday();'''
if old_finish not in s: raise SystemExit('HC finish anchor missing')
s=s.replace(old_finish,new_finish,1)

p.write_text(s,encoding='utf-8')

# ---- styles ----
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
css=r'''

/* adaptive-home-v75 */
.home-activity-now{margin:4px 0 22px;padding:14px;border-radius:24px;background:radial-gradient(circle at 92% 5%,color-mix(in srgb,var(--section-accent,var(--lime)) 22%,transparent),transparent 28%),linear-gradient(180deg,#151e23,#0f161a);border:1px solid color-mix(in srgb,var(--section-accent,var(--lime)) 42%,var(--line));box-shadow:0 20px 60px rgba(0,0,0,.28)}
.home-activity-now .sectionhead{margin-bottom:10px}.home-activity-now .sectionhead h2{font-size:clamp(25px,6vw,38px)}
.activity-card-primary{min-height:190px;border-color:color-mix(in srgb,var(--section-accent,var(--lime)) 45%,var(--line));background:linear-gradient(145deg,#19252a,#10171b)}
.activity-card-primary .activity-primary{font-size:clamp(42px,11vw,70px)}
.adaptive-response{display:grid;gap:12px;margin-top:12px}.adaptive-summary-card{border-left:4px solid var(--section-accent,var(--lime))}
.adaptive-summary-card h2{font-size:clamp(26px,5vw,38px);margin:4px 0 8px}.adaptive-action-grid{align-items:stretch}
.adaptive-step{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}.adaptive-step:last-child{border-bottom:0}
.adaptive-analysis-card{background:linear-gradient(180deg,#131c20,#0f1518)}
@media(max-width:700px){.home-activity-now{margin-left:-4px;margin-right:-4px;padding:12px;border-radius:20px}.adaptive-action-grid{grid-template-columns:1fr!important}.home-activity-now+.hero{margin-top:4px}}
'''
if '/* adaptive-home-v75 */' not in s:s+=css
p.write_text(s,encoding='utf-8')

# ---- service worker ----
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW).replace('training-lab-20260909activity74','training-lab-20260909adaptive75')
p.write_text(s,encoding='utf-8')

# ---- runtime query bust ----
p=Path('runtime.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

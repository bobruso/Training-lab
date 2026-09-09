from pathlib import Path
import re

BUILD='20260909sleep63'

# index.html
p=Path('index.html')
html=p.read_text(encoding='utf-8')
new_sleep=r''' <section class="page" id="sueno">
  <div class="sectionhead">
   <div><h2>Sueño</h2><span class="muted">última noche, fases, tendencias y análisis personal</span></div>
   <button class="btn alt" onclick="syncHealthConnect()">Sincronizar Health Connect</button>
  </div>

  <div class="card module-hero sleep-overview">
   <div class="eyebrow">Última noche</div>
   <h1 id="sleepHeadline" class="sleep-headline">Esperando datos de sueño</h1>
   <p id="sleepVerdict" class="muted">Training Lab sincroniza Health Connect automáticamente al abrir la APK.</p>
   <div class="grid g4" id="sleepKeyMetrics" style="margin-top:16px"></div>
   <div class="sleep-stagebar" id="sleepStageBar" aria-label="Distribución de fases del sueño"></div>
   <div class="sleep-stage-legend" id="sleepStageLegend"></div>
   <div class="sleep-window" id="sleepWindow"></div>
   <div id="sleepSyncStatus" class="small muted" style="margin-top:10px"></div>
  </div>

  <div class="section grid g2">
   <div class="card">
    <div class="eyebrow">Análisis de la noche</div>
    <h2>Qué dicen tus datos</h2>
    <div id="sleepAnalysisList" class="sleep-analysis-list"><p class="muted">Sin datos recientes.</p></div>
   </div>
   <div class="card">
    <div class="eyebrow">Historial reciente</div>
    <h2>Últimas noches</h2>
    <div id="sleepHistory"><p class="muted">Necesitamos más noches sincronizadas.</p></div>
   </div>
  </div>

  <div class="card section" id="sleepDeepStudy" style="display:none">
   <div class="eyebrow">Estudio profundo</div>
   <h2 id="sleepDeepTitle">Tu patrón de sueño</h2>
   <div id="sleepInsights" class="sleep-analysis-list"></div>
  </div>
 </section>'''
html,n=re.subn(r' <section class="page" id="sueno">.*?\n </section>',new_sleep,html,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'No se pudo sustituir la sección Sueño: {n}')
html=re.sub(r'<meta name="build" content="[^"]+">','<meta name="build" content="v6.3 · build sleep63">',html)
html=html.replace('803b7fff04',BUILD)
p.write_text(html,encoding='utf-8')

# styles.css
p=Path('styles.css')
css=p.read_text(encoding='utf-8')
if '/* sleep-v63 */' not in css:
    css += r'''

/* sleep-v63 */
.sleep-overview{overflow:hidden}
.sleep-headline{font-size:clamp(34px,6vw,62px);line-height:.98;letter-spacing:-.05em;margin:6px 0 8px;max-width:900px}
.sleep-stagebar{display:flex;width:100%;height:18px;overflow:hidden;border-radius:999px;background:#0a0f12;margin-top:18px;border:1px solid var(--line)}
.sleep-stagebar span{display:block;height:100%;min-width:0;transition:width .35s ease}
.sleep-stagebar .deep{background:#7767d8}.sleep-stagebar .light{background:#4d92c7}.sleep-stagebar .rem{background:#b46dd1}.sleep-stagebar .awake{background:#58646c}
.sleep-stage-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--muted)}
.sleep-stage-legend b{color:var(--text)}
.sleep-stage-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
.sleep-stage-legend .deep{background:#7767d8}.sleep-stage-legend .light{background:#4d92c7}.sleep-stage-legend .rem{background:#b46dd1}.sleep-stage-legend .awake{background:#58646c}
.sleep-window{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#101619;font-weight:800}
.sleep-analysis-list{display:grid;gap:9px;margin-top:10px}.sleep-analysis-list .insight{padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:#101619}
.sleep-history-row{display:grid;grid-template-columns:76px 1fr 64px;gap:9px;align-items:center;margin:10px 0}.sleep-history-row>span:last-child{text-align:right;font-weight:900}
.sleep-history-bar{height:12px;display:flex;overflow:hidden;border-radius:999px;background:#0a0f12}.sleep-history-bar i{display:block;height:100%}.sleep-history-bar .deep{background:#7767d8}.sleep-history-bar .light{background:#4d92c7}.sleep-history-bar .rem{background:#b46dd1}.sleep-history-bar .other{background:#344047}
@media(max-width:700px){.sleep-history-row{grid-template-columns:62px 1fr 52px}.sleep-stage-legend{gap:8px}.sleep-headline{font-size:36px}}
'''
p.write_text(css,encoding='utf-8')

# app.js
p=Path('app.js')
js=p.read_text(encoding='utf-8').replace('803b7fff04',BUILD)
old_session="if(currentUser){await ensureProfile();if(generation===authGeneration)await loadCloud();}"
new_session="""if(currentUser){
   await ensureProfile();
   if(generation===authGeneration){
     await loadCloud();
     queueAutoHealthConnectSync();
   }
 }"""
if old_session not in js:
    raise SystemExit('No se encontró applySession')
js=js.replace(old_session,new_session,1)

new_render=r'''function renderSleep(){
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
}'''
js,n=re.subn(r'function renderSleep\(\)\{.*?\n\}\nfunction readiness\(\)',new_render+'\nfunction readiness()',js,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'No se pudo sustituir renderSleep: {n}')

new_sync=r'''let healthConnectSilent=false;
let autoHealthConnectQueued=false;
function queueAutoHealthConnectSync(){
 if(!currentUser||autoHealthConnectQueued)return;
 if(!(window.TrainingLabAndroid&&typeof window.TrainingLabAndroid.syncHealthConnect==='function'))return;
 const key='traininglab-hc-auto:'+currentUser.id;
 if(sessionStorage.getItem(key))return;
 sessionStorage.setItem(key,String(Date.now()));
 autoHealthConnectQueued=true;
 setTimeout(()=>{autoHealthConnectQueued=false;window.syncHealthConnect({silent:true,auto:true}).catch(e=>window.TrainingLab.report('Health Connect automático',e));},500);
}
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
 const el=document.getElementById('sleepSyncStatus');if(el)el.textContent=`Health Connect sincronizado · ${info.sleep??0} sueño(s) · ${info.activities??0} entrenamiento(s)`;
 if(!silent)alert(`Health Connect sincronizado: ${info.sleep??0} sueños y ${info.activities??0} entrenamientos.`);
}
window.healthConnectSyncError=function(message){
 const silent=healthConnectSilent;healthConnectSilent=false;
 const el=document.getElementById('sleepSyncStatus');if(el)el.textContent='Health Connect: '+message;
 if(!silent)alert('Health Connect: '+message);else window.TrainingLab.report('Health Connect automático',message);
}'''
js,n=re.subn(r"window\.syncHealthConnect=async function\(\)\{.*?window\.healthConnectSyncError=function\(message\)\{alert\('Health Connect: '\+message\)\}",new_sync,js,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'No se pudo sustituir syncHealthConnect: {n}')

js=js.replace("document.getElementById('sleepDate').value=iso();document.getElementById('injuryDate').value=iso();","document.getElementById('injuryDate').value=iso();")
js=js.replace("if(!sleepRecent)tasks.push({icon:'🌙',title:'Falta el sueño reciente',text:'Sin sueño/HRV el readiness es menos fiable.',action:`navTo('sueno')`,label:'Añadir'});","if(!sleepRecent)tasks.push({icon:'🌙',title:'Falta el sueño reciente',text:'Sin sueño/HRV el readiness es menos fiable. Abre Sueño y sincroniza Health Connect si la sincronización automática no lo recupera.',action:`navTo('sueno')`,label:'Ver sueño'});")
js=js.replace("if(sleepStatus)sleepStatus.textContent=hc?`Health Connect: sincronizado ${fmt(hc)}`:'Health Connect: endpoint listo; falta instalar/construir el bridge Android.';","if(sleepStatus){const d=hc?.details||{};sleepStatus.textContent=hc?`Health Connect · última ${fmt(hc)} · ${d.sleep??0} sueño(s) · ${d.activities??0} entrenamiento(s)`:'Health Connect sin sincronizar todavía.';}")
p.write_text(js,encoding='utf-8')

# service-worker.js
p=Path('service-worker.js')
sw=p.read_text(encoding='utf-8')
sw=sw.replace("const CACHE='training-lab-803b7fff04';",f"const CACHE='training-lab-{BUILD}';")
sw=sw.replace('803b7fff04',BUILD)
p.write_text(sw,encoding='utf-8')

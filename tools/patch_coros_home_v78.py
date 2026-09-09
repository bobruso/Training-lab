from pathlib import Path

OLD='20260910context77'
NEW='20260910coros78'

# ----- version/cache bump -----
for name in ['index.html','runtime.js','app.js','styles.css','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace(OLD,NEW)
    if name=='index.html':
        s=s.replace('v7.7 · build context77','v7.8 · build coros78')
    p.write_text(s,encoding='utf-8')

# ----- home structure -----
p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.index('  <div id="homeActivityNow"')
end=s.index('  <div class="card hero">',start)
block='''  <div id="homeActivityNow" class="home-activity-now coros-home" hidden>
   <div class="coros-home-head"><div><div class="eyebrow">HOY · ACTIVIDAD DETECTADA</div><h2 id="homeActivityHeading">Tu actividad de hoy</h2></div><button class="btn alt" onclick="navTo('entrenos')">Ver detalles</button></div>
   <div id="homeRecentActivities" class="home-activity-list"></div>
   <div id="homeAdaptiveResponse" class="adaptive-response coros-response">
    <div class="card activity-headline-card">
      <div class="eyebrow">INFORME TRAINING LAB</div>
      <h2 id="adaptiveResponseTitle">Analizando la sesión…</h2>
      <p class="muted" id="adaptiveResponseText"></p>
      <div id="adaptiveHeadlineChips" class="activity-headline-chips"></div>
    </div>
    <div class="grid g2 postwork-grid">
      <div class="card postwork-card"><div class="eyebrow">AHORA</div><h3 id="adaptiveRecoveryTitle">Recuperación y movilidad</h3><div id="adaptiveRecovery"></div></div>
      <div class="card postwork-card"><div class="eyebrow">DESPUÉS</div><h3>Comida e hidratación</h3><div id="adaptiveNutrition"></div></div>
    </div>
    <div class="card plan-mutated-card"><div class="eyebrow">PLAN RECALCULADO</div><h3>Qué cambia después de esta actividad</h3><div id="adaptivePlanChanges"></div></div>
    <div class="card adaptive-analysis-card">
      <div class="eyebrow">COMPARADO CONTIGO</div><h3 id="adaptiveAnalysisTitle">Informe de la sesión</h3><div id="adaptiveAnalysis"></div>
    </div>
   </div>
  </div>
'''
s=s[:start]+block+s[end:]
p.write_text(s,encoding='utf-8')

# ----- app logic -----
p=Path('app.js')
s=p.read_text(encoding='utf-8')

# Replace activity card and add report helpers.
start=s.index('function activityCard(a){')
end=s.index('function recoveryForActivity(a){',start)
card=r'''function activityPaceSec(a){return Number(a.pace)||(a.distance>0&&a.duration>0?(a.duration*60/a.distance):0);}
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
'''
s=s[:start]+card+s[end:]

# Replace analysis and renderer.
start=s.index('function analysisForActivity(a){')
end=s.index('function renderHomeActivities(){',start)
renderer=r'''function analysisForActivity(a){
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
function renderAdaptiveActivityResponse(){
 const wrap=document.getElementById('homeActivityNow'),list=document.getElementById('homeRecentActivities');if(!wrap||!list)return;
 const a=latestTodayActivity();
 if(!a){wrap.hidden=true;list.innerHTML='';return;}
 wrap.hidden=false;list.innerHTML=activityCard(a);
 const report=activityReport(a),r=recoveryForActivity(a),plan=adaptivePlan(new Date()),c=counts(new Date()),runTarget=weekRunTarget(new Date());
 const heading=document.getElementById('homeActivityHeading');if(heading)heading.textContent=`Tu ${activityLabel(a.type).toLowerCase()} de hoy`;
 document.getElementById('adaptiveResponseTitle').textContent=report.title;
 document.getElementById('adaptiveResponseText').textContent=report.text;
 const chips=document.getElementById('adaptiveHeadlineChips');if(chips)chips.innerHTML=report.chips.map(x=>`<span>${escapeHtml(x)}</span>`).join('');
 const rt=document.getElementById('adaptiveRecoveryTitle');if(rt)rt.textContent=recoveryTitleFor(a);
 document.getElementById('adaptiveRecovery').innerHTML=r.recovery.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 document.getElementById('adaptiveNutrition').innerHTML=r.nutrition.map(x=>`<div class="adaptive-step">${escapeHtml(x)}</div>`).join('');
 const future=[];
 future.push(`<div class="notice"><b>Hoy:</b> ${escapeHtml(plan.title)}<br><span class="small">${escapeHtml(plan.reason)}</span></div>`);
 future.push(`<div class="adaptive-step"><b>Semana real:</b> ${c.run}/${runTarget} running · ${c.football} fútbol · ${c.gym} fuerza. La sesión detectada ya cuenta.</div>`);
 for(let i=1;i<=2;i++){const d=addDays(new Date(),i),p=adaptivePlan(d);future.push(`<div class="adaptive-step"><b>${DAYS[d.getDay()]}:</b> ${escapeHtml(p.title)}</div>`);}
 document.getElementById('adaptivePlanChanges').innerHTML=future.join('');
 const analysis=analysisForActivity(a);
 document.getElementById('adaptiveAnalysisTitle').textContent=`Cómo ha ido esta ${activityLabel(a.type).toLowerCase()}`;
 document.getElementById('adaptiveAnalysis').innerHTML=analysis.map(x=>`<div class="insight">${escapeHtml(x)}</div>`).join('');
}
'''
s=s[:start]+renderer+s[end:]

# Guarantee today's activity is physically the first Home block, before the context banner.
rstart=s.index('function reorderHomeForContext(){')
rend=s.index('function renderV5(){',rstart)
segment=s[rstart:rend]
pos=segment.rfind('\n}')
if pos<0: raise SystemExit('reorderHomeForContext end not found')
force="""
 const todayActivity=latestTodayActivity(),activityFirst=document.getElementById('homeActivityNow');
 if(todayActivity&&activityFirst&&!activityFirst.hidden){hoy.prepend(activityFirst);activityFirst.after(banner);}
"""
segment=segment[:pos]+force+segment[pos:]
s=s[:rstart]+segment+s[rend:]
p.write_text(s,encoding='utf-8')

# ----- visual layer -----
p=Path('styles.css')
s=p.read_text(encoding='utf-8')
s += r'''

/* coros78: activity-first Home inspired by the information hierarchy of sports-watch apps */
.coros-home{margin:0 0 18px}
.coros-home-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}
.coros-home-head h2{margin:3px 0 0;font-size:clamp(24px,4vw,34px)}
.coros-activity-card{--activity-accent:var(--lime);width:100%;border:1px solid #2a353a;background:linear-gradient(160deg,#202526,#171b1d);color:var(--text);border-radius:22px;padding:18px;text-align:left;cursor:pointer;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.coros-activity-card.activity-run{--activity-accent:#d9ff63}.coros-activity-card.activity-football{--activity-accent:#ff68d4}.coros-activity-card.activity-gym{--activity-accent:#b978ff}.coros-activity-card.activity-walk{--activity-accent:#6ee7b7}
.coros-card-top{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px}.coros-card-top>div{display:flex;align-items:center;gap:8px}.coros-sport-icon{font-size:22px}.coros-source{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);border:1px solid #344047;border-radius:99px;padding:5px 8px}
.coros-card-main{display:grid;grid-template-columns:1fr 116px;gap:14px;align-items:center;margin:14px 0}.coros-primary{font-size:clamp(38px,7vw,62px);font-weight:950;letter-spacing:-.055em;line-height:.95}.coros-subline{margin-top:8px;font-size:14px;color:#d5dcdf}.coros-activity-title{font-weight:850;margin-top:9px}.coros-date{font-size:11px;color:var(--muted);margin-top:2px;text-transform:capitalize}
.coros-load-ring{width:102px;height:102px;border-radius:50%;background:conic-gradient(var(--activity-accent) var(--load),#30383b 0);padding:8px;display:grid;place-items:center;justify-self:end}.coros-load-ring>div{width:100%;height:100%;border-radius:50%;background:#171b1d;display:flex;flex-direction:column;align-items:center;justify-content:center}.coros-load-ring span{font-size:23px}.coros-load-ring b{text-transform:uppercase;font-size:10px;margin-top:2px}.coros-load-ring small{font-size:8px;color:var(--muted);text-transform:uppercase}
.coros-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;border-top:1px solid #30383b;padding-top:12px}.coros-stat-grid div{min-width:0}.coros-stat-grid small{display:block;color:var(--muted);font-size:8px;letter-spacing:.08em}.coros-stat-grid b{display:block;font-size:13px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coros-response{display:grid;gap:12px;margin-top:12px}.activity-headline-card{background:radial-gradient(circle at 92% 10%,rgba(217,255,99,.12),transparent 34%),linear-gradient(180deg,#192226,#12181b)}.activity-headline-card h2{font-size:clamp(27px,5vw,43px);line-height:1.02;margin:5px 0 8px;max-width:850px}.activity-headline-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.activity-headline-chips span{font-size:10px;font-weight:850;border:1px solid var(--line);background:#111719;border-radius:999px;padding:7px 9px}.postwork-grid{margin:0}.postwork-card h3,.plan-mutated-card h3,.adaptive-analysis-card h3{margin:4px 0 10px}.adaptive-step{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}.adaptive-step:last-child{border-bottom:0}
#hoy>.home-activity-now:first-child{margin-top:0}
@media(max-width:700px){.coros-home-head{align-items:center}.coros-home-head .btn{font-size:10px;padding:8px 9px}.coros-activity-card{padding:15px;border-radius:18px}.coros-card-main{grid-template-columns:1fr 84px}.coros-load-ring{width:78px;height:78px;padding:6px}.coros-load-ring span{font-size:18px}.coros-primary{font-size:44px}.coros-stat-grid{grid-template-columns:repeat(2,1fr);gap:10px 8px}.activity-headline-card h2{font-size:29px}}
'''
p.write_text(s,encoding='utf-8')

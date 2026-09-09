from pathlib import Path

OLD='20260910coros78'
NEW='20260910home79'

# Version/cache bump.
for name in ['index.html','runtime.js','app.js','styles.css','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace(OLD,NEW)
    if name=='index.html':
        s=s.replace('v7.8 · build coros78','v7.9 · build home79')
    p.write_text(s,encoding='utf-8')

# Home: activities are the first visible content. Remove the date/clock hero.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.index('  <div id="homeActivityNow"')
hero=s.index('  <div class="card hero">',start)
metrics=s.index('  <div class="section grid g3">',hero)
block='''  <div id="homeActivityNow" class="home-activity-now coros-home" hidden>
   <div class="coros-home-head"><div><div class="eyebrow">ÚLTIMAS ACTIVIDADES</div><h2 id="homeActivityHeading">Tu actividad reciente</h2></div><button class="btn alt" onclick="navTo('entrenos')">Ver todas</button></div>
   <div id="homeRecentActivities" class="home-activity-list"></div>
   <div id="homeAdaptiveResponse" class="adaptive-response coros-response">
    <div class="card activity-headline-card">
      <div class="eyebrow">INFORME TRAINING LAB</div>
      <h2 id="adaptiveResponseTitle">Analizando la última sesión…</h2>
      <p class="muted" id="adaptiveResponseText"></p>
      <div id="adaptiveHeadlineChips" class="activity-headline-chips"></div>
    </div>
    <div class="grid g3 postwork-grid">
      <div class="card postwork-card"><div class="eyebrow">RECUPERACIÓN</div><h3 id="adaptiveRecoveryTitle">Movilidad y vuelta a la calma</h3><div id="adaptiveRecovery"></div></div>
      <div class="card postwork-card"><div class="eyebrow">ALIMENTACIÓN</div><h3>Comida e hidratación</h3><div id="adaptiveNutrition"></div></div>
      <div class="card postwork-card"><div class="eyebrow">SUEÑO</div><h3>Cómo favorecer la recuperación</h3><div id="adaptiveSleepAdvice"></div></div>
    </div>
    <div class="card plan-mutated-card"><div class="eyebrow">PLAN RECALCULADO</div><h3>Qué cambia a partir de lo que has hecho</h3><div id="adaptivePlanChanges"></div></div>
    <div class="card adaptive-analysis-card">
      <div class="eyebrow">COMPARADO CONTIGO</div><h3 id="adaptiveAnalysisTitle">Informe de la sesión</h3><div id="adaptiveAnalysis"></div>
    </div>
   </div>
  </div>
  <!-- Legacy render targets kept hidden so the old daily renderer cannot break the app. -->
  <div class="home-legacy-today" hidden aria-hidden="true"><span id="todayText"></span><span id="clock"></span><span id="mealNow"></span><span id="weeklyLoad"></span><span id="proteinPill"></span><span id="carbPill"></span><span id="fatiguePill"></span></div>
'''
s=s[:start]+block+s[metrics:]
p.write_text(s,encoding='utf-8')

# App: always show recent activities, not only today's activity; add sleep recovery advice.
p=Path('app.js')
s=p.read_text(encoding='utf-8')
start=s.index('function renderAdaptiveActivityResponse(){')
end=s.index('function renderHomeActivities(){',start)
renderer=r'''function homeRecentActivityRows(limit=3){
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
'''
s=s[:start]+renderer+s[end:]

# Remove the contextual banner entirely. Home ordering is now activity-first and stable.
start=s.index('function reorderHomeForContext(){')
end=s.index('function renderV5(){',start)
reorder=r'''function reorderHomeForContext(){
 const hoy=document.getElementById('hoy');if(!hoy)return;
 document.getElementById('homeModeBanner')?.remove();
 const activity=document.getElementById('homeActivityNow');
 if(activity)hoy.prepend(activity);
}

'''
s=s[:start]+reorder+s[end:]
p.write_text(s,encoding='utf-8')

# CSS: make the recent-activity feed the visual start and permanently suppress the old context banner.
p=Path('styles.css')
s=p.read_text(encoding='utf-8')
s += r'''

/* home-v79: activity feed is the Home entry point */
#homeModeBanner{display:none!important}
.home-legacy-today{display:none!important}
#hoy>.home-activity-now{margin-top:0}
.home-activity-list{display:grid;gap:12px}
.home-activity-item{min-width:0}
.home-activity-item .coros-activity-card{width:100%}
.home-activity-item:not(.is-latest) .coros-activity-card{filter:saturate(.88);opacity:.94}
.home-activity-item:not(.is-latest) .coros-primary{font-size:clamp(30px,6vw,46px)}
.postwork-grid{align-items:stretch}
@media(max-width:700px){
 #hoy>.home-activity-now{margin-top:0}
 .coros-home-head{align-items:flex-start}
 .coros-home-head .btn{padding:9px 10px}
 .home-activity-list{gap:10px}
 .postwork-grid{grid-template-columns:1fr}
}
'''
p.write_text(s,encoding='utf-8')

# Defensive checks before workflow commits.
idx=Path('index.html').read_text(encoding='utf-8')
app=Path('app.js').read_text(encoding='utf-8')
assert 'v7.9 · build home79' in idx
assert 'ÚLTIMAS ACTIVIDADES' in idx
assert 'adaptiveSleepAdvice' in idx
assert 'class="card hero"' not in idx[idx.index('<section class="page on" id="hoy">'):idx.index('<section class="page" id="semana">')]
segment=app[app.index('function reorderHomeForContext(){'):app.index('function renderV5(){')]
assert 'ensureHomeModeBanner' not in segment
assert 'homeRecentActivityRows(3)' in app

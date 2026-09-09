from pathlib import Path

OLD='20260909football67'
NEW='20260909report68'

# index.html
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='''  <div class="card section"><div class="eyebrow">Último partido</div><h2 id="footballLastTitle">Aún no hay partido registrado</h2><div id="footballLastSummary" class="muted">Cuando Health Connect o un FIT registre una pachanga, aparecerá aquí un resumen rápido de carga.</div></div>'''
new='''  <div class="card section match-report-card">
   <div class="sectionhead"><div><div class="eyebrow">Parte del partido</div><h2 id="matchReportHeadline">Aún no hay partido analizado</h2></div><span class="muted" id="matchReportDate"></span></div>
   <p id="matchReportVerdict" class="match-report-verdict muted">Cuando Health Connect o un FIT registre una pachanga, Training Lab interpretará sus métricas aquí.</p>
   <div class="grid g4" id="matchReportMetrics" style="margin-top:16px"></div>
   <div class="grid g2 section" style="margin-top:14px">
    <div><div class="eyebrow">Lectura del partido</div><div id="matchReportInsights" class="match-report-insights"></div></div>
    <div><div class="eyebrow">Comparado contigo</div><div id="matchReportComparison" class="match-report-insights"></div></div>
   </div>
   <div class="match-report-recovery" id="matchReportRecovery"></div>
  </div>
  <div class="card section"><div class="eyebrow">Último partido · datos brutos</div><h2 id="footballLastTitle">Aún no hay partido registrado</h2><div id="footballLastSummary" class="muted">Cuando Health Connect o un FIT registre una pachanga, aparecerá aquí un resumen rápido de carga.</div></div>'''
if old not in s: raise SystemExit('football last card anchor not found')
s=s.replace(old,new,1)
s=s.replace('v6.7 · build football67','v6.8 · build report68').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# app.js
p=Path('app.js')
s=p.read_text(encoding='utf-8')
anchor='function renderMatchMode(){'
if anchor not in s: raise SystemExit('renderMatchMode anchor missing')
report_js=r'''
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

'''
s=s.replace(anchor,report_js+anchor,1)
s=s.replace('renderMatchMode();renderFootballHub();renderPostMatch();','renderMatchMode();renderFootballHub();renderMatchReport();renderPostMatch();',1)
s=s.replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# styles.css
p=Path('styles.css')
s=p.read_text(encoding='utf-8')
if '/* match-report-v68 */' not in s:
    s += '''\n\n/* match-report-v68 */\n.match-report-card{background:radial-gradient(circle at 92% 8%,rgba(217,255,99,.10),transparent 28%),linear-gradient(180deg,#192329,#11181c)}\n.match-report-verdict{font-size:15px;max-width:850px}\n.match-report-insights .insight{padding:10px 0;border-bottom:1px solid var(--line)}\n.match-report-insights .insight:last-child{border-bottom:0}\n.match-report-recovery{margin-top:16px}\n'''
s=s.replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# SW/cache
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

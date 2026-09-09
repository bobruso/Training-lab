from pathlib import Path

OLD='20260909report68'
NEW='20260909trends69'

# index.html
p=Path('index.html')
s=p.read_text(encoding='utf-8')
anchor='''  <div class="card section"><div class="eyebrow">Último partido · datos brutos</div><h2 id="footballLastTitle">Aún no hay partido registrado</h2><div id="footballLastSummary" class="muted">Cuando Health Connect o un FIT registre una pachanga, aparecerá aquí un resumen rápido de carga.</div></div>'''
insert='''  <div class="card section football-trends-card">
   <div class="sectionhead"><div><div class="eyebrow">Evolución</div><h2>Tu rendimiento en las últimas pachangas</h2></div><span class="muted" id="footballTrendSample">sin historial suficiente</span></div>
   <div class="football-trend-tabs" id="footballTrendTabs">
    <button class="on" data-football-metric="high">Alta intensidad</button>
    <button data-football-metric="hr">FC media</button>
    <button data-football-metric="sprints">Sprints &gt;18</button>
    <button data-football-metric="mpm">m/min</button>
    <button data-football-metric="distance">Distancia</button>
    <button data-football-metric="finish">Final fuerte</button>
   </div>
   <div class="football-chart-wrap"><svg id="footballTrendChart" viewBox="0 0 760 300" role="img" aria-label="Evolución de rendimiento en fútbol"></svg></div>
   <div class="grid g3" id="footballTrendStats" style="margin-top:12px"></div>
   <div id="footballTrendInsights" class="match-report-insights" style="margin-top:12px"></div>
  </div>\n'''+anchor
if 'id="footballTrendChart"' not in s:
    if anchor not in s: raise SystemExit('football trends anchor not found')
    s=s.replace(anchor,insert,1)
s=s.replace('v6.8 · build report68','v6.9 · build trends69').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# app.js
p=Path('app.js')
s=p.read_text(encoding='utf-8')
anchor='function renderMatchMode(){'
if anchor not in s: raise SystemExit('match mode anchor missing')
js=r'''
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
'''
if 'function renderFootballTrends()' not in s:
    s=s.replace(anchor,js+'\n'+anchor,1)
s=s.replace("renderMatchMode();renderFootballHub();renderMatchReport();renderPostMatch();","renderMatchMode();renderFootballHub();renderMatchReport();renderFootballTrends();renderPostMatch();",1)
s=s.replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# runtime listener for metric buttons can be direct through data attributes after DOM ready; use app.js listener setup after nav listeners
p=Path('app.js')
s=p.read_text(encoding='utf-8')
needle="document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>window.navTo(b.dataset.page)));"
repl=needle+"\ndocument.querySelectorAll('[data-football-metric]').forEach(b=>b.addEventListener('click',()=>window.setFootballTrendMetric(b.dataset.footballMetric)));"
if '[data-football-metric]' not in s.split(needle,1)[-1][:300]: s=s.replace(needle,repl,1)
p.write_text(s,encoding='utf-8')

# styles.css
p=Path('styles.css')
s=p.read_text(encoding='utf-8')
if '/* football-trends-v69 */' not in s:
    s += '''\n\n/* football-trends-v69 */\n.football-trends-card{overflow:hidden}\n.football-trend-tabs{display:flex;gap:7px;overflow-x:auto;padding:4px 0 10px}\n.football-trend-tabs button{border:1px solid var(--line);background:#10171a;color:var(--muted);padding:8px 11px;border-radius:999px;font-weight:850;white-space:nowrap}\n.football-trend-tabs button.on{background:var(--lime);color:#10140d;border-color:transparent}\n.football-chart-wrap{width:100%;overflow-x:auto;background:#0b1114;border:1px solid var(--line);border-radius:16px;padding:8px}\n#footballTrendChart{width:100%;min-width:620px;height:auto;display:block}\n.chart-grid{stroke:#263238;stroke-width:1}.chart-zero{stroke:#718088;stroke-width:1.5;stroke-dasharray:5 5}.chart-line{fill:none;stroke:#d9ff63;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.chart-point{fill:#d9ff63;stroke:#101417;stroke-width:3}.chart-axis,.chart-date{fill:#829199;font-size:11px}.chart-value{fill:#f5f7f7;font-size:11px;font-weight:800}.chart-empty{fill:#96a4ac;font-size:16px}\n@media(max-width:580px){#footballTrendChart{min-width:560px}.football-chart-wrap{margin-inline:-2px}}\n'''
s=s.replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# service worker cache
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

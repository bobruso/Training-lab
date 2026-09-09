from pathlib import Path

OLD='20260909nav76'
NEW='20260910context77'

# version bumps
for name in ['index.html','runtime.js','app.js','service-worker.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    s=s.replace(OLD,NEW)
    if name=='index.html':
        s=s.replace('v7.6 · build nav76','v7.7 · build context77')
    p.write_text(s,encoding='utf-8')

# app.js: contextual Home mode + DOM reordering
p=Path('app.js')
s=p.read_text(encoding='utf-8')
marker='function renderV5(){'
if marker not in s:
    raise SystemExit('renderV5 marker missing')

logic=r'''
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
 const mode=homeContextMode(),banner=ensureHomeModeBanner();
 document.body.dataset.homeMode=mode.key;
 const label=document.getElementById('homeModeLabel'),title=document.getElementById('homeModeTitle'),text=document.getElementById('homeModeText');
 if(label)label.textContent=mode.label;if(title)title.textContent=mode.title;if(text)text.textContent=mode.text;
 const activity=document.getElementById('homeActivityNow');
 const hero=hoy.querySelector(':scope > .hero');
 const smart=hoy.querySelector(':scope > .smart-home-card');
 const decision=hoy.querySelector('.smart-decision-card')?.closest(':scope > .section')||hoy.querySelector('.smart-decision-card')?.parentElement;
 const match=document.getElementById('matchDayPanel');
 const metric=hero?.nextElementSibling?.classList?.contains('grid')?hero.nextElementSibling:hoy.querySelector(':scope > .section.grid.g3');
 const moveAfter=(node,after)=>{if(node&&after&&node!==after)after.after(node)};
 hoy.prepend(banner);
 if(mode.key==='post'){
   moveAfter(activity,banner);moveAfter(smart,activity||banner);moveAfter(metric,smart||activity||banner);moveAfter(decision,metric||smart||activity||banner);moveAfter(hero,decision||metric||smart||activity||banner);
 }else if(mode.key==='prematch'){
   if(match&&match.style.display!=='none')moveAfter(match,banner);
   moveAfter(smart,(match&&match.style.display!=='none')?match:banner);moveAfter(decision,smart||banner);moveAfter(metric,decision||smart||banner);moveAfter(activity,metric||decision||smart||banner);moveAfter(hero,activity||metric||decision||smart||banner);
 }else if(mode.key==='wake'){
   moveAfter(metric,banner);moveAfter(smart,metric||banner);moveAfter(decision,smart||metric||banner);moveAfter(activity,decision||smart||metric||banner);moveAfter(hero,activity||decision||smart||metric||banner);
 }else if(mode.key==='recovery'){
   moveAfter(smart,banner);moveAfter(metric,smart||banner);moveAfter(activity,metric||smart||banner);moveAfter(decision,activity||metric||smart||banner);moveAfter(hero,decision||activity||metric||smart||banner);
 }else{
   moveAfter(hero,banner);moveAfter(metric,hero||banner);moveAfter(smart,metric||hero||banner);moveAfter(decision,smart||metric||hero||banner);moveAfter(activity,decision||smart||metric||hero||banner);
 }
}

'''
s=s.replace(marker,logic+marker,1)
s=s.replace(marker,marker+'reorderHomeForContext();',1)

# ensure re-evaluation after sync completion if function exists
needle='renderAdaptiveActivityResponse();renderWeek();renderToday();'
if needle in s:
    s=s.replace(needle,needle+'reorderHomeForContext();',1)

p.write_text(s,encoding='utf-8')

# CSS
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
s += r'''

/* context-v77: Home changes hierarchy according to the user's current state */
.home-mode-banner{margin-bottom:14px;position:relative;overflow:hidden;border-color:color-mix(in srgb,var(--section-accent,var(--lime)) 46%,var(--line))}
.home-mode-banner:after{content:"";position:absolute;right:-45px;top:-65px;width:180px;height:180px;border-radius:50%;background:var(--section-accent,var(--lime));filter:blur(70px);opacity:.13;pointer-events:none}
.home-mode-title{font-size:clamp(25px,4vw,40px);font-weight:950;letter-spacing:-.045em;line-height:1.02;margin:5px 0 8px;max-width:850px}
.home-mode-banner p{margin-bottom:0;max-width:850px}
body[data-home-mode="post"] #homeModeBanner{--section-accent:#8fd5ff}
body[data-home-mode="prematch"] #homeModeBanner{--section-accent:#ff8c73}
body[data-home-mode="wake"] #homeModeBanner{--section-accent:#9d8cff}
body[data-home-mode="recovery"] #homeModeBanner{--section-accent:#7de3aa}
#hoy>.home-activity-now:first-of-type{margin-top:0}
@media(max-width:700px){.home-mode-banner{padding:16px}.home-mode-title{font-size:27px}}
'''
p.write_text(s,encoding='utf-8')

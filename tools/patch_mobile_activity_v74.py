from pathlib import Path

OLD='20260909header73'
STALE='20260909home70'
NEW='20260909activity74'

# index.html
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v7.3 · build header73','v7.4 · build activity74').replace(OLD,NEW).replace(STALE,NEW)
anchor='''  <div class="section card" id="matchDayPanel" style="display:none">'''
block='''  <div class="section home-activity-section">
   <div class="sectionhead"><div><div class="eyebrow">Actividad reciente</div><h2>Últimos entrenamientos</h2></div><button class="btn alt" onclick="navTo('entrenos')">Ver todas</button></div>
   <div id="homeRecentActivities" class="home-activity-list"></div>
  </div>\n\n'''
if anchor not in s: raise SystemExit('home activity anchor not found')
s=s.replace(anchor,block+anchor,1)
p.write_text(s,encoding='utf-8')

# runtime.js - swipe across form controls
p=Path('runtime.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW).replace(STALE,NEW)
start=s.find('  function installMobileSwipeNavigation(){')
end=s.find("  document.addEventListener('DOMContentLoaded',()=>{",start)
if start<0 or end<0: raise SystemExit('swipe function bounds not found')
new_swipe=r'''  function installMobileSwipeNavigation(){
    let start=null,lastSwipeAt=0;
    const mobile=()=>window.matchMedia('(max-width: 700px)').matches;
    const blocked=target=>!!target?.closest?.('input[type="range"],[role="slider"],canvas,svg,.update-dialog,[data-no-swipe]');
    const updateOpen=()=>{const n=document.getElementById('updateNotice');return n&&!n.hidden;};
    const pages=()=>[...document.querySelectorAll('nav [data-page]')]
      .map(b=>b.dataset.page)
      .filter((id,i,a)=>id&&a.indexOf(id)===i&&document.getElementById(id));

    document.addEventListener('touchstart',e=>{
      if(!mobile()||updateOpen()||e.touches.length!==1||blocked(e.target)){start=null;return;}
      const t=e.touches[0];start={x:t.clientX,y:t.clientY,time:performance.now(),horizontal:false,target:e.target};
    },{passive:true});

    document.addEventListener('touchmove',e=>{
      if(!start||!mobile()||e.touches.length!==1)return;
      const t=e.touches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
      if(!start.horizontal&&Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.2)start.horizontal=true;
      if(start.horizontal)e.preventDefault();
    },{passive:false});

    document.addEventListener('touchend',e=>{
      if(!start||!mobile()||updateOpen()){start=null;return;}
      const t=e.changedTouches?.[0];if(!t){start=null;return;}
      const dx=t.clientX-start.x,dy=t.clientY-start.y,dt=performance.now()-start.time,horizontal=start.horizontal;
      start=null;
      const threshold=Math.max(54,window.innerWidth*.13);
      if(!horizontal||dt>900||Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(dy)*1.25)return;
      const order=pages(),current=document.querySelector('.page.on')?.id,idx=order.indexOf(current);
      if(idx<0)return;
      const next=dx<0?idx+1:idx-1;
      if(next<0||next>=order.length)return;
      lastSwipeAt=Date.now();
      document.documentElement.dataset.swipeDirection=dx<0?'left':'right';
      if(typeof window.navTo==='function')window.navTo(order[next]);
      else {
        document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===order[next]));
        document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===order[next]));
      }
      window.setTimeout(()=>delete document.documentElement.dataset.swipeDirection,260);
    },{passive:true});

    document.addEventListener('click',e=>{
      if(Date.now()-lastSwipeAt<420){e.preventDefault();e.stopPropagation();}
    },true);
    document.addEventListener('touchcancel',()=>{start=null;},{passive:true});
  }
'''
s=s[:start]+new_swipe+s[end:]
p.write_text(s,encoding='utf-8')

# app.js
p=Path('app.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW).replace(STALE,NEW)

# Recipe photo URLs
rs=s.find('const recipes=[')
re=s.find('];\nfunction mealForHour',rs)
if rs<0 or re<0: raise SystemExit('recipes bounds not found')
recipes=r'''const recipes=[
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
'''
s=s[:rs]+recipes+s[re:]

old="function recipeCard(r){let [meal,n,p,c,f,desc]=r;return `<div class=\"card recipe\"><span class=\"tag\">${meal}</span><h3>${n}</h3><div class=\"meta\">P ${p} g · HC ${c} g · G ${f} g</div><p class=\"muted\">${desc}</p><a class=\"btn alt\" style=\"display:inline-block;text-decoration:none\" target=\"_blank\" href=\"https://cookidoo.es/search/es-ES?query=${encodeURIComponent(n)}\">Buscar en Cookidoo</a></div>`}"
new="function recipeCard(r){let [meal,n,p,c,f,desc,img]=r;return `<div class=\"card recipe\">${img?`<img class=\"recipe-media\" loading=\"lazy\" decoding=\"async\" src=\"${img}\" alt=\"${n}\" onerror=\"this.style.display='none'\">`:''}<span class=\"tag\">${meal}</span><h3>${n}</h3><div class=\"meta\">P ${p} g · HC ${c} g · G ${f} g</div><p class=\"muted\">${desc}</p><a class=\"btn alt\" style=\"display:inline-block;text-decoration:none\" target=\"_blank\" href=\"https://cookidoo.es/search/es-ES?query=${encodeURIComponent(n)}\">Buscar en Cookidoo</a></div>`}"
if old not in s: raise SystemExit('recipeCard anchor not found')
s=s.replace(old,new,1)

# Preserve title from cloud activity rows
old_map="S.activities=acts.data.map(a=>({id:a.id,date:a.activity_date,type:a.activity_type,source:a.source,started_at:a.started_at,duration:Number(a.duration_min)||0,moving:Number(a.moving_time_min)||0,rpe:Number(a.rpe)||0,distance:Number(a.distance_km)||0,hr:Number(a.avg_hr)||0,hrmax:Number(a.max_hr)||0,kcal:Number(a.calories)||0,topSpeed:Number(a.top_speed_kmh)||0,highIntensity:Number(a.high_intensity_m)||0,sprints:Number(a.sprint_count)||0,absSprints:Number(a.absolute_sprint_count)||0,pace:Number(a.avg_pace_sec_km)||0,metrics:a.metrics||{},fitName:a.source==='fit'?a.title:null}));"
new_map="S.activities=acts.data.map(a=>({id:a.id,date:a.activity_date,type:a.activity_type,source:a.source,title:a.title||null,started_at:a.started_at,duration:Number(a.duration_min)||0,moving:Number(a.moving_time_min)||0,rpe:Number(a.rpe)||0,distance:Number(a.distance_km)||0,hr:Number(a.avg_hr)||0,hrmax:Number(a.max_hr)||0,kcal:Number(a.calories)||0,topSpeed:Number(a.top_speed_kmh)||0,highIntensity:Number(a.high_intensity_m)||0,sprints:Number(a.sprint_count)||0,absSprints:Number(a.absolute_sprint_count)||0,pace:Number(a.avg_pace_sec_km)||0,metrics:a.metrics||{},fitName:a.source==='fit'?a.title:null}));"
if old_map not in s: raise SystemExit('activity map anchor not found')
s=s.replace(old_map,new_map,1)

# navTo: theme + scroll active top-menu tab into view
old_nav="window.navTo=function navTo(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===p));window.scrollTo({top:0,behavior:'smooth'})}"
new_nav="window.navTo=function navTo(p){document.body.dataset.section=p;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id===p));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('on',x.dataset.page===p));const active=document.querySelector(`nav [data-page=\"${p}\"]`);if(active&&window.matchMedia('(max-width: 700px)').matches)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});window.scrollTo({top:0,behavior:'smooth'})}"
if old_nav not in s: raise SystemExit('navTo anchor not found')
s=s.replace(old_nav,new_nav,1)

# Auto Health Connect again when app returns to foreground, with cooldown.
qs=s.find('let healthConnectSilent=false;')
qe=s.find('window.syncHealthConnect=async function(options={}){',qs)
if qs<0 or qe<0: raise SystemExit('health auto bounds not found')
new_queue=r'''let healthConnectSilent=false;
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
'''
s=s[:qs]+new_queue+s[qe:]

# Home activity cards
marker='function renderV5(){'
idx=s.find(marker)
if idx<0: raise SystemExit('renderV5 marker not found')
activity_fn=r'''function formatActivityDuration(mins){
 const sec=Math.max(0,Math.round(Number(mins||0)*60));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}
function activityLabel(type){return ({run:'Carrera',football:'Fútbol',gym:'Fuerza',walk:'Paseo',other:'Actividad'})[type]||'Actividad';}
function activityIcon(type){return ({run:'🏃',football:'⚽',gym:'🏋️',walk:'🚶',other:'●'})[type]||'●';}
function activityPace(a){
 const sec=Number(a.pace)||(a.distance>0&&a.duration>0?(a.duration*60/a.distance):0);if(!sec)return null;
 return `${Math.floor(sec/60)}′${String(Math.round(sec%60)).padStart(2,'0')}″/km`;
}
function renderHomeActivities(){
 const el=document.getElementById('homeRecentActivities');if(!el)return;
 const acts=[...S.activities].sort((a,b)=>new Date(b.started_at||b.date+'T12:00:00')-new Date(a.started_at||a.date+'T12:00:00')).slice(0,3);
 if(!acts.length){el.innerHTML='<div class="card activity-empty"><b>Aún no hay actividades sincronizadas.</b><div class="muted small">Al abrir la APK, Training Lab consulta Health Connect automáticamente.</div></div>';return;}
 el.innerHTML=acts.map(a=>{
   const primary=a.distance>0?`${Number(a.distance).toFixed(2)} km`:formatActivityDuration(a.duration);
   const pace=a.type==='run'?activityPace(a):null;
   const meta=[a.duration?formatActivityDuration(a.duration):null,pace,a.hr?`${Math.round(a.hr)} ppm`:null,a.kcal?`${Math.round(a.kcal)} kcal`:null].filter(Boolean).join(' · ');
   const when=a.started_at?new Date(a.started_at).toLocaleString('es-ES',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):new Date(a.date+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
   const source=a.source==='health_connect'?'Health Connect':a.source==='fit'?'FIT':'Training Lab';
   return `<button class="activity-card activity-${escapeHtml(a.type||'other')}" onclick="navTo('entrenos')"><div class="activity-copy"><div class="activity-kicker">${activityIcon(a.type)} ${escapeHtml(activityLabel(a.type))}</div><div class="activity-primary">${primary}</div><div class="activity-meta">${escapeHtml(meta||'Métricas pendientes')}</div><div class="activity-title">${escapeHtml(a.title||activityLabel(a.type))}</div><div class="activity-source">${escapeHtml(when)} · ${source}</div></div><div class="activity-visual" aria-hidden="true"><span>${activityIcon(a.type)}</span><svg viewBox="0 0 120 70" preserveAspectRatio="none"><path d="M5 53 C22 19,30 61,47 30 S70 18,77 49 S96 60,115 17"/></svg></div></button>`;
 }).join('');
}

'''
s=s[:idx]+activity_fn+s[idx:]
s=s.replace("function renderV5(){\n renderQuestions();", "function renderV5(){\n renderHomeActivities();renderQuestions();",1)
s=s.replace("renderAll();setInterval(()=>{renderToday();renderSmartHome();renderCoachTasks();},30000);", "document.body.dataset.section=document.querySelector('.page.on')?.id||'hoy';renderAll();setInterval(()=>{renderToday();renderSmartHome();renderCoachTasks();},30000);",1)
p.write_text(s,encoding='utf-8')

# styles.css
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW).replace(STALE,NEW)
if '/* visual-sections-activity-v74 */' not in s:
 s += r'''

/* visual-sections-activity-v74 */
body{--section-accent:var(--lime);--section-border:rgba(217,255,99,.20)}
body[data-section="hoy"]{--section-accent:#d9ff63;--section-border:rgba(217,255,99,.22)}
body[data-section="semana"]{--section-accent:#8fd5ff;--section-border:rgba(143,213,255,.23)}
body[data-section="comer"]{--section-accent:#ffb56b;--section-border:rgba(255,181,107,.25)}
body[data-section="registro"]{--section-accent:#c5a3ff;--section-border:rgba(197,163,255,.24)}
body[data-section="entrenos"]{--section-accent:#76e6e0;--section-border:rgba(118,230,224,.22)}
body[data-section="futbol"]{--section-accent:#ff7e92;--section-border:rgba(255,126,146,.24)}
body[data-section="gym"]{--section-accent:#7de3aa;--section-border:rgba(125,227,170,.22)}
body[data-section="sueno"]{--section-accent:#b69cff;--section-border:rgba(182,156,255,.24)}
body[data-section="checkin"]{--section-accent:#72d7ff;--section-border:rgba(114,215,255,.22)}
body[data-section="recuperacion"]{--section-accent:#7de3aa;--section-border:rgba(125,227,170,.22)}
body[data-section="comparar"]{--section-accent:#ffe089;--section-border:rgba(255,224,137,.22)}
body[data-section="progreso"]{--section-accent:#8fb7ff;--section-border:rgba(143,183,255,.22)}
body[data-section="rpg"]{--section-accent:#ffc857;--section-border:rgba(255,200,87,.24)}
body[data-section="ajustes"]{--section-accent:#c8d2d7;--section-border:rgba(200,210,215,.20)}
.page.on .eyebrow{color:var(--section-accent)}
.page.on .card{border-color:var(--section-border)}
.page.on .btn:not(.alt):not(.red):not(.blue){background:var(--section-accent)}
nav button.on{background:var(--section-accent);color:#101417;border-color:var(--section-accent)}
.bottom button.on{color:var(--section-accent)!important}

.recipe{overflow:hidden}.recipe-media{display:block;width:calc(100% + 32px);height:150px;object-fit:cover;margin:-16px -16px 14px;background:#0c1114}.recipe .tag{margin-bottom:8px}.recipe h3{margin-top:8px}

.home-activity-list{display:grid;gap:10px}.activity-card{width:100%;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,#1d262b,#141a1e);color:var(--text);padding:16px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) 122px;gap:14px;align-items:stretch;cursor:pointer}.activity-copy{min-width:0}.activity-kicker{font-size:11px;font-weight:900;color:var(--section-accent);text-transform:uppercase;letter-spacing:.05em}.activity-primary{font-size:32px;font-weight:950;letter-spacing:-.055em;margin:4px 0}.activity-meta{font-size:13px;color:#d2dade}.activity-title{font-size:13px;font-weight:800;margin-top:7px}.activity-source{font-size:10px;color:var(--muted);margin-top:3px}.activity-visual{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 68% 35%,var(--section-border),transparent 42%),#0d1316;min-height:110px}.activity-visual span{position:absolute;right:13px;top:10px;font-size:28px;opacity:.88}.activity-visual svg{position:absolute;inset:auto 8px 9px 8px;width:calc(100% - 16px);height:70px}.activity-visual path{fill:none;stroke:var(--section-accent);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.activity-empty{box-shadow:none}
@media(max-width:700px){.recipe-media{width:calc(100% + 28px);margin:-14px -14px 13px;height:138px}.activity-card{grid-template-columns:minmax(0,1fr) 100px;padding:14px}.activity-primary{font-size:29px}.activity-visual{min-height:100px}nav{scroll-behavior:smooth;scrollbar-width:none}nav::-webkit-scrollbar{display:none}}
'''
p.write_text(s,encoding='utf-8')

# service worker
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW).replace(STALE,NEW)
p.write_text(s,encoding='utf-8')

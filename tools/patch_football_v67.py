from pathlib import Path

OLD='20260909home66'
NEW='20260909football67'

# ---------- index.html ----------
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('<button data-page="entrenos">Entrenamientos</button><button data-page="gym">Gym</button>', '<button data-page="entrenos">Entrenamientos</button><button data-page="futbol">Fútbol</button><button data-page="gym">Gym</button>')

football_section='''
 <section class="page" id="futbol">
  <div class="sectionhead"><div><h2>Fútbol</h2><span class="muted">preparación, calentamiento y recuperación para tus pachangas</span></div><button class="btn alt" onclick="setFootball(true)">Jugaré hoy</button></div>

  <div class="card module-hero football-hero">
   <div class="eyebrow">Modo partido</div>
   <div class="grid g2">
    <div><h1 id="footballHubTitle" class="football-title">¿Hay pachanga hoy?</h1><p class="muted" id="footballHubSubtitle">Confirma el partido para adaptar comida, calentamiento y recuperación.</p><div class="match-countdown" id="footballHubCountdown">—</div><p class="muted" id="footballHubCountdownLabel">hora por confirmar</p></div>
    <div><div class="field"><label>Hora del partido</label><input id="footballHubTime" type="time"></div><div class="actions" style="margin-top:10px"><button class="btn" onclick="saveFootballHubTime()">Guardar hora</button><button class="btn alt" onclick="setFootball(false)">Hoy no juego</button></div><div id="footballHubStatus" class="small muted" style="margin-top:10px"></div></div>
   </div>
  </div>

  <div class="section grid g3" id="footballQuickStatus">
   <div class="card metric"><div class="k">Estado para entrenar</div><div class="v" id="footballReadiness">—</div><div class="muted" id="footballReadinessText">—</div></div>
   <div class="card metric"><div class="k">Piernas estimadas</div><div class="v" id="footballLegs">—</div><div class="muted">recuperación estimada</div></div>
   <div class="card metric"><div class="k">Fatiga percibida</div><div class="v" id="footballFatigue">—</div><div class="muted">escala 1–5</div></div>
  </div>

  <div class="section card football-now-card">
   <div class="eyebrow">Qué toca ahora</div><h2 id="footballNowTitle">Preparación general</h2><div id="footballNowAdvice" class="football-advice"></div>
  </div>

  <div class="sectionhead section"><h2>Calentamiento · 12–15 min</h2><span class="muted">progresivo, sin fatigar antes de empezar</span></div>
  <div class="football-timeline">
   <div class="card warm-step"><span class="warm-time">0–3'</span><h3>Subir temperatura</h3><p class="muted">Trote suave, desplazamientos laterales y hacia atrás. Acaba notando calor, no cansancio.</p></div>
   <div class="card warm-step"><span class="warm-time">3–6'</span><h3>Movilidad dinámica</h3><p class="muted">Tobillos, balanceos de cadera, zancadas caminando y apertura/cierre de cadera. Nada de estiramientos largos mantenidos.</p></div>
   <div class="card warm-step"><span class="warm-time">6–9'</span><h3>Activación</h3><p class="muted">2×8 sentadillas controladas, 2×6 zancadas por lado y 2×10 elevaciones de gemelo. Si llevas minibanda: pasos laterales suaves.</p></div>
   <div class="card warm-step"><span class="warm-time">9–12'</span><h3>Acelerar</h3><p class="muted">3–4 progresiones de 15–20 m: aproximadamente 60 %, 70 %, 80 % y solo si estás cómodo 85–90 %. Recupera caminando.</p></div>
   <div class="card warm-step"><span class="warm-time">12–15'</span><h3>Balón + cambios de dirección</h3><p class="muted">Pases, controles, dos o tres cambios de dirección progresivos y un par de acciones específicas de tu posición. Evita un sprint máximo “para probar”.</p></div>
  </div>
  <div id="footballWarmupAlert" class="section"></div>

  <div class="section grid g3">
   <div class="card"><div class="eyebrow">Antes del partido</div><h3>Comida e hidratación</h3><div id="footballFuelAdvice" class="football-advice"></div></div>
   <div class="card"><div class="eyebrow">Durante</div><h3>Gestiona el esfuerzo</h3><div class="football-advice"><p><b>Primeros 5 min:</b> entra progresivamente; no hace falta que tu primera acción sea un sprint máximo.</p><p>Si hay pausa, aprovecha para beber. Tras estar varios minutos parado, vuelve a moverte antes de acelerar fuerte.</p></div></div>
   <div class="card"><div class="eyebrow">Después</div><h3>Recuperación inmediata</h3><div id="footballPostAdvice" class="football-advice"></div></div>
  </div>

  <div class="card section"><div class="eyebrow">Último partido</div><h2 id="footballLastTitle">Aún no hay partido registrado</h2><div id="footballLastSummary" class="muted">Cuando Health Connect o un FIT registre una pachanga, aparecerá aquí un resumen rápido de carga.</div></div>
 </section>
'''

needle='\n <section class="page" id="gym">'
if 'id="futbol"' not in s:
    if needle not in s: raise SystemExit('gym section anchor not found')
    s=s.replace(needle, football_section+needle,1)

# Simplify gym content
start=s.find(' <section class="page" id="gym">')
end=s.find('\n\n <section class="page" id="sueno">', start)
if start==-1 or end==-1: raise SystemExit('gym boundaries not found')
new_gym=''' <section class="page" id="gym">
  <div class="sectionhead"><h2>Fuerza en casa</h2><span class="muted">simple, útil y compatible con fútbol</span></div>
  <div class="grid g3">
   <div class="card"><div class="eyebrow">Cuerpo completo · 30–40 min</div><div class="exercise"><b>Goblet squat</b> · 3×8–15</div><div class="exercise"><b>Peso muerto rumano con mancuernas</b> · 3×8–15</div><div class="exercise"><b>Flexiones o press suelo</b> · 3×8–15</div><div class="exercise"><b>Remo unilateral</b> · 3×10–15/lado</div><div class="exercise"><b>Gemelos</b> · 3×12–20</div><p class="small muted">Deja normalmente 1–3 repeticiones en recámara. No hace falta llegar al fallo.</p></div>
   <div class="card"><div class="eyebrow">Torso · 20–30 min</div><div class="exercise"><b>Flexiones / press suelo</b> · 3×8–15</div><div class="exercise"><b>Remo con mancuerna</b> · 3×10–15</div><div class="exercise"><b>Press hombro con mancuernas</b> · 2–3×8–15</div><div class="exercise"><b>Elevaciones laterales</b> · 2–3×12–20</div><div class="exercise"><b>Curl + tríceps</b> · 2×10–15</div><p class="small muted">Buena opción si hay fútbol el mismo día y quieres evitar cargar las piernas.</p></div>
   <div class="card"><div class="eyebrow">Core + prevención · 10–15 min</div><div class="exercise"><b>Dead bug</b> · 3×8–12/lado</div><div class="exercise"><b>Plancha lateral</b> · 2×30–45 s/lado</div><div class="exercise"><b>Puente de glúteo</b> · 3×10–15</div><div class="exercise"><b>Elevación de gemelo unilateral</b> · 2×12–20/lado</div><div class="exercise"><b>Equilibrio a una pierna</b> · 2×30–45 s/lado</div></div>
  </div>
  <div class="notice section">Si hay partido en menos de 24 h, prioriza torso/core o una sesión muy ligera. Evita una sesión dura de pierna justo antes de jugar.</div>
 </section>'''
s=s[:start]+new_gym+s[end:]

# mobile bottom: make football directly reachable
s=s.replace('<button data-page="recuperacion">RECUP.</button><button data-page="progreso">PROGRESO</button>', '<button data-page="futbol">FÚTBOL</button><button data-page="recuperacion">RECUP.</button>')

s=s.replace('v6.6 · build home66','v6.7 · build football67').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# ---------- app.js ----------
p=Path('app.js')
s=p.read_text(encoding='utf-8')

insert_before='function renderMatchMode(){'
football_js=r'''
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
'''
if 'function renderFootballHub()' not in s:
    if insert_before not in s: raise SystemExit('renderMatchMode anchor not found')
    s=s.replace(insert_before,football_js+'\n'+insert_before,1)

# ensure renderAll invokes it
if 'renderFootballHub();' not in s:
    # append to renderMatchMode call wherever renderAll chains known renderers
    s=s.replace('renderMatchMode();', 'renderMatchMode();renderFootballHub();',1)

s=s.replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

# ---------- styles.css ----------
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace('v6.6 · home66','v6.7 · football67')
if '/* football-v67 */' not in s:
    s+='''\n\n/* football-v67 */\n.football-title{font-size:clamp(34px,6vw,62px);line-height:.98;letter-spacing:-.05em;margin:6px 0 10px}\n.football-timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}\n.warm-step{position:relative;padding-top:46px}.warm-time{position:absolute;top:14px;left:14px;font-weight:950;font-size:14px;color:var(--lime)}\n.warm-step h3{margin-bottom:7px}.football-advice p{margin-bottom:10px}.football-advice p:last-child{margin-bottom:0}\n.football-now-card{border-color:rgba(217,255,99,.35)}\n@media(max-width:900px){.football-timeline{grid-template-columns:1fr 1fr}}\n@media(max-width:580px){.football-timeline{grid-template-columns:1fr}.warm-step{padding-top:42px}}\n'''
p.write_text(s,encoding='utf-8')

# ---------- service worker ----------
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

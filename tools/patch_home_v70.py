from pathlib import Path

OLD='20260909trends69'
NEW='20260909home70'

# ---------- index.html ----------
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v6.9 · build trends69','v7.0 · build home70').replace(OLD,NEW)

old_metric='''   <div class="card metric"><div class="k">Nivel RPG</div><div class="v" id="todayLevel">1</div><div class="muted" id="todayXp">0 XP</div></div>'''
new_metric='''   <div class="card metric"><div class="k">Piernas</div><div class="v" id="homeLegs">—</div><div class="muted" id="homeLegsText">recuperación estimada</div></div>'''
if old_metric not in s: raise SystemExit('RPG home metric not found')
s=s.replace(old_metric,new_metric,1)

old_coach='''  <div class="section card module-hero">
   <div class="sectionhead"><div><div class="eyebrow">Coach diario</div><h2 style="margin:3px 0 0">Lo que necesita tu atención</h2></div><span class="muted">priorizado automáticamente</span></div>
   <div id="coachTasks"></div>
  </div>'''
new_coach='''  <div class="section card module-hero smart-home-card">
   <div class="sectionhead"><div><div class="eyebrow">Resumen inteligente</div><h2 style="margin:3px 0 0">Tus 3 prioridades de hoy</h2></div><span class="muted" id="homeContextStamp">se actualiza automáticamente</span></div>
   <div id="coachTasks" class="smart-priorities"></div>
  </div>'''
if old_coach not in s: raise SystemExit('coach block not found')
s=s.replace(old_coach,new_coach,1)

old_choice='''   <div class="card">
    <div class="eyebrow">Te toca</div>
    <div class="bigchoice" id="todayPlan">—</div>
    <p class="muted" id="todayReason"></p>
    <div class="actions">
      <button class="btn" onclick="markTodayDone()">Hecho</button>
      <button class="btn alt" onclick="openRegister()">Registrar actividad</button>
    </div>
   </div>'''
new_choice='''   <div class="card smart-decision-card">
    <div class="eyebrow">Lo que haría hoy</div>
    <div class="smart-decision-tag" id="homeDecisionTag">Calculando contexto…</div>
    <div class="bigchoice" id="todayPlan">—</div>
    <p class="muted" id="todayReason"></p>
    <div class="home-decision-context" id="homeDecisionContext"></div>
    <div class="actions">
      <button class="btn" onclick="markTodayDone()">Hecho</button>
      <button class="btn alt" onclick="openRegister()">Registrar actividad</button>
      <button class="btn alt" id="homeCheckinBtn" onclick="navTo('checkin')">Check-in rápido</button>
    </div>
   </div>'''
if old_choice not in s: raise SystemExit('today choice block not found')
s=s.replace(old_choice,new_choice,1)

p.write_text(s,encoding='utf-8')

# ---------- app.js ----------
p=Path('app.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)

start=s.find('function renderCoachTasks(){')
end=s.find('\nwindow.answerGoal=',start)
if start==-1 or end==-1: raise SystemExit('renderCoachTasks boundaries not found')

new_fn=r'''function smartHomeContext(){
 const now=new Date(),today=iso(),plan=adaptivePlan(now),ready=readiness(),rec=calcRecovery(now);
 const legs=Math.round((rec.cuadriceps+rec.isquios+rec.gemelos+rec.gluteo)/4),fat=fatigueFor(now);
 const sleep=cloudSleep?.find(x=>Math.abs((new Date(x.sleep_date+'T12:00:00')-new Date(today+'T12:00:00'))/86400000)<=1)||null;
 const checked=cloudCheckins.some(x=>x.checkin_date===today),isMatch=footballScheduled(now),time=S.matchTimes?.[today]||null;
 const match=time?new Date(today+'T'+time+':00'):null,hours=match?(match-now)/3600000:null;
 const lower=['isquios','cuadriceps','gemelo','tobillo','pie','rodilla','aductor','ingle','gluteo'];
 const injury=cloudInjuries.find(i=>i.status==='active'&&lower.includes(String(i.body_area).toLowerCase())&&Number(i.pain_score||0)>=3)||null;
 return {now,today,plan,ready,rec,legs,fat,sleep,checked,isMatch,time,match,hours,injury,meal:mealForHour(now.getHours())};
}
function renderSmartHome(){
 const c=smartHomeContext(),legsEl=document.getElementById('homeLegs'),legsText=document.getElementById('homeLegsText');
 if(legsEl)legsEl.textContent=c.legs+'%';
 if(legsText)legsText.textContent=c.legs>=75?'bien recuperadas':c.legs>=50?'recuperación intermedia':'recuperación baja';
 const stamp=document.getElementById('homeContextStamp');if(stamp)stamp.textContent='actualizado '+String(c.now.getHours()).padStart(2,'0')+':'+String(c.now.getMinutes()).padStart(2,'0');
 const checkBtn=document.getElementById('homeCheckinBtn');if(checkBtn){checkBtn.hidden=c.checked;checkBtn.textContent='Check-in rápido';}

 let decision={tag:'Plan del día',title:c.plan.title,text:c.plan.reason};
 if(c.isMatch){
   if(c.hours===null)decision={tag:'PARTIDO HOY',title:'Pachanga · falta la hora',text:'El fútbol manda sobre el resto del plan. Añade la hora en Fútbol para ajustar comida y calentamiento.'};
   else if(c.hours>6)decision={tag:'PARTIDO HOY',title:'Pachanga · prepara el día',text:'Reserva las piernas. Prioriza carbohidratos e hidratación repartida y evita una sesión dura de tren inferior.'};
   else if(c.hours>2)decision={tag:`PARTIDO EN ${Math.floor(c.hours)} H`,title:'Pachanga · combustible y calma',text:'No añadas carga dura. Come fácil, hidrátate y guarda las piernas para el partido.'};
   else if(c.hours>.5)decision={tag:'PARTIDO CERCA',title:'Pachanga · últimos preparativos',text:'Nada pesado ahora. Organiza material, pequeños sorbos y empieza el calentamiento cuando falten unos 15 minutos.'};
   else if(c.hours>0)decision={tag:'CALENTAMIENTO',title:'Pachanga · calienta ahora',text:'Haz el protocolo progresivo de 12–15 min. No conviertas el calentamiento en un test máximo.'};
   else decision={tag:'POSTPARTIDO',title:'Recuperar',text:'Camina unos minutos, rehidrata y mete carbohidratos + proteína. La siguiente carga depende de cómo queden las piernas.'};
 }
 if(c.injury&&Number(c.injury.pain_score||0)>=5)decision={tag:'MODIFICAR CARGA',title:c.isMatch?'Pachanga con precaución':'Evita cargar la zona',text:`Tienes ${escapeHtml(c.injury.body_area)} con dolor ${Number(c.injury.pain_score)}/10. Si aumenta, altera la carrera o limita el apoyo, no fuerces.`};
 if(c.ready.score<45&&!c.isMatch)decision={tag:'RECUPERACIÓN',title:'Descanso / paseo suave',text:'El contexto de hoy no favorece meter intensidad. Prioriza sueño, comida y movimiento suave.'};
 document.getElementById('todayPlan').textContent=decision.title;
 document.getElementById('todayReason').textContent=decision.text;
 const tag=document.getElementById('homeDecisionTag');if(tag)tag.textContent=decision.tag;
 const ctx=document.getElementById('homeDecisionContext');if(ctx){
   const sleepTxt=c.sleep?`${(Number(c.sleep.total_sleep_min||0)/60).toFixed(1)} h sueño`:'sueño pendiente';
   ctx.innerHTML=`<span>Estado ${c.ready.score}/100</span><span>Piernas ${c.legs}%</span><span>${sleepTxt}</span><span>Fatiga ${c.fat}/5</span>`;
 }
}
function renderCoachTasks(){
 const el=document.getElementById('coachTasks');if(!el)return;
 const c=smartHomeContext(),tasks=[];
 const push=(priority,icon,title,text,action=null,label=null)=>tasks.push({priority,icon,title,text,action,label});

 if(c.injury){
   const pain=Number(c.injury.pain_score||0);push(pain>=5?100:80,'⚠️',`Molestia: ${c.injury.body_area} ${pain}/10`,pain>=5?'No uses el calentamiento ni los sprints para probar la zona. Reduce o cancela si cambia tu forma de correr.':'Calienta progresivamente y vigila si el dolor aumenta con velocidad o cambios de dirección.',`navTo('recuperacion')`,'Ver recuperación');
 }
 if(c.isMatch){
   if(c.hours===null)push(96,'⚽','Hoy hay pachanga','Falta la hora. Añádela para que la Home pueda decirte cuándo comer y cuándo empezar el calentamiento.',`navTo('futbol')`,'Poner hora');
   else if(c.hours>0&&c.hours<=.5)push(99,'🔥','Calentamiento ahora',`Faltan ${Math.max(1,Math.round(c.hours*60))} min. Haz el calentamiento progresivo de 12–15 min.`,`navTo('futbol')`,'Abrir calentamiento');
   else if(c.hours>0&&c.hours<=2)push(94,'⚽','Partido muy cerca',`Faltan ${Math.round(c.hours*60)} min. Evita comida pesada y no añadas entrenamiento.`,`navTo('futbol')`,'Modo partido');
   else if(c.hours>0&&c.hours<=6){
     const t=targetsForToday(),carbs=todayMeals().reduce((sum,x)=>sum+Number(x.carbs_g||0),0);
     push(90,'🍌','Combustible para el partido',`Faltan ${c.hours.toFixed(1)} h. Llevas ~${Math.round(carbs)} g de HC; objetivo diario orientativo ${t.carbs} g.`,`navTo('comer')`,'Ver comida');
   } else if(c.hours!==null&&c.hours<=0)push(95,'🧊','Recuperación postpartido','Camina, rehidrata y come. Cuando llegue Health Connect/FIT, el parte del partido se actualizará solo.',`navTo('futbol')`,'Ver parte');
 }
 if(c.sleep){
   const mins=Number(c.sleep.total_sleep_min||0);
   if(mins<360)push(88,'🌙','Sueño claramente corto',`Has dormido ${(mins/60).toFixed(1)} h. Protege la recuperación y evita añadir intensidad que no sea necesaria.`,`navTo('sueno')`,'Ver sueño');
   else if(mins<420)push(74,'🌙','Sueño algo corto',`Has dormido ${(mins/60).toFixed(1)} h. No invalida el día, pero pesa en la decisión de carga.`,`navTo('sueno')`,'Ver sueño');
 }else push(70,'🌙','Falta el sueño reciente','La sincronización automática no ha dejado una noche reciente. Puedes forzar Health Connect desde Sueño.',`navTo('sueno')`,'Ver sueño');
 if(c.legs<45)push(86,'🦵','Piernas poco recuperadas',`Recuperación estimada ${c.legs} %. Evita pierna dura y sprints extra fuera de un partido confirmado.`,`navTo('recuperacion')`,'Ver piernas');
 else if(c.legs<60)push(64,'🦵','Piernas a media carga',`Recuperación estimada ${c.legs} %. Mejor no añadir trabajo intenso innecesario.`,`navTo('recuperacion')`,'Ver recuperación');
 if(c.ready.score<50)push(82,'🧭','Estado para entrenar bajo',`${c.ready.score}/100. Mira el desglose antes de añadir carga desplazable.`,null,null);
 if(!c.checked)push(68,'✓','Falta tu check-in','30 segundos de energía, agujetas, estrés y motivación mejoran la interpretación del día.',`navTo('checkin')`,'Responder');
 const nowHour=c.now.getHours();
 if(!c.isMatch&&nowHour>=18&&nowHour<21)push(45,'🥪','Ahora toca merienda','Aprovecha para acercarte al objetivo de proteína y carbohidratos sin tener que compensar al final del día.',`navTo('comer')`,'Ver opciones');
 if(c.now.getDay()===0&&!S.weights.some(w=>w.date===c.today))push(55,'⚖️','Control de peso pendiente','Si todavía estás en condiciones comparables, registra el peso; si no, mejor esperar al próximo control.',`navTo('registro');document.getElementById('weightKg').focus()`,'Registrar');

 const selected=tasks.sort((a,b)=>b.priority-a.priority).slice(0,3);
 if(!selected.length)selected.push({icon:'✓',title:'Todo en orden',text:'No hay ninguna prioridad especial ahora mismo. Sigue el plan del día.'});
 el.innerHTML=selected.map((t,i)=>`<div class="coach-task smart-priority"><div class="priority-rank">${i+1}</div><div class="task-main"><div class="task-icon">${t.icon}</div><div><b>${escapeHtml(t.title)}</b><div class="muted small">${escapeHtml(t.text)}</div></div></div>${t.action?`<button class="btn alt" onclick="${t.action}">${t.label}</button>`:''}</div>`).join('');
 renderSmartHome();
}
'''
s=s[:start]+new_fn+s[end:]

# refresh the smart context every clock refresh too
s=s.replace('renderAll();setInterval(renderToday,30000);','renderAll();setInterval(()=>{renderToday();renderSmartHome();renderCoachTasks();},30000);')

p.write_text(s,encoding='utf-8')

# ---------- styles.css ----------
p=Path('styles.css')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
if '/* intelligent-home-v70 */' not in s:
    s += r'''

/* intelligent-home-v70 */
.smart-home-card{background:radial-gradient(circle at 90% 0,rgba(217,255,99,.10),transparent 30%),linear-gradient(180deg,#192329,#11181c)}
.smart-priorities{display:grid;gap:9px}.smart-priority{position:relative;padding-left:48px}.priority-rank{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--lime);color:#101508;font-weight:950;font-size:12px}
.smart-decision-card{background:linear-gradient(145deg,rgba(217,255,99,.07),transparent 45%),#151e22}.smart-decision-tag{display:inline-block;margin:7px 0 8px;padding:5px 9px;border-radius:999px;border:1px solid rgba(217,255,99,.35);color:var(--lime);font-size:11px;font-weight:950;letter-spacing:.08em}
.home-decision-context{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.home-decision-context span{font-size:11px;font-weight:800;padding:6px 8px;border-radius:999px;background:#0d1417;border:1px solid var(--line);color:var(--muted)}
@media(max-width:700px){.smart-priority{padding-left:42px}.priority-rank{left:10px}.smart-priority .btn{width:100%;margin-top:7px}}
'''
p.write_text(s,encoding='utf-8')

# ---------- service worker ----------
p=Path('service-worker.js')
s=p.read_text(encoding='utf-8').replace(OLD,NEW)
p.write_text(s,encoding='utf-8')

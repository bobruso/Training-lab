// Transparent coaching heuristics, not physiological measurements or medical scores.
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const numeric=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const median=xs=>{const a=xs.filter(numeric).map(Number).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
export function clockDistance(a,b){const minutes=x=>Number(x.split(':')[0])*60+Number(x.split(':')[1]);const d=Math.abs(minutes(a)-minutes(b));return Math.min(d,1440-d);}
export function uniqueNights(sleep){
 const days=new Map();
 for(const s of [...sleep].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))){
   const old=days.get(s.sleep_date);if(!old || (s.source==='manual'&&old.source!=='manual'))days.set(s.sleep_date,s);
 }
 return [...days.values()].sort((a,b)=>b.sleep_date.localeCompare(a.sleep_date));
}
export function readinessModel({sleep=[],checkins=[],activities=[],injuries=[],now=new Date()}={}){
 const parts=[{label:'Base orientativa',value:65}],missing=[];
 const add=(label,value)=>parts.push({label,value});
 const nights=uniqueNights(sleep).filter(s=>s.sleep_end?new Date(s.sleep_end)<=now:s.sleep_date<=dayKey(now));
 const s=nights.find(s=>{const end=new Date(s.sleep_end||s.sleep_date+'T13:00:00');return (now-end)/36e5<=36;});
 if(s){
   if(numeric(s.total_sleep_min)){const h=Number(s.total_sleep_min)/60;add('Duración del sueño',h>=7.5?10:h>=7?5:h<6?-18:-8);}else missing.push('duración');
   if(numeric(s.sleep_score))add('Sleep Score',s.sleep_score>=80?4:s.sleep_score<60?-6:0);
   const time=x=>new Date(x).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
   if(s.sleep_start&&s.sleep_end){const drift=Math.max(clockDistance(time(s.sleep_start),'05:00'),clockDistance(time(s.sleep_end),'13:00'));add('Regularidad 05:00–13:00 (±1 h)',drift<=60?4:drift>120?-6:0);}
   const prior=nights.filter(n=>n.sleep_date<s.sleep_date).slice(0,28);
   const hrvs=prior.map(n=>n.avg_hrv).filter(numeric),rhrs=prior.map(n=>n.resting_hr).filter(numeric);
   if(numeric(s.avg_hrv)&&hrvs.length>=7){const ratio=Number(s.avg_hrv)/median(hrvs);add('HRV vs mediana personal',ratio<.8?-8:ratio<=1.2?4:0);}else missing.push('baseline HRV (7 noches previas)');
   if(numeric(s.resting_hr)&&rhrs.length>=7){const delta=Number(s.resting_hr)-median(rhrs);add('FC reposo vs mediana personal',delta>=7?-7:delta>=4?-3:0);}else missing.push('baseline FC reposo');
 }else missing.push('sueño de las últimas 36 h');
 const c=checkins.find(c=>c.checkin_date===dayKey(now));
 if(c){if(numeric(c.energy))add('Energía',c.energy>=4?5:c.energy<=2?-8:0);if(numeric(c.soreness))add('Agujetas',c.soreness>=4?-8:0);if(numeric(c.stress))add('Estrés',c.stress>=4?-6:0);if(c.hydration_ok===false)add('Hidratación percibida',-3);}else missing.push('check-in de hoy');
 const recent=activities.filter(a=>{const age=(now-new Date(a.started_at||a.date+'T12:00:00'))/36e5;return age>=0&&age<48;});
 const load=recent.reduce((sum,a)=>sum+(Number(a.duration)||0)*(Number(a.rpe)||0),0);
 if(load>0)add('Carga de últimas 48 h (min × RPE)',load>900?-10:load>450?-6:-2);
 if(recent.some(a=>a.type==='football'))add('Fútbol reciente',-8);
 if(injuries.some(i=>i.status==='active'&&Number(i.pain_score)>=4))add('Molestia activa',-10);
 const score=clamp(parts.reduce((sum,p)=>sum+p.value,0),0,100);
 return {score,parts,missing,text:parts.map(p=>`${p.label} ${p.value>=0?'+':''}${p.value}`).join(' · ')+(missing.length?'. Faltan: '+missing.join(', '):'')+'. Estimación orientativa.'};
}
export const MUSCLES=['pecho','espalda','hombro','biceps','triceps','core','gluteo','cuadriceps','isquios','gemelos'];
export function recoveryModel({activities=[],sets=[],now=new Date()}={}){
 const r=Object.fromEntries(MUSCLES.map(m=>[m,100]));
 const legs=['gluteo','cuadriceps','isquios','gemelos'];
 const penalty=(muscles,time,amount,hours)=>{const age=(now-new Date(time))/36e5;if(age<0||!Number.isFinite(age)||age>=hours)return;for(const m of muscles)if(m in r)r[m]-=amount*(1-age/hours);};
 for(const a of activities){
   const effort=clamp(Number(a.rpe)||5,1,10),volume=clamp((Number(a.duration)||45)/60,.25,1.5);
   if(a.type==='football'||a.type==='run')penalty(legs,a.started_at||a.date+'T12:00:00',effort*volume*(a.type==='football'?4:2.5),a.type==='football'?72:48);
   if(a.type==='gym'&&!sets.some(s=>s.activity_id&&s.activity_id===a.id))penalty(MUSCLES,a.started_at||a.date+'T12:00:00',effort*volume*1.5,72);
 }
 for(const s of sets){const muscle=({hombros:'hombro',gluteos:'gluteo',gemelo:'gemelos'})[s.muscle_group]||s.muscle_group;const effort=clamp(Number(s.rpe)||(numeric(s.rir)?10-Number(s.rir):7),1,10);const reps=clamp((Number(s.reps)||8)/8,.5,2);penalty([muscle],s.performed_at,effort*reps*.6,72);}
 return Object.fromEntries(Object.entries(r).map(([m,value])=>[m,Math.round(clamp(value,0,100))]));
}
export function runningTarget(footballCount){return footballCount>=3?0:footballCount>=2?1:2;}

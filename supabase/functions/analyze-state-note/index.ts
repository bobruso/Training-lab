import {createClient} from 'npm:@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clamp=(v:any,min:number,max:number)=>Math.max(min,Math.min(max,Number(v)||0));
const clean=(v:any,max=500)=>String(v??'').trim().slice(0,max);
const fold=(v:any)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const AREAS=['cabeza','cuello','hombro','pecho','espalda','core','cadera','gluteo','ingle','aductor','cuadriceps','isquios','rodilla','gemelo','tobillo','pie','brazo','codo','muneca','mano','general'];
const schema={type:'object',additionalProperties:false,properties:{
 summary:{type:'string'},energy:{type:'integer',minimum:1,maximum:5},fatigue:{type:'integer',minimum:1,maximum:5},mood:{type:'integer',minimum:1,maximum:5},soreness:{type:'integer',minimum:1,maximum:5},
 body_areas:{type:'array',items:{type:'object',additionalProperties:false,properties:{area:{type:'string',enum:AREAS},side:{type:'string',enum:['izquierdo','derecho','ambos','centro','no_especificado']},severity:{type:'integer',minimum:1,maximum:5}},required:['area','side','severity']},maxItems:8},
 red_flags:{type:'array',items:{type:'string'},maxItems:5},advice:{type:'array',items:{type:'string'},maxItems:5},training_adjustment:{type:'string',enum:['normal','suave','recuperacion','descanso','valoracion_profesional']}
},required:['summary','energy','fatigue','mood','soreness','body_areas','red_flags','advice','training_adjustment']};

function localFallback(note:string){
 const n=fold(note);let fatigue=3,energy=3,mood=3,soreness=2;
 if(/agotad|reventad|muy cansad|sin energia/.test(n)){fatigue=5;energy=1}else if(/cansad|fatiga|pesad/.test(n)){fatigue=4;energy=2}else if(/fresco|con energia|muy bien/.test(n)){fatigue=2;energy=4}
 if(/dolor|molest|tirantez|cargad|agujeta/.test(n))soreness=4;if(/mucho dolor|dolor fuerte|no puedo apoyar|deformidad|hormigueo persistente/.test(n))soreness=5;
 if(/animado|buen humor|motivad/.test(n))mood=4;if(/estresad|mal dia|bajon/.test(n))mood=2;
 const body_areas:any[]=[];for(const area of AREAS)if(area!=='general'&&n.includes(area))body_areas.push({area,side:/izquierd/.test(n)?'izquierdo':/derech/.test(n)?'derecho':'no_especificado',severity:soreness});
 const red_flags=[];if(/no puedo apoyar|deformidad|hormigueo persistente|perdida de sensibilidad|dolor insoportable/.test(n))red_flags.push('La nota contiene una señal que merece valoración sanitaria.');
 const adjustment=red_flags.length?'valoracion_profesional':fatigue>=5||soreness>=5?'descanso':fatigue>=4||soreness>=4?'recuperacion':'normal';
 return{summary:clean(note,220),energy,fatigue,mood,soreness,body_areas,red_flags,advice:red_flags.length?['No fuerces la zona y busca valoración sanitaria si la señal continúa o empeora.']:['Ajusta la carga según sensaciones reales y evolución durante el día.'],training_adjustment:adjustment,analysis_source:'rules'};
}
function normalize(raw:any){return{
 summary:clean(raw?.summary,220)||'Estado registrado.',energy:Math.round(clamp(raw?.energy,1,5)),fatigue:Math.round(clamp(raw?.fatigue,1,5)),mood:Math.round(clamp(raw?.mood,1,5)),soreness:Math.round(clamp(raw?.soreness,1,5)),
 body_areas:Array.isArray(raw?.body_areas)?raw.body_areas.filter((x:any)=>AREAS.includes(String(x?.area))).slice(0,8).map((x:any)=>({area:String(x.area),side:['izquierdo','derecho','ambos','centro','no_especificado'].includes(String(x.side))?String(x.side):'no_especificado',severity:Math.round(clamp(x.severity,1,5))})):[],
 red_flags:Array.isArray(raw?.red_flags)?raw.red_flags.map((x:any)=>clean(x,180)).filter(Boolean).slice(0,5):[],advice:Array.isArray(raw?.advice)?raw.advice.map((x:any)=>clean(x,180)).filter(Boolean).slice(0,5):[],training_adjustment:['normal','suave','recuperacion','descanso','valoracion_profesional'].includes(String(raw?.training_adjustment))?String(raw.training_adjustment):'normal',analysis_source:'gemini'
}}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const authorization=req.headers.get('Authorization');if(!authorization)return json({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!anon)return json({error:'Supabase environment unavailable'},500);
 const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});const {data:{user},error:userError}=await client.auth.getUser();if(userError||!user)return json({error:'Sesión no válida'},401);
 let body:any={};try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}const note=clean(body?.note,1200);if(note.length<2)return json({error:'Escribe cómo te encuentras.'},400);
 let analysis:any=localFallback(note);const key=Deno.env.get('GEMINI_API_KEY');
 if(key){
  const model=Deno.env.get('GEMINI_MODEL')||'gemini-2.5-flash-lite';
  const prompt=`Analiza esta nota breve de bienestar de una persona que entrena fútbol, running, ciclismo y fuerza. No diagnostiques enfermedades ni lesiones. Convierte la nota en un resumen útil para ajustar entrenamiento y recuperación. Escalas: energy 1=muy baja,5=muy alta; fatigue 1=muy fresco,5=muy fatigado; mood 1=muy bajo,5=muy bueno; soreness 1=sin molestias,5=muy cargado/doloroso. Extrae solo zonas corporales realmente mencionadas. Si aparecen señales como incapacidad para apoyar, deformidad, traumatismo importante, pérdida de sensibilidad, debilidad marcada, hinchazón importante o empeoramiento rápido, añádelas a red_flags y recomienda valoración profesional. No inventes síntomas. Nota: ${note}`;
  try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.1,responseMimeType:'application/json',responseJsonSchema:schema}})});if(r.ok){const p=await r.json(),text=p?.candidates?.[0]?.content?.parts?.map((x:any)=>x?.text||'').join('').trim();if(text)analysis=normalize(JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/,'')))}}catch(e){console.error('state note gemini fallback',String(e))}
 }
 const today=new Date().toISOString().slice(0,10);const answers={state_analysis:analysis,source:'mi_estado'};const row={user_id:user.id,checkin_date:today,energy:analysis.energy,soreness:analysis.soreness,mood:analysis.mood,notes:note,answers};
 const {error}=await client.from('daily_checkins').upsert(row,{onConflict:'user_id,checkin_date'});if(error){console.error('state note save',error.message);return json({error:'No se pudo guardar tu estado.'},400)}
 await client.from('daily_status').upsert({user_id:user.id,day:today,fatigue:analysis.fatigue,notes:note,updated_at:new Date().toISOString()},{onConflict:'user_id,day'});
 return json({ok:true,analysis});
});

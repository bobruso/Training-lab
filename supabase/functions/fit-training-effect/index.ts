import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import FitParser from 'npm:fit-file-parser@5.0.2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const num=(v:any)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
function effect(...values:any[]){for(const value of values){let n=num(value);if(n==null)continue;if(n>10&&n<=100)n/=10;if(n>=0&&n<=5.9)return +n.toFixed(1)}return null}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const auth=req.headers.get('Authorization');if(!auth)return json({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!anon)return json({error:'Supabase environment unavailable'},500);
 const db=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user)return json({error:'Sesión no válida'},401);
 let body:any={};try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}const activityId=String(body?.activity_id||'').trim();if(!activityId)return json({error:'activity_id is required'},400);
 const {data:activity,error:activityError}=await db.from('activities').select('id,metrics').eq('id',activityId).eq('user_id',user.id).maybeSingle();if(activityError||!activity)return json({error:'Actividad no encontrada'},404);
 let fitId=activity.metrics?.fit_file_id||null;let fit:any=null;if(fitId){const r=await db.from('fit_files').select('id,storage_path').eq('id',fitId).eq('user_id',user.id).maybeSingle();fit=r.data}else{const r=await db.from('fit_files').select('id,storage_path').eq('activity_id',activityId).eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();fit=r.data;fitId=fit?.id||null}
 if(!fit?.storage_path)return json({ok:true,available:false,reason:'no_fit'});
 const dl=await db.storage.from('fit-files').download(fit.storage_path);if(dl.error||!dl.data)return json({error:'No se pudo leer el FIT'},422);const bytes=await dl.data.arrayBuffer();if(bytes.byteLength<12)return json({error:'FIT inválido'},422);
 const parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'km',elapsedRecordField:true,force:false}),parsed:any=await parser.parseAsync(bytes),session=Array.isArray(parsed.sessions)?parsed.sessions[0]||{}:{};
 const aerobic=effect(session.total_training_effect,session.aerobic_training_effect,session.total_aerobic_training_effect,session.training_effect,session.aerobic_effect),anaerobic=effect(session.total_anaerobic_training_effect,session.anaerobic_training_effect,session.anaerobic_effect);if(aerobic==null&&anaerobic==null)return json({ok:true,available:false,reason:'not_in_fit'});
 const {data:analysis}=await db.from('activity_analysis').select('summary').eq('activity_id',activityId).eq('user_id',user.id).maybeSingle(),summary={...(analysis?.summary||{}),aerobicTrainingEffect:aerobic,anaerobicTrainingEffect:anaerobic,trainingEffectSource:'fit_session'};
 const up=await db.from('activity_analysis').update({summary,updated_at:new Date().toISOString()}).eq('activity_id',activityId).eq('user_id',user.id);if(up.error)return json({error:'No se pudo guardar Training Effect'},400);
 await db.from('activities').update({metrics:{...(activity.metrics||{}),aerobicTrainingEffect:aerobic,anaerobicTrainingEffect:anaerobic,trainingEffectSource:'fit_session'}}).eq('id',activityId).eq('user_id',user.id);
 return json({ok:true,available:true,aerobicTrainingEffect:aerobic,anaerobicTrainingEffect:anaerobic,source:'fit_session'});
});

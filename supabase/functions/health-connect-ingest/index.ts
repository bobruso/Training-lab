import { createClient } from "@supabase/supabase-js";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  if(req.method!=="POST") return respond({error:"Method not allowed"},405);
  const auth=req.headers.get("Authorization");
  if(!auth) return respond({error:"Missing authorization"},401);
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const token=auth.replace(/^Bearer\s+/i,"");
  const {data:userData,error:userError}=await supabase.auth.getUser(token);
  if(userError||!userData.user) return respond({error:"Unauthorized"},401);
  const userId=userData.user.id;
  let body:any; try{body=await req.json()}catch{return respond({error:"Invalid JSON"},400)}
  if(!body || typeof body!=="object" || !Array.isArray(body.sleep) || !Array.isArray(body.activities))return respond({error:"sleep and activities arrays are required"},400);
  if(body.sleep.length>50 || body.activities.length>100)return respond({error:"Batch too large; send at most 50 sleeps and 100 activities"},400);
  const sleeps=body.sleep;
  const activities=body.activities;
  const failures:Array<{kind:string,index:number,code:string}>=[];
  let sleepCount=0,activityCount=0;
  for(const s of sleeps){
    if(!s?.sleep_date){failures.push({kind:"sleep",index:sleeps.indexOf(s),code:"invalid_date"});continue;}
    const row={user_id:userId,sleep_date:s.sleep_date,source:"health_connect",sleep_start:s.sleep_start||null,sleep_end:s.sleep_end||null,total_sleep_min:s.total_sleep_min??null,deep_sleep_min:s.deep_sleep_min??null,rem_sleep_min:s.rem_sleep_min??null,light_sleep_min:s.light_sleep_min??null,awake_min:s.awake_min??null,awake_count:s.awake_count??null,sleep_score:s.sleep_score??null,avg_hrv:s.avg_hrv??null,hrv_baseline_low:s.hrv_baseline_low??null,hrv_baseline_high:s.hrv_baseline_high??null,resting_hr:s.resting_hr??null,naps:Array.isArray(s.naps)?s.naps:[],metrics:{...(s.metrics||{}),external_id:s.external_id||null,source_app:s.source_app||null}};
    const {error}=await supabase.from("sleep_records").upsert(row,{onConflict:"user_id,sleep_date,source"});
    if(!error) sleepCount++; else failures.push({kind:"sleep",index:sleeps.indexOf(s),code:error.code||"write_failed"});
  }
  for(const a of activities){
    if(!a?.external_id||!a?.activity_date||!a?.activity_type){failures.push({kind:"activity",index:activities.indexOf(a),code:"missing_fields"});continue;}
    const row={user_id:userId,activity_date:a.activity_date,started_at:a.started_at||null,activity_type:a.activity_type,source:"health_connect",external_id:String(a.external_id),title:a.title||null,duration_min:a.duration_min??null,moving_time_min:a.moving_time_min??null,rpe:a.rpe??null,distance_km:a.distance_km??null,avg_hr:a.avg_hr??null,max_hr:a.max_hr??null,calories:a.calories??null,top_speed_kmh:a.top_speed_kmh??null,high_intensity_m:a.high_intensity_m??null,sprint_count:a.sprint_count??null,absolute_sprint_count:a.absolute_sprint_count??null,avg_pace_sec_km:a.avg_pace_sec_km??null,elevation_gain_m:a.elevation_gain_m??null,metrics:{...(a.metrics||{}),route_points:Array.isArray(a.route_points)?a.route_points.slice(0,2500):[],source_app:a.source_app||null}};
    const {error}=await supabase.from("activities").upsert(row,{onConflict:"user_id,source,external_id"});
    if(!error) activityCount++; else failures.push({kind:"activity",index:activities.indexOf(a),code:error.code||"write_failed"});
  }
  const {error:syncError}=await supabase.from("sync_sources").upsert({user_id:userId,source:"health_connect",status:failures.length?"error":"connected",...(!failures.length?{last_sync_at:new Date().toISOString()}:{}),details:{sleep:sleepCount,activities:activityCount,failures}},{onConflict:"user_id,source"});
  if(syncError)failures.push({kind:"sync",index:0,code:syncError.code||"write_failed"});
  return respond({ok:failures.length===0,sleep:sleepCount,activities:activityCount,failures,...(failures.length?{error:"Sincronización incompleta. Reintenta; los registros importados no se duplicarán."}:{})},failures.length?422:200);
});

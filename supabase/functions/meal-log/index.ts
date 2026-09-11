import {createClient} from 'npm:@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, DELETE, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const cleanText=(v:any,max=140)=>String(v??'').trim().slice(0,max);
const num=(v:any,max=500)=>Math.max(0,Math.min(max,Number(v)||0));

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!['POST','DELETE'].includes(req.method))return json({error:'Method not allowed'},405);
  const authorization=req.headers.get('Authorization');
  if(!authorization)return json({error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!anon)return json({error:'Supabase environment unavailable'},500);
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)return json({error:'Sesión no válida'},401);

  let body:any={};try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}
  if(req.method==='DELETE'){
    const id=cleanText(body?.id,80);if(!id)return json({error:'Missing id'},400);
    const {error}=await client.from('meal_logs').delete().eq('id',id).eq('user_id',user.id);
    if(error){console.error('meal delete',error.message);return json({error:'No se pudo eliminar el registro.'},400)}
    return json({ok:true});
  }

  const title=cleanText(body?.title,140),mealType=cleanText(body?.meal_type,30)||'comida';
  if(!title)return json({error:'Falta el nombre del plato.'},400);
  const protein=Math.round(num(body?.protein_g,220)),carbs=Math.round(num(body?.carbs_g,350)),fat=Math.round(num(body?.fat_g,220));
  const calories=Math.round(protein*4+carbs*4+fat*9);
  const source=['manual','ai_photo'].includes(String(body?.source))?String(body.source):'manual';
  const metadata=body?.metadata&&typeof body.metadata==='object'&&!Array.isArray(body.metadata)?body.metadata:{};
  const row={user_id:user.id,eaten_at:new Date().toISOString(),meal_type:mealType,title,protein_g:protein,carbs_g:carbs,fat_g:fat,calories,source,metadata};
  const {data,error}=await client.from('meal_logs').insert(row).select('id,eaten_at,meal_type,title,protein_g,carbs_g,fat_g,calories,source,metadata').single();
  if(error){console.error('meal insert',error.code,error.message);return json({error:'No se pudo guardar el plato.',code:error.code},400)}
  return json({ok:true,meal:data});
});

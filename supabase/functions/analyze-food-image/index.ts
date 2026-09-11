const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const PRESETS={
  yogur_cereales:{title:'Yogur + cereales + crema de cacahuete desgrasada + frutos rojos',protein:22,carbs:68,fat:10},
  batido_proteina:{title:'Batido de proteína (30 g) + plátano + crema de cacahuete',protein:36,carbs:42,fat:12},
  sandwich_atun_huevo:{title:'Sándwich de atún + huevo duro',protein:38,carbs:42,fat:11},
  ensalada_pasta_atun:{title:'Ensalada de pasta con atún',protein:38,carbs:80,fat:15},
  arroz_carne_huevo:{title:'Arroz blanco con carne y huevo',protein:42,carbs:85,fat:23},
  arroz_atun_huevo:{title:'Arroz blanco con atún y huevo',protein:38,carbs:85,fat:15},
  arroz_pescado_huevo:{title:'Arroz blanco con pescado y huevo',protein:42,carbs:85,fat:13},
  pasta_atun:{title:'Pasta con atún',protein:38,carbs:82,fat:10},
  carne_patatas:{title:'Carne con patatas',protein:40,carbs:60,fat:24},
  tortilla_patatas:{title:'Tortilla de patatas',protein:25,carbs:55,fat:30},
  huevos_rotos:{title:'Huevos rotos',protein:24,carbs:65,fat:32},
  sopa_fideos:{title:'Sopa con fideos',protein:15,carbs:55,fat:10},
  bocadillo:{title:'Bocadillo',protein:30,carbs:70,fat:18},
  tapas_bravas:{title:'Tapas variadas + bravas',protein:25,carbs:80,fat:35},
  pizza:{title:'Pizza',protein:35,carbs:105,fat:35},
  hamburguesa_patatas:{title:'Hamburguesa con patatas',protein:40,carbs:80,fat:38},
  nueces:{title:'Nueces (30 g)',protein:6,carbs:6,fat:18},
  gazpacho:{title:'Gazpacho (vaso grande)',protein:3,carbs:14,fat:8},
  queso:{title:'Queso (ración ~60 g)',protein:15,carbs:1,fat:18}
};
const presetIds=['none',...Object.keys(PRESETS)];
const schema={
  type:'object',additionalProperties:false,
  properties:{
    is_food:{type:'boolean'},
    dish_name:{type:'string'},
    preset_id:{type:'string',enum:presetIds},
    confidence:{type:'number',minimum:0,maximum:1},
    preset_confidence:{type:'number',minimum:0,maximum:1},
    portion:{type:'string',enum:['small','normal','large']},
    ingredients:{type:'array',items:{type:'string'},maxItems:10},
    protein_g:{type:'integer',minimum:0,maximum:220},
    carbs_g:{type:'integer',minimum:0,maximum:350},
    fat_g:{type:'integer',minimum:0,maximum:220},
    notes:{type:'string'}
  },
  required:['is_food','dish_name','preset_id','confidence','preset_confidence','portion','ingredients','protein_g','carbs_g','fat_g','notes']
};
const presetPrompt=Object.entries(PRESETS).map(([id,p])=>`- ${id}: ${p.title}`).join('\n');
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:cors})}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
function sanitize(raw){
  const result={
    is_food:raw?.is_food!==false,
    dish_name:String(raw?.dish_name||'Plato sin identificar').trim().slice(0,120),
    preset_id:presetIds.includes(String(raw?.preset_id))?String(raw.preset_id):'none',
    confidence:clamp(raw?.confidence,0,1),
    preset_confidence:clamp(raw?.preset_confidence,0,1),
    portion:['small','normal','large'].includes(raw?.portion)?raw.portion:'normal',
    ingredients:Array.isArray(raw?.ingredients)?raw.ingredients.map(x=>String(x||'').trim()).filter(Boolean).slice(0,10):[],
    protein_g:Math.round(clamp(raw?.protein_g,0,220)),
    carbs_g:Math.round(clamp(raw?.carbs_g,0,350)),
    fat_g:Math.round(clamp(raw?.fat_g,0,220)),
    notes:String(raw?.notes||'').trim().slice(0,280)
  };
  if(result.preset_id!=='none'&&result.preset_confidence>=.75){
    const preset=PRESETS[result.preset_id];
    result.dish_name=preset.title;result.protein_g=preset.protein;result.carbs_g=preset.carbs;result.fat_g=preset.fat;
    return{...result,macro_source:'preset',calories:Math.round(preset.protein*4+preset.carbs*4+preset.fat*9)};
  }
  return{...result,macro_source:'visual_estimate',calories:Math.round(result.protein_g*4+result.carbs_g*4+result.fat_g*9)};
}
function prompt(mealHint){return`Eres el analizador visual de comida de Training Lab, una app personal. Analiza UNA foto de comida.\n\nObjetivo: reconocer qué plato hay y estimar macronutrientes para una ración adulta normal. No finjas precisión: una foto no permite saber exactamente gramos, aceite, salsas o ingredientes ocultos. Haz una estimación práctica y prudente.\n\nSi la imagen no muestra claramente comida, pon is_food=false y macros a 0.\n\nPrimero intenta decidir si coincide de verdad con uno de estos platos habituales del usuario. Usa preset_id solo si la coincidencia visual es clara; si hay dudas usa none. preset_confidence mide solo la coincidencia con ese preset.\n${presetPrompt}\n\nPista horaria de tipo de comida: ${mealHint||'desconocida'}. No la uses para inventar ingredientes.\n\nPara platos desconocidos/restaurante estima proteína, carbohidratos y grasas para lo que se ve servido en el plato. Si la porción parece claramente pequeña o grande indícalo en portion. Los macros deben corresponder a la porción visible, no a una receta completa.\n\nDevuelve nombres e ingredientes en español. notes debe ser breve y mencionar la principal incertidumbre visual (por ejemplo aceite/salsa/ración) cuando sea relevante.`}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!req.headers.get('Authorization'))return json({error:'Unauthorized'},401);
  let body;try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}
  const mime=String(body?.mime_type||'').toLowerCase(),data=String(body?.image_base64||'').replace(/^data:[^;]+;base64,/,''),mealHint=String(body?.meal_hint||'');
  if(!['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'].includes(mime))return json({error:'Unsupported image type'},400);
  if(!data||data.length<100)return json({error:'Missing image'},400);
  if(data.length>5_500_000)return json({error:'Image too large'},413);
  const key=Deno.env.get('GEMINI_API_KEY');
  if(!key)return json({code:'gemini_not_configured',error:'GEMINI_API_KEY is not configured'},503);
  const model=Deno.env.get('GEMINI_MODEL')||'gemini-2.5-flash-lite';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let response;
  try{
    response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt(mealHint)},{inlineData:{mimeType:mime,data}}]}],
      generationConfig:{temperature:.15,responseMimeType:'application/json',responseSchema:schema}
    })});
  }catch{return json({error:'No se pudo contactar con Gemini.'},502)}
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){console.error('Gemini food analysis error',response.status,payload?.error?.message||'unknown');return json({error:'Gemini no pudo analizar la imagen.',provider_status:response.status},502)}
  const text=payload?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join('').trim();
  if(!text)return json({error:'Gemini no devolvió un análisis.'},502);
  let parsed;try{parsed=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```$/,''))}catch{return json({error:'Gemini devolvió una respuesta no válida.'},502)}
  return json({...sanitize(parsed),provider:'gemini',model});
});

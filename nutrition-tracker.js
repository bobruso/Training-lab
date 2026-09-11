export const NUTRITION_PRESETS={
  breakfast:[
    {id:'yogur_cereales',title:'Yogur + cereales + crema de cacahuete desgrasada + frutos rojos',protein:22,carbs:68,fat:10},
    {id:'batido_proteina',title:'Batido de proteína (30 g) + plátano + crema de cacahuete',protein:36,carbs:42,fat:12},
    {id:'sandwich_atun_huevo',title:'Sándwich de atún + huevo duro',protein:38,carbs:42,fat:11}
  ],
  comida:[
    {id:'ensalada_pasta_atun',title:'Ensalada de pasta con atún',protein:38,carbs:80,fat:15},
    {id:'arroz_carne_huevo',title:'Arroz blanco con carne y huevo',protein:42,carbs:85,fat:23},
    {id:'arroz_atun_huevo',title:'Arroz blanco con atún y huevo',protein:38,carbs:85,fat:15},
    {id:'arroz_pescado_huevo',title:'Arroz blanco con pescado y huevo',protein:42,carbs:85,fat:13},
    {id:'pasta_atun',title:'Pasta con atún',protein:38,carbs:82,fat:10},
    {id:'carne_patatas',title:'Carne con patatas',protein:40,carbs:60,fat:24},
    {id:'tortilla_patatas',title:'Tortilla de patatas',protein:25,carbs:55,fat:30},
    {id:'huevos_rotos',title:'Huevos rotos',protein:24,carbs:65,fat:32},
    {id:'sopa_fideos',title:'Sopa con fideos',protein:15,carbs:55,fat:10}
  ],
  cena:[
    {id:'ensalada_pasta_atun',title:'Ensalada de pasta con atún',protein:38,carbs:80,fat:15},
    {id:'arroz_carne_huevo',title:'Arroz blanco con carne y huevo',protein:42,carbs:85,fat:23},
    {id:'arroz_atun_huevo',title:'Arroz blanco con atún y huevo',protein:38,carbs:85,fat:15},
    {id:'arroz_pescado_huevo',title:'Arroz blanco con pescado y huevo',protein:42,carbs:85,fat:13},
    {id:'pasta_atun',title:'Pasta con atún',protein:38,carbs:82,fat:10},
    {id:'carne_patatas',title:'Carne con patatas',protein:40,carbs:60,fat:24},
    {id:'tortilla_patatas',title:'Tortilla de patatas',protein:25,carbs:55,fat:30},
    {id:'huevos_rotos',title:'Huevos rotos',protein:24,carbs:65,fat:32},
    {id:'sopa_fideos',title:'Sopa con fideos',protein:15,carbs:55,fat:10},
    {id:'bocadillo',title:'Bocadillo',protein:30,carbs:70,fat:18},
    {id:'tapas_bravas',title:'Tapas variadas + bravas',protein:25,carbs:80,fat:35},
    {id:'pizza',title:'Pizza',protein:35,carbs:105,fat:35},
    {id:'hamburguesa_patatas',title:'Hamburguesa con patatas',protein:40,carbs:80,fat:38}
  ],
  picoteo:[
    {id:'nueces',title:'Nueces (30 g)',protein:6,carbs:6,fat:18},
    {id:'gazpacho',title:'Gazpacho (vaso grande)',protein:3,carbs:14,fat:8},
    {id:'queso',title:'Queso (ración ~60 g)',protein:15,carbs:1,fat:18}
  ]
};

const CATEGORY_LABELS={breakfast:'Desayuno / recena',comida:'Comida',cena:'Cena',merienda:'Merienda',picoteo:'Picoteo'};
const DEFAULT_TARGETS={protein:130,carbs:330,fat:75};
const LOCAL_KEY='traininglab-nutrition-local-v1';
let entries=[],root=null,busy=false,breakfastMode=(new Date().getHours()<7?'recena':'desayuno'),openOther=null,estimatedDraft=null;

const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const round=v=>Math.max(0,Math.round(Number(v)||0));
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const kcalFor=m=>Math.round(Number(m.protein||0)*4+Number(m.carbs||0)*4+Number(m.fat||0)*9);
export function calculateNutritionTotals(items=[]){return (Array.isArray(items)?items:[]).reduce((a,x)=>({protein:a.protein+Number(x.protein_g??x.protein??0),carbs:a.carbs+Number(x.carbs_g??x.carbs??0),fat:a.fat+Number(x.fat_g??x.fat??0)}),{protein:0,carbs:0,fat:0})}
export function parseNutritionTargets(text='',fallback=DEFAULT_TARGETS){const s=String(text||''),p=s.match(/prote[ií]na\s+\d+(?:[.,]\d+)?\s*\/\s*(\d+(?:[.,]\d+)?)/i),c=s.match(/(?:HC|carbohidratos?)\s+\d+(?:[.,]\d+)?\s*\/\s*(\d+(?:[.,]\d+)?)/i),f=s.match(/grasas?\s+\d+(?:[.,]\d+)?\s*\/\s*(\d+(?:[.,]\d+)?)/i);return{protein:p?Number(p[1].replace(',','.')):fallback.protein,carbs:c?Number(c[1].replace(',','.')):fallback.carbs,fat:f?Number(f[1].replace(',','.')):fallback.fat}}

const DIRECT_MEALS=[
  [/pizza/,{protein:35,carbs:105,fat:35}],
  [/hamburgues/,/{protein:35,carbs:42,fat:25}],
  [/paella/,{protein:30,carbs:85,fat:20}],
  [/sushi/,{protein:30,carbs:90,fat:15}],
  [/kebab|durum/,{protein:35,carbs:65,fat:25}],
  [/ramen/,{protein:30,carbs:75,fat:20}],
  [/burrito/,{protein:35,carbs:75,fat:22}],
  [/tortilla.*patat|tortilla de patat/,{protein:25,carbs:55,fat:30}],
  [/huevos? rotos/,{protein:24,carbs:65,fat:32}]
];
const COMPONENTS=[
  [/arroz/,{protein:6,carbs:70,fat:1}],
  [/pasta|espagueti|macarron/,{protein:10,carbs:75,fat:2}],
  [/patat/,{protein:5,carbs:50,fat:8}],
  [/pan|bocadillo|sandwich|tostad/,{protein:8,carbs:55,fat:4}],
  [/fideo|noodle/,{protein:8,carbs:55,fat:2}],
  [/pollo|pavo/,{protein:32,carbs:0,fat:7}],
  [/carne|ternera|cerdo|filete/,{protein:30,carbs:0,fat:15}],
  [/atun/,{protein:25,carbs:0,fat:3}],
  [/salmon/,{protein:30,carbs:0,fat:18}],
  [/pescad|merluza|bacalao/,{protein:30,carbs:0,fat:8}],
  [/huevo/,{protein:12,carbs:1,fat:10}],
  [/queso/,{protein:15,carbs:1,fat:18}],
  [/lentej|garbanz|alubia|legumbre/,{protein:18,carbs:50,fat:4}],
  [/ensalada|verdura|hortaliza/,{protein:3,carbs:15,fat:5}],
  [/mayonesa|alioli|salsa cremosa/,{protein:0,carbs:5,fat:12}],
  [/frut|platano/,{protein:1,carbs:25,fat:0}],
  [/yogur|skyr/,{protein:12,carbs:10,fat:4}]
];
const GENERIC={breakfast:{protein:20,carbs:45,fat:15},merienda:{protein:18,carbs:40,fat:12},picoteo:{protein:8,carbs:15,fat:12},comida:{protein:30,carbs:65,fat:25},cena:{protein:30,carbs:65,fat:25}};
export function estimateOtherMeal(description,category='comida',portion='normal'){
  const text=normalize(description),factor=portion==='pequena'?.75:portion==='grande'?1.25:1;
  let result=null;
  for(const [pattern,macro] of DIRECT_MEALS){if(pattern.test(text)){result={...macro};break}}
  if(!result){let protein=0,carbs=0,fat=0,hits=0;for(const [pattern,macro] of COMPONENTS){if(pattern.test(text)){protein+=macro.protein;carbs+=macro.carbs;fat+=macro.fat;hits++}}
    if(/frit|rebozad|empanad/.test(text)){carbs+=10;fat+=12;hits++}
    if(/patat/.test(text)&&/frit|brava/.test(text))fat+=12;
    result=hits?{protein,carbs,fat}:{...(GENERIC[category]||GENERIC.comida)};
  }
  if(/hamburgues/.test(text)&&/patat/.test(text))result={protein:40,carbs:80,fat:38};
  if(/tapas|bravas/.test(text))result={protein:25,carbs:80,fat:35};
  return{protein:round(result.protein*factor),carbs:round(result.carbs*factor),fat:round(result.fat*factor),portion,fallback:!COMPONENTS.some(([p])=>p.test(text))&&!DIRECT_MEALS.some(([p])=>p.test(text))};
}

function ensureCss(){if(document.querySelector('link[data-nutrition-tracker-css]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='./nutrition-tracker.css?v=20260911food103';link.dataset.nutritionTrackerCss='1';document.head.append(link)}
function authState(){try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('sb-')||!key.endsWith('-auth-token'))continue;const parsed=JSON.parse(localStorage.getItem(key)||'null');if(parsed?.access_token)return parsed}}catch{}return null}
function userId(auth){if(auth?.user?.id)return auth.user.id;try{const payload=JSON.parse(atob(String(auth?.access_token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload?.sub||null}catch{return null}}
function dateKey(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function sameLocalDay(isoString){const d=new Date(isoString);return !Number.isNaN(d.getTime())&&dateKey(d)===dateKey()}
function loadLocal(){try{return(JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')||[]).filter(x=>sameLocalDay(x.eaten_at))}catch{return[]}}
function saveLocal(){try{const all=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')||[],other=all.filter(x=>!sameLocalDay(x.eaten_at));localStorage.setItem(LOCAL_KEY,JSON.stringify([...other,...entries.filter(x=>String(x.id||'').startsWith('local:'))]))}catch{}}
async function request(path,{method='GET',body=null,prefer=null}={}){const cfg=window.TrainingLab?.config,auth=authState(),uid=userId(auth);if(!cfg?.url||!cfg?.key||!auth?.access_token||!uid)throw new Error('AUTH');const headers={apikey:cfg.key,Authorization:`Bearer ${auth.access_token}`,Accept:'application/json'};if(body!==null)headers['Content-Type']='application/json';if(prefer)headers.Prefer=prefer;const runner=window.TrainingLab?.request||fetch;const res=await runner(`${cfg.url}/rest/v1/${path}`,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);if(res.status===204)return null;return res.json()}
async function refreshEntries(){const auth=authState(),uid=userId(auth);if(!uid){entries=loadLocal();render();return}try{const rows=await request(`meal_logs?select=id,eaten_at,meal_type,title,protein_g,carbs_g,fat_g&user_id=eq.${encodeURIComponent(uid)}&order=eaten_at.desc&limit=200`);entries=(Array.isArray(rows)?rows:[]).filter(x=>sameLocalDay(x.eaten_at));render()}catch{entries=(window.cloudMeals||[]).filter(x=>sameLocalDay(x.eaten_at));render()}}
function legacyTargets(){const text=document.getElementById('macroRemaining')?.textContent||'',parsed=parseNutritionTargets(text);const carbPill=document.getElementById('carbPill')?.textContent||'',m=carbPill.match(/(\d+)\s*g/i);if(!/HC\s+\d+.*\/\s*\d+/i.test(text)&&m)parsed.carbs=Number(m[1]);return parsed}
function categoryForPreset(category){if(category==='breakfast')return breakfastMode;return category}
function mealLabel(type){return type==='desayuno'?'Desayuno':type==='recena'?'Recena':type==='comida'?'Comida':type==='cena'?'Cena':type==='merienda'?'Merienda':type==='picoteo'?'Picoteo':type||'Comida'}
function presetsFor(category){return category==='merienda'?NUTRITION_PRESETS.breakfast:NUTRITION_PRESETS[category]||[]}
function ring(label,key,total,target){const pct=target>0?Math.min(100,total/target*100):0,over=Math.max(0,total-target);return`<div class="nutrition-ring-card"><div class="nutrition-ring" style="--pct:${pct.toFixed(1)}"><div><strong>${Math.round(total)}</strong><span>/ ${Math.round(target)} g</span></div></div><b>${label}</b><small>${over>0?`+${Math.round(over)} g sobre objetivo`:`Faltan ${Math.max(0,Math.round(target-total))} g`}</small></div>`}
function presetButton(p,category){return`<button class="nutrition-food-btn" type="button" data-add-preset="${esc(category)}" data-preset="${esc(p.id)}"><span>${esc(p.title)}</span><small>P ${p.protein} · HC ${p.carbs} · G ${p.fat} g · ${kcalFor(p)} kcal</small></button>`}
function otherForm(category){if(openOther!==category)return'';const e=estimatedDraft?.category===category?estimatedDraft:null;return`<div class="nutrition-other-form" data-other-form="${esc(category)}"><label>¿Qué has comido?</label><input type="text" data-other-description placeholder="Ej. arroz con pollo y huevo / menú de restaurante" value="${esc(e?.description||'')}"><div class="nutrition-other-row"><label>Ración<select data-other-portion><option value="pequena"${e?.portion==='pequena'?' selected':''}>Pequeña</option><option value="normal"${!e||e.portion==='normal'?' selected':''}>Normal adulta</option><option value="grande"${e?.portion==='grande'?' selected':''}>Grande</option></select></label><button class="btn alt" type="button" data-estimate-other="${esc(category)}">Estimar macros</button></div>${e?`<div class="nutrition-estimate"><p><strong>Estimación aproximada.</strong> Corrígela si conoces mejor la ración.</p><div class="nutrition-macro-edit"><label>Proteína<input data-edit-protein type="number" min="0" step="1" value="${e.protein}"> g</label><label>HC<input data-edit-carbs type="number" min="0" step="1" value="${e.carbs}"> g</label><label>Grasa<input data-edit-fat type="number" min="0" step="1" value="${e.fat}"> g</label></div><button class="btn" type="button" data-add-other="${esc(category)}">Añadir a hoy</button></div>`:''}</div>`}
function categorySection(category){const title=CATEGORY_LABELS[category],mode=category==='breakfast'?`<div class="nutrition-mode"><span>Registrar como</span><button type="button" class="${breakfastMode==='desayuno'?'on':''}" data-breakfast-mode="desayuno">Desayuno</button><button type="button" class="${breakfastMode==='recena'?'on':''}" data-breakfast-mode="recena">Recena</button></div>`:'';return`<section class="nutrition-meal-card"><div class="nutrition-meal-head"><div><span>¿Qué comiste?</span><h2>${esc(title)}</h2></div><button class="btn alt" type="button" data-toggle-other="${esc(category)}">+ Otros</button></div>${mode}<div class="nutrition-food-grid">${presetsFor(category).map(p=>presetButton(p,category)).join('')}</div>${otherForm(category)}</section>`}
function logRows(){if(!entries.length)return'<div class="nutrition-empty">Todavía no has registrado comida hoy.</div>';return entries.slice().sort((a,b)=>Date.parse(b.eaten_at)-Date.parse(a.eaten_at)).map(x=>`<div class="nutrition-log-row"><div><span>${esc(mealLabel(x.meal_type))}</span><strong>${esc(x.title||'Comida')}</strong><small>P ${round(x.protein_g)} · HC ${round(x.carbs_g)} · G ${round(x.fat_g)} g</small></div><div><b>${kcalFor({protein:x.protein_g,carbs:x.carbs_g,fat:x.fat_g})} kcal</b><button type="button" aria-label="Eliminar ${esc(x.title||'comida')}" data-delete-entry="${esc(x.id)}">×</button></div></div>`).join('')}
function render(){if(!root)return;const totals=calculateNutritionTotals(entries),targets=legacyTargets(),kcal=kcalFor(totals),auth=!!userId(authState());root.innerHTML=`<div class="nutrition-title"><div><span>Hoy</span><h1>¿Qué comiste hoy?</h1><p>Raciones adultas normales como referencia. Un toque suma el plato al día.</p></div><div class="nutrition-sync ${auth?'is-cloud':'is-local'}">${auth?'Sincronizado':'Modo local'}</div></div><section class="nutrition-progress"><div class="nutrition-rings">${ring('Proteína','protein',totals.protein,targets.protein)}${ring('Carbohidratos','carbs',totals.carbs,targets.carbs)}${ring('Grasas','fat',totals.fat,targets.fat)}</div><div class="nutrition-energy"><span>Total aproximado</span><strong>${kcal} kcal</strong><small>Objetivo actual: P ${targets.protein} · HC ${targets.carbs} · G ${targets.fat} g</small></div></section><div class="nutrition-categories">${['breakfast','comida','merienda','cena','picoteo'].map(categorySection).join('')}</div><section class="nutrition-today-log"><div class="nutrition-log-head"><div><span>Registro</span><h2>Lo ingerido hoy</h2></div><b>${entries.length} ${entries.length===1?'registro':'registros'}</b></div>${logRows()}</section><p class="nutrition-disclaimer">Los macros son estimaciones prácticas, no mediciones de laboratorio. En “Otros” puedes corregir la estimación antes de guardarla.</p>`}
async function addMeal({mealType,title,protein,carbs,fat}){if(busy)return;busy=true;try{const auth=authState(),uid=userId(auth),payload={meal_type:mealType,title,protein_g:round(protein),carbs_g:round(carbs),fat_g:round(fat),eaten_at:new Date().toISOString()};if(uid){const rows=await request('meal_logs?select=id,eaten_at,meal_type,title,protein_g,carbs_g,fat_g',{method:'POST',body:{user_id:uid,...payload},prefer:'return=representation'}),row=Array.isArray(rows)?rows[0]:null;if(!row)throw new Error('No se ha guardado');entries.unshift(row);window.cloudMeals=window.cloudMeals||[];window.cloudMeals.unshift(row)}else{const row={id:`local:${Date.now()}:${Math.random().toString(36).slice(2)}`,...payload};entries.unshift(row);saveLocal()}estimatedDraft=null;openOther=null;render();toast(`Añadido: ${title}`)}catch(e){toast('No se pudo guardar. Revisa la conexión.',true)}finally{busy=false}}
async function deleteMeal(id){if(busy)return;busy=true;try{if(String(id).startsWith('local:')){entries=entries.filter(x=>String(x.id)!==String(id));saveLocal()}else{const auth=authState(),uid=userId(auth);if(!uid)throw new Error('AUTH');await request(`meal_logs?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(uid)}`,{method:'DELETE'});entries=entries.filter(x=>String(x.id)!==String(id));if(Array.isArray(window.cloudMeals))window.cloudMeals=window.cloudMeals.filter(x=>String(x.id)!==String(id))}render();toast('Registro eliminado')}catch{toast('No se pudo eliminar.',true)}finally{busy=false}}
function toast(message,error=false){let el=document.querySelector('.nutrition-toast');if(!el){el=document.createElement('div');el.className='nutrition-toast';document.body.append(el)}el.textContent=message;el.classList.toggle('is-error',error);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}
function onClick(event){const presetBtn=event.target.closest('[data-add-preset]');if(presetBtn){const category=presetBtn.dataset.addPreset,p=presetsFor(category).find(x=>x.id===presetBtn.dataset.preset);if(p)addMeal({mealType:categoryForPreset(category),title:p.title,protein:p.protein,carbs:p.carbs,fat:p.fat});return}const toggle=event.target.closest('[data-toggle-other]');if(toggle){openOther=openOther===toggle.dataset.toggleOther?null:toggle.dataset.toggleOther;estimatedDraft=null;render();return}const mode=event.target.closest('[data-breakfast-mode]');if(mode){breakfastMode=mode.dataset.breakfastMode;render();return}const estimate=event.target.closest('[data-estimate-other]');if(estimate){const category=estimate.dataset.estimateOther,form=root.querySelector(`[data-other-form="${category}"]`),description=form?.querySelector('[data-other-description]')?.value.trim()||'',portion=form?.querySelector('[data-other-portion]')?.value||'normal';if(!description){toast('Escribe el plato para estimarlo.',true);return}estimatedDraft={category,description,...estimateOtherMeal(description,category,portion)};render();return}const addOther=event.target.closest('[data-add-other]');if(addOther&&estimatedDraft){const category=addOther.dataset.addOther,form=root.querySelector(`[data-other-form="${category}"]`),protein=Number(form?.querySelector('[data-edit-protein]')?.value),carbs=Number(form?.querySelector('[data-edit-carbs]')?.value),fat=Number(form?.querySelector('[data-edit-fat]')?.value);addMeal({mealType:categoryForPreset(category),title:estimatedDraft.description,protein,carbs,fat});return}const del=event.target.closest('[data-delete-entry]');if(del)deleteMeal(del.dataset.deleteEntry)}
function install(){const page=document.getElementById('comer');if(!page||page.querySelector('.nutrition-tracker-root'))return;ensureCss();root=document.createElement('div');root.className='nutrition-tracker-root';page.prepend(root);root.addEventListener('click',onClick);render();setTimeout(refreshEntries,150);setTimeout(refreshEntries,1600);const legacy=document.getElementById('macroRemaining');if(legacy)new MutationObserver(()=>render()).observe(legacy,{subtree:true,childList:true,characterData:true});document.addEventListener('click',e=>{if(e.target.closest('button[data-page="comer"]'))setTimeout(refreshEntries,80)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEntries()})}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else queueMicrotask(install)}

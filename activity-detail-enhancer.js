import {buildActivityInsights,canonicalActivityType} from './activity-insights.js?v=20260911insights86';
import {renderHeartRateChart,renderSpeedOrPaceChart,renderZoneBars,renderFirstLastComparison,formatPace} from './activity-charts.js?v=20260911insights86';

const SUPABASE_URL='https://nnpvklaxhomarxszlclt.supabase.co';
const SUPABASE_KEY='sb_publishable_4zzi_K9QK12-qtD4RG2Gxg_TyXX1TBd';
const AUTH_KEY='sb-nnpvklaxhomarxszlclt-auth-token';
const CSS_URL='./activity-insights.css?v=20260911insights86';
const contextCache=new Map();
let generation=0,installed=false;

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

function ensureCss(){
  if(document.querySelector('link[data-activity-insights-css]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=CSS_URL;link.dataset.activityInsightsCss='1';
  document.head.append(link);
}

function authState(){
  try{
    const direct=localStorage.getItem(AUTH_KEY);
    if(direct){
      const parsed=JSON.parse(direct);
      if(parsed?.access_token)return parsed;
    }
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith('sb-')||!key.endsWith('-auth-token'))continue;
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      if(parsed?.access_token&&String(key).includes('nnpvklaxhomarxszlclt'))return parsed;
    }
  }catch{}
  return null;
}

async function rest(table,params,token){
  const url=new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for(const [key,value] of Object.entries(params||{}))if(value!==null&&value!==undefined)url.searchParams.set(key,String(value));
  const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,'Accept':'application/json'},cache:'no-store'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

function rowTimestamp(row={}){
  const raw=row.started_at||row.activity_date;
  if(!raw)return 0;
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(String(raw))?`${raw}T12:00:00`:raw)||0;
}

function analysisMap(rows=[]){
  const map=new Map();
  for(const row of rows)if(row?.activity_id)map.set(String(row.activity_id),row);
  return map;
}

async function fetchActivityContext(activityId){
  const auth=authState();if(!auth?.access_token)return null;
  const cacheKey=`${auth.user?.id||'user'}:${activityId}`;
  if(contextCache.has(cacheKey))return contextCache.get(cacheKey);
  const promise=(async()=>{
    const currentRows=await rest('activities',{
      select:'id,activity_date,activity_type,source,title,started_at,duration_min,moving_time_min,rpe,distance_km,avg_hr,max_hr,calories,top_speed_kmh,high_intensity_m,sprint_count,absolute_sprint_count,avg_pace_sec_km,metrics',
      id:`eq.${activityId}`,limit:20
    },auth.access_token);
    const activity=(Array.isArray(currentRows)?currentRows:[]).find(row=>String(row.id)===String(activityId))||currentRows?.[0];
    if(!activity)return null;
    const type=canonicalActivityType(activity.activity_type);
    const historyRows=await rest('activities',{
      select:'id,activity_date,activity_type,source,title,started_at,duration_min,moving_time_min,rpe,distance_km,avg_hr,max_hr,calories,top_speed_kmh,high_intensity_m,sprint_count,absolute_sprint_count,avg_pace_sec_km,metrics',
      activity_type:`eq.${activity.activity_type}`,order:'activity_date.desc,started_at.desc',limit:12
    },auth.access_token);
    const currentTs=rowTimestamp(activity);
    const prior=(Array.isArray(historyRows)?historyRows:[])
      .filter(row=>String(row.id)!==String(activityId)&&canonicalActivityType(row.activity_type)===type)
      .filter(row=>!currentTs||!rowTimestamp(row)||rowTimestamp(row)<currentTs)
      .sort((a,b)=>rowTimestamp(b)-rowTimestamp(a))
      .slice(0,5);
    const ids=[activity,...prior].map(row=>row.id).filter(Boolean);
    let analyses=[];
    if(ids.length)analyses=await rest('activity_analysis',{select:'*',activity_id:`in.(${ids.join(',')})`},auth.access_token);
    const byId=analysisMap(Array.isArray(analyses)?analyses:[]);
    return {
      activity,
      analysis:byId.get(String(activity.id))||null,
      history:prior.map(row=>({activity:row,analysis:byId.get(String(row.id))||null}))
    };
  })().catch(error=>{contextCache.delete(cacheKey);throw error});
  contextCache.set(cacheKey,promise);
  return promise;
}

function formatMetric(comparison,value){
  if(!finite(value))return '—';
  if(comparison.unit==='pace')return formatPace(value);
  if(comparison.unit==='ppm')return `${Math.round(value)} ppm`;
  if(comparison.unit==='km')return `${Number(value).toFixed(comparison.decimals??2)} km`;
  if(comparison.unit==='km/h')return `${Number(value).toFixed(comparison.decimals??1)} km/h`;
  if(comparison.unit==='m/min')return `${Number(value).toFixed(comparison.decimals??1)} m/min`;
  if(comparison.unit==='m')return `${Math.round(value)} m`;
  if(comparison.unit==='ratio')return `${(Number(value)*100).toFixed(0)} %`;
  if(comparison.unit==='kg·rep')return `${Math.round(value)} kg·rep`;
  if(comparison.unit==='min')return `${Math.round(value)} min`;
  return String(Math.round(Number(value)*10)/10);
}

function deltaText(comparison){
  if(comparison.unit==='ppm'&&finite(comparison.deltaAbs))return `${comparison.deltaAbs>=0?'+':''}${Math.round(comparison.deltaAbs)} ppm`;
  if(comparison.unit==='count'&&finite(comparison.deltaAbs))return `${comparison.deltaAbs>=0?'+':''}${Math.round(comparison.deltaAbs)}`;
  if(comparison.unit==='ratio'&&finite(comparison.deltaAbs))return `${comparison.deltaAbs>=0?'+':''}${(comparison.deltaAbs*100).toFixed(0)} pp`;
  if(finite(comparison.deltaPct))return `${comparison.deltaPct>=0?'+':''}${comparison.deltaPct.toFixed(0)} %`;
  return '—';
}

function renderComparisons(insights){
  if(!insights.historyCount)return `<section class="activity-analysis-card card"><div class="activity-analysis-kicker">Comparado contigo</div><h3>Construyendo referencia</h3><p class="muted">Aún necesitamos más sesiones de ${esc(insights.sport==='football'?'fútbol':insights.sport==='run'?'carrera':'este tipo')} para construir una referencia personal.</p></section>`;
  if(!insights.comparisons.length)return '';
  return `<section class="activity-analysis-card card"><div class="activity-analysis-kicker">Comparado contigo</div><div class="activity-section-title"><h3>Esta sesión vs ${esc(insights.referenceLabel)}</h3><span>${insights.historyCount} ${insights.historyCount===1?'sesión':'sesiones'}</span></div><div class="activity-comparison-list">${insights.comparisons.map(c=>`<div class="activity-comparison-row ${c.meaningful?'is-meaningful':''}"><div><strong>${esc(c.label)}</strong><span>${esc(insights.referenceLabel)}</span></div><div class="activity-comparison-values"><strong>${esc(formatMetric(c,c.current))}</strong><span>${esc(formatMetric(c,c.baseline))}</span></div><b class="activity-comparison-delta ${c.interpretation==='positive'?'is-positive':c.interpretation==='attention'?'is-attention':''}">${esc(deltaText(c))}</b></div>`).join('')}</div><p class="activity-analysis-note">“Más” no significa automáticamente “mejor”: Training Lab interpreta cada métrica según su contexto.</p></section>`;
}

function structuredValue(value){
  if(value===null||value===undefined)return null;
  if(typeof value==='number')return Number.isInteger(value)?String(value):Number(value).toFixed(1);
  if(typeof value==='string'||typeof value==='boolean')return String(value);
  return null;
}

function renderStructuredReport(sections){
  if(!sections||typeof sections!=='object'||Array.isArray(sections))return '';
  const cards=[];
  for(const [key,value] of Object.entries(sections)){
    if(!value||typeof value!=='object'||Array.isArray(value))continue;
    const metrics=Object.entries(value).map(([k,v])=>[k,structuredValue(v)]).filter(([,v])=>v!==null).slice(0,6);
    if(!metrics.length)continue;
    cards.push(`<details class="activity-structured-card card"><summary>${esc(key.replace(/[_-]+/g,' '))}</summary><div class="activity-structured-grid">${metrics.map(([k,v])=>`<div><span>${esc(k.replace(/[_-]+/g,' '))}</span><strong>${esc(v)}</strong></div>`).join('')}</div></details>`);
  }
  return cards.length?`<section class="activity-structured-report"><div class="activity-analysis-kicker">Análisis específico</div>${cards.join('')}</section>`:'';
}

function chartSection(title,subtitle,key){
  return `<section class="activity-analysis-card card activity-chart-card" data-analysis-block="${key}"><div class="activity-section-title"><div><div class="activity-analysis-kicker">${esc(title)}</div><h3>${esc(subtitle)}</h3></div></div><div class="activity-chart-host" data-chart="${key}"></div></section>`;
}

function zonesSection(){
  return `<section class="activity-analysis-card card" data-analysis-block="zones"><div class="activity-analysis-kicker">Zonas</div><div class="activity-zones-grid"><div data-zone-block="hr"><h3>Frecuencia cardíaca</h3><div data-zones="hr"></div></div><div data-zone-block="speed"><h3>Velocidad</h3><div data-zones="speed"></div></div></div></section>`;
}

function firstLastSection(){
  return `<section class="activity-analysis-card card" data-analysis-block="first-last"><div class="activity-analysis-kicker">Distribución del esfuerzo</div><h3>Primeros vs últimos 10 minutos</h3><div data-first-last></div></section>`;
}

function removeEmptyCard(card){if(card)card.remove()}

function hydrateVisuals(root,context,insights){
  const analysis=context.analysis||{},track=Array.isArray(analysis.track_points)?analysis.track_points:[],summary=analysis.summary||{};
  const hrHost=root.querySelector('[data-chart="hr"]');
  if(!renderHeartRateChart(hrHost,track))removeEmptyCard(hrHost?.closest('.activity-chart-card'));
  const effortHost=root.querySelector('[data-chart="effort"]');
  if(!renderSpeedOrPaceChart(effortHost,track,{sport:insights.sport}))removeEmptyCard(effortHost?.closest('.activity-chart-card'));

  const zonesCard=root.querySelector('[data-analysis-block="zones"]');
  const hrBlock=root.querySelector('[data-zone-block="hr"]'),speedBlock=root.querySelector('[data-zone-block="speed"]');
  const hasHr=renderZoneBars(root.querySelector('[data-zones="hr"]'),analysis.hr_zones,{kind:'hr'});
  const hasSpeed=renderZoneBars(root.querySelector('[data-zones="speed"]'),analysis.speed_zones,{kind:'speed',totalDistanceKm:summary.distanceKm});
  if(!hasHr)hrBlock?.remove();if(!hasSpeed)speedBlock?.remove();if(!hasHr&&!hasSpeed)zonesCard?.remove();

  const firstCard=root.querySelector('[data-analysis-block="first-last"]');
  if(!renderFirstLastComparison(root.querySelector('[data-first-last]'),summary.first10MinM,summary.last10MinM))firstCard?.remove();
}

function renderEnhancement(detail,context){
  detail.querySelector('.activity-insights-root')?.remove();
  const insights=buildActivityInsights(context),analysis=context.analysis||{},summary=analysis.summary||{},type=insights.sport;
  const root=document.createElement('div');root.className='activity-insights-root';root.dataset.insightsState='ready';
  const effortTitle=type==='run'?'Ritmo':'Velocidad';
  const effortSubtitle=type==='run'?'Cómo evolucionó tu ritmo':'Cómo evolucionó tu velocidad';
  const observations=insights.observations?.length?`<div class="activity-observations">${insights.observations.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:'';
  const zoneReference=summary.hrZoneReference==='estimated'?'<p class="activity-analysis-note">Zonas FC estimadas. Configura tu FC máxima para mejorar esta lectura.</p>':summary.hrZoneReference==='profile'?'<p class="activity-analysis-note">Zonas FC basadas en tu FC máxima configurada.</p>':'';
  root.innerHTML=`<section class="activity-insight-hero card tone-${esc(insights.tone)}"><div class="activity-analysis-kicker">Training Lab</div><h2>${esc(insights.headline)}</h2><p>${esc(insights.summary)}</p>${observations}</section>${chartSection('Frecuencia cardíaca','Evolución durante la actividad','hr')}${chartSection(effortTitle,effortSubtitle,'effort')}${zonesSection()}${zoneReference}${type==='football'?firstLastSection():''}${renderComparisons(insights)}${renderStructuredReport(analysis?.report?.sections)}`;
  const before=detail.querySelector('.activity-report');
  if(before)detail.insertBefore(root,before);else detail.append(root);
  hydrateVisuals(root,context,insights);
}

async function enhanceActivityDetail(activityId,requestGeneration){
  ensureCss();
  const detail=document.getElementById('activityDetailView');if(!detail)return;
  let root=detail.querySelector('.activity-insights-root');
  if(!root){
    root=document.createElement('div');root.className='activity-insights-root';root.dataset.insightsState='loading';
    root.innerHTML='<section class="activity-analysis-card card"><div class="activity-analysis-kicker">Training Lab</div><p class="muted">Preparando comparación personal…</p></section>';
    const before=detail.querySelector('.activity-report');if(before)detail.insertBefore(root,before);else detail.append(root);
  }
  try{
    const context=await fetchActivityContext(activityId);
    if(requestGeneration!==generation||!context||document.getElementById('activityDetailView')?.hidden)return;
    renderEnhancement(detail,context);
  }catch(error){
    if(requestGeneration!==generation)return;
    root=detail.querySelector('.activity-insights-root');
    if(root){root.dataset.insightsState='unavailable';root.innerHTML='<section class="activity-analysis-card card"><div class="activity-analysis-kicker">Training Lab</div><p class="muted">El análisis comparativo no está disponible ahora. La ficha básica de la actividad sigue siendo válida.</p></section>';}
    console.warn('Training Lab activity insights unavailable',error);
  }
}

function install(){
  if(installed)return;
  if(typeof window.openActivityDetail!=='function'){setTimeout(install,0);return}
  installed=true;ensureCss();
  const originalOpen=window.openActivityDetail;
  const originalClose=window.closeActivityDetail;
  window.openActivityDetail=function(activityId){
    const result=originalOpen.apply(this,arguments);
    const requestGeneration=++generation;
    queueMicrotask(()=>enhanceActivityDetail(activityId,requestGeneration));
    return result;
  };
  if(typeof originalClose==='function')window.closeActivityDetail=function(){
    generation++;
    return originalClose.apply(this,arguments);
  };
}

if(typeof window!=='undefined'&&typeof document!=='undefined')setTimeout(install,0);

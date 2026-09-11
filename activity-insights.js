const TYPE_ALIASES={running:'run',bike:'cycling',biking:'cycling',cycle:'cycling',strength:'gym',walking:'walk'};

export const INSIGHT_THRESHOLDS=Object.freeze({
  distancePct:8,
  pacePct:3,
  avgHrBpm:4,
  avgHrStrongBpm:7,
  metersPerMinPct:5,
  highIntensityPct:10,
  zone45Points:.08,
  sprintsAbs:2,
  avgSpeedPct:5,
  durationPct:10,
  strengthVolumePct:10
});

const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const firstFinite=(...values)=>{for(const value of values)if(finite(value))return Number(value);return null};
const mean=values=>{const a=values.filter(finite).map(Number);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null};
const median=values=>{const a=values.filter(finite).map(Number).sort((a,b)=>a-b);if(!a.length)return null;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};

export function canonicalActivityType(type){
  const key=String(type||'other').toLowerCase();
  return TYPE_ALIASES[key]||key;
}

function timestampOf(activity={}){
  const raw=activity.started_at||activity.startedAt||activity.activity_date||activity.date;
  if(!raw)return 0;
  const text=/^\d{4}-\d{2}-\d{2}$/.test(String(raw))?`${raw}T12:00:00`:String(raw);
  return Date.parse(text)||0;
}

export function activityMetricSnapshot(activity={},analysis={}){
  const summary=analysis?.summary||{};
  const metrics=activity?.metrics||{};
  const durationMin=firstFinite(activity.duration,activity.duration_min,summary.durationSec!=null?Number(summary.durationSec)/60:null);
  const movingMin=firstFinite(activity.moving,activity.moving_time_min,summary.movingTimeSec!=null?Number(summary.movingTimeSec)/60:null);
  const distanceKm=firstFinite(activity.distance,activity.distance_km,summary.distanceKm);
  const avgPaceSecKm=firstFinite(activity.pace,activity.avg_pace_sec_km,summary.avgPaceSecKm,
    distanceKm&&movingMin?movingMin*60/distanceKm:null);
  const avgSpeedKmh=firstFinite(metrics.avg_speed_kmh,activity.avg_speed_kmh,summary.avgSpeedKmh,
    distanceKm&&movingMin?distanceKm/(movingMin/60):null);
  return {
    type:canonicalActivityType(activity.type||activity.activity_type||summary.activityType),
    timestamp:timestampOf(activity),
    durationMin,
    movingMin,
    distanceKm,
    avgHr:firstFinite(activity.hr,activity.avg_hr,summary.avgHr),
    maxHr:firstFinite(activity.hrmax,activity.max_hr,summary.maxHr),
    calories:firstFinite(activity.kcal,activity.calories,summary.calories),
    avgPaceSecKm,
    avgSpeedKmh,
    elevationGainM:firstFinite(metrics.elevation_gain_m,activity.elevation_gain_m,summary.elevationGainM),
    robustTopKmh:firstFinite(summary.robustTopKmh,activity.topSpeed,activity.top_speed_kmh),
    sprintCount:firstFinite(summary.sprintCount,activity.sprints,activity.sprint_count),
    absoluteSprintCount:firstFinite(summary.absoluteSprintCount,activity.absSprints,activity.absolute_sprint_count),
    highIntensityM:firstFinite(summary.highIntensityM,activity.highIntensity,activity.high_intensity_m),
    highIntensityShare:firstFinite(summary.highIntensityShare),
    metersPerMovingMin:firstFinite(summary.metersPerMovingMin),
    accelerations:firstFinite(summary.accelerations),
    decelerations:firstFinite(summary.decelerations),
    first10MinM:firstFinite(summary.first10MinM),
    last10MinM:firstFinite(summary.last10MinM),
    hrZone45Share:firstFinite(summary.hrZone45Share),
    strengthSetCount:firstFinite(summary.strengthSetCount),
    totalReps:firstFinite(summary.totalReps),
    totalVolumeKg:firstFinite(summary.totalVolumeKg)
  };
}

const METRIC_DEFS={
  distanceKm:{label:'Distancia',unit:'km',decimals:2,thresholdPct:INSIGHT_THRESHOLDS.distancePct,meaning:'neutral'},
  durationMin:{label:'Duración',unit:'min',decimals:0,thresholdPct:INSIGHT_THRESHOLDS.durationPct,meaning:'neutral'},
  avgPaceSecKm:{label:'Ritmo medio',unit:'pace',decimals:0,thresholdPct:INSIGHT_THRESHOLDS.pacePct,meaning:'lower'},
  avgSpeedKmh:{label:'Velocidad media',unit:'km/h',decimals:1,thresholdPct:INSIGHT_THRESHOLDS.avgSpeedPct,meaning:'higher'},
  avgHr:{label:'FC media',unit:'ppm',decimals:0,thresholdAbs:INSIGHT_THRESHOLDS.avgHrBpm,meaning:'context'},
  robustTopKmh:{label:'Pico robusto',unit:'km/h',decimals:1,thresholdPct:5,meaning:'neutral'},
  metersPerMovingMin:{label:'Metros/min',unit:'m/min',decimals:1,thresholdPct:INSIGHT_THRESHOLDS.metersPerMinPct,meaning:'neutral'},
  highIntensityM:{label:'Alta intensidad',unit:'m',decimals:0,thresholdPct:INSIGHT_THRESHOLDS.highIntensityPct,meaning:'neutral'},
  hrZone45Share:{label:'Tiempo en Z4–Z5',unit:'ratio',decimals:0,thresholdAbs:INSIGHT_THRESHOLDS.zone45Points,meaning:'context'},
  absoluteSprintCount:{label:'Sprints >18',unit:'count',decimals:0,thresholdAbs:INSIGHT_THRESHOLDS.sprintsAbs,meaning:'neutral'},
  elevationGainM:{label:'Desnivel +',unit:'m',decimals:0,thresholdPct:15,meaning:'neutral'},
  totalVolumeKg:{label:'Volumen',unit:'kg·rep',decimals:0,thresholdPct:INSIGHT_THRESHOLDS.strengthVolumePct,meaning:'neutral'},
  strengthSetCount:{label:'Series',unit:'count',decimals:0,thresholdPct:10,meaning:'neutral'},
  totalReps:{label:'Repeticiones',unit:'count',decimals:0,thresholdPct:10,meaning:'neutral'}
};

const SPORT_METRICS={
  football:['distanceKm','metersPerMovingMin','highIntensityM','hrZone45Share','absoluteSprintCount','avgHr'],
  run:['avgPaceSecKm','avgHr','distanceKm','elevationGainM','durationMin'],
  cycling:['distanceKm','avgSpeedKmh','avgHr','elevationGainM','durationMin'],
  gym:['totalVolumeKg','strengthSetCount','totalReps','durationMin'],
  other:['distanceKm','durationMin','avgHr']
};

function compareMetric(key,current,historySnapshots){
  const def=METRIC_DEFS[key];if(!def||!finite(current[key]))return null;
  const values=historySnapshots.map(x=>x[key]).filter(finite).map(Number);
  if(!values.length)return null;
  const baseline=mean(values),med=median(values);
  if(!finite(baseline))return null;
  const value=Number(current[key]),deltaAbs=value-baseline,deltaPct=baseline!==0?deltaAbs/Math.abs(baseline)*100:null;
  const meaningful=def.thresholdAbs!=null?Math.abs(deltaAbs)>=def.thresholdAbs:
    (finite(deltaPct)&&Math.abs(deltaPct)>=Number(def.thresholdPct||0));
  const direction=deltaAbs>0?'up':deltaAbs<0?'down':'same';
  let interpretation='neutral';
  if(meaningful&&def.meaning==='higher')interpretation=direction==='up'?'positive':'attention';
  if(meaningful&&def.meaning==='lower')interpretation=direction==='down'?'positive':'attention';
  if(meaningful&&def.meaning==='context')interpretation='attention';
  return {key,label:def.label,unit:def.unit,decimals:def.decimals,current:value,baseline,median:med,deltaAbs,deltaPct,direction,meaningful,interpretation,sampleCount:values.length};
}

const cmpBy=(comparisons,key)=>comparisons.find(x=>x.key===key)||null;
const pctDelta=c=>finite(c?.deltaPct)?Number(c.deltaPct):0;
const absDelta=c=>finite(c?.deltaAbs)?Number(c.deltaAbs):0;

function footballHeadline(current,comparisons){
  const work=cmpBy(comparisons,'metersPerMovingMin'),hi=cmpBy(comparisons,'highIntensityM'),distance=cmpBy(comparisons,'distanceKm'),sprints=cmpBy(comparisons,'absoluteSprintCount'),hr=cmpBy(comparisons,'avgHr');
  if(pctDelta(work)>=INSIGHT_THRESHOLDS.metersPerMinPct&&pctDelta(hi)>=INSIGHT_THRESHOLDS.highIntensityPct)
    return {headline:'Partido más intenso de lo habitual',tone:'positive',summary:'Produjiste más metros por minuto y más distancia de alta intensidad que tu referencia reciente.'};
  if(pctDelta(distance)>=10&&pctDelta(work)<=-INSIGHT_THRESHOLDS.metersPerMinPct)
    return {headline:'Más volumen, a menor ritmo de trabajo',tone:'neutral',summary:'Recorriste más distancia, pero con menos metros por minuto que tu referencia reciente.'};
  const zone=cmpBy(comparisons,'hrZone45Share');
  if(absDelta(zone)>=INSIGHT_THRESHOLDS.zone45Points&&zone?.direction==='up')
    return {headline:'Mayor exigencia cardiovascular',tone:'attention',summary:`Pasaste ${(Math.abs(absDelta(zone))*100).toFixed(0)} puntos porcentuales más de tiempo en Z4–Z5 que tu referencia reciente.`};
  if(absDelta(sprints)>=INSIGHT_THRESHOLDS.sprintsAbs&&sprints?.direction==='up')
    return {headline:'Más acciones rápidas que de costumbre',tone:'positive',summary:`Registraste ${Math.round(absDelta(sprints))} esfuerzos >18 km/h más que tu referencia reciente.`};
  if(absDelta(hr)>=INSIGHT_THRESHOLDS.avgHrStrongBpm&&hr?.direction==='up')
    return {headline:'Mayor exigencia cardiovascular',tone:'attention',summary:`La FC media estuvo ${Math.round(Math.abs(absDelta(hr)))} ppm por encima de tu referencia reciente.`};
  if(finite(current.first10MinM)&&finite(current.last10MinM)&&current.first10MinM>0){
    const change=(current.last10MinM-current.first10MinM)/current.first10MinM*100;
    if(change<=-8)return {headline:'El ritmo cayó en el tramo final',tone:'attention',summary:`En los últimos 10 minutos recorriste ${Math.abs(change).toFixed(0)} % menos distancia que en los primeros 10.`};
    if(change>=8)return {headline:'Terminaste manteniendo un ritmo alto',tone:'positive',summary:`En los últimos 10 minutos recorriste ${change.toFixed(0)} % más distancia que en los primeros 10.`};
  }
  return {headline:'Partido dentro de tu rango habitual',tone:'neutral',summary:'Las métricas principales están cerca de tu referencia reciente.'};
}

function runHeadline(comparisons){
  const pace=cmpBy(comparisons,'avgPaceSecKm'),hr=cmpBy(comparisons,'avgHr'),distance=cmpBy(comparisons,'distanceKm');
  const paceImprovement=-pctDelta(pace),hrDelta=absDelta(hr);
  if(paceImprovement>=INSIGHT_THRESHOLDS.pacePct&&Math.abs(hrDelta)<=3)
    return {headline:'Mismo pulso, mejor ritmo',tone:'positive',summary:'Corriste más rápido con una frecuencia cardíaca media prácticamente igual a tu referencia reciente.'};
  if(paceImprovement>=INSIGHT_THRESHOLDS.pacePct&&hrDelta>=INSIGHT_THRESHOLDS.avgHrBpm)
    return {headline:'Más rápido, con mayor coste cardíaco',tone:'neutral',summary:'El ritmo mejoró, aunque la frecuencia cardíaca media también fue más alta.'};
  if(hrDelta>=INSIGHT_THRESHOLDS.avgHrStrongBpm&&paceImprovement<INSIGHT_THRESHOLDS.pacePct)
    return {headline:'Pulso más alto de lo habitual',tone:'attention',summary:'La frecuencia cardíaca media subió sin una mejora clara del ritmo.'};
  if(pctDelta(distance)>=10)
    return {headline:'Más volumen que en tus últimas salidas',tone:'neutral',summary:'La distancia de esta carrera fue claramente superior a tu referencia reciente.'};
  return {headline:'Rodaje dentro de tu rango habitual',tone:'neutral',summary:'Ritmo, volumen y respuesta cardíaca están cerca de tu referencia reciente.'};
}

function cyclingHeadline(comparisons){
  const speed=cmpBy(comparisons,'avgSpeedKmh'),hr=cmpBy(comparisons,'avgHr'),distance=cmpBy(comparisons,'distanceKm');
  if(pctDelta(speed)>=INSIGHT_THRESHOLDS.avgSpeedPct&&Math.abs(absDelta(hr))<=3)
    return {headline:'Más velocidad con pulso similar',tone:'positive',summary:'La velocidad media subió con una frecuencia cardíaca media parecida a tu referencia reciente.'};
  if(pctDelta(distance)>=10)
    return {headline:'Más volumen que en tus últimas salidas',tone:'neutral',summary:'La distancia aumentó respecto a tu referencia reciente.'};
  if(absDelta(hr)>=INSIGHT_THRESHOLDS.avgHrStrongBpm&&pctDelta(speed)<3)
    return {headline:'Mayor coste cardíaco',tone:'attention',summary:'La frecuencia cardíaca media fue más alta sin un aumento equivalente de velocidad.'};
  return {headline:'Salida dentro de tu rango habitual',tone:'neutral',summary:'Las métricas disponibles están cerca de tu referencia reciente.'};
}

function gymHeadline(comparisons){
  const volume=cmpBy(comparisons,'totalVolumeKg'),sets=cmpBy(comparisons,'strengthSetCount');
  if(pctDelta(volume)>=INSIGHT_THRESHOLDS.strengthVolumePct)
    return {headline:'Más volumen registrado',tone:'neutral',summary:'El volumen externo registrado fue superior al de tus sesiones recientes. Más volumen no implica automáticamente mejor sesión.'};
  if(pctDelta(sets)>=10)
    return {headline:'Más series registradas',tone:'neutral',summary:'Registraste más series que en tu referencia reciente.'};
  return {headline:'Sesión de fuerza dentro de tu rango reciente',tone:'neutral',summary:'El volumen registrado está cerca de tus sesiones comparables.'};
}

function observationsFor(current){
  const out=[];
  if(current.type==='football'&&finite(current.first10MinM)&&finite(current.last10MinM)&&current.first10MinM>0){
    const delta=(current.last10MinM-current.first10MinM)/current.first10MinM*100;
    if(delta<=-8)out.push(`La producción de distancia fue ${Math.abs(delta).toFixed(0)} % menor en los últimos 10 minutos que en los primeros. Esto describe el partido; no demuestra por sí solo falta de resistencia.`);
    else if(delta>=8)out.push(`La producción de distancia fue ${delta.toFixed(0)} % mayor en los últimos 10 minutos que en los primeros.`);
    else out.push('La producción de distancia fue parecida entre los primeros y los últimos 10 minutos.');
  }
  if(current.type==='football'&&finite(current.sprintCount)&&finite(current.absoluteSprintCount))
    out.push(`${Math.round(current.sprintCount)} esfuerzos de sprint detectados por el modelo relativo; ${Math.round(current.absoluteSprintCount)} superaron 18 km/h.`);
  return out;
}

export function buildActivityInsights({activity={},analysis={},history=[]}={}){
  const current=activityMetricSnapshot(activity,analysis);
  const currentId=String(activity.id||analysis?.activity_id||'');
  const currentTs=current.timestamp;
  const comparable=(Array.isArray(history)?history:[])
    .map(item=>item?.activity?item:{activity:item,analysis:item?.analysis||{}})
    .filter(item=>{
      const snap=activityMetricSnapshot(item.activity,item.analysis);
      if(snap.type!==current.type)return false;
      const id=String(item.activity?.id||item.analysis?.activity_id||'');
      if(currentId&&id===currentId)return false;
      return !currentTs||!snap.timestamp||snap.timestamp<currentTs;
    })
    .sort((a,b)=>activityMetricSnapshot(b.activity,b.analysis).timestamp-activityMetricSnapshot(a.activity,a.analysis).timestamp)
    .slice(0,5);
  const historySnapshots=comparable.map(item=>activityMetricSnapshot(item.activity,item.analysis));
  const keys=SPORT_METRICS[current.type]||SPORT_METRICS.other;
  const allComparisons=keys.map(key=>compareMetric(key,current,historySnapshots)).filter(Boolean);
  const n=historySnapshots.length;
  const referenceLabel=n===1?'sesión anterior':n>1?`media últimas ${n}`:'sin referencia';
  if(!n)return {
    sport:current.type,current,referenceLabel,historyCount:0,comparisons:[],
    headline:'Construyendo tu referencia personal',tone:'neutral',
    summary:'Necesitamos más sesiones del mismo tipo para comparar esta actividad contigo mismo.',
    observations:observationsFor(current)
  };
  const headline=current.type==='football'?footballHeadline(current,allComparisons):
    current.type==='run'?runHeadline(allComparisons):
    current.type==='cycling'?cyclingHeadline(allComparisons):
    current.type==='gym'?gymHeadline(allComparisons):
    {headline:'Actividad comparada con tu histórico',tone:'neutral',summary:'Estas cifras se comparan únicamente con actividades del mismo tipo.'};
  return {sport:current.type,current,referenceLabel,historyCount:n,comparisons:allComparisons.slice(0,5),...headline,observations:observationsFor(current)};
}

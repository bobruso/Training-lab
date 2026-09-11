const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function svgEl(name,attrs={}){
  const el=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
  return el;
}

function normalizedTimeSeries(points,valueFn){
  const raw=(Array.isArray(points)?points:[]).map(p=>({t:Number(p?.t),value:valueFn(p)})).filter(p=>Number.isFinite(p.t)&&finite(p.value));
  if(raw.length<2)return [];
  raw.sort((a,b)=>a.t-b.t);
  const t0=raw[0].t,span=Math.max(0,raw.at(-1).t-t0),scale=span>100000?1000:1;
  const out=raw.map(p=>({tSec:(p.t-t0)/scale,value:Number(p.value)}));
  const step=Math.max(1,Math.ceil(out.length/280));
  return out.filter((_,i)=>i%step===0||i===out.length-1);
}

export function heartRateSeries(trackPoints){
  return normalizedTimeSeries(trackPoints,p=>{
    const hr=Number(p?.hr);
    return hr>=35&&hr<=240?hr:null;
  });
}

export function speedSeries(trackPoints){
  return normalizedTimeSeries(trackPoints,p=>{
    const speed=Number(p?.speed_kmh);
    return speed>=0&&speed<=80?speed:null;
  });
}

export function paceSeries(trackPoints){
  return normalizedTimeSeries(trackPoints,p=>{
    const speed=Number(p?.speed_kmh);
    if(!(speed>=2&&speed<=35))return null;
    const pace=3600/speed;
    return pace>=120&&pace<=1200?pace:null;
  });
}

function formatClock(sec){
  const n=Math.max(0,Math.round(Number(sec)||0)),m=Math.floor(n/60),s=n%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
export function formatPace(sec){
  if(!finite(sec))return '—';
  const n=Math.max(0,Math.round(Number(sec))),m=Math.floor(n/60),s=n%60;
  return `${m}:${String(s).padStart(2,'0')}/km`;
}

function defaultFormatter(value,unit){
  if(unit==='ppm')return `${Math.round(value)} ppm`;
  if(unit==='km/h')return `${Number(value).toFixed(1)} km/h`;
  if(unit==='pace')return formatPace(value);
  return Number(value).toFixed(1);
}

export function renderLineChart(container,series,{label='Serie',unit='',invert=false,formatter=null}={}){
  if(!container)return false;
  const data=(Array.isArray(series)?series:[]).filter(p=>finite(p?.tSec)&&finite(p?.value));
  if(data.length<2){container.hidden=true;container.replaceChildren();return false}
  container.hidden=false;
  const width=Math.max(300,Math.round(container.clientWidth||container.getBoundingClientRect?.().width||720)),height=220;
  const pad={l:42,r:12,t:16,b:28},values=data.map(p=>Number(p.value)),times=data.map(p=>Number(p.tSec));
  let min=Math.min(...values),max=Math.max(...values);
  if(min===max){min-=1;max+=1}
  const margin=(max-min)*.08;min-=margin;max+=margin;
  const tMin=Math.min(...times),tMax=Math.max(...times),tSpan=Math.max(1,tMax-tMin),ySpan=Math.max(.0001,max-min);
  const x=t=>pad.l+(Number(t)-tMin)/tSpan*(width-pad.l-pad.r);
  const y=v=>{
    const ratio=(Number(v)-min)/ySpan;
    return pad.t+(invert?ratio:1-ratio)*(height-pad.t-pad.b);
  };
  const svg=svgEl('svg',{class:'activity-line-chart',viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':label});
  for(let i=0;i<4;i++){
    const yy=pad.t+i*(height-pad.t-pad.b)/3;
    svg.append(svgEl('line',{class:'activity-chart-grid',x1:pad.l,y1:yy,x2:width-pad.r,y2:yy}));
  }
  const path=data.map((p,i)=>`${i?'L':'M'}${x(p.tSec).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  svg.append(svgEl('path',{class:'activity-chart-line',d:path}));
  const fmt=formatter||((v)=>defaultFormatter(v,unit));
  const topLabel=svgEl('text',{class:'activity-chart-label',x:4,y:pad.t+4});
  topLabel.textContent=fmt(invert?min:max);
  const bottomLabel=svgEl('text',{class:'activity-chart-label',x:4,y:height-pad.b});
  bottomLabel.textContent=fmt(invert?max:min);
  const startLabel=svgEl('text',{class:'activity-chart-time',x:pad.l,y:height-7});
  startLabel.textContent='0:00';
  const endLabel=svgEl('text',{class:'activity-chart-time',x:width-pad.r,y:height-7,'text-anchor':'end'});
  endLabel.textContent=formatClock(tMax-tMin);
  svg.append(topLabel,bottomLabel,startLabel,endLabel);
  container.replaceChildren(svg);
  return true;
}

export function renderHeartRateChart(container,trackPoints){
  return renderLineChart(container,heartRateSeries(trackPoints),{label:'Frecuencia cardíaca durante la actividad',unit:'ppm'});
}

export function renderSpeedOrPaceChart(container,trackPoints,{sport='other'}={}){
  if(sport==='run')return renderLineChart(container,paceSeries(trackPoints),{label:'Ritmo durante la carrera',unit:'pace',invert:true,formatter:formatPace});
  return renderLineChart(container,speedSeries(trackPoints),{label:'Velocidad durante la actividad',unit:'km/h'});
}

export function renderZoneBars(container,zones,{kind='hr',totalDistanceKm=null}={}){
  if(!container)return false;
  const items=(Array.isArray(zones)?zones:[]).map((z,index)=>{
    const seconds=Number(z?.seconds);
    return {
      label:kind==='hr'?`Z${z?.zone??index+1}`:String(z?.name||`Zona ${index+1}`),
      seconds:Number.isFinite(seconds)&&seconds>=0?seconds:0,
      min:kind==='hr'?Number(z?.min_bpm):Number(z?.min),
      max:kind==='hr'?Number(z?.max_bpm):Number(z?.max),
      distanceM:Number(z?.distance_m)
    };
  });
  const total=items.reduce((s,z)=>s+z.seconds,0);
  if(!items.length||total<=0){container.hidden=true;container.replaceChildren();return false}
  container.hidden=false;
  const frag=document.createDocumentFragment();
  for(const item of items){
    const pct=item.seconds/total*100,row=document.createElement('div');row.className='activity-zone-row';
    const range=finite(item.min)&&finite(item.max)?(kind==='hr'?`${Math.round(item.min)}–${Math.round(item.max)} ppm`:`${Number(item.min).toFixed(1)}–${Number(item.max).toFixed(1)} km/h`):'';
    const dist=kind==='speed'&&finite(item.distanceM)&&finite(totalDistanceKm)?` · ${Math.round(item.distanceM)} m`:'';
    row.innerHTML=`<div class="activity-zone-copy"><strong>${escapeText(item.label)}</strong><span>${escapeText(range)}</span></div><div class="activity-zone-track"><i style="width:${clamp(pct,0,100).toFixed(1)}%"></i></div><div class="activity-zone-value"><strong>${pct.toFixed(0)}%</strong><span>${formatDuration(item.seconds)}${dist}</span></div>`;
    frag.append(row);
  }
  container.replaceChildren(frag);
  return true;
}

function formatDuration(seconds){
  const n=Math.max(0,Math.round(Number(seconds)||0)),m=Math.floor(n/60),s=n%60;
  return m?`${m}m ${String(s).padStart(2,'0')}s`:`${s}s`;
}
function escapeText(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function renderFirstLastComparison(container,firstM,lastM){
  if(!container||!finite(firstM)||!finite(lastM)||Number(firstM)<=0)return false;
  const first=Number(firstM),last=Number(lastM),max=Math.max(first,last,1),delta=(last-first)/first*100;
  let text='Mantuviste un ritmo de trabajo parecido hasta el final.';
  if(delta<=-8)text='Tu producción de distancia fue menor en los últimos 10 minutos.';
  else if(delta>=8)text='Terminaste produciendo más distancia por unidad de tiempo.';
  container.hidden=false;
  container.innerHTML=`<div class="activity-effort-row"><span>Primeros 10 min</span><i><em style="width:${(first/max*100).toFixed(1)}%"></em></i><strong>${Math.round(first)} m</strong></div><div class="activity-effort-row"><span>Últimos 10 min</span><i><em style="width:${(last/max*100).toFixed(1)}%"></em></i><strong>${Math.round(last)} m</strong></div><p class="muted small">${escapeText(text)} <span>${delta>=0?'+':''}${delta.toFixed(0)} %</span></p>`;
  return true;
}

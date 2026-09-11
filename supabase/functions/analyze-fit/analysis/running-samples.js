export const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export const mean=values=>{const a=values.map(Number).filter(Number.isFinite);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null};
export const median=values=>{const a=values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};
export const percentile=(values,q)=>{const a=values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;const p=Math.max(0,Math.min(1,Number(q)||0))*(a.length-1),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;return a[lo]*(1-f)+a[hi]*f};
export const round=(v,d=1)=>finite(v)?+Number(v).toFixed(d):null;
function haversineM(a,b){if(!finite(a?.lat)||!finite(a?.lon)||!finite(b?.lat)||!finite(b?.lon))return 0;const R=6371000,r=Math.PI/180,dLat=(Number(b.lat)-Number(a.lat))*r,dLon=(Number(b.lon)-Number(a.lon))*r;const x=Math.sin(dLat/2)**2+Math.cos(Number(a.lat)*r)*Math.cos(Number(b.lat)*r)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))}
export const isMoving=s=>finite(s?.speedKmh)?Number(s.speedKmh)>=1.5:(Number(s?.dIncM)||0)>0&&Number(s?.dt)>0&&(Number(s.dIncM)/Number(s.dt))>=.4;
export const paceText=sec=>{if(!finite(sec)||Number(sec)<=0)return'—';const s=Math.round(Number(sec)),m=Math.floor(s/60);return`${m}:${String(s%60).padStart(2,'0')} min/km`};

export function normalizeRunningSamples(points=[]){
  const raw=(Array.isArray(points)?points:[]).map(p=>({
    t:Number(p?.t),
    speedKmh:finite(p?.speed)?Number(p.speed):finite(p?.speedKmh)?Number(p.speedKmh):finite(p?.speed_kmh)?Number(p.speed_kmh):null,
    distanceKm:finite(p?.distanceKm)?Number(p.distanceKm):finite(p?.distance_km)?Number(p.distance_km):null,
    hr:finite(p?.hr)?Number(p.hr):null,
    lat:finite(p?.lat)?Number(p.lat):null,
    lon:finite(p?.lon)?Number(p.lon):null,
    altitudeM:finite(p?.altitudeM)?Number(p.altitudeM):finite(p?.altitudeKm)?Number(p.altitudeKm)*1000:finite(p?.altitude_m)?Number(p.altitude_m):null,
    cadenceSpm:finite(p?.cadenceSpm)?Number(p.cadenceSpm):finite(p?.cadence)?Number(p.cadence):finite(p?.cadence_spm)?Number(p.cadence_spm):null,
    strideLengthM:finite(p?.strideLengthM)?Number(p.strideLengthM):finite(p?.stride_length_m)?Number(p.stride_length_m):null
  })).filter(p=>Number.isFinite(p.t)).sort((a,b)=>a.t-b.t);
  if(!raw.length)return[];
  const t0=raw[0].t,out=[];let cumulativeM=0;
  for(let i=0;i<raw.length;i++){
    const p=raw[i],prev=i?raw[i-1]:null,dt=prev?(p.t-prev.t)/1000:0,validDt=dt>0&&dt<=15?dt:0;
    let speed=Number.isFinite(p.speedKmh)?p.speedKmh:null;
    if(speed!==null&&(speed<0||speed>30))speed=null;
    let cadence=Number.isFinite(p.cadenceSpm)?p.cadenceSpm:null;
    if(cadence!==null&&(cadence<40||cadence>260))cadence=null;
    let stride=Number.isFinite(p.strideLengthM)?p.strideLengthM:null;
    if(stride!==null&&(stride<.2||stride>3))stride=null;
    let dIncM=0;
    if(prev&&validDt){
      if(finite(prev.distanceKm)&&finite(p.distanceKm)&&p.distanceKm>=prev.distanceKm)dIncM=(p.distanceKm-prev.distanceKm)*1000;
      else dIncM=haversineM(prev,p);
      if(!Number.isFinite(dIncM)||dIncM<0||dIncM/validDt>30/3.6)dIncM=0;
    }
    cumulativeM+=dIncM;
    let elevDeltaM=0;
    if(prev&&finite(prev.altitudeM)&&finite(p.altitudeM)){
      const delta=Number(p.altitudeM)-Number(prev.altitudeM);
      if(Math.abs(delta)>=.8&&Math.abs(delta)<=30)elevDeltaM=delta;
    }
    out.push({tMs:p.t,tSec:(p.t-t0)/1000,dt:validDt,speedKmh:speed,dIncM,cumulativeM,hr:p.hr,lat:p.lat,lon:p.lon,altitudeM:p.altitudeM,cadenceSpm:cadence,strideLengthM:stride,elevDeltaM});
  }
  return out;
}

export function newBucket(startM){return{startM,endM:startM,distanceM:0,elapsedSec:0,movingSec:0,hrWeighted:0,hrTime:0,cadenceWeighted:0,cadenceTime:0,strideWeighted:0,strideTime:0,elevationGainM:0,elevationLossM:0}}
export function addPiece(bucket,sample,distanceM,fraction){
  const dt=(Number(sample.dt)||0)*fraction;
  bucket.distanceM+=distanceM;bucket.endM+=distanceM;bucket.elapsedSec+=dt;
  if(isMoving(sample))bucket.movingSec+=dt;
  if(finite(sample.hr)){bucket.hrWeighted+=Number(sample.hr)*dt;bucket.hrTime+=dt}
  if(finite(sample.cadenceSpm)){bucket.cadenceWeighted+=Number(sample.cadenceSpm)*dt;bucket.cadenceTime+=dt}
  if(finite(sample.strideLengthM)){bucket.strideWeighted+=Number(sample.strideLengthM)*dt;bucket.strideTime+=dt}
  const elev=(Number(sample.elevDeltaM)||0)*fraction;if(elev>0)bucket.elevationGainM+=elev;else bucket.elevationLossM+=Math.abs(elev);
}
function finishBucket(bucket,index,complete){
  const km=bucket.distanceM/1000,moving=bucket.movingSec||bucket.elapsedSec,pace=km>0&&moving>0?moving/km:null,elapsedPace=km>0&&bucket.elapsedSec>0?bucket.elapsedSec/km:null;
  return{index,complete,distanceM:round(bucket.distanceM,1),distanceKm:round(km,3),elapsedSec:round(bucket.elapsedSec,1),movingSec:round(bucket.movingSec,1),paceSecKm:round(pace,1),elapsedPaceSecKm:round(elapsedPace,1),avgHr:bucket.hrTime?Math.round(bucket.hrWeighted/bucket.hrTime):null,avgCadenceSpm:bucket.cadenceTime?round(bucket.cadenceWeighted/bucket.cadenceTime,1):null,avgStrideLengthM:bucket.strideTime?round(bucket.strideWeighted/bucket.strideTime,2):null,elevationGainM:round(bucket.elevationGainM,1),elevationLossM:round(bucket.elevationLossM,1)};
}

export function buildKilometerSplits(samples=[]){
  const s=Array.isArray(samples)?samples:[];if(s.length<2)return{splits:[],fastest:null,slowest:null,fullCount:0,partial:null};
  const splits=[];let bucket=newBucket(0),index=1;
  for(let i=1;i<s.length;i++){
    const sample=s[i],dm=Number(sample.dIncM)||0;if(dm<=0)continue;
    let remaining=dm;
    while(remaining>1e-9){
      const need=1000-bucket.distanceM,piece=Math.min(remaining,need),fraction=piece/dm;
      addPiece(bucket,sample,piece,fraction);remaining-=piece;
      if(bucket.distanceM>=999.999){splits.push(finishBucket(bucket,index,true));index++;bucket=newBucket((index-1)*1000)}
    }
  }
  if(bucket.distanceM>=50)splits.push(finishBucket(bucket,index,false));
  const full=splits.filter(x=>x.complete&&finite(x.paceSecKm));
  const fastest=full.length?full.reduce((a,b)=>Number(b.paceSecKm)<Number(a.paceSecKm)?b:a):null;
  const slowest=full.length?full.reduce((a,b)=>Number(b.paceSecKm)>Number(a.paceSecKm)?b:a):null;
  return{splits,fastest,slowest,fullCount:full.length,partial:splits.find(x=>!x.complete)||null};
}

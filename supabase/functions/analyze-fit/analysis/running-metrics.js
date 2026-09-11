import {addPiece,finite,isMoving,mean,median,newBucket,percentile,round} from './running-samples.js';

export function assessPaceRegularity(splits=[]){
  const paces=(Array.isArray(splits)?splits:[]).filter(x=>x?.complete&&finite(x.paceSecKm)).map(x=>Number(x.paceSecKm));
  if(paces.length<3)return{available:false,label:'Datos insuficientes',level:'insufficient',fullSplits:paces.length,cvPct:null,medianPaceSecKm:median(paces),robustSpreadSec:null};
  const med=median(paces),abs=paces.map(x=>Math.abs(x-med)),mad=median(abs)||0,limit=Math.max(15,mad*3),filtered=paces.filter(x=>Math.abs(x-med)<=limit);
  const use=filtered.length>=Math.max(3,Math.ceil(paces.length*.6))?filtered:paces,m=mean(use),sd=Math.sqrt(use.reduce((s,v)=>s+(v-m)**2,0)/use.length),cv=m?sd/m*100:null,spread=(percentile(use,.9)??0)-(percentile(use,.1)??0);
  let label='Muy variable',level='very_variable';if(cv<=2){label='Muy estable';level='very_stable'}else if(cv<=4){label='Bastante estable';level='stable'}else if(cv<=7){label='Variable';level='variable'}
  return{available:true,label,level,fullSplits:paces.length,usedSplits:use.length,cvPct:round(cv,2),medianPaceSecKm:round(med,1),robustSpreadSec:round(spread,1)};
}

function aggregateDistanceRange(samples,startM,endM){
  const out=newBucket(startM);out.endM=startM;
  for(let i=1;i<samples.length;i++){
    const s=samples[i],segEnd=Number(s.cumulativeM)||0,dm=Number(s.dIncM)||0,segStart=segEnd-dm;if(dm<=0||segEnd<=startM||segStart>=endM)continue;
    const overlapStart=Math.max(startM,segStart),overlapEnd=Math.min(endM,segEnd),piece=Math.max(0,overlapEnd-overlapStart);if(!piece)continue;addPiece(out,s,piece,piece/dm);
  }
  const km=out.distanceM/1000,moving=out.movingSec||out.elapsedSec;
  return{distanceM:round(out.distanceM,1),elapsedSec:round(out.elapsedSec,1),movingSec:round(out.movingSec,1),paceSecKm:km>0&&moving>0?round(moving/km,1):null,avgSpeedKmh:moving>0?round((out.distanceM/1000)/(moving/3600),2):null,avgHr:out.hrTime?Math.round(out.hrWeighted/out.hrTime):null,avgCadenceSpm:out.cadenceTime?round(out.cadenceWeighted/out.cadenceTime,1):null,elevationGainM:round(out.elevationGainM,1),elevationLossM:round(out.elevationLossM,1)};
}

export function compareDistanceHalves(samples=[]){
  if(!Array.isArray(samples)||samples.length<2)return{available:false,reason:'Muestras insuficientes'};
  const totalM=Number(samples.at(-1)?.cumulativeM)||0;if(totalM<2000)return{available:false,reason:'Distancia insuficiente'};
  const halfM=totalM/2,first=aggregateDistanceRange(samples,0,halfM),second=aggregateDistanceRange(samples,halfM,totalM);
  if(!finite(first.paceSecKm)||!finite(second.paceSecKm))return{available:false,reason:'Ritmo insuficiente'};
  const changePct=(Number(second.paceSecKm)-Number(first.paceSecKm))/Number(first.paceSecKm)*100;
  let label='Mitades equivalentes',level='even';if(changePct<=-2){label='Negative split';level='negative'}else if(changePct>=2){label='Positive split';level='positive'}
  return{available:true,totalDistanceM:round(totalM,1),halfDistanceM:round(halfM,1),first,second,paceChangePct:round(changePct,2),label,level};
}

export function estimateCardiacDrift(samples=[],halves=null){
  const s=Array.isArray(samples)?samples:[],movingSec=s.reduce((n,x)=>n+(isMoving(x)?Number(x.dt)||0:0),0),totalM=Number(s.at(-1)?.cumulativeM)||0,hrSamples=s.filter(x=>finite(x.hr)).length;
  if(movingSec<1800||totalM<4000)return{available:false,reason:'Duración o distancia insuficiente',driftPct:null,label:'Datos insuficientes'};
  if(hrSamples<Math.max(60,s.length*.45))return{available:false,reason:'Frecuencia cardíaca insuficiente',driftPct:null,label:'Datos insuficientes'};
  const h=halves?.available?halves:compareDistanceHalves(s);if(!h?.available||!finite(h.first?.avgHr)||!finite(h.second?.avgHr)||!finite(h.first?.avgSpeedKmh)||!finite(h.second?.avgSpeedKmh))return{available:false,reason:'Mitades no comparables',driftPct:null,label:'Datos insuficientes'};
  const e1=Number(h.first.avgSpeedKmh)/Number(h.first.avgHr),e2=Number(h.second.avgSpeedKmh)/Number(h.second.avgHr),drift=(e1-e2)/e1*100,paceDelta=Math.abs(Number(h.paceChangePct)||0),elevDelta=Math.abs((Number(h.second.elevationGainM)||0)-(Number(h.first.elevationGainM)||0)),comparable=paceDelta<=10&&elevDelta<=80;
  let label='Deriva baja',level='low';if(drift>=6){label='Deriva notable';level='notable'}else if(drift>=3){label='Deriva moderada';level='moderate'}else if(drift<0){label='Sin deriva apreciable';level='none'}
  return{available:true,comparable,label,level,driftPct:round(drift,2),firstEfficiency:round(e1,5),secondEfficiency:round(e2,5),paceDifferencePct:round(paceDelta,2),elevationGainDifferenceM:round(elevDelta,1),reason:comparable?null:'El ritmo o el desnivel cambió bastante entre mitades; interpreta la deriva con contexto.'};
}

export function elevationSummary(samples){
  const alts=samples.filter(x=>finite(x.altitudeM)).map(x=>Number(x.altitudeM));let gain=0,loss=0;for(const s of samples){const d=Number(s.elevDeltaM)||0;if(d>0)gain+=d;else loss+=Math.abs(d)}
  return{available:alts.length>=10,minM:alts.length?round(Math.min(...alts),1):null,maxM:alts.length?round(Math.max(...alts),1):null,gainM:round(gain,1),lossM:round(loss,1),samples:alts.length};
}
export function cadenceSummary(samples){
  let weighted=0,time=0;const values=[];for(const s of samples)if(isMoving(s)&&finite(s.cadenceSpm)){const dt=Number(s.dt)||0;weighted+=Number(s.cadenceSpm)*dt;time+=dt;values.push(Number(s.cadenceSpm))}
  return{available:values.length>=10,avgSpm:time?round(weighted/time,1):null,p95Spm:values.length?round(percentile(values,.95),1):null,samples:values.length};
}
export function pauseSummary(samples){
  let total=0,events=0,current=0;for(const s of samples.slice(1)){const dt=Number(s.dt)||0;if(dt<=0)continue;if(!isMoving(s)){total+=dt;current+=dt}else{if(current>=5)events++;current=0}}if(current>=5)events++;return{pauseSec:round(total,1),stopCount:events};
}
export function dataQuality(samples){
  const temporal=samples.length,gps=samples.filter(x=>finite(x.lat)&&finite(x.lon)).length,hr=samples.filter(x=>finite(x.hr)).length,cadence=samples.filter(x=>finite(x.cadenceSpm)).length,alt=samples.filter(x=>finite(x.altitudeM)).length,distance=Number(samples.at(-1)?.cumulativeM)||0;
  let label='insuficiente';if(temporal>=120&&distance>=1000)label='buena';else if(temporal>=20&&distance>=300)label='parcial';
  return{label,temporalSamples:temporal,gpsSamples:gps,hrSamples:hr,cadenceSamples:cadence,altitudeSamples:alt,distanceM:round(distance,1)};
}

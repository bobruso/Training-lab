import {avg,episodeCount,haversineM,normalizeCoord,num,percentile,ts} from './edge-common.js';

export function buildBaseFitAnalysis(records=[],session={},configuredMax=null){
 const pts=(Array.isArray(records)?records:[]).map(r=>{
   const speed=num(r.enhanced_speed??r.speed)??0,time=ts(r.timestamp),distanceKm=num(r.distance),lat=normalizeCoord(r.position_lat),lon=normalizeCoord(r.position_long);
   const cadenceBase=num(r.enhanced_cadence??r.cadence),fractionalCadence=num(r.fractional_cadence)??0,cadenceSpm=cadenceBase==null?null:cadenceBase+fractionalCadence;
   const strideRaw=num(r.step_length??r.stride_length),strideLengthM=strideRaw==null?null:(strideRaw>0&&strideRaw<.01?strideRaw*1000:strideRaw);
   return{t:time,speed,distanceKm,hr:num(r.heart_rate),lat,lon,altitudeKm:num(r.enhanced_altitude??r.altitude),cadenceSpm,strideLengthM};
 }).filter(p=>p.t!=null).map(p=>({...p,t:Number(p.t)})).sort((a,b)=>a.t-b.t);
 const speeds=pts.map(p=>p.speed).filter(v=>Number.isFinite(v)&&v>=0&&v<80),rawTop=speeds.length?Math.max(...speeds):(num(session.max_speed)??0),p99=percentile(speeds,.99),top5=[...speeds].sort((a,b)=>b-a).slice(0,5),robustTop=top5.length?avg(top5):p99,relativeCutoff=Math.max(15.5,robustTop*.82);
 let movingSec=0,highIntensityM=0,first10MinM=0,last10MinM=0,elevationGainM=0,accelCount=0,decelCount=0;
 const speedZones=[{name:'Caminar',min:0,max:7,seconds:0,distance_m:0},{name:'Trote',min:7,max:14.4,seconds:0,distance_m:0},{name:'Carrera',min:14.4,max:19.8,seconds:0,distance_m:0},{name:'Alta velocidad',min:19.8,max:25.2,seconds:0,distance_m:0},{name:'Muy alta velocidad',min:25.2,max:999,seconds:0,distance_m:0}];
 const hrValues=pts.map(p=>p.hr).filter(v=>v!=null),recordedMaxHr=hrValues.length?Math.max(...hrValues):(num(session.max_heart_rate)??null),refMaxHr=configuredMax&&configuredMax>0?configuredMax:(recordedMaxHr&&recordedMaxHr>0?recordedMaxHr:180),hrBounds=[.5,.6,.7,.8,.9,1.01].map(x=>refMaxHr*x),hrZones=[1,2,3,4,5].map((z,i)=>({zone:z,min_bpm:Math.round(hrBounds[i]),max_bpm:Math.round(hrBounds[i+1]),seconds:0}));
 for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],dt=(b.t-a.t)/1000;if(dt<=0||dt>10)continue;
   let dm=0;if(a.distanceKm!=null&&b.distanceKm!=null&&b.distanceKm>=a.distanceKm)dm=(b.distanceKm-a.distanceKm)*1000;else dm=haversineM(a,b);if(!Number.isFinite(dm)||dm<0||dm/dt>80/3.6)dm=0;
   if(b.speed>.5)movingSec+=dt;if(b.speed>=13)highIntensityM+=dm;if((b.t-pts[0].t)<=600000)first10MinM+=dm;if((pts[pts.length-1].t-a.t)<=600000)last10MinM+=dm;
   const z=speedZones.find(x=>b.speed>=x.min&&b.speed<x.max);if(z){z.seconds+=dt;z.distance_m+=dm}
   if(b.hr!=null){const zi=Math.min(4,Math.max(0,Math.floor((b.hr/refMaxHr-.5)/.1)));if(b.hr>=refMaxHr*.5)hrZones[zi].seconds+=dt}
   const acc=((b.speed-a.speed)/3.6)/dt;if(acc>=.7)accelCount++;if(acc<=-.7)decelCount++;
   if(a.altitudeKm!=null&&b.altitudeKm!=null){const gain=(b.altitudeKm-a.altitudeKm)*1000;if(gain>0&&gain<30)elevationGainM+=gain}
 }
 const durationSec=num(session.total_elapsed_time??session.total_timer_time)??(pts.length>1?(pts.at(-1).t-pts[0].t)/1000:0);if(!pts.length)movingSec=num(session.total_timer_time)??0;
 const distanceKm=num(session.total_distance)??(pts.length&&pts.at(-1).distanceKm!=null?Number(pts.at(-1).distanceKm):0),avgHr=Math.round(num(session.avg_heart_rate)??avg(hrValues)),maxHr=Math.round(recordedMaxHr??0),calories=Math.round(num(session.total_calories)??0),absoluteSprintCount=episodeCount(pts.map(p=>({t:p.t,s:p.speed})),18),sprintCount=episodeCount(pts.map(p=>({t:p.t,s:p.speed})),relativeCutoff),metersPerMovingMin=movingSec?distanceKm*1000/(movingSec/60):0,highIntensityShare=distanceKm?highIntensityM/(distanceKm*1000):0,zoneTotal=hrZones.reduce((s,z)=>s+z.seconds,0),hrZone45Share=zoneTotal?(hrZones[3].seconds+hrZones[4].seconds)/zoneTotal:0,avgPaceSecKm=distanceKm&&movingSec?Math.round(movingSec/distanceKm):null;
 const step=Math.max(1,Math.ceil(pts.length/1200)),trackPoints=pts.filter((_,i)=>i%step===0).map(p=>({t:p.t,lat:p.lat,lon:p.lon,hr:p.hr,speed_kmh:+p.speed.toFixed(2),altitude_m:p.altitudeKm!=null?+(p.altitudeKm*1000).toFixed(1):null,cadence_spm:p.cadenceSpm!=null?+p.cadenceSpm.toFixed(1):null,stride_length_m:p.strideLengthM!=null?+p.strideLengthM.toFixed(2):null})).filter(p=>p.lat!=null&&p.lon!=null);
 const summary={distanceKm:+distanceKm.toFixed(3),durationSec:Math.round(durationSec),movingTimeSec:Math.round(movingSec),avgHr:avgHr||null,maxHr:maxHr||null,calories:calories||null,rawTopKmh:+rawTop.toFixed(2),robustTopKmh:+robustTop.toFixed(2),p99TopKmh:+p99.toFixed(2),relativeSprintCutoffKmh:+relativeCutoff.toFixed(2),sprintCount,absoluteSprintCount,highIntensityM:+highIntensityM.toFixed(1),highIntensityShare:+highIntensityShare.toFixed(4),metersPerMovingMin:+metersPerMovingMin.toFixed(1),accelerations:accelCount,decelerations:decelCount,first10MinM:durationSec>=600?+first10MinM.toFixed(1):null,last10MinM:durationSec>=600?+last10MinM.toFixed(1):null,elevationGainM:+elevationGainM.toFixed(1),referenceMaxHr:Math.round(refMaxHr),hrZoneReference:configuredMax?'profile':'estimated',hrZone45Share:+hrZone45Share.toFixed(4),avgPaceSecKm,parser:'fit-file-parser@5.0.2'};
 if(!pts.length)Object.assign(summary,{rawTopKmh:null,robustTopKmh:null,p99TopKmh:null,sprintCount:null,absoluteSprintCount:null,highIntensityM:null,highIntensityShare:null,accelerations:null,decelerations:null,first10MinM:null,last10MinM:null,hrZone45Share:null});
 return{pts,summary,hrZones,speedZones,trackPoints};
}

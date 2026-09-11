import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHealthConnectPoints,healthConnectBaseSummary,analyzeRichActivity,healthConnectDataHtml} from '../health-connect-rich.js';

function footballPoints({minutes=20,futsal=false}={}){
 const out=[];const start=Date.parse('2026-09-10T20:13:15Z');let lat=39.47,lon=-.38;
 for(let i=0;i<=minutes*60;i++){
  const burst=i%45<7,speed=burst?(futsal?17:19):6.5;
  const meters=speed/3.6;lat+=meters/111111;
  out.push({t:start+i*1000,lat,lon,speed,hr:135+Math.min(45,Math.round(speed*2.2)),altitude_m:18});
 }
 return out;
}

test('Health Connect points build cumulative distance from GPS',()=>{
 const raw=[{t:0,lat:39.47,lon:-.38,speed:10},{t:1000,lat:39.47009,lon:-.38,speed:10},{t:2000,lat:39.47018,lon:-.38,speed:10}];
 const p=prepareHealthConnectPoints(raw);assert.equal(p.length,3);assert.ok(p.at(-1).distance_km>.015);assert.ok(p.at(-1).distance_km<.03);
});

test('Health Connect base remains useful with speed series but no GPS',()=>{
 const raw=Array.from({length:61},(_,i)=>({t:i*1000,speed:12,hr:145}));const activity={duration_min:1,distance_km:null,avg_hr:145,max_hr:155,metrics:{}};
 const prepared=prepareHealthConnectPoints(raw),summary=healthConnectBaseSummary(activity,prepared);assert.ok(summary.distanceKm>.15);assert.ok(summary.movingTimeSec>=59);assert.equal(summary.avgHr,145);
});

test('rich Health Connect football reuses deep football analyzer',()=>{
 const points=footballPoints({minutes:20});const activity={id:'a',activity_type:'football',duration_min:20,distance_km:2.8,avg_hr:156,max_hr:182,metrics:{analysis_points:points,route_points:points,data_completeness:'full'}};
 const result=analyzeRichActivity(activity);assert.equal(result.sport,'football');assert.equal(result.report.sport,'football');assert.equal(result.analysis_version,'hc-football-v1');assert.ok(result.summary.footballAnalysisVersion);
});

test('selected futsal uses futsal engine without changing football family row',()=>{
 const points=footballPoints({minutes:20,futsal:true});const activity={id:'a',activity_type:'football',duration_min:20,distance_km:2.2,avg_hr:160,max_hr:186,metrics:{analysis_points:points,route_points:points,health_connect_selected_sport:'futsal',data_completeness:'full'}};
 const result=analyzeRichActivity(activity);assert.equal(result.sport,'futsal');assert.equal(result.report.sport,'futsal');assert.equal(result.analysis_version,'hc-futsal-v1');assert.ok(result.summary.futsalAnalysisVersion);
});

test('FIT enriched activity is never reanalyzed by Health Connect',()=>{
 const activity={activity_type:'football',duration_min:20,metrics:{fit_enriched:true,analysis_points:footballPoints()}};assert.equal(analyzeRichActivity(activity),null);
});

test('COROS diagnostics expose route consent instead of claiming no GPS',()=>{
 const html=healthConnectDataHtml({id:'a',external_id:'session-1',activity_type:'football',metrics:{route_status:'consent_required',data_completeness:'partial',health_connect_capabilities:{route:'consent_required',heart_rate:true,hr_samples:1000,speed:true,speed_samples:900}}});
 assert.match(html,/Autorizar GPS de COROS/);assert.match(html,/1000 muestras/);assert.doesNotMatch(html,/no ha publicado una ruta GPS/);
});

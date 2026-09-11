
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRunningSamples,buildKilometerSplits,assessPaceRegularity,compareDistanceHalves,estimateCardiacDrift,analyzeRunningSession} from '../supabase/functions/analyze-fit/analysis/running.js';

function makeRun({km=6,paceSec=360,secondHalfFactor=1,hrStart=140,hrEnd=150,cadence=170,altitude=true,stopAt=null}={}){
  const start=Date.UTC(2026,8,11,18,0,0),pts=[];let distanceM=0,t=0,lat=39.47,lon=-0.38;
  const target=km*1000;
  while(distanceM<target){
    const half=distanceM>=target/2,pace=paceSec*(half?secondHalfFactor:1),speed=3600/pace;
    const stopped=stopAt!==null&&t>=stopAt&&t<stopAt+20;
    const v=stopped?0:speed,dm=v/3.6;
    distanceM=Math.min(target,distanceM+dm);
    const frac=distanceM/target,hr=Math.round(hrStart+(hrEnd-hrStart)*frac);
    if(!stopped){lat+=dm/111320*.8;lon+=dm/(111320*Math.cos(lat*Math.PI/180))*.2}
    pts.push({t:start+t*1000,speed:v,distanceKm:distanceM/1000,hr,lat,lon,altitudeKm:altitude?(0.05+Math.sin(distanceM/500)*.004):null,cadence});
    t++;
  }
  return pts;
}

test('normalization builds distance increments and cadence',()=>{
 const s=normalizeRunningSamples(makeRun({km:1}));
 assert.equal(s[0].tSec,0);
 assert.ok(s.at(-1).cumulativeM>900);
 assert.ok(s.some(x=>x.cadenceSpm===170));
});

test('kilometer splits include complete kms and partial tail',()=>{
 const samples=normalizeRunningSamples(makeRun({km:3.45,paceSec:360}));
 const result=buildKilometerSplits(samples);
 assert.equal(result.fullCount,3);
 assert.ok(result.partial);
 assert.ok(result.partial.distanceKm>.35&&result.partial.distanceKm<.5);
 assert.ok(result.splits.filter(x=>x.complete).every(x=>Math.abs(x.paceSecKm-360)<3));
});

test('pace regularity labels steady run stable',()=>{
 const samples=normalizeRunningSamples(makeRun({km:5,paceSec:360}));
 const r=assessPaceRegularity(buildKilometerSplits(samples).splits);
 assert.equal(r.available,true);
 assert.ok(['very_stable','stable'].includes(r.level));
 assert.ok(r.cvPct<2);
});

test('distance halves detect negative and positive split',()=>{
 const neg=compareDistanceHalves(normalizeRunningSamples(makeRun({km:6,paceSec:360,secondHalfFactor:.94})));
 assert.equal(neg.available,true);
 assert.equal(neg.level,'negative');
 const pos=compareDistanceHalves(normalizeRunningSamples(makeRun({km:6,paceSec:360,secondHalfFactor:1.08})));
 assert.equal(pos.level,'positive');
});

test('cardiac drift is available for long steady run with HR',()=>{
 const samples=normalizeRunningSamples(makeRun({km:7,paceSec:330,hrStart:135,hrEnd:160}));
 const halves=compareDistanceHalves(samples);
 const drift=estimateCardiacDrift(samples,halves);
 assert.equal(drift.available,true);
 assert.ok(drift.driftPct>5);
 assert.ok(['moderate','notable'].includes(drift.level));
});

test('short run does not claim cardiac drift',()=>{
 const samples=normalizeRunningSamples(makeRun({km:2,paceSec:360}));
 const drift=estimateCardiacDrift(samples,compareDistanceHalves(samples));
 assert.equal(drift.available,false);
});

test('deep running report exposes structured sections and summary patch',()=>{
 const points=makeRun({km:6,paceSec:345,secondHalfFactor:.97,hrStart:138,hrEnd:151});
 const result=analyzeRunningSession(points,{distanceKm:6,durationSec:2050,movingTimeSec:2010,avgHr:145,maxHr:154,elevationGainM:30});
 assert.equal(result.summaryPatch.runningAnalysisVersion,'running-v1');
 assert.ok(result.summaryPatch.runningSplitCount>=5);
 assert.ok(result.report.sections.splits);
 assert.ok(result.report.sections.regularidad);
 assert.ok(result.report.sections.mitades);
 assert.ok(result.report.sections.cardiaco);
 assert.equal(result.report.version,'running-report-v1');
 assert.equal(result.report.sport,'run');
});

test('run without HR remains useful and does not invent drift',()=>{
 const points=makeRun({km:5,paceSec:360}).map(p=>({...p,hr:null}));
 const result=analyzeRunningSession(points,{distanceKm:5,durationSec:1800,movingTimeSec:1800,avgHr:null,maxHr:null});
 assert.equal(result.report.sections.cardiaco.deriva_disponible,false);
 assert.ok(result.summaryPatch.runningSplitCount>=4);
});

test('pause detection preserves elapsed-vs-moving distinction',()=>{
 const points=makeRun({km:5,paceSec:360,stopAt:500});
 const result=analyzeRunningSession(points,{distanceKm:5,durationSec:(points.at(-1).t-points[0].t)/1000,movingTimeSec:null});
 assert.ok(result.summaryPatch.pauseSec>=15);
 assert.ok(result.summaryPatch.stopCount>=1);
 assert.ok(result.summaryPatch.avgPaceElapsedSecKm>=result.summaryPatch.avgPaceSecKm);
});

test('empty points fail gracefully',()=>{
 const result=analyzeRunningSession([],{distanceKm:5,durationSec:1800});
 assert.equal(result.summaryPatch.runningAnalysisVersion,'running-v1');
 assert.equal(result.report,null);
 assert.equal(result.details,null);
});

test('optional cadence and elevation stay unavailable when FIT does not provide them',()=>{
 const points=makeRun({km:4,paceSec:355,altitude:false}).map(p=>({...p,cadence:null,strideLengthM:null}));
 const result=analyzeRunningSession(points,{distanceKm:4,durationSec:1420,avgHr:145,maxHr:151});
 assert.equal(result.report.sections.cadencia.disponible,false);
 assert.equal(result.report.sections.elevacion.disponible,false);
 assert.equal(result.summaryPatch.avgCadenceSpm,null);
});

test('implausible running speed samples are rejected without breaking distance analysis',()=>{
 const points=makeRun({km:3,paceSec:360});
 points[Math.floor(points.length/2)].speed=65;
 const samples=normalizeRunningSamples(points);
 assert.equal(samples[Math.floor(samples.length/2)].speedKmh,null);
 const result=analyzeRunningSession(points,{distanceKm:3,durationSec:1080,avgHr:145,maxHr:151});
 assert.ok(result.summaryPatch.runningSplitCount>=2);
});

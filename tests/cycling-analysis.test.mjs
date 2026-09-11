import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCyclingSession} from '../supabase/functions/analyze-fit/analysis/cycling.js';

function makeRide({minutes=60,speed=27,secondHalfFactor=1,hrStart=130,hrEnd=145,cadence=86,power=190,altitude=true,stopAt=null}={}){
 const start=Date.UTC(2026,8,11,9,0,0),pts=[];let distanceKm=0;
 for(let t=0;t<=minutes*60;t++){
  const half=t>=minutes*30,v=half?speed*secondHalfFactor:speed,stopped=stopAt!==null&&t>=stopAt&&t<stopAt+20,actual=stopped?0:v;
  distanceKm+=actual/3600;const frac=t/(minutes*60);
  const altitudeKm=altitude?(0.08+Math.sin(t/180)*0.006):null;
  pts.push({t:start+t*1000,speed:actual,distanceKm,hr:Math.round(hrStart+(hrEnd-hrStart)*frac),altitudeKm,cadenceSpm:stopped?0:cadence,powerW:stopped?0:(power==null?null:power+(half?10:0))});
 }
 return pts;
}

test('cycling computes speed, halves, cadence and pauses',()=>{
 const points=makeRide({minutes:50,speed:26,secondHalfFactor:.92,stopAt:600});
 const result=analyzeCyclingSession(points,{distanceKm:points.at(-1).distanceKm,durationSec:3000,avgHr:138,maxHr:147},{});
 assert.equal(result.summaryPatch.cyclingAnalysisVersion,'cycling-v1');
 assert.ok(result.summaryPatch.avgSpeedKmh>20);
 assert.ok(result.summaryPatch.secondHalfSpeedChangePct<0);
 assert.ok(result.summaryPatch.pauseSec>=15);
 assert.ok(result.summaryPatch.avgCadenceRpm>80);
 assert.equal(result.report.sport,'cycling');
});

test('cycling power reports watts and kJ but never invents zones without FTP',()=>{
 const points=makeRide({minutes:45,power:205});
 const result=analyzeCyclingSession(points,{distanceKm:20,durationSec:2700,avgHr:140,maxHr:150},{avg_power:205,max_power:500});
 assert.ok(result.summaryPatch.avgPowerW>=200);
 assert.ok(result.summaryPatch.cyclingWorkKj>400);
 assert.equal(result.summaryPatch.powerZonesAvailable,false);
 assert.equal(result.report.sections.potencia.zonas.length,0);
});

test('cycling power zones require explicit valid threshold power',()=>{
 const points=makeRide({minutes:45,power:210});
 const result=analyzeCyclingSession(points,{distanceKm:20,durationSec:2700,avgHr:140,maxHr:150},{threshold_power:240,normalized_power:218});
 assert.equal(result.summaryPatch.cyclingFtpW,240);
 assert.equal(result.summaryPatch.powerZonesAvailable,true);
 assert.equal(result.report.sections.potencia.zonas.length,7);
 assert.ok(result.report.sections.potencia.zonas.reduce((s,z)=>s+z.seconds,0)>2000);
});

test('cycling without power remains useful',()=>{
 const points=makeRide({minutes:35,power:null});
 const result=analyzeCyclingSession(points,{distanceKm:15,durationSec:2100,avgHr:137,maxHr:146},{});
 assert.equal(result.report.sections.potencia.disponible,false);
 assert.ok(result.summaryPatch.avgSpeedKmh>0);
 assert.ok(result.report.sections.elevacion.disponible);
});

test('short cycling session does not overclaim cardiac drift',()=>{
 const points=makeRide({minutes:8});
 const result=analyzeCyclingSession(points,{distanceKm:3.5,durationSec:480,avgHr:135,maxHr:143},{});
 assert.equal(result.report.sections.mitades.disponible,false);
 assert.equal(result.report.sections.cardiaco.deriva_disponible,false);
});

test('cycling missing altitude and cadence are explicitly unavailable',()=>{
 const points=makeRide({minutes:25,altitude:false,cadence:null});
 const result=analyzeCyclingSession(points,{distanceKm:11,durationSec:1500,avgHr:135,maxHr:145},{});
 assert.equal(result.report.sections.elevacion.disponible,false);
 assert.equal(result.report.sections.cadencia.disponible,false);
 assert.equal(result.summaryPatch.avgCadenceRpm,null);
});

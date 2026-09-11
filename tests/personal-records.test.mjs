import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRecords,calculateStrengthRecords,valueText} from '../personal-records.js';
const s=(id,date,extra)=>({id,date,...extra});

test('football only marks latest as new record when margin clears noise threshold',()=>{const sessions=[s('a','2026-09-01',{robustTopKmh:24.0,metersPerMovingMin:88,sprintDensityPer10Min:3.2,fatigueRetention:.94}),s('b','2026-09-05',{robustTopKmh:24.2,metersPerMovingMin:89,sprintDensityPer10Min:3.3,fatigueRetention:.95}),s('c','2026-09-10',{robustTopKmh:24.6,metersPerMovingMin:91,sprintDensityPer10Min:3.7,fatigueRetention:.98})];const r=calculateRecords('football',sessions),speed=r.find(x=>x.key==='robustTopKmh');assert.equal(speed.newRecord,true);assert.equal(speed.previous,24.2);});

test('tiny football speed gain is not announced as new record',()=>{const r=calculateRecords('football',[s('a','2026-09-01',{robustTopKmh:24.0}),s('b','2026-09-10',{robustTopKmh:24.1})]);assert.equal(r.find(x=>x.key==='robustTopKmh').newRecord,false);});

test('running average pace requires at least 3 km',()=>{const r=calculateRecords('run',[s('a','2026-09-01',{avgPaceSecKm:330,distanceKm:5,fastestKmPaceSec:315,paceRegularityPct:4}),s('b','2026-09-10',{avgPaceSecKm:250,distanceKm:1,fastestKmPaceSec:300,paceRegularityPct:3.5})]);const avg=r.find(x=>x.key==='avgPaceSecKm');assert.equal(avg.value,330);});

test('cycling average speed record ignores short rides',()=>{const r=calculateRecords('cycling',[s('a','2026-09-01',{avgSpeedKmh:28,distanceKm:20,robustCyclingSpeedKmh:45}),s('b','2026-09-10',{avgSpeedKmh:40,distanceKm:3,robustCyclingSpeedKmh:46})]);assert.equal(r.find(x=>x.key==='avgSpeedKmh').value,28);});

test('strength records are per exercise and require repeated evidence',()=>{const reports=[{id:'a',date:'2026-09-01',report:{details:{exercises:[{exercise:'Press banca',bestE1rmKg:90},{exercise:'Peso muerto',bestE1rmKg:140}]}}},{id:'b',date:'2026-09-10',report:{details:{exercises:[{exercise:'Press banca',bestE1rmKg:95},{exercise:'Peso muerto',bestE1rmKg:141}]}}}];const r=calculateStrengthRecords(reports),bench=r.find(x=>x.label==='Press banca');assert.equal(bench.newRecord,true);assert.equal(bench.previous,90);});

test('formatting estimated strength stays explicit in kg',()=>{assert.equal(valueText(95.25,'kg'),'95.3 kg');});

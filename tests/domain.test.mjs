import test from 'node:test';import assert from 'node:assert/strict';
import {readinessModel,recoveryModel,uniqueNights,runningTarget} from '../domain.js';
const now=new Date('2026-09-09T15:00:00');
test('personal late sleep window accepts both half-hour shifts and ±1 hour',()=>{
 for(const [start,end] of [['04:30','12:30'],['05:30','13:30'],['06:00','14:00']]){
 const r=readinessModel({now,sleep:[{sleep_date:'2026-09-09',sleep_start:'2026-09-09T'+start,sleep_end:'2026-09-09T'+end,total_sleep_min:480}]});assert.equal(r.parts.find(p=>p.label.startsWith('Regularidad')).value,4);
 }
});
test('missing and stale sleep are not zero hours or a current baseline',()=>{
 const r=readinessModel({now,sleep:[{sleep_date:'2026-08-01',total_sleep_min:480}]});assert.equal(r.score,65);assert.ok(r.missing.length);
 const m=readinessModel({now,sleep:[{sleep_date:'2026-09-09',total_sleep_min:null}]});assert.ok(!m.parts.some(p=>p.label==='Duración del sueño'));
});
test('same night from two sources is counted once, manual correction wins',()=>{
 assert.equal(uniqueNights([{sleep_date:'2026-09-09',source:'manual'},{sleep_date:'2026-09-09',source:'health_connect'}]).length,1);
});
test('recovery returns to 100, ignores future sets and reacts to work',()=>{
 assert.ok(Object.values(recoveryModel({now})).every(x=>x===100));
 const activities=[{date:'2026-09-09',type:'football',duration:60,rpe:8}];
 assert.ok(recoveryModel({now,activities}).isquios<100);
 assert.equal(recoveryModel({now:new Date('2026-09-14'),activities}).isquios,100);
 assert.equal(recoveryModel({now,sets:[{performed_at:'2026-09-10T15:00:00',muscle_group:'pecho',rpe:9}]}).pecho,100);
});
test('three football games remove obligatory running',()=>{assert.equal(runningTarget(3),0);assert.equal(runningTarget(2),1);});

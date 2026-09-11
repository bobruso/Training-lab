import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSportProgressModel,format} from '../sports-progress.js';
const row=(type,date,summary)=>({activity:{id:`${type}-${date}`,activity_type:type,activity_date:date},analysis:{summary}});

test('football compares latest against median of previous five',()=>{const rows=[80,82,84,86,88,100].map((v,i)=>row('football',`2026-09-${String(i+1).padStart(2,'0')}`,{metersPerMovingMin:v,sprintDensityPer10Min:3,avgSprintRecoveryS:30,fatigueRetention:.95,robustTopKmh:24}));const m=buildSportProgressModel('football',rows),c=m.comparisons.find(x=>x.key==='metersPerMovingMin');assert.equal(c.baseline,84);assert.equal(c.current,100);assert.equal(c.state,'up');});

test('running lower pace is interpreted as improvement',()=>{const rows=[360,355,350,345,340,325].map((v,i)=>row('run',`2026-08-${String(i+1).padStart(2,'0')}`,{avgPaceSecKm:v,paceRegularityPct:4,cardiacDriftPct:3,fastestKmPaceSec:v-12,avgHr:145}));const m=buildSportProgressModel('run',rows),c=m.comparisons.find(x=>x.key==='avgPaceSecKm');assert.equal(c.state,'up');assert.match(m.headline,/Mejora clara/i);});

test('cycling power is context rather than automatic performance gain',()=>{const rows=[180,190,200,210].map((v,i)=>row('cycling',`2026-07-${String(i+1).padStart(2,'0')}`,{avgSpeedKmh:28,avgPowerW:v,cardiacDriftPct:3,avgCadenceRpm:88,cyclingWorkKj:500}));const m=buildSportProgressModel('cycling',rows),power=m.comparisons.find(x=>x.key==='avgPowerW');assert.equal(power.state,'context');});

test('gym trend never calls higher volume an automatic improvement',()=>{const rows=[2000,2400,3000,3800].map((v,i)=>row('gym',`2026-06-${String(i+1).padStart(2,'0')}`,{totalVolumeKg:v,volumeDensityKgPerMin:60,strengthSetCount:8,totalReps:50,exerciseCount:4}));const m=buildSportProgressModel('gym',rows),volume=m.comparisons.find(x=>x.key==='totalVolumeKg');assert.equal(volume.state,'context');assert.doesNotMatch(m.headline,/Mejora clara/i);});

test('progress model limits chart history to twenty sessions',()=>{const rows=Array.from({length:28},(_,i)=>row('run',`2026-05-${String((i%28)+1).padStart(2,'0')}`,{avgPaceSecKm:360-i}));const m=buildSportProgressModel('run',rows);assert.equal(m.sessions.length,20);assert.equal(m.series.length,20);});

test('format pace keeps min per km display',()=>{assert.equal(format(355,'pace'),'5:55/km');});

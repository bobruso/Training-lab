import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSessions,format} from '../activity-ab-compare.js';
const item=(type,date,summary)=>({activity:{id:`${type}-${date}`,activity_type:type,activity_date:date,duration_min:summary.durationMin,distance_km:summary.distanceKm,avg_hr:summary.avgHr},analysis:{summary}});

test('football lower sprint recovery is a positive directional change',()=>{const a=item('football','2026-09-01',{durationMin:60,distanceKm:6,metersPerMovingMin:90,avgSprintRecoveryS:34,robustTopKmh:24,fatigueRetention:.92}),b=item('football','2026-09-08',{durationMin:60,distanceKm:6.2,metersPerMovingMin:95,avgSprintRecoveryS:27,robustTopKmh:24.5,fatigueRetention:.97}),c=compareSessions('football',a,b);assert.equal(c.rows.find(x=>x.key==='avgSprintRecoveryS').state,'positive');assert.equal(c.rows.find(x=>x.key==='metersPerMovingMin').state,'positive');});

test('running faster pace is positive even though numeric value decreases',()=>{const a=item('run','2026-09-01',{durationMin:40,distanceKm:6.5,avgPaceSecKm:360,fastestKmPaceSec:345,paceRegularityPct:5,cardiacDriftPct:4}),b=item('run','2026-09-08',{durationMin:40,distanceKm:6.8,avgPaceSecKm:340,fastestKmPaceSec:325,paceRegularityPct:4,cardiacDriftPct:3}),c=compareSessions('run',a,b);assert.equal(c.rows.find(x=>x.key==='avgPaceSecKm').state,'positive');assert.equal(c.rows.find(x=>x.key==='paceRegularityPct').state,'positive');});

test('cycling power stays neutral context while speed can improve',()=>{const a=item('cycling','2026-09-01',{durationMin:60,distanceKm:25,avgSpeedKmh:25,avgPowerW:180}),b=item('cycling','2026-09-08',{durationMin:60,distanceKm:28,avgSpeedKmh:28,avgPowerW:220}),c=compareSessions('cycling',a,b);assert.equal(c.rows.find(x=>x.key==='avgPowerW').state,'neutral');assert.equal(c.rows.find(x=>x.key==='avgSpeedKmh').state,'positive');});

test('strength estimated 1RM is hidden when best exercise changes',()=>{const a=item('gym','2026-09-01',{durationMin:50,totalVolumeKg:3000,bestEstimated1RmKg:95,bestEstimated1RmExercise:'Press banca'}),b=item('gym','2026-09-08',{durationMin:50,totalVolumeKg:3400,bestEstimated1RmKg:150,bestEstimated1RmExercise:'Peso muerto'}),c=compareSessions('gym',a,b);assert.equal(c.rows.some(x=>x.key==='bestEstimated1RmKg'),false);});

test('strength estimated 1RM compares when exercise matches',()=>{const a=item('gym','2026-09-01',{durationMin:50,bestEstimated1RmKg:95,bestEstimated1RmExercise:'Press banca'}),b=item('gym','2026-09-08',{durationMin:50,bestEstimated1RmKg:100,bestEstimated1RmExercise:'Press banca'}),c=compareSessions('gym',a,b);assert.equal(c.rows.find(x=>x.key==='bestEstimated1RmKg').state,'positive');});

test('pace formatter is readable',()=>{assert.equal(format(355,'pace'),'5:55/km');});

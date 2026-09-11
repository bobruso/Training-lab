import test from 'node:test';
import assert from 'node:assert/strict';
import {buildActivityInsights,activityMetricSnapshot,canonicalActivityType} from '../activity-insights.js';

const activity=(id,date,type,overrides={})=>({id,activity_date:date,activity_type:type,...overrides});
const analysis=(id,summary={})=>({activity_id:id,summary});

test('canonical sport aliases stay compatible',()=>{
  assert.equal(canonicalActivityType('running'),'run');
  assert.equal(canonicalActivityType('strength'),'gym');
});

test('zero sprints is preserved as a real value',()=>{
  const snap=activityMetricSnapshot(activity('a','2026-09-10','football',{absolute_sprint_count:0}),analysis('a',{absoluteSprintCount:0}));
  assert.equal(snap.absoluteSprintCount,0);
});

test('no history builds a neutral personal reference message',()=>{
  const result=buildActivityInsights({activity:activity('a','2026-09-10','run',{distance_km:5,avg_hr:145,avg_pace_sec_km:300}),analysis:analysis('a')});
  assert.equal(result.historyCount,0);
  assert.match(result.headline,/referencia personal/i);
});

test('one previous session uses session anterior label',()=>{
  const current=activity('a','2026-09-10','run',{distance_km:5,avg_hr:145,avg_pace_sec_km:290});
  const prev=activity('b','2026-09-09','run',{distance_km:5,avg_hr:145,avg_pace_sec_km:310});
  const result=buildActivityInsights({activity:current,analysis:analysis('a'),history:[{activity:prev,analysis:analysis('b')}]});
  assert.equal(result.historyCount,1);
  assert.equal(result.referenceLabel,'sesión anterior');
});

test('five previous sessions are capped and averaged',()=>{
  const current=activity('a','2026-09-10','football',{distance_km:6});
  const history=Array.from({length:7},(_,i)=>({activity:activity(`p${i}`,`2026-09-0${9-i}`,'football',{distance_km:5+i*.1}),analysis:analysis(`p${i}`)}));
  const result=buildActivityInsights({activity:current,analysis:analysis('a'),history});
  assert.equal(result.historyCount,5);
  assert.equal(result.referenceLabel,'media últimas 5');
});

test('different sports never enter the baseline',()=>{
  const current=activity('a','2026-09-10','run',{distance_km:5,avg_pace_sec_km:300});
  const history=[
    {activity:activity('b','2026-09-09','football',{distance_km:10}),analysis:analysis('b')},
    {activity:activity('c','2026-09-08','cycling',{distance_km:30}),analysis:analysis('c')}
  ];
  const result=buildActivityInsights({activity:current,analysis:analysis('a'),history});
  assert.equal(result.historyCount,0);
});

test('running faster at same heart rate produces the intended headline',()=>{
  const current=activity('a','2026-09-10','run',{distance_km:5,avg_hr:150,avg_pace_sec_km:285});
  const history=[
    {activity:activity('b','2026-09-09','run',{distance_km:5,avg_hr:149,avg_pace_sec_km:300}),analysis:analysis('b')},
    {activity:activity('c','2026-09-08','run',{distance_km:5,avg_hr:151,avg_pace_sec_km:305}),analysis:analysis('c')}
  ];
  const result=buildActivityInsights({activity:current,analysis:analysis('a'),history});
  assert.equal(result.headline,'Mismo pulso, mejor ritmo');
});

test('running with clearly higher HR and no pace improvement warns descriptively',()=>{
  const current=activity('a','2026-09-10','run',{avg_hr:160,avg_pace_sec_km:305});
  const history=[
    {activity:activity('b','2026-09-09','run',{avg_hr:150,avg_pace_sec_km:300}),analysis:analysis('b')},
    {activity:activity('c','2026-09-08','run',{avg_hr:149,avg_pace_sec_km:298}),analysis:analysis('c')}
  ];
  const result=buildActivityInsights({activity:current,analysis:analysis('a'),history});
  assert.equal(result.headline,'Pulso más alto de lo habitual');
  assert.equal(result.tone,'attention');
});

test('football combines work rate and high intensity',()=>{
  const current=activity('a','2026-09-10','football',{distance_km:6});
  const currentAnalysis=analysis('a',{metersPerMovingMin:96,highIntensityM:900,absoluteSprintCount:8});
  const history=[
    {activity:activity('b','2026-09-09','football',{distance_km:5.8}),analysis:analysis('b',{metersPerMovingMin:86,highIntensityM:720,absoluteSprintCount:6})},
    {activity:activity('c','2026-09-08','football',{distance_km:5.9}),analysis:analysis('c',{metersPerMovingMin:88,highIntensityM:740,absoluteSprintCount:5})}
  ];
  const result=buildActivityInsights({activity:current,analysis:currentAnalysis,history});
  assert.equal(result.headline,'Partido más intenso de lo habitual');
});

test('football first vs last ten minutes adds cautious observation',()=>{
  const current=activity('a','2026-09-10','football');
  const currentAnalysis=analysis('a',{first10MinM:1200,last10MinM:900,sprintCount:5,absoluteSprintCount:2});
  const prev={activity:activity('b','2026-09-09','football'),analysis:analysis('b',{first10MinM:1100,last10MinM:1050})};
  const result=buildActivityInsights({activity:current,analysis:currentAnalysis,history:[prev]});
  assert.ok(result.observations.some(text=>/no demuestra por sí solo falta de resistencia/i.test(text)));
});

test('strength volume is neutral rather than automatically positive',()=>{
  const current=activity('a','2026-09-10','gym',{duration_min:60});
  const history=[{activity:activity('b','2026-09-09','gym',{duration_min:60}),analysis:analysis('b',{totalVolumeKg:2000,strengthSetCount:8,totalReps:60})}];
  const result=buildActivityInsights({activity:current,analysis:analysis('a',{totalVolumeKg:2500,strengthSetCount:9,totalReps:65}),history});
  assert.equal(result.headline,'Más volumen registrado');
  assert.equal(result.tone,'neutral');
  const volume=result.comparisons.find(x=>x.key==='totalVolumeKg');
  assert.equal(volume.interpretation,'neutral');
});

test('incomplete data never produces NaN in serialized output',()=>{
  const current=activity('a','2026-09-10','cycling',{distance_km:null,avg_hr:null});
  const history=[{activity:activity('b','2026-09-09','cycling',{distance_km:null}),analysis:null}];
  const result=buildActivityInsights({activity:current,analysis:null,history});
  assert.ok(!JSON.stringify(result).includes('NaN'));
});

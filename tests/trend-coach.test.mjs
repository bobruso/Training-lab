import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrendCoach} from '../trend-coach.js';

test('football fatigue decline produces a cautious load signal',()=>{const m=buildTrendCoach({football:[{fatigueRetention:.98,avgSprintRecoveryS:28,metersPerMovingMin:90},{fatigueRetention:.96,avgSprintRecoveryS:30,metersPerMovingMin:92},{fatigueRetention:.84,avgSprintRecoveryS:36,metersPerMovingMin:91}]});assert.equal(m.signals[0].tone,'attention');assert.match(m.signals[0].text,/prioriza recuperación/i);assert.match(m.focus,/asimilar carga/i);});

test('running faster at similar heart rate produces positive maintenance signal',()=>{const m=buildTrendCoach({run:[{avgPaceSecKm:360,avgHr:145},{avgPaceSecKm:355,avgHr:146},{avgPaceSecKm:335,avgHr:146}]});assert.equal(m.signals[0].tone,'positive');assert.match(m.signals[0].text,/mantén los rodajes fáciles/i);});

test('running higher heart rate without pace gain produces attention',()=>{const m=buildTrendCoach({run:[{avgPaceSecKm:350,avgHr:145},{avgPaceSecKm:348,avgHr:146},{avgPaceSecKm:349,avgHr:154}]});assert.equal(m.signals[0].tone,'attention');assert.match(m.signals[0].text,/sueño, calor y fatiga/i);});

test('gym strength signal requires repeated same exercise evidence',()=>{const m=buildTrendCoach({gym:[{bestEstimated1RmExercise:'Press banca',bestEstimated1RmKg:90},{bestEstimated1RmExercise:'Peso muerto',bestEstimated1RmKg:140},{bestEstimated1RmExercise:'Press banca',bestEstimated1RmKg:95}]});assert.equal(m.signals.length,0);});

test('gym repeated same exercise can produce positive estimated strength signal',()=>{const m=buildTrendCoach({gym:[{bestEstimated1RmExercise:'Press banca',bestEstimated1RmKg:90},{bestEstimated1RmExercise:'Press banca',bestEstimated1RmKg:91},{bestEstimated1RmExercise:'Press banca',bestEstimated1RmKg:96}]});assert.equal(m.signals[0].tone,'positive');assert.match(m.signals[0].text,/estimación/i);});

test('insufficient history stays neutral',()=>{const m=buildTrendCoach({football:[{fatigueRetention:.8},{fatigueRetention:.7}]});assert.equal(m.signals.length,0);assert.match(m.focus,/Acumular sesiones/i);});

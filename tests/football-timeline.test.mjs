import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFootballTimelineModel,renderFootballTimelineHtml} from '../football-timeline.js';
const analysis=(fatigue={lectura:'Intensidad bastante estable',retencion_global_pct:97,retencion_velocidad_alta_pct:96,cambio_recuperacion_pct:4})=>({summary:{activityType:'football'},report:{sport:'football',sections:{intensidad:{bloques_10_min:[{startSec:0,endSec:600,metersPerMin:88,highIntensityM:120,relativeSprintCount:2,absoluteSprintCount:1,avgHr:158},{startSec:600,endSec:1200,metersPerMin:95,highIntensityM:170,relativeSprintCount:3,absoluteSprintCount:1,avgHr:162},{startSec:1200,endSec:1800,metersPerMin:90,highIntensityM:130,relativeSprintCount:2,absoluteSprintCount:0,avgHr:160}]},fatiga:fatigue,sprints:{detalle_eventos:[{tSec:300,peakSpeedKmh:23.4},{tSec:900,peakSpeedKmh:24.1}]}}}});

test('football timeline identifies the busiest work block',()=>{const m=buildFootballTimelineModel(analysis());assert.equal(m.peak.startSec,600);assert.equal(m.highPeak.startSec,600);assert.equal(m.headline,'Intensidad bien sostenida');});

test('football timeline keeps fatigue conclusion cautious',()=>{const m=buildFootballTimelineModel(analysis({lectura:'Descenso claro de intensidad',retencion_global_pct:84,retencion_velocidad_alta_pct:89,cambio_recuperacion_pct:22}));assert.equal(m.tone,'attention');assert.match(m.summary,/no demuestra por sí solo/i);});

test('football timeline renders blocks and sprint events',()=>{const html=renderFootballTimelineHtml(analysis());assert.match(html,/Partido · línea temporal/);assert.match(html,/Pico de trabajo/);assert.match(html,/23\.4 km\/h/);assert.match(html,/Retención 97%/);});

test('non football or missing blocks does not render',()=>{assert.equal(buildFootballTimelineModel({summary:{activityType:'run'},report:{sport:'run',sections:{}}}),null);assert.equal(renderFootballTimelineHtml({summary:{activityType:'football'},report:{sport:'football',sections:{intensidad:{bloques_10_min:[]}}}}),'');});

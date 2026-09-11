import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeStrengthSession} from '../supabase/functions/analyze-fit/analysis/strength.js';
const set=(exercise,muscle,reps,weight,set_type='active')=>({exercise,muscle_group:muscle,reps,weight_kg:weight,set_type});

test('deep strength excludes rest sets and computes volume',()=>{const sets=[set('Press banca','pecho',8,70),set('Press banca','pecho',8,70),set('Descanso',null,null,null,'rest'),set('Remo','espalda',10,60)];const r=analyzeStrengthSession(sets,{durationSec:3600,avgHr:112});assert.equal(r.summaryPatch.strengthSetCount,3);assert.equal(r.summaryPatch.totalReps,26);assert.equal(r.summaryPatch.totalVolumeKg,1720);assert.equal(r.report.sport,'gym');});

test('estimated 1RM uses valid loaded sets only',()=>{const sets=[set('Sentadilla','cuadriceps',5,100),set('Sentadilla','cuadriceps',15,90),set('Sentadilla','cuadriceps',3,110)];const r=analyzeStrengthSession(sets,{durationSec:3000});assert.equal(r.summaryPatch.bestEstimated1RmExercise,'Sentadilla');assert.ok(r.summaryPatch.bestEstimated1RmKg>120);assert.ok(r.summaryPatch.bestEstimated1RmKg<122);assert.match(r.report.observations.join(' '),/Epley/);});

test('sets without load remain reps but do not invent volume',()=>{const sets=[set('Dominadas','espalda',8,null),set('Dominadas','espalda',7,null),set('Plancha','core',1,null)];const r=analyzeStrengthSession(sets,{durationSec:1800});assert.equal(r.summaryPatch.totalReps,16);assert.equal(r.summaryPatch.totalVolumeKg,0);assert.equal(r.summaryPatch.bestEstimated1RmKg,null);assert.equal(r.summaryPatch.strengthDataQuality,'parcial');});

test('muscle and exercise distribution identify the main volume',()=>{const sets=[set('Press banca','pecho',10,70),set('Press banca','pecho',10,70),set('Remo','espalda',10,50)];const r=analyzeStrengthSession(sets,{durationSec:2400});assert.equal(r.report.sections.distribucion.grupo_principal,'pecho');assert.equal(r.report.sections.distribucion.ejercicio_mayor_volumen,'Press banca');assert.equal(r.summaryPatch.exerciseCount,2);});

test('volume density uses session duration',()=>{const r=analyzeStrengthSession([set('Peso muerto','isquios',5,100),set('Peso muerto','isquios',5,100)],{durationSec:1200});assert.equal(r.summaryPatch.totalVolumeKg,1000);assert.equal(r.summaryPatch.volumeDensityKgPerMin,50);});

test('empty FIT strength analysis fails gracefully without inventing sets',()=>{const r=analyzeStrengthSession([],{durationSec:2700,avgHr:105});assert.equal(r.summaryPatch.strengthSetCount,0);assert.equal(r.summaryPatch.strengthDataQuality,'insuficiente');assert.match(r.report.analysis,/no contiene series de trabajo/i);});

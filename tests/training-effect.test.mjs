import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBaseFitAnalysis} from '../supabase/functions/analyze-fit/analysis/base-analysis.js';

test('extracts FIT aerobic and anaerobic training effect when present',()=>{
 const out=buildBaseFitAnalysis([],{
  total_training_effect:3.4,
  total_anaerobic_training_effect:2.1,
  total_elapsed_time:3600,
  total_timer_time:3500,
  total_distance:10
 },190);
 assert.equal(out.summary.aerobicTrainingEffect,3.4);
 assert.equal(out.summary.anaerobicTrainingEffect,2.1);
 assert.equal(out.summary.trainingEffectSource,'fit_session');
});

test('does not invent training effect if FIT omits it',()=>{
 const out=buildBaseFitAnalysis([], {total_elapsed_time:1800,total_distance:5},190);
 assert.equal(out.summary.aerobicTrainingEffect,null);
 assert.equal(out.summary.anaerobicTrainingEffect,null);
 assert.equal(out.summary.trainingEffectSource,null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMealType,validateFoodAnalysis,resolvedMacros} from '../food-camera.js';

test('meal type follows Training Lab late schedule',()=>{
  assert.equal(defaultMealType(14),'desayuno');
  assert.equal(defaultMealType(16),'comida');
  assert.equal(defaultMealType(19),'merienda');
  assert.equal(defaultMealType(23),'cena');
  assert.equal(defaultMealType(3),'recena');
});

test('AI result is clamped and normalized',()=>{
  const x=validateFoodAnalysis({dish_name:' Test ',confidence:3,preset_confidence:-2,protein_g:900,carbs_g:-3,fat_g:20.4,ingredients:['a','b']});
  assert.equal(x.dish_name,'Test');assert.equal(x.confidence,1);assert.equal(x.preset_confidence,0);assert.equal(x.protein_g,220);assert.equal(x.carbs_g,0);assert.equal(x.fat_g,20);
});

test('high-confidence habitual dish uses Training Lab preset macros',()=>{
  const x=resolvedMacros({dish_name:'algo',preset_id:'arroz_atun_huevo',preset_confidence:.92,protein_g:99,carbs_g:1,fat_g:99});
  assert.equal(x.dish_name,'Arroz blanco con atún y huevo');
  assert.deepEqual([x.protein_g,x.carbs_g,x.fat_g],[38,85,15]);
  assert.equal(x.macro_source,'preset');
});

test('low-confidence preset keeps visual estimate',()=>{
  const x=resolvedMacros({dish_name:'plato restaurante',preset_id:'pizza',preset_confidence:.4,protein_g:31,carbs_g:81,fat_g:22});
  assert.deepEqual([x.protein_g,x.carbs_g,x.fat_g],[31,81,22]);
  assert.equal(x.macro_source,'visual_estimate');
});

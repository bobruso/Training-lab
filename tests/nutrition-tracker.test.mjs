import test from 'node:test';
import assert from 'node:assert/strict';
import {NUTRITION_PRESETS,calculateNutritionTotals,estimateOtherMeal,kcalFor,parseNutritionTargets} from '../nutrition-tracker.js';

test('preset catalog contains the requested regular foods',()=>{
 assert.ok(NUTRITION_PRESETS.breakfast.some(x=>/yogur/i.test(x.title)));
 assert.ok(NUTRITION_PRESETS.comida.some(x=>/arroz blanco con carne/i.test(x.title)));
 assert.ok(NUTRITION_PRESETS.cena.some(x=>/pizza/i.test(x.title)));
 assert.ok(NUTRITION_PRESETS.picoteo.some(x=>/gazpacho/i.test(x.title)));
});

test('daily totals add protein carbs and fat',()=>{
 const total=calculateNutritionTotals([{protein_g:20,carbs_g:40,fat_g:10},{protein_g:30,carbs_g:60,fat_g:15}]);
 assert.deepEqual(total,{protein:50,carbs:100,fat:25});
 assert.equal(kcalFor(total),825);
});

test('other meal estimator recognizes rice chicken and egg',()=>{
 const meal=estimateOtherMeal('arroz con pollo y huevo','comida','normal');
 assert.ok(meal.protein>=45);
 assert.ok(meal.carbs>=65);
 assert.ok(meal.fat>=15);
 assert.equal(meal.fallback,false);
});

test('restaurant pizza estimate is explicit and portion aware',()=>{
 const normal=estimateOtherMeal('pizza en un restaurante','cena','normal');
 const large=estimateOtherMeal('pizza en un restaurante','cena','grande');
 assert.equal(normal.carbs,105);
 assert.ok(large.carbs>normal.carbs);
});

test('unknown restaurant meal falls back to an adult meal estimate',()=>{
 const meal=estimateOtherMeal('plato del día del restaurante','comida','normal');
 assert.equal(meal.fallback,true);
 assert.deepEqual({protein:meal.protein,carbs:meal.carbs,fat:meal.fat},{protein:30,carbs:65,fat:25});
});

test('dynamic macro targets are parsed from the existing planner',()=>{
 const t=parseNutritionTargets('Consumido / objetivo: proteína 40 / 130 g · HC 120 / 390 g · grasas 20 / 75 g.');
 assert.deepEqual(t,{protein:130,carbs:390,fat:75});
});

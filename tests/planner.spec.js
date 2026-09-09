import {test,expect} from '@playwright/test';
test('three confirmed football games reduce running and do not persist projected training',async({page})=>{
 await page.clock.install({time:new Date('2026-09-07T15:00:00')});
 await page.addInitScript(()=>localStorage.setItem('traininglab-v2',JSON.stringify({activities:[],weights:[],profile:{weight:70},footballOverrides:{'2026-09-07':true,'2026-09-09':true,'2026-09-11':true},restDays:{},fatigue:{}})));
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab.state.appReady);
 await expect(page.locator('#runCount')).toHaveText('0/0');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('traininglab-v2')).activities.length)).toBe(0);
 await page.evaluate(()=>window.setFootballFor('2026-09-09',false));await expect(page.locator('#runCount')).toHaveText('0/1');
});
test('comparator supports five sessions and keeps absent metrics absent',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('traininglab-v2',JSON.stringify({activities:Array.from({length:5},(_,i)=>({date:'2026-09-0'+(i+1),type:'football',distance:5+i,moving:60,hr:140+i,metrics:{highIntensityM:500+i*50,absoluteSprintCount:0}})),weights:[],profile:{weight:70},footballOverrides:{},restDays:{},fatigue:{}})));
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab.state.appReady);await page.evaluate(()=>window.navTo('comparar'));
 for(const input of await page.locator('.cmp').all())await input.check();
 await expect(page.locator('.cmp:checked')).toHaveCount(5);await expect(page.locator('#compareResult')).toContainText('P99');await expect(page.locator('#compareResult')).toContainText('—');await expect(page.locator('#compareResult')).toContainText('Asociación ≠ causalidad');
});

import {test,expect} from '@playwright/test';
const id='11111111-1111-4111-8111-111111111111';
async function openSettings(page){await page.locator('.gear-button').click();await page.locator('[data-gear-page="ajustes"]').click();await expect(page.locator('#ajustes')).toHaveClass(/on/)}
test('authenticated cold start, writes and logout isolation',async({page})=>{
 const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({id})=>{
 if(sessionStorage.getItem('qa-session-seeded'))return;sessionStorage.setItem('qa-session-seeded','yes');
 const payload=btoa(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'}));
 localStorage.setItem('sb-nnpvklaxhomarxszlclt-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test',refresh_token:'fake-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id,email:'qa@example.com',aud:'authenticated',role:'authenticated'}}));
 },{id});
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>{
 const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);
 if(req.method()!=='GET')writes.push({table,body:req.postDataJSON()});
 let body=[];
 if(table==='game_state')body={user_id:id,level:1,xp:0,inventory:[]};
 if(table==='user')body={id,email:'qa@example.com'};
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/?debug=1');await page.waitForFunction(()=>window.TrainingLab?.state.appReady);await openSettings(page);await expect(page.locator('#logoutBtn')).toBeVisible();
 await expect.poll(()=>writes.some(x=>x.table==='profiles')).toBe(true);
 await page.evaluate(()=>window.navTo('checkin'));
 await page.locator('#fatigueSel').selectOption('4');
 await page.evaluate(()=>window.saveFatigue());
 await page.evaluate(()=>{document.getElementById('weightKg').value='70.4';return window.saveWeight();});
 await page.evaluate(()=>window.saveCheckin());
 await page.evaluate(()=>window.logSuggestedMeal('comida','QA meal'));
 for(const table of ['daily_status','weigh_ins','daily_checkins','meal_logs'])expect(writes.some(x=>x.table===table&&x.body.user_id===id)).toBe(true);
 const before=await page.evaluate(()=>window.cloudMeals.length);
 await page.route('**/rest/v1/meal_logs*',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'23514',message:'Invalid meal'})}));
 expect(await page.evaluate(()=>window.logSuggestedMeal('comida','rejected').then(()=>false,()=>true))).toBe(true);
 expect(await page.evaluate(()=>window.cloudMeals.length)).toBe(before);
 await expect(page.locator('#appError')).toBeVisible();
 await page.evaluate(()=>window.navTo('ajustes'));await page.locator('#logoutBtn').click();
 await expect.poll(()=>page.evaluate(()=>window.TrainingLab.state.authenticated)).toBe(false);
 await expect(page.locator('[data-auth=signin]')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test.describe('PWA',()=>{
 test.use({serviceWorkers:'allow'});
 test('precache is complete, offline reload works and API is excluded',async({page,context})=>{
 await page.goto('/?debug=1');await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.reload();await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 const keys=await page.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.filter(n=>n.startsWith('training-lab-')).map(async n=>(await (await caches.open(n)).keys()).map(r=>r.url)))).flat();});
 expect(keys.some(k=>k.includes('app.js?v='))).toBe(true);expect(keys.some(k=>k.includes('route-map.js?v='))).toBe(true);expect(keys.some(k=>k.includes('supabase.co'))).toBe(false);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.TrainingLab?.state.appReady);await expect(page.locator('#todayPlan')).not.toHaveText('');
 await context.setOffline(false);
 });
});

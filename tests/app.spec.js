import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test.beforeEach(async({page})=>{
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
});
test('starts, navigates, exposes handlers and has no missing IDs',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?debug=1');
 await expect(page.locator('#todayPlan')).not.toHaveText('');
 await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 const ids=await page.locator('[id]').evaluateAll(els=>els.map(e=>e.id));expect(ids.length).toBe(new Set(ids).size);
 const missing=await page.evaluate(()=>[...document.querySelectorAll('[onclick],[onchange]')].flatMap(el=>{
   const code=el.getAttribute('onclick')||el.getAttribute('onchange');
   const match=code.match(/^([\w]+)\(/);return match&&typeof window[match[1]]!=='function'?[match[1]]:[];
 }));expect(missing).toEqual([]);
 const refs=[...readFileSync('app.js','utf8').matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);
 expect([...new Set(refs)].filter(id=>!ids.includes(id)&&!['logoutBtn'].includes(id))).toEqual([]);
 await page.locator('nav [data-page="sueno"]').click();await expect(page.locator('#sueno')).toHaveClass(/on/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('login validates, sends once and restores state',async({page})=>{
 let requests=0;
 await page.route('**/auth/v1/otp?**',async route=>{requests++;expect(route.request().postDataJSON().email).toBe('qa@example.com');expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('https://bobruso.github.io/Training-lab/');await new Promise(r=>setTimeout(r,100));await route.fulfill({status:200,body:'{}'});});
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 await page.locator('#loginBtn').click();await expect(page.locator('#cloudDetail')).toContainText('email válido');expect(requests).toBe(0);
 await page.locator('#authEmail').fill('qa@example.com');await page.locator('#loginBtn').click();
 await expect(page.locator('#loginBtn')).toHaveText('Enviando…');await expect(page.locator('#cloudDetail')).toContainText('Enlace enviado');await expect(page.locator('#loginBtn')).toBeEnabled();expect(requests).toBe(1);
});
test('fallback survives module failure and handles rate limits',async({page})=>{
 await page.route('**/app.js*',r=>r.abort());await page.route('**/auth/v1/otp?**',r=>r.fulfill({status:429,body:'{}'}));
 await page.goto('/');await page.locator('#authEmail').fill('qa@example.com');await page.locator('#loginBtn').click();
 await expect(page.locator('#cloudDetail')).toContainText('Demasiadas solicitudes');await expect(page.locator('#loginBtn')).toBeEnabled();
});
test('Android redirect is preserved and network errors are visible',async({page})=>{
 await page.addInitScript(()=>{window.TrainingLabAndroid={syncHealthConnect(){}};});
 await page.route('**/auth/v1/otp?**',route=>{expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('traininglab://auth');return route.abort();});
 await page.goto('/');await page.locator('#authEmail').fill('qa@example.com');await page.locator('#loginBtn').click();await expect(page.locator('#appError')).toContainText('Login');await expect(page.locator('#loginBtn')).toBeEnabled();
});

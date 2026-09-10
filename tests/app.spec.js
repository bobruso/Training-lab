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
 const removedManualIds=['logoutBtn','actDate','actType','actDur','actRpe','actDist','actHr','actHrMax','actKcal','sleepDate','sleepStart','sleepEnd','deepMin','remMin','sleepScoreInput','sleepHrv','sleepRhr','corosSleepStatus','todayXp','homeModeBanner'];
 expect([...new Set(refs)].filter(id=>!ids.includes(id)&&!removedManualIds.includes(id))).toEqual([]);
 await page.locator('nav [data-page="sueno"]').click();await expect(page.locator('#sueno')).toHaveClass(/on/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('password form has no magic link and reports unavailable module',async({page})=>{
 await page.route('**/app.js*',r=>r.abort());await page.goto('/');
 await page.locator('nav [data-page="ajustes"]').click();
 await expect(page.getByRole('button',{name:'Enviar enlace',exact:true})).toHaveCount(0);
 await page.locator('#authEmail').fill('qa@example.com');await page.locator('#authPassword').fill('test-password');await page.locator('[data-auth=signin]').click();
 await expect(page.locator('#cloudDetail')).toContainText('aún no está lista');
});
test('diagnostics redact tokens',async({page})=>{
 await page.goto('/');const safe=await page.evaluate(()=>window.TrainingLab.safe('Bearer hidden-token access_token=hidden-token sb_secret_hidden'));
 expect(safe).not.toContain('hidden-token');expect(safe).not.toContain('sb_secret_hidden');
});

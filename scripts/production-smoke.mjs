import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch();
const results=[];
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'allow'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://bobruso.github.io/Training-lab/?debug=1',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 for(const section of ['hoy','semana','sueno','comparar','checkin','recuperacion']){
   await page.locator('nav [data-page="'+section+'"]').click();
   if(!await page.locator('#'+section).evaluate(e=>e.classList.contains('on')))throw Error(section+' did not open');
 }
 await page.locator('nav [data-page="hoy"]').click();
 await page.screenshot({path:'test-results/production-'+width+'.png',fullPage:true});
 const state=await page.evaluate(()=>({build:window.TrainingLab.state.frontend,appReady:window.TrainingLab.state.appReady,supabase:window.TrainingLab.state.supabase,cache:window.TrainingLab.state.cache,overflow:document.documentElement.scrollWidth>innerWidth}));
 results.push({width,...state,errors});await context.close();
}
await browser.close();writeFileSync('test-results/production.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.overflow))process.exitCode=1;

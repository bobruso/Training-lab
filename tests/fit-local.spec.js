import {test,expect} from '@playwright/test';
import {fixture} from './fit-fixture.mjs';
test('guest FIT analysis is local and invalid files show an error',async({page})=>{
 let writes=0;
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>{if(route.request().method()==='POST')writes++;return route.fulfill({status:200,contentType:'application/json',body:'{}'});});
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 await page.evaluate(()=>window.navTo('entrenos'));
 await page.locator('#fitInput').setInputFiles({name:'session.fit',mimeType:'application/octet-stream',buffer:fixture()});
 await page.getByRole('button',{name:'Analizar FIT',exact:true}).click();
 await expect(page.locator('#fitResult')).toContainText('Analizado localmente');
 await expect(page.locator('#fitResult')).toContainText('6 km');
 await expect(page.locator('#fitResult')).toContainText('150');
 expect(writes).toBe(0);
 await page.locator('#fitInput').setInputFiles({name:'broken.fit',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});
 await page.getByRole('button',{name:'Analizar FIT',exact:true}).click();
 await expect(page.locator('#fitResult')).toContainText('No se pudo analizar');
});


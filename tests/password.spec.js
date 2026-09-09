import {test,expect} from '@playwright/test';
const id='11111111-1111-4111-8111-111111111111';
const user={id,email:'qa@example.com',aud:'authenticated',role:'authenticated'};
test('password login persists in WebView, updates password and never sends OTP',async({page})=>{
 let otp=0,updated=false;
 await page.addInitScript(()=>window.TrainingLabAndroid={syncHealthConnect(){}});
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.pathname.endsWith('/otp'))otp++;
 let body=[];
 if(url.pathname.endsWith('/token')){expect(url.searchParams.get('grant_type')).toBe('password');expect(req.postDataJSON().password).toBe('test-password-123');body={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};}
 if(url.pathname.endsWith('/user')){body=user;if(req.method()==='PUT'){updated=true;expect(req.postDataJSON().password).toBe('new-password-123');}}
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 await page.locator('#authEmail').fill(user.email);await page.locator('#authPassword').fill('test-password-123');await page.locator('[data-auth=signin]').click();
 await expect(page.locator('#logoutBtn')).toBeVisible();
 await page.reload();await expect(page.locator('#logoutBtn')).toBeVisible();
 await page.locator('#authPassword').fill('new-password-123');await page.locator('[data-auth=update]').click();await expect.poll(()=>updated).toBe(true);expect(otp).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('sb-nnpvklaxhomarxszlclt-auth-token'))).not.toContain('test-password');
});
test('signup confirmation, recovery and rejected passwords have clear feedback',async({page})=>{
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.route('**/auth/v1/signup*',r=>{expect(r.request().postDataJSON().password).toBe('test-password-123');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});});
 await page.route('**/auth/v1/token*',r=>r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',message:'Invalid login credentials'})}));
 await page.goto('/');await page.waitForFunction(()=>window.TrainingLab?.state.appReady);
 await page.locator('#authEmail').fill(user.email);await page.locator('#authPassword').fill('short');await page.locator('[data-auth=signup]').click();await expect(page.locator('#cloudDetail')).toContainText('8 caracteres');
 await page.locator('#authPassword').fill('test-password-123');await page.locator('[data-auth=signup]').click();await expect(page.locator('#cloudDetail')).toContainText('confirmar');
 await page.locator('#authPassword').fill('bad-password');await page.locator('[data-auth=signin]').click();await expect(page.locator('#cloudDetail')).toContainText('incorrectos');
 await page.locator('[data-auth=recover]').click();await expect(page.locator('#cloudDetail')).toContainText('Si la cuenta existe');
});

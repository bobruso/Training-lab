import {test,expect} from '@playwright/test';

const userId='22222222-2222-4222-8222-222222222222';
const runId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const gymId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test.beforeEach(async({page})=>{
 await page.addInitScript(({userId})=>{
  const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'}));
  localStorage.setItem('sb-nnpvklaxhomarxszlclt-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test',refresh_token:'fake-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:userId,email:'routes@example.com',aud:'authenticated',role:'authenticated'}}));
 },{userId});
 await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
 await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>{
  const url=new URL(route.request().url()),table=url.pathname.split('/').at(-1);
  let body=[];
  if(table==='user')body={id:userId,email:'routes@example.com'};
  if(table==='game_state')body={user_id:userId,level:1,xp:0,inventory:[]};
  if(table==='activities')body=[
   {id:runId,user_id:userId,activity_date:'2026-09-10',started_at:'2026-09-10T08:00:00Z',activity_type:'run',source:'fit',duration_min:50,moving_time_min:48,distance_km:11.11,avg_hr:148,max_hr:172,calories:610,avg_pace_sec_km:259,metrics:{}},
   {id:gymId,user_id:userId,activity_date:'2026-09-09',started_at:'2026-09-09T17:00:00Z',activity_type:'gym',source:'health_connect',duration_min:62,distance_km:null,avg_hr:null,max_hr:null,calories:320,metrics:{}}
  ];
  if(table==='activity_analysis')body=[
   {activity_id:runId,user_id:userId,summary:{distanceKm:11.11,durationSec:3000,movingTimeSec:2880,avgHr:148,maxHr:172,calories:610,avgPaceSecKm:259,elevationGainM:84},track_points:[{t:1,lat:40.4168,lon:-3.7038,hr:130,speed_kmh:10},{t:2,lat:40.42,lon:-3.69,hr:148,speed_kmh:12},{t:3,lat:40.43,lon:-3.68,hr:150,speed_kmh:11}],report:{analysis:'Análisis específico de la carrera de prueba.',strengths:['Ritmo consistente.'],improvements:['Dosificar el inicio.']}},
   {activity_id:gymId,user_id:userId,summary:{durationSec:3720,calories:320,strengthSetCount:7,totalReps:56,totalVolumeKg:2840,exercises:['Sentadilla','Press banca']},track_points:[],report:{analysis:'Análisis específico de fuerza.',strengths:[],improvements:[]}}
  ];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
});

test('activity cards hydrate routes and open the matching detail',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?debug=1');
 await expect(page.locator('.activity-card')).toHaveCount(2);
 const runPreview=page.locator(`[data-route-activity-id="${runId}"]`),gymPreview=page.locator(`[data-route-activity-id="${gymId}"]`);
 await expect(runPreview).toHaveAttribute('data-route-state','map');
 await expect(runPreview.locator('svg .route-map-line')).toHaveCount(1);
 await expect(gymPreview).toHaveAttribute('data-route-state','fallback');
 await expect(gymPreview).toContainText('GPS no disponible');

 await page.locator(`.activity-card[data-activity-id="${gymId}"]`).click();
 await expect(page.locator('#activityFeedView')).toBeHidden();
 await expect(page.locator('#activityDetailView')).toBeVisible();
 await expect(page.locator('#activityDetailView')).toContainText('7');
 await expect(page.locator('#activityDetailView')).toContainText('Análisis específico de fuerza.');
 await expect(page.locator('#activityDetailView')).not.toContainText('11.11 km');
 await expect(page.locator('#activityDetailMap')).toContainText('GPS no disponible');

 await page.locator('[data-close-activity-detail]').click();
 await expect(page.locator('#activityDetailView')).toBeHidden();
 await expect(page.locator('#activityFeedView')).toBeVisible();

 await page.evaluate(activityId=>window.openActivityDetail(activityId),runId);
 await expect(page.locator('#activityDetailView')).toContainText('11.11 km');
 await expect(page.locator('#activityDetailView')).toContainText('Análisis específico de la carrera de prueba.');
 await expect(page.locator('#activityDetailMap')).toHaveAttribute('data-route-state','map');
 await expect(page.locator('#activityDetailMap svg .route-map-line')).toHaveCount(1);
 const ids=await page.locator('[id]').evaluateAll(elements=>elements.map(element=>element.id));
 expect(ids.length).toBe(new Set(ids).size);
 await expect(page.locator('#appError')).toBeHidden();
 expect(errors).toEqual([]);
});

import {test,expect} from '@playwright/test';

const userId='33333333-3333-4333-8333-333333333333';
const currentId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const previousId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';

test.beforeEach(async({page})=>{
  await page.addInitScript(({userId})=>{
    const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'}));
    localStorage.setItem('sb-nnpvklaxhomarxszlclt-auth-token',JSON.stringify({
      access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test',refresh_token:'fake-refresh',
      expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',
      user:{id:userId,email:'insights@example.com',aud:'authenticated',role:'authenticated'}
    }));
  },{userId});
  await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await page.route('https://nnpvklaxhomarxszlclt.supabase.co/**',route=>{
    const url=new URL(route.request().url()),table=url.pathname.split('/').at(-1);
    let body=[];
    if(table==='user')body={id:userId,email:'insights@example.com'};
    if(table==='game_state')body={user_id:userId,level:1,xp:0,inventory:[]};
    if(table==='activities')body=[
      {id:currentId,user_id:userId,activity_date:'2026-09-10',started_at:'2026-09-10T08:00:00Z',activity_type:'run',source:'fit',duration_min:48,moving_time_min:47,distance_km:9.9,avg_hr:150,max_hr:172,calories:590,avg_pace_sec_km:285,metrics:{}},
      {id:previousId,user_id:userId,activity_date:'2026-09-07',started_at:'2026-09-07T08:00:00Z',activity_type:'run',source:'fit',duration_min:51,moving_time_min:50,distance_km:9.8,avg_hr:150,max_hr:171,calories:600,avg_pace_sec_km:305,metrics:{}}
    ];
    if(table==='activity_analysis')body=[
      {activity_id:currentId,user_id:userId,summary:{activityType:'run',distanceKm:9.9,durationSec:2880,movingTimeSec:2820,avgHr:150,maxHr:172,calories:590,avgPaceSecKm:285,elevationGainM:65,hrZoneReference:'profile'},track_points:[
        {t:1000,lat:40.41,lon:-3.70,hr:132,speed_kmh:10.5},{t:2000,lat:40.42,lon:-3.69,hr:145,speed_kmh:12.4},{t:3000,lat:40.43,lon:-3.68,hr:153,speed_kmh:13.2},{t:4000,lat:40.44,lon:-3.67,hr:150,speed_kmh:12.8}
      ],hr_zones:[{zone:1,min_bpm:95,max_bpm:114,seconds:180},{zone:2,min_bpm:114,max_bpm:133,seconds:480},{zone:3,min_bpm:133,max_bpm:152,seconds:1020},{zone:4,min_bpm:152,max_bpm:171,seconds:900},{zone:5,min_bpm:171,max_bpm:190,seconds:240}],speed_zones:[{name:'Trote',min:7,max:14.4,seconds:2200,distance_m:7800},{name:'Carrera',min:14.4,max:19.8,seconds:500,distance_m:1700}],report:{analysis:'Carrera actual.',strengths:['Ritmo estable.'],improvements:[]}},
      {activity_id:previousId,user_id:userId,summary:{activityType:'run',distanceKm:9.8,durationSec:3060,movingTimeSec:3000,avgHr:150,maxHr:171,calories:600,avgPaceSecKm:305,elevationGainM:60},track_points:[],hr_zones:[],speed_zones:[],report:{analysis:'Carrera anterior.',strengths:[],improvements:[]}}
    ];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
});

test('activity detail adds charts and a personal comparison without breaking navigation',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?debug=1');
  await expect(page.locator('.activity-card')).toHaveCount(2);
  await page.locator(`.activity-card[data-activity-id="${currentId}"]`).click();

  const insights=page.locator('.activity-insights-root');
  await expect(insights).toHaveAttribute('data-insights-state','ready');
  await expect(insights).toContainText('Mismo pulso, mejor ritmo');
  await expect(insights).toContainText('Comparado contigo');
  await expect(insights).toContainText('sesión anterior');
  await expect(insights.locator('[data-chart="hr"] svg')).toHaveCount(1);
  await expect(insights.locator('[data-chart="effort"] svg')).toHaveCount(1);
  await expect(insights.locator('[data-zones="hr"] .activity-zone-row')).toHaveCount(5);
  await expect(insights).not.toContainText('NaN');

  await page.locator('[data-close-activity-detail]').click();
  await expect(page.locator('#activityFeedView')).toBeVisible();
  await expect(page.locator('#activityDetailView')).toBeHidden();
  await expect(page.locator('#appError')).toBeHidden();
  expect(errors).toEqual([]);
});

test('mobile detail has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?debug=1');
  await page.locator(`.activity-card[data-activity-id="${currentId}"]`).click();
  await expect(page.locator('.activity-insights-root')).toHaveAttribute('data-insights-state','ready');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  expect(overflow).toBe(false);
});

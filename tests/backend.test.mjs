import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
function ingest({failure=false,user=true}={}){
 let handler;const writes=[];
 const client={auth:{getUser:async()=>({data:{user:user?{id:'owner'}:null},error:null})},from:table=>({upsert:async(row,options)=>{writes.push({table,row,options});return {error:failure&&table==='activities'?{code:'23514'}:null};}})};
 const source=readFileSync('supabase/functions/health-connect-ingest/index.ts','utf8').replace(/^import .*;\r?\n/,'');
 vm.runInNewContext(stripTypeScriptTypes(source),{Response,Request,createClient:()=>client,Deno:{env:{get:()=>''},serve:fn=>handler=fn}});
 return {writes,handler};
}
test('Health Connect rejects unauthenticated and invalid bodies',async()=>{
 const {handler}=ingest();assert.equal((await handler(new Request('http://local',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer test'},body:'{}'}))).status,400);
});
test('Health Connect uses verified owner, reports partial failure and never truncates',async()=>{
 const {handler,writes}=ingest({failure:true});
 const response=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({sleep:[],activities:[{user_id:'attacker',external_id:'x',activity_date:'2026-09-09',activity_type:'run'}]})}));
 assert.equal(response.status,422);assert.equal((await response.json()).ok,false);assert.equal(writes[0].row.user_id,'owner');assert.equal(writes.at(-1).row.status,'error');assert.equal(writes.at(-1).row.last_sync_at,undefined);
 const large=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({sleep:[],activities:Array(101).fill({})})}));assert.equal(large.status,400);
});
test('Health Connect success uses idempotent activity key',async()=>{
 const {handler,writes}=ingest();const r=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({sleep:[],activities:[{external_id:'x',activity_date:'2026-09-09',activity_type:'run'}]})}));
 assert.equal(r.status,200);assert.equal(writes[0].options.onConflict,'user_id,source,external_id');
});

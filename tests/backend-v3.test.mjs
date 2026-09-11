import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
function ingest({failure=false,user=true}={}){let handler;const writes=[];const client={auth:{getUser:async()=>({data:{user:user?{id:'owner'}:null},error:null})},from:table=>{const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:null,error:null}),upsert:async(row,options)=>{writes.push({table,row,options});return{error:failure&&table==='activities'?{code:'23514'}:null}}};return q}};const source=readFileSync('supabase/functions/health-connect-ingest/index.ts','utf8').replace(/^import .*;\r?\n/,'');vm.runInNewContext(stripTypeScriptTypes(source),{Response,Request,createClient:()=>client,Deno:{env:{get:()=>''},serve:fn=>handler=fn}});return{writes,handler}}
test('v3 ingest uses verified owner and idempotent activity key',async()=>{const {handler,writes}=ingest(),r=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({sleep:[],activities:[{user_id:'ignored',external_id:'x',activity_date:'2026-09-09',activity_type:'run'}]})}));assert.equal(r.status,200);const activity=writes.find(x=>x.table==='activities');assert.equal(activity.row.user_id,'owner');assert.equal(activity.options.onConflict,'user_id,source,external_id')});

const AUTH_PROJECT='nnpvklaxhomarxszlclt';
export function authState(){
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith('sb-')||!k.endsWith('-auth-token')||!k.includes(AUTH_PROJECT))continue;const p=JSON.parse(localStorage.getItem(k)||'null');if(p?.access_token)return p}}catch{}
 return null;
}
export function userId(auth=authState()){
 if(auth?.user?.id)return auth.user.id;try{let p=String(auth?.access_token||'').split('.')[1]||'';p=p.replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return JSON.parse(atob(p))?.sub||null}catch{return null}
}
export function dayKey(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))}
export async function rest(table,params={},options={}){
 const cfg=window.TrainingLab?.config,auth=authState();if(!cfg?.url||!cfg?.key||!auth?.access_token)throw new Error('Inicia sesión para sincronizar estos datos.');
 const url=new URL(`${cfg.url}/rest/v1/${table}`);for(const[k,v]of Object.entries(params||{}))if(v!==null&&v!==undefined)url.searchParams.set(k,String(v));
 const headers={apikey:cfg.key,Authorization:`Bearer ${auth.access_token}`,Accept:'application/json',...(options.headers||{})};if(options.body!==undefined)headers['Content-Type']='application/json';
 const run=window.TrainingLab?.request||fetch,res=await run(url.href,{method:options.method||'GET',headers,body:options.body===undefined?undefined:JSON.stringify(options.body),cache:'no-store'});const payload=await res.json().catch(()=>null);if(!res.ok)throw new Error(payload?.message||payload?.error||`HTTP ${res.status}`);return payload;
}
export async function edge(name,body,method='POST'){
 const cfg=window.TrainingLab?.config,auth=authState();if(!cfg?.url||!cfg?.key||!auth?.access_token)throw new Error('Inicia sesión para usar esta función.');
 const run=window.TrainingLab?.request||fetch,res=await run(`${cfg.url}/functions/v1/${name}`,{method,headers:{apikey:cfg.key,Authorization:`Bearer ${auth.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body||{}),cache:'no-store'});const payload=await res.json().catch(()=>({}));if(!res.ok)throw new Error(payload?.error||`HTTP ${res.status}`);return payload;
}
export function localDateTime(value){if(!value)return null;const d=new Date(value);return Number.isNaN(+d)?null:d}
export function canonicalSport(v){return({running:'run',bike:'cycling',biking:'cycling',cycle:'cycling',strength:'gym',soccer:'football'}[String(v||'').toLowerCase()]||String(v||'').toLowerCase())}

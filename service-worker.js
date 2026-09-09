const CACHE='training-lab-a4809ced23';
const ASSETS=['./','./index.html','./app.js?v=a4809ced23','./runtime.js?v=a4809ced23','./styles.css?v=a4809ced23','./domain.js','./vendor/supabase.js','./manifest.webmanifest','./privacy.html'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Installation is atomic: a missing asset keeps the old worker active.
  await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('training-lab-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='VERSION')event.source?.postMessage({type:'VERSION',cache:CACHE});});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL('./',self.location.href);
  if(event.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  const isDocument=event.request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===base.pathname+'index.html');
  const asset=ASSETS.some(p=>new URL(p,base).href===url.href);
  if(!isDocument&&!asset)return; // Never cache API, tokens, arbitrary paths or uploads.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(isDocument?new URL('./index.html',base).href:event.request);
    return cached || fetch(event.request);
  })());
});

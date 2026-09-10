const CACHE='training-lab-20260910iconfix83';
const ASSETS=['./','./index.html','./app.js?v=20260910iconfix83','./runtime.js?v=20260910iconfix83','./styles.css?v=20260910iconfix83','./domain.js?v=20260910share80','./vendor/supabase.js?v=20260910share80','./vendor/fit-local.js?v=20260910share80','./manifest.webmanifest','./favicon.png','./privacy.html'];
// Runtime refresh: account controls moved from Home into Ajustes / Perfil.
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
    if(isDocument){
      const indexUrl=new URL('./index.html',base).href;
      try{
        const fresh=await fetch(new Request(indexUrl,{cache:'no-store'}));
        if(fresh.ok)await cache.put(indexUrl,fresh.clone());
        return fresh;
      }catch{
        return await cache.match(indexUrl);
      }
    }
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});

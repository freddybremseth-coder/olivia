const CACHE='olivia-field-shell-v1';
const APP_SHELL=['/olivia','/site.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('olivia-field-shell-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/'))return;

  if(request.mode==='navigate'){
    if(url.pathname!=='/olivia'&&url.pathname!=='/app')return;
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response.ok){
            const clone=response.clone();
            caches.open(CACHE).then(cache=>cache.put('/olivia',clone));
          }
          return response;
        })
        .catch(async()=>{
          const cached=await caches.match('/olivia');
          return cached||Response.error();
        })
    );
    return;
  }

  const cacheable=['script','style','image','font','worker'].includes(request.destination);
  if(!cacheable)return;

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok){
          const clone=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,clone));
        }
        return response;
      }).catch(()=>cached||Response.error());
      return cached||network;
    })
  );
});

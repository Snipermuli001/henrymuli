const CACHE_NAME='project-henry-v7';
const CORE=['/','/index.html','/site.webmanifest','/slogo.png','/sphoto.png'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('project-henry-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('range'))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  // Never cache media streams or live playback requests.
  if(/\.(mp3|m4a|aac|ogg|opus|wav|mp4|webm|m3u8|mpd)(?:$|\\?)/i.test(url.pathname+url.search))return;

  const isDocument=request.mode==='navigate'||request.destination==='document'||/\.html?$/i.test(url.pathname)||url.pathname==='/';
  const isCode=/\.(js|css|json|webmanifest)$/i.test(url.pathname);

  if(isDocument||isCode){
    // Network-first ensures deployed HTML, JavaScript and styles are preferred.
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response&&response.ok)event.waitUntil(cache.put(request,response.clone()));
        return response;
      }catch(error){
        const cached=await cache.match(request)||await cache.match('/index.html');
        if(cached)return cached;
        throw error;
      }
    })());
    return;
  }

  // Images and other static assets can load quickly from cache while refreshing in background.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    const network=fetch(request).then(response=>{
      if(response&&response.ok)event.waitUntil(cache.put(request,response.clone()));
      return response;
    }).catch(()=>cached);
    return cached||network;
  })());
});

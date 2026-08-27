const VERSION='psp-v1';
const SHELL=['/','/index.html','/offline.html','/manifest.webmanifest','/icons/icon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/assets/hero-depot.webp','/privacy/','/terms/'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();const updated=keys.some(key=>key!==VERSION);await Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)));await self.clients.claim();if(updated){const clients=await self.clients.matchAll({type:'window'});clients.forEach(client=>client.postMessage({type:'APP_UPDATED'}));}})())});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy));return response}).catch(async()=>await caches.match(event.request)||await caches.match('/offline.html')));
  else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(VERSION).then(cache=>cache.put(event.request,response.clone()));return response})));
});

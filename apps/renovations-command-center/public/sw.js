const CACHE = "rcc-public-shell-v1";
const STATIC = ["/offline.html", "/icon.svg", "/manifest.webmanifest"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("rcc-public-shell-") && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
 const request=event.request,url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin)return;
 // Never cache backend responses, evidence, API routes or authenticated project documents.
 if(url.pathname.startsWith("/_next/static/")||STATIC.includes(url.pathname)) {
  event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}));
 } else if(request.mode==="navigate") {
  event.respondWith(fetch(request).catch(()=>caches.match("/offline.html")));
 }
});

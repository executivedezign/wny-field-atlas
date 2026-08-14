// WNY Field Atlas — service worker (v3, network-first shell)
// Online-first for the HTML + data so updates always appear when you have signal;
// cache-first only for the big stable libraries/icons; falls back to cache offline.
const CACHE = "wny-atlas-v3";
const ASSETS = [
  "./vendor/maplibre-gl.js", "./vendor/maplibre-gl.css", "./vendor/pmtiles.js",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(
    keys.filter(k=> k!==CACHE).map(k=> caches.delete(k)))).then(()=> self.clients.claim()));
});
self.addEventListener("fetch", (e)=>{
  const url = e.request.url;
  if(url.includes("tile.openstreetmap.org")) return;            // base tiles: straight to network
  const isAsset = ASSETS.some(a => url.endsWith(a.replace("./","")));
  if(isAsset){
    // cache-first for the stable vendored libs + icons
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r=>{
      const copy = r.clone(); caches.open(CACHE).then(c=> c.put(e.request, copy)); return r;
    })));
  } else {
    // network-first for the HTML shell + data.geojson (+ anything else) — always fresh online
    e.respondWith(
      fetch(e.request).then(r=>{
        if(r.ok && url.startsWith(self.location.origin)){
          const copy = r.clone(); caches.open(CACHE).then(c=> c.put(e.request, copy));
        }
        return r;
      }).catch(()=> caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
  }
});

// WNY Field Atlas — service worker (v4)
// Precache the FULL shell (so a fresh install works offline in the field even if the
// first visit had no chance to warm the runtime cache), but at runtime serve the HTML
// + data NETWORK-FIRST (always fresh online, cached copy as the offline fallback) and
// the big stable libs/icons CACHE-FIRST.
const CACHE = "wny-atlas-v4";

// everything needed to open the app offline
const PRECACHE = [
  "./", "./index.html", "./data.geojson",
  "./vendor/maplibre-gl.js", "./vendor/maplibre-gl.css", "./vendor/pmtiles.js",
  "./icon-192.png", "./icon-512.png"
];
// of those, the ones served cache-first at runtime (stable, big); everything else is network-first
const CACHE_FIRST = [
  "./vendor/maplibre-gl.js", "./vendor/maplibre-gl.css", "./vendor/pmtiles.js",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(PRECACHE)).then(()=> self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(
    keys.filter(k=> k!==CACHE).map(k=> caches.delete(k)))).then(()=> self.clients.claim()));
});
self.addEventListener("fetch", (e)=>{
  const url = e.request.url;
  if(url.includes("tile.openstreetmap.org")) return;            // base tiles: straight to network
  const cacheFirst = CACHE_FIRST.some(a => url.endsWith(a.replace("./","")));
  if(cacheFirst){
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r=>{
      const copy = r.clone(); caches.open(CACHE).then(c=> c.put(e.request, copy)); return r;
    })));
  } else {
    // network-first for the HTML shell + data.geojson: fresh online, cached copy offline
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

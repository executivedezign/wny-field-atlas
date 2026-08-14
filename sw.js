// WNY Field Atlas — service worker (offline app shell)
const CACHE = "wny-atlas-v2";   // bump on every shell change so installed apps update
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./data.geojson",
  "./vendor/maplibre-gl.js", "./vendor/maplibre-gl.css", "./vendor/pmtiles.js"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(SHELL)).then(()=> self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(
    keys.filter(k=> k!==CACHE).map(k=> caches.delete(k)))).then(()=> self.clients.claim()));
});
self.addEventListener("fetch", (e)=>{
  const url = e.request.url;
  // OSM base tiles: network-first, don't fill the cache with the whole world.
  if(url.includes("tile.openstreetmap.org")) return;
  // Everything else (app shell + libs + data): cache-first, fall back to network.
  e.respondWith(
    caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{
      const copy = res.clone();
      if(res.ok && (url.startsWith(self.location.origin) || url.includes("unpkg.com")))
        caches.open(CACHE).then(c=> c.put(e.request, copy));
      return res;
    }).catch(()=> hit))
  );
});

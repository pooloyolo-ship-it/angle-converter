const CACHE = "angle-converter-v1";
const ASSETS = ["./","./index.html","./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // CDNはオンライン取得＋キャッシュ
  if (url.origin.includes("unpkg.com") || url.hostname === "cdn.tailwindcss.com") {
    e.respondWith(
      fetch(e.request)
        .then(resp => { caches.open(CACHE).then(c=>c.put(e.request, resp.clone())); return resp; })
        .catch(()=>caches.match(e.request))
    );
    return;
  }

  // それ以外は cache-first
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(resp=>{ caches.open(CACHE).then(c=>c.put(e.request, resp.clone())); return resp; })
        .catch(()=>caches.match("./index.html"))
    )
  );
});

// Offline-cache: pagina is ook zonder internet te openen. Netwerk eerst, zodat updates direct binnenkomen.
const CACHE = 'boodschappen-2026-10-18h';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Google/Gmail e.d. nooit cachen
  e.respondWith(fetch(req).then(function (res) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('index.html'); }); }));
});

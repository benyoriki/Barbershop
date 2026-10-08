/* Service worker — Barbershop Tanteh Susi
   Strategi: shell dicache saat instal; halaman = jaringan dulu (selalu terbaru) lalu cache;
   aset statis = cache dulu + perbarui di belakang. Naikkan VERSION setiap rilis. */
var VERSION = 'ts-v2';
var CORE = [
  './', 'index.html', 'style.css', 'script.js', 'pwa.js', 'manifest.webmanifest',
  'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/capster-susi.jpg', 'img/capster-nia.jpg', 'img/capster-rani.jpg', 'img/capster-dinda.jpg', 'img/capster-wulan.jpg'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fontHost = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fontHost) return; // peta/iframe & lainnya: biarkan langsung
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copy); });
      return res;
    }).catch(function () { return caches.match('index.html').then(function (r) { return r || caches.match('./'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && (res.status === 200 || res.type === 'opaque')) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});

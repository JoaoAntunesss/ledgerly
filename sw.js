/* Ledgerly service worker: app shell works offline. Bump CACHE when files change. */
const CACHE = 'ledgerly-v15';
const FILES = ['./', './index.html', './style.css', './js/app.js', './js/i18n.js', './js/fx.js', './js/three.min.js', './manifest.json','./fonts/bricolage-grotesque-latin-wght-normal.woff2','./fonts/figtree-latin-wght-normal.woff2', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});

/* Ledgerly service worker: app shell works offline. Bump CACHE when files change.
   Also: receives files from Android "Share" (manifest share_target) and checks bills due while the app is closed
   (periodic background sync), with a "I paid it" button on the notification. */
const CACHE = 'ledgerly-v25';
const FILES = ['./', './index.html', './style.css', './js/config.js', './js/app.js', './js/i18n.js', './js/fx.js', './js/three.min.js', './manifest.json','./fonts/bricolage-grotesque-latin-wght-normal.woff2','./fonts/figtree-latin-wght-normal.woff2', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'ledgerly-due' && k !== 'ledgerly-share').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData(), c = await caches.open('ledgerly-share');
        for (const f of form.getAll('files')) if (f && f.size) await c.put('./shared/' + Date.now() + '-' + encodeURIComponent(f.name || 'fatura'), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream' } }));
      } catch (err) { }
      return Response.redirect('./index.html#/docs/shared', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
async function checkDue() {
  const c = await caches.open('ledgerly-due'), r = await c.match('./__due.json'); if (!r) return;
  const data = await r.json(), seenR = await c.match('./__seen.json'), seen = seenR ? await seenR.json() : {};
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), pt = data.pt;
  const fmt = a => { try { return new Intl.NumberFormat(pt ? 'pt-PT' : undefined, { style: 'currency', currency: data.cur || 'EUR' }).format(a); } catch (e) { return a + ' €'; } };
  for (const u of data.list || []) {
    if (u.d > soon || seen[u.id] === today) continue;
    const late = u.d < today, title = u.w ? u.t : (late ? (pt ? 'Em atraso: ' : 'Overdue: ') : u.d === today ? (pt ? 'Termina hoje: ' : 'Due today: ') : (pt ? 'A pagar até ' + u.d.split('-').reverse().join('/') + ': ' : 'Due ' + u.d + ': ')) + u.t;
    await self.registration.showNotification(title, { body: u.w ? u.d : fmt(u.a), tag: 'ledgerly-' + u.id, data: { id: u.id }, icon: './icon-192.png', actions: u.w ? [] : [{ action: 'pay', title: pt ? '✓ Já paguei' : '✓ I paid it' }] });
    seen[u.id] = today;
  }
  await c.put('./__seen.json', new Response(JSON.stringify(seen)));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'ledgerly-due') e.waitUntil(checkDue()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = (e.notification.data || {}).id, target = e.action === 'pay' && id ? './index.html#/docs/pay/' + id : './index.html#/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => { for (const w of ws) { if ('focus' in w) { w.navigate(target); return w.focus(); } } return self.clients.openWindow(target); }));
});

/* Focus TDAH: service worker. Guarda la app para usarla sin internet y maneja los toques en las notificaciones. */
const CACHE = 'focus-tdah-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La app: primero la red (para recibir actualizaciones), si no hay conexión, la copia guardada.
// Fuentes de Google: primero la copia guardada.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
  }
});

// Tocar la notificación o uno de sus botones: abre la app y le pasa la acción.
self.addEventListener('notificationclick', e => {
  const action = e.action || 'open';
  const id = e.notification.data && e.notification.data.id;
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let client = all[0];
    if (client) { try { await client.focus(); } catch (_) {} }
    else client = await self.clients.openWindow('./');
    if (client) client.postMessage({ type: 'notif-action', id, action });
  })());
});

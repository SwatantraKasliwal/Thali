// v3 dropped all API caching (a cached /api/ fallback could replay one user's
// personal data to another on a shared device) — we still NEVER touch /api/.
// v4 makes navigations network-first: cache-first on the HTML shell pinned an
// installed PWA to whatever build it first saw, so shipped UI changes never
// arrived. Bump CACHE on every release that must invalidate the shell.
const CACHE = 'thali-v4';
const PRECACHE = ['/', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Let the app force-clear the cache (e.g. on logout / session expiry).
self.addEventListener('message', e => {
  if (e.data === 'clear-cache') {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }
});

// ── Web Push: show the nightly meal reminder ────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { /* non-JSON payload */ }

  const title = data.title || 'Thali';
  e.waitUntil(
    self.registration.showNotification(title, {
      body:  data.body || '',
      icon:  '/logo.svg',
      badge: '/logo.svg',
      tag:   data.tag || 'thali-reminder',   // one reminder replaces the prior
      renotify: true,
      data:  { url: data.url || '/' },
    })
  );
});

// Focus an open tab (or open one) when the notification is tapped.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(target); return c.focus(); }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});

function putInCache(request, response) {
  const clone = response.clone();
  caches.open(CACHE).then(c => c.put(request, clone));
}

// Network-first: always try for a fresh document, fall back to the cached shell
// when offline. Keeps the installed PWA on the latest build.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') putInCache(request, res);
    return res;
  } catch (err) {
    const cached = (await caches.match(request)) || (await caches.match('/'));
    if (cached) return cached;
    throw err;
  }
}

// Cache-first: only for content-hashed, immutable assets.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') putInCache(request, res);
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never cache or serve API traffic from the SW — always go to the network.
  // Authenticated, user-specific data must never be persisted on the device.
  if (url.pathname.startsWith('/api/')) return;

  // Only handle same-origin static assets; let everything else pass through.
  if (url.origin !== self.location.origin) return;

  // Hashed build output is immutable — safe (and fastest) to serve from cache.
  const immutable =
    url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');

  e.respondWith(immutable ? cacheFirst(e.request) : networkFirst(e.request));
});

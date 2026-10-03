/* Bahrna service worker: keeps the app itself available with no internet.
 * - App pages and their JavaScript are pre-cached on install.
 * - Pages: network first (3 s), then the saved copy, so updates arrive when online.
 * - Built files (/_next/static): cache first (they never change once built).
 * - API calls and map tiles are NOT handled here (the app caches those itself). */
const SHELL = 'bahrna-shell-v3';
const PAGES = ['/', '/navigate', '/safety', '/trips', '/fishing', '/learn', '/settings', '/map'];

async function precache() {
  const c = await caches.open(SHELL);
  for (const p of PAGES) {
    try {
      const r = await fetch(p, { cache: 'no-store' });
      if (!r.ok) continue;
      await c.put(p, r.clone());
      const html = await r.text();
      const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
      await Promise.all(urls.map((u) => c.match(u).then((hit) => hit || c.add(u)).catch(() => {})));
    } catch { /* offline during install: try again next time */ }
  }
  await Promise.all(['/manifest.json', '/icon-192.png', '/apple-touch-icon.png'].map((u) => c.add(u).catch(() => {})));
}

self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('bahrna-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'refresh-shell') e.waitUntil(precache()); });

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tiles, weather APIs: not ours
  if (url.pathname.startsWith('/api/')) return; // live data: app keeps its own offline copy
  if (url.pathname === '/sw.js') return;

  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const key = url.pathname.replace(/\/$/, '') || '/';
      try {
        const r = await Promise.race([fetch(req), timeout(3000)]);
        if (r.ok) c.put(key, r.clone());
        return r;
      } catch {
        return (await c.match(key)) || (await c.match('/navigate')) || (await c.match('/')) ||
          new Response('<h1>Offline</h1><p>Open Bahrna once with internet so it can work offline.</p>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Other same-origin files (icons, manifest): cache, refresh in the background.
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

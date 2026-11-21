const CACHE = 'konzert-v3'
const EVENTS_CACHE = 'lebe-events'
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/konzert-app/', '/konzert-app/index.html'])))
  self.skipWaiting()
})
self.addEventListener('activate', e => {
  // Gleiche Domain wie CineLords (geteilter Cache-Speicher): nur eigene alte App-Caches löschen (lebe-photos/lebe-events bleiben)
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('konzert-') && k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  // events.json: sofort aus dem Gerätespeicher (App-Start wartet nicht aufs Netz), im Hintergrund neu laden.
  // Hat sich die Liste geändert, bekommt die Seite eine Nachricht und übernimmt sie (siehe applyEventsUpdate in app.js).
  if (new URL(e.request.url).pathname.endsWith('/events.json')) {
    e.respondWith(caches.open(EVENTS_CACHE).then(async cache => {
      const cached = await cache.match('events.json')
      const update = fetch(e.request.url, { cache: 'no-cache' }).then(async res => {
        if (!res.ok) return res
        const old = cached ? await (await cache.match('events.json')).text() : null   // frische Kopie: `cached` geht schon an die Seite
        await cache.put('events.json', res.clone())
        if (old !== null && old !== await res.clone().text()) {
          (await self.clients.matchAll()).forEach(c => c.postMessage({ type: 'events-updated' }))
        }
        return res
      })
      e.waitUntil(update.catch(() => {}))
      return cached || update
    }))
    return
  }
  // HTML-Dokument immer vom Netz holen (damit neue JS-Bundles sofort greifen)
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
    return
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
})
self.addEventListener('install', e => e.waitUntil(
  caches.open('konzert-v1').then(c => c.addAll(['/konzert-app/', '/konzert-app/index.html']))
))
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
))
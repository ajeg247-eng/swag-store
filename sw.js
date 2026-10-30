const CACHE_NAME = 'swag-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './swag-icon-192.png', './swag-icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.filter(path => path !== './index.html'));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('swag-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // No interceptar Supabase, autenticación, APIs ni solicitudes que no sean GET del mismo origen.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) { const cache = await caches.open(CACHE_NAME); cache.put('./', response.clone()); }
        return response;
      } catch (error) {
        return (await caches.match(request)) || (await caches.match('./'));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') { const cache = await caches.open(CACHE_NAME); cache.put(request, response.clone()); }
      return response;
    } catch (error) { return cached || Response.error(); }
  })());
});

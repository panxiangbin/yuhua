/* CNC Service Worker 紧急停用版：清缓存、自我注销，不再拦截页面。 */
const CNC_BUILD = '20260720i';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});

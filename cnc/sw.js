/**
 * CNC速查助手 - Safe Service Worker
 * 当前临时策略：不缓存、不注入、不改写任何资源。
 * 目的：清理旧缓存，避免首页样式、脚本和视频被错误缓存影响。
 */
const CACHE_NAME = 'cnc-cache-safe-20260709';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

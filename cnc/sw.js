/**
 * CNC速查助手 - Service Worker 清理版
 * 目的：清理旧缓存并注销 Service Worker，避免继续显示旧的课程脚本。
 * 说明：当前网站直接走 GitHub Pages 网络文件，后续更新更容易生效。
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', () => {
  return;
});

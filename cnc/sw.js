/**
 * CNC速查助手 - Service Worker
 * PWA 离线支持：首次访问缓存核心资源，后续采用 Network First + Cache Fallback 策略
 * 缓存名称：cnc-cache-v1
 */
const CACHE_NAME = 'cnc-cache-v1';

const ASSETS_TO_CACHE = [
  '/yuhua/cnc/',
  '/yuhua/cnc/index.html',
  '/yuhua/cnc/manifest.json',
  '/yuhua/cnc/styles.css',
  '/yuhua/cnc/styles-enhanced.css',
  '/yuhua/cnc/theme-tech.css',
  '/yuhua/cnc/data.js',
  '/yuhua/cnc/kb-extra.js',
  '/yuhua/cnc/app.js',
  '/yuhua/cnc/gallery-featured.js',
  '/yuhua/cnc/alarm-data.js',
  '/yuhua/cnc/weak-category-data.js',
  '/yuhua/cnc/gm-code-complete.js',
  '/yuhua/cnc/search-aliases.js',
  '/yuhua/cnc/featured-images.js',
  '/yuhua/cnc/featured-images-extended.js',
  '/yuhua/cnc/featured-images-part2.js',
  '/yuhua/cnc/featured-images-supplement.js',
  '/yuhua/cnc/gallery-library.js',
  '/yuhua/cnc/gallery-library-enhanced.js',
  '/yuhua/cnc/frontend-data-layer.js',
  '/yuhua/cnc/runtime-env-detector.js',
  '/yuhua/cnc/runtime-config.js',
  '/yuhua/cnc/runtime-loader.js',
  '/yuhua/cnc/runtime-diagnostic.js',
  '/yuhua/cnc/runtime-data-loader.js',
  '/yuhua/cnc/runtime-search-layer.js',
  '/yuhua/cnc/runtime-image-layer.js',
  '/yuhua/cnc/kb-content-manifest.js',
  '/yuhua/cnc/ui-knowledge-tree.js',
  '/yuhua/cnc/ui-recommendations.js',
  '/yuhua/cnc/study-entry-rules.js',
  '/yuhua/cnc/learning-content-data.js',
  '/yuhua/cnc/json-loader.js',
  '/yuhua/cnc/KnowledgeGraph.js',
  '/yuhua/cnc/search-runtime-debug.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event - precaching assets');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets for offline use');
        return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] All core assets cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Precaching failed:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event - cleaning old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          if (event.request.mode === 'navigate' || 
              (event.request.destination === 'document' && event.request.url.endsWith('/'))) {
            return caches.match('/yuhua/cnc/index.html');
          }

          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

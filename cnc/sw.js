/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260726-pwa2';
const STATIC_CACHE = `cnc-static-${BUILD}`;
const RUNTIME_CACHE = `cnc-runtime-${BUILD}`;

const REQUIRED_CORE_PATHS = [
  './index.html',
  './offline.html',
  './pwa-status.html',
  './pwa-self-test.html',
  './pages-status.html',
  './build-info.json'
];

const OPTIONAL_CORE_PATHS = [
  './manifest.webmanifest',
  './styles.css',
  './styles-enhanced.css',
  './app.js',
  './training-camp.html',
  './practice.html',
  './profile.html',
  './simulator-hub.html',
  './data-backup.html',
  './data-health.html'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

function requestFor(path) {
  return new Request(scopeUrl(path), {
    cache: 'reload',
    credentials: 'same-origin'
  });
}

async function fetchAndCache(cache, path) {
  const request = requestFor(path);
  const response = await fetch(request);
  if (!response.ok) {
    throw new Error(`${path} HTTP ${response.status}`);
  }
  await cache.put(request, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    await caches.open(RUNTIME_CACHE);

    // 安装只强制缓存最小可用离线壳，避免大型或非关键资源拖死激活。
    for (const path of REQUIRED_CORE_PATHS) {
      await fetchAndCache(staticCache, path);
    }

    // 非关键资源尽力缓存；失败不会阻止核心离线能力激活。
    await Promise.allSettled(
      OPTIONAL_CORE_PATHS.map((path) => fetchAndCache(staticCache, path))
    );

    for (const path of REQUIRED_CORE_PATHS) {
      const match = await staticCache.match(requestFor(path));
      if (!match) {
        throw new Error(`CNC PWA核心离线资源缺失：${path}`);
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('cnc-') && !name.endsWith(BUILD))
        .map((name) => caches.delete(name))
    );
    await caches.open(STATIC_CACHE);
    await caches.open(RUNTIME_CACHE);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_BUILD') {
    const target = event.ports && event.ports[0] ? event.ports[0] : event.source;
    if (target) {
      target.postMessage({ type: 'CNC_SW_BUILD', build: BUILD });
    }
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached || caches.match(requestFor('./offline.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const refresh = fetch(request)
      .then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    return cached || await refresh || new Response('', {
      status: 504,
      statusText: 'Offline'
    });
  })());
});

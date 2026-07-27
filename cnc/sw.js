/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260726-pwa2';
const STATIC_CACHE = `cnc-static-${BUILD}`;
const RUNTIME_CACHE = `cnc-runtime-${BUILD}`;
const INSTALL_DIAGNOSTIC_PATH = './pwa-install-diagnostics.json';

const REQUIRED_CORE_PATHS = [
  './index.html',
  './offline.html',
  './pwa-status.html',
  './pwa-self-test.html',
  './pages-status.html',
  './build-info.json'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: 'reload',
      credentials: 'same-origin',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function cacheCoreBestEffort() {
  const staticCache = await caches.open(STATIC_CACHE);
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const failures = [];

  await Promise.all(REQUIRED_CORE_PATHS.map(async (path) => {
    try {
      const url = scopeUrl(path);
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await staticCache.put(url, response.clone());
    } catch (error) {
      failures.push({ path, error: String(error && error.message ? error.message : error) });
    }
  }));

  await runtimeCache.put(scopeUrl(INSTALL_DIAGNOSTIC_PATH), new Response(JSON.stringify({
    build: BUILD,
    checkedAt: new Date().toISOString(),
    cached: REQUIRED_CORE_PATHS.length - failures.length,
    total: REQUIRED_CORE_PATHS.length,
    failures
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // 单个核心资源失败只记录诊断，不再让整个Worker安装报废。
    await cacheCoreBestEffort();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 先接管作用域内已打开页面，再做缓存清理，缩短首次接管窗口。
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('cnc-') && !name.endsWith(BUILD))
        .map((name) => caches.delete(name))
    );
    await caches.open(STATIC_CACHE);
    await caches.open(RUNTIME_CACHE);
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
  if(request.method!=='GET') return;

  const url = new URL(request.url);
  if(url.origin!==location.origin) return;

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
        return cached || caches.match(scopeUrl('./offline.html'));
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

/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260730-pwa5';
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

async function writeInstallDiagnostic(payload) {
  try {
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    await runtimeCache.put(scopeUrl(INSTALL_DIAGNOSTIC_PATH), new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }));
  } catch (error) {
    console.warn('[CNC PWA] install diagnostic unavailable', error);
  }
}

async function cacheCoreBestEffort() {
  const failures = [];
  let cached = 0;

  try {
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.all(REQUIRED_CORE_PATHS.map(async (path) => {
      try {
        const url = scopeUrl(path);
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await staticCache.put(url, response.clone());
        cached += 1;
      } catch (error) {
        failures.push({ path, error: String(error && error.message ? error.message : error) });
      }
    }));
  } catch (error) {
    failures.push({ path: 'cache-open', error: String(error && error.message ? error.message : error) });
  }

  await writeInstallDiagnostic({
    build: BUILD,
    checkedAt: new Date().toISOString(),
    cached,
    total: REQUIRED_CORE_PATHS.length,
    failures
  });
}

async function cleanupOldCachesBestEffort() {
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('cnc-') && !name.endsWith(BUILD))
        .map((name) => caches.delete(name).catch(() => false))
    );
  } catch (error) {
    console.warn('[CNC PWA] old cache cleanup unavailable', error);
  }
}

function startBackgroundMaintenance() {
  Promise.allSettled([
    cleanupOldCachesBestEffort(),
    cacheCoreBestEffort()
  ]).catch(() => {});
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    self.skipWaiting().catch((error) => {
      console.warn('[CNC PWA] skipWaiting unavailable', error);
    })
  );
});

self.addEventListener('activate', (event) => {
  // 激活门禁只依赖 clients.claim()：网络、Cache API 或预缓存异常不得再阻止注册生效。
  event.waitUntil(
    self.clients.claim()
      .catch((error) => {
        console.warn('[CNC PWA] clients.claim unavailable', error);
      })
      .then(() => {
        startBackgroundMaintenance();
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().catch(() => {});
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
          try {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, fresh.clone());
          } catch (error) {
            console.warn('[CNC PWA] navigation cache write unavailable', error);
          }
        }
        return fresh;
      } catch {
        const cached = await caches.match(request).catch(() => null);
        const fallback = await caches.match(scopeUrl('./offline.html')).catch(() => null);
        return cached || fallback || new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request).catch(() => null);
    const refresh = fetch(request)
      .then(async (response) => {
        if (response && response.ok) {
          try {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, response.clone());
          } catch (error) {
            console.warn('[CNC PWA] runtime cache write unavailable', error);
          }
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

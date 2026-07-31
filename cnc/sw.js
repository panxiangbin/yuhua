/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260731-pwa7';
const STATIC_CACHE = `cnc-static-${BUILD}`;
const RUNTIME_CACHE = `cnc-runtime-${BUILD}`;
const INSTALL_DIAGNOSTIC_PATH = './pwa-install-diagnostics.json';
const OFFLINE_FALLBACK_PATH = './offline.html';
const EMERGENCY_OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#365b72">
  <meta name="robots" content="noindex,nofollow">
  <title>网络暂时不可用｜数控小潘 CNC随身助手</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#f2efe8;color:#292d30;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
    main{min-height:100vh;display:grid;place-items:center;padding:22px}
    section{max-width:560px;background:#fffdf8;border:1px solid #d8d2c6;border-radius:16px;box-shadow:0 8px 24px rgba(48,44,36,.09);padding:24px}
    strong{color:#365b72}
    h1{font-size:30px;margin:10px 0}
    p{line-height:1.7;color:#687078}
    .notice{border-left:4px solid #8a5a16;background:#f8f5ef;padding:12px;border-radius:8px}
    button{width:100%;min-height:48px;margin-top:18px;border:0;border-radius:12px;background:#365b72;color:#fff;font-weight:900;font-size:16px;cursor:pointer}
  </style>
</head>
<body>
  <main>
    <section>
      <strong>CNC离线模式</strong>
      <h1>网络暂时不可用</h1>
      <p>离线回退页尚未写入缓存，但已经缓存过的页面仍可能继续打开。恢复网络后请重新加载。</p>
      <p class="notice"><b>安全提醒：</b>离线内容可能不是最新版本。报警、参数、刀补和现场操作必须再次核对机床原厂手册、企业安全制度和现场条件。</p>
      <button type="button" onclick="location.reload()">重新连接</button>
    </section>
  </main>
</body>
</html>`;

const REQUIRED_CORE_PATHS = [
  './index.html',
  OFFLINE_FALLBACK_PATH,
  './pwa-status.html',
  './pwa-self-test.html',
  './pages-status.html',
  './build-info.json'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

function createEmergencyOfflineResponse() {
  return new Response(EMERGENCY_OFFLINE_HTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '60',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
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

async function cacheOfflineFallbackBestEffort() {
  const url = scopeUrl(OFFLINE_FALLBACK_PATH);
  try {
    const staticCache = await caches.open(STATIC_CACHE);
    const existing = await staticCache.match(url);
    if (existing) return { cached: true, source: 'existing' };

    const response = await fetchWithTimeout(url, 5000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await staticCache.put(url, response.clone());
    return { cached: true, source: 'network' };
  } catch (error) {
    console.warn('[CNC PWA] offline fallback cache unavailable', error);
    return {
      cached: false,
      error: String(error && error.message ? error.message : error)
    };
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
  // The normal offline page is attempted before activation. If that best-effort
  // cache write still fails, navigation handling has an inline emergency page,
  // so users never fall through to an unhelpful plain-text "Offline" response.
  event.waitUntil(
    Promise.allSettled([
      cacheOfflineFallbackBestEffort(),
      self.skipWaiting()
    ])
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
        const staticCache = await caches.open(STATIC_CACHE).catch(() => null);
        const fallback = staticCache
          ? await staticCache.match(scopeUrl(OFFLINE_FALLBACK_PATH), { ignoreSearch: true }).catch(() => null)
          : null;
        return cached || fallback || createEmergencyOfflineResponse();
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

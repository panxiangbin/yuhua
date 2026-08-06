/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260806-pwa14';
const CACHE_REVISION = '20260806-learning14';
const STATIC_CACHE = `cnc-static-${CACHE_REVISION}`;
const RUNTIME_CACHE = `cnc-runtime-${CACHE_REVISION}`;
const INSTALL_DIAGNOSTIC_PATH = './pwa-install-diagnostics.json';

const REQUIRED_CORE_PATHS = [
  './index.html',
  './homepage-refresh.css',
  './homepage-refresh-desktop-legacy.css',
  './mobile-home-refactor.css',
  './personal-home.js',
  './learning-sublesson-catalog.js',
  './learning-depth.css',
  './learning-detail.html',
  './mobile-trust-nav.js',
  './featured-images-supplement.js',
  './offline.html',
  './pwa-status.html',
  './pwa-self-test.html',
  './pages-status.html',
  './beginner-placement.html',
  './training-camp.html',
  './course-safety-foundation.html',
  './course-coordinate-axes.html',
  './course-g00-g01-basics.html',
  './ai-teacher.html',
  './ai-teacher-intake.html',
  './ai-teacher-explainability.html',
  './build-info.json',
  './assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp',
  './assets/images/batch02_operation_basics/machine-init-flow-001.webp',
  './assets/images/batch04_milling_tooling/milling-process-overview-001.webp',
  './assets/images/batch01_core/measure-reading-set-001.webp',
  './assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp',
  './assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp',
  './assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp',
  './assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp',
  './assets/images/batch02_operation_basics/single-block-dry-run-001.webp',
  './assets/images/batch04_milling_tooling/milling-contour-001.webp',
  './assets/images/batch02_operation_basics/canned-cycle-overview-001.webp',
  './assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

function createOfflineResponse(status = 503) {
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>网络暂时不可用</title></head><body><main><h1>网络暂时不可用</h1><p>离线页面缓存暂未就绪，请恢复网络后重试。</p><p>报警、参数、刀补和现场操作请以机床原厂手册、企业安全制度和现场条件为准。</p></main></body></html>`, {
    status,
    statusText: status === 200 ? 'OK' : 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
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
    await runtimeCache.put(scopeUrl(INSTALL_DIAGNOSTIC_PATH), new Response(JSON.stringify({
      build: BUILD,
      cacheRevision: CACHE_REVISION,
      ...payload
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }));
  } catch {
    // 诊断属于辅助能力，缓存配额或浏览器存储异常不能让 Worker 安装失败。
  }
}

async function ensureStaticCacheShell() {
  const staticCache = await caches.open(STATIC_CACHE);
  const offlineUrl = scopeUrl('./offline.html');
  if (!await staticCache.match(offlineUrl)) {
    await staticCache.put(offlineUrl, createOfflineResponse(200));
  }
  const names = await caches.keys();
  if (!names.includes(STATIC_CACHE)) throw new Error('static cache shell missing after put');
  return staticCache;
}

async function cacheCoreBestEffort() {
  const failures = [];
  let staticCache;

  try {
    staticCache = await ensureStaticCacheShell();
  } catch (error) {
    failures.push({ path: '__static_cache__', error: String(error && error.message ? error.message : error) });
  }

  if (staticCache) {
    for (const path of REQUIRED_CORE_PATHS) {
      try {
        const url = scopeUrl(path);
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await staticCache.put(url, response.clone());
      } catch (error) {
        failures.push({ path, error: String(error && error.message ? error.message : error) });
      }
    }
  }

  await writeInstallDiagnostic({
    checkedAt: new Date().toISOString(),
    cached: staticCache ? REQUIRED_CORE_PATHS.length - failures.filter(item => item.path !== '__static_cache__').length : 0,
    total: REQUIRED_CORE_PATHS.length,
    failures
  });

  return failures;
}

async function ensureCurrentCaches() {
  await ensureStaticCacheShell();
  await caches.open(RUNTIME_CACHE);
  await cacheCoreBestEffort();
  const names = await caches.keys();
  return names.includes(STATIC_CACHE) && names.includes(RUNTIME_CACHE);
}

async function offlineFallbackResponse() {
  const cached = await caches.match(scopeUrl('./offline.html'));
  return cached || createOfflineResponse();
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      await cacheCoreBestEffort();
    } catch (error) {
      await writeInstallDiagnostic({
        checkedAt: new Date().toISOString(),
        cached: 0,
        total: REQUIRED_CORE_PATHS.length,
        failures: [{ path: '__install__', error: String(error && error.message ? error.message : error) }]
      });
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('cnc-') && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
        .map((name) => caches.delete(name))
    );

    try {
      await ensureCurrentCaches();
    } catch (error) {
      await writeInstallDiagnostic({
        checkedAt: new Date().toISOString(),
        cached: 0,
        total: REQUIRED_CORE_PATHS.length,
        failures: [{ path: '__activate__', error: String(error && error.message ? error.message : error) }]
      });
      throw error;
    }
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
      target.postMessage({ type: 'CNC_SW_BUILD', build: BUILD, cacheRevision: CACHE_REVISION });
    }
  }
  if (event.data && event.data.type === 'ENSURE_CACHES') {
    const target = event.ports && event.ports[0] ? event.ports[0] : event.source;
    event.waitUntil((async () => {
      let ready = false;
      try {
        ready = await ensureCurrentCaches();
      } catch (error) {
        await writeInstallDiagnostic({
          checkedAt: new Date().toISOString(),
          cached: 0,
          total: REQUIRED_CORE_PATHS.length,
          failures: [{ path: '__message_repair__', error: String(error && error.message ? error.message : error) }]
        });
      }
      if (target) target.postMessage({ type: 'CNC_CACHES_READY', build: BUILD, cacheRevision: CACHE_REVISION, ready });
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, fresh.clone());
          return fresh;
        }

        const cached = await caches.match(request);
        if (cached) return cached;

        if (self.navigator && self.navigator.onLine === false) {
          return offlineFallbackResponse();
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached || offlineFallbackResponse();
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

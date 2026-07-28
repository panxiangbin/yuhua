/* CNC PWA：版本化缓存、离线回退与安全更新。 */
const BUILD = '20260728-pwa3';
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
    await runtimeCache.put(scopeUrl(INSTALL_DIAGNOSTIC_PATH), new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }));
  } catch {
    // 诊断本身属于辅助能力，任何缓存配额或浏览器存储异常都不能让Worker安装失败。
  }
}

async function ensureStaticCacheShell() {
  const staticCache = await caches.open(STATIC_CACHE);
  const offlineUrl = scopeUrl('./offline.html');
  if (!await staticCache.match(offlineUrl)) {
    // CacheStorage在部分Chromium时序下不会保留503兜底响应；使用200响应建立静态缓存壳，
    // 正式offline.html成功获取后会覆盖它，实际未缓存导航仍由网络分支返回503兜底。
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
    build: BUILD,
    checkedAt: new Date().toISOString(),
    cached: staticCache ? REQUIRED_CORE_PATHS.length - failures.filter(item => item.path !== '__static_cache__').length : 0,
    total: REQUIRED_CORE_PATHS.length,
    failures
  });

  return failures;
}

async function offlineFallbackResponse() {
  const cached = await caches.match(scopeUrl('./offline.html'));
  return cached || createOfflineResponse();
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // 预缓存和诊断都是增强能力：无论缓存API、配额或单个资源发生什么异常，
    // Worker都必须完成安装，确保在线导航和后续离线自检仍可继续。
    try {
      await cacheCoreBestEffort();
    } catch (error) {
      await writeInstallDiagnostic({
        build: BUILD,
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
        .filter((name) => name.startsWith('cnc-') && !name.endsWith(BUILD))
        .map((name) => caches.delete(name))
    );

    // 安装阶段可能因瞬时网络、缓存配额或浏览器时序只留下运行时诊断缓存。
    // 激活时再次修复核心静态缓存，并在修复完成后才接管页面，避免页面看到“已接管但静态缓存尚未就绪”的半初始化状态。
    try {
      await cacheCoreBestEffort();
      await ensureStaticCacheShell();
    } catch (error) {
      await writeInstallDiagnostic({
        build: BUILD,
        checkedAt: new Date().toISOString(),
        cached: 0,
        total: REQUIRED_CORE_PATHS.length,
        failures: [{ path: '__activate__', error: String(error && error.message ? error.message : error) }]
      });
      throw error;
    }
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

        // Chromium在离线模拟时，Service Worker中的fetch有时仍会收到本地静态服务器404。
        // 离线状态下必须返回中文回退页，而不是把404正文交给用户。
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
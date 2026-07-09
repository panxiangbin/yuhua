/**
 * CNC速查助手 - Service Worker
 * PWA 离线支持：首次访问缓存核心资源，后续采用 Network First + Cache Fallback 策略
 * 缓存名称：cnc-cache-v5
 */
const CACHE_NAME = 'cnc-cache-v5';
const LESSON_MEDIA_VERSION = '20260709e';

// 路由兜底：即使 app.js 旧缓存/局部初始化失败，首页板块也必须能切换视图。
// 这段会被 Service Worker 自动插到 app.js 最前面。
const ROUTE_FALLBACK_SCRIPT = `
;(function () {
  if (window.__CNC_ROUTE_FALLBACK_INSTALLED__) return;
  window.__CNC_ROUTE_FALLBACK_INSTALLED__ = true;

  var VIEW_META = {
    dashboard: { kicker: '总览面板', title: '把网页改成像软件一样用' },
    study: { kicker: '新手学习路线', title: '先按顺序学，再单点深入' },
    workspace: { kicker: '快速查询', title: '左边找条目，右边看详情' },
    'learning-map': { kicker: '知识地图', title: '可视化知识结构与学习路径' },
    gallery: { kicker: '图片图库', title: '图片资料' },
    calculator: { kicker: '换算工具', title: '转速、线速度、进给、螺距快速计算' },
    library: { kicker: '知识库管理', title: '逐步把本地数据库接进网页' },
    favorites: { kicker: '学习记录', title: '最近查看和收藏会保留下来' },
    balloon: { kicker: '质检工具', title: '图纸气泡标注与检测记录' },
    access: { kicker: '访问控制', title: '只让你授权的人看到完整资料' }
  };

  function fallbackNavigate(view, options) {
    options = options || {};

    if (window.app && typeof window.app.navigate === 'function') {
      try {
        window.app.navigate(view, options);
        return;
      } catch (err) {
        console.warn('[CNC route fallback] app.navigate failed, using DOM fallback:', err);
      }
    }

    var targetId = 'view-' + view;
    document.querySelectorAll('.view').forEach(function (node) {
      node.classList.toggle('active', node.id === targetId);
    });

    var meta = VIEW_META[view] || VIEW_META.dashboard;
    var kicker = document.getElementById('topbar-kicker');
    var title = document.getElementById('topbar-title');
    if (kicker) {
      kicker.textContent = meta.kicker || '';
      kicker.style.display = meta.kicker ? '' : 'none';
    }
    if (title) title.textContent = meta.title || '';

    var homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.classList.toggle('visible', view !== 'dashboard');

    document.querySelectorAll('[data-route]').forEach(function (button) {
      var sameView = button.dataset.route === view;
      var sameFilter = !button.dataset.filter || button.dataset.filter === options.filter;
      button.classList.toggle('active', sameView && sameFilter);
    });

    if (view === 'workspace') {
      var filter = options.filter || 'all';
      var wsTitle = document.getElementById('workspace-title');
      var wsEyebrow = document.getElementById('workspace-eyebrow');
      var searchInput = document.getElementById('search-input');
      var filterGroup = document.getElementById('workspace-filter-group');
      var titles = {
        gcode: ['G/M CODE', 'G/M代码查询'],
        params: ['PARAMS & ALARM', '参数 / 报警 / 故障查询'],
        tooling: ['TOOL & PROCESS', '工艺刀具查询'],
        operation: ['OPERATION', '机床操作 / 回零 / 对刀'],
        drawing: ['DRAWING & QC', '图纸 / 量具 / 质量'],
        cases: ['CASES', '案例 / 实战'],
        all: ['KNOWLEDGE BASE', '知识库工作区']
      };
      var t = titles[filter] || titles.all;
      if (wsEyebrow) wsEyebrow.textContent = t[0];
      if (wsTitle) wsTitle.textContent = t[1];
      if (filterGroup) filterGroup.style.display = filter === 'all' ? '' : 'none';
      if (searchInput && options.keyword) searchInput.value = options.keyword;
    }

    var sidebar = document.getElementById('sidebar');
    var mask = document.getElementById('sidebar-mask');
    if (sidebar) sidebar.classList.remove('open');
    if (mask) mask.hidden = true;
  }

  window.cncSafeNavigate = fallbackNavigate;
  window.navigate = window.navigate || fallbackNavigate;

  document.addEventListener('click', function (event) {
    var routeEl = event.target.closest && event.target.closest('[data-route]');
    if (!routeEl) return;
    var view = routeEl.dataset.route;
    if (!view) return;
    event.preventDefault();
    event.stopPropagation();
    fallbackNavigate(view, {
      filter: routeEl.dataset.filter || undefined,
      keyword: routeEl.dataset.jumpKeyword || undefined
    });
  }, true);

  document.addEventListener('click', function (event) {
    var entryEl = event.target.closest && event.target.closest('[data-entry-id]');
    if (!entryEl) return;
    event.preventDefault();
    event.stopPropagation();
    fallbackNavigate('workspace', { keyword: entryEl.textContent || '' });
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    var gate = document.getElementById('access-gate');
    if (gate) gate.hidden = true;
  });
})();
`;

const LESSON_MEDIA_FIX_SCRIPT = `
;(function () {
  if (window.__CNC_LESSON_MEDIA_FIX__) return;
  window.__CNC_LESSON_MEDIA_FIX__ = true;
  var version = '${LESSON_MEDIA_VERSION}';
  var rawVideo = './assets/videos/learning/lesson-01-datum.mp4';
  var rawImage = './assets/images/learning/lesson-01-datum.png';
  function withVersion(url) {
    if (!url) return url;
    if (url.indexOf('lesson-01-datum') === -1) return url;
    return url.split('?')[0] + '?v=' + version;
  }
  function fixLessonMedia() {
    document.querySelectorAll('[data-lesson-video]').forEach(function (video) {
      if (video.dataset.mediaFixed === version) return;
      var source = video.querySelector('source');
      if (source) source.setAttribute('src', withVersion(source.getAttribute('src') || rawVideo));
      video.setAttribute('poster', withVersion(video.getAttribute('poster') || rawImage));
      video.dataset.mediaFixed = version;
      try { video.load(); } catch (err) {}
      var card = video.closest('.lesson-card-pro');
      if (card && !card.querySelector('.lesson-direct-video-link')) {
        var p = document.createElement('p');
        p.className = 'lesson-media-note lesson-direct-video-link';
        p.innerHTML = '<a href="' + rawVideo + '?v=' + version + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:#0b3a78;color:#fff;text-decoration:none;font-weight:700;">如果播放器打不开，点这里直接打开视频</a>';
        var note = card.querySelector('.lesson-media-note');
        if (note && note.parentNode) note.parentNode.insertBefore(p, note.nextSibling);
        else card.appendChild(p);
      }
    });
    document.querySelectorAll('.lesson-diagram-img').forEach(function (img) {
      if (img.dataset.imgFixed === version) return;
      img.src = withVersion(img.getAttribute('src') || rawImage);
      img.dataset.imgFixed = version;
    });
  }
  document.addEventListener('DOMContentLoaded', fixLessonMedia);
  document.addEventListener('click', function () { setTimeout(fixLessonMedia, 120); }, true);
  setInterval(fixLessonMedia, 1000);
})();
`;

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
  '/yuhua/cnc/search-runtime-debug.js',
  '/yuhua/cnc/diagnosis-data.js',
  '/yuhua/cnc/ui-learning-detail.js',
  '/yuhua/cnc/balloon-tool.js',
  '/yuhua/cnc/assets/videos/learning/lesson-01-datum.mp4',
  '/yuhua/cnc/assets/images/learning/lesson-01-datum.png'
];

function isAppScriptRequest(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.endsWith('/yuhua/cnc/app.js');
  } catch (err) {
    return false;
  }
}

function isLearningDetailRequest(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.endsWith('/yuhua/cnc/ui-learning-detail.js');
  } catch (err) {
    return false;
  }
}

async function patchAppScriptResponse(request, networkResponse) {
  const original = await networkResponse.text();
  const headers = new Headers(networkResponse.headers);
  headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('Cache-Control', 'no-cache');
  const patched = new Response(ROUTE_FALLBACK_SCRIPT + '\n' + original, {
    status: networkResponse.status,
    statusText: networkResponse.statusText,
    headers
  });
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, patched.clone()).catch(() => {});
  });
  return patched;
}

async function patchLearningDetailResponse(request, networkResponse) {
  let original = await networkResponse.text();
  const headers = new Headers(networkResponse.headers);
  headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('Cache-Control', 'no-cache');
  original = original
    .replace("/videos/learning/lesson-01-datum.mp4'", "/videos/learning/lesson-01-datum.mp4?v=" + LESSON_MEDIA_VERSION + "'")
    .replace(/\/images\/learning\/lesson-01-datum\.png'/g, "/images/learning/lesson-01-datum.png?v=" + LESSON_MEDIA_VERSION + "'");
  const patched = new Response(original + '\n' + LESSON_MEDIA_FIX_SCRIPT, {
    status: networkResponse.status,
    statusText: networkResponse.statusText,
    headers
  });
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, patched.clone()).catch(() => {});
  });
  return patched;
}

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
          if (isAppScriptRequest(event.request)) {
            return patchAppScriptResponse(event.request, networkResponse.clone());
          }
          if (isLearningDetailRequest(event.request)) {
            return patchLearningDetailResponse(event.request, networkResponse.clone());
          }

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
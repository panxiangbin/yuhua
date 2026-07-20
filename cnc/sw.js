const CNC_BUILD = '20260720f';
const PAGE_BOOTSTRAP = [
  '<link rel="stylesheet" href="./mobile-gcode-pro.css?v=' + CNC_BUILD + '" data-cnc-mobile-pro>',
  '<script src="./learning-images-04-12.js?v=' + CNC_BUILD + '"></script>',
  '<script src="./import-test.js?v=' + CNC_BUILD + '"></script>',
  '<script src="./mobile-gcode-pro.js?v=' + CNC_BUILD + '" data-cnc-mobile-gcode-pro></script>',
  '<script src="./learning-alignment-hotfix.js?v=' + CNC_BUILD + '" data-cnc-learning-alignment></script>'
].join('\n');

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.clients.claim();

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(async (client) => {
      try {
        const url = new URL(client.url);
        if (url.origin !== self.location.origin) return;
        if (url.searchParams.get('cnc_build') === CNC_BUILD) return;
        url.searchParams.set('cnc_build', CNC_BUILD);
        await client.navigate(url.href);
      } catch (error) {
        console.warn('[CNC版本升级] 页面刷新失败', error);
      }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const response = await fetch(new Request(request, { cache: 'reload' }));
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return response;

      let html = await response.text();
      if (!html.includes('learning-alignment-hotfix.js?v=' + CNC_BUILD)) {
        html = html.replace('</body>', PAGE_BOOTSTRAP + '\n</body>');
      }

      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store, no-cache, must-revalidate');
      headers.set('pragma', 'no-cache');
      headers.delete('content-length');

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    })().catch(() => fetch(request)));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .catch(() => caches.match(request))
    );
  }
});

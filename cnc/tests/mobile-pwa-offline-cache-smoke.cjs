const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
const buildInfo = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8'));
const expectedPwaBuild = String(buildInfo.pwaBuild || '').trim();
if (!expectedPwaBuild) throw new Error('build-info.json 缺少 pwaBuild');
fs.mkdirSync(out, { recursive: true });

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/' || requestPath === '/cnc/') requestPath = '/cnc/index.html';

  // Chromium can implicitly request the origin-level favicon even though the
  // PWA pages and assets under /cnc/ are the only resources this smoke test owns.
  // Return an empty success for that browser-generated request only; every
  // explicit /cnc/ resource still uses the normal 404 path and remains audited.
  if (requestPath === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // A normal missing file returns HTTP 404, which is still a successful fetch
  // from the Service Worker's perspective. This dedicated probe deliberately
  // drops the connection so the navigation fetch rejects and the offline
  // fallback branch is exercised deterministically in Chromium.
  if (requestPath.startsWith('/cnc/__offline_probe__')) {
    req.socket.destroy();
    return;
  }

  const file = path.normalize(path.join(root, requestPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function observePage(page, errors) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
}

async function waitForProductionCaches(page) {
  await page.waitForFunction(expectedBuild => {
    return caches.keys().then(names => (
      names.includes(`cnc-static-${expectedBuild}`) &&
      names.includes(`cnc-runtime-${expectedBuild}`)
    ));
  }, expectedPwaBuild, { timeout: 60000 });
}

async function readExpectedRegistration(page) {
  return page.evaluate(async () => {
    const expectedScope = new URL('/cnc/', location.origin).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations.find(item => item.scope === expectedScope);
    if (!registration) return null;
    return {
      scope: registration.scope,
      activeScript: registration.active?.scriptURL || '',
      activeState: registration.active?.state || ''
    };
  });
}

(async () => {
  let browser;
  let context;
  const errors = [];
  const runtimeDiagnostics = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    chromiumExecutable: chromium.executablePath(),
    browserVersion: '',
    serviceWorkerEvents: []
  };
  let stage = 'server-start';
  let fallbackState = null;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    stage = 'browser-launch';
    // Use full headed Chromium under Xvfb in CI so offline-cache assertions
    // exercise the same Service Worker lifecycle as a normal browser session.
    browser = await chromium.launch({ channel: 'chromium', headless: false });
    runtimeDiagnostics.browserVersion = browser.version();
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow'
    });
    context.on('serviceworker', worker => {
      runtimeDiagnostics.serviceWorkerEvents.push({
        type: 'created',
        url: worker.url(),
        at: new Date().toISOString()
      });
      worker.on('close', () => {
        runtimeDiagnostics.serviceWorkerEvents.push({
          type: 'closed',
          url: worker.url(),
          at: new Date().toISOString()
        });
      });
    });
    let page = await context.newPage();
    observePage(page, errors);

    stage = 'bootstrap';
    // Register from the quiet offline page. Entering through index.html starts a
    // second inline register() call and can transiently remove the registration
    // that the shared helper has just installed.
    await page.goto('http://127.0.0.1:4173/cnc/offline.html', { waitUntil: 'domcontentloaded' });
    stage = 'controller';
    page = await ensureControlled(page, errors, observePage);

    stage = 'registration-ready';
    const registration = await readExpectedRegistration(page);
    if (!registration) throw new Error('未找到 /cnc/ 作用域的 Service Worker 注册');
    if (registration.activeScript !== 'http://127.0.0.1:4173/cnc/sw.js' || registration.activeState !== 'activated') {
      throw new Error(`Service Worker 注册未激活：${JSON.stringify(registration)}`);
    }

    stage = 'cache-ready';
    // Activation intentionally performs cache maintenance asynchronously. Wait
    // for both production cache versions before testing offline navigation.
    await waitForProductionCaches(page);
    const cachesBefore = await page.evaluate(() => caches.keys());
    if (!cachesBefore.includes(`cnc-static-${expectedPwaBuild}`)) throw new Error(`静态缓存版本缺失：${expectedPwaBuild}`);
    if (!cachesBefore.includes(`cnc-runtime-${expectedPwaBuild}`)) throw new Error(`运行时缓存版本缺失：${expectedPwaBuild}`);

    stage = 'status-page';
    await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#worker')?.textContent.includes('已启用'));
    await page.waitForFunction(expected => document.querySelector('#build')?.textContent.includes(expected), expectedPwaBuild);
    const build = await page.locator('#build').textContent();
    const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
    }).map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (small.length) throw new Error(`触控区不足44px ${JSON.stringify(small)}`);

    stage = 'warm-runtime-route';
    await page.goto('http://127.0.0.1:4173/cnc/training-camp.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('训练')) throw new Error('训练营在线预热失败');
    await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html', { waitUntil: 'domcontentloaded' });

    stage = 'cached-offline-route';
    await context.setOffline(true);
    await page.goto('http://127.0.0.1:4173/cnc/training-camp.html', { waitUntil: 'domcontentloaded' });
    if (!(await page.title()).includes('训练')) throw new Error('离线训练营未打开');

    stage = 'offline-fallback';
    // Playwright's offline emulation can behave differently for localhost
    // navigation requests. Restore network and use a server-side connection
    // drop so the Service Worker receives a real rejected fetch every time.
    await context.setOffline(false);
    const fallbackUrl = `http://127.0.0.1:4173/cnc/__offline_probe__${Date.now()}.html`;
    const fallbackResponse = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded' });
    fallbackState = {
      requestUrl: fallbackUrl,
      finalUrl: page.url(),
      status: fallbackResponse ? fallbackResponse.status() : null,
      title: await page.title(),
      body: (await page.locator('body').innerText()).slice(0, 1000),
      controller: await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')
    };
    if (!fallbackState.body.includes('网络暂时不可用')) {
      throw new Error(`离线回退页未生效：${JSON.stringify(fallbackState)}`);
    }

    await page.screenshot({ path: path.join(out, 'pwa-offline-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误 ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out, 'pwa-offline-result.json'), JSON.stringify({
      build,
      expectedPwaBuild,
      registration,
      caches: cachesBefore,
      offlineFallback: true,
      fallbackState,
      runtimeWarmup: true,
      touchTargets: true,
      runtimeDiagnostics
    }, null, 2));
    console.log('CNC PWA offline cache smoke passed');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-offline-error.txt'), `stage=${stage}\nruntime=${JSON.stringify(runtimeDiagnostics, null, 2)}\nfallback=${JSON.stringify(fallbackState, null, 2)}\n${error.stack || error}`);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve)).catch(() => {});
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

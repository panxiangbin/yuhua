const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ensureControlled } = require('./pwa-controller-test-helper.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results');
fs.mkdirSync(out, { recursive: true });

const buildInfo = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8'));
const expectedPwaBuild = String(buildInfo.pwaBuild || '').trim();
if (!expectedPwaBuild) throw new Error('cnc/build-info.json 缺少 pwaBuild');

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

async function readNavigationState(page, label) {
  return page.evaluate(currentLabel => ({
    label: currentLabel,
    href: location.href,
    historyLength: history.length,
    navigationType: performance.getEntriesByType('navigation').at(-1)?.type || '',
    checkedAt: document.querySelector('#checked-at')?.textContent || '',
    timestamp: Date.now()
  }), label);
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
    bfcacheDefaultArgRemoved: true,
    serviceWorkerEvents: [],
    history: []
  };
  let stage = 'server-start';
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    stage = 'browser-launch';
    // BFCache is the behavior under test. Playwright normally launches Chromium
    // with --disable-back-forward-cache, so remove only that default argument and
    // retain every other Playwright safety and automation default.
    browser = await chromium.launch({
      channel: 'chromium',
      headless: false,
      ignoreDefaultArgs: ['--disable-back-forward-cache']
    });
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
    // Register from the quiet same-scope page. Opening index.html first triggers
    // its inline register() and races the explicit test registration.
    await page.goto('http://127.0.0.1:4173/cnc/offline.html', { waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);

    stage = 'profile-entry';
    await page.goto('http://127.0.0.1:4173/cnc/profile.html', { waitUntil: 'domcontentloaded' });
    const pwaLink = page.locator('a[href="./pwa-status.html"]');
    if (await pwaLink.count() !== 1) throw new Error('成长档案缺少PWA状态入口');
    await Promise.all([
      page.waitForURL(/pwa-status\.html/),
      pwaLink.click()
    ]);
    await page.waitForFunction(expected => document.querySelector('#build')?.textContent.includes(expected), expectedPwaBuild);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    const initialChecked = await page.locator('#checked-at').textContent();
    const cacheCount = Number(await page.locator('#cache-count').textContent());
    if (cacheCount < 2) throw new Error('CNC缓存数量不足');
    if (!(await page.locator('#static-cache').textContent()).includes(expectedPwaBuild)) throw new Error('静态缓存版本不一致');
    if (!(await page.locator('#runtime-cache').textContent()).includes(expectedPwaBuild)) throw new Error('运行时缓存版本不一致');

    const bfcacheToken = await page.evaluate(() => {
      const token = `cnc-bfcache-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.__cncBfCacheProbe = { token, pageshows: [] };
      window.addEventListener('pageshow', event => {
        window.__cncBfCacheProbe?.pageshows.push({
          persisted: event.persisted,
          href: location.href,
          at: Date.now()
        });
      });
      return token;
    });
    runtimeDiagnostics.history.push(await readNavigationState(page, 'status-before-leave'));

    stage = 'history-leave';
    // Leave through the page's real return link so the history stack matches a
    // user journey exactly: status page -> profile page -> browser Back.
    const profileLink = page.locator('a[href="./profile.html"]').first();
    if (await profileLink.count() !== 1) throw new Error('PWA状态页缺少成长档案返回入口');
    await Promise.all([
      page.waitForURL(/profile\.html/),
      profileLink.click()
    ]);
    runtimeDiagnostics.history.push(await readNavigationState(page, 'profile-after-link'));
    // checked-at is rendered only to second precision. Ensure the return happens
    // in a later second before asserting the pageshow-triggered refresh.
    await page.waitForTimeout(1100);

    stage = 'history-return';
    // BFCache restoration reuses the existing document and does not fire a new
    // load event. Wait only until the history navigation commits, then validate
    // the preserved in-memory token and pageshow.persisted below.
    const returnToStatus = page.waitForURL(/pwa-status\.html/, {
      waitUntil: 'commit',
      timeout: 15000
    });
    const backResponse = await page.goBack({ waitUntil: 'commit', timeout: 15000 });
    await returnToStatus;
    runtimeDiagnostics.history.push(await readNavigationState(page, 'status-after-back'));
    runtimeDiagnostics.backResponseStatus = backResponse ? backResponse.status() : null;

    const bfcacheState = await page.evaluate(token => ({
      tokenMatches: window.__cncBfCacheProbe?.token === token,
      pageshows: window.__cncBfCacheProbe?.pageshows || [],
      href: location.href,
      navigationType: performance.getEntriesByType('navigation').at(-1)?.type || ''
    }), bfcacheToken);
    runtimeDiagnostics.bfcacheState = bfcacheState;
    if (!bfcacheState.tokenMatches || !bfcacheState.pageshows.some(item => item.persisted === true)) {
      throw new Error(`页面未从BFCache恢复：${JSON.stringify(bfcacheState)}`);
    }

    await page.waitForFunction(oldValue => document.querySelector('#checked-at')?.textContent !== oldValue, initialChecked, { timeout: 10000 });
    await page.waitForFunction(expected => document.querySelector('#build')?.textContent.includes(expected), expectedPwaBuild);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    stage = 'cache-mismatch';
    await page.evaluate(async () => {
      for (const key of await caches.keys()) if (key.startsWith('cnc-runtime-')) await caches.delete(key);
    });
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('尚未完全一致'));
    if ((await page.locator('#runtime-cache').textContent()) !== '未发现') throw new Error('缓存缺失状态未显示');

    stage = 'cache-recovery';
    await page.reload({ waitUntil: 'domcontentloaded' });
    page = await ensureControlled(page, errors, observePage);
    await page.waitForFunction(() => Number(document.querySelector('#cache-count')?.textContent) >= 2);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('版本一致'));

    const small = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.min(rect.width, rect.height) < 44;
    }).map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim(), width: rect.width, height: rect.height };
    }));
    if (small.length) throw new Error(`触控区不足44px ${JSON.stringify(small)}`);

    await page.screenshot({ path: path.join(out, 'pwa-profile-bfcache-390x844.png'), fullPage: true });
    if (errors.length) throw new Error(`控制台错误 ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out, 'pwa-profile-bfcache-result.json'), JSON.stringify({
      expectedPwaBuild,
      build: await page.locator('#build').textContent(),
      cacheCount: Number(await page.locator('#cache-count').textContent()),
      profileEntry: true,
      bfcacheRestore: true,
      bfcacheState,
      mismatchDetected: true,
      touchTargets: true,
      runtimeDiagnostics
    }, null, 2));
    console.log('CNC PWA profile BFCache smoke passed');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'pwa-profile-bfcache-error.txt'), `stage=${stage}\nruntime=${JSON.stringify(runtimeDiagnostics, null, 2)}\n${error.stack || error}`);
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

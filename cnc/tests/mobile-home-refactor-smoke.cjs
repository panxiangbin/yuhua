const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/mobile-home-refactor');
const port = Number(process.env.CNC_TEST_PORT || 4173);
const baseUrl = `http://127.0.0.1:${port}/cnc/`;
const edgePath = process.env.CNC_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MOBILE_BUILD = '20260804-mobile-home1';
const CACHE_REVISION = '20260804-mobile12';
const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 }
];
const captureTimes = [0, 100, 300, 600, 1000];

fs.mkdirSync(out, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/' || requestPath === '/cnc/' || requestPath === '/cnc') requestPath = '/cnc/index.html';
  const file = path.normalize(path.join(root, requestPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function visible(node) {
  if (!node) return false;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
}

function roundedRect(node) {
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return {
    x: Math.round(rect.x * 10) / 10,
    y: Math.round(rect.y * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10
  };
}

async function launchBrowser() {
  const options = { headless: true };
  if (process.platform === 'win32' && fs.existsSync(edgePath)) options.executablePath = edgePath;
  else options.channel = 'msedge';
  try {
    return await chromium.launch(options);
  } catch (error) {
    delete options.channel;
    delete options.executablePath;
    return chromium.launch({ headless: true });
  }
}

function watchPage(page, errors, requests) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => requests.push({ url: request.url(), error: request.failure()?.errorText || 'failed' }));
}

async function getHomeMetrics(page) {
  return page.evaluate(({ mobileBuild, cacheRevision }) => {
    const isVisible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const rectOf = node => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
    };
    const oldSelectors = [
      '#xp-game-home',
      '#xp-personal-home',
      '#view-dashboard .launchpad-grid',
      '#view-dashboard .fan-suggestion-panel',
      '#view-dashboard .recent-section',
      '#view-dashboard .featured-images-preview',
      '#view-dashboard .faq-preview-section'
    ];
    const pseudo = getComputedStyle(document.body, '::after');
    const nav = document.querySelector('.xp-bottom-nav');
    const buildInfo = document.body.dataset.cncMobileHomeBuild || '';
    const root = document.documentElement;
    const body = document.body;
    return {
      mobileBuild,
      cacheRevision,
      bodyBuild: buildInfo,
      innerWidth,
      innerHeight,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      hero: rectOf(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      query: rectOf(document.querySelector('#view-dashboard .launchpad-search')),
      practice: rectOf(document.querySelector('#view-dashboard .cnc-home-route-card')),
      topbar: rectOf(document.querySelector('.topbar')),
      nav: rectOf(nav),
      navReserved: isVisible(nav) || (pseudo.content && pseudo.content !== 'none' && pseudo.content !== 'normal'),
      learningVisible: isVisible(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      queryVisible: isVisible(document.querySelector('#view-dashboard .launchpad-search')),
      practiceVisible: isVisible(document.querySelector('#view-dashboard .cnc-home-route-card')),
      oldVisible: oldSelectors.filter(selector => isVisible(document.querySelector(selector))),
      primaryLabel: document.querySelector('.cnc-home-primary')?.getAttribute('aria-label') || '',
      activeView: document.querySelector('.view.active')?.id || '',
      background: getComputedStyle(document.body).backgroundColor,
      titleFont: getComputedStyle(document.querySelector('#cnc-home-title')).fontSize
    };
  }, { mobileBuild: MOBILE_BUILD, cacheRevision: CACHE_REVISION });
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function maxRectDelta(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(a[key] - b[key])));
}

async function testViewport(browser, viewport, report) {
  const errors = [];
  const requests = [];
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  watchPage(page, errors, requests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#view-dashboard.active').waitFor();
  await page.screenshot({ path: path.join(out, `mobile-home-${viewport.name}.png`) });
  const metrics = await getHomeMetrics(page);
  const failures = [];
  assert(metrics.scrollHeight <= metrics.innerHeight + 2, `${viewport.name}: scrollHeight ${metrics.scrollHeight} > ${metrics.innerHeight + 2}`, failures);
  assert(metrics.scrollWidth <= metrics.innerWidth, `${viewport.name}: scrollWidth ${metrics.scrollWidth} > ${metrics.innerWidth}`, failures);
  assert(metrics.learningVisible, `${viewport.name}: learning panel not visible`, failures);
  assert(metrics.queryVisible, `${viewport.name}: query panel not visible`, failures);
  assert(metrics.practiceVisible, `${viewport.name}: practice panel not visible`, failures);
  assert(metrics.navReserved, `${viewport.name}: bottom navigation space missing`, failures);
  assert(metrics.oldVisible.length === 0, `${viewport.name}: old homepage visible: ${metrics.oldVisible.join(', ')}`, failures);
  assert(errors.length === 0, `${viewport.name}: console errors: ${errors.join(' | ')}`, failures);
  assert(requests.length === 0, `${viewport.name}: failed requests: ${requests.map(item => item.url).join(' | ')}`, failures);
  report.viewports.push({ viewport, metrics, errors, requests, failures });
  await context.close();
}

async function testSlowFirstPaint(browser, report) {
  const errors = [];
  const requests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  watchPage(page, errors, requests);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 350,
    downloadThroughput: 80 * 1024,
    uploadThroughput: 32 * 1024,
    connectionType: 'cellular3g'
  });

  await page.goto(`${baseUrl}?slow-first-paint=1`, { waitUntil: 'commit' });
  await page.locator('#view-dashboard').waitFor({ state: 'attached' });
  let elapsed = 0;
  const sequence = [];
  for (const time of captureTimes) {
    if (time > elapsed) await page.waitForTimeout(time - elapsed);
    elapsed = time;
    await page.screenshot({ path: path.join(out, `slow-first-paint-${String(time).padStart(4, '0')}ms.png`) });
    sequence.push({ time, metrics: await getHomeMetrics(page) });
  }
  await page.waitForLoadState('networkidle').catch(() => {});

  const failures = [];
  sequence.forEach(sample => {
    assert(sample.metrics.oldVisible.length === 0, `${sample.time}ms: old homepage visible: ${sample.metrics.oldVisible.join(', ')}`, failures);
    assert(sample.metrics.learningVisible, `${sample.time}ms: learning panel not visible`, failures);
    assert(sample.metrics.queryVisible, `${sample.time}ms: query panel not visible`, failures);
    assert(sample.metrics.practiceVisible, `${sample.time}ms: practice panel not visible`, failures);
    assert(sample.metrics.navReserved, `${sample.time}ms: bottom nav reservation missing`, failures);
  });
  const first = sequence[0].metrics;
  sequence.slice(1).forEach(sample => {
    assert(maxRectDelta(first.hero, sample.metrics.hero) <= 2, `${sample.time}ms: learning panel shifted`, failures);
    assert(maxRectDelta(first.query, sample.metrics.query) <= 2, `${sample.time}ms: query panel shifted`, failures);
    assert(maxRectDelta(first.practice, sample.metrics.practice) <= 2, `${sample.time}ms: practice panel shifted`, failures);
    assert(first.background === sample.metrics.background, `${sample.time}ms: page background changed`, failures);
    assert(first.titleFont === sample.metrics.titleFont, `${sample.time}ms: title font size changed`, failures);
  });
  assert(errors.length === 0, `slow first paint console errors: ${errors.join(' | ')}`, failures);
  report.firstPaint = { sequence, errors, requests, failures };
  await context.close();
}

async function testLearningAndQuery(browser, report) {
  const errors = [];
  const requests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  watchPage(page, errors, requests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.evaluate(() => window.navigate && window.navigate('study'));
  await page.locator('#view-study.active').waitFor();
  await page.locator('.study-card-thumb').first().waitFor();
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('#view-study .study-card-thumb'));
    return images.length === 12 && images.every(image => image.complete && image.naturalWidth > 0);
  });
  await page.screenshot({ path: path.join(out, 'mobile-learning-images.png'), fullPage: true });
  const learning = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('#view-study .study-card-thumb'));
    return {
      count: images.length,
      unique: new Set(images.map(image => new URL(image.src).pathname)).size,
      decoded: images.filter(image => image.complete && image.naturalWidth > 0).length,
      altMissing: images.filter(image => !image.alt.trim()).map(image => image.src),
      items: images.map(image => ({ src: image.getAttribute('src'), alt: image.alt, naturalWidth: image.naturalWidth }))
    };
  });

  await page.evaluate(() => window.navigate && window.navigate('dashboard'));
  await page.locator('#view-dashboard.active').waitFor();
  await page.locator('#quick-search-input').fill('G41');
  await page.locator('#quick-search-btn').click();
  await page.locator('#view-workspace.active').waitFor();
  await page.locator('.result-card').first().waitFor();
  await page.waitForTimeout(500);
  const query = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#view-workspace .result-card'));
    const images = Array.from(document.querySelectorAll('#view-workspace .result-card.has-thumb .result-thumb img'));
    return {
      count: cards.length,
      withImages: images.length,
      decoded: images.filter(image => image.complete && image.naturalWidth > 0).length,
      titles: cards.slice(0, 8).map(card => card.querySelector('h4')?.textContent?.trim() || ''),
      imageSources: images.slice(0, 8).map(image => image.getAttribute('src'))
    };
  });
  await page.screenshot({ path: path.join(out, 'mobile-query-g41-results.png'), fullPage: true });

  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(250);
  const returnedHome = await page.evaluate(() => document.querySelector('.view.active')?.id || '');

  const failures = [];
  assert(learning.count === 12, `learning images count ${learning.count} != 12`, failures);
  assert(learning.unique === 12, `learning unique image count ${learning.unique} != 12`, failures);
  assert(learning.decoded === 12, `learning decoded image count ${learning.decoded} != 12`, failures);
  assert(learning.altMissing.length === 0, `learning image alt missing: ${learning.altMissing.join(', ')}`, failures);
  assert(query.count > 0, 'G41 query returned no results', failures);
  assert(query.withImages > 0, 'G41 query returned no mapped images', failures);
  assert(query.decoded === query.withImages, `query decoded ${query.decoded}/${query.withImages}`, failures);
  assert(errors.length === 0, `learning/query console errors: ${errors.join(' | ')}`, failures);
  report.learningAndQuery = { learning, query, returnedHome, errors, requests, failures };
  await context.close();
}

async function testPwa(browser, report) {
  const errors = [];
  const requests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  watchPage(page, errors, requests);
  await page.goto(`${baseUrl}?pwa-check=1`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: 'networkidle' });
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('./');
    const cachesList = await caches.keys();
    const buildInfo = await fetch('./build-info.json', { cache: 'no-store' }).then(response => response.json());
    const controller = navigator.serviceWorker.controller;
    let workerReply = null;
    if (controller) {
      workerReply = await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = event => resolve(event.data);
        controller.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
        setTimeout(() => resolve(null), 3000);
      });
    }
    return {
      controlled: Boolean(controller),
      registration: Boolean(registration && registration.active),
      caches: cachesList,
      buildInfo,
      workerReply
    };
  });
  const failures = [];
  assert(state.registration, 'service worker is not active', failures);
  assert(state.controlled, 'page is not controlled after reload', failures);
  assert(state.caches.includes(`cnc-static-${CACHE_REVISION}`), 'current static cache missing', failures);
  assert(state.caches.includes(`cnc-runtime-${CACHE_REVISION}`), 'current runtime cache missing', failures);
  assert(!state.caches.some(name => name.startsWith('cnc-') && !name.endsWith(CACHE_REVISION)), `old CNC caches remain: ${state.caches.join(', ')}`, failures);
  assert(state.buildInfo.mobileBuild === MOBILE_BUILD, `mobile build mismatch: ${state.buildInfo.mobileBuild}`, failures);
  assert(state.buildInfo.cacheRevision === CACHE_REVISION, `cache revision mismatch: ${state.buildInfo.cacheRevision}`, failures);
  assert(state.workerReply && state.workerReply.cacheRevision === CACHE_REVISION, 'worker cache revision reply mismatch', failures);
  assert(errors.length === 0, `PWA console errors: ${errors.join(' | ')}`, failures);
  report.pwa = { state, errors, requests, failures };
  await context.close();
}

async function testDesktop(browser, report) {
  const errors = [];
  const requests = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  watchPage(page, errors, requests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(out, 'desktop-home-1440x950.png'), fullPage: true });
  const state = await page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return {
      width: innerWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      sidebarVisible: visible(document.querySelector('.sidebar')),
      heroVisible: visible(document.querySelector('.cnc-home-hero')),
      launchpadVisible: visible(document.querySelector('.launchpad-grid')),
      mobileBottomNavVisible: visible(document.querySelector('.xp-bottom-nav')),
      gameHomeVisible: visible(document.querySelector('#xp-game-home')),
      title: document.querySelector('#topbar-title')?.textContent?.trim() || ''
    };
  });
  const failures = [];
  assert(state.sidebarVisible, 'desktop sidebar is not visible', failures);
  assert(state.heroVisible, 'desktop hero is not visible', failures);
  assert(state.launchpadVisible, 'desktop launchpad is not visible', failures);
  assert(!state.mobileBottomNavVisible, 'mobile bottom nav polluted desktop', failures);
  assert(!state.gameHomeVisible, 'legacy game home visible on desktop', failures);
  assert(state.scrollWidth <= state.width, `desktop horizontal overflow: ${state.scrollWidth}/${state.width}`, failures);
  assert(errors.length === 0, `desktop console errors: ${errors.join(' | ')}`, failures);
  report.desktop = { state, errors, requests, failures };
  await context.close();
}

(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    mobileBuild: MOBILE_BUILD,
    cacheRevision: CACHE_REVISION,
    viewports: [],
    firstPaint: null,
    learningAndQuery: null,
    pwa: null,
    desktop: null,
    passed: false
  };
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    browser = await launchBrowser();
    for (const viewport of viewports) await testViewport(browser, viewport, report);
    await testSlowFirstPaint(browser, report);
    await testLearningAndQuery(browser, report);
    await testPwa(browser, report);
    await testDesktop(browser, report);
    const failures = [
      ...report.viewports.flatMap(item => item.failures),
      ...(report.firstPaint?.failures || []),
      ...(report.learningAndQuery?.failures || []),
      ...(report.pwa?.failures || []),
      ...(report.desktop?.failures || [])
    ];
    report.failures = failures;
    report.passed = failures.length === 0;
    fs.writeFileSync(path.join(out, 'mobile-home-refactor-report.json'), JSON.stringify(report, null, 2));
    if (failures.length) throw new Error(failures.join('\n'));
    console.log(JSON.stringify({ passed: true, report: path.join(out, 'mobile-home-refactor-report.json') }, null, 2));
  } catch (error) {
    report.passed = false;
    report.fatal = String(error && error.stack ? error.stack : error);
    fs.writeFileSync(path.join(out, 'mobile-home-refactor-report.json'), JSON.stringify(report, null, 2));
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();

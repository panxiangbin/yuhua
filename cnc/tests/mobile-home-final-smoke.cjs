const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/mobile-home-final');
const port = Number(process.env.CNC_TEST_PORT || 4174);
const baseUrl = `http://127.0.0.1:${port}/cnc/`;
const edgePath = process.env.CNC_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 }
];
const captureTimes = [0, 100, 300, 600, 1000];

fs.mkdirSync(out, { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2'
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

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function watch(page, errors, failedRequests) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'failed' }));
}

async function launchBrowser() {
  const options = { headless: true };
  if (process.platform === 'win32' && fs.existsSync(edgePath)) options.executablePath = edgePath;
  else options.channel = 'msedge';
  try { return await chromium.launch(options); }
  catch { return chromium.launch({ headless: true }); }
}

async function waitForFirstVisiblePaint(page) {
  await page.waitForFunction(() => {
    const hero = document.querySelector('#view-dashboard .cnc-home-hero-copy');
    const query = document.querySelector('#view-dashboard .launchpad-search');
    const practice = document.querySelector('#view-dashboard .cnc-home-route-card');
    if (!hero || !query || !practice) return false;
    const visible = node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const old = ['.launchpad-grid', '.fan-suggestion-panel', '.recent-section', '.featured-images-preview', '.faq-preview-section']
      .some(selector => {
        const node = document.querySelector('#view-dashboard ' + selector);
        return node && visible(node);
      });
    return visible(hero) && visible(query) && visible(practice) && !old &&
      getComputedStyle(document.body).backgroundColor === 'rgb(242, 245, 249)';
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function metrics(page) {
  return page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const rect = node => {
      if (!node) return null;
      const value = node.getBoundingClientRect();
      return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Math.round(value[key] * 10) / 10]));
    };
    const root = document.documentElement;
    const body = document.body;
    const nav = document.querySelector('.xp-bottom-nav');
    const pseudoContent = getComputedStyle(body, '::after').content;
    const oldSelectors = [
      '#xp-game-home', '#xp-personal-home', '#view-dashboard .launchpad-grid',
      '#view-dashboard .fan-suggestion-panel', '#view-dashboard .recent-section',
      '#view-dashboard .featured-images-preview', '#view-dashboard .faq-preview-section'
    ];
    return {
      innerWidth, innerHeight,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      activeView: document.querySelector('.view.active')?.id || '',
      hero: rect(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      query: rect(document.querySelector('#view-dashboard .launchpad-search')),
      practice: rect(document.querySelector('#view-dashboard .cnc-home-route-card')),
      nav: rect(nav),
      navVisible: visible(nav),
      navReserved: visible(nav) || (pseudoContent && !['none', 'normal', '""'].includes(pseudoContent)),
      learningVisible: visible(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      queryVisible: visible(document.querySelector('#view-dashboard .launchpad-search')),
      practiceVisible: visible(document.querySelector('#view-dashboard .cnc-home-route-card')),
      oldVisible: oldSelectors.filter(selector => visible(document.querySelector(selector))),
      bodyBuild: body.dataset.cncMobileHomeBuild || '',
      background: getComputedStyle(body).backgroundColor,
      titleFont: getComputedStyle(document.querySelector('#cnc-home-title')).fontSize
    };
  });
}

function rectDelta(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(a[key] - b[key])));
}

async function testMobileViewport(browser, viewport, report) {
  const errors = [], failedRequests = [];
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  watch(page, errors, failedRequests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForFirstVisiblePaint(page);
  await page.waitForTimeout(600);
  const state = await metrics(page);
  await page.screenshot({ path: path.join(out, `mobile-home-${viewport.name}.png`) });
  const failures = [];
  assert(state.scrollHeight <= state.innerHeight + 2, `${viewport.name}: scrollHeight ${state.scrollHeight}/${state.innerHeight}`, failures);
  assert(state.scrollWidth <= state.innerWidth, `${viewport.name}: scrollWidth ${state.scrollWidth}/${state.innerWidth}`, failures);
  assert(state.learningVisible && state.queryVisible && state.practiceVisible, `${viewport.name}: three core panels not all visible`, failures);
  assert(state.navReserved, `${viewport.name}: bottom navigation not visible`, failures);
  assert(state.oldVisible.length === 0, `${viewport.name}: old home visible: ${state.oldVisible.join(', ')}`, failures);
  assert(errors.length === 0, `${viewport.name}: console errors: ${errors.join(' | ')}`, failures);
  assert(failedRequests.length === 0, `${viewport.name}: failed requests: ${failedRequests.map(item => item.url).join(' | ')}`, failures);
  report.viewports.push({ viewport, state, errors, failedRequests, failures });
  await context.close();
}

async function testFirstPaint(browser, report) {
  const errors = [], failedRequests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  watch(page, errors, failedRequests);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 350,
    downloadThroughput: 80 * 1024, uploadThroughput: 32 * 1024,
    connectionType: 'cellular3g'
  });
  await page.goto(`${baseUrl}?slow=1`, { waitUntil: 'commit' });
  await waitForFirstVisiblePaint(page);
  const paintEntry = await page.evaluate(() => {
    const entries = performance.getEntriesByType('paint');
    return entries.map(entry => ({ name: entry.name, startTime: Math.round(entry.startTime * 10) / 10 }));
  });
  let elapsed = 0;
  const sequence = [];
  for (const time of captureTimes) {
    if (time > elapsed) await page.waitForTimeout(time - elapsed);
    elapsed = time;
    sequence.push({ time, state: await metrics(page) });
    await page.screenshot({ path: path.join(out, `slow-first-paint-${String(time).padStart(4, '0')}ms.png`) });
  }
  const failures = [];
  const first = sequence[0].state;
  sequence.forEach(sample => {
    const state = sample.state;
    assert(state.oldVisible.length === 0, `${sample.time}ms after first visible paint: old home visible`, failures);
    assert(state.learningVisible && state.queryVisible && state.practiceVisible, `${sample.time}ms: final panels missing`, failures);
    assert(state.navReserved, `${sample.time}ms: nav missing`, failures);
    assert(rectDelta(first.hero, state.hero) <= 2, `${sample.time}ms: hero shifted`, failures);
    assert(rectDelta(first.query, state.query) <= 2, `${sample.time}ms: query shifted`, failures);
    assert(rectDelta(first.practice, state.practice) <= 2, `${sample.time}ms: practice shifted`, failures);
    assert(first.background === state.background, `${sample.time}ms: background changed`, failures);
    assert(first.titleFont === state.titleFont, `${sample.time}ms: title font changed`, failures);
  });
  assert(errors.length === 0, `slow paint console errors: ${errors.join(' | ')}`, failures);
  report.firstPaint = { definition: '0ms is the first browser-visible paint after render-blocking styles are applied', paintEntry, sequence, errors, failedRequests, failures };
  await context.close();
}

async function testLearningAndQuery(browser, report) {
  const errors = [], failedRequests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  watch(page, errors, failedRequests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForFirstVisiblePaint(page);
  const learningButton = page.locator('.xp-bottom-nav button[data-xp-route="study"]');
  await learningButton.waitFor({ state: 'visible' });
  await learningButton.click();
  await page.locator('#view-study.active').waitFor();
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('#view-study.active .study-card .study-card-thumb'))
      .filter(image => image.getClientRects().length > 0);
    return images.length === 12 && images.every(image => image.complete && image.naturalWidth > 0);
  });
  const learning = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('#view-study.active .study-card .study-card-thumb'))
      .filter(image => image.getClientRects().length > 0);
    return {
      count: images.length,
      unique: new Set(images.map(image => new URL(image.src).pathname)).size,
      decoded: images.filter(image => image.complete && image.naturalWidth > 0).length,
      missingAlt: images.filter(image => !image.alt.trim()).map(image => image.src),
      items: images.map(image => ({ src: image.getAttribute('src'), alt: image.alt, naturalWidth: image.naturalWidth }))
    };
  });
  await page.screenshot({ path: path.join(out, 'mobile-learning-images.png'), fullPage: true });

  await page.locator('.xp-bottom-nav button[data-xp-route="dashboard"]').click();
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
  const failures = [];
  assert(learning.count === 12, `visible lesson image count ${learning.count}`, failures);
  assert(learning.unique === 12, `unique lesson image count ${learning.unique}`, failures);
  assert(learning.decoded === 12, `decoded lesson image count ${learning.decoded}`, failures);
  assert(learning.missingAlt.length === 0, `missing alt: ${learning.missingAlt.join(', ')}`, failures);
  assert(query.count > 0, 'G41 query returned no results', failures);
  assert(query.withImages > 0, 'G41 query returned no mapped images', failures);
  assert(query.decoded === query.withImages, `query images decoded ${query.decoded}/${query.withImages}`, failures);
  assert(errors.length === 0, `learning/query console errors: ${errors.join(' | ')}`, failures);
  report.learningAndQuery = { learning, query, errors, failedRequests, failures };
  await context.close();
}

async function testPwa(browser, report) {
  const errors = [], failedRequests = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  watch(page, errors, failedRequests);
  await page.goto(`${baseUrl}?pwa=1`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('service worker ready timeout')), 15000))
    ]);
  });
  await page.reload({ waitUntil: 'networkidle' });
  const state = await page.evaluate(async () => {
    const info = await fetch('./build-info.json', { cache: 'no-store' }).then(response => response.json());
    const controller = navigator.serviceWorker.controller;
    let worker = null;
    if (controller) {
      worker = await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = event => resolve(event.data);
        controller.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
        setTimeout(() => resolve(null), 3000);
      });
    }
    return { info, worker, controlled: Boolean(controller), caches: await caches.keys() };
  });
  const failures = [];
  assert(state.controlled, 'PWA page not controlled after reload', failures);
  assert(state.worker && state.worker.build === state.info.pwaBuild, 'worker/build-info PWA build mismatch', failures);
  assert(state.worker && state.worker.cacheRevision === state.info.cacheRevision, 'worker/build-info cache revision mismatch', failures);
  assert(state.caches.includes(`cnc-static-${state.info.cacheRevision}`), 'current static cache missing', failures);
  assert(state.caches.includes(`cnc-runtime-${state.info.cacheRevision}`), 'current runtime cache missing', failures);
  assert(!state.caches.some(name => name.startsWith('cnc-') && !name.endsWith(state.info.cacheRevision)), `old CNC caches remain: ${state.caches.join(', ')}`, failures);
  assert(errors.length === 0, `PWA console errors: ${errors.join(' | ')}`, failures);
  report.pwa = { state, errors, failedRequests, failures };
  await context.close();
}

async function testDesktop(browser, report) {
  const errors = [], failedRequests = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  watch(page, errors, failedRequests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return {
      innerWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      sidebar: visible(document.querySelector('.sidebar')),
      hero: visible(document.querySelector('.cnc-home-hero')),
      launchpad: visible(document.querySelector('.launchpad-grid')),
      mobileNav: visible(document.querySelector('.xp-bottom-nav')),
      legacyGame: visible(document.querySelector('#xp-game-home'))
    };
  });
  await page.screenshot({ path: path.join(out, 'desktop-home-1440x950.png'), fullPage: true });
  const failures = [];
  assert(state.sidebar && state.hero && state.launchpad, 'desktop approved structure missing', failures);
  assert(!state.mobileNav, 'mobile nav polluted desktop', failures);
  assert(!state.legacyGame, 'legacy game home visible on desktop', failures);
  assert(state.scrollWidth <= state.innerWidth, `desktop horizontal overflow ${state.scrollWidth}/${state.innerWidth}`, failures);
  assert(errors.length === 0, `desktop console errors: ${errors.join(' | ')}`, failures);
  report.desktop = { state, errors, failedRequests, failures };
  await context.close();
}

(async () => {
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewports: [], firstPaint: null, learningAndQuery: null, pwa: null, desktop: null, passed: false };
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    browser = await launchBrowser();
    for (const viewport of viewports) await testMobileViewport(browser, viewport, report);
    await testFirstPaint(browser, report);
    await testLearningAndQuery(browser, report);
    await testPwa(browser, report);
    await testDesktop(browser, report);
    report.failures = [
      ...report.viewports.flatMap(item => item.failures),
      ...(report.firstPaint?.failures || []),
      ...(report.learningAndQuery?.failures || []),
      ...(report.pwa?.failures || []),
      ...(report.desktop?.failures || [])
    ];
    report.passed = report.failures.length === 0;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    if (report.failures.length) throw new Error(report.failures.join('\n'));
    console.log(JSON.stringify({ passed: true, report: path.join(out, 'report.json') }, null, 2));
  } catch (error) {
    report.passed = false;
    report.fatal = String(error && error.stack ? error.stack : error);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();

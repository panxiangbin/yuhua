const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'cnc/test-results/mobile-home-final-v2');
const port = Number(process.env.CNC_TEST_PORT || 4175);
const baseUrl = `http://127.0.0.1:${port}/cnc/`;
const edgePath = process.env.CNC_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 }
];
const frames = [0, 100, 300, 600, 1000];

fs.mkdirSync(out, { recursive: true });
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '/cnc' || urlPath === '/cnc/') urlPath = '/cnc/index.html';
  const file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function check(condition, message, failures) {
  if (!condition) failures.push(message);
}

function observe(page, errors, failedRequests) {
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'failed' }));
}

async function browserLaunch() {
  const options = { headless: true };
  if (process.platform === 'win32' && fs.existsSync(edgePath)) options.executablePath = edgePath;
  else options.channel = 'msedge';
  try { return await chromium.launch(options); }
  catch { return chromium.launch({ headless: true }); }
}

async function waitForStableMobileHome(page) {
  await page.waitForFunction(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const body = document.body;
    const nav = document.querySelector('.xp-bottom-nav');
    const hero = document.querySelector('#view-dashboard .cnc-home-hero-copy');
    const query = document.querySelector('#view-dashboard .launchpad-search');
    const practice = document.querySelector('#view-dashboard .cnc-home-route-card');
    const old = ['#xp-game-home', '#xp-personal-home', '#view-dashboard .launchpad-grid', '#view-dashboard .fan-suggestion-panel', '#view-dashboard .recent-section', '#view-dashboard .featured-images-preview', '#view-dashboard .faq-preview-section']
      .some(selector => visible(document.querySelector(selector)));
    return body && body.dataset.cncMobileHomeBuild === '20260804-mobile1' &&
      visible(nav) && visible(hero) && visible(query) && visible(practice) && !old;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function homeState(page) {
  return page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const rectOf = node => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Math.round(rect[key] * 10) / 10]));
    };
    const root = document.documentElement;
    const body = document.body;
    const nav = document.querySelector('.xp-bottom-nav');
    const oldSelectors = ['#xp-game-home', '#xp-personal-home', '#view-dashboard .launchpad-grid', '#view-dashboard .fan-suggestion-panel', '#view-dashboard .recent-section', '#view-dashboard .featured-images-preview', '#view-dashboard .faq-preview-section'];
    return {
      innerWidth, innerHeight,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      hero: rectOf(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      query: rectOf(document.querySelector('#view-dashboard .launchpad-search')),
      practice: rectOf(document.querySelector('#view-dashboard .cnc-home-route-card')),
      nav: rectOf(nav),
      navVisible: visible(nav),
      learningVisible: visible(document.querySelector('#view-dashboard .cnc-home-hero-copy')),
      queryVisible: visible(document.querySelector('#view-dashboard .launchpad-search')),
      practiceVisible: visible(document.querySelector('#view-dashboard .cnc-home-route-card')),
      oldVisible: oldSelectors.filter(selector => visible(document.querySelector(selector))),
      background: getComputedStyle(body).backgroundColor,
      titleFont: getComputedStyle(document.querySelector('#cnc-home-title')).fontSize,
      build: body.dataset.cncMobileHomeBuild || ''
    };
  });
}

function delta(a, b) {
  if (!a || !b) return Infinity;
  return Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(a[key] - b[key])));
}

async function testViewport(browser, viewport, report) {
  const errors = [], failedRequests = [], failures = [];
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  observe(page, errors, failedRequests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForStableMobileHome(page);
  const state = await homeState(page);
  await page.screenshot({ path: path.join(out, `mobile-home-${viewport.name}.png`) });
  check(state.scrollHeight <= state.innerHeight + 2, `${viewport.name}: scrollHeight ${state.scrollHeight}/${state.innerHeight}`, failures);
  check(state.scrollWidth <= state.innerWidth, `${viewport.name}: scrollWidth ${state.scrollWidth}/${state.innerWidth}`, failures);
  check(state.learningVisible && state.queryVisible && state.practiceVisible, `${viewport.name}: core panels missing`, failures);
  check(state.navVisible, `${viewport.name}: real bottom nav missing`, failures);
  check(state.oldVisible.length === 0, `${viewport.name}: old home visible`, failures);
  check(errors.length === 0, `${viewport.name}: console errors: ${errors.join(' | ')}`, failures);
  check(failedRequests.length === 0, `${viewport.name}: failed resources: ${failedRequests.map(item => item.url).join(' | ')}`, failures);
  report.viewports.push({ viewport, state, errors, failedRequests, failures });
  await context.close();
}

async function testFirstPaint(browser, report) {
  const errors = [], failedRequests = [], failures = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  observe(page, errors, failedRequests);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 350,
    downloadThroughput: 80 * 1024, uploadThroughput: 32 * 1024,
    connectionType: 'cellular3g'
  });
  await page.goto(`${baseUrl}?slow=1`, { waitUntil: 'commit' });
  await waitForStableMobileHome(page);
  const paintEntries = await page.evaluate(() => performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: Math.round(entry.startTime * 10) / 10 })));
  const sequence = [];
  let elapsed = 0;
  for (const time of frames) {
    if (time > elapsed) await page.waitForTimeout(time - elapsed);
    elapsed = time;
    await page.screenshot({ path: path.join(out, `slow-first-visible-${String(time).padStart(4, '0')}ms.png`) });
    sequence.push({ time, state: await homeState(page) });
  }
  const first = sequence[0].state;
  sequence.forEach(sample => {
    const state = sample.state;
    check(state.oldVisible.length === 0, `${sample.time}ms: old home visible`, failures);
    check(state.learningVisible && state.queryVisible && state.practiceVisible && state.navVisible, `${sample.time}ms: final mobile UI incomplete`, failures);
    check(delta(first.hero, state.hero) <= 2, `${sample.time}ms: learning panel shifted`, failures);
    check(delta(first.query, state.query) <= 2, `${sample.time}ms: query panel shifted`, failures);
    check(delta(first.practice, state.practice) <= 2, `${sample.time}ms: practice panel shifted`, failures);
    check(first.background === state.background, `${sample.time}ms: background changed`, failures);
    check(first.titleFont === state.titleFont, `${sample.time}ms: title font changed`, failures);
  });
  check(errors.length === 0, `slow first-visible paint errors: ${errors.join(' | ')}`, failures);
  report.firstPaint = {
    definition: '0ms is the first stable browser-visible mobile frame after the final mobile build marker and real bottom navigation are present',
    paintEntries, sequence, errors, failedRequests, failures
  };
  await context.close();
}

async function decodeAllCourseImages(page) {
  return page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('#view-study .study-card[data-level] .study-card-thumb'));
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(async image => {
      try { await image.decode(); }
      catch {
        if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }));
      }
    }));
    const visibleCards = Array.from(document.querySelectorAll('#view-study.active .study-card[data-level]'))
      .filter(card => card.getClientRects().length > 0 && getComputedStyle(card).display !== 'none');
    return {
      totalCards: document.querySelectorAll('#view-study .study-card[data-level]').length,
      totalImages: images.length,
      uniqueImages: new Set(images.map(image => new URL(image.src).pathname)).size,
      decodedImages: images.filter(image => image.complete && image.naturalWidth > 0).length,
      missingAlt: images.filter(image => !image.alt.trim()).map(image => image.src),
      visibleCards: visibleCards.length,
      visibleCardsWithVisibleImages: visibleCards.filter(card => {
        const image = card.querySelector('.study-card-thumb');
        return image && image.getClientRects().length > 0 && image.complete && image.naturalWidth > 0;
      }).length,
      items: images.map(image => ({ src: image.getAttribute('src'), alt: image.alt, naturalWidth: image.naturalWidth }))
    };
  });
}

async function decodeAllQueryImages(page) {
  const selector = '#view-workspace .result-card.has-thumb .result-thumb img';
  const expectedImages = await page.locator(selector).count();
  let snapshot = null;

  for (let pass = 0; pass < 4; pass += 1) {
    const scrollHeight = await page.evaluate(querySelector => {
      document.querySelectorAll(querySelector).forEach(image => { image.loading = 'eager'; });
      return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    }, selector);

    for (let y = 0; y <= scrollHeight; y += 420) {
      await page.evaluate(({ querySelector, top }) => {
        document.querySelectorAll(querySelector).forEach(image => { image.loading = 'eager'; });
        window.scrollTo({ top, behavior: 'instant' });
      }, { querySelector: selector, top: y });
      await page.waitForTimeout(70);
    }

    snapshot = await page.evaluate(querySelector => {
      const cards = Array.from(document.querySelectorAll('#view-workspace .result-card'));
      const imageNodes = Array.from(document.querySelectorAll(querySelector));
      const items = imageNodes.map(image => ({
        src: image.getAttribute('src'),
        alt: image.alt,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        loading: image.loading
      }));
      return {
        count: cards.length,
        withImages: imageNodes.length,
        decoded: items.filter(item => item.complete && item.naturalWidth > 0).length,
        unresolved: items.filter(item => !item.complete || item.naturalWidth <= 0),
        titles: cards.slice(0, 8).map(card => card.querySelector('h4')?.textContent?.trim() || ''),
        imageSources: items.map(item => item.src),
        items
      };
    }, selector);

    if (snapshot.withImages === expectedImages && snapshot.decoded === snapshot.withImages) break;
    await page.waitForTimeout(250);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  return { expectedImages, ...snapshot };
}

async function testLearningAndQuery(browser, report) {
  const errors = [], failedRequests = [], failures = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  observe(page, errors, failedRequests);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForStableMobileHome(page);

  const learningButton = page.locator('.xp-bottom-nav button[data-xp-route="study"]');
  await learningButton.click();
  await page.locator('#view-study.active').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('#view-study .study-card[data-level] .study-card-thumb').length === 12);
  const learning = await decodeAllCourseImages(page);
  await page.screenshot({ path: path.join(out, 'mobile-learning-visible-cards.png'), fullPage: true });

  await page.locator('.xp-bottom-nav button[data-xp-route="dashboard"]').click();
  await page.locator('#view-dashboard.active').waitFor();
  await page.locator('#quick-search-input').fill('G41');
  await page.locator('#quick-search-btn').click();
  await page.locator('#view-workspace.active').waitFor();
  await page.locator('.result-card').first().waitFor();
  const query = await decodeAllQueryImages(page);
  await page.screenshot({ path: path.join(out, 'mobile-query-g41-results.png'), fullPage: true });

  check(learning.totalCards === 12, `course card count ${learning.totalCards}`, failures);
  check(learning.totalImages === 12, `course image count ${learning.totalImages}`, failures);
  check(learning.uniqueImages === 12, `unique course image count ${learning.uniqueImages}`, failures);
  check(learning.decodedImages === 12, `decoded course image count ${learning.decodedImages}`, failures);
  check(learning.missingAlt.length === 0, `course images missing alt: ${learning.missingAlt.join(', ')}`, failures);
  check(learning.visibleCards > 0, 'no visible course cards', failures);
  check(learning.visibleCardsWithVisibleImages === learning.visibleCards, `visible cards with images ${learning.visibleCardsWithVisibleImages}/${learning.visibleCards}`, failures);
  check(query.count > 0, 'G41 query returned no results', failures);
  check(query.expectedImages > 0, 'G41 query returned no mapped images', failures);
  check(query.withImages === query.expectedImages, `query image DOM count changed ${query.withImages}/${query.expectedImages}`, failures);
  check(query.decoded === query.withImages, `query image decode ${query.decoded}/${query.withImages}: ${query.unresolved.map(item => item.src).join(', ')}`, failures);
  check(errors.length === 0, `learning/query console errors: ${errors.join(' | ')}`, failures);
  check(failedRequests.length === 0, `learning/query failed resources: ${failedRequests.map(item => item.url).join(' | ')}`, failures);
  report.learningAndQuery = { learning, query, errors, failedRequests, failures };
  await context.close();
}

async function testPwa(browser, report) {
  const errors = [], failedRequests = [], failures = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  observe(page, errors, failedRequests);
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
  check(state.controlled, 'PWA page not controlled after reload', failures);
  check(state.worker && state.worker.build === state.info.pwaBuild, 'worker/build-info PWA build mismatch', failures);
  check(state.worker && state.worker.cacheRevision === state.info.cacheRevision, 'worker/build-info cache revision mismatch', failures);
  check(state.caches.includes(`cnc-static-${state.info.cacheRevision}`), 'current static cache missing', failures);
  check(state.caches.includes(`cnc-runtime-${state.info.cacheRevision}`), 'current runtime cache missing', failures);
  check(!state.caches.some(name => name.startsWith('cnc-') && !name.endsWith(state.info.cacheRevision)), `old CNC caches remain: ${state.caches.join(', ')}`, failures);
  check(errors.length === 0, `PWA console errors: ${errors.join(' | ')}`, failures);
  report.pwa = { state, errors, failedRequests, failures };
  await context.close();
}

async function testDesktop(browser, report) {
  const errors = [], failedRequests = [], failures = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  observe(page, errors, failedRequests);
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
  check(state.sidebar && state.hero && state.launchpad, 'desktop approved structure missing', failures);
  check(!state.mobileNav, 'mobile nav polluted desktop', failures);
  check(!state.legacyGame, 'legacy game home visible on desktop', failures);
  check(state.scrollWidth <= state.innerWidth, `desktop horizontal overflow ${state.scrollWidth}/${state.innerWidth}`, failures);
  check(errors.length === 0, `desktop console errors: ${errors.join(' | ')}`, failures);
  report.desktop = { state, errors, failedRequests, failures };
  await context.close();
}

(async () => {
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewports: [], firstPaint: null, learningAndQuery: null, pwa: null, desktop: null, passed: false };
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    browser = await browserLaunch();
    for (const viewport of viewports) await testViewport(browser, viewport, report);
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

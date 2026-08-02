const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173/cnc/';
const OUT = path.join(__dirname, '..', 'test-results', 'beginner-placement-route-handoff');
const HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
fs.mkdirSync(OUT, { recursive: true });

const report = {
  viewport: '390x844',
  oneTimeConsumption: false,
  refreshDoesNotRestore: false,
  expiredRejected: false,
  invalidRejected: false,
  bfcachePersisted: false,
  bfcacheDoesNotRestore: false,
  independentTabIsolation: false,
  storageUnavailableRecovery: false,
  sessionStorageOnly: false,
  noQuestionOrRouteInUrl: false,
  touchTargetsAtLeast44: false,
  externalRequests: [],
  browserErrors: []
};

function payload(overrides = {}) {
  const createdAt = Date.now();
  return {
    version: 1,
    source: 'beginner-placement',
    decision: 'critical-safety',
    title: '从第1关：安全基础开始',
    route: '建议路线：安全基础 → 加工中心基础 → 坐标轴与回零',
    href: './course-safety-foundation.html',
    steps: [
      { title: '安全基础', href: './course-safety-foundation.html' },
      { title: '认识加工中心', href: './course-machining-center-basics.html' },
      { title: '坐标轴与回零', href: './course-coordinate-axes.html' }
    ],
    createdAt,
    expiresAt: createdAt + 5 * 60 * 1000,
    ...overrides
  };
}

async function completeCriticalSafetyPlacement(page) {
  await page.goto(`${BASE}beginner-placement.html`, { waitUntil: 'domcontentloaded' });
  const answers = [0, 2, 1, 1, 1, 1];
  for (let index = 0; index < answers.length; index += 1) {
    await page.locator(`#option-${index}-${answers[index]}`).click();
    await page.locator('#next').click();
  }
  await page.locator('#result[data-decision="critical-safety"]').waitFor({ state: 'visible' });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== new URL(BASE).origin) report.externalRequests.push(request.url());
  });
  page.on('console', message => {
    if (message.type() === 'error') report.browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => report.browserErrors.push(`pageerror: ${error.message}`));

  try {
    await completeCriticalSafetyPlacement(page);
    await page.locator('#handoff-link').click();
    await page.waitForURL(/training-camp\.html$/);
    await page.locator('#placement-handoff[data-state="consumed"]').waitFor({ state: 'visible' });

    const consumed = await page.evaluate(key => ({
      state: document.querySelector('#placement-handoff')?.dataset.state,
      title: document.querySelector('#placement-handoff-title')?.textContent,
      steps: [...document.querySelectorAll('#placement-handoff-steps li')].map(item => item.textContent),
      sessionValue: sessionStorage.getItem(key),
      localValue: localStorage.getItem(key),
      url: location.href,
      ctaHeight: document.querySelector('#placement-handoff-cta')?.getBoundingClientRect().height || 0
    }), HANDOFF_KEY);

    if (consumed.state !== 'consumed') throw new Error(`handoff state mismatch: ${consumed.state}`);
    if (!consumed.title.includes('安全基础')) throw new Error(`handoff title mismatch: ${consumed.title}`);
    if (consumed.steps.length !== 3 || !consumed.steps[0].includes('安全基础')) throw new Error(`handoff steps mismatch: ${JSON.stringify(consumed.steps)}`);
    if (consumed.sessionValue !== null) throw new Error('handoff key was not removed immediately');
    if (consumed.localValue !== null) throw new Error('handoff leaked into LocalStorage');
    if (/[?#].*(critical|safety|route|安全)/i.test(consumed.url)) throw new Error(`handoff leaked into URL: ${consumed.url}`);
    if (consumed.ctaHeight < 44) throw new Error(`handoff CTA is below 44px: ${consumed.ctaHeight}`);
    report.oneTimeConsumption = true;
    report.sessionStorageOnly = true;
    report.noQuestionOrRouteInUrl = true;
    report.touchTargetsAtLeast44 = true;
    await page.screenshot({ path: path.join(OUT, 'consumed-390x844.png'), fullPage: true });

    await page.evaluate(() => {
      window.__handoffPageshow = [];
      window.addEventListener('pageshow', event => window.__handoffPageshow.push(event.persisted));
    });
    await page.locator('#placement-handoff-cta').click();
    await page.waitForURL(/course-safety-foundation\.html$/);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/training-camp\.html$/);
    await page.waitForTimeout(200);
    const bfcache = await page.evaluate(key => ({
      persisted: window.__handoffPageshow || [],
      state: document.querySelector('#placement-handoff')?.dataset.state,
      title: document.querySelector('#placement-handoff-title')?.textContent,
      stepCount: document.querySelectorAll('#placement-handoff-steps li').length,
      sessionValue: sessionStorage.getItem(key)
    }), HANDOFF_KEY);
    if (!bfcache.persisted.includes(true)) throw new Error(`real BFCache was not observed: ${JSON.stringify(bfcache.persisted)}`);
    if (bfcache.state !== 'consumed-cleared' || bfcache.stepCount !== 0 || bfcache.sessionValue !== null) throw new Error(`BFCache restored consumed route: ${JSON.stringify(bfcache)}`);
    report.bfcachePersisted = true;
    report.bfcacheDoesNotRestore = true;

    await page.reload({ waitUntil: 'domcontentloaded' });
    const refreshed = await page.evaluate(key => ({
      hidden: document.querySelector('#placement-handoff')?.hidden,
      state: document.querySelector('#placement-handoff')?.dataset.state,
      value: sessionStorage.getItem(key)
    }), HANDOFF_KEY);
    if (!refreshed.hidden || refreshed.state !== 'none' || refreshed.value !== null) throw new Error(`refresh restored handoff: ${JSON.stringify(refreshed)}`);
    report.refreshDoesNotRestore = true;

    await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
      key: HANDOFF_KEY,
      value: payload({ createdAt: Date.now() - 10 * 60 * 1000, expiresAt: Date.now() - 5 * 60 * 1000 })
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const expired = await page.evaluate(key => ({ state: document.querySelector('#placement-handoff')?.dataset.state, value: sessionStorage.getItem(key) }), HANDOFF_KEY);
    if (expired.state !== 'expired' || expired.value !== null) throw new Error(`expired handoff was not rejected: ${JSON.stringify(expired)}`);
    report.expiredRejected = true;

    await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
      key: HANDOFF_KEY,
      value: payload({ href: 'https://example.com/unsafe' })
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const invalid = await page.evaluate(key => ({ state: document.querySelector('#placement-handoff')?.dataset.state, value: sessionStorage.getItem(key) }), HANDOFF_KEY);
    if (invalid.state !== 'invalid' || invalid.value !== null) throw new Error(`invalid handoff was not rejected: ${JSON.stringify(invalid)}`);
    report.invalidRejected = true;

    const sourceTab = await context.newPage();
    await sourceTab.goto(`${BASE}beginner-placement.html`, { waitUntil: 'domcontentloaded' });
    await sourceTab.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), { key: HANDOFF_KEY, value: payload() });
    const isolatedTab = await context.newPage();
    await isolatedTab.goto(`${BASE}training-camp.html`, { waitUntil: 'domcontentloaded' });
    const isolated = await isolatedTab.evaluate(key => ({ hidden: document.querySelector('#placement-handoff')?.hidden, state: document.querySelector('#placement-handoff')?.dataset.state, value: sessionStorage.getItem(key) }), HANDOFF_KEY);
    const sourceStillHasValue = await sourceTab.evaluate(key => sessionStorage.getItem(key) !== null, HANDOFF_KEY);
    if (!isolated.hidden || isolated.state !== 'none' || isolated.value !== null || !sourceStillHasValue) throw new Error(`independent tab isolation failed: ${JSON.stringify({ isolated, sourceStillHasValue })}`);
    await sourceTab.close();
    await isolatedTab.close();
    report.independentTabIsolation = true;

    const blockedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await blockedContext.addInitScript(key => {
      const originalGet = Storage.prototype.getItem;
      const originalRemove = Storage.prototype.removeItem;
      Storage.prototype.getItem = function(name) {
        if (name === key && this === window.sessionStorage) throw new DOMException('blocked', 'SecurityError');
        return originalGet.call(this, name);
      };
      Storage.prototype.removeItem = function(name) {
        if (name === key && this === window.sessionStorage) throw new DOMException('blocked', 'SecurityError');
        return originalRemove.call(this, name);
      };
    }, HANDOFF_KEY);
    const blockedPage = await blockedContext.newPage();
    const blockedErrors = [];
    blockedPage.on('pageerror', error => blockedErrors.push(error.message));
    await blockedPage.goto(`${BASE}training-camp.html`, { waitUntil: 'domcontentloaded' });
    const unavailable = await blockedPage.evaluate(() => ({
      state: document.querySelector('#placement-handoff')?.dataset.state,
      title: document.querySelector('#placement-handoff-title')?.textContent,
      routeTitle: document.querySelector('#route-title')?.textContent
    }));
    if (unavailable.state !== 'storage-unavailable' || !unavailable.title.includes('无法读取') || !unavailable.routeTitle || blockedErrors.length) throw new Error(`storage unavailable recovery failed: ${JSON.stringify({ unavailable, blockedErrors })}`);
    await blockedContext.close();
    report.storageUnavailableRecovery = true;

    if (report.externalRequests.length) throw new Error(`external requests detected: ${report.externalRequests.join(', ')}`);
    if (report.browserErrors.length) throw new Error(`browser errors detected: ${report.browserErrors.join(', ')}`);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'findings.txt'), '起点测评路线交接：一次性消费、刷新/BFCache清理、过期与非法数据拒绝、独立标签页隔离、存储不可用恢复、44px触控、零站外请求均通过。\n');
    console.log('CNC beginner placement route handoff smoke passed');
  } catch (error) {
    report.error = error.stack || String(error);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'error.txt'), `${error.stack || error}\n`);
    try { await page.screenshot({ path: path.join(OUT, 'failure-390x844.png'), fullPage: true }); } catch {}
    throw error;
  } finally {
    await browser.close();
  }
})();

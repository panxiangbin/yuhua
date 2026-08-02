const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173/cnc/';
const OUT = path.join(__dirname, '..', 'test-results', 'beginner-placement-route-handoff');
const HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
fs.mkdirSync(OUT, { recursive: true });

const report = {
  viewport: '390x844',
  payloadConsumedOnce: false,
  untrustedTextRenderedLiterally: false,
  noInjectedElements: false,
  sessionStorageCleared: false,
  noLongTermStorageLeak: false,
  externalRequests: [],
  browserErrors: []
};

function hostilePayload() {
  const createdAt = Date.now();
  return {
    version: 1,
    source: 'beginner-placement',
    decision: 'critical-safety',
    title: '<em id="handoff-title-injected">安全基础</em>',
    route: '<span id="handoff-route-injected">建议路线</span>',
    href: './course-safety-foundation.html',
    steps: [
      { title: '<strong id="handoff-step-injected">安全基础</strong>', href: './course-safety-foundation.html' }
    ],
    createdAt,
    expiresAt: createdAt + 5 * 60 * 1000
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  await context.route(`${new URL(BASE).origin}/favicon.ico`, route => route.fulfill({ status: 204, body: '' }));
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
    await page.goto(`${BASE}beginner-placement.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    }, { key: HANDOFF_KEY, value: hostilePayload() });

    await page.goto(`${BASE}training-camp.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#placement-handoff[data-state="consumed"]').waitFor({ state: 'visible' });

    const state = await page.evaluate(key => {
      const card = document.querySelector('#placement-handoff');
      return {
        title: document.querySelector('#placement-handoff-title')?.textContent || '',
        route: document.querySelector('#placement-handoff-copy')?.textContent || '',
        step: document.querySelector('#placement-handoff-steps li')?.textContent || '',
        injectedTitle: Boolean(document.querySelector('#handoff-title-injected')),
        injectedRoute: Boolean(document.querySelector('#handoff-route-injected')),
        injectedStep: Boolean(document.querySelector('#handoff-step-injected')),
        scripts: card?.querySelectorAll('script').length || 0,
        images: card?.querySelectorAll('img').length || 0,
        sessionValue: sessionStorage.getItem(key),
        localValue: localStorage.getItem(key)
      };
    }, HANDOFF_KEY);

    if (!state.title.includes('<em id="handoff-title-injected">')) throw new Error(`标题未按纯文本显示: ${state.title}`);
    if (!state.route.includes('<span id="handoff-route-injected">')) throw new Error(`路线未按纯文本显示: ${state.route}`);
    if (!state.step.includes('<strong id="handoff-step-injected">')) throw new Error(`步骤未按纯文本显示: ${state.step}`);
    report.untrustedTextRenderedLiterally = true;

    if (state.injectedTitle || state.injectedRoute || state.injectedStep || state.scripts || state.images) {
      throw new Error(`临时路线文本被解释为HTML: ${JSON.stringify(state)}`);
    }
    report.noInjectedElements = true;

    if (state.sessionValue !== null) throw new Error('恶意测试载荷未在读取后立即清除');
    report.sessionStorageCleared = true;
    report.payloadConsumedOnce = true;

    if (state.localValue !== null) throw new Error('恶意测试载荷泄露到LocalStorage');
    report.noLongTermStorageLeak = true;

    if (report.externalRequests.length) throw new Error(`发现站外请求: ${report.externalRequests.join(', ')}`);
    if (report.browserErrors.length) throw new Error(`发现浏览器错误: ${report.browserErrors.join(', ')}`);

    await page.screenshot({ path: path.join(OUT, 'content-safety-390x844.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT, 'content-safety-report.json'), JSON.stringify(report, null, 2));
    console.log('CNC beginner placement route handoff content safety smoke passed');
  } catch (error) {
    report.error = error.stack || String(error);
    fs.writeFileSync(path.join(OUT, 'content-safety-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'content-safety-error.txt'), `${error.stack || error}\n`);
    try { await page.screenshot({ path: path.join(OUT, 'content-safety-failure-390x844.png'), fullPage: true }); } catch {}
    throw error;
  } finally {
    await browser.close();
  }
})();

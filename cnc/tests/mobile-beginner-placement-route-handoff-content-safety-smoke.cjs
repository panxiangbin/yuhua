const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173/cnc/';
const OUT = path.join(__dirname, '..', 'test-results', 'beginner-placement-route-handoff');
const HANDOFF_KEY = 'cnc_beginner_placement_route_handoff_v1';
fs.mkdirSync(OUT, { recursive: true });

const report = {
  viewport: '390x844',
  canonicalPayloadAccepted: false,
  tamperedTextRejected: false,
  crossRouteMismatchRejected: false,
  noInjectedElements: false,
  sessionStorageCleared: false,
  noLongTermStorageLeak: false,
  externalRequests: [],
  browserErrors: []
};

function timestamped(payload) {
  const createdAt = Date.now();
  return {
    version: 1,
    source: 'beginner-placement',
    createdAt,
    expiresAt: createdAt + 5 * 60 * 1000,
    ...payload
  };
}

function canonicalCriticalPayload() {
  return timestamped({
    decision: 'critical-safety',
    title: '从第1关：安全基础开始',
    route: '建议路线：安全基础 → 加工中心基础 → 坐标轴与回零',
    href: './course-safety-foundation.html',
    steps: [
      { title: '安全基础', href: './course-safety-foundation.html' },
      { title: '认识加工中心', href: './course-machining-center-basics.html' },
      { title: '坐标轴与回零', href: './course-coordinate-axes.html' }
    ]
  });
}

function tamperedTextPayload() {
  const payload = canonicalCriticalPayload();
  payload.title = '<em id="handoff-title-injected">进入高级程序验证</em>';
  payload.route = '<span id="handoff-route-injected">跳过安全基础</span>';
  payload.steps[0].title = '<strong id="handoff-step-injected">直接运行程序</strong>';
  return payload;
}

function crossRouteMismatchPayload() {
  const payload = canonicalCriticalPayload();
  payload.href = './course-g00-g01-basics.html';
  payload.steps = [
    { title: 'G00与G01', href: './course-g00-g01-basics.html' },
    { title: '程序检查与空运行', href: './simulator-program-dry-run.html' },
    { title: '首件测量与超差排查', href: './simulator-first-piece-inspection.html' }
  ];
  return payload;
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

  async function exercise(payload, expectedState, screenshotName) {
    const page = await context.newPage();
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== new URL(BASE).origin) report.externalRequests.push(request.url());
    });
    page.on('console', message => {
      if (message.type() === 'error') report.browserErrors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', error => report.browserErrors.push(`pageerror: ${error.message}`));

    await page.goto(`${BASE}beginner-placement.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), { key: HANDOFF_KEY, value: payload });
    await page.goto(`${BASE}training-camp.html`, { waitUntil: 'domcontentloaded' });
    await page.locator(`#placement-handoff[data-state="${expectedState}"]`).waitFor({ state: 'visible' });

    const state = await page.evaluate(key => {
      const card = document.querySelector('#placement-handoff');
      const cta = document.querySelector('#placement-handoff-cta');
      return {
        state: card?.dataset.state || '',
        title: document.querySelector('#placement-handoff-title')?.textContent || '',
        route: document.querySelector('#placement-handoff-copy')?.textContent || '',
        step: document.querySelector('#placement-handoff-steps li')?.textContent || '',
        ctaHidden: Boolean(cta?.hidden),
        ctaHref: cta?.getAttribute('href') || '',
        injectedTitle: Boolean(document.querySelector('#handoff-title-injected')),
        injectedRoute: Boolean(document.querySelector('#handoff-route-injected')),
        injectedStep: Boolean(document.querySelector('#handoff-step-injected')),
        scripts: card?.querySelectorAll('script').length || 0,
        images: card?.querySelectorAll('img').length || 0,
        sessionValue: sessionStorage.getItem(key),
        localValue: localStorage.getItem(key)
      };
    }, HANDOFF_KEY);

    await page.screenshot({ path: path.join(OUT, screenshotName), fullPage: true });
    await page.close();
    return state;
  }

  try {
    const canonical = await exercise(canonicalCriticalPayload(), 'consumed', 'content-safety-canonical-390x844.png');
    if (canonical.title !== '从第1关：安全基础开始' || canonical.ctaHidden || canonical.ctaHref !== './course-safety-foundation.html') {
      throw new Error(`合法安全路线未被正确消费: ${JSON.stringify(canonical)}`);
    }
    report.canonicalPayloadAccepted = true;

    const tampered = await exercise(tamperedTextPayload(), 'invalid', 'content-safety-tampered-text-390x844.png');
    if (tampered.title.includes('进入高级程序验证') || tampered.route.includes('跳过安全基础') || tampered.step.includes('直接运行程序') || !tampered.ctaHidden) {
      throw new Error(`篡改文字未被拒绝: ${JSON.stringify(tampered)}`);
    }
    report.tamperedTextRejected = true;

    const mismatch = await exercise(crossRouteMismatchPayload(), 'invalid', 'content-safety-cross-route-390x844.png');
    if (!mismatch.ctaHidden || mismatch.ctaHref === './course-g00-g01-basics.html' || mismatch.step.includes('G00与G01')) {
      throw new Error(`安全分类与进阶入口错配未被拒绝: ${JSON.stringify(mismatch)}`);
    }
    report.crossRouteMismatchRejected = true;

    for (const state of [canonical, tampered, mismatch]) {
      if (state.injectedTitle || state.injectedRoute || state.injectedStep || state.scripts || state.images) {
        throw new Error(`临时路线创建了未授权元素: ${JSON.stringify(state)}`);
      }
      if (state.sessionValue !== null) throw new Error(`测试载荷未在读取后立即清除: ${JSON.stringify(state)}`);
      if (state.localValue !== null) throw new Error(`测试载荷泄露到LocalStorage: ${JSON.stringify(state)}`);
    }
    report.noInjectedElements = true;
    report.sessionStorageCleared = true;
    report.noLongTermStorageLeak = true;

    if (report.externalRequests.length) throw new Error(`发现站外请求: ${report.externalRequests.join(', ')}`);
    if (report.browserErrors.length) throw new Error(`发现浏览器错误: ${report.browserErrors.join(', ')}`);

    fs.writeFileSync(path.join(OUT, 'content-safety-report.json'), JSON.stringify(report, null, 2));
    console.log('CNC beginner placement route handoff semantic integrity smoke passed');
  } catch (error) {
    report.error = error.stack || String(error);
    fs.writeFileSync(path.join(OUT, 'content-safety-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'content-safety-error.txt'), `${error.stack || error}\n`);
    throw error;
  } finally {
    await browser.close();
  }
})();

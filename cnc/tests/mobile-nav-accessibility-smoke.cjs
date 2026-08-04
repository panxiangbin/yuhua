const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const DIAGNOSTIC_DIR = 'cnc/test-artifacts/industrial-card-sample';
fs.mkdirSync(DIAGNOSTIC_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=nav-accessibility-s', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.CNC_TRUST_NAV && window.CNC_TRUST_NAV.build === '20260721s', null, { timeout: 20000 });
    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      return window.CNC_PERSONAL_HOME?.refactorBuild === '20260804-mobile1' &&
        check?.legacyHomeRemoved === true &&
        check?.bottomNavReady === true &&
        nav && nav.getClientRects().length > 0 &&
        nav.getAttribute('aria-hidden') === 'false' &&
        !nav.hasAttribute('inert');
    }, null, { timeout: 20000 });
    await page.waitForFunction(() => (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 5000 });

    const api = await page.evaluate(() => ({
      build: window.CNC_TRUST_NAV.build,
      polling: window.CNC_TRUST_NAV.polling,
      observer: window.CNC_TRUST_NAV.observer,
      readyAt: window.__CNC_TRUST_READY_AT__ || 0,
      personalHome: window.CNC_PERSONAL_HOME.runCheck()
    }));
    assert.equal(api.build, '20260721s');
    assert.equal(api.polling, false);
    assert.equal(api.observer, false);
    assert.ok(api.readyAt > 0);
    assert.equal(api.personalHome.legacyHomeRemoved, true, '不得恢复已删除的第二套手机首页');
    assert.equal(api.personalHome.bottomNavReady, true, '单层首页真实底栏必须就绪');

    const nav = page.locator('body > .xp-bottom-nav');
    const navState = await nav.evaluate(node => ({
      visible: node.getClientRects().length > 0,
      ariaHidden: node.getAttribute('aria-hidden'),
      inert: node.hasAttribute('inert'),
      mode: node.dataset.cncGameUtility || null
    }));
    assert.deepEqual(navState, {
      visible: true,
      ariaHidden: 'false',
      inert: false,
      mode: null
    });

    const navItems = nav.locator('button[data-xp-route], button[data-xp-filter]');
    assert.equal(await navItems.count(), 5, '单层手机底栏必须恰好保留5个入口');
    assert.deepEqual(await navItems.locator('span').allTextContents(), ['首页', '查代码', '报警', '学习', '我的']);

    const expectedTargets = [
      'button[data-xp-route="dashboard"]',
      'button[data-xp-filter="gcode"]',
      'button[data-xp-filter="alarm"]',
      'button[data-xp-route="study"]',
      'button[data-xp-route="favorites"]'
    ];
    for (let index = 0; index < expectedTargets.length; index += 1) {
      const button = navItems.nth(index);
      const metrics = await button.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label: node.getAttribute('aria-label'),
          type: node.getAttribute('type'),
          route: node.dataset.xpRoute || null,
          filter: node.dataset.xpFilter || null
        };
      });
      assert.ok(metrics.width >= 44, `第${index + 1}个底栏按钮触控宽度不足：${metrics.width}`);
      assert.ok(metrics.height >= 48, `第${index + 1}个底栏按钮触控高度不足：${metrics.height}`);
      assert.ok(metrics.label, `第${index + 1}个底栏按钮缺少可访问名称`);
      assert.equal(metrics.type, 'button');
      assert.equal(await button.evaluate((node, selector) => node.matches(selector), expectedTargets[index]), true, `第${index + 1}个底栏入口顺序或目标错误`);
    }
    assert.equal(await nav.locator('button[data-xp-route="dashboard"]').getAttribute('aria-current'), 'page');

    const gcode = nav.locator('button[data-xp-filter="gcode"]');
    await gcode.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-filter="gcode"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });
    assert.match((await page.locator('#workspace-title').textContent()) || '', /G代码|M代码/);

    const study = nav.locator('button[data-xp-route="study"]');
    await study.click();
    await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-route="study"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });

    const profile = nav.locator('button[data-xp-route="favorites"]');
    await profile.click();
    await page.waitForSelector('#view-favorites.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-route="favorites"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });

    const alarm = nav.locator('button[data-xp-filter="alarm"]');
    await alarm.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-filter="alarm"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });
    assert.match((await page.locator('#workspace-title').textContent()) || '', /报警/);

    const firstResultButton = page.locator('#result-list [data-open-entry]').first();
    await firstResultButton.waitFor({ state: 'visible', timeout: 15000 });
    await firstResultButton.click();
    await page.waitForSelector('.xp-trust-panel', { state: 'visible', timeout: 15000 });
    assert.equal(await page.locator('.xp-trust-panel').count(), 1, '详情页只能保留一张核验卡');
    assert.match((await page.locator('.xp-trust-panel').textContent()) || '', /核验日期|资料来源/);

    const relevantErrors = errors.filter(text => /trust-nav|MutationObserver|bottom-nav|核验卡/i.test(text));
    assert.deepEqual(relevantErrors, []);

    const report = { api, navState, labels: await navItems.locator('span').allTextContents(), errors };
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-nav-accessibility.json`, JSON.stringify(report, null, 2));
    console.log('手机单层五项底栏、学习、我的、报警、触控和核验卡通过', report);
  } catch (error) {
    fs.writeFileSync(`${DIAGNOSTIC_DIR}/mobile-nav-accessibility-error.txt`, `${error.stack || error}\n`);
    try { await page.screenshot({ path: `${DIAGNOSTIC_DIR}/mobile-nav-accessibility-error-390x844.png`, fullPage: true }); } catch (_) {}
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error.message || error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=nav-accessibility-s', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_TRUST_NAV && window.CNC_TRUST_NAV.build === '20260721s', null, { timeout: 20000 });
  await page.waitForSelector('#xp-game-home .xp-game-bottom-nav', { state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.build === '20260731d' && window.CNC_GAME_QUERY_NAV.runCheck().utilityHidden, null, { timeout: 20000 });
  await page.waitForFunction(() => (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 5000 });

  const api = await page.evaluate(() => ({
    build: window.CNC_TRUST_NAV.build,
    polling: window.CNC_TRUST_NAV.polling,
    observer: window.CNC_TRUST_NAV.observer,
    readyAt: window.__CNC_TRUST_READY_AT__ || 0
  }));
  assert.equal(api.build, '20260721s');
  assert.equal(api.polling, false);
  assert.equal(api.observer, false);
  assert.ok(api.readyAt > 0);

  const gameLinks = page.locator('#xp-game-home .xp-game-bottom-nav a');
  assert.equal(await gameLinks.count(), 5);
  assert.deepEqual(await gameLinks.locator('b').allTextContents(), ['首页', '闯关', '挑战', '模拟', '我的']);
  assert.deepEqual(await gameLinks.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['训练首页', '课程闯关', '每日挑战', '模拟车间', '成长档案']);
  for (let index = 0; index < 5; index += 1) {
    const link = gameLinks.nth(index);
    const metrics = await link.evaluate(node => ({
      height: node.getBoundingClientRect().height,
      label: node.getAttribute('aria-label'),
      href: node.getAttribute('href')
    }));
    assert.ok(metrics.height >= 48, `第${index + 1}个闯关导航触控高度不足：${metrics.height}`);
    assert.ok(metrics.label, `第${index + 1}个闯关导航缺少可访问名称`);
    assert.ok(metrics.href, `第${index + 1}个闯关导航缺少真实链接`);
  }
  assert.equal(await gameLinks.first().getAttribute('aria-current'), 'page');

  const utilityHomeState = await page.locator('body > .xp-bottom-nav').evaluate(node => ({
    visible: node.getClientRects().length > 0,
    ariaHidden: node.getAttribute('aria-hidden'),
    inert: node.hasAttribute('inert'),
    mode: node.dataset.cncGameUtility
  }));
  assert.deepEqual(utilityHomeState, {
    visible: false,
    ariaHidden: 'true',
    inert: true,
    mode: 'hidden-on-game-home'
  });

  await page.locator('#xp-game-home [data-xp-query-filter="gcode"]').click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return node && node.getClientRects().length > 0 && node.getAttribute('aria-hidden') === 'false' && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });

  const buttons = page.locator('body > .xp-bottom-nav button');
  assert.equal(await buttons.count(), 5);
  assert.deepEqual(await buttons.locator('span').allTextContents(), ['首页', '查代码', '报警', '学习', '我的']);
  for (let index = 0; index < 5; index += 1) {
    const button = buttons.nth(index);
    const metrics = await button.evaluate(node => ({
      height: node.getBoundingClientRect().height,
      label: node.getAttribute('aria-label'),
      type: node.getAttribute('type')
    }));
    assert.ok(metrics.height >= 48, `第${index + 1}个工具导航按钮触控高度不足：${metrics.height}`);
    assert.ok(metrics.label, `第${index + 1}个工具导航按钮缺少 aria-label`);
    assert.equal(metrics.type, 'button');
  }
  assert.equal(await page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]').getAttribute('aria-current'), 'page');

  const study = page.locator('body > .xp-bottom-nav button[data-xp-route="study"]');
  await study.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-route="study"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });

  const profile = page.locator('body > .xp-bottom-nav button[data-xp-route="favorites"]');
  await profile.click();
  await page.waitForSelector('#view-favorites.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('body > .xp-bottom-nav button[data-xp-route="favorites"]')?.getAttribute('aria-current') === 'page', null, { timeout: 15000 });

  const alarm = page.locator('body > .xp-bottom-nav button[data-xp-filter="alarm"]');
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

  console.log('手机闯关主导航、工具导航、学习、我的、报警、触控和核验卡通过', { api, utilityHomeState });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => pageErrors.push(String(error.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.startsWith('http://127.0.0.1:4173/')) {
      failedRequests.push(`${url} ${request.failure()?.errorText || ''}`.trim());
    }
  });

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-layout', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(() => {
    const check = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    const button = nav?.querySelector('button[data-xp-filter="gcode"]');
    return window.CNC_QUERY_MODES?.build === '20260721r'
      && check?.legacyHomeRemoved === true
      && check?.bottomNavReady === true
      && document.querySelector('#view-dashboard.active')
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert')
      && button?.getClientRects().length > 0;
  }, null, { timeout: 30000 });

  const homeState = await page.evaluate(() => {
    const nav = document.querySelector('body > .xp-bottom-nav');
    const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
    const gcode = nav?.querySelector('button[data-xp-filter="gcode"]');
    const rect = gcode?.getBoundingClientRect();
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
      navVisible: Boolean(nav?.getClientRects().length),
      navAriaHidden: nav?.getAttribute('aria-hidden') || null,
      navInert: Boolean(nav?.hasAttribute('inert')),
      navLabels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      gcodeTarget: {
        present: Boolean(gcode),
        visible: Boolean(gcode?.getClientRects().length),
        width: rect?.width || 0,
        height: rect?.height || 0,
        label: gcode?.getAttribute('aria-label') || gcode?.textContent?.trim() || ''
      },
      personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });

  assert.equal(homeState.activeView, 'view-dashboard');
  assert.equal(homeState.oldHomeCount, 0, '不得恢复已删除的双手机首页');
  assert.equal(homeState.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
  assert.equal(homeState.navVisible, true, '真实五项底栏必须可见');
  assert.equal(homeState.navAriaHidden, 'false', '真实五项底栏必须进入无障碍树');
  assert.equal(homeState.navInert, false, '真实五项底栏不得被 inert 禁用');
  assert.deepEqual(homeState.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
  assert.equal(homeState.personal?.legacyHomeRemoved, true);
  assert.equal(homeState.personal?.bottomNavReady, true);
  assert.equal(homeState.gcodeTarget.present, true, '真实查代码入口不存在');
  assert.equal(homeState.gcodeTarget.visible, true, '真实查代码入口不可见');
  assert.ok(homeState.gcodeTarget.width >= 44, `查代码入口宽度不足：${homeState.gcodeTarget.width}`);
  assert.ok(homeState.gcodeTarget.height >= 44, `查代码入口高度不足：${homeState.gcodeTarget.height}`);
  assert.ok(homeState.gcodeTarget.label, '查代码入口缺少可访问名称');

  const gcodeButton = page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]').first();
  await gcodeButton.click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.__CNC_GM_PRO_INSTALLED__ === '20260720h'
      && document.body.getAttribute('data-cnc-query-mode') === 'gcode';
  }, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  assert.equal(await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display), 'none');
  assert.equal(await page.locator('.gcode-quick-row').evaluate(node => getComputedStyle(node).display), 'none');
  const visibleRows = await page.locator('.gcode-mobile-controls .gcode-control-row').evaluateAll(nodes =>
    nodes.filter(node => getComputedStyle(node).display !== 'none').length
  );
  assert.equal(visibleRows, 2, '手机G代码工作区必须只保留两行核心控件');
  assert.equal(pageErrors.length, 0, `页面错误：${pageErrors.join(' | ')}`);
  assert.equal(consoleErrors.length, 0, `控制台错误：${consoleErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

  console.log('真实单层首页查代码入口与G/M布局减法通过', { homeState, visibleRows });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

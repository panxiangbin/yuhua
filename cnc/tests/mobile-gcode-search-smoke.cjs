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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode-search', {
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

  await page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]').first().click();
  await page.waitForFunction(() => {
    const workspace = document.getElementById('view-workspace');
    return window.__CNC_GM_PRO_INSTALLED__ === '20260720h'
      && workspace?.classList.contains('active')
      && document.body.getAttribute('data-cnc-query-mode') === 'gcode';
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => window.CNC_CLEAN_UI?.build === '20260721q', null, { timeout: 15000 });

  await page.locator('#search-input').fill('G1');
  await page.waitForFunction(() => /G01/.test(document.querySelector('#result-list')?.textContent || ''), null, { timeout: 15000 });

  const button = page.locator('#result-list [data-open-entry="kb-gcode-g01"]');
  assert.equal(await button.count(), 1, 'G01搜索结果必须只有一个透明整卡按钮');
  await button.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const target = document.querySelector('#result-list [data-open-entry="kb-gcode-g01"]');
    return target?.dataset.cncCleanBound === 'true';
  }, null, { timeout: 15000 });

  const style = await button.evaluate(element => {
    const computed = getComputedStyle(element);
    return {
      display: computed.display,
      opacity: computed.opacity,
      position: computed.position,
      ariaLabel: element.getAttribute('aria-label') || ''
    };
  });
  assert.equal(style.display, 'block');
  assert.equal(style.opacity, '0');
  assert.equal(style.position, 'absolute');
  assert.ok(style.ariaLabel, '透明整卡按钮必须保留可访问名称');
  assert.equal(pageErrors.length, 0, `页面错误：${pageErrors.join(' | ')}`);
  assert.equal(consoleErrors.length, 0, `控制台错误：${consoleErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

  console.log('真实单层首页、G/M搜索、透明整卡按钮和自动绑定通过', { homeState, style });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

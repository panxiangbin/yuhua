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
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  async function targetMetrics(locator, label) {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    const target = await locator.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent?.trim() || node.textContent?.trim() || ''
      };
    });
    assert.ok(target.width >= 44, `${label}入口宽度不足：${target.width}`);
    assert.ok(target.height >= 44, `${label}入口高度不足：${target.height}`);
    assert.ok(target.label, `${label}入口缺少可识别名称`);
    return target;
  }

  async function closeSidebarIfOpen() {
    if (!await page.locator('#sidebar.open').count()) return;
    const closeButton = page.locator('#sidebar-close');
    await targetMetrics(closeButton, '关闭手机目录');
    await closeButton.click();
    await page.waitForFunction(() => !document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
  }

  async function goHome() {
    await closeSidebarIfOpen();
    const homeButton = page.locator('body > .xp-bottom-nav button[data-xp-route="dashboard"]');
    await targetMetrics(homeButton, '首页');
    await homeButton.click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      return check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert');
    }, null, { timeout: 15000 });
  }

  async function enterFilter(filter) {
    await goHome();
    let entry;
    if (filter === 'gcode' || filter === 'alarm') {
      entry = page.locator(`body > .xp-bottom-nav button[data-xp-filter="${filter}"]`).first();
      await targetMetrics(entry, filter);
    } else if (filter === 'parameter' || filter === 'fault') {
      const menuButton = page.locator('#sidebar-open');
      await targetMetrics(menuButton, '手机目录');
      await menuButton.click();
      await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
      entry = page.locator(`#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="${filter}"]`).first();
      await targetMetrics(entry, filter);
    } else {
      assert.fail(`未知查询模式：${filter}`);
    }
    await entry.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.getAttribute('data-cnc-query-mode') === expected, filter, { timeout: 15000 });
  }

  await page.goto('http://127.0.0.1:4173/cnc/?detail-style=20260722d', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const check = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return document.querySelector('#view-dashboard.active')
      && check?.legacyHomeRemoved === true
      && check?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 30000 });

  const homeNavigation = await page.evaluate(() => {
    const visible = node => Boolean(node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    const nav = document.querySelector('body > .xp-bottom-nav');
    const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      visible: visible(nav),
      ariaHidden: nav?.getAttribute('aria-hidden') || null,
      inert: Boolean(nav?.hasAttribute('inert')),
      labels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      targets: items.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent?.trim() || ''
        };
      }),
      personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });

  assert.equal(homeNavigation.activeView, 'view-dashboard');
  assert.equal(homeNavigation.oldHomeCount, 0, '不得恢复已删除的第二套手机首页');
  assert.equal(homeNavigation.visible, true, '真实五项底栏必须在手机首页可见');
  assert.equal(homeNavigation.ariaHidden, 'false', '真实五项底栏必须进入无障碍树');
  assert.equal(homeNavigation.inert, false, '真实五项底栏不得被 inert 禁用');
  assert.deepEqual(homeNavigation.labels, ['首页', '查代码', '报警', '学习', '我的']);
  assert.equal(homeNavigation.personal?.legacyHomeRemoved, true);
  assert.equal(homeNavigation.personal?.bottomNavReady, true);
  homeNavigation.targets.forEach((target, index) => {
    assert.ok(target.width >= 44, `底栏第${index + 1}项宽度不足：${target.width}`);
    assert.ok(target.height >= 44, `底栏第${index + 1}项高度不足：${target.height}`);
    assert.ok(target.label, `底栏第${index + 1}项缺少可访问名称`);
  });

  async function openAndCheck(filter, expectedKind) {
    await enterFilter(filter);
    await page.waitForSelector('#result-list [data-open-entry]', { state: 'visible', timeout: 15000 });
    const firstEntry = page.locator('#result-list [data-open-entry]').first();
    await firstEntry.click();
    await page.waitForSelector('#detail-panel.mobile-open', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => {
      const body = document.body;
      return body.getAttribute('data-cnc-industrial-surface') === 'detail'
        && Boolean(document.querySelector('link[data-cnc-industrial-detail-pages]'));
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const code = document.getElementById('detail-code');
      const card = document.querySelector('#detail-panel .detail-card-primary');
      const back = document.getElementById('detail-back-btn');
      const body = document.body;
      const codeStyle = getComputedStyle(code);
      const cardStyle = getComputedStyle(card);
      const backStyle = getComputedStyle(back);
      const nav = document.querySelector('body > .xp-bottom-nav');
      return {
        surface: body.getAttribute('data-cnc-industrial-surface'),
        kind: body.getAttribute('data-cnc-detail-kind'),
        code: code.textContent.trim(),
        codeSize: parseFloat(codeStyle.fontSize),
        codeWeight: parseInt(codeStyle.fontWeight, 10),
        cardRadius: parseFloat(cardStyle.borderRadius),
        backHeight: back.getBoundingClientRect().height,
        backRadius: parseFloat(backStyle.borderRadius),
        gridColumns: getComputedStyle(document.querySelector('#detail-panel .detail-content-grid')).gridTemplateColumns,
        navVisible: Boolean(nav && nav.getClientRects().length > 0),
        navAriaHidden: nav?.getAttribute('aria-hidden') || null,
        navInert: Boolean(nav?.hasAttribute('inert'))
      };
    });

    assert.equal(snapshot.surface, 'detail');
    assert.ok(snapshot.kind === expectedKind || snapshot.kind === 'knowledge', `unexpected detail kind: ${snapshot.kind}`);
    assert.ok(snapshot.code.length > 0, 'detail code should be visible');
    assert.ok(snapshot.codeSize >= 30, `detail code too small: ${snapshot.codeSize}`);
    assert.ok(snapshot.codeWeight >= 800, `detail code too light: ${snapshot.codeWeight}`);
    assert.ok(snapshot.cardRadius >= 12 && snapshot.cardRadius <= 16, `card radius out of range: ${snapshot.cardRadius}`);
    assert.ok(snapshot.backHeight >= 44, `back target too short: ${snapshot.backHeight}`);
    assert.ok(snapshot.backRadius >= 8 && snapshot.backRadius <= 12, `back radius out of range: ${snapshot.backRadius}`);
    assert.ok(!snapshot.gridColumns.includes(' '), `detail grid must be single-column: ${snapshot.gridColumns}`);
    assert.equal(snapshot.navVisible, true, '详情页应保留真实五项底栏，避免返回路径中断');
    assert.equal(snapshot.navAriaHidden, 'false', '详情页真实底栏必须保留无障碍语义');
    assert.equal(snapshot.navInert, false, '详情页真实底栏不得被 inert 禁用');

    await page.locator('#detail-back-btn').click();
    await page.waitForFunction(() => !document.getElementById('detail-panel')?.classList.contains('mobile-open'), null, { timeout: 15000 });
  }

  await openAndCheck('alarm', 'alarm');
  await openAndCheck('parameter', 'parameter');

  assert.deepEqual(errors, [], `console errors: ${errors.join(' | ')}`);
  console.log('PASS mobile industrial detail pages', JSON.stringify({ homeNavigation, errors: errors.length }));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

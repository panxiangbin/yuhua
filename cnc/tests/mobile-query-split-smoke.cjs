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
    if (request.url().startsWith('http://127.0.0.1:4173/cnc/')) {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown'}`);
    }
  });

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  async function targetMetrics(locator, label) {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    const metrics = await locator.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        label: node.getAttribute('aria-label') || node.textContent?.replace(/\s+/g, ' ').trim() || ''
      };
    });
    assert.ok(metrics.width >= 44, `${label}入口宽度不足：${metrics.width}`);
    assert.ok(metrics.height >= 44, `${label}入口高度不足：${metrics.height}`);
    assert.ok(normalize(metrics.label), `${label}入口缺少可访问名称`);
    return metrics;
  }

  async function waitForSingleHome() {
    await page.waitForFunction(() => {
      const check = window.CNC_PERSONAL_HOME?.runCheck?.();
      const nav = document.querySelector('body > .xp-bottom-nav');
      const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
      const labels = items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim());
      return window.CNC_QUERY_MODES?.build === '20260721r'
        && window.__CNC_QUERY_READY_AT__ > 0
        && check?.legacyHomeRemoved === true
        && check?.bottomNavReady === true
        && document.querySelectorAll('#xp-game-home, #xp-personal-home').length === 0
        && document.querySelector('#view-dashboard.active')
        && nav?.getClientRects().length > 0
        && nav.getAttribute('aria-hidden') === 'false'
        && !nav.hasAttribute('inert')
        && items.length === 5
        && labels.join('|') === '首页|查代码|报警|学习|我的';
    }, null, { timeout: 30000 });
  }

  async function closeSidebarIfOpen() {
    if (await page.locator('#sidebar.open').count()) {
      const close = page.locator('#sidebar-close');
      await targetMetrics(close, '关闭手机目录');
      await close.click();
      await page.waitForFunction(() => !document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
    }
  }

  async function goHome() {
    await closeSidebarIfOpen();
    const home = page.locator('body > .xp-bottom-nav button[data-xp-route="dashboard"]').first();
    await targetMetrics(home, '首页');
    await home.click();
    await waitForSingleHome();
  }

  async function openSidebarMode(mode) {
    const menu = page.locator('#sidebar-open');
    await targetMetrics(menu, '手机目录');
    await menu.click();
    await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
    const entry = page.locator(`#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="${mode}"]`).first();
    await targetMetrics(entry, `${mode}手机目录`);
    return entry;
  }

  async function openMode(mode) {
    await goHome();
    let entry;
    if (mode === 'gcode' || mode === 'alarm') {
      entry = page.locator(`body > .xp-bottom-nav button[data-xp-filter="${mode}"]`).first();
      await targetMetrics(entry, `${mode}底栏`);
    } else {
      entry = await openSidebarMode(mode);
    }
    await entry.click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(expected => document.body.dataset.cncQueryMode === expected, mode, { timeout: 15000 });
  }

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=query-split-r', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await waitForSingleHome();

  const runtime = await page.evaluate(() => {
    const nav = document.querySelector('body > .xp-bottom-nav');
    const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
    const visible = node => Boolean(node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    return {
      polling: window.CNC_QUERY_MODES.polling,
      attempts: window.CNC_QUERY_MODES.maxReadinessAttempts,
      readyAt: window.__CNC_QUERY_READY_AT__ || 0,
      counts: window.CNC_QUERY_MODES.getCounts(),
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      oldEnabledClass: document.body.classList.contains('cnc-game-home-enabled'),
      activeView: document.querySelector('.view.active')?.id || '',
      navVisible: visible(nav),
      navAriaHidden: nav?.getAttribute('aria-hidden') || null,
      navInert: Boolean(nav?.hasAttribute('inert')),
      navLabels: items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      navTargets: items.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label: node.getAttribute('aria-label') || node.textContent?.replace(/\s+/g, ' ').trim() || ''
        };
      }),
      personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });

  assert.equal(runtime.polling, false, '查询模式不得使用持续轮询');
  assert.ok(runtime.attempts <= 7, '查询模式就绪检查必须有严格上限');
  assert.ok(runtime.readyAt > 0, '查询模式应记录就绪时间');
  assert.equal(runtime.oldHomeCount, 0, '不得恢复已删除的第二套手机首页');
  assert.equal(runtime.oldEnabledClass, false, '不得恢复旧闯关首页状态类');
  assert.equal(runtime.activeView, 'view-dashboard');
  assert.equal(runtime.navVisible, true, '真实五项底栏必须可见');
  assert.equal(runtime.navAriaHidden, 'false', '真实五项底栏必须进入无障碍树');
  assert.equal(runtime.navInert, false, '真实五项底栏不得被 inert 禁用');
  assert.deepEqual(runtime.navLabels, ['首页', '查代码', '报警', '学习', '我的']);
  assert.equal(runtime.personal?.legacyHomeRemoved, true);
  assert.equal(runtime.personal?.bottomNavReady, true);
  runtime.navTargets.forEach((target, index) => {
    assert.ok(target.width >= 44, `底栏第${index + 1}项宽度不足：${target.width}`);
    assert.ok(target.height >= 44, `底栏第${index + 1}项高度不足：${target.height}`);
    assert.ok(normalize(target.label), `底栏第${index + 1}项缺少可访问名称`);
  });

  assert.equal(await page.locator('.launchpad-card[data-filter="params"]').count(), 0);
  assert.equal(await page.locator('.launchpad-card[data-filter="alarm"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="parameter"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="fault"]').count(), 1);
  assert.equal(await page.locator('.launchpad-grid').evaluate(node => node.getClientRects().length), 0, '手机端不得重新暴露桌面工具卡');

  assert.ok(runtime.counts.alarm > 0, '报警分类计数必须大于0');
  assert.ok(runtime.counts.parameter > 0, '参数分类计数必须大于0');
  assert.ok(runtime.counts.fault > 0, '故障分类计数必须大于0');

  const bottomEntries = await Promise.all(['gcode', 'alarm'].map(async mode => {
    return targetMetrics(page.locator(`body > .xp-bottom-nav button[data-xp-filter="${mode}"]`).first(), `${mode}底栏`);
  }));

  const menu = page.locator('#sidebar-open');
  await targetMetrics(menu, '手机目录');
  await menu.click();
  await page.waitForFunction(() => document.getElementById('sidebar')?.classList.contains('open'), null, { timeout: 15000 });
  const sidebarEntries = [];
  for (const mode of ['gcode', 'alarm', 'parameter', 'fault']) {
    sidebarEntries.push(await targetMetrics(
      page.locator(`#sidebar [data-tree-panel="workspace"] .tree-item[data-filter="${mode}"]`).first(),
      `${mode}手机目录`
    ));
  }
  await closeSidebarIfOpen();

  const journeys = [];
  for (const journey of [
    { filter: 'alarm', title: /报警排查/, placeholder: /SV0401|报警号/ },
    { filter: 'parameter', title: /参数速查/, placeholder: /1815|参数号/ },
    { filter: 'fault', title: /故障问诊/, placeholder: /回零失败|异常/ }
  ]) {
    await openMode(journey.filter);
    const title = normalize(await page.locator('#workspace-title').textContent());
    const placeholder = await page.locator('#search-input').getAttribute('placeholder') || '';
    const resultCount = await page.locator('#result-list .result-card').count();
    assert.match(title, journey.title);
    assert.match(placeholder, journey.placeholder);
    assert.ok(resultCount > 0, `${journey.filter}查询结果必须大于0`);
    journeys.push({ filter: journey.filter, title, placeholder, resultCount });
  }

  await goHome();
  assert.equal(pageErrors.length, 0, `页面出现错误：${pageErrors.join(' | ')}`);
  assert.equal(consoleErrors.length, 0, `控制台出现错误：${consoleErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `本地资源请求失败：${failedRequests.join(' | ')}`);

  console.log('真实单层首页、五项底栏、手机目录、报警参数故障拆分与无轮询初始化通过', {
    runtime,
    bottomEntries,
    sidebarEntries,
    journeys,
    pageErrors,
    consoleErrors,
    failedRequests
  });
  await browser.close();
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

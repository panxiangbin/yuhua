const { chromium } = require('playwright');

const BASE_URL = process.env.CNC_TEST_URL || 'http://127.0.0.1:4173/cnc/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  await context.addInitScript(() => {
    window.__copiedDetailUrl = '';
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get() {
        return {
          writeText(value) {
            window.__copiedDetailUrl = String(value || '');
            return Promise.resolve();
          }
        };
      }
    });
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.startsWith('http://127.0.0.1:4173/cnc/')) {
      failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'unknown'}`);
    }
  });

  const testUrl = new URL(BASE_URL);
  testUrl.searchParams.set('smoke', 'detail-share');
  await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 使用当前单层手机首页自己的就绪信号，并要求五项底栏连续稳定至少500ms。
  await page.waitForFunction(() => {
    const check = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    const items = nav ? Array.from(nav.querySelectorAll('button[data-xp-route], button[data-xp-filter]')) : [];
    const labels = items.map(node => (node.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim());
    const expected = ['首页', '查代码', '报警', '学习', '我的'];
    const stable = Boolean(
      document.querySelector('#view-dashboard.active')
      && check?.legacyHomeRemoved === true
      && check?.bottomNavReady === true
      && document.querySelectorAll('#xp-game-home, #xp-personal-home').length === 0
      && nav?.getClientRects().length
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert')
      && items.length === 5
      && items.every(node => node.getClientRects().length > 0)
      && labels.every((label, index) => label === expected[index])
    );

    if (!stable) {
      delete window.__CNC_DETAIL_SHARE_NAV_STABLE_SINCE__;
      return false;
    }
    if (!window.__CNC_DETAIL_SHARE_NAV_STABLE_SINCE__) {
      window.__CNC_DETAIL_SHARE_NAV_STABLE_SINCE__ = performance.now();
    }
    return performance.now() - window.__CNC_DETAIL_SHARE_NAV_STABLE_SINCE__ >= 500;
  }, null, { timeout: 30000 });

  const homeNavState = await page.locator('body > .xp-bottom-nav').evaluate((node) => {
    const items = Array.from(node.querySelectorAll('button[data-xp-route], button[data-xp-filter]'));
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      oldHomeCount: document.querySelectorAll('#xp-game-home, #xp-personal-home').length,
      totalItems: items.length,
      visibleItems: items.filter(item => item.getClientRects().length > 0).length,
      labels: items.map(item => (item.querySelector('span')?.textContent || '').replace(/\s+/g, ' ').trim()),
      ariaHidden: node.getAttribute('aria-hidden'),
      inert: node.hasAttribute('inert'),
      targets: items.map(item => {
        const rect = item.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          label: item.getAttribute('aria-label') || item.querySelector('span')?.textContent?.trim() || ''
        };
      }),
      personal: window.CNC_PERSONAL_HOME?.runCheck?.() || null
    };
  });

  assert(homeNavState.activeView === 'view-dashboard', `手机首页活跃视图异常：${JSON.stringify(homeNavState)}`);
  assert(homeNavState.oldHomeCount === 0, `不得恢复已删除的第二套手机首页：${JSON.stringify(homeNavState)}`);
  assert(homeNavState.totalItems === 5, `手机首页底栏总数异常：${JSON.stringify(homeNavState)}`);
  assert(homeNavState.visibleItems === 5, `手机首页必须有五项真实可见底栏：${JSON.stringify(homeNavState)}`);
  assert(JSON.stringify(homeNavState.labels) === JSON.stringify(['首页', '查代码', '报警', '学习', '我的']), `手机首页底栏名称或顺序异常：${JSON.stringify(homeNavState)}`);
  assert(homeNavState.ariaHidden === 'false' && !homeNavState.inert, `手机首页底栏无障碍语义异常：${JSON.stringify(homeNavState)}`);
  assert(homeNavState.personal?.legacyHomeRemoved === true && homeNavState.personal?.bottomNavReady === true, `手机单层首页自检异常：${JSON.stringify(homeNavState)}`);
  homeNavState.targets.forEach((target, index) => {
    assert(target.width >= 44, `底栏第${index + 1}项宽度不足：${target.width}`);
    assert(target.height >= 44, `底栏第${index + 1}项高度不足：${target.height}`);
    assert(normalizeLabel(target.label), `底栏第${index + 1}项缺少可访问名称`);
  });

  const gcodeButton = page.locator('body > .xp-bottom-nav button[data-xp-filter="gcode"]').first();
  await gcodeButton.waitFor({ state: 'visible', timeout: 10000 });
  await gcodeButton.click();
  await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('body > .xp-bottom-nav');
    return document.body.getAttribute('data-cnc-query-mode') === 'gcode'
      && node?.getClientRects().length > 0
      && node.getAttribute('aria-hidden') === 'false'
      && !node.hasAttribute('inert');
  }, null, { timeout: 15000 });

  // 保留原门禁：进入工作区后，实际使用的工具导航不得退回渐变、玻璃模糊或超大圆角。
  const utilityNavStyle = await page.locator('body > .xp-bottom-nav').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      radius: style.borderRadius,
      visible: node.getClientRects().length > 0,
      ariaHidden: node.getAttribute('aria-hidden'),
      inert: node.hasAttribute('inert')
    };
  });
  assert(utilityNavStyle.visible && utilityNavStyle.ariaHidden === 'false' && !utilityNavStyle.inert, '查询工作区底部导航不可见或无障碍语义异常');
  assert(utilityNavStyle.backgroundImage === 'none', '查询工作区底部导航仍存在渐变背景');
  assert(!utilityNavStyle.backdropFilter || utilityNavStyle.backdropFilter === 'none', '查询工作区底部导航仍使用玻璃模糊');
  assert(parseFloat(utilityNavStyle.radius) <= 14, '查询工作区底部导航圆角仍然过大');

  await page.locator('#search-input').fill('G01');
  await page.waitForFunction(() => document.querySelectorAll('#result-list [data-open-entry]').length > 0);

  const g01Button = page.locator('#result-list [data-open-entry]').filter({ hasText: '查看详情' }).first();
  await g01Button.scrollIntoViewIfNeeded();
  await g01Button.click();
  await page.waitForSelector('#detail-panel.mobile-open');
  await page.waitForFunction(() => /G0?1/i.test((document.getElementById('detail-code') || {}).textContent || ''));

  const detailNavState = await page.locator('body > .xp-bottom-nav').evaluate((node) => ({
    visible: node.getClientRects().length > 0,
    ariaHidden: node.getAttribute('aria-hidden'),
    inert: node.hasAttribute('inert')
  }));
  assert(detailNavState.visible && detailNavState.ariaHidden === 'false' && !detailNavState.inert, `详情页真实底栏状态异常：${JSON.stringify(detailNavState)}`);

  const shareButton = page.locator('#detail-share');
  await shareButton.waitFor({ state: 'visible' });
  assert(await shareButton.getAttribute('aria-label') === '分享当前知识条目', '分享按钮缺少清晰的无障碍名称');
  const shareRect = await shareButton.boundingBox();
  assert(shareRect && shareRect.width >= 44 && shareRect.height >= 44, `分享按钮触控区不足：${JSON.stringify(shareRect)}`);
  await shareButton.click();

  await page.waitForFunction(() => Boolean(window.__copiedDetailUrl));
  const copied = await page.evaluate(() => window.__copiedDetailUrl);
  assert(/\/cnc\/\?q=G0?1/i.test(copied), '复制的分享链接没有指向当前G01条目: ' + copied);
  await page.waitForSelector('#xp-share-status:not([hidden])');
  const statusText = normalizeLabel(await page.locator('#xp-share-status').textContent());
  assert(statusText.includes('链接已复制'), '分享完成后没有清晰反馈');

  const trustStyle = await page.locator('.xp-trust-panel').evaluate((node) => {
    const style = getComputedStyle(node);
    return { backgroundImage: style.backgroundImage, radius: style.borderRadius };
  });
  assert(trustStyle.backgroundImage === 'none', '可信度卡仍存在渐变背景');
  assert(parseFloat(trustStyle.radius) <= 14, '可信度卡圆角仍然过大');

  assert(consoleErrors.length === 0, '控制台出现错误: ' + consoleErrors.join(' | '));
  assert(pageErrors.length === 0, '页面出现错误: ' + pageErrors.join(' | '));
  assert(failedRequests.length === 0, '本地资源请求失败: ' + failedRequests.join(' | '));
  console.log(JSON.stringify({
    passed: true,
    copied,
    statusText,
    homeNavState,
    utilityNavStyle,
    detailNavState,
    trustStyle,
    consoleErrors,
    pageErrors,
    failedRequests
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

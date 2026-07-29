const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function trustedClickHiddenRoute(page, selector) {
  const route = page.locator(selector);
  await route.waitFor({ state: 'attached', timeout: 15000 });
  const markerId = `cnc-home-route-marker-${Date.now()}`;
  const routeId = `cnc-home-route-target-${Date.now()}`;
  await route.evaluate((node, ids) => {
    const marker = document.createElement('span');
    marker.id = ids.markerId;
    marker.hidden = true;
    node.parentNode.insertBefore(marker, node);
    node.dataset.homeOriginalStyle = node.getAttribute('style') || '';
    node.dataset.homeOriginalId = node.id || '';
    node.id = ids.routeId;
    document.body.appendChild(node);
    Object.assign(node.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '180px',
      height: '48px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: '2147483647'
    });
  }, { markerId, routeId });

  try {
    await page.locator(`#${routeId}`).click({ timeout: 15000 });
  } finally {
    await page.evaluate(({ routeId, markerId }) => {
      const node = document.getElementById(routeId);
      const marker = document.getElementById(markerId);
      if (!node) return;
      const originalStyle = node.dataset.homeOriginalStyle || '';
      const originalId = node.dataset.homeOriginalId || '';
      if (originalStyle) node.setAttribute('style', originalStyle);
      else node.removeAttribute('style');
      if (originalId) node.id = originalId;
      else node.removeAttribute('id');
      delete node.dataset.homeOriginalStyle;
      delete node.dataset.homeOriginalId;
      if (marker && marker.parentNode) {
        marker.parentNode.insertBefore(node, marker);
        marker.remove();
      }
    }, { routeId, markerId });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4173/cnc/?smoke=industrial-home', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#xp-game-home[data-ready="true"]', { state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.build === '20260722e', null, { timeout: 60000 });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.build === '20260722b', null, { timeout: 60000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-industrial-surface') === 'home', null, { timeout: 60000 });
  await page.waitForTimeout(1100);

  assert.equal(await page.title(), '数控小潘 CNC速查与学习助手');
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-clean-ui')), true);
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-industrial-sample')), true);
  assert.match((await page.locator('.study-card[data-level="9"] p').textContent()) || '', /不保证直线/);
  assert.match((await page.locator('.study-card[data-level="10"] p').textContent()) || '', /最小输入单位/);

  for (const selector of ['.fan-suggestion-panel', '#view-dashboard .featured-images-preview', '#view-dashboard #faq-preview-section']) {
    assert.equal(await page.locator(selector).evaluate(node => getComputedStyle(node).display), 'none');
  }

  assert.equal(await page.locator('.launchpad-grid').evaluate(node => getComputedStyle(node).display), 'none', '手机端旧工具首页必须隐藏');
  assert.equal(await page.locator('#xp-game-home').evaluate(node => getComputedStyle(node).display !== 'none'), true, '手机端闯关首页必须显示');
  assert.match((await page.locator('.xp-game-hero h1').textContent()) || '', /从零基础.*闯.*独立编程/s);

  const visibleTargets = await page.locator('#xp-game-home a:visible,#xp-game-home button:visible').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent.trim(), width: rect.width, height: rect.height };
  }).filter(item => item.width > 0 && item.height > 0 && item.height < 44));
  assert.deepEqual(visibleTargets, [], '手机首页可见按钮和链接高度不得小于44px');

  const gameColumns = await page.locator('.xp-game-shortcuts').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.ok(gameColumns >= 1 && gameColumns <= 2, '手机快捷入口必须保持适合窄屏的单列或双列布局');

  const personal = await page.evaluate(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.runCheck());
  assert.equal(Boolean(personal && personal.passed), true, '闯关首页不能破坏学习进度数据自检');

  // 首页保护期内会纠正非用户导航；等待窗口结束后，通过既有隐藏路由按钮执行可信点击。
  await page.waitForTimeout(5600);
  await trustedClickHiddenRoute(page, '#sidebar .tree-item[data-route="study"]');
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  const studyColumns = await page.locator('.study-card-grid').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(studyColumns, 1, '课程必须继续保持竖向单列');
  assert.ok(await page.locator('.study-card h4').first().evaluate(node => Number(getComputedStyle(node).fontWeight)) >= 800);

  console.log('手机闯关首页、工业样板加载、触控尺寸与课程入口通过');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

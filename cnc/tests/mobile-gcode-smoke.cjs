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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=gcode', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  const card = page.locator('.launchpad-card[data-filter="gcode"]');
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await card.click();

  await page.waitForFunction(() => {
    const view = document.querySelector('#view-workspace');
    return view && view.classList.contains('active');
  }, null, { timeout: 30000 });

  await page.waitForFunction(() => window.__CNC_GM_PRO_INSTALLED__ === '20260720h', null, {
    timeout: 30000
  });
  await page.waitForTimeout(500);

  assert.equal(
    await page.locator('#workspace-mode-row').evaluate(node => getComputedStyle(node).display),
    'none',
    'G/M查询不应显示图文模式切换'
  );
  assert.equal(
    await page.locator('#preset-chip-row').evaluate(node => getComputedStyle(node).display),
    'none',
    'G/M查询不应显示重复分类快捷栏'
  );
  assert.equal(
    await page.locator('.gcode-quick-row').evaluate(node => getComputedStyle(node).display),
    'none',
    'G/M查询不应显示常查代码长条'
  );

  const visibleFilterRows = await page.locator('.gcode-mobile-controls .gcode-control-row').evaluateAll(nodes =>
    nodes.filter(node => getComputedStyle(node).display !== 'none').length
  );
  assert.equal(visibleFilterRows, 2, 'G/M查询只保留机型和范围两行筛选');

  await page.locator('#search-input').fill('G1');
  await page.waitForTimeout(700);
  const resultText = await page.locator('#result-list').textContent();
  assert.match(resultText || '', /G01/);

  const firstResult = page.locator('#result-list .result-card').first();
  await firstResult.waitFor({ state: 'visible', timeout: 15000 });

  for (const selector of ['.result-thumb', '.result-tags']) {
    const node = firstResult.locator(selector);
    if (await node.count()) {
      assert.equal(
        await node.evaluate(element => getComputedStyle(element).display),
        'none',
        selector + ' 应在手机结果卡片隐藏'
      );
    }
  }

  const openButton = firstResult.locator('.result-button');
  assert.equal(await openButton.count(), 1, '结果卡仍需保留可用的详情入口');
  const buttonStyle = await openButton.evaluate(element => {
    const style = getComputedStyle(element);
    return { display: style.display, opacity: style.opacity, position: style.position };
  });
  assert.equal(buttonStyle.display, 'block');
  assert.equal(buttonStyle.opacity, '0');
  assert.equal(buttonStyle.position, 'absolute');

  await firstResult.click();
  await page.waitForFunction(() => {
    const code = document.querySelector('#detail-code');
    const panel = document.querySelector('#detail-panel');
    return code && /G01/.test(code.textContent || '') && panel && panel.classList.contains('mobile-open');
  }, null, { timeout: 15000 });

  const detailPosition = await page.locator('#detail-panel').evaluate(node => getComputedStyle(node).position);
  assert.equal(detailPosition, 'fixed', '手机详情应独占全屏，不应和列表堆在一起');

  console.log('手机G/M减法界面、G1→G01搜索和详情打开通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

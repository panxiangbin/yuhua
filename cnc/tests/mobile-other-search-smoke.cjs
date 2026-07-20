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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=split-search', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(() => {
    return window.CNC_CLEAN_UI &&
      document.querySelector('.launchpad-card[data-filter="alarm"]') &&
      document.querySelector('.launchpad-card[data-filter="params"]') &&
      document.querySelector('.launchpad-card[data-filter="fault"]');
  }, null, { timeout: 30000 });

  const labels = await page.locator('.launchpad-card[data-filter="alarm"] h3,.launchpad-card[data-filter="params"] h3,.launchpad-card[data-filter="fault"] h3').allTextContents();
  assert.deepEqual(labels, ['报警号查询', '参数号速查', '故障排查']);

  async function openAndCheck(filter, title, forbiddenText) {
    await page.locator(`.launchpad-card[data-filter="${filter}"]`).click();
    await page.waitForSelector('#view-workspace.active #result-list .result-card', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(300);
    assert.equal((await page.locator('#workspace-title').textContent()).trim(), title);
    assert.equal((await page.locator('#topbar-title').textContent()).trim(), title);
    const resultText = ((await page.locator('#result-list').textContent()) || '').toLowerCase();
    assert.ok(resultText.length > 0, `${title} 应返回独立结果`);
    if (forbiddenText) assert.equal(resultText.includes(forbiddenText.toLowerCase()), false, `${title} 不应混入 ${forbiddenText}`);
    await page.locator('#home-btn').click();
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  }

  await openAndCheck('alarm', '报警号查询', null);
  await openAndCheck('params', '参数号速查', 'sv0401');
  await openAndCheck('fault', '故障排查', null);

  await page.locator('.launchpad-card[data-filter="alarm"]').click();
  await page.waitForSelector('#view-workspace.active #result-list .result-card', { state: 'visible', timeout: 30000 });
  const firstResult = page.locator('#result-list .result-card').first();
  const button = firstResult.locator('.result-button');
  assert.equal(await button.count(), 1, '独立查询结果必须保留详情入口');
  await page.waitForFunction(() => {
    const button = document.querySelector('#result-list .result-card .result-button');
    return button && button.dataset.cncCleanBound === 'true';
  }, null, { timeout: 15000 });
  await button.click({ force: true });
  await page.waitForFunction(() => {
    const panel = document.querySelector('#detail-panel');
    return panel && document.body.getAttribute('data-cnc-detail-open') === 'true' && getComputedStyle(panel).position === 'fixed';
  }, null, { timeout: 15000 });
  assert.equal(await page.locator('#detail-panel').isVisible(), true);

  console.log('报警、参数、故障独立入口、独立筛选与手机全屏详情通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

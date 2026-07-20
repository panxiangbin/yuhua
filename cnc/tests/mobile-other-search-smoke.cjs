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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=split-search-v5', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForFunction(() => {
    return window.CNC_CLEAN_UI &&
      typeof window.CNC_CLEAN_UI.installSplitFilters === 'function' &&
      typeof window.CNC_CLEAN_UI.injectSplitCards === 'function';
  }, null, { timeout: 30000 });

  await page.waitForSelector('.launchpad-card[data-filter="alarm"]', { state: 'visible', timeout: 30000 });
  await page.waitForSelector('.launchpad-card[data-filter="params"]', { state: 'visible', timeout: 30000 });
  await page.waitForSelector('.launchpad-card[data-filter="fault"]', { state: 'visible', timeout: 30000 });

  const labels = await page.locator('.launchpad-card[data-filter="alarm"] h3,.launchpad-card[data-filter="params"] h3,.launchpad-card[data-filter="fault"] h3').allTextContents();
  assert.deepEqual(labels, ['报警号查询', '参数号速查', '故障排查']);
  assert.equal(await page.locator('.launchpad-card[data-filter="alarm"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="params"]').count(), 1);
  assert.equal(await page.locator('.launchpad-card[data-filter="fault"]').count(), 1);
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-vivid-ui')), true);
  assert.equal(Boolean(await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller)), false);

  console.log('报警、参数、故障三个独立手机入口加载通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

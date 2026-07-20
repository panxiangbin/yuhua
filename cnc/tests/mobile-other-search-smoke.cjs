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

  await page.goto('http://127.0.0.1:4173/cnc/?smoke=split-search-v4', {
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

  async function openAndReturn(filter, title) {
    await page.locator(`.launchpad-card[data-filter="${filter}"]`).click();
    await page.waitForSelector('#view-workspace.active', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(expected => {
      const titleNode = document.getElementById('workspace-title');
      return titleNode && titleNode.textContent.trim() === expected;
    }, title, { timeout: 15000 });
    assert.equal((await page.locator('#topbar-title').textContent()).trim(), title);
    await page.locator('#home-btn').click({ force: true });
    await page.waitForSelector('#view-dashboard.active', { state: 'visible', timeout: 15000 });
  }

  await openAndReturn('alarm', '报警号查询');
  await openAndReturn('params', '参数号速查');
  await openAndReturn('fault', '故障排查');

  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('cnc-vivid-ui')), true);
  assert.equal(Boolean(await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller)), false);

  console.log('报警、参数、故障独立入口与返回流程通过');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
